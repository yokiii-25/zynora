from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from floorplan_engine.dataset_loader import (
    load_floor_plans,
)
from floorplan_engine.plan_adapter import (
    adapt_plan,
)
from floorplan_engine.plan_retriever import (
    retrieve_best_plan,
)
from floorplan_engine.plan_validator import (
    validate_plan,
)
from floorplan_engine.furniture_generator import (
    generate_furniture,
)


router = APIRouter(
    prefix="/api/floor-plans",
    tags=["Floor Plans"],
)


class BuildingRequest(BaseModel):
    length: float = Field(gt=0)
    width: float = Field(gt=0)


class SiteLayoutRequest(BaseModel):
    building: BuildingRequest


class FloorPlanGenerateRequest(BaseModel):
    project: dict[str, Any]
    site_layout: SiteLayoutRequest


def get_integer_value(
    data: dict[str, Any],
    keys: list[str],
    default: int,
) -> int:
    for key in keys:
        value = data.get(key)

        if value is None or value == "":
            continue

        try:
            return int(value)
        except (TypeError, ValueError):
            continue

    return default


@router.post("/generate")
def generate_floor_plan(
    request: FloorPlanGenerateRequest,
) -> dict[str, Any]:
    print("\n========== FLOOR PLAN REQUEST ==========")
    print(request.model_dump())
    print("========================================")

    project = request.project
    building = request.site_layout.building

    bedrooms = get_integer_value(
        data=project,
        keys=[
            "bedrooms",
            "numberOfBedrooms",
        ],
        default=3,
    )

    bathrooms = get_integer_value(
        data=project,
        keys=[
            "bathrooms",
            "numberOfBathrooms",
        ],
        default=1,
    )

    floors = get_integer_value(
        data=project,
        keys=[
            "floors",
            "numberOfFloors",
        ],
        default=2,
    )

    target_width = float(building.length)
    target_height = float(building.width)

    print("Parsed values:")
    print("Width:", target_width)
    print("Height:", target_height)
    print("Bedrooms:", bedrooms)
    print("Bathrooms:", bathrooms)
    print("Floors:", floors)

    try:
        print("STEP 1: Loading plans")

        plans = load_floor_plans()

        print("Loaded plan count:", len(plans))

        print("STEP 2: Retrieving best plan")

        selected_plan = retrieve_best_plan(
            plans=plans,
            requested_width=target_width,
            requested_height=target_height,
            requested_bedrooms=bedrooms,
            requested_bathrooms=bathrooms,
            requested_floors=floors,
        )

        print("Selected plan:")
        print(selected_plan)

        print("STEP 3: Adapting plan")

        adapted_plan = adapt_plan(
            plan=selected_plan,
            target_width=target_width,
            target_height=target_height,
        )

        print("Adapted plan created")

        print("STEP 4: Validating plan")

        validation_errors = validate_plan(
            adapted_plan
        )

        print(
            "Validation errors:",
            validation_errors,
        )

        if validation_errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "The selected floor plan "
                        "failed validation."
                    ),
                    "errors": validation_errors,
                },
            )

        adapted_plan["source_plan_id"] = (
            selected_plan.get(
                "source_plan_id",
                selected_plan.get("id"),
            )
        )

        adapted_plan["matched_plan"] = {
            "id": selected_plan.get("id"),
            "name": selected_plan.get(
                "name",
                "Unnamed plan",
            ),
            "source": selected_plan.get(
                "source",
                "Zynora Curated",
            ),
            "match_score": selected_plan.get(
                "match_score",
            ),
        }

        adapted_plan["requested_configuration"] = {
            "width": target_width,
            "height": target_height,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "floors": floors,
        }
        adapted_plan["furniture"] = generate_furniture(
            rooms=adapted_plan.get("rooms", [])
        )

        print("STEP 5: Floor plan generated successfully")

        return adapted_plan

    except HTTPException:
        raise

    except FileNotFoundError as error:
        print(
            "Floor-plan FileNotFoundError:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": (
                    "The floor-plan dataset "
                    "could not be found."
                ),
                "error": str(error),
            },
        ) from error

    except ValueError as error:
        print(
            "Floor-plan ValueError:",
            repr(error),
        )

        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "The floor-plan request "
                    "could not be processed."
                ),
                "error": str(error),
            },
        ) from error

    except Exception as error:
        print(
            "Floor-plan generation error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": (
                    "An unexpected error occurred "
                    "while generating the floor plan."
                ),
                "error": str(error),
                "error_type": type(error).__name__,
            },
        ) from error