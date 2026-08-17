import math
from typing import Any


class RelationshipBuilder:
    @staticmethod
    def collect_points(
        geometry: dict[str, Any],
    ) -> list[tuple[float, float]]:
        """
        Collect every coordinate found inside an object's geometry.
        """

        points: list[tuple[float, float]] = []

        for polygon in geometry.get("polygons", []):
            for point in polygon:
                if len(point) >= 2:
                    points.append(
                        (float(point[0]), float(point[1]))
                    )

        for polyline in geometry.get("polylines", []):
            for point in polyline:
                if len(point) >= 2:
                    points.append(
                        (float(point[0]), float(point[1]))
                    )

        for line in geometry.get("lines", []):
            if isinstance(line, dict):
                x1 = line.get("x1")
                y1 = line.get("y1")
                x2 = line.get("x2")
                y2 = line.get("y2")

                if None not in (x1, y1):
                    points.append((float(x1), float(y1)))

                if None not in (x2, y2):
                    points.append((float(x2), float(y2)))

            elif isinstance(line, list):
                for point in line:
                    if (
                        isinstance(point, list)
                        and len(point) >= 2
                    ):
                        points.append(
                            (float(point[0]), float(point[1]))
                        )

        for rectangle in geometry.get("rectangles", []):
            if not isinstance(rectangle, dict):
                continue

            x = float(rectangle.get("x", 0))
            y = float(rectangle.get("y", 0))
            width = float(rectangle.get("width", 0))
            height = float(rectangle.get("height", 0))

            points.extend(
                [
                    (x, y),
                    (x + width, y),
                    (x + width, y + height),
                    (x, y + height),
                ]
            )

        return points

    @staticmethod
    def object_center(
        geometry: dict[str, Any],
    ) -> dict[str, float] | None:
        """
        Calculate the center of an object from all available points.
        """

        points = RelationshipBuilder.collect_points(geometry)

        if not points:
            return None

        x_values = [point[0] for point in points]
        y_values = [point[1] for point in points]

        return {
            "x": sum(x_values) / len(x_values),
            "y": sum(y_values) / len(y_values),
        }

    @staticmethod
    def distance_to_wall(
        point: dict[str, float],
        wall: dict[str, Any],
    ) -> float:
        """
        Calculate approximate distance from an object center
        to a wall rectangle.
        """

        wall_center = wall.get("center", {})

        wall_x = float(wall_center.get("x", 0))
        wall_y = float(wall_center.get("y", 0))

        length = float(wall.get("length", 0))
        thickness = float(wall.get("thickness", 0))

        orientation = wall.get("orientation", "horizontal")

        if orientation == "horizontal":
            half_width = length / 2
            half_height = thickness / 2
        else:
            half_width = thickness / 2
            half_height = length / 2

        min_x = wall_x - half_width
        max_x = wall_x + half_width
        min_y = wall_y - half_height
        max_y = wall_y + half_height

        nearest_x = min(max(point["x"], min_x), max_x)
        nearest_y = min(max(point["y"], min_y), max_y)

        return math.hypot(
            point["x"] - nearest_x,
            point["y"] - nearest_y,
        )

    @staticmethod
    def find_nearest_wall(
        item: dict[str, Any],
        walls: list[dict[str, Any]],
        max_distance: float = 20.0,
    ) -> dict[str, Any] | None:
        """
        Find the closest wall to a door or window.

        Objects farther than max_distance are treated as unmatched.
        """

        geometry = item.get("geometry", {})
        center = RelationshipBuilder.object_center(geometry)

        if center is None or not walls:
            return None

        best_wall = None
        best_distance = float("inf")

        for wall in walls:
            distance = RelationshipBuilder.distance_to_wall(
                center,
                wall,
            )

            if distance < best_distance:
                best_distance = distance
                best_wall = wall

        if best_wall is None or best_distance > max_distance:
            return {
                "object_id": item.get("id"),
                "wall_id": None,
                "status": "unmatched",
                "distance": round(best_distance, 3),
                "object_center": {
                    "x": round(center["x"], 3),
                    "y": round(center["y"], 3),
                },
            }

        return {
            "object_id": item.get("id"),
            "wall_id": best_wall.get("id"),
            "status": "linked",
            "distance": round(best_distance, 3),
            "object_center": {
                "x": round(center["x"], 3),
                "y": round(center["y"], 3),
            },
        }

    @staticmethod
    def build_wall_relationships(
        objects: list[dict[str, Any]],
        walls: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Link each object to its nearest wall.
        """

        relationships: list[dict[str, Any]] = []

        for item in objects:
            relationship = RelationshipBuilder.find_nearest_wall(
                item,
                walls,
            )

            if relationship is not None:
                relationships.append(relationship)

        return relationships