from typing import Any


class MeshGenerator:
    """
    Converts House Graph objects into Three.js-ready meshes.
    """

    WALL_HEIGHT = 3.0  # meters

    PIXELS_PER_METER = 100.0

    @staticmethod
    def pixels_to_meters(value: float) -> float:
        return round(value / MeshGenerator.PIXELS_PER_METER, 3)

    @staticmethod
    def wall_to_mesh(
        wall: dict[str, Any],
    ) -> dict[str, Any]:

        center = wall["center"]

        if wall["orientation"] == "horizontal":
            width = MeshGenerator.pixels_to_meters(
                wall["length"]
            )
            depth = MeshGenerator.pixels_to_meters(
                wall["thickness"]
            )
        else:
            width = MeshGenerator.pixels_to_meters(
                wall["thickness"]
            )
            depth = MeshGenerator.pixels_to_meters(
                wall["length"]
            )

        return {
            "id": wall["id"],
            "type": "wall",

            "position": {
                "x": MeshGenerator.pixels_to_meters(
                    center["x"]
                ),
                "y": MeshGenerator.WALL_HEIGHT / 2,
                "z": MeshGenerator.pixels_to_meters(
                    center["y"]
                ),
            },

            "rotation": {
                "x": 0,
                "y": 0,
                "z": 0,
            },

            "size": {
                "width": width,
                "height": MeshGenerator.WALL_HEIGHT,
                "depth": depth,
            },

            "metadata": {
                "wall_class": wall["wall_class"],
                "orientation": wall["orientation"],
            },
        }

    @staticmethod
    def build_scene(
        walls: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:

        return [
            MeshGenerator.wall_to_mesh(wall)
            for wall in walls
        ]