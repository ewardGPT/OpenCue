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

### Install
```bash
git clone <your_repo_url> opencue
cd opencue
cp .env.example .env
cp server/router/router.config.example.json server/router/router.config.json
npm i
