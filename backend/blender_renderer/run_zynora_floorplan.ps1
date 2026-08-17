param(
    [string]$InputJson = "",
    [ValidateSet("eevee", "cycles")]
    [string]$Engine = "eevee",
    [ValidateSet("preview", "final")]
    [string]$Quality = "preview",
    [ValidateSet("warm-modern", "graphite-white", "sandstone")]
    [string]$Style = "warm-modern"
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$renderer = Join-Path $PSScriptRoot "render_zynora_floorplan.py"

if (-not (Test-Path -LiteralPath $renderer)) {
    throw "Renderer was not found: $renderer"
}

$blender = "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe"

if (-not (Test-Path -LiteralPath $blender)) {
    $candidate = Get-ChildItem `
        "C:\Program Files\Blender Foundation" `
        -Filter "blender.exe" `
        -File `
        -Recurse `
        -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1

    if (-not $candidate) {
        throw "Blender was not found. Install Blender 4.5 LTS first."
    }

    $blender = $candidate.FullName
}

if (-not $InputJson) {
    $latestJson = Get-ChildItem `
        "$env:USERPROFILE\Downloads" `
        -Filter "zynora-floorplan*.json" `
        -File `
        -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestJson) {
        throw "No zynora-floorplan JSON was found in Downloads. Use Download FloorPlanJSON in ZYNORA first."
    }

    $InputJson = $latestJson.FullName
}

if (-not (Test-Path -LiteralPath $InputJson -PathType Leaf)) {
    throw "FloorPlanJSON was not found: $InputJson"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputDirectory = Join-Path $projectRoot "outputs\blender\phase3-1-$stamp"
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

Write-Host ""
Write-Host "=== ZYNORA BLENDER PHASE 3.1 ==="
Write-Host "Input:   $InputJson"
Write-Host "Engine:  $Engine"
Write-Host "Quality: $Quality"
Write-Host "Style:   $Style"
Write-Host "Output:  $outputDirectory"
Write-Host ""

& $blender `
    --background `
    --python-exit-code 1 `
    --python $renderer `
    -- `
    --input $InputJson `
    --output $outputDirectory `
    --engine $Engine `
    --quality $Quality `
    --style $Style

if ($LASTEXITCODE -ne 0) {
    throw "Blender returned exit code $LASTEXITCODE."
}

$images = Get-ChildItem `
    -LiteralPath $outputDirectory `
    -Filter "*.png" `
    -File |
    Sort-Object Name

Write-Host ""
Write-Host "=== CREATED FILES ==="
$images | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

if ($images.Count -ne 5) {
    throw "Expected five PNG files, but found $($images.Count)."
}

Start-Process -FilePath $images[0].FullName
Start-Process -FilePath $outputDirectory

Write-Host ""
Write-Host "ZYNORA_PHASE3_1_OK=$outputDirectory"
