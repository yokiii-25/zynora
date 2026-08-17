from __future__ import annotations

import math

from zynora_ai.core.models.point import Point


DEFAULT_TOLERANCE = 1.0


def polygon_edges(
    points: list[Point],
) -> list[tuple[Point, Point]]:
    """
    Convert polygon points into closed polygon edges.
    """

    if len(points) < 2:
        return []

    return [
        (
            points[index],
            points[(index + 1) % len(points)],
        )
        for index in range(len(points))
    ]


def point_distance(
    first: Point,
    second: Point,
) -> float:
    """
    Calculate the Euclidean distance between two points.
    """

    return math.hypot(
        second.x - first.x,
        second.y - first.y,
    )


def point_on_segment(
    point: Point,
    start: Point,
    end: Point,
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    """
    Check whether a point lies on a line segment.
    """

    segment_length = point_distance(start, end)

    if math.isclose(
        segment_length,
        0.0,
        abs_tol=tolerance,
    ):
        return point_distance(point, start) <= tolerance

    cross_product = (
        (point.y - start.y) * (end.x - start.x)
        - (point.x - start.x) * (end.y - start.y)
    )

    if abs(cross_product) > tolerance * segment_length:
        return False

    dot_product = (
        (point.x - start.x) * (end.x - start.x)
        + (point.y - start.y) * (end.y - start.y)
    )

    if dot_product < -tolerance:
        return False

    squared_length = (
        (end.x - start.x) ** 2
        + (end.y - start.y) ** 2
    )

    if dot_product > squared_length + tolerance:
        return False

    return True


def orientation(
    first: Point,
    second: Point,
    third: Point,
    tolerance: float = DEFAULT_TOLERANCE,
) -> int:
    """
    Return the orientation of three points.

    Returns:
        0: collinear
        1: clockwise
        2: counter-clockwise
    """

    value = (
        (second.y - first.y) * (third.x - second.x)
        - (second.x - first.x) * (third.y - second.y)
    )

    if abs(value) <= tolerance:
        return 0

    return 1 if value > 0 else 2


def segments_intersect(
    first_start: Point,
    first_end: Point,
    second_start: Point,
    second_end: Point,
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    """
    Check whether two line segments intersect or touch.
    """

    orientation_1 = orientation(
        first_start,
        first_end,
        second_start,
        tolerance,
    )

    orientation_2 = orientation(
        first_start,
        first_end,
        second_end,
        tolerance,
    )

    orientation_3 = orientation(
        second_start,
        second_end,
        first_start,
        tolerance,
    )

    orientation_4 = orientation(
        second_start,
        second_end,
        first_end,
        tolerance,
    )

    if (
        orientation_1 != orientation_2
        and orientation_3 != orientation_4
    ):
        return True

    if (
        orientation_1 == 0
        and point_on_segment(
            second_start,
            first_start,
            first_end,
            tolerance,
        )
    ):
        return True

    if (
        orientation_2 == 0
        and point_on_segment(
            second_end,
            first_start,
            first_end,
            tolerance,
        )
    ):
        return True

    if (
        orientation_3 == 0
        and point_on_segment(
            first_start,
            second_start,
            second_end,
            tolerance,
        )
    ):
        return True

    if (
        orientation_4 == 0
        and point_on_segment(
            first_end,
            second_start,
            second_end,
            tolerance,
        )
    ):
        return True

    return False


def point_in_polygon(
    point: Point,
    polygon: list[Point],
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    """
    Check whether a point is inside or on the boundary
    of a polygon using ray casting.
    """

    if len(polygon) < 3:
        return False

    for start, end in polygon_edges(polygon):
        if point_on_segment(
            point,
            start,
            end,
            tolerance,
        ):
            return True

    inside = False
    previous_index = len(polygon) - 1

    for current_index in range(len(polygon)):
        current = polygon[current_index]
        previous = polygon[previous_index]

        crosses_ray = (
            (current.y > point.y)
            != (previous.y > point.y)
        )

        if crosses_ray:
            denominator = previous.y - current.y

            if math.isclose(
                denominator,
                0.0,
                abs_tol=1e-12,
            ):
                previous_index = current_index
                continue

            intersection_x = (
                (previous.x - current.x)
                * (point.y - current.y)
                / denominator
                + current.x
            )

            if point.x < intersection_x:
                inside = not inside

        previous_index = current_index

    return inside


def distance_point_to_segment(
    point: Point,
    start: Point,
    end: Point,
) -> float:
    """
    Calculate the shortest distance from a point
    to a line segment.
    """

    delta_x = end.x - start.x
    delta_y = end.y - start.y

    squared_length = delta_x**2 + delta_y**2

    if math.isclose(
        squared_length,
        0.0,
        abs_tol=1e-12,
    ):
        return point_distance(point, start)

    projection = (
        (point.x - start.x) * delta_x
        + (point.y - start.y) * delta_y
    ) / squared_length

    projection = max(
        0.0,
        min(1.0, projection),
    )

    closest_point = Point(
        x=start.x + projection * delta_x,
        y=start.y + projection * delta_y,
    )

    return point_distance(
        point,
        closest_point,
    )


def distance_between_segments(
    first_start: Point,
    first_end: Point,
    second_start: Point,
    second_end: Point,
    tolerance: float = DEFAULT_TOLERANCE,
) -> float:
    """
    Calculate the shortest distance between two segments.
    """

    if segments_intersect(
        first_start,
        first_end,
        second_start,
        second_end,
        tolerance,
    ):
        return 0.0

    return min(
        distance_point_to_segment(
            first_start,
            second_start,
            second_end,
        ),
        distance_point_to_segment(
            first_end,
            second_start,
            second_end,
        ),
        distance_point_to_segment(
            second_start,
            first_start,
            first_end,
        ),
        distance_point_to_segment(
            second_end,
            first_start,
            first_end,
        ),
    )


def distance_between_polygons(
    first_polygon: list[Point],
    second_polygon: list[Point],
    tolerance: float = DEFAULT_TOLERANCE,
) -> float:
    """
    Calculate the shortest distance between two polygons.
    """

    if not first_polygon or not second_polygon:
        return math.inf

    if point_in_polygon(
        first_polygon[0],
        second_polygon,
        tolerance,
    ):
        return 0.0

    if point_in_polygon(
        second_polygon[0],
        first_polygon,
        tolerance,
    ):
        return 0.0

    minimum_distance = math.inf

    for first_start, first_end in polygon_edges(
        first_polygon
    ):
        for second_start, second_end in polygon_edges(
            second_polygon
        ):
            distance = distance_between_segments(
                first_start,
                first_end,
                second_start,
                second_end,
                tolerance,
            )

            minimum_distance = min(
                minimum_distance,
                distance,
            )

            if minimum_distance <= tolerance:
                return 0.0

    return minimum_distance


def shared_edge_length(
    first_start: Point,
    first_end: Point,
    second_start: Point,
    second_end: Point,
    tolerance: float = DEFAULT_TOLERANCE,
) -> float:
    """
    Calculate the overlapping length of two collinear segments.
    """

    if orientation(
        first_start,
        first_end,
        second_start,
        tolerance,
    ) != 0:
        return 0.0

    if orientation(
        first_start,
        first_end,
        second_end,
        tolerance,
    ) != 0:
        return 0.0

    delta_x = abs(
        first_end.x - first_start.x
    )

    delta_y = abs(
        first_end.y - first_start.y
    )

    if delta_x >= delta_y:
        first_min = min(
            first_start.x,
            first_end.x,
        )

        first_max = max(
            first_start.x,
            first_end.x,
        )

        second_min = min(
            second_start.x,
            second_end.x,
        )

        second_max = max(
            second_start.x,
            second_end.x,
        )
    else:
        first_min = min(
            first_start.y,
            first_end.y,
        )

        first_max = max(
            first_start.y,
            first_end.y,
        )

        second_min = min(
            second_start.y,
            second_end.y,
        )

        second_max = max(
            second_start.y,
            second_end.y,
        )

    overlap = min(
        first_max,
        second_max,
    ) - max(
        first_min,
        second_min,
    )

    if overlap <= tolerance:
        return 0.0

    return overlap


def shared_polygon_edge_length(
    first_polygon: list[Point],
    second_polygon: list[Point],
    tolerance: float = DEFAULT_TOLERANCE,
) -> float:
    """
    Return the total directly shared boundary length
    between two polygons.
    """

    total_length = 0.0

    for first_start, first_end in polygon_edges(
        first_polygon
    ):
        for second_start, second_end in polygon_edges(
            second_polygon
        ):
            total_length += shared_edge_length(
                first_start,
                first_end,
                second_start,
                second_end,
                tolerance,
            )

    return total_length


def nearby_parallel_edge_length(
    first_start: Point,
    first_end: Point,
    second_start: Point,
    second_end: Point,
    maximum_gap: float = 25.0,
    angle_tolerance: float = 0.08,
) -> float:
    """
    Return the overlapping length of two nearly parallel edges
    separated by no more than maximum_gap.

    This is useful when two room polygons are separated
    by the thickness of a wall.
    """

    first_dx = first_end.x - first_start.x
    first_dy = first_end.y - first_start.y

    second_dx = second_end.x - second_start.x
    second_dy = second_end.y - second_start.y

    first_length = math.hypot(
        first_dx,
        first_dy,
    )

    second_length = math.hypot(
        second_dx,
        second_dy,
    )

    if math.isclose(
        first_length,
        0.0,
        abs_tol=1e-12,
    ):
        return 0.0

    if math.isclose(
        second_length,
        0.0,
        abs_tol=1e-12,
    ):
        return 0.0

    normalized_cross_product = abs(
        first_dx * second_dy
        - first_dy * second_dx
    ) / (
        first_length
        * second_length
    )

    if normalized_cross_product > angle_tolerance:
        return 0.0

    gap = distance_between_segments(
        first_start,
        first_end,
        second_start,
        second_end,
    )

    if gap > maximum_gap:
        return 0.0

    # Unit vector along the first segment.
    unit_x = first_dx / first_length
    unit_y = first_dy / first_length

    # Project all segment endpoints onto the same axis.
    first_projection_start = (
        first_start.x * unit_x
        + first_start.y * unit_y
    )

    first_projection_end = (
        first_end.x * unit_x
        + first_end.y * unit_y
    )

    second_projection_start = (
        second_start.x * unit_x
        + second_start.y * unit_y
    )

    second_projection_end = (
        second_end.x * unit_x
        + second_end.y * unit_y
    )

    first_min = min(
        first_projection_start,
        first_projection_end,
    )

    first_max = max(
        first_projection_start,
        first_projection_end,
    )

    second_min = min(
        second_projection_start,
        second_projection_end,
    )

    second_max = max(
        second_projection_start,
        second_projection_end,
    )

    overlap = min(
        first_max,
        second_max,
    ) - max(
        first_min,
        second_min,
    )

    if overlap <= 0.0:
        return 0.0

    return overlap


def nearby_polygon_edge_length(
    first_polygon: list[Point],
    second_polygon: list[Point],
    maximum_gap: float = 25.0,
    angle_tolerance: float = 0.08,
) -> float:
    """
    Return the total nearby parallel boundary length
    between two polygons.
    """

    total_overlap = 0.0

    for first_start, first_end in polygon_edges(
        first_polygon
    ):
        for second_start, second_end in polygon_edges(
            second_polygon
        ):
            total_overlap += nearby_parallel_edge_length(
                first_start,
                first_end,
                second_start,
                second_end,
                maximum_gap=maximum_gap,
                angle_tolerance=angle_tolerance,
            )

    return total_overlap