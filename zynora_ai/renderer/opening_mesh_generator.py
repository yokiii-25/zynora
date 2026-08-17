import math
from typing import Any


class OpeningMeshGenerator:
    """
    Converts SVG door and window geometry into render-ready
    Three.js mesh objects.
    """

    SCALE = 0.01

    @staticmethod
    def _get_first_polygon(
        item: dict[str, Any],
    ) -> list[list[float]]:
        geometry = item.get("geometry", {})
        polygons = geometry.get("polygons", [])

        for polygon in polygons:
            if polygon and len(polygon) >= 2:
                return polygon

        return []

    @staticmethod
    def _distance(
        point_a: list[float],
        point_b: list[float],
    ) -> float:
        dx = point_b[0] - point_a[0]
        dy = point_b[1] - point_a[1]

        return math.sqrt(dx * dx + dy * dy)

    @staticmethod
    def _calculate_geometry(
        polygon: list[list[float]],
    ) -> dict[str, float]:
        if not polygon:
            return {
                "center_x": 0.0,
                "center_z": 0.0,
                "length": 0.9,
                "thickness": 0.15,
                "rotation_y": 0.0,
            }

        x_values = [point[0] for point in polygon]
        y_values = [point[1] for point in polygon]

        center_x = (
            min(x_values) + max(x_values)
        ) / 2

        center_z = (
            min(y_values) + max(y_values)
        ) / 2

        edges: list[dict[str, float]] = []

        for index in range(len(polygon)):
            start = polygon[index]
            end = polygon[
                (index + 1) % len(polygon)
            ]

            length = OpeningMeshGenerator._distance(
                start,
                end,
            )

            angle = math.atan2(
                end[1] - start[1],
                end[0] - start[0],
            )

            edges.append(
                {
                    "length": length,
                    "angle": angle,
                }
            )

        edges.sort(
            key=lambda edge: edge["length"],
            reverse=True,
        )

        longest_edge = edges[0]

        shortest_length = min(
            edge["length"]
            for edge in edges
            if edge["length"] > 0
        )

        return {
            "center_x": center_x
            * OpeningMeshGenerator.SCALE,
            "center_z": center_z
            * OpeningMeshGenerator.SCALE,
            "length": max(
                longest_edge["length"]
                * OpeningMeshGenerator.SCALE,
                0.5,
            ),
            "thickness": max(
                shortest_length
                * OpeningMeshGenerator.SCALE,
                0.08,
            ),
            # SVG Y becomes Three.js Z.
            "rotation_y": -longest_edge["angle"],
        }

    @staticmethod
    def door_to_mesh(
        door: dict[str, Any],
    ) -> dict[str, Any]:
        polygon = (
            OpeningMeshGenerator._get_first_polygon(
                door
            )
        )

        geometry = (
            OpeningMeshGenerator._calculate_geometry(
                polygon
            )
        )

        relationship = door.get(
            "relationship",
            {},
        )

        return {
            "id": door.get("id", "unknown-door"),
            "type": "door",
            "position": {
                "x": round(
                    geometry["center_x"],
                    4,
                ),
                "y": 1.05,
                "z": round(
                    geometry["center_z"],
                    4,
                ),
            },
            "rotation": {
                "x": 0.0,
                "y": round(
                    geometry["rotation_y"],
                    6,
                ),
                "z": 0.0,
            },
            "size": {
                "width": round(
                    geometry["length"],
                    4,
                ),
                "height": 2.1,
                "depth": round(
                    geometry["thickness"],
                    4,
                ),
            },
            "metadata": {
                "class": door.get("class", ""),
                "source_id": door.get(
                    "source_id",
                    "",
                ),
                "wall_id": relationship.get(
                    "wall_id"
                ),
                "status": relationship.get(
                    "status",
                    "unmatched",
                ),
                "distance": relationship.get(
                    "distance"
                ),
            },
        }

    @staticmethod
    def window_to_mesh(
        window: dict[str, Any],
    ) -> dict[str, Any]:
        polygon = (
            OpeningMeshGenerator._get_first_polygon(
                window
            )
        )

        geometry = (
            OpeningMeshGenerator._calculate_geometry(
                polygon
            )
        )

        relationship = window.get(
            "relationship",
            {},
        )

        return {
            "id": window.get(
                "id",
                "unknown-window",
            ),
            "type": "window",
            "position": {
                "x": round(
                    geometry["center_x"],
                    4,
                ),
                "y": 1.5,
                "z": round(
                    geometry["center_z"],
                    4,
                ),
            },
            "rotation": {
                "x": 0.0,
                "y": round(
                    geometry["rotation_y"],
                    6,
                ),
                "z": 0.0,
            },
            "size": {
                "width": round(
                    geometry["length"],
                    4,
                ),
                "height": 1.2,
                "depth": round(
                    geometry["thickness"],
                    4,
                ),
            },
            "metadata": {
                "class": window.get("class", ""),
                "source_id": window.get(
                    "source_id",
                    "",
                ),
                "wall_id": relationship.get(
                    "wall_id"
                ),
                "status": relationship.get(
                    "status",
                    "unmatched",
                ),
                "distance": relationship.get(
                    "distance"
                ),
            },
        }