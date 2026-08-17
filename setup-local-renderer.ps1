param(
    [switch]$SkipModelDownload
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDirectory = Join-Path $projectRoot "backend"
$baseRequirements = Join-Path $backendDirectory "requirements.txt"
$localRequirements = Join-Path $backendDirectory "requirements-local-renderer.txt"
$venvDirectory = Join-Path $backendDirectory "venv"
$venvPython = Join-Path $venvDirectory "Scripts\python.exe"

if (-not (Test-Path -LiteralPath $backendDirectory)) {
    throw "The backend folder was not found below $projectRoot"
}

if (-not (Test-Path -LiteralPath $baseRequirements)) {
    throw "backend\requirements.txt was not found. Extract this update into the ZYNORA project root."
}

if (-not (Test-Path -LiteralPath $localRequirements)) {
    throw "backend\requirements-local-renderer.txt was not found."
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    $systemPython = (Get-Command python -ErrorAction Stop).Source

    Write-Host "Creating backend virtual environment..."
    & $systemPython -m venv $venvDirectory

    if ($LASTEXITCODE -ne 0) {
        throw "Python could not create backend\venv."
    }
}

Write-Host "Updating pip..."
& $venvPython -m pip install --upgrade pip

if ($LASTEXITCODE -ne 0) {
    throw "pip upgrade failed."
}

Write-Host "Installing the existing ZYNORA backend requirements..."
& $venvPython -m pip install --timeout 1000 --retries 20 -r $baseRequirements

if ($LASTEXITCODE -ne 0) {
    throw "Backend requirement installation failed."
}

$cudaResult = & $venvPython -c "import importlib.util; spec=importlib.util.find_spec('torch'); print('CUDA_READY' if spec and __import__('torch').cuda.is_available() else 'CUDA_MISSING')" 2>$null
$cudaState = $cudaResult | Select-Object -Last 1

if ($cudaState -ne "CUDA_READY") {
    Write-Host "Installing the CUDA-enabled PyTorch build. This is a large download..."
    & $venvPython -m pip install `
        --upgrade `
        --force-reinstall `
        --timeout 1000 `
        --retries 20 `
        torch==2.12.1 `
        torchvision==0.27.1 `
        --index-url https://download.pytorch.org/whl/cu130

    if ($LASTEXITCODE -ne 0) {
        throw "CUDA PyTorch installation failed. Check Ethernet and rerun this same script."
    }
}

Write-Host "Installing Diffusers and ControlNet support..."
& $venvPython -m pip install `
    --timeout 1000 `
    --retries 20 `
    -r $localRequirements

if ($LASTEXITCODE -ne 0) {
    throw "Local renderer package installation failed."
}

Write-Host "Checking the RTX/CUDA environment..."
& $venvPython (Join-Path $backendDirectory "scripts\check_local_renderer.py")

if ($LASTEXITCODE -ne 0) {
    throw "The local renderer environment check failed."
}

if (-not $SkipModelDownload) {
    Write-Host "Preparing the local image models. This downloads several GB once..."
    & $venvPython (Join-Path $backendDirectory "scripts\download_local_renderer_models.py")

    if ($LASTEXITCODE -ne 0) {
        throw "Model preparation failed. Fix the connection and rerun this same script; cached files are reused."
    }
}

Write-Host ""
Write-Host "ZYNORA local renderer setup completed successfully."
Write-Host "Start the backend with:"
Write-Host ".\backend\venv\Scripts\python.exe -m uvicorn app:app --reload --app-dir .\backend"
