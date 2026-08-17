from pathlib import Path

from zynora_ai.core.graph.wall_room_relationships import (
    WallRoomRelationshipBuilder,
)
from zynora_ai.core.parser.svg_house_parser import (
    SvgHouseParser,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    selected_file = (
        PROJECT_ROOT
        / "outputs"
        / "selected_svg.txt"
    )

    if not selected_file.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt was not found."
        )

    svg_text = selected_file.read_text(
        encoding="utf-8",
    ).strip()

    if not svg_text:
        raise ValueError(
            "outputs/selected_svg.txt is empty."
        )

    svg_path = Path(svg_text)

    if not svg_path.exists():
        raise FileNotFoundError(
            f"SVG file was not found: {svg_path}"
        )

    house = SvgHouseParser().parse(svg_path)

    builder = WallRoomRelationshipBuilder()

    print("=" * 76)
    print("ZYNORA WALL–ROOM RELATIONSHIP ANALYSIS")
    print("=" * 76)
    print(f"SVG: {svg_path}")

    for floor in house.floors:
        relationships = builder.build(
            rooms=floor.rooms,
            walls=floor.walls,
            maximum_gap=20.0,
            minimum_boundary_length=5.0,
            maximum_rooms_per_wall=2,
        )

        room_by_id = {
            room.id: room
            for room in floor.rooms
        }

        wall_by_id = {
            wall.id: wall
            for wall in floor.walls
        }

        matches_by_wall: dict[
            str,
            list,
        ] = {}

        for match in relationships.matches:
            matches_by_wall.setdefault(
                match.wall_id,
                [],
            ).append(match)

        print()
        print("=" * 76)
        print(f"Floor: {floor.name}")
        print(f"Rooms: {len(floor.rooms)}")
        print(f"Walls: {len(floor.walls)}")
        print("=" * 76)

        matched_walls = 0
        internal_walls = 0
        external_walls = 0
        unmatched_walls = 0

        for wall in floor.walls:
            room_ids = (
                relationships.rooms_for_wall(
                    wall.id
                )
            )

            print()
            print(
                f"Wall: {wall.id} "
                f"[{wall.wall_type}]"
            )

            print(
                f"Polygon points: "
                f"{len(wall.polygon)}"
            )

            print(
                f"Doors: "
                f"{len(wall.doors)}"
            )

            print(
                f"Windows: "
                f"{len(wall.windows)}"
            )

            if not room_ids:
                unmatched_walls += 1

                print(
                    "Bordering rooms: 0 "
                    "(unmatched)"
                )

                continue

            matched_walls += 1

            if len(room_ids) == 1:
                external_walls += 1
            elif len(room_ids) == 2:
                internal_walls += 1

            print(
                f"Bordering rooms: "
                f"{len(room_ids)}"
            )

            wall_matches = matches_by_wall.get(
                wall.id,
                [],
            )

            match_by_room = {
                match.room_id: match
                for match in wall_matches
            }

            for room_id in room_ids:
                room = room_by_id[room_id]
                match = match_by_room[room_id]

                print(
                    f"   -> {room.room_type}"
                )

                print(
                    f"      Room ID : "
                    f"{room.id}"
                )

                print(
                    f"      Distance: "
                    f"{match.distance:.2f}"
                )

                print(
                    f"      Boundary: "
                    f"{match.nearby_boundary_length:.2f}"
                )

                print(
                    f"      Score   : "
                    f"{match.score:.3f}"
                )

        print()
        print("-" * 76)
        print("ROOM → WALL RELATIONSHIPS")
        print("-" * 76)

        for room in floor.rooms:
            wall_ids = (
                relationships.walls_for_room(
                    room.id
                )
            )

            print()
            print(
                f"{room.room_type} "
                f"({room.id})"
            )

            print(
                f"Matched walls: "
                f"{len(wall_ids)}"
            )

            for wall_id in wall_ids:
                wall = wall_by_id[wall_id]

                print(
                    f"   -> {wall.id} "
                    f"[{wall.wall_type}]"
                )

        print()
        print("=" * 76)
        print("SUMMARY")
        print("=" * 76)
        print(
            f"Matched walls  : "
            f"{matched_walls}"
        )
        print(
            f"Internal walls : "
            f"{internal_walls}"
        )
        print(
            f"External walls : "
            f"{external_walls}"
        )
        print(
            f"Unmatched walls: "
            f"{unmatched_walls}"
        )


if __name__ == "__main__":
    main()