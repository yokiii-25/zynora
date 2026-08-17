from fastapi import APIRouter

from floorplan_engine.geometry_validator import validate_floor_plan_document
from floorplan_engine.schemas import FloorPlanDocument


router = APIRouter(
    prefix="/floorplan",
    tags=["Floor-plan geometry"],
)


@router.post("/validate")
def validate_floor_plan(document: FloorPlanDocument):
    """Validate canonical ZYNORA FloorPlanJSON without modifying it."""
    return validate_floor_plan_document(document)
