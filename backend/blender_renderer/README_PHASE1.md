# ZYNORA Blender renderer — Phase 1

This additive test does not replace the existing local AI renderer.

It creates a small procedural modern-house scene, saves the reusable Blender
scene, and produces a 1280×720 Eevee PNG. Its purpose is to verify automated
background rendering before the real ZYNORA GLB is connected.

Run from the ZYNORA project root in PowerShell:

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe"
$script = ".\backend\blender_renderer\render_phase1_test.py"

& $blender --background --python-exit-code 1 --python $script

Get-Item ".\outputs\blender\phase1-test.png"
Start-Process ".\outputs\blender\phase1-test.png"
```

Expected files:

- `outputs/blender/phase1-test.png`
- `outputs/blender/phase1-test.blend`
