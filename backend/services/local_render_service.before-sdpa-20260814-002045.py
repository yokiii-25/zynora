from __future__ import annotations

from io import BytesIO
import importlib.util
import os
from pathlib import Path
import secrets
import threading
from typing import Any

from PIL import Image, ImageFilter, ImageOps


LOCAL_MODEL_NAME = os.getenv(
    "ZYNORA_LOCAL_RENDER_MODEL",
    "SG161222/Realistic_Vision_V6.0_B1_noVAE",
)
CONTROLNET_MODEL_NAME = os.getenv(
    "ZYNORA_LOCAL_CONTROLNET_MODEL",
    "lllyasviel/control_v11p_sd15_canny",
)

_BACKEND_DIRECTORY = Path(__file__).resolve().parents[1]
_DEFAULT_CACHE_DIRECTORY = (
    _BACKEND_DIRECTORY.parent.parent / ".zynora-model-cache"
)
MODEL_CACHE_DIRECTORY = Path(
    os.getenv(
        "ZYNORA_LOCAL_MODEL_CACHE",
        str(_DEFAULT_CACHE_DIRECTORY),
    )
).expanduser()

_PIPELINE: Any | None = None
_PIPELINE_LOAD_LOCK = threading.Lock()
_RENDER_LOCK = threading.Lock()

_STRUCTURE_PRESETS = {
    "strict": {
        "control_scale": 1.15,
        "denoise_strength": 0.62,
    },
    "balanced": {
        "control_scale": 0.95,
        "denoise_strength": 0.72,
    },
    "creative": {
        "control_scale": 0.75,
        "denoise_strength": 0.82,
    },
}

_QUALITY_PRESETS = {
    "preview": {
        "size": (640, 360),
        "steps": 18,
        "guidance_scale": 6.5,
    },
    "final": {
        "size": (768, 432),
        "steps": 32,
        "guidance_scale": 6.5,
    },
}


class LocalRendererError(RuntimeError):
    """Base exception for expected local-renderer failures."""


class LocalRendererNotInstalledError(LocalRendererError):
    """Raised when the optional local AI packages are missing."""


class LocalRendererUnavailableError(LocalRendererError):
    """Raised when the local GPU or model cannot be used."""


class LocalRendererBusyError(LocalRendererError):
    """Raised when a render is already running."""


class LocalRendererSafetyError(LocalRendererError):
    """Raised when the model safety checker rejects an output."""


def _module_is_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def get_local_renderer_status() -> dict[str, Any]:
    required_modules = (
        "torch",
        "diffusers",
        "transformers",
        "accelerate",
    )
    missing_modules = [
        name
        for name in required_modules
        if not _module_is_available(name)
    ]
    status: dict[str, Any] = {
        "provider": "local",
        "installed": not missing_modules,
        "missing_packages": missing_modules,
        "cuda_available": False,
        "device_name": None,
        "torch_version": None,
        "cuda_version": None,
        "model_loaded": _PIPELINE is not None,
        "model_cache_present": (
            MODEL_CACHE_DIRECTORY.exists()
            and any(MODEL_CACHE_DIRECTORY.iterdir())
        ),
        "model": LOCAL_MODEL_NAME,
        "controlnet_model": CONTROLNET_MODEL_NAME,
        "ready": False,
    }

    if missing_modules:
        return status

    try:
        import torch

        status["torch_version"] = torch.__version__
        status["cuda_version"] = torch.version.cuda
        status["cuda_available"] = bool(
            torch.cuda.is_available()
        )

        if status["cuda_available"]:
            status["device_name"] = torch.cuda.get_device_name(0)
            status["ready"] = True
    except Exception as error:
        status["error"] = str(error)

    return status


def _load_pipeline() -> tuple[Any, Any]:
    global _PIPELINE

    if _PIPELINE is not None:
        import torch

        return _PIPELINE, torch

    with _PIPELINE_LOAD_LOCK:
        if _PIPELINE is not None:
            import torch

            return _PIPELINE, torch

        missing_modules = [
            name
            for name in (
                "torch",
                "diffusers",
                "transformers",
                "accelerate",
            )
            if not _module_is_available(name)
        ]

        if missing_modules:
            raise LocalRendererNotInstalledError(
                "Local renderer packages are missing: "
                + ", ".join(missing_modules)
                + ". Run setup-local-renderer.ps1 once."
            )

        import torch
        from diffusers import (
            AutoencoderKL,
            ControlNetModel,
            StableDiffusionControlNetImg2ImgPipeline,
            UniPCMultistepScheduler,
        )

        if not torch.cuda.is_available():
            raise LocalRendererUnavailableError(
                "PyTorch cannot access the NVIDIA GPU. Run the "
                "local-renderer setup again and verify the CUDA check."
            )

        MODEL_CACHE_DIRECTORY.mkdir(
            parents=True,
            exist_ok=True,
        )
        dtype = torch.float16

        try:
            vae = AutoencoderKL.from_pretrained(
                "stabilityai/sd-vae-ft-mse",
                torch_dtype=dtype,
                cache_dir=str(MODEL_CACHE_DIRECTORY),
                use_safetensors=True,
                low_cpu_mem_usage=True,
            )
            controlnet = ControlNetModel.from_pretrained(
                CONTROLNET_MODEL_NAME,
                torch_dtype=dtype,
                cache_dir=str(MODEL_CACHE_DIRECTORY),
                low_cpu_mem_usage=True,
            )
            pipeline = (
                StableDiffusionControlNetImg2ImgPipeline.from_pretrained(
                    LOCAL_MODEL_NAME,
                    vae=vae,
                    controlnet=controlnet,
                    torch_dtype=dtype,
                    cache_dir=str(MODEL_CACHE_DIRECTORY),
                    low_cpu_mem_usage=True,
                )
            )
        except Exception as error:
            raise LocalRendererUnavailableError(
                "The local AI models could not be loaded. Check the "
                "internet connection and rerun the model download. "
                f"Original error: {error}"
            ) from error

        if getattr(pipeline, "safety_checker", None) is None:
            raise LocalRendererUnavailableError(
                "The selected local model has no safety checker. "
                "Use the default ZYNORA local model."
            )

        pipeline.scheduler = UniPCMultistepScheduler.from_config(
            pipeline.scheduler.config
        )
        pipeline.enable_model_cpu_offload(gpu_id=0)
        pipeline.vae.enable_slicing()
        pipeline.vae.enable_tiling()
        pipeline.enable_attention_slicing("max")

        if hasattr(pipeline, "set_progress_bar_config"):
            pipeline.set_progress_bar_config(
                desc="ZYNORA local render"
            )

        torch.backends.cuda.matmul.allow_tf32 = True
        torch.set_float32_matmul_precision("high")
        _PIPELINE = pipeline

        return _PIPELINE, torch


def preload_local_renderer() -> dict[str, Any]:
    _load_pipeline()
    return get_local_renderer_status()


def _clean_option(
    value: Any,
    fallback: str,
    maximum_length: int,
) -> str:
    cleaned = " ".join(str(value or "").strip().split())
    return (cleaned or fallback)[:maximum_length]


def build_local_render_prompt(
    options: dict[str, Any],
) -> str:
    style = _clean_option(
        options.get("style"),
        "Modern contemporary",
        80,
    )
    materials = _clean_option(
        options.get("materials"),
        "painted concrete, glass, stone, and wood accents",
        240,
    )
    roof = _clean_option(
        options.get("roof"),
        "keep the roof massing shown in the reference",
        100,
    )
    lighting = _clean_option(
        options.get("lighting"),
        "bright natural daylight",
        80,
    )
    surroundings = _clean_option(
        options.get("surroundings"),
        "a simple landscaped residential plot",
        180,
    )
    custom_instructions = _clean_option(
        options.get("custom_instructions"),
        "no additional changes",
        500,
    )
    render_type = str(
        options.get("render_type", "exterior")
    ).strip().lower()
    view_mode = str(
        options.get("view_mode", "perspective")
    ).strip().lower()

    if render_type == "cutaway":
        subject = (
            "photorealistic architectural cutaway visualization of "
            "the complete residential floor plan"
        )
    else:
        subject = (
            "photorealistic exterior architectural visualization of "
            "the complete residential house"
        )

    viewpoint = (
        "top-down viewpoint"
        if view_mode == "top"
        else "the exact same perspective camera viewpoint"
    )

    appearance = (
        custom_instructions
        if custom_instructions != "no additional changes"
        else f"{style}, {materials}, {roof}, {lighting}, {surroundings}"
    )

    return (
        f"{appearance}. {subject}, {viewpoint}. "
        "Photorealistic residential architecture, rich natural colors, "
        "realistic glazing and shadows. Preserve geometry, floor count, "
        "doors, windows, camera orientation, and the full building."
    )

def _prepare_reference_images(
    reference_image: bytes,
    size: tuple[int, int],
) -> tuple[Image.Image, Image.Image]:

    with Image.open(BytesIO(reference_image)) as source:
        rgb_source = ImageOps.exif_transpose(source).convert("RGB")
        contained = ImageOps.contain(
            rgb_source,
            size,
            Image.Resampling.LANCZOS,
        )

    reference = Image.new(
        "RGB",
        size,
        (235, 240, 245),
    )
    offset = (
        (size[0] - contained.width) // 2,
        (size[1] - contained.height) // 2,
    )
    reference.paste(contained, offset)

    try:
        import cv2
        import numpy as np

        image_array = np.asarray(reference)
        grayscale = cv2.cvtColor(
            image_array,
            cv2.COLOR_RGB2GRAY,
        )
        grayscale = cv2.GaussianBlur(
            grayscale,
            (3, 3),
            0,
        )
        edges = cv2.Canny(
            grayscale,
            threshold1=70,
            threshold2=170,
        )
        edge_rgb = np.repeat(
            edges[:, :, None],
            3,
            axis=2,
        )
        control_image = Image.fromarray(edge_rgb)
    except ImportError:
        control_image = (
            reference.convert("L")
            .filter(ImageFilter.GaussianBlur(radius=0.8))
            .filter(ImageFilter.FIND_EDGES)
            .point(lambda value: 255 if value >= 28 else 0)
            .convert("RGB")
        )

    return reference, control_image


def generate_local_house_render(
    reference_image: bytes,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not reference_image:
        raise ValueError("A 3D reference image is required.")

    if not _RENDER_LOCK.acquire(blocking=False):
        raise LocalRendererBusyError(
            "A local render is already running. Wait for it to finish "
            "before starting another one."
        )

    render_options = options or {}
    quality = str(
        render_options.get("quality", "preview")
    ).strip().lower()
    structure_mode = str(
        render_options.get("structure_mode", "balanced")
    ).strip().lower()

    if quality not in _QUALITY_PRESETS:
        _RENDER_LOCK.release()
        raise ValueError(
            "Render quality must be 'preview' or 'final'."
        )

    if structure_mode not in _STRUCTURE_PRESETS:
        _RENDER_LOCK.release()
        raise ValueError(
            "Structure mode must be strict, balanced, or creative."
        )

    try:
        pipeline, torch = _load_pipeline()
        quality_preset = _QUALITY_PRESETS[quality]
        structure_preset = _STRUCTURE_PRESETS[structure_mode]
        reference, control_image = _prepare_reference_images(
            reference_image,
            quality_preset["size"],
        )
        requested_seed = int(
            render_options.get("seed", -1)
        )

        if requested_seed < 0:
            seed = secrets.randbelow(2_147_483_647)
        elif requested_seed > 2_147_483_647:
            raise ValueError(
                "Seed must be -1 or between 0 and 2147483647."
            )
        else:
            seed = requested_seed

        prompt = build_local_render_prompt(render_options)
        prompt_ids = pipeline.tokenizer(
            prompt,
            truncation=True,
            max_length=pipeline.tokenizer.model_max_length,
        )["input_ids"]
        prompt = pipeline.tokenizer.decode(
            prompt_ids,
            skip_special_tokens=True,
        )
        negative_prompt = (
            "people, vehicles, text, logo, watermark, duplicate building, "
            "extra floor, missing floor, distorted walls, warped perspective, "
            "cropped building, blurry, low detail, cartoon, illustration, "
            "monochrome, grayscale, desaturated, washed out, overexposed, "
            "gray color cast, fog, flat lighting"
        )
        generator = torch.Generator(device="cpu").manual_seed(seed)

        with torch.inference_mode():
            output = pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=reference,
                control_image=control_image,
                strength=structure_preset["denoise_strength"],
                controlnet_conditioning_scale=(
                    structure_preset["control_scale"]
                ),
                num_inference_steps=quality_preset["steps"],
                guidance_scale=quality_preset["guidance_scale"],
                generator=generator,
                width=quality_preset["size"][0],
                height=quality_preset["size"][1],
            )

        safety_flags = getattr(
            output,
            "nsfw_content_detected",
            None,
        )

        if safety_flags and any(bool(flag) for flag in safety_flags):
            raise LocalRendererSafetyError(
                "The local model safety checker rejected this output. "
                "Adjust the request and try again."
            )

        if not output.images:
            raise LocalRendererUnavailableError(
                "The local model returned no image."
            )

        rendered_image = output.images[0].convert("RGB")
        image_output = BytesIO()
        rendered_image.save(
            image_output,
            format="JPEG",
            quality=93,
            optimize=True,
        )

        return {
            "image_bytes": image_output.getvalue(),
            "mime_type": "image/jpeg",
            "model": LOCAL_MODEL_NAME,
            "provider": "local",
            "quality": quality,
            "seed": seed,
            "width": rendered_image.width,
            "height": rendered_image.height,
        }

    except RuntimeError as error:
        if "out of memory" in str(error).lower():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass

            raise LocalRendererUnavailableError(
                "The GPU ran out of memory. Close GPU-heavy programs and "
                "use Fast preview, then try again."
            ) from error

        raise
    finally:
        _RENDER_LOCK.release()
