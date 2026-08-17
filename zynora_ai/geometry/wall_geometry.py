import math
from typing import Any


class WallGeometry:
    @staticmethod
    def polygon_bounds(
        polygon: list[list[float]] | list[tuple[float, float]]
    ) -> dict[str, float]:
        """
        Calculate the bounding box of a polygon.
        """

        if not polygon:
            return {
                "min_x": 0.0,
                "min_y": 0.0,
                "max_x": 0.0,
                "max_y": 0.0,
                "width": 0.0,
                "height": 0.0,
                "center_x": 0.0,
                "center_y": 0.0,
            }

        x_values = [float(point[0]) for point in polygon]
        y_values = [float(point[1]) for point in polygon]

        min_x = min(x_values)
        max_x = max(x_values)
        min_y = min(y_values)
        max_y = max(y_values)

        width = max_x - min_x
        height = max_y - min_y

        return {
            "min_x": min_x,
            "min_y": min_y,
            "max_x": max_x,
            "max_y": max_y,
            "width": width,
            "height": height,
            "center_x": (min_x + max_x) / 2,
            "center_y": (min_y + max_y) / 2,
        }

    @staticmethod
    def polygon_area(
        polygon: list[list[float]] | list[tuple[float, float]]
    ) -> float:
        """
        Calculate polygon area using the shoelace formula.
        """

        if len(polygon) < 3:
            return 0.0

        area = 0.0

        for index, point in enumerate(polygon):
            next_point = polygon[(index + 1) % len(polygon)]

            x1, y1 = float(point[0]), float(point[1])
            x2, y2 = float(next_point[0]), float(next_point[1])

            area += (x1 * y2) - (x2 * y1)

        return abs(area) / 2

    @staticmethod
    def create_wall_segment(
        polygon: list[list[float]] | list[tuple[float, float]],
        wall_class: str,
        segment_id: str,
    ) -> dict[str, Any]:
        """
        Convert a wall polygon into a basic Three.js-ready wall segment.
        """

        bounds = WallGeometry.polygon_bounds(polygon)

        width = bounds["width"]
        height = bounds["height"]

        if width >= height:
            orientation = "horizontal"
            length = width
            thickness = height
            rotation_degrees = 0.0
        else:
            orientation = "vertical"
            length = height
            thickness = width
            rotation_degrees = 90.0

        return {
            "id": segment_id,
            "wall_class": wall_class,
            "orientation": orientation,
            "center": {
                "x": bounds["center_x"],
                "y": bounds["center_y"],
            },
            "length": length,
            "thickness": thickness,
            "rotation_degrees": rotation_degrees,
            "area": WallGeometry.polygon_area(polygon),
            "polygon": polygon,
        }