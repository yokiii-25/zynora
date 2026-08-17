from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
import uuid
import zipfile
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class BlenderRendererUnavailableError(RuntimeError):
    pass


class BlenderRendererBusyError(RuntimeError):
    pass


class BlenderRenderJobNotFoundError(KeyError):
    pass


VIEW_SPECS = (
    {
        "id": "front-hero",
        "title": "Front hero",
        "filename": "01-front-hero.png",
    },
    {
        "id": "front-left",
        "title": "Front-left perspective",
        "filename": "02-front-left.png",
    },
    {
        "id": "front-straight",
        "title": "Front elevation",
        "filename": "03-front-straight.png",
    },
    {
        "id": "right-side",
        "title": "Right-side perspective",
        "filename": "04-right-side.png",
    },
    {
        "id": "left-side",
        "title": "Left-side perspective",
        "filename": "05-left-side.png",
    },
)

VALID_ENGINES = {"eevee", "cycles"}
VALID_QUALITIES = {"preview", "final"}
VALID_STYLES = {"warm-modern", "graphite-white", "sandstone"}
MAX_FLOOR_PLAN_BYTES = 12 * 1024 * 1024

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
RENDERER_PATH = BACKEND_ROOT / "blender_renderer" / "render_zynora_floorplan.py"
JOB_ROOT = PROJECT_ROOT / "outputs" / "blender" / "web-jobs"

_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.RLock()
_active_job_id: str | None = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_blender() -> Path | None:
    configured = os.environ.get("ZYNORA_BLENDER_PATH", "").strip().strip('"')
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file():
            return candidate.resolve()

    discovered = shutil.which("blender.exe") or shutil.which("blender")
    if discovered:
        return Path(discovered).resolve()

    program_files = Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
    blender_root = program_files / "Blender Foundation"
    if blender_root.is_dir():
        candidates = sorted(
            blender_root.glob("Blender */blender.exe"),
            key=lambda path: path.parent.name,
            reverse=True,
        )
        if candidates:
            return candidates[0].resolve()

    return None


def get_blender_renderer_status() -> dict[str, Any]:
    blender_path = _find_blender()
    with _jobs_lock:
        active_job = _jobs.get(_active_job_id or "")
        busy = bool(
            active_job
            and active_job.get("status") in {"queued", "running"}
        )

    renderer_present = RENDERER_PATH.is_file()
    installed = bool(blender_path and renderer_present)
    return {
        "provider": "blender",
        "installed": installed,
        "ready": installed and not busy,
        "busy": busy,
        "blender_path": str(blender_path) if blender_path else "",
        "renderer_path": str(RENDERER_PATH) if renderer_present else "",
        "engines": sorted(VALID_ENGINES),
        "qualities": sorted(VALID_QUALITIES),
        "styles": sorted(VALID_STYLES),
        "message": (
            "Blender renderer is busy with another five-view job."
            if busy
            else "Blender five-view renderer is ready."
            if installed
            else "Blender 4.5 LTS or the ZYNORA Blender renderer was not found."
        ),
    }


def _validate_request(
    floor_plan: dict[str, Any],
    engine: str,
    quality: str,
    style: str,
) -> bytes:
    if not isinstance(floor_plan, dict):
        raise ValueError("FloorPlanJSON must be a JSON object.")
    if floor_plan.get("schemaVersion") != "zynora.floorplan.v1":
        raise ValueError(
            "Expected schemaVersion 'zynora.floorplan.v1'. Open the ZYNORA 3D "
            "page and use its current FloorPlanJSON."
        )
    if not isinstance(floor_plan.get("floors"), list) or not floor_plan["floors"]:
        raise ValueError("FloorPlanJSON does not contain any floors.")
    if engine not in VALID_ENGINES:
        raise ValueError("Engine must be 'eevee' or 'cycles'.")
    if quality not in VALID_QUALITIES:
        raise ValueError("Quality must be 'preview' or 'final'.")
    if style not in VALID_STYLES:
        raise ValueError(
            "Style must be warm-modern, graphite-white, or sandstone."
        )

    encoded = json.dumps(
        floor_plan,
        ensure_ascii=False,
        allow_nan=False,
        indent=2,
    ).encode("utf-8")
    if len(encoded) > MAX_FLOOR_PLAN_BYTES:
        raise ValueError("FloorPlanJSON must be smaller than 12 MB.")
    return encoded


def _job_or_raise(job_id: str) -> dict[str, Any]:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise BlenderRenderJobNotFoundError(job_id)
        return dict(job)


def _image_records(job_id: str, output_directory: Path) -> list[dict[str, str]]:
    images: list[dict[str, str]] = []
    for view in VIEW_SPECS:
        image_path = output_directory / view["filename"]
        if image_path.is_file():
            images.append(
                {
                    **view,
                    "url": (
                        f"/blender-renderer/jobs/{job_id}/images/"
                        f"{view['filename']}"
                    ),
                }
            )
    return images


def _public_job(job: dict[str, Any]) -> dict[str, Any]:
    job_id = str(job["job_id"])
    output_directory = Path(job["output_directory"])
    images = _image_records(job_id, output_directory)
    complete = job.get("status") == "completed"
    return {
        "jobId": job_id,
        "status": job.get("status", "queued"),
        "stage": job.get("stage", "Waiting for Blender"),
        "progress": int(job.get("progress", 0)),
        "completedViews": len(images),
        "totalViews": len(VIEW_SPECS),
        "engine": job["engine"],
        "quality": job["quality"],
        "style": job["style"],
        "createdAt": job["created_at"],
        "startedAt": job.get("started_at"),
        "completedAt": job.get("completed_at"),
        "error": job.get("error", ""),
        "images": images,
        "downloadUrl": (
            f"/blender-renderer/jobs/{job_id}/download" if complete else ""
        ),
    }


def get_blender_render_job(job_id: str) -> dict[str, Any]:
    return _public_job(_job_or_raise(job_id))


def _update_job(job_id: str, **values: Any) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job:
            job.update(values)


def _append_log(job_id: str, line: str) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job:
            job["log_tail"].append(line[-1200:])


def _run_job(job_id: str, blender_path: Path) -> None:
    global _active_job_id

    job = _job_or_raise(job_id)
    output_directory = Path(job["output_directory"])
    input_path = Path(job["input_path"])
    command = [
        str(blender_path),
        "--background",
        "--python-exit-code",
        "1",
        "--python",
        str(RENDERER_PATH),
        "--",
        "--input",
        str(input_path),
        "--output",
        str(output_directory),
        "--engine",
        job["engine"],
        "--quality",
        job["quality"],
        "--style",
        job["style"],
    ]

    _update_job(
        job_id,
        status="running",
        stage="Starting Blender",
        started_at=_utc_now(),
        progress=1,
    )
    environment = os.environ.copy()
    environment["PYTHONUNBUFFERED"] = "1"
    creation_flags = (
        subprocess.CREATE_NO_WINDOW
        if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW")
        else 0
    )

    try:
        process = subprocess.Popen(
            command,
            cwd=str(PROJECT_ROOT),
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            creationflags=creation_flags,
        )
        assert process.stdout is not None
        for raw_line in process.stdout:
            line = raw_line.rstrip()
            if line:
                _append_log(job_id, line)
            marker = "ZYNORA_RENDERING="
            if marker in line:
                view_name = line.split(marker, 1)[1].strip()
                index = next(
                    (
                        position
                        for position, view in enumerate(VIEW_SPECS)
                        if view["filename"].removesuffix(".png") == view_name
                    ),
                    0,
                )
                _update_job(
                    job_id,
                    stage=f"Rendering {VIEW_SPECS[index]['title']}",
                    progress=max(2, index * 20 + 4),
                )

        return_code = process.wait()
        if return_code != 0:
            raise RuntimeError(f"Blender returned exit code {return_code}.")

        missing = [
            view["filename"]
            for view in VIEW_SPECS
            if not (output_directory / view["filename"]).is_file()
        ]
        manifest_path = output_directory / "manifest.json"
        if missing:
            raise RuntimeError(
                "Blender finished without the expected files: " + ", ".join(missing)
            )
        if not manifest_path.is_file():
            raise RuntimeError("Blender finished without manifest.json.")

        _update_job(
            job_id,
            status="completed",
            stage="Five exterior slides are ready",
            progress=100,
            completed_at=_utc_now(),
            error="",
        )
    except Exception as error:
        latest = _job_or_raise(job_id)
        useful_log = "\n".join(list(latest.get("log_tail", []))[-12:])
        detail = str(error)
        if useful_log:
            detail = f"{detail}\n\nLast Blender output:\n{useful_log}"
        _update_job(
            job_id,
            status="failed",
            stage="Render failed",
            completed_at=_utc_now(),
            error=detail[-5000:],
        )
    finally:
        with _jobs_lock:
            if _active_job_id == job_id:
                _active_job_id = None


def start_blender_render_job(
    floor_plan: dict[str, Any],
    engine: str = "eevee",
    quality: str = "preview",
    style: str = "warm-modern",
) -> dict[str, Any]:
    global _active_job_id

    normalized_engine = str(engine).strip().lower()
    normalized_quality = str(quality).strip().lower()
    normalized_style = str(style).strip().lower()
    document_bytes = _validate_request(
        floor_plan,
        normalized_engine,
        normalized_quality,
        normalized_style,
    )

    blender_path = _find_blender()
    if not blender_path or not RENDERER_PATH.is_file():
        raise BlenderRendererUnavailableError(
            "Blender 4.5 LTS or backend/blender_renderer/"
            "render_zynora_floorplan.py was not found."
        )

    with _jobs_lock:
        active = _jobs.get(_active_job_id or "")
        if active and active.get("status") in {"queued", "running"}:
            raise BlenderRendererBusyError(
                "Another five-view render is already running. Wait for it to finish."
            )

        job_id = uuid.uuid4().hex
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_directory = JOB_ROOT / f"{stamp}-{job_id[:8]}"
        output_directory.mkdir(parents=True, exist_ok=False)
        input_path = output_directory / "zynora-floorplan-v1.json"
        input_path.write_bytes(document_bytes)
        job = {
            "job_id": job_id,
            "status": "queued",
            "stage": "Queued",
            "progress": 0,
            "engine": normalized_engine,
            "quality": normalized_quality,
            "style": normalized_style,
            "created_at": _utc_now(),
            "started_at": None,
            "completed_at": None,
            "error": "",
            "input_path": str(input_path),
            "output_directory": str(output_directory),
            "log_tail": deque(maxlen=180),
        }
        _jobs[job_id] = job
        _active_job_id = job_id

    worker = threading.Thread(
        target=_run_job,
        args=(job_id, blender_path),
        name=f"zynora-blender-{job_id[:8]}",
        daemon=True,
    )
    worker.start()
    return _public_job(job)


def get_blender_render_image(job_id: str, filename: str) -> Path:
    job = _job_or_raise(job_id)
    allowed = {view["filename"] for view in VIEW_SPECS}
    if filename not in allowed:
        raise FileNotFoundError(filename)
    path = (Path(job["output_directory"]) / filename).resolve()
    if not path.is_file():
        raise FileNotFoundError(filename)
    return path


def get_blender_render_archive(job_id: str) -> Path:
    job = _job_or_raise(job_id)
    if job.get("status") != "completed":
        raise ValueError("The five-view render is not complete yet.")

    output_directory = Path(job["output_directory"])
    archive_path = output_directory / "ZYNORA-five-exterior-views.zip"
    if archive_path.is_file():
        return archive_path

    temporary_path = output_directory / "ZYNORA-five-exterior-views.tmp.zip"
    with zipfile.ZipFile(
        temporary_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=6,
    ) as archive:
        for view in VIEW_SPECS:
            image_path = output_directory / view["filename"]
            archive.write(image_path, arcname=view["filename"])
        manifest_path = output_directory / "manifest.json"
        archive.write(manifest_path, arcname="manifest.json")
    temporary_path.replace(archive_path)
    return archive_path
