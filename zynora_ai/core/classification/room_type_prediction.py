from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class RoomTypePrediction:
    room_id: str
    original_room_type: str
    predicted_room_type: str
    confidence: float

    reasons: list[str] = field(
        default_factory=list
    )