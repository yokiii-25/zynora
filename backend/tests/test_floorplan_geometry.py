import unittest

from floorplan_engine.geometry_validator import validate_floor_plan_document
from floorplan_engine.schemas import FloorPlanDocument


def wall(wall_id, start, end):
    return {
        "id": wall_id,
        "start": start,
        "end": end,
        "height": 2.8,
        "thickness": 0.16,
        "isExterior": True,
        "material": {"color": "#eee9e1"},
        "openings": [],
    }


class FloorPlanGeometryTests(unittest.TestCase):
    def test_closed_floor_plan_is_valid(self):
        outline = [
            {"x": 0, "z": 0},
            {"x": 10, "z": 0},
            {"x": 10, "z": 7},
            {"x": 0, "z": 7},
        ]
        walls = [
            wall("south", outline[0], outline[1]),
            wall("east", outline[1], outline[2]),
            wall("north", outline[2], outline[3]),
            wall("west", outline[3], outline[0]),
        ]
        document = FloorPlanDocument.model_validate(
            {
                "schemaVersion": "zynora.floorplan.v1",
                "id": "test-plan",
                "unit": "m",
                "coordinateSystem": "x-right_y-up_z-forward",
                "metadata": {
                    "source": "unit-test",
                    "floorCount": 1,
                    "activeFloorId": "ground-floor",
                    "roomClassifier": "v5",
                },
                "floors": [
                    {
                        "id": "ground-floor",
                        "level": 0,
                        "elevation": 0,
                        "height": 2.8,
                        "outline": outline,
                        "rooms": [],
                        "walls": walls,
                        "exteriorWalls": walls,
                        "slabs": [
                            {
                                "id": "ground-slab",
                                "outline": outline,
                                "elevation": -0.16,
                                "thickness": 0.18,
                            }
                        ],
                        "roof": {
                            "id": "ground-roof",
                            "type": "flat",
                            "outline": outline,
                            "elevation": 2.8,
                            "thickness": 0.22,
                            "parapetHeight": 0.35,
                        },
                    }
                ],
                "validation": None,
            }
        )

        result = validate_floor_plan_document(document)

        self.assertTrue(result["valid"])
        self.assertTrue(
            result["stats"]["floorStats"]["ground-floor"]["shellClosed"]
        )

    def test_declared_floor_count_mismatch_is_invalid(self):
        outline = [
            {"x": 0, "z": 0},
            {"x": 4, "z": 0},
            {"x": 4, "z": 4},
            {"x": 0, "z": 4},
        ]
        walls = [
            wall("south", outline[0], outline[1]),
            wall("east", outline[1], outline[2]),
            wall("north", outline[2], outline[3]),
            wall("west", outline[3], outline[0]),
        ]
        document = FloorPlanDocument.model_validate(
            {
                "schemaVersion": "zynora.floorplan.v1",
                "id": "missing-floor",
                "unit": "m",
                "coordinateSystem": "x-right_y-up_z-forward",
                "metadata": {
                    "source": "unit-test",
                    "floorCount": 2,
                    "activeFloorId": "ground-floor",
                    "roomClassifier": "v5",
                },
                "floors": [
                    {
                        "id": "ground-floor",
                        "level": 0,
                        "elevation": 0,
                        "height": 2.8,
                        "outline": outline,
                        "rooms": [],
                        "walls": walls,
                        "exteriorWalls": walls,
                        "slabs": [
                            {
                                "id": "ground-slab",
                                "outline": outline,
                                "elevation": -0.16,
                                "thickness": 0.18,
                            }
                        ],
                        "roof": {
                            "id": "ground-roof",
                            "type": "flat",
                            "outline": outline,
                            "elevation": 2.8,
                            "thickness": 0.22,
                            "parapetHeight": 0.35,
                        },
                    }
                ],
                "validation": None,
            }
        )

        result = validate_floor_plan_document(document)

        self.assertFalse(result["valid"])
        self.assertTrue(
            any("floorCount" in error for error in result["errors"])
        )

    def test_indoor_room_outside_shell_is_invalid(self):
        outline = [
            {"x": 0, "z": 0},
            {"x": 4, "z": 0},
            {"x": 4, "z": 4},
            {"x": 0, "z": 4},
        ]
        walls = [
            wall("south", outline[0], outline[1]),
            wall("east", outline[1], outline[2]),
            wall("north", outline[2], outline[3]),
            wall("west", outline[3], outline[0]),
        ]
        document = FloorPlanDocument.model_validate(
            {
                "schemaVersion": "zynora.floorplan.v1",
                "id": "cropped-shell",
                "unit": "m",
                "coordinateSystem": "x-right_y-up_z-forward",
                "metadata": {
                    "source": "unit-test",
                    "floorCount": 1,
                    "activeFloorId": "ground-floor",
                    "roomClassifier": "v5",
                },
                "floors": [
                    {
                        "id": "ground-floor",
                        "level": 0,
                        "elevation": 0,
                        "height": 2.8,
                        "outline": outline,
                        "rooms": [
                            {
                                "id": "living-room",
                                "type": "Living Room",
                                "outline": [
                                    {"x": 1, "z": 2},
                                    {"x": 3, "z": 2},
                                    {"x": 3, "z": 6},
                                    {"x": 1, "z": 6},
                                ],
                                "area": 8,
                                "classification": None,
                            }
                        ],
                        "walls": walls,
                        "exteriorWalls": walls,
                        "slabs": [
                            {
                                "id": "ground-slab",
                                "outline": outline,
                                "elevation": -0.16,
                                "thickness": 0.18,
                            }
                        ],
                        "roof": {
                            "id": "ground-roof",
                            "type": "flat",
                            "outline": outline,
                            "elevation": 2.8,
                            "thickness": 0.22,
                            "parapetHeight": 0.35,
                        },
                    }
                ],
                "validation": None,
            }
        )

        result = validate_floor_plan_document(document)

        self.assertFalse(result["valid"])
        self.assertEqual(
            result["stats"]["floorStats"]["ground-floor"][
                "roomsOutsideShell"
            ],
            1,
        )


if __name__ == "__main__":
    unittest.main()
