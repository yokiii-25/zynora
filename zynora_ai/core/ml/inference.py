from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import joblib
import numpy as np
import pandas as pd

from zynora_ai.core.features.room_feature_extractor import (
    RoomFeatureExtractor,
)
from zynora_ai.core.ml.feature_engineering import (
    engineer_features,
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


PROJECT_ROOT = Path(__file__).resolve().parents[3]

DEFAULT_MODEL_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "models"
    / "room_classifier_v5.pkl"
)

DEFAULT_ENCODER_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "models"
    / "room_label_encoder_v5.pkl"
)

DEFAULT_FEATURES_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "models"
    / "room_feature_columns_v5.pkl"
)


@dataclass(slots=True)
class RoomPrediction:
    room_id: str
    original_room_type: str
    predicted_room_type: str
    confidence: float
    confidence_status: str
    area: float
    centroid_x: float
    centroid_y: float
    furniture_count: int
    probabilities: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "room_id": self.room_id,
            "original_room_type": self.original_room_type,
            "predicted_room_type": self.predicted_room_type,
            "confidence": self.confidence,
            "confidence_percentage": round(
                self.confidence * 100,
                2,
            ),
            "confidence_status": self.confidence_status,
            "area": self.area,
            "centroid_x": self.centroid_x,
            "centroid_y": self.centroid_y,
            "furniture_count": self.furniture_count,
            "probabilities": self.probabilities,
        }


def collect_rooms(house: Any) -> list[Any]:
    rooms: list[Any] = []

    for floor in getattr(
        house,
        "floors",
        [],
    ):
        rooms.extend(
            getattr(
                floor,
                "rooms",
                [],
            )
        )

    return rooms


def confidence_status(
    confidence: float,
) -> str:
    if confidence >= 0.75:
        return "high_confidence"

    if confidence >= 0.50:
        return "review_recommended"

    return "low_confidence"


class RoomTypeInferenceV5:
    def __init__(
        self,
        model_path: str | Path = DEFAULT_MODEL_PATH,
        encoder_path: str | Path = DEFAULT_ENCODER_PATH,
        features_path: str | Path = DEFAULT_FEATURES_PATH,
    ) -> None:
        self.model_path = Path(model_path)
        self.encoder_path = Path(encoder_path)
        self.features_path = Path(features_path)

        self._validate_model_files()

        print("Loading V5 inference artifacts...")

        self.model = joblib.load(
            self.model_path
        )

        self.label_encoder = joblib.load(
            self.encoder_path
        )

        self.feature_columns: list[str] = (
            joblib.load(
                self.features_path
            )
        )

        if not self.feature_columns:
            raise ValueError(
                "The saved V5 feature-column list is empty."
            )

    def _validate_model_files(self) -> None:
        required_files = [
            self.model_path,
            self.encoder_path,
            self.features_path,
        ]

        missing_files = [
            path
            for path in required_files
            if not path.exists()
        ]

        if missing_files:
            missing_text = "\n".join(
                str(path)
                for path in missing_files
            )

            raise FileNotFoundError(
                "Required V5 inference files are missing:\n"
                + missing_text
            )

    @staticmethod
    def _validate_svg(
        svg_path: str | Path,
    ) -> Path:
        path = Path(svg_path).expanduser().resolve()

        if not path.exists():
            raise FileNotFoundError(
                f"SVG file not found: {path}"
            )

        if path.suffix.lower() != ".svg":
            raise ValueError(
                f"Expected an SVG file, received: {path}"
            )

        return path

    @staticmethod
    def _build_raw_dataframe(
        svg_path: Path,
    ) -> pd.DataFrame:
        house = SvgHouseParser().parse(
            svg_path
        )

        rooms = collect_rooms(
            house
        )

        if not rooms:
            raise ValueError(
                "No rooms were extracted from the SVG."
            )

        root = ET.parse(
            svg_path
        ).getroot()

        furniture_items = (
            FurnitureParser().parse(
                root
            )
        )

        assignments = (
            FurnitureRoomAssignment.assign(
                rooms=rooms,
                furniture_items=furniture_items,
            )
        )

        feature_rows = (
            RoomFeatureExtractor.extract_all(
                rooms=rooms,
                assignments=assignments,
            )
        )

        building_id = svg_path.parent.name

        rows: list[dict[str, Any]] = []

        for room_features in feature_rows:
            row = room_features.to_flat_dict()

            row["source_svg"] = str(
                svg_path
            )

            row["building_id"] = (
                building_id
            )

            rows.append(row)

        dataframe = pd.DataFrame(
            rows
        )

        if dataframe.empty:
            raise ValueError(
                "Room feature extraction produced no rows."
            )

        return dataframe

    def _align_model_features(
        self,
        engineered_dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        aligned = engineered_dataframe.copy()

        missing_columns = [
            column
            for column in self.feature_columns
            if column not in aligned.columns
        ]

        for column in missing_columns:
            aligned[column] = 0.0

        model_input = aligned[
            self.feature_columns
        ].copy()

        model_input = (
            model_input
            .apply(
                pd.to_numeric,
                errors="coerce",
            )
            .replace(
                [np.inf, -np.inf],
                0,
            )
            .fillna(0)
        )

        return model_input

    def predict_svg(
        self,
        svg_path: str | Path,
    ) -> list[RoomPrediction]:
        resolved_svg = self._validate_svg(
            svg_path
        )

        raw_dataframe = (
            self._build_raw_dataframe(
                resolved_svg
            )
        )

        engineered_dataframe = engineer_features(
            raw_dataframe
        )

        model_input = (
            self._align_model_features(
                engineered_dataframe
            )
        )

        encoded_predictions = self.model.predict(
            model_input
        )

        probability_matrix = (
            self.model.predict_proba(
                model_input
            )
        )

        predicted_names = (
            self.label_encoder.inverse_transform(
                encoded_predictions.astype(int)
            )
        )

        class_names = list(
            self.label_encoder.classes_
        )

        predictions: list[
            RoomPrediction
        ] = []

        for row_index in range(
            len(engineered_dataframe)
        ):
            confidence = float(
                probability_matrix[
                    row_index
                ].max()
            )

            probability_values = {
                class_name: round(
                    float(
                        probability_matrix[
                            row_index,
                            class_index,
                        ]
                    ),
                    6,
                )
                for class_index, class_name
                in enumerate(class_names)
            }

            row = engineered_dataframe.iloc[
                row_index
            ]

            predictions.append(
                RoomPrediction(
                    room_id=str(
                        row.get(
                            "room_id",
                            f"room-{row_index + 1}",
                        )
                    ),
                    original_room_type=str(
                        row.get(
                            "original_room_type",
                            "Unknown",
                        )
                    ),
                    predicted_room_type=str(
                        predicted_names[
                            row_index
                        ]
                    ),
                    confidence=confidence,
                    confidence_status=(
                        confidence_status(
                            confidence
                        )
                    ),
                    area=float(
                        row.get(
                            "area",
                            0.0,
                        )
                    ),
                    centroid_x=float(
                        row.get(
                            "centroid_x",
                            0.0,
                        )
                    ),
                    centroid_y=float(
                        row.get(
                            "centroid_y",
                            0.0,
                        )
                    ),
                    furniture_count=int(
                        row.get(
                            "furniture_count",
                            0,
                        )
                    ),
                    probabilities=(
                        probability_values
                    ),
                )
            )

        return predictions