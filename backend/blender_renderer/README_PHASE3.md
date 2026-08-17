# ZYNORA Blender Phase 3.1 — Material Polish

This package builds on the approved Phase 2.1 geometry and camera correction.
Blender reads the
current `zynora.floorplan.v1` JSON exported by ZYNORA and builds its exterior
walls, door/window holes, slabs, roof, parapet, façade details, site and five
locked cameras.

Phase 3.1 keeps the exported wall/opening geometry unchanged and upgrades the
presentation layer:

- procedural cream plaster, wood grain, concrete, paving, asphalt and grass;
- improved transmissive architectural glass;
- warm horizontal façade detailing;
- a sidewalk, curb, road markings and lightweight background trees;
- stronger architectural daylight and contact shadows; and
- slightly closer hero framing while retaining the complete building.

This revision also replaces the over-distorted horizontal wood pattern with a
restrained vertical grain, warms the plaster and mineral band, deepens the sky,
and moves the background trees beyond the house corners.

## What this verifies

- The rendered house comes from the current ZYNORA FloorPlanJSON.
- Floor count, exterior-wall positions and openings come from that JSON.
- Five views are produced from one shared Blender scene.
- Every slide therefore uses the same geometry and materials.
- The first test uses Eevee to render quickly on the RTX 3050 4 GB.

This phase is a manual bridge. After its five views are verified, the same
command can be called by the FastAPI backend and connected to the existing
five-slide page.

## Install the files

Extract this ZIP directly into:

```text
Y:\YPS-Labs\zynora\backend\blender_renderer
```

The directory should then contain:

```text
render_phase1_test.py
render_zynora_floorplan.py
run_zynora_floorplan.ps1
README_PHASE3.md
```

## First run

1. Start ZYNORA.
2. Open the real house in the 3D page.
3. Click **Download FloorPlanJSON**.
4. Run this in PowerShell:

```powershell
cd "Y:\YPS-Labs\zynora"

powershell -ExecutionPolicy Bypass -File `
    ".\backend\blender_renderer\run_zynora_floorplan.ps1"
```

The runner automatically selects the newest `zynora-floorplan*.json` file in
your Downloads directory.

## Select a specific JSON file

```powershell
cd "Y:\YPS-Labs\zynora"

powershell -ExecutionPolicy Bypass -File `
    ".\backend\blender_renderer\run_zynora_floorplan.ps1" `
    -InputJson "C:\Users\YOUR_NAME\Downloads\zynora-floorplan-v1.json"
```

## Output

Each run creates a new timestamped directory under:

```text
Y:\YPS-Labs\zynora\outputs\blender\phase3-1-YYYYMMDD-HHMMSS
```

It contains:

```text
01-front-hero.png
02-front-left.png
03-front-straight.png
04-right-side.png
05-left-side.png
zynora-floorplan-five-views.blend
manifest.json
```

## Final-quality test after the Eevee preview is approved

Do not start here. First verify the five Eevee previews. Then run:

```powershell
cd "Y:\YPS-Labs\zynora"

powershell -ExecutionPolicy Bypass -File `
    ".\backend\blender_renderer\run_zynora_floorplan.ps1" `
    -Engine cycles `
    -Quality final
```

Cycles uses more time and VRAM. The script renders sequentially to stay within
the RTX 3050's 4 GB memory.

## Important

If the output still looks like the old Phase 1 test house, you ran
`render_phase1_test.py`. Phase 3.1 must run `render_zynora_floorplan.py` through
`run_zynora_floorplan.ps1`.
