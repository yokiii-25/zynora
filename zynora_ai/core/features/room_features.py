from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class RoomFeatures:
    """
    Structured geometry and furniture features extracted
    from one room.
    """

    room_id: str
    original_room_type: str

    area: float
    perimeter: float
    vertex_count: int

    furniture_count: int
    furniture_counts: dict[str, int] = field(
        default_factory=dict
    )

    # V3 bounding-box geometry
    bbox_min_x: float = 0.0
    bbox_min_y: float = 0.0
    bbox_max_x: float = 0.0
    bbox_max_y: float = 0.0

    bbox_width: float = 0.0
    bbox_height: float = 0.0
    bbox_area: float = 0.0

    # V3 shape features
    aspect_ratio: float = 0.0
    rectangularity: float = 0.0

    # V3 position features
    centroid_x: float = 0.0
    centroid_y: float = 0.0

    # V3 orientation features
    orientation_horizontal: int = 0
    orientation_vertical: int = 0
    orientation_square: int = 0

    def get_furniture_count(
        self,
        furniture_type: str,
    ) -> int:
        return self.furniture_counts.get(
            furniture_type,
            0,
        )

    def has_furniture(
        self,
        furniture_type: str,
    ) -> bool:
        return (
            self.get_furniture_count(
                furniture_type
            )
            > 0
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "room_id": self.room_id,
            "original_room_type": (
                self.original_room_type
            ),
            "area": self.area,
            "perimeter": self.perimeter,
            "vertex_count": self.vertex_count,
            "furniture_count": self.furniture_count,
            "furniture_counts": dict(
                self.furniture_counts
            ),
            "bbox_min_x": self.bbox_min_x,
            "bbox_min_y": self.bbox_min_y,
            "bbox_max_x": self.bbox_max_x,
            "bbox_max_y": self.bbox_max_y,
            "bbox_width": self.bbox_width,
            "bbox_height": self.bbox_height,
            "bbox_area": self.bbox_area,
            "aspect_ratio": self.aspect_ratio,
            "rectangularity": self.rectangularity,
            "centroid_x": self.centroid_x,
            "centroid_y": self.centroid_y,
            "orientation_horizontal": (
                self.orientation_horizontal
            ),
            "orientation_vertical": (
                self.orientation_vertical
            ),
            "orientation_square": (
                self.orientation_square
            ),
        }

    def to_flat_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "room_id": self.room_id,
            "original_room_type": (
                self.original_room_type
            ),
            "area": self.area,
            "perimeter": self.perimeter,
            "vertex_count": self.vertex_count,
            "furniture_count": self.furniture_count,
            "bbox_min_x": self.bbox_min_x,
            "bbox_min_y": self.bbox_min_y,
            "bbox_max_x": self.bbox_max_x,
            "bbox_max_y": self.bbox_max_y,
            "bbox_width": self.bbox_width,
            "bbox_height": self.bbox_height,
            "bbox_area": self.bbox_area,
            "aspect_ratio": self.aspect_ratio,
            "rectangularity": self.rectangularity,
            "centroid_x": self.centroid_x,
            "centroid_y": self.centroid_y,
            "orientation_horizontal": (
                self.orientation_horizontal
            ),
            "orientation_vertical": (
                self.orientation_vertical
            ),
            "orientation_square": (
                self.orientation_square
            ),
        }

        for furniture_type, count in sorted(
            self.furniture_counts.items()
        ):
            normalized_type = (
                furniture_type.strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")
            )

            column_name = (
                "furniture_type_" + normalized_type
            )

            result[column_name] = count

        return result