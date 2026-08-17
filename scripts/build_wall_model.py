import json
from pathlib import Path
from typing import Any

from zynora_ai.geometry.wall_cleanup import WallCleaner
from zynora_ai.geometry.wall_geometry import WallGeometry


ROOT = Path(__file__).resolve().parents[1]

INPUT_PATH = ROOT / "outputs" / "house_10052.json"
OUTPUT_PATH = ROOT / "outputs" / "wall_model_10052.json"


def load_json(path: Path) -> dict[str, Any]:
    """
    Load JSON data from a file.
    """

    if not path.exists():
        raise FileNotFoundError(
            f"Input file not found: {path}\n"
            "Run python -m scripts.export_house_json first."
        )

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_polygon(
    polygon: list[list[float]],
    precision: int = 3,
) -> tuple[tuple[float, float], ...]:
    """
    Create a stable polygon signature for duplicate detection.

    The signature:
    - rounds floating-point values;
    - ignores which polygon vertex appears first;
    - ignores clockwise or counter-clockwise point order.
    """

    points = [
        (
            round(float(point[0]), precision),
            round(float(point[1]), precision),
        )
        for point in polygon
        if len(point) >= 2
    ]

    if not points:
        return tuple()

    forward_versions: list[
        tuple[tuple[float, float], ...]
    ] = []

    for index in range(len(points)):
        rotated = points[index:] + points[:index]
        forward_versions.append(tuple(rotated))

    reversed_points = list(reversed(points))

    reverse_versions: list[
        tuple[tuple[float, float], ...]
    ] = []

    for index in range(len(reversed_points)):
        rotated = (
            reversed_points[index:]
            + reversed_points[:index]
        )

        reverse_versions.append(tuple(rotated))

    return min(forward_versions + reverse_versions)


def round_wall_values(
    wall: dict[str, Any],
) -> dict[str, Any]:
    """
    Round noisy floating-point values for cleaner JSON.
    """

    center = wall.get("center", {})

    center["x"] = round(
        float(center.get("x", 0)),
        3,
    )

    center["y"] = round(
        float(center.get("y", 0)),
        3,
    )

    wall["center"] = center

    wall["length"] = round(
        float(wall.get("length", 0)),
        3,
    )

    wall["thickness"] = round(
        float(wall.get("thickness", 0)),
        3,
    )

    wall["rotation_degrees"] = round(
        float(wall.get("rotation_degrees", 0)),
        3,
    )

    wall["area"] = round(
        float(wall.get("area", 0)),
        3,
    )

    wall["polygon"] = [
        [
            round(float(point[0]), 3),
            round(float(point[1]), 3),
        ]
        for point in wall.get("polygon", [])
        if len(point) >= 2
    ]

    return wall


def assign_wall_ids(
    wall_segments: list[dict[str, Any]],
) -> None:
    """
    Assign stable wall IDs after all cleanup operations.
    """

    for index, segment in enumerate(
        wall_segments,
        start=1,
    ):
        segment["id"] = f"wall_segment_{index:04d}"


def main() -> None:
    house_data = load_json(INPUT_PATH)

    raw_wall_count = len(
        house_data.get("walls", [])
    )

    wall_segments: list[dict[str, Any]] = []

    seen_polygons: set[
        tuple[tuple[float, float], ...]
    ] = set()

    polygon_count = 0
    duplicate_count = 0
    invalid_count = 0

    for wall in house_data.get("walls", []):
        wall_class = wall.get("class", "Wall")
        geometry = wall.get("geometry", {})
        polygons = geometry.get("polygons", [])

        for polygon in polygons:
            polygon_count += 1

            if not isinstance(polygon, list):
                invalid_count += 1
                continue

            if len(polygon) < 3:
                invalid_count += 1
                continue

            polygon_signature = normalize_polygon(
                polygon
            )

            if not polygon_signature:
                invalid_count += 1
                continue

            if polygon_signature in seen_polygons:
                duplicate_count += 1
                continue

            seen_polygons.add(polygon_signature)

            try:
                segment = (
                    WallGeometry.create_wall_segment(
                        polygon=polygon,
                        wall_class=wall_class,
                        segment_id="temporary",
                    )
                )
            except (
                KeyError,
                TypeError,
                ValueError,
                IndexError,
            ):
                invalid_count += 1
                continue

            segment = round_wall_values(segment)

            if (
                segment["length"] <= 0
                or segment["thickness"] <= 0
                or segment["area"] <= 0
            ):
                invalid_count += 1
                continue

            wall_segments.append(segment)

    walls_after_duplicate_cleanup = len(
        wall_segments
    )

    cleaned_wall_segments = (
        WallCleaner.remove_contained_walls(
            wall_segments
        )
    )

    contained_count = (
        walls_after_duplicate_cleanup
        - len(cleaned_wall_segments)
    )

    assign_wall_ids(cleaned_wall_segments)

    wall_model = {
        "source": str(INPUT_PATH),
        "statistics": {
            "raw_wall_objects": raw_wall_count,
            "polygons_processed": polygon_count,
            "walls_after_duplicate_cleanup": (
                walls_after_duplicate_cleanup
            ),
            "duplicates_removed": duplicate_count,
            "contained_walls_removed": (
                contained_count
            ),
            "invalid_polygons_skipped": (
                invalid_count
            ),
            "final_wall_count": len(
                cleaned_wall_segments
            ),
        },
        "wall_segment_count": len(
            cleaned_wall_segments
        ),
        "duplicates_removed": duplicate_count,
        "contained_walls_removed": contained_count,
        "invalid_polygons_skipped": invalid_count,
        "wall_segments": cleaned_wall_segments,
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            wall_model,
            file,
            indent=2,
        )

    print("=" * 56)
    print("Clean wall model created successfully")
    print("=" * 56)

    print(f"Input                    : {INPUT_PATH}")
    print(f"Output                   : {OUTPUT_PATH}")
    print(f"Raw wall objects         : {raw_wall_count}")
    print(f"Polygons processed       : {polygon_count}")
    print(
        "After duplicate cleanup  : "
        f"{walls_after_duplicate_cleanup}"
    )
    print(
        "Duplicates removed       : "
        f"{duplicate_count}"
    )
    print(
        "Contained walls removed  : "
        f"{contained_count}"
    )
    print(
        "Invalid polygons skipped : "
        f"{invalid_count}"
    )
    print(
        "Final wall count         : "
        f"{len(cleaned_wall_segments)}"
    )

    if cleaned_wall_segments:
        first_wall = cleaned_wall_segments[0]

        print("\nFirst wall segment:")
        print(
            f"ID          : {first_wall['id']}"
        )
        print(
            "Class       : "
            f"{first_wall.get('wall_class', 'Wall')}"
        )
        print(
            "Orientation : "
            f"{first_wall.get('orientation', 'unknown')}"
        )
        print(
            f"Length      : {first_wall['length']}"
        )
        print(
            f"Thickness   : {first_wall['thickness']}"
        )
        print(
            "Center      : "
            f"({first_wall['center']['x']}, "
            f"{first_wall['center']['y']})"
        )


if __name__ == "__main__":
    main()