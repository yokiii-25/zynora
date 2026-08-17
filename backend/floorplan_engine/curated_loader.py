import json
from copy import deepcopy
from pathlib import Path
from typing import Any


ENGINE_DIR = Path(__file__).resolve().parent

CURATED_DATASET_PATH = (
    ENGINE_DIR
    / "datasets"
    / "curated"
    / "residential_plans.json"
)


class CuratedDatasetError(Exception):
    pass


def load_curated_plans() -> list[dict[str, Any]]:
    if not CURATED_DATASET_PATH.exists():
        raise CuratedDatasetError(
            "Curated residential plan dataset "
            f"was not found at {CURATED_DATASET_PATH}"
        )

    try:
        with CURATED_DATASET_PATH.open(
            "r",
            encoding="utf-8",
        ) as file:
            plans = json.load(file)
    except json.JSONDecodeError as error:
        raise CuratedDatasetError(
            "Curated residential plan dataset "
            "contains invalid JSON."
        ) from error
    except OSError as error:
        raise CuratedDatasetError(
            "Curated residential plan dataset "
            "could not be opened."
        ) from error

    if not isinstance(plans, list):
        raise CuratedDatasetError(
            "Curated dataset must contain "
            "a JSON array."
        )

    valid_plans: list[dict[str, Any]] = []

    for plan in plans:
        if not isinstance(plan, dict):
            continue

        if not plan.get("id"):
            continue

        if not plan.get("rooms"):
            continue

        valid_plans.append(plan)

    if not valid_plans:
        raise CuratedDatasetError(
            "Curated dataset does not contain "
            "any valid floor plans."
        )

    return deepcopy(valid_plans)