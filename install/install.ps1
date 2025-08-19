#Windows
param([switch]$WithRag = $false, [switch]$PullModels = $false)
$ErrorActionPreference = "Stop"
function Say($m){ Write-Host "[OpenCue] $m" -ForegroundColor Cyan }
function Warn($m){ Write-Warning $m }
function Die($m){ Write-Error $m; exit 1 }
function Have($c){ $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }

Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Node
$nodeV = (& node -v) 2>$null; if (-not $nodeV){ Die "Node.js not found. Install Node 20+ https://nodejs.org/" }
if ([version]$nodeV.Trim('v') -lt [version]"20.0.0"){ Die "Need Node >=20 (found $nodeV)" }

# Python
$py = if (Have "py"){"py"} elseif (Have "python"){"python"} else {$null}
if (-not $py){ Die "Python not found. Install Python 3.10+ https://python.org" }
$pyVer = & $py --version
if ([version]($pyVer -replace '[^\d\.]','') -lt [version]"3.10.0"){ Die "Need Python >=3.10 (found $pyVer)" }

# Tesseract
if (-not (Have "tesseract")){
  Warn "Tesseract not found. Installing via winget (or choco)…"
  if (Have "winget"){ winget install --id UB-Mannheim.TesseractOCR -e --accept-package-agreements --accept-source-agreements }
  elseif (Have "choco"){ choco install tesseract -y }
  else { Die "Install Tesseract and re-run (https://github.com/UB-Mannheim/tesseract/wiki)" }
}
$defaultTess = "C:\Program Files\Tesseract-OCR\tesseract.exe"
if (Test-Path $defaultTess){
  if (-not (Test-Path ".\.env")){ Copy-Item ".\.env.example" ".\.env" }
  $envContent = Get-Content .\.env
  if ($envContent -notmatch "^TESSERACT_CMD="){
    Add-Content .\.env "TESSERACT_CMD=$defaultTess"
  }
}

# Configs
if (-not (Test-Path ".\.env")){ Copy-Item ".\.env.example" ".\.env" }
if (-not (Test-Path ".\server\router\router.config.json")){
  Copy-Item ".\server\router\router.config.example.json" ".\server\router\router.config.json"
}

# Node deps
Say "Installing Node dependencies…"
npm install

# Python venv + OCR
Say "Creating venv & installing OCR deps…"
& $py -m venv .venv
& .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r .\services\ocr\requirements.txt
deactivate

# RAG optional
if ($WithRag){
  if (-not (Have "docker")){ Die "Docker not found. Install Docker Desktop and re-run with -WithRag." }
  Say "Starting Qdrant & installing RAG deps…"
  docker compose up -d qdrant
  & .\.venv\Scripts\Activate.ps1
  pip install -r .\services\rag\requirements.txt
  deactivate
  (Get-Content .\.env) -replace '^RAG_ENABLED=.*','RAG_ENABLED=true' | Set-Content .\.env
}

# Pull models
if ($PullModels){
  if (Have "ollama"){
    Say "Pulling Ollama models (llama3.1:8b, qwen2.5:14b)…"
    ollama pull llama3.1:8b
    ollama pull qwen2.5:14b
  } else { Warn "Ollama not found. Install from https://ollama.com/ (optional)." }
}

Say "✅ Install complete."

Write-Host @"
Next steps:

1) Start OCR service (new PowerShell):
   .\.venv\Scripts\Activate.ps1
   uvicorn services.ocr.app:app --port 8001 --reload

2) (Optional RAG) If enabled:
   .\.venv\Scripts\Activate.ps1
   uvicorn services.rag.app:app --port 8002 --reload

3) Run the app:
   npm run dev
   - Router :3001
   - Hotkeys: Ctrl+B (toggle), Ctrl+H (OCR), Ctrl+Enter (send)
"@
