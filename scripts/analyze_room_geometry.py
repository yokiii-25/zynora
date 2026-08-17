from pathlib import Path

from zynora_ai.core.geometry.room_math import (
    calculate_room_geometry,
)
from zynora_ai.core.parser.svg_house_parser import (
    SvgHouseParser,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    selected_path_file = (
        PROJECT_ROOT
        / "outputs"
        / "selected_svg.txt"
    )

    if not selected_path_file.exists():
        raise FileNotFoundError(
            "Run scripts/find_sample_svg.py first."
        )

    svg_path = Path(
        selected_path_file.read_text(
            encoding="utf-8",
        ).strip()
    )

    if not svg_path.exists():
        raise FileNotFoundError(
            f"Selected SVG does not exist: {svg_path}"
        )

    parser = SvgHouseParser()
    house = parser.parse(svg_path)

    print("=" * 72)
    print("ZYNORA ROOM GEOMETRY ANALYSIS")
    print("=" * 72)
    print(f"SVG: {svg_path}")
    print(f"Floors: {len(house.floors)}")

    total_area = 0.0

    for floor in house.floors:
        print(f"\nFloor: {floor.name}")
        print(f"Rooms: {len(floor.rooms)}")

        for room in floor.rooms:
            geometry = calculate_room_geometry(
                room
            )

            total_area += geometry.area

            print(
                f"\n  Room: {room.room_type}"
            )
            print(
                f"    ID           : {room.id}"
            )
            print(
                f"    Points       : "
                f"{len(room.polygon)}"
            )
            print(
                f"    Area         : "
                f"{geometry.area:.2f}"
            )
            print(
                f"    Perimeter    : "
                f"{geometry.perimeter:.2f}"
            )
            print(
                f"    Centroid     : "
                f"({geometry.centroid.x:.2f}, "
                f"{geometry.centroid.y:.2f})"
            )
            print(
                f"    Bounding box : "
                f"{geometry.width:.2f} × "
                f"{geometry.height:.2f}"
            )
            print(
                f"    Aspect ratio : "
                f"{geometry.aspect_ratio:.3f}"
            )

    print("\n" + "=" * 72)
    print(
        f"Combined room area: {total_area:.2f} "
        f"square SVG units"
    )
    print("=" * 72)


if __name__ == "__main__":
    main()