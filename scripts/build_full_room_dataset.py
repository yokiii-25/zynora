from __future__ import annotations

import csv
import traceback
from pathlib import Path
import xml.etree.ElementTree as ET

from zynora_ai.core.classification.rule_based_room_classifier import (
    RuleBasedRoomClassifier,
)
from zynora_ai.core.features.room_feature_extractor import (
    RoomFeatureExtractor,
)
from zynora_ai.core.parser.furniture_parser import (
    FurnitureParser,
)
from zynora_ai.core.parser.svg_house_parser import (
    SvgHouseParser,
)
from zynora_ai.core.relationships.furniture_room_assignment import (
    FurnitureRoomAssignment,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_ROOT = (
    PROJECT_ROOT
    / "datasets"
    / "raw"
    / "cubicasa5k"
    / "cubicasa5k"
)

OUTPUT_CSV = (
    PROJECT_ROOT
    / "outputs"
    / "room_dataset_full_v3.csv"
)

ERROR_LOG = (
    PROJECT_ROOT
    / "outputs"
    / "room_dataset_v3_errors.txt"
)


def collect_rooms(house) -> list:
    rooms = []

    for floor in getattr(house, "floors", []):
        rooms.extend(
            getattr(floor, "rooms", [])
        )

    return rooms


def find_svg_files() -> list[Path]:
    if not DATASET_ROOT.exists():
        raise FileNotFoundError(
            f"Dataset directory does not exist: "
            f"{DATASET_ROOT}"
        )

    svg_files = sorted(
        DATASET_ROOT.rglob("model.svg")
    )

    if not svg_files:
        raise FileNotFoundError(
            f"No model.svg files found inside: "
            f"{DATASET_ROOT}"
        )

    return svg_files


def process_svg(
    svg_path: Path,
) -> list[dict]:
    house = SvgHouseParser().parse(svg_path)

    rooms = collect_rooms(house)

    if not rooms:
        return []

    root = ET.parse(svg_path).getroot()

    furniture_items = FurnitureParser().parse(root)

    assignments = FurnitureRoomAssignment.assign(
        rooms=rooms,
        furniture_items=furniture_items,
    )

    feature_rows = RoomFeatureExtractor.extract_all(
        rooms=rooms,
        assignments=assignments,
    )

    predictions = RuleBasedRoomClassifier.classify_all(
        feature_rows
    )

    relative_path = svg_path.relative_to(DATASET_ROOT)

    dataset_rows = []

    for features, prediction in zip(feature_rows, predictions):

        row = {
            "source_svg": str(relative_path),
            "building_id": svg_path.parent.name,
            "room_id": features.room_id,
            "original_room_type": features.original_room_type,
            "predicted_room_type": prediction.predicted_room_type,
            "confidence": prediction.confidence,
            "area": features.area,
            "perimeter": features.perimeter,
            "vertex_count": features.vertex_count,
            "bbox_min_x": features.bbox_min_x,
            "bbox_min_y": features.bbox_min_y,
            "bbox_max_x": features.bbox_max_x,
            "bbox_max_y": features.bbox_max_y,
            "bbox_width": features.bbox_width,
            "bbox_height": features.bbox_height,
            "bbox_area": features.bbox_area,
            "aspect_ratio": features.aspect_ratio,
            "rectangularity": features.rectangularity,
            "centroid_x": features.centroid_x,
            "centroid_y": features.centroid_y,
            "orientation_horizontal": (
                features.orientation_horizontal
            ),
            "orientation_vertical": (
                features.orientation_vertical
            ),
            "orientation_square": (
                features.orientation_square
            ),
            "furniture_count": features.furniture_count,
        }

        for furniture_type, count in features.furniture_counts.items():

            normalized_type = (
                furniture_type.strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")
            )

            column_name = (
                "furniture_type_" + normalized_type
            )

            row[column_name] = count

        dataset_rows.append(row)

    return dataset_rows


def normalize_rows(
    rows: list[dict],
) -> tuple[list[dict], list[str]]:
    if not rows:
        return [], []

    fixed_columns = [
        "source_svg",
        "building_id",
        "room_id",
        "original_room_type",
        "predicted_room_type",
        "confidence",
        "area",
        "perimeter",
        "vertex_count",
        "furniture_count",
        "bbox_min_x",
        "bbox_min_y",
        "bbox_max_x",
        "bbox_max_y",
        "bbox_width",
        "bbox_height",
        "bbox_area",
        "aspect_ratio",
        "rectangularity",
        "centroid_x",
        "centroid_y",
        "orientation_horizontal",
        "orientation_vertical",
        "orientation_square",
    ]

    furniture_columns = sorted(
        {
            key
            for row in rows
            for key in row
            if key.startswith("furniture_type_")
        }
    )

    fieldnames = (
        fixed_columns
        + furniture_columns
    )

    normalized_rows = []

    for row in rows:
        normalized_row = {}

        for fieldname in fieldnames:
            if fieldname.startswith(
                "furniture_type_"
            ):
                normalized_row[fieldname] = (
                    row.get(fieldname, 0)
                )
            else:
                normalized_row[fieldname] = (
                    row.get(fieldname, "")
                )

        normalized_rows.append(
            normalized_row
        )

    return normalized_rows, fieldnames


def write_csv(
    rows: list[dict],
    fieldnames: list[str],
) -> None:
    OUTPUT_CSV.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_CSV.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)


def write_error_log(
    errors: list[str],
) -> None:
    ERROR_LOG.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    ERROR_LOG.write_text(
        "\n\n".join(errors),
        encoding="utf-8",
    )


def main() -> None:
    print("=" * 100)
    print("ZYNORA FULL CUBICASA ROOM DATASET BUILDER")
    print("=" * 100)

    svg_files = find_svg_files()

    print()
    print(f"Dataset root : {DATASET_ROOT}")
    print(f"SVG files    : {len(svg_files)}")

    all_rows: list[dict] = []
    errors: list[str] = []

    successful_files = 0
    failed_files = 0

    for index, svg_path in enumerate(
        svg_files,
        start=1,
    ):
        try:
            rows = process_svg(
                svg_path
            )

            all_rows.extend(rows)
            successful_files += 1

            print(
                f"[{index:>5}/{len(svg_files)}] "
                f"OK     "
                f"Rooms={len(rows):>3}  "
                f"{svg_path.parent.name}"
            )

        except Exception as error:
            failed_files += 1

            error_message = (
                f"SVG: {svg_path}\n"
                f"ERROR: {error}\n"
                f"{traceback.format_exc()}"
            )

            errors.append(
                error_message
            )

            print(
                f"[{index:>5}/{len(svg_files)}] "
                f"FAILED "
                f"{svg_path}"
            )

    normalized_rows, fieldnames = normalize_rows(
        all_rows
    )

    if normalized_rows:
        write_csv(
            rows=normalized_rows,
            fieldnames=fieldnames,
        )

    write_error_log(
        errors
    )

    print()
    print("=" * 100)
    print("DATASET BUILD SUMMARY")
    print("=" * 100)
    print(f"Total SVG files     : {len(svg_files)}")
    print(f"Successful files    : {successful_files}")
    print(f"Failed files        : {failed_files}")
    print(f"Total room records  : {len(normalized_rows)}")
    print(f"Dataset CSV         : {OUTPUT_CSV}")
    print(f"Error log           : {ERROR_LOG}")
    print("=" * 100)


if __name__ == "__main__":
    main()