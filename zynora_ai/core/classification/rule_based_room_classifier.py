from __future__ import annotations

from zynora_ai.core.classification.room_type_prediction import (
    RoomTypePrediction,
)
from zynora_ai.core.features.room_features import (
    RoomFeatures,
)


class RuleBasedRoomClassifier:
    @staticmethod
    def classify(
        features: RoomFeatures,
    ) -> RoomTypePrediction:
        original_type = (
            features.original_room_type.strip()
        )

        normalized_original = (
            original_type.lower()
        )

        # Preserve trusted labels from the SVG.
        if normalized_original not in {
            "",
            "undefined",
            "unknown",
            "none",
        }:
            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type=original_type,
                confidence=1.0,
                reasons=[
                    "The SVG already provides a room type."
                ],
            )

        counts = features.furniture_counts

        def count(*types: str) -> int:
            return sum(
                counts.get(item_type, 0)
                for item_type in types
            )

        reasons: list[str] = []

        # Sauna
        sauna_benches = count(
            "SaunaBenchHigh",
            "SaunaBenchLow",
        )
        sauna_stove = count("SaunaStove")

        if sauna_stove > 0 and sauna_benches > 0:
            reasons.append(
                "Contains a sauna stove and sauna benches."
            )

            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type="Sauna",
                confidence=0.99,
                reasons=reasons,
            )

        # Bathroom
        toilet_count = count("Toilet")
        shower_count = count(
            "Shower",
            "ShowerScreen",
        )
        bath_count = count(
            "Bathtub",
            "Jacuzzi",
        )
        sink_count = count(
            "Sink",
            "DoubleSink",
        )

        bathroom_score = sum(
            [
                toilet_count > 0,
                shower_count > 0,
                bath_count > 0,
                sink_count > 0,
            ]
        )

        if toilet_count > 0 and bathroom_score >= 2:
            reasons.append(
                "Contains a toilet and additional bathroom fixtures."
            )

            if shower_count > 0:
                reasons.append(
                    "Contains a shower or shower screen."
                )

            if bath_count > 0:
                reasons.append(
                    "Contains a bathtub or jacuzzi."
                )

            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type="Bathroom",
                confidence=0.98,
                reasons=reasons,
            )

        # Kitchen
        refrigerator_count = count(
            "Refrigerator"
        )
        stove_count = count(
            "IntegratedStove",
            "Stove",
            "Oven",
        )
        kitchen_sink_count = count(
            "Sink",
            "DoubleSink",
        )
        cabinet_count = count(
            "BaseCabinet",
            "WallCabinet",
            "KitchenCabinet",
        )

        kitchen_score = sum(
            [
                refrigerator_count > 0,
                stove_count > 0,
                kitchen_sink_count > 0,
                cabinet_count > 0,
            ]
        )

        if kitchen_score >= 3:
            reasons.append(
                "Contains several major kitchen fixtures."
            )

            if refrigerator_count > 0:
                reasons.append(
                    "Contains a refrigerator."
                )

            if stove_count > 0:
                reasons.append(
                    "Contains a stove or oven."
                )

            if kitchen_sink_count > 0:
                reasons.append(
                    "Contains a sink."
                )

            if cabinet_count > 0:
                reasons.append(
                    "Contains kitchen cabinets."
                )

            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type="Kitchen",
                confidence=0.97,
                reasons=reasons,
            )

        # Walk-in closet or storage
        closet_count = count("Closet")
        other_count = (
            features.furniture_count
            - closet_count
        )

        if closet_count >= 4 and other_count <= 1:
            reasons.append(
                "The room is dominated by closet furniture."
            )

            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type="WalkInCloset",
                confidence=0.93,
                reasons=reasons,
            )

        if closet_count >= 2 and other_count == 0:
            reasons.append(
                "Contains only closet furniture."
            )

            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type="Storage",
                confidence=0.82,
                reasons=reasons,
            )

        # Empty room
        if features.furniture_count == 0:
            reasons.append(
                "No semantic furniture evidence is available."
            )

            return RoomTypePrediction(
                room_id=features.room_id,
                original_room_type=original_type,
                predicted_room_type="Unknown",
                confidence=0.20,
                reasons=reasons,
            )

        reasons.append(
            "Furniture evidence is insufficient for a reliable label."
        )

        return RoomTypePrediction(
            room_id=features.room_id,
            original_room_type=original_type,
            predicted_room_type="Unknown",
            confidence=0.30,
            reasons=reasons,
        )

    @classmethod
    def classify_all(
        cls,
        feature_rows: list[RoomFeatures],
    ) -> list[RoomTypePrediction]:
        return [
            cls.classify(features)
            for features in feature_rows
        ]