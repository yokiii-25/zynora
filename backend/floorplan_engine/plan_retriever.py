from copy import deepcopy
from math import isfinite
from typing import Any


def calculate_dimension_score(
    plan_width: float,
    plan_height: float,
    requested_width: float,
    requested_height: float,
) -> float:
    if (
        plan_width <= 0
        or plan_height <= 0
        or requested_width <= 0
        or requested_height <= 0
    ):
        return float("inf")

    requested_aspect_ratio = (
        requested_width / requested_height
    )

    plan_aspect_ratio = (
        plan_width / plan_height
    )

    requested_area = (
        requested_width * requested_height
    )

    plan_area = (
        plan_width * plan_height
    )

    aspect_ratio_difference = abs(
        plan_aspect_ratio
        - requested_aspect_ratio
    )

    area_difference = abs(
        plan_area - requested_area
    ) / max(requested_area, 1)

    return (
        aspect_ratio_difference * 30
        + area_difference * 15
    )


def calculate_match_score(
    plan: dict[str, Any],
    requested_width: float,
    requested_height: float,
    requested_bedrooms: int,
    requested_bathrooms: int,
    requested_floors: int,
) -> tuple[float, int]:
    try:
        plan_width = float(
            plan.get("width", 0)
        )
        plan_height = float(
            plan.get("height", 0)
        )

        plan_bedrooms = int(
            plan.get("bedrooms", 0)
        )
        plan_bathrooms = int(
            plan.get("bathrooms", 0)
        )
        plan_floors = int(
            plan.get("floors", 1)
        )
    except (TypeError, ValueError):
        return float("inf"), 0

    bedroom_difference = abs(
        plan_bedrooms - requested_bedrooms
    )

    bathroom_difference = abs(
        plan_bathrooms - requested_bathrooms
    )

    floor_difference = abs(
        plan_floors - requested_floors
    )

    original_dimension_score = (
        calculate_dimension_score(
            plan_width=plan_width,
            plan_height=plan_height,
            requested_width=requested_width,
            requested_height=requested_height,
        )
    )

    rotated_dimension_score = (
        calculate_dimension_score(
            plan_width=plan_height,
            plan_height=plan_width,
            requested_width=requested_width,
            requested_height=requested_height,
        )
    )

    if (
        rotated_dimension_score
        < original_dimension_score
    ):
        dimension_score = rotated_dimension_score
        rotation = 90
    else:
        dimension_score = original_dimension_score
        rotation = 0

    total_score = (
        bedroom_difference * 100
        + bathroom_difference * 50
        + floor_difference * 200
        + dimension_score
    )

    return round(total_score, 4), rotation


def get_exact_room_matches(
    plans: list[dict[str, Any]],
    requested_bedrooms: int,
    requested_bathrooms: int,
    requested_floors: int,
) -> list[dict[str, Any]]:
    exact_matches: list[dict[str, Any]] = []

    for plan in plans:
        if not isinstance(plan, dict):
            continue

        try:
            plan_bedrooms = int(
                plan.get("bedrooms", 0)
            )
            plan_bathrooms = int(
                plan.get("bathrooms", 0)
            )
            plan_floors = int(
                plan.get("floors", 1)
            )
        except (TypeError, ValueError):
            continue

        if (
            plan_bedrooms == requested_bedrooms
            and plan_bathrooms == requested_bathrooms
            and plan_floors == requested_floors
        ):
            exact_matches.append(plan)

    return exact_matches


def get_valid_plans(
    plans: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    valid_plans: list[dict[str, Any]] = []

    for plan in plans:
        if not isinstance(plan, dict):
            continue

        try:
            width = float(
                plan.get("width", 0)
            )
            height = float(
                plan.get("height", 0)
            )
            bedrooms = int(
                plan.get("bedrooms", 0)
            )
            bathrooms = int(
                plan.get("bathrooms", 0)
            )
            floors = int(
                plan.get("floors", 1)
            )
        except (TypeError, ValueError):
            continue

        if (
            width <= 0
            or height <= 0
            or bedrooms < 0
            or bathrooms < 0
            or floors <= 0
        ):
            continue

        valid_plans.append(plan)

    return valid_plans


def retrieve_best_plan(
    plans: list[dict[str, Any]],
    requested_width: float,
    requested_height: float,
    requested_bedrooms: int,
    requested_bathrooms: int,
    requested_floors: int = 1,
) -> dict[str, Any]:
    if not plans:
        raise ValueError(
            "No curated floor plans are available."
        )

    exact_room_matches = get_exact_room_matches(
        plans=plans,
        requested_bedrooms=requested_bedrooms,
        requested_bathrooms=requested_bathrooms,
        requested_floors=requested_floors,
    )

    if exact_room_matches:
        candidate_plans = exact_room_matches
        match_type = "exact"
    else:
        candidate_plans = get_valid_plans(
            plans
        )
        match_type = "structural_mismatch"

    if not candidate_plans:
        raise ValueError(
            "No valid curated floor plans "
            "are available."
        )

    scored_plans: list[
        tuple[
            dict[str, Any],
            float,
            int,
        ]
    ] = []

    for plan in candidate_plans:
        score, rotation = calculate_match_score(
            plan=plan,
            requested_width=requested_width,
            requested_height=requested_height,
            requested_bedrooms=requested_bedrooms,
            requested_bathrooms=requested_bathrooms,
            requested_floors=requested_floors,
        )

        if not isfinite(score):
            continue

        scored_plans.append(
            (
                plan,
                score,
                rotation,
            )
        )

    if not scored_plans:
        raise ValueError(
            "All curated floor plans contain "
            "invalid dimensions or configuration data."
        )

    best_plan, match_score, rotation = min(
        scored_plans,
        key=lambda item: item[1],
    )

    selected_plan = deepcopy(
        best_plan
    )

    selected_plan["match_score"] = (
        match_score
    )

    selected_plan["rotation"] = (
        rotation
    )

    selected_plan["match_type"] = (
        match_type
    )

    selected_plan["match_details"] = {
        "match_type": match_type,
        "requested_width": round(
            requested_width,
            3,
        ),
        "requested_height": round(
            requested_height,
            3,
        ),
        "requested_bedrooms": (
            requested_bedrooms
        ),
        "requested_bathrooms": (
            requested_bathrooms
        ),
        "requested_floors": (
            requested_floors
        ),
        "selected_bedrooms": int(
            best_plan.get(
                "bedrooms",
                0,
            )
        ),
        "selected_bathrooms": int(
            best_plan.get(
                "bathrooms",
                0,
            )
        ),
        "selected_floors": int(
            best_plan.get(
                "floors",
                1,
            )
        ),
        "original_width": float(
            best_plan.get(
                "width",
                0,
            )
        ),
        "original_height": float(
            best_plan.get(
                "height",
                0,
            )
        ),
        "rotation": rotation,
        "match_score": match_score,
    }
    selected_plan["requires_structural_generation"] = (
        match_type == "structural_mismatch"
    )

    return selected_plan