from __future__ import annotations

from typing import Any, Sequence


EPSILON = 1e-9


def _coordinates(point: Any) -> tuple[float, float]:
    """
    Accepts either:

    - Point objects with .x and .y
    - Tuples such as (x, y)
    - Lists such as [x, y]
    """

    if hasattr(point, "x") and hasattr(point, "y"):
        return float(point.x), float(point.y)

    if isinstance(point, (tuple, list)) and len(point) >= 2:
        return float(point[0]), float(point[1])

    raise TypeError(
        "Point must contain x and y attributes or be an (x, y) sequence."
    )


def point_on_segment(
    point: Any,
    segment_start: Any,
    segment_end: Any,
    epsilon: float = EPSILON,
) -> bool:
    px, py = _coordinates(point)
    x1, y1 = _coordinates(segment_start)
    x2, y2 = _coordinates(segment_end)

    cross_product = (
        (px - x1) * (y2 - y1)
        - (py - y1) * (x2 - x1)
    )

    if abs(cross_product) > epsilon:
        return False

    min_x = min(x1, x2) - epsilon
    max_x = max(x1, x2) + epsilon
    min_y = min(y1, y2) - epsilon
    max_y = max(y1, y2) + epsilon

    return (
        min_x <= px <= max_x
        and min_y <= py <= max_y
    )


def point_in_polygon(
    point: Any,
    polygon: Sequence[Any],
    include_boundary: bool = True,
) -> bool:
    """
    Return True when `point` lies inside `polygon`.

    Correct argument order:

        point_in_polygon(point, polygon)
    """

    if polygon is None or len(polygon) < 3:
        return False

    px, py = _coordinates(point)

    inside = False
    number_of_points = len(polygon)

    for index in range(number_of_points):
        current_point = polygon[index]
        next_point = polygon[(index + 1) % number_of_points]

        if include_boundary and point_on_segment(
            point,
            current_point,
            next_point,
        ):
            return True

        x1, y1 = _coordinates(current_point)
        x2, y2 = _coordinates(next_point)

        crosses_horizontal_ray = (
            (y1 > py) != (y2 > py)
        )

        if not crosses_horizontal_ray:
            continue

        intersection_x = (
            x1
            + (py - y1)
            * (x2 - x1)
            / (y2 - y1)
        )

        if px < intersection_x:
            inside = not inside

    return inside