from __future__ import annotations

from collections import defaultdict
from typing import Any

from zynora_ai.core.geometry.point_in_polygon import (
    point_in_polygon,
)


def polygon_centroid(polygon: list[Any]) -> tuple[float, float]:
    """
    Calculates the average centre of a polygon.

    This is sufficient for furniture polygons because they are generally
    rectangular or simple furniture outlines.
    """

    if not polygon:
        raise ValueError(
            "Cannot calculate the centroid of an empty polygon."
        )

    x_total = 0.0
    y_total = 0.0

    for point in polygon:
        if hasattr(point, "x") and hasattr(point, "y"):
            x_total += float(point.x)
            y_total += float(point.y)
        else:
            x_total += float(point[0])
            y_total += float(point[1])

    point_count = len(polygon)

    return (
        x_total / point_count,
        y_total / point_count,
    )


class FurnitureRoomAssignment:
    @staticmethod
    def assign(
        rooms: list[Any],
        furniture_items: list[Any],
    ) -> dict[str, list[Any]]:
        assignments: dict[str, list[Any]] = defaultdict(list)

        # Ensure every room exists in the result,
        # including rooms without furniture.
        for room in rooms:
            assignments[room.id] = []

        for furniture in furniture_items:
            polygon = getattr(furniture, "polygon", None)

            if not polygon:
                continue

            centroid = polygon_centroid(polygon)

            matching_rooms = []

            for room in rooms:
                room_polygon = getattr(room, "polygon", None)

                if not room_polygon:
                    continue

                # Correct order:
                # point first, polygon second.
                if point_in_polygon(
                    centroid,
                    room_polygon,
                ):
                    matching_rooms.append(room)

            if not matching_rooms:
                continue

            # When polygons overlap, choose the smallest containing room.
            selected_room = min(
                matching_rooms,
                key=lambda room: _polygon_area(room.polygon),
            )

            assignments[selected_room.id].append(furniture)

        return dict(assignments)


def _polygon_area(polygon: list[Any]) -> float:
    if polygon is None or len(polygon) < 3:
        return 0.0

    area = 0.0

    for index in range(len(polygon)):
        current = polygon[index]
        following = polygon[(index + 1) % len(polygon)]

        if hasattr(current, "x"):
            x1 = float(current.x)
            y1 = float(current.y)
        else:
            x1 = float(current[0])
            y1 = float(current[1])

        if hasattr(following, "x"):
            x2 = float(following.x)
            y2 = float(following.y)
        else:
            x2 = float(following[0])
            y2 = float(following[1])

        area += x1 * y2 - x2 * y1

    return abs(area) / 2.0