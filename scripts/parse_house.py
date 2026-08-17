from pathlib import Path

from zynora_ai.core.parser.svg_house_parser import SvgHouseParser
from zynora_ai.core.serializer.house_serializer import HouseSerializer


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    selected_path_file = PROJECT_ROOT / "outputs" / "selected_svg.txt"

    if not selected_path_file.exists():
        raise FileNotFoundError(
            "Run scripts/find_sample_svg.py first."
        )

    svg_path = Path(
        selected_path_file.read_text(
            encoding="utf-8",
        ).strip()
    )

    parser = SvgHouseParser()
    house = parser.parse(svg_path)

    output_path = (
        PROJECT_ROOT
        / "outputs"
        / "parsed"
        / "house.json"
    )

    HouseSerializer.save_json(
        house,
        output_path,
    )

    print("=" * 60)
    print("ZYNORA HOUSE PARSER")
    print("=" * 60)
    print(f"SVG: {svg_path}")
    print(f"Floors detected: {len(house.floors)}")

    total_rooms = 0
    total_walls = 0
    total_doors = 0
    total_windows = 0

    for floor in house.floors:
        print(f"\nFloor: {floor.name}")

        print(f"\nRooms: {len(floor.rooms)}")

        for room in floor.rooms:
            print(
                f"  {room.room_type:<20} "
                f"points={len(room.polygon):>3} "
                f"id={room.id}"
            )

        total_rooms += len(floor.rooms)

        print(f"\nWalls: {len(floor.walls)}")

        for wall in floor.walls:
            print(
                f"  {wall.wall_type:<10} "
                f"points={len(wall.polygon):>3} "
                f"doors={len(wall.doors):>2} "
                f"windows={len(wall.windows):>2} "
                f"id={wall.id}"
            )

            for door in wall.doors:
                print(
                    f"      Door: "
                    f"{door.door_type:<20} "
                    f"points={len(door.polygon):>3} "
                    f"id={door.id}"
                )

            for window in wall.windows:
                print(
                    f"      Window: "
                    f"{window.window_type:<18} "
                    f"points={len(window.polygon):>3} "
                    f"id={window.id}"
                )

        total_walls += len(floor.walls)

        total_doors += sum(
            len(wall.doors)
            for wall in floor.walls
        )

        total_windows += sum(
            len(wall.windows)
            for wall in floor.walls
        )

    print("\n" + "=" * 60)
    print(f"Total rooms   : {total_rooms}")
    print(f"Total walls   : {total_walls}")
    print(f"Total doors   : {total_doors}")
    print(f"Total windows : {total_windows}")
    print(f"Saved JSON    : {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()