# OpenCue (privacy-first live copilot)

OpenCue is a local-first, multi-AI copilot. It watches **the screen** on demand (OCR), routes to the right model (local via Ollama by default), and displays concise, actionable answers in an overlay.

## Features
- Overlay UI (Electron): hotkeys, ask box, OCR capture
- Multi-AI router: Ollama local, optional cloud providers
- Optional OCR service (FastAPI + Tesseract)
- Optional RAG (Qdrant + embeddings) — off by default

## Quick Start

### Prereqs
- Node.js 20+
- Python 3.10+
- Docker (for Qdrant, optional)
- **Ollama** running locally: https://ollama.com
  - Pull a model (example): `ollama pull llama3.1:8b`
- **Tesseract OCR** (for OCR service):
  - macOS: `brew install tesseract`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr`
  - Windows (choco): `choco install tesseract`

### (1) Install Raw
```bash
git clone https://github.com/ewardGPT/OpenCue.git
cd opencue
cp .env.example .env
cp server/router/router.config.example.json server/router/router.config.json
npm i
```

### (2) Install Windows
```bash
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\services\ocr\requirements.txt
uvicorn services.ocr.app:app --port 8001 --reload

```
### (2) Install Linux/MacOS
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/ocr/requirements.txt
uvicorn services.ocr.app:app --port 8001 --reload

```
### (3) Pull Local LLM 
```bash
ollama pull llama3.1:8b
# (optional stronger local)
ollama pull qwen2.5:14b
```

### (3) Enable Cloud (Optional)
```bash
#API Keys NEEDED
change ALLOW_CLOUD in .env to TRUE
```
### (4) Run OpenCue
```bash
npm run dev
```
