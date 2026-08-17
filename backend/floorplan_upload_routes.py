from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from floorplan_engine.image_plan_processor import (
    process_uploaded_floor_plan,
)


router = APIRouter(
    prefix="/api/floor-plans",
    tags=["Uploaded Floor Plans"],
)


UPLOAD_DIRECTORY = Path(
    "uploads/floor_plans"
)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
}

MAXIMUM_FILE_SIZE = (
    15 * 1024 * 1024
)


def get_safe_extension(
    filename: str | None,
) -> str:
    if not filename:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file has no filename."
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
                "Only PDF, JPG, JPEG, and PNG "
                "floor plans are supported."
            ),
        )

    return extension


@router.post("/upload")
async def upload_floor_plan(
    file: UploadFile = File(...),
    plan_width: float = Form(40.0, ge=5.0, le=500.0),
) -> dict[str, Any]:
    extension = get_safe_extension(
        file.filename
    )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file is empty."
            ),
        )

    if len(content) > MAXIMUM_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "The uploaded file must be "
                "smaller than 15 MB."
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

    file_path = (
        UPLOAD_DIRECTORY /
        stored_filename
    )

    try:
        file_path.write_bytes(
            content
        )

        processed_plan = (
            process_uploaded_floor_plan(
                file_path,
                target_width=plan_width,
            )
        )

        processed_plan[
            "uploaded_filename"
        ] = file.filename
        processed_plan["scale_status"] = "user_confirmed_width"

        return {
            "success": True,
            "message": (
                "Floor plan uploaded and "
                "processed successfully."
            ),
            "floor_plan": processed_plan,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Uploaded floor-plan error:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The uploaded floor plan "
                "could not be processed."
            ),
        ) from error

    finally:
        await file.close()
