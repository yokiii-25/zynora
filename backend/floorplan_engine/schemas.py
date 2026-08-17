from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


FLOOR_PLAN_SCHEMA_VERSION = "zynora.floorplan.v1"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Point2D(StrictModel):
    x: float
    z: float


class Material(StrictModel):
    color: str = "#eee9e1"


class Opening(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    wallId: str = Field(min_length=1, max_length=160)
    type: Literal["door", "window"]
    offset: float = Field(ge=0)
    width: float = Field(gt=0)
    bottom: float = Field(ge=0)
    height: float = Field(gt=0)


class Wall(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    start: Point2D
    end: Point2D
    height: float = Field(gt=0)
    thickness: float = Field(gt=0)
    isExterior: bool = False
    material: Material = Field(default_factory=Material)
    openings: list[Opening] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_length(self) -> "Wall":
        dx = self.end.x - self.start.x
        dz = self.end.z - self.start.z

        if dx * dx + dz * dz < 0.0016:
            raise ValueError("Wall length must be at least 0.04 metres.")

        return self


class RoomClassification(StrictModel):
    modelVersion: str = Field(min_length=1, max_length=40)
    predictedType: str = Field(min_length=1, max_length=120)
    confidence: float = Field(ge=0, le=1)
    status: str = Field(min_length=1, max_length=80)


class Room(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    type: str = Field(min_length=1, max_length=120)
    outline: list[Point2D] = Field(min_length=3)
    area: float = Field(ge=0)
    classification: RoomClassification | None = None


class Slab(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    outline: list[Point2D] = Field(min_length=3)
    elevation: float
    thickness: float = Field(gt=0)


class Roof(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    type: Literal["flat", "sloped", "mixed"] = "flat"
    outline: list[Point2D] = Field(min_length=3)
    elevation: float = Field(ge=0)
    thickness: float = Field(gt=0)
    parapetHeight: float = Field(ge=0)


class Floor(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    level: int = 0
    elevation: float = 0
    height: float = Field(gt=0)
    outline: list[Point2D] = Field(min_length=3)
    rooms: list[Room] = Field(default_factory=list)
    walls: list[Wall] = Field(min_length=1)
    exteriorWalls: list[Wall] = Field(min_length=3)
    slabs: list[Slab] = Field(min_length=1)
    roof: Roof


class FloorPlanMetadata(StrictModel):
    source: str = Field(min_length=1, max_length=120)
    floorCount: int = Field(ge=1)
    activeFloorId: str = Field(min_length=1, max_length=160)
    roomClassifier: str = Field(min_length=1, max_length=80)


class FloorPlanDocument(StrictModel):
    schemaVersion: Literal["zynora.floorplan.v1"]
    id: str = Field(min_length=1, max_length=160)
    unit: Literal["m"]
    coordinateSystem: Literal["x-right_y-up_z-forward"]
    metadata: FloorPlanMetadata
    floors: list[Floor] = Field(min_length=1)
    validation: dict[str, Any] | None = None
