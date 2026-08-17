from __future__ import annotations

from dataclasses import dataclass

from zynora_ai.core.geometry.polygon import (
    BoundingBox,
    polygon_area,
    polygon_bounding_box,
    polygon_centroid,
    polygon_perimeter,
)
from zynora_ai.core.models.point import Point
from zynora_ai.core.models.room import Room


@dataclass(frozen=True, slots=True)
class RoomGeometry:
    area: float
    perimeter: float
    centroid: Point
    bounding_box: BoundingBox

    @property
    def width(self) -> float:
        return self.bounding_box.width

    @property
    def height(self) -> float:
        return self.bounding_box.height

    @property
    def aspect_ratio(self) -> float:
        if self.height == 0:
            return 0.0

        return self.width / self.height


def calculate_room_geometry(
    room: Room,
) -> RoomGeometry:
    """
    Calculate geometric properties for one room.
    """

    return RoomGeometry(
        area=polygon_area(room.polygon),
        perimeter=polygon_perimeter(room.polygon),
        centroid=polygon_centroid(room.polygon),
        bounding_box=polygon_bounding_box(
            room.polygon
        ),
    )