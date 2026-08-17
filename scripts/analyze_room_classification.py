from __future__ import annotations

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


def main() -> None:
    svg_path = load_svg_path()

    print("=" * 100)
    print("ZYNORA RULE-BASED ROOM CLASSIFICATION")
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

    predictions = (
        RuleBasedRoomClassifier.classify_all(
            feature_rows
        )
    )

    print()
    print(f"Rooms       : {len(rooms)}")
    print(f"Predictions : {len(predictions)}")

    for features, prediction in zip(
        feature_rows,
        predictions,
    ):
        print()
        print("-" * 100)
        print(
            f"ROOM ID          : "
            f"{prediction.room_id}"
        )
        print(
            f"ORIGINAL TYPE    : "
            f"{prediction.original_room_type}"
        )
        print(
            f"PREDICTED TYPE   : "
            f"{prediction.predicted_room_type}"
        )
        print(
            f"CONFIDENCE       : "
            f"{prediction.confidence:.2%}"
        )
        print(
            f"AREA             : "
            f"{features.area:.2f}"
        )
        print(
            f"FURNITURE COUNT  : "
            f"{features.furniture_count}"
        )

        print("REASONS:")

        for reason in prediction.reasons:
            print(f"  - {reason}")

        if features.furniture_counts:
            print("FURNITURE:")

            for furniture_type, count in sorted(
                features.furniture_counts.items()
            ):
                print(
                    f"  {furniture_type:<25} "
                    f"{count}"
                )

    print()
    print("=" * 100)
    print("ROOM CLASSIFICATION COMPLETED")
    print("=" * 100)


if __name__ == "__main__":
    main()