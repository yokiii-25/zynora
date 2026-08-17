from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from services.local_render_service import (
    LocalRendererBusyError,
    LocalRendererNotInstalledError,
    LocalRendererSafetyError,
    LocalRendererUnavailableError,
    generate_local_house_render,
    get_local_renderer_status,
)


router = APIRouter(
    tags=["Realistic house render"],
)

MAX_UPLOAD_BYTES = 12 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


def _clean_form_value(
    value: str,
    field_name: str,
    maximum_length: int,
) -> str:
    cleaned = " ".join(value.strip().split())

    if len(cleaned) > maximum_length:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{field_name} must be {maximum_length} "
                "characters or fewer."
            ),
        )

    return cleaned


def _validate_and_normalize_image(
    image_bytes: bytes,
) -> bytes:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            width, height = image.size

            if width < 256 or height < 256:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "The 3D screenshot must be at least "
                        "256 by 256 pixels."
                    ),
                )

            if width * height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "The 3D screenshot is too large. "
                        "Use an image below 20 megapixels."
                    ),
                )

            normalized = image.convert("RGB")
            normalized.thumbnail(
                (2560, 2560),
                Image.Resampling.LANCZOS,
            )
            output = BytesIO()
            normalized.save(
                output,
                format="JPEG",
                quality=92,
                optimize=True,
            )

            return output.getvalue()

    except HTTPException:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=422,
            detail="The uploaded reference is not a valid image.",
        ) from error


@router.get("/local-renderer/status")
def local_renderer_status():
    return get_local_renderer_status()


@router.post("/generate-realistic-house")
async def generate_realistic_house(
    reference_image: UploadFile = File(...),
    provider: str = Form("local"),
    style: str = Form("Modern contemporary"),
    materials: str = Form(
        "Painted concrete, glass, stone, and wood accents"
    ),
    roof: str = Form(
        "Keep the roof massing shown in the reference"
    ),
    lighting: str = Form("Bright natural daylight"),
    surroundings: str = Form(
        "Simple landscaped residential plot"
    ),
    custom_instructions: str = Form(""),
    quality: str = Form("preview"),
    render_type: str = Form("exterior"),
    view_mode: str = Form("perspective"),
    structure_mode: str = Form("balanced"),
    seed: int = Form(-1),
):
    content_type = (
        reference_image.content_type or ""
    ).lower()

    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Reference image must be PNG, JPEG, or WebP."
            ),
        )

    image_bytes = await reference_image.read(
        MAX_UPLOAD_BYTES + 1
    )

    if not image_bytes:
        raise HTTPException(
            status_code=422,
            detail="The reference image is empty.",
        )

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                "The reference image must be smaller than 12 MB."
            ),
        )

    normalized_image = _validate_and_normalize_image(
        image_bytes
    )
    normalized_provider = provider.strip().lower()
    normalized_quality = quality.strip().lower()
    normalized_render_type = render_type.strip().lower()
    normalized_view_mode = view_mode.strip().lower()
    normalized_structure_mode = structure_mode.strip().lower()

    if normalized_provider not in {"local", "gemini"}:
        raise HTTPException(
            status_code=422,
            detail="Provider must be 'local' or 'gemini'.",
        )

    if normalized_quality not in {"preview", "final"}:
        raise HTTPException(
            status_code=422,
            detail="Quality must be 'preview' or 'final'.",
        )

    if normalized_render_type not in {"exterior", "cutaway"}:
        raise HTTPException(
            status_code=422,
            detail="Render type must be 'exterior' or 'cutaway'.",
        )

    if normalized_view_mode not in {"perspective", "top"}:
        raise HTTPException(
            status_code=422,
            detail="View mode must be 'perspective' or 'top'.",
        )

    if normalized_structure_mode not in {
        "strict",
        "balanced",
        "creative",
    }:
        raise HTTPException(
            status_code=422,
            detail=(
                "Structure mode must be strict, balanced, or creative."
            ),
        )

    if seed < -1 or seed > 2_147_483_647:
        raise HTTPException(
            status_code=422,
            detail=(
                "Seed must be -1 or between 0 and 2147483647."
            ),
        )

    options = {
        "style": _clean_form_value(
            style,
            "Style",
            80,
        ),
        "materials": _clean_form_value(
            materials,
            "Materials",
            240,
        ),
        "roof": _clean_form_value(
            roof,
            "Roof",
            100,
        ),
        "lighting": _clean_form_value(
            lighting,
            "Lighting",
            80,
        ),
        "surroundings": _clean_form_value(
            surroundings,
            "Surroundings",
            180,
        ),
        "custom_instructions": _clean_form_value(
            custom_instructions,
            "Additional request",
            500,
        ),
        "quality": normalized_quality,
        "render_type": normalized_render_type,
        "view_mode": normalized_view_mode,
        "structure_mode": normalized_structure_mode,
        "seed": seed,
    }

    try:
        if normalized_provider == "local":
            result = await run_in_threadpool(
                generate_local_house_render,
                normalized_image,
                options,
            )
        else:
            from services.gemini_service import (
                generate_realistic_house_render,
            )

            result = await run_in_threadpool(
                generate_realistic_house_render,
                normalized_image,
                "image/jpeg",
                options,
            )
            result["provider"] = "gemini"
    except LocalRendererBusyError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error
    except (
        LocalRendererNotInstalledError,
        LocalRendererUnavailableError,
    ) as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error
    except LocalRendererSafetyError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error
    except Exception as error:
        print(
            (
                f"{normalized_provider.capitalize()} realistic "
                "house generation failed:"
            ),
            repr(error),
        )

        raise HTTPException(
            status_code=(
                502 if normalized_provider == "gemini" else 500
            ),
            detail=(
                "Gemini could not generate the render. Check the "
                "API quota and image-model access, then try again."
                if normalized_provider == "gemini"
                else (
                    "The local renderer could not complete this image. "
                    "Check the backend log and try Fast preview."
                )
            ),
        ) from error

    return Response(
        content=result["image_bytes"],
        media_type=result["mime_type"],
        headers={
            "Cache-Control": "no-store",
            "Access-Control-Expose-Headers": (
                "X-Zynora-Render-Provider, "
                "X-Zynora-Render-Model, "
                "X-Zynora-Render-Quality, "
                "X-Zynora-Render-Seed"
            ),
            "X-Zynora-Render-Provider": result.get(
                "provider",
                normalized_provider,
            ),
            "X-Zynora-Render-Model": result["model"],
            "X-Zynora-Render-Quality": result["quality"],
            "X-Zynora-Render-Seed": str(
                result.get("seed", "")
            ),
        },
    )
