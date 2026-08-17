# ZYNORA Blender Five-View Web Integration

This update connects the existing `/3d-design` five-slide page directly to the
validated Blender Phase 3.1 renderer.

## What changed

- The page sends its current canonical `zynora.floorplan.v1` document to the
  backend. It no longer captures five browser screenshots for the old
  diffusion/Gemini route.
- FastAPI starts one background Blender process and reports its progress.
- Blender builds one shared scene and sequentially renders the five locked
  cameras.
- Finished PNG files appear in the slide gallery as each view becomes
  available.
- The user can download one PNG or one ZIP containing all five PNG files and
  `manifest.json`.
- The old `/generate-realistic-house` endpoint remains installed as a fallback
  for other pages.

## API endpoints

```text
GET  /blender-renderer/status
POST /blender-renderer/jobs
GET  /blender-renderer/jobs/{job_id}
GET  /blender-renderer/jobs/{job_id}/images/{filename}
GET  /blender-renderer/jobs/{job_id}/download
```

The POST body is:

```json
{
  "floorPlan": { "schemaVersion": "zynora.floorplan.v1", "floors": [] },
  "engine": "eevee",
  "quality": "preview",
  "style": "warm-modern"
}
```

## Run ZYNORA

Backend terminal:

```powershell
cd "Y:\YPS-Labs\zynora\backend"
.\venv\Scripts\Activate.ps1
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd "Y:\YPS-Labs\zynora\frontend"
npm run dev
```

Open the current house and then open **Exterior presentation slides**. Use
Eevee Preview for the first run. After it succeeds, use Cycles Final for the
1600 × 900 RTX/OptiX output.

Web jobs are stored under:

```text
Y:\YPS-Labs\zynora\outputs\blender\web-jobs
```

## Blender discovery

The backend checks `ZYNORA_BLENDER_PATH`, the system `PATH`, and then installed
Blender versions under `C:\Program Files\Blender Foundation`. If automatic
discovery fails, set this before starting the backend:

```powershell
$env:ZYNORA_BLENDER_PATH = "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe"
```
