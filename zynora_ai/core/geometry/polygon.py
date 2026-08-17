from __future__ import annotations

import math
from dataclasses import dataclass

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

    @property
    def center(self) -> Point:
        return Point(
            x=(self.min_x + self.max_x) / 2,
            y=(self.min_y + self.max_y) / 2,
        )


def polygon_area(points: list[Point]) -> float:
    """
    Calculate polygon area using the shoelace formula.

    The result is returned in squared SVG coordinate units.
    """

    if len(points) < 3:
        return 0.0

    twice_area = 0.0

    for index, current in enumerate(points):
        next_point = points[(index + 1) % len(points)]

        twice_area += (
            current.x * next_point.y
            - next_point.x * current.y
        )

    return abs(twice_area) / 2.0


def polygon_signed_area(points: list[Point]) -> float:
    """
    Return signed polygon area.

    Positive or negative direction depends on the polygon's
    clockwise or counter-clockwise point order.
    """

    if len(points) < 3:
        return 0.0

    twice_area = 0.0

    for index, current in enumerate(points):
        next_point = points[(index + 1) % len(points)]

        twice_area += (
            current.x * next_point.y
            - next_point.x * current.y
        )

    return twice_area / 2.0


def polygon_perimeter(points: list[Point]) -> float:
    """
    Calculate the total boundary length of a polygon.
    """

    if len(points) < 2:
        return 0.0

    perimeter = 0.0

    for index, current in enumerate(points):
        next_point = points[(index + 1) % len(points)]

        perimeter += math.hypot(
            next_point.x - current.x,
            next_point.y - current.y,
        )

    return perimeter


def polygon_centroid(points: list[Point]) -> Point:
    """
    Calculate the centroid of a polygon.

    For invalid or zero-area polygons, the average point is used.
    """

    if not points:
        return Point(x=0.0, y=0.0)

    if len(points) < 3:
        return average_point(points)

    signed_area = polygon_signed_area(points)

    if math.isclose(signed_area, 0.0, abs_tol=1e-9):
        return average_point(points)

    centroid_x = 0.0
    centroid_y = 0.0

    for index, current in enumerate(points):
        next_point = points[(index + 1) % len(points)]

        cross_product = (
            current.x * next_point.y
            - next_point.x * current.y
        )

        centroid_x += (
            current.x + next_point.x
        ) * cross_product

        centroid_y += (
            current.y + next_point.y
        ) * cross_product

    divisor = 6.0 * signed_area

    return Point(
        x=centroid_x / divisor,
        y=centroid_y / divisor,
    )


def polygon_bounding_box(
    points: list[Point],
) -> BoundingBox:
    """
    Calculate the smallest axis-aligned rectangle containing
    every polygon point.
    """

    if not points:
        return BoundingBox(
            min_x=0.0,
            min_y=0.0,
            max_x=0.0,
            max_y=0.0,
        )

    x_values = [point.x for point in points]
    y_values = [point.y for point in points]

    return BoundingBox(
        min_x=min(x_values),
        min_y=min(y_values),
        max_x=max(x_values),
        max_y=max(y_values),
    )


def average_point(points: list[Point]) -> Point:
    """
    Return the arithmetic average of the given points.
    """

    if not points:
        return Point(x=0.0, y=0.0)

    return Point(
        x=sum(point.x for point in points) / len(points),
        y=sum(point.y for point in points) / len(points),
    )