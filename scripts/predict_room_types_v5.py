from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from zynora_ai.core.ml.inference import (
    RoomPrediction,
    RoomTypeInferenceV5,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SELECTED_SVG_FILE = (
    PROJECT_ROOT
    / "outputs"
    / "selected_svg.txt"
)

DEFAULT_OUTPUT_JSON = (
    PROJECT_ROOT
    / "outputs"
    / "room_predictions_v5.json"
)


def load_selected_svg() -> Path:
    if not SELECTED_SVG_FILE.exists():
        raise FileNotFoundError(
            "No SVG path was supplied and "
            "outputs/selected_svg.txt was not found."
        )

    svg_text = SELECTED_SVG_FILE.read_text(
        encoding="utf-8",
    ).strip()

    if not svg_text:
        raise ValueError(
            "outputs/selected_svg.txt is empty."
        )

    svg_path = Path(
        svg_text
    )

    if not svg_path.is_absolute():
        svg_path = (
            PROJECT_ROOT
            / svg_path
        )

    return svg_path.resolve()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Predict room types from a floor-plan SVG "
            "using the Zynora V5 ensemble model."
        )
    )

    parser.add_argument(
        "svg_path",
        nargs="?",
        help=(
            "Path to the SVG floor plan. When omitted, "
            "outputs/selected_svg.txt is used."
        ),
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_JSON,
        help=(
            "Path where the prediction JSON will be saved."
        ),
    )

    parser.add_argument(
        "--top",
        type=int,
        default=3,
        help=(
            "Number of highest-probability classes to "
            "show in the terminal."
        ),
    )

    return parser.parse_args()


def get_top_probabilities(
    prediction: RoomPrediction,
    limit: int,
) -> list[tuple[str, float]]:
    return sorted(
        prediction.probabilities.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:max(limit, 1)]


def print_predictions(
    predictions: list[RoomPrediction],
    top_count: int,
) -> None:
    print()
    print("=" * 110)
    print("ZYNORA V5 ROOM-TYPE INFERENCE")
    print("=" * 110)
    print(
        f"{'#':<4}"
        f"{'ROOM ID':<39}"
        f"{'PREDICTED TYPE':<22}"
        f"{'CONFIDENCE':<13}"
        f"{'STATUS'}"
    )
    print("-" * 110)

    for index, prediction in enumerate(
        predictions,
        start=1,
    ):
        print(
            f"{index:<4}"
            f"{prediction.room_id[:36]:<39}"
            f"{prediction.predicted_room_type:<22}"
            f"{prediction.confidence * 100:>9.2f}%   "
            f"{prediction.confidence_status}"
        )

        top_probabilities = (
            get_top_probabilities(
                prediction,
                top_count,
            )
        )

        top_text = " | ".join(
            f"{class_name}: {probability * 100:.2f}%"
            for class_name, probability
            in top_probabilities
        )

        print(
            f"     Top predictions: {top_text}"
        )

        print(
            f"     Area={prediction.area:.2f} | "
            f"Furniture={prediction.furniture_count} | "
            f"Centroid=({prediction.centroid_x:.2f}, "
            f"{prediction.centroid_y:.2f})"
        )

        print("-" * 110)


def build_output_payload(
    svg_path: Path,
    predictions: list[RoomPrediction],
) -> dict[str, Any]:
    high_confidence_count = sum(
        prediction.confidence_status
        == "high_confidence"
        for prediction in predictions
    )

    review_count = sum(
        prediction.confidence_status
        == "review_recommended"
        for prediction in predictions
    )

    low_confidence_count = sum(
        prediction.confidence_status
        == "low_confidence"
        for prediction in predictions
    )

    return {
        "success": True,
        "model_version": "v5",
        "source_svg": str(
            svg_path
        ),
        "room_count": len(
            predictions
        ),
        "summary": {
            "high_confidence": (
                high_confidence_count
            ),
            "review_recommended": (
                review_count
            ),
            "low_confidence": (
                low_confidence_count
            ),
        },
        "rooms": [
            prediction.to_dict()
            for prediction in predictions
        ],
    }


def main() -> None:
    arguments = parse_arguments()

    if arguments.svg_path:
        svg_path = Path(
            arguments.svg_path
        ).expanduser().resolve()
    else:
        svg_path = load_selected_svg()

    print("=" * 100)
    print("ZYNORA V5 INFERENCE")
    print("=" * 100)
    print(f"SVG file : {svg_path}")

    inference_engine = (
        RoomTypeInferenceV5()
    )

    predictions = (
        inference_engine.predict_svg(
            svg_path
        )
    )

    print_predictions(
        predictions=predictions,
        top_count=arguments.top,
    )

    output_payload = build_output_payload(
        svg_path=svg_path,
        predictions=predictions,
    )

    output_path = (
        arguments.output
        .expanduser()
        .resolve()
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path.write_text(
        json.dumps(
            output_payload,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("=" * 100)
    print("INFERENCE COMPLETED")
    print("=" * 100)
    print(
        f"Rooms predicted : {len(predictions)}"
    )
    print(
        f"JSON output     : {output_path}"
    )


if __name__ == "__main__":
    main()