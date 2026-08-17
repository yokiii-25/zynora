from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from services.blender_render_service import (
    BlenderRendererBusyError,
    BlenderRendererUnavailableError,
    BlenderRenderJobNotFoundError,
    get_blender_render_archive,
    get_blender_render_image,
    get_blender_render_job,
    get_blender_renderer_status,
    start_blender_render_job,
)


router = APIRouter(
    prefix="/blender-renderer",
    tags=["Blender exterior render"],
)


class BlenderRenderJobRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    floor_plan: dict[str, Any] = Field(alias="floorPlan")
    engine: Literal["eevee", "cycles"] = "eevee"
    quality: Literal["preview", "final"] = "preview"
    style: Literal[
        "warm-modern",
        "graphite-white",
        "sandstone",
    ] = "warm-modern"


@router.get("/status")
def blender_renderer_status():
    return get_blender_renderer_status()


@router.post("/jobs", status_code=202)
def create_blender_render_job(request: BlenderRenderJobRequest):
    try:
        return start_blender_render_job(
            floor_plan=request.floor_plan,
            engine=request.engine,
            quality=request.quality,
            style=request.style,
        )
    except BlenderRendererBusyError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except BlenderRendererUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/jobs/{job_id}")
def blender_render_job(job_id: str):
    try:
        return get_blender_render_job(job_id)
    except BlenderRenderJobNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail="The Blender render job was not found.",
        ) from error


@router.get("/jobs/{job_id}/images/{filename}")
def blender_render_image(job_id: str, filename: str):
    try:
        image_path = get_blender_render_image(job_id, filename)
    except BlenderRenderJobNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail="The Blender render job was not found.",
        ) from error
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail="The requested exterior view is not ready.",
        ) from error

    return FileResponse(
        path=image_path,
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/jobs/{job_id}/download")
def download_blender_render_pack(job_id: str):
    try:
        archive_path = get_blender_render_archive(job_id)
    except BlenderRenderJobNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail="The Blender render job was not found.",
        ) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail="One or more rendered views are missing.",
        ) from error

    return FileResponse(
        path=archive_path,
        media_type="application/zip",
        filename="ZYNORA-five-exterior-views.zip",
        headers={"Cache-Control": "no-store"},
    )
