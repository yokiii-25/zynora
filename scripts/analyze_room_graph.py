from pathlib import Path

from zynora_ai.core.geometry.intersections import (
    distance_between_polygons,
    nearby_polygon_edge_length,
    shared_polygon_edge_length,
)
from zynora_ai.core.graph.room_graph import RoomGraphBuilder
from zynora_ai.core.parser.svg_house_parser import SvgHouseParser


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    selected_file = (
        PROJECT_ROOT
        / "outputs"
        / "selected_svg.txt"
    )

    svg_path = Path(
        selected_file.read_text(
            encoding="utf-8",
        ).strip()
    )

    house = SvgHouseParser().parse(svg_path)
    builder = RoomGraphBuilder()

    for floor in house.floors:
        builder.build(
            floor.rooms,
            minimum_boundary_length=10.0,
            maximum_wall_gap=30.0,
        )

        room_by_id = {
            room.id: room
            for room in floor.rooms
        }

        print("=" * 72)
        print(f"Floor: {floor.name}")
        print("=" * 72)

        for room in floor.rooms:
            print(f"\n{room.room_type}")
            print(f"Room ID: {room.id}")
            print(
                f"Adjacent rooms: "
                f"{len(room.adjacent_rooms)}"
            )

            for adjacent_id in room.adjacent_rooms:
                adjacent_room = room_by_id[adjacent_id]

                distance = distance_between_polygons(
                    room.polygon,
                    adjacent_room.polygon,
                )

                shared = shared_polygon_edge_length(
                    room.polygon,
                    adjacent_room.polygon,
                )

                nearby = nearby_polygon_edge_length(
                    room.polygon,
                    adjacent_room.polygon,
                    maximum_gap=30.0,
                )

                print(
                    f"   -> {adjacent_room.room_type} "
                    f"({adjacent_id})"
                )
                print(
                    f"      Distance       : "
                    f"{distance:.2f}"
                )
                print(
                    f"      Shared boundary: "
                    f"{shared:.2f}"
                )
                print(
                    f"      Nearby boundary: "
                    f"{nearby:.2f}"
                )


if __name__ == "__main__":
    main()