from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(
        0,
        str(PROJECT_ROOT),
    )

from zynora_ai.core.ml.inference import (  # noqa: E402
    RoomTypeInferenceV5,
)


router = APIRouter(
    prefix="/api/room-classification",
    tags=["Room Classification"],
)


UPLOAD_DIRECTORY = (
    PROJECT_ROOT
    / "backend"
    / "uploads"
    / "svg_floor_plans"
)

ALLOWED_EXTENSIONS = {
    ".svg",
}

MAXIMUM_FILE_SIZE = (
    20
    * 1024
    * 1024
)


_inference_engine: RoomTypeInferenceV5 | None = None


def get_inference_engine() -> RoomTypeInferenceV5:
    global _inference_engine

    if _inference_engine is None:
        _inference_engine = (
            RoomTypeInferenceV5()
        )

    return _inference_engine


def validate_extension(
    filename: str | None,
) -> str:
    if not filename:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded SVG has no filename."
            ),
        )

    extension = (
        Path(filename)
        .suffix
        .lower()
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only SVG floor plans are supported "
                "by the room classifier."
            ),
        )

    return extension


@router.get("/health")
def room_classifier_health() -> dict[str, Any]:
    model_path = (
        PROJECT_ROOT
        / "outputs"
        / "models"
        / "room_classifier_v5.pkl"
    )

    encoder_path = (
        PROJECT_ROOT
        / "outputs"
        / "models"
        / "room_label_encoder_v5.pkl"
    )

    features_path = (
        PROJECT_ROOT
        / "outputs"
        / "models"
        / "room_feature_columns_v5.pkl"
    )

    return {
        "status": "ready",
        "model_version": "v5",
        "files": {
            "model": model_path.exists(),
            "label_encoder": encoder_path.exists(),
            "feature_columns": features_path.exists(),
        },
    }


@router.post("/predict")
async def predict_room_types(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    extension = validate_extension(
        file.filename
    )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded SVG file is empty."
            ),
        )

    if len(content) > MAXIMUM_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "The SVG file must be smaller "
                "than 20 MB."
            ),
        )

    UPLOAD_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_filename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    svg_path = (
        UPLOAD_DIRECTORY
        / stored_filename
    )

    try:
        svg_path.write_bytes(
            content
        )

        inference_engine = (
            get_inference_engine()
        )

        predictions = (
            inference_engine.predict_svg(
                svg_path
            )
        )

        room_results = [
            prediction.to_dict()
            for prediction in predictions
        ]

        high_confidence = sum(
            room[
                "confidence_status"
            ]
            == "high_confidence"
            for room in room_results
        )

        review_recommended = sum(
            room[
                "confidence_status"
            ]
            == "review_recommended"
            for room in room_results
        )

        low_confidence = sum(
            room[
                "confidence_status"
            ]
            == "low_confidence"
            for room in room_results
        )

        return {
            "success": True,
            "message": (
                "Room classification completed."
            ),
            "model_version": "v5",
            "uploaded_filename": file.filename,
            "room_count": len(
                room_results
            ),
            "summary": {
                "high_confidence": (
                    high_confidence
                ),
                "review_recommended": (
                    review_recommended
                ),
                "low_confidence": (
                    low_confidence
                ),
            },
            "rooms": room_results,
        }

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Room classification error:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": (
                    "The SVG room classification "
                    "could not be completed."
                ),
                "error": str(error),
                "error_type": (
                    type(error).__name__
                ),
            },
        ) from error

    finally:
        await file.close()

        if svg_path.exists():
            svg_path.unlink()