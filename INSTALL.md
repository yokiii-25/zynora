# ZYNORA Free Local Renderer v7

This update makes the RTX local renderer the default for **Generate Realistic
House** while preserving the existing Gemini option.

## What it adds

- Stable Diffusion 1.5 image-to-image rendering
- ControlNet Canny guidance from the current Three.js camera view
- RTX 3050 low-memory mode with model CPU offload
- Local GPU and dependency status inside the render panel
- Strict, balanced, and creative geometry modes
- Reproducible seeds
- Clean reference capture without the scene grid or furniture
- Existing Gemini provider retained as an optional fallback

The default local base model is `SG161222/Realistic_Vision_V6.0_B1_noVAE` and
the structure model is `lllyasviel/control_v11p_sd15_canny`. Both model files
are downloaded once and cached outside the Git repository under
`Y:\YPS-Labs\.zynora-model-cache` for the normal project location.

## Install

Stop the frontend and backend with `Ctrl + C`.

Extract the ZIP directly into:

```text
Y:\YPS-Labs\zynora
```

Then run PowerShell from the project directory:

```powershell
cd Y:\YPS-Labs\zynora

powershell -ExecutionPolicy Bypass `
  -File .\setup-local-renderer.ps1
```

The first setup installs CUDA-enabled PyTorch if needed and downloads several
GB of model files. If Ethernet disconnects, rerun the same command; completed
cached files are reused.

## Start ZYNORA

Backend:

```powershell
cd Y:\YPS-Labs\zynora

.\backend\venv\Scripts\python.exe `
  -m uvicorn app:app `
  --reload `
  --app-dir .\backend
```

Frontend in a second PowerShell window:

```powershell
cd Y:\YPS-Labs\zynora\frontend
npm run dev
```

## Test

1. Open `http://localhost:5173`.
2. Upload and classify the SVG.
3. Open **Generate Complete 3D Plan**.
4. Rotate to the desired perspective.
5. Open **Generate Realistic House**.
6. Keep **Free local renderer · NVIDIA GPU** selected.
7. Start with **3D plan cutaway**, **Fast local preview**, and **Balanced**.
8. Click **Render Locally from Current View**.

After that works, test **Exterior house concept**. An exterior render can only
follow floors, roof massing, openings, and facade geometry already present in
the Three.js scene. Missing upper floors or roofs still need to be added to the
3D model rather than invented by the image renderer.

## Troubleshooting

- **Local packages are not installed:** rerun `setup-local-renderer.ps1`.
- **PyTorch cannot access the NVIDIA GPU:** update the NVIDIA driver, restart,
  and rerun the setup script.
- **GPU ran out of memory:** close games and GPU-heavy apps, then use Fast
  preview and Strict or Balanced geometry.
- **Model preparation failed:** reconnect Ethernet and rerun the setup; the
  model cache is resumable.
- **Another render is running:** wait for it to finish. The RTX 3050 path runs
  one image at a time to avoid memory collisions.

This is a visual concept renderer, not a construction-ready architectural or
structural document.
