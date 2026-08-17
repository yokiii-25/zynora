from __future__ import annotations

from collections import Counter
from math import hypot
from typing import Any

from zynora_ai.core.features.room_features import (
    RoomFeatures,
)


EPSILON = 1e-9
SQUARE_RATIO_TOLERANCE = 0.10


def _coordinates(
    point: Any,
) -> tuple[float, float]:
    """
    Read coordinates from Point objects, tuples, or lists.
    """

    if hasattr(point, "x") and hasattr(point, "y"):
        return float(point.x), float(point.y)

    if (
        isinstance(point, (tuple, list))
        and len(point) >= 2
    ):
        return float(point[0]), float(point[1])

    raise TypeError(
        "Polygon point must have x and y attributes "
        "or contain two coordinate values."
    )


def calculate_polygon_area(
    polygon: list[Any],
) -> float:
    """
    Calculate polygon area using the shoelace formula.
    """

    if polygon is None or len(polygon) < 3:
        return 0.0

    signed_area = 0.0
    point_count = len(polygon)

    for index in range(point_count):
        current = polygon[index]

        following = polygon[
            (index + 1) % point_count
        ]

        x1, y1 = _coordinates(current)
        x2, y2 = _coordinates(following)

        signed_area += (
            x1 * y2
            - x2 * y1
        )

    return abs(signed_area) / 2.0


def calculate_polygon_perimeter(
    polygon: list[Any],
) -> float:
    """
    Calculate total polygon boundary length.
    """

    if polygon is None or len(polygon) < 2:
        return 0.0

    perimeter = 0.0
    point_count = len(polygon)

    for index in range(point_count):
        current = polygon[index]

        following = polygon[
            (index + 1) % point_count
        ]

        x1, y1 = _coordinates(current)
        x2, y2 = _coordinates(following)

        perimeter += hypot(
            x2 - x1,
            y2 - y1,
        )

    return perimeter


def calculate_bounding_box(
    polygon: list[Any],
) -> dict[str, float]:
    """
    Calculate the axis-aligned bounding box.
    """

    if not polygon:
        return {
            "bbox_min_x": 0.0,
            "bbox_min_y": 0.0,
            "bbox_max_x": 0.0,
            "bbox_max_y": 0.0,
            "bbox_width": 0.0,
            "bbox_height": 0.0,
            "bbox_area": 0.0,
        }

    coordinates = [
        _coordinates(point)
        for point in polygon
    ]

    x_values = [
        coordinate[0]
        for coordinate in coordinates
    ]

    y_values = [
        coordinate[1]
        for coordinate in coordinates
    ]

    minimum_x = min(x_values)
    maximum_x = max(x_values)

    minimum_y = min(y_values)
    maximum_y = max(y_values)

    width = max(
        maximum_x - minimum_x,
        0.0,
    )

    height = max(
        maximum_y - minimum_y,
        0.0,
    )

    return {
        "bbox_min_x": minimum_x,
        "bbox_min_y": minimum_y,
        "bbox_max_x": maximum_x,
        "bbox_max_y": maximum_y,
        "bbox_width": width,
        "bbox_height": height,
        "bbox_area": width * height,
    }


def calculate_polygon_centroid(
    polygon: list[Any],
) -> tuple[float, float]:
    """
    Calculate the geometric centroid of a polygon.

    Falls back to the average point position when the
    polygon has approximately zero area.
    """

    if not polygon:
        return 0.0, 0.0

    coordinates = [
        _coordinates(point)
        for point in polygon
    ]

    if len(coordinates) < 3:
        average_x = sum(
            x for x, _ in coordinates
        ) / len(coordinates)

        average_y = sum(
            y for _, y in coordinates
        ) / len(coordinates)

        return average_x, average_y

    cross_sum = 0.0
    centroid_x_sum = 0.0
    centroid_y_sum = 0.0

    point_count = len(coordinates)

    for index in range(point_count):
        x1, y1 = coordinates[index]

        x2, y2 = coordinates[
            (index + 1) % point_count
        ]

        cross_product = (
            x1 * y2
            - x2 * y1
        )

        cross_sum += cross_product

        centroid_x_sum += (
            x1 + x2
        ) * cross_product

        centroid_y_sum += (
            y1 + y2
        ) * cross_product

    signed_area = cross_sum / 2.0

    if abs(signed_area) <= EPSILON:
        average_x = sum(
            x for x, _ in coordinates
        ) / len(coordinates)

        average_y = sum(
            y for _, y in coordinates
        ) / len(coordinates)

        return average_x, average_y

    centroid_x = (
        centroid_x_sum
        / (6.0 * signed_area)
    )

    centroid_y = (
        centroid_y_sum
        / (6.0 * signed_area)
    )

    return centroid_x, centroid_y


def calculate_aspect_ratio(
    width: float,
    height: float,
) -> float:
    """
    Calculate width divided by height.
    """

    if height <= EPSILON:
        return 0.0

    return width / height


def calculate_rectangularity(
    polygon_area: float,
    bounding_box_area: float,
) -> float:
    """
    Calculate room area divided by bounding-box area.

    Values near 1 indicate a rectangular room.
    """

    if bounding_box_area <= EPSILON:
        return 0.0

    rectangularity = (
        polygon_area
        / bounding_box_area
    )

    return max(
        0.0,
        min(rectangularity, 1.0),
    )


def calculate_orientation(
    width: float,
    height: float,
) -> tuple[int, int, int]:
    """
    Return horizontal, vertical, and square flags.
    """

    if (
        width <= EPSILON
        and height <= EPSILON
    ):
        return 0, 0, 0

    maximum_dimension = max(
        width,
        height,
    )

    difference_ratio = (
        abs(width - height)
        / maximum_dimension
    )

    if difference_ratio <= SQUARE_RATIO_TOLERANCE:
        return 0, 0, 1

    if width > height:
        return 1, 0, 0

    return 0, 1, 0


class RoomFeatureExtractor:
    """
    Extract geometry and furniture features for rooms.
    """

    @staticmethod
    def extract_room(
        room: Any,
        furniture_items: list[Any],
    ) -> RoomFeatures:
        polygon = getattr(
            room,
            "polygon",
            [],
        )

        furniture_counts = Counter(
            getattr(
                furniture,
                "furniture_type",
                "Unknown",
            )
            for furniture in furniture_items
        )

        room_id = str(
            getattr(
                room,
                "id",
                "UNKNOWN_ROOM",
            )
        )

        room_type = str(
            getattr(
                room,
                "room_type",
                "UNDEFINED",
            )
        )

        area = calculate_polygon_area(
            polygon
        )

        perimeter = calculate_polygon_perimeter(
            polygon
        )

        bounding_box = calculate_bounding_box(
            polygon
        )

        centroid_x, centroid_y = (
            calculate_polygon_centroid(
                polygon
            )
        )

        aspect_ratio = calculate_aspect_ratio(
            width=bounding_box["bbox_width"],
            height=bounding_box["bbox_height"],
        )

        rectangularity = (
            calculate_rectangularity(
                polygon_area=area,
                bounding_box_area=(
                    bounding_box["bbox_area"]
                ),
            )
        )

        (
            orientation_horizontal,
            orientation_vertical,
            orientation_square,
        ) = calculate_orientation(
            width=bounding_box["bbox_width"],
            height=bounding_box["bbox_height"],
        )

        return RoomFeatures(
            room_id=room_id,
            original_room_type=room_type,
            area=area,
            perimeter=perimeter,
            vertex_count=len(polygon),
            furniture_count=len(
                furniture_items
            ),
            furniture_counts=dict(
                furniture_counts
            ),
            bbox_min_x=bounding_box[
                "bbox_min_x"
            ],
            bbox_min_y=bounding_box[
                "bbox_min_y"
            ],
            bbox_max_x=bounding_box[
                "bbox_max_x"
            ],
            bbox_max_y=bounding_box[
                "bbox_max_y"
            ],
            bbox_width=bounding_box[
                "bbox_width"
            ],
            bbox_height=bounding_box[
                "bbox_height"
            ],
            bbox_area=bounding_box[
                "bbox_area"
            ],
            aspect_ratio=aspect_ratio,
            rectangularity=rectangularity,
            centroid_x=centroid_x,
            centroid_y=centroid_y,
            orientation_horizontal=(
                orientation_horizontal
            ),
            orientation_vertical=(
                orientation_vertical
            ),
            orientation_square=(
                orientation_square
            ),
        )

    @classmethod
    def extract_all(
        cls,
        rooms: list[Any],
        assignments: dict[
            str,
            list[Any],
        ],
    ) -> list[RoomFeatures]:
        room_features = []

        for room in rooms:
            room_id = str(
                getattr(
                    room,
                    "id",
                    "UNKNOWN_ROOM",
                )
            )

            furniture_items = assignments.get(
                room_id,
                [],
            )

            features = cls.extract_room(
                room=room,
                furniture_items=furniture_items,
            )

            room_features.append(features)

        return room_features