from __future__ import annotations

from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

from zynora_ai.core.parser.svg_house_parser import SvgHouseParser
from zynora_ai.core.parser.furniture_parser import FurnitureParser
from zynora_ai.core.relationships.furniture_room_assignment import (
    FurnitureRoomAssignment,
    polygon_centroid,
)
from zynora_ai.core.geometry.point_in_polygon import point_in_polygon


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SELECTED_SVG = PROJECT_ROOT / "outputs" / "selected_svg.txt"


def load_svg_path() -> Path:
    if not SELECTED_SVG.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt not found."
        )

    svg_text = SELECTED_SVG.read_text(
        encoding="utf-8",
    ).strip()

    if not svg_text:
        raise ValueError(
            "outputs/selected_svg.txt is empty."
        )

    svg_path = Path(svg_text)

    if not svg_path.is_absolute():
        svg_path = PROJECT_ROOT / svg_path

    svg_path = svg_path.resolve()

    if not svg_path.exists():
        raise FileNotFoundError(
            f"SVG file does not exist: {svg_path}"
        )

    return svg_path


def collect_rooms(house) -> list:
    rooms = []

    for floor in house.floors:
        rooms.extend(
            getattr(floor, "rooms", [])
        )

    return rooms


def print_assignment_debug(
    rooms: list,
    furniture_items: list,
) -> None:
    print()
    print("=" * 100)
    print("FURNITURE CENTROID MATCHING DEBUG")
    print("=" * 100)

    for furniture in furniture_items:
        if not furniture.polygon:
            continue

        centroid = polygon_centroid(
            furniture.polygon
        )

        matching_rooms = []

        for room in rooms:
            if point_in_polygon(
                centroid,
                room.polygon,
            ):
                matching_rooms.append(
                    f"{room.room_type} ({room.id})"
                )

        print(
            f"{furniture.furniture_type:<25} "
            f"CENTROID=({centroid[0]:.2f}, "
            f"{centroid[1]:.2f})"
        )

        if matching_rooms:
            for room_name in matching_rooms:
                print(f"  MATCH -> {room_name}")
        else:
            print("  MATCH -> NONE")

    print()


def main() -> None:
    svg_path = load_svg_path()

    print("=" * 100)
    print("ZYNORA FURNITURE -> ROOM ASSIGNMENT")
    print("=" * 100)

    print()
    print("Loading SVG...")
    print(svg_path)

    house_parser = SvgHouseParser()
    house = house_parser.parse(svg_path)

    rooms = collect_rooms(house)

    tree = ET.parse(svg_path)
    root = tree.getroot()

    furniture_items = FurnitureParser().parse(
        root
    )

    print()
    print(f"Floors    : {len(house.floors)}")
    print(f"Rooms     : {len(rooms)}")
    print(f"Furniture : {len(furniture_items)}")

    print_assignment_debug(
        rooms,
        furniture_items,
    )

    assignments = FurnitureRoomAssignment.assign(
        rooms=rooms,
        furniture_items=furniture_items,
    )

    total_assigned = 0

    print("=" * 100)
    print("FINAL ROOM ASSIGNMENTS")
    print("=" * 100)

    for room in rooms:
        room_furniture = assignments.get(
            room.id,
            [],
        )

        total_assigned += len(room_furniture)

        print()
        print("-" * 100)
        print(f"ROOM ID    : {room.id}")
        print(f"ROOM TYPE  : {room.room_type}")
        print(
            f"FURNITURE  : "
            f"{len(room_furniture)}"
        )

        if not room_furniture:
            print("  No furniture assigned")
            continue

        furniture_counts = Counter(
            item.furniture_type
            for item in room_furniture
        )

        for furniture_type, count in (
            furniture_counts.most_common()
        ):
            print(
                f"  {furniture_type:<25} "
                f"{count}"
            )

    unassigned_items = []

    for furniture in furniture_items:
        was_assigned = any(
            furniture in room_items
            for room_items in assignments.values()
        )

        if not was_assigned:
            unassigned_items.append(furniture)

    print()
    print("=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(
        f"Total furniture      : "
        f"{len(furniture_items)}"
    )
    print(
        f"Assigned furniture   : "
        f"{total_assigned}"
    )
    print(
        f"Unassigned furniture : "
        f"{len(unassigned_items)}"
    )

    if unassigned_items:
        print()
        print("UNASSIGNED TYPES")
        print("-" * 100)

        unassigned_counts = Counter(
            item.furniture_type
            for item in unassigned_items
        )

        for furniture_type, count in (
            unassigned_counts.most_common()
        ):
            print(
                f"  {furniture_type:<25} "
                f"{count}"
            )


if __name__ == "__main__":
    main()