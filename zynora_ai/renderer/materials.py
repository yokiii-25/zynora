from dataclasses import dataclass


@dataclass(frozen=True)
class Material:

    name: str

    color: str

    roughness: float

    metalness: float


EXTERIOR_WALL = Material(
    name="ExteriorWall",
    color="#d8d3ca",
    roughness=0.92,
    metalness=0.02,
)

INTERIOR_WALL = Material(
    name="InteriorWall",
    color="#f5f2eb",
    roughness=0.90,
    metalness=0.02,
)

FLOOR = Material(
    name="Floor",
    color="#ddd6c8",
    roughness=1.0,
    metalness=0.0,
)