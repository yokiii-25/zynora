from __future__ import annotations

from dataclasses import fields, is_dataclass
from pathlib import Path
from pprint import pprint

from zynora_ai.core.parser.svg_house_parser import SvgHouseParser


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_selected_svg() -> Path:
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

    if not svg_path.is_absolute():
        svg_path = PROJECT_ROOT / svg_path

    svg_path = svg_path.resolve()

    if not svg_path.exists():
        raise FileNotFoundError(
            f"SVG file was not found: {svg_path}"
        )

    return svg_path


def safe_value(value: object) -> str:
    """
    Convert an attribute value to readable text without
    printing extremely large objects.
    """

    text = repr(value)

    if len(text) > 500:
        return text[:500] + "... [truncated]"

    return text


def inspect_object(
    title: str,
    obj: object,
) -> None:
    print()
    print("=" * 90)
    print(title)
    print("=" * 90)

    print(f"Python type : {type(obj)}")
    print(f"Module      : {type(obj).__module__}")
    print(f"Class name  : {type(obj).__name__}")

    print()
    print("-" * 90)
    print("OBJECT REPRESENTATION")
    print("-" * 90)
    print(safe_value(obj))

    if hasattr(obj, "__dict__"):
        print()
        print("-" * 90)
        print("__dict__ CONTENT")
        print("-" * 90)

        try:
            pprint(vars(obj))
        except Exception as error:
            print(
                f"Could not read __dict__: {error}"
            )

    if is_dataclass(obj):
        print()
        print("-" * 90)
        print("DATACLASS FIELDS")
        print("-" * 90)

        for field_info in fields(obj):
            field_name = field_info.name

            try:
                field_value = getattr(
                    obj,
                    field_name,
                )

                print(
                    f"{field_name:<30}: "
                    f"{safe_value(field_value)}"
                )
            except Exception as error:
                print(
                    f"{field_name:<30}: "
                    f"<error: {error}>"
                )

    print()
    print("-" * 90)
    print("PUBLIC ATTRIBUTES")
    print("-" * 90)

    public_names = [
        name
        for name in dir(obj)
        if not name.startswith("_")
    ]

    for name in public_names:
        try:
            value = getattr(obj, name)

            if callable(value):
                print(
                    f"{name:<30}: "
                    f"<callable>"
                )
            else:
                print(
                    f"{name:<30}: "
                    f"{safe_value(value)}"
                )
        except Exception as error:
            print(
                f"{name:<30}: "
                f"<error: {error}>"
            )


def inspect_polygon_candidate(
    room: object,
) -> None:
    candidate_names = [
        "polygon",
        "points",
        "vertices",
        "boundary",
        "contour",
        "geometry",
        "coordinates",
        "bbox",
        "bounding_box",
    ]

    print()
    print("=" * 90)
    print("POSSIBLE GEOMETRY ATTRIBUTES")
    print("=" * 90)

    found = False

    for name in candidate_names:
        if not hasattr(room, name):
            continue

        found = True

        try:
            value = getattr(room, name)

            print()
            print(f"{name}:")
            print(safe_value(value))

            if value is not None:
                print(
                    f"Value type: {type(value)}"
                )
        except Exception as error:
            print(
                f"{name}: <error: {error}>"
            )

    if not found:
        print(
            "No common geometry attribute names were found."
        )


def main() -> None:
    svg_path = load_selected_svg()

    print("=" * 90)
    print("ZYNORA ROOM MODEL INSPECTOR")
    print("=" * 90)
    print(f"SVG: {svg_path}")

    house = SvgHouseParser().parse(
        svg_path
    )

    if not house.floors:
        raise ValueError(
            "The parsed house contains no floors."
        )

    floor = house.floors[0]

    print(f"Floor name : {floor.name}")
    print(f"Rooms      : {len(floor.rooms)}")
    print(f"Walls      : {len(floor.walls)}")

    if not floor.rooms:
        raise ValueError(
            "The selected floor contains no rooms."
        )

    room = floor.rooms[0]

    inspect_object(
        title="FIRST ROOM OBJECT",
        obj=room,
    )

    inspect_polygon_candidate(room)

    if floor.walls:
        inspect_object(
            title="FIRST WALL OBJECT",
            obj=floor.walls[0],
        )


if __name__ == "__main__":
    main()