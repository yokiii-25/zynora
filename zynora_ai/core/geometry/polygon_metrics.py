from __future__ import annotations

from dataclasses import dataclass
from math import sqrt

from zynora_ai.core.models.point import Point


@dataclass(frozen=True, slots=True)
class BoundingBox:
    min_x: float
    min_y: float
    max_x: float
    max_y: float

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    @property
    def height(self) -> float:
        return self.max_y - self.min_y


def polygon_area(
    polygon: list[Point],
) -> float:
    """
    Compute polygon area using the shoelace formula.
    """

    if len(polygon) < 3:
        return 0.0

    area = 0.0

    for i in range(len(polygon)):
        j = (i + 1) % len(polygon)

        area += (
            polygon[i].x * polygon[j].y
            - polygon[j].x * polygon[i].y
        )

    return abs(area) * 0.5


def polygon_perimeter(
    polygon: list[Point],
) -> float:
    """
    Compute polygon perimeter.
    """

    if len(polygon) < 2:
        return 0.0

    perimeter = 0.0

    for i in range(len(polygon)):
        j = (i + 1) % len(polygon)

        dx = polygon[j].x - polygon[i].x
        dy = polygon[j].y - polygon[i].y

        perimeter += sqrt(dx * dx + dy * dy)

    return perimeter


def bounding_box(
    polygon: list[Point],
) -> BoundingBox:
    """
    Compute polygon bounding box.
    """

    xs = [p.x for p in polygon]
    ys = [p.y for p in polygon]

    return BoundingBox(
        min_x=min(xs),
        min_y=min(ys),
        max_x=max(xs),
        max_y=max(ys),
    )


def polygon_width(
    polygon: list[Point],
) -> float:
    return bounding_box(
        polygon
    ).width


def polygon_height(
    polygon: list[Point],
) -> float:
    return bounding_box(
        polygon
    ).height


def aspect_ratio(
    polygon: list[Point],
) -> float:
    """
    Width / Height of the polygon bounding box.
    """

    box = bounding_box(
        polygon
    )

    if (
        box.width <= 0
        or box.height <= 0
    ):
        return 0.0

    return max(
        box.width,
        box.height,
    ) / min(
        box.width,
        box.height,
    )


def polygon_centroid(
    polygon: list[Point],
) -> Point:
    """
    Approximate centroid by averaging vertices.
    """

    if not polygon:
        return Point(
            x=0.0,
            y=0.0,
        )

    x = sum(
        p.x
        for p in polygon
    ) / len(polygon)

    y = sum(
        p.y
        for p in polygon
    ) / len(polygon)

    return Point(
        x=x,
        y=y,
    )