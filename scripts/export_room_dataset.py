from __future__ import annotations

import csv
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
SELECTED_SVG = PROJECT_ROOT / "outputs" / "selected_svg.txt"
OUTPUT_CSV = PROJECT_ROOT / "outputs" / "room_dataset.csv"


def load_svg_path() -> Path:
    if not SELECTED_SVG.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt was not found."
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
            f"SVG does not exist: {svg_path}"
        )

    return svg_path


def collect_rooms(house) -> list:
    rooms = []

    for floor in house.floors:
        rooms.extend(
            getattr(floor, "rooms", [])
        )

    return rooms


def build_dataset_rows(
    feature_rows,
    predictions,
) -> list[dict]:
    all_furniture_types: set[str] = set()

    for features in feature_rows:
        all_furniture_types.update(
            features.furniture_counts.keys()
        )

    sorted_furniture_types = sorted(
        all_furniture_types
    )

    dataset_rows = []

    for features, prediction in zip(
        feature_rows,
        predictions,
    ):
        row = {
            "room_id": features.room_id,
            "original_room_type": (
                features.original_room_type
            ),
            "predicted_room_type": (
                prediction.predicted_room_type
            ),
            "confidence": prediction.confidence,
            "area": features.area,
            "perimeter": features.perimeter,
            "vertex_count": features.vertex_count,
            "furniture_count": (
                features.furniture_count
            ),
        }

        for furniture_type in sorted_furniture_types:
            column_name = (
                "furniture_"
                + furniture_type.lower()
            )

            row[column_name] = (
                features.furniture_counts.get(
                    furniture_type,
                    0,
                )
            )

        dataset_rows.append(row)

    return dataset_rows


def write_csv(
    rows: list[dict],
    output_path: Path,
) -> None:
    if not rows:
        raise ValueError(
            "No dataset rows were generated."
        )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    fieldnames = list(rows[0].keys())

    with output_path.open(
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


def main() -> None:
    svg_path = load_svg_path()

    print("=" * 100)
    print("ZYNORA ROOM DATASET EXPORT")
    print("=" * 100)

    print()
    print("Loading SVG...")
    print(svg_path)

    house = SvgHouseParser().parse(svg_path)
    rooms = collect_rooms(house)

    root = ET.parse(svg_path).getroot()

    furniture_items = FurnitureParser().parse(
        root
    )

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

    dataset_rows = build_dataset_rows(
        feature_rows=feature_rows,
        predictions=predictions,
    )

    write_csv(
        rows=dataset_rows,
        output_path=OUTPUT_CSV,
    )

    print()
    print(f"Rooms exported : {len(dataset_rows)}")
    print(f"CSV path       : {OUTPUT_CSV}")

    print()
    print("=" * 100)
    print("ROOM DATASET EXPORT COMPLETED")
    print("=" * 100)


if __name__ == "__main__":
    main()