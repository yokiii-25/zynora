import json
from pathlib import Path
from typing import Any


ENGINE_DIR = Path(__file__).resolve().parent

CURATED_DATASET_PATH = (
    ENGINE_DIR
    / "datasets"
    / "curated"
    / "residential_plans.json"
)

SAMPLE_DATASET_PATH = (
    ENGINE_DIR
    / "sample_plans.json"
)


def read_json_file(
    path: Path,
) -> list[dict[str, Any]]:
    try:
        with path.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

    except json.JSONDecodeError as error:
        raise ValueError(
            f"{path.name} contains invalid JSON."
        ) from error

    except OSError as error:
        raise OSError(
            f"Could not read {path}."
        ) from error

    if not isinstance(data, list):
        raise ValueError(
            f"{path.name} must contain a JSON array."
        )

    valid_plans: list[dict[str, Any]] = []

    for plan in data:
        if not isinstance(plan, dict):
            continue

        if not plan.get("id"):
            continue

        rooms = plan.get("rooms")

        if not isinstance(rooms, list) or not rooms:
            continue

        valid_plans.append(plan)

    return valid_plans


def load_floor_plans() -> list[dict[str, Any]]:
    if CURATED_DATASET_PATH.exists():
        plans = read_json_file(
            CURATED_DATASET_PATH
        )

        if plans:
            print(
                f"Loaded {len(plans)} curated "
                "Zynora floor plans."
            )

            return plans

    if SAMPLE_DATASET_PATH.exists():
        plans = read_json_file(
            SAMPLE_DATASET_PATH
        )

        if plans:
            print(
                f"Loaded {len(plans)} sample "
                "floor plans."
            )

            return plans

    raise FileNotFoundError(
        "No floor-plan dataset was found. "
        "Expected either "
        f"{CURATED_DATASET_PATH} or "
        f"{SAMPLE_DATASET_PATH}."
    )


# Optional alias in case another module imports load_plans().
def load_plans() -> list[dict[str, Any]]:
    return load_floor_plans()