from typing import Any

from zynora_ai.renderer.mesh_generator import MeshGenerator
from zynora_ai.renderer.opening_mesh_generator import (
    OpeningMeshGenerator,
)

class SceneBuilder:
    """Builds a structured render scene from the house graph."""

    @staticmethod
    def _build_relationship_map(
        relationships: list[dict[str, Any]],
        object_type: str,
    ) -> dict[str, dict[str, Any]]:
        """
        Converts relationship records into an object-id lookup.

        Supports keys such as:
        - door_id / window_id
        - object_id
        - source_id
        """

        relationship_map: dict[str, dict[str, Any]] = {}

        for relationship in relationships:
            object_id = (
                relationship.get(f"{object_type}_id")
                or relationship.get("object_id")
                or relationship.get("source_id")
            )

            if not object_id:
                continue

            relationship_map[object_id] = relationship

        return relationship_map

    @staticmethod
    def _attach_relationships(
        objects: list[dict[str, Any]],
        relationships: list[dict[str, Any]],
        object_type: str,
    ) -> list[dict[str, Any]]:
        """Adds wall relationship information to doors or windows."""

        relationship_map = SceneBuilder._build_relationship_map(
            relationships,
            object_type,
        )

        enriched_objects: list[dict[str, Any]] = []

        for item in objects:
            object_id = item.get("id")
            relationship = relationship_map.get(object_id, {})

            enriched_item = {
                **item,
                "relationship": {
                    "wall_id": relationship.get("wall_id"),
                    "distance": relationship.get("distance"),
                    "status": relationship.get(
                        "status",
                        "unmatched",
                    ),
                },
            }

            enriched_objects.append(enriched_item)

        return enriched_objects

    @staticmethod
    def build(
        graph: dict[str, Any],
    ) -> dict[str, Any]:
        house = graph.get("house", {})
        relationships = graph.get("relationships", {})

        walls = house.get("walls", [])
        doors = house.get("doors", [])
        windows = house.get("windows", [])

        exterior_walls = []
        interior_walls = []

        for wall in walls:
            mesh = MeshGenerator.wall_to_mesh(wall)

            wall_class = wall.get("wall_class", "")

            if "External" in wall_class:
                exterior_walls.append(mesh)
            else:
                interior_walls.append(mesh)

        enriched_doors = SceneBuilder._attach_relationships(
            objects=doors,
            relationships=relationships.get(
                "door_to_wall",
                [],
            ),
            object_type="door",
        )

        enriched_windows = SceneBuilder._attach_relationships(
            objects=windows,
            relationships=relationships.get(
                "window_to_wall",
                [],
            ),
            object_type="window",
        )

        scene_doors = [
            OpeningMeshGenerator.door_to_mesh(door)
            for door in enriched_doors
        ]

        scene_windows = [
            OpeningMeshGenerator.window_to_mesh(
                window
            )
            for window in enriched_windows
        ]

        return {
            "metadata": graph.get("metadata", {}),
            "scene": {
                "floor": {},
                "walls": {
                    "exterior": exterior_walls,
                    "interior": interior_walls,
                },
                "doors": scene_doors,
                "windows": scene_windows,
                "roof": [],
                "furniture": [],
            },
        }