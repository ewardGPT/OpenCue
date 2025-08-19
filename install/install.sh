#Linux and MacOS
#!/usr/bin/env bash
# OpenCue installer for Linux & macOS
# Usage: ./install.sh [--with-rag] [--pull-models] [--yes] [--quiet]
set -Eeuo pipefail

ROOT="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &>/dev/null && pwd )"
YES=0; WITH_RAG=0; PULL_MODELS=0; QUIET=0

for a in "$@"; do
  case "$a" in
    --with-rag) WITH_RAG=1 ;;
    --pull-models) PULL_MODELS=1 ;;
    --yes) YES=1 ;;
    --quiet) QUIET=1 ;;
    -h|--help)
      cat <<EOF
OpenCue installer (Linux & macOS)
Usage: ./install.sh [--with-rag] [--pull-models] [--yes] [--quiet]
EOF
      exit 0 ;;
  esac
done

say(){ [ "$QUIET" -eq 1 ] || printf "\033[1;36m[OpenCue]\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m[warn]\033[0m %s\n" "$*" >&2; }
err(){ printf "\033[1;31m[err]\033[0m %s\n" "$*" >&2; exit 1; }
have(){ command -v "$1" >/dev/null 2>&1; }

vernum(){ echo "$1" | sed 's/^v//' | awk -F. '{printf "%d %d %d\n",$1,$2,$3}'; }
ver_ge(){ local a b c x y z; read -r a b c<<<"$(vernum "$1")"; read -r x y z<<<"$(vernum "$2")"; ((a>x))||{((a==x))&&{((b>y))||{((b==y))&&((c>=z));};};}
confirm(){ [ "$YES" -eq 1 ] && return 0; read -r -p "$1 [y/N] " ans || true; [[ "$ans" =~ ^[Yy]$ ]]; }

os_id(){
  if [[ "$OSTYPE" == "darwin"* ]]; then echo "macos"; return; fi
  if [ -f /etc/os-release ]; then . /etc/os-release; echo "${ID:-linux}"; return; fi
  echo "linux"
}

try_install(){
  local pkgs=("$@") id; id="$(os_id)"
  if [ "$id" = "macos" ] && have brew; then
    say "brew install ${pkgs[*]}"; brew install "${pkgs[@]}"
  elif have apt-get; then
    sudo apt-get update -y && sudo apt-get install -y "${pkgs[@]}"
  elif have dnf; then
    sudo dnf install -y "${pkgs[@]}"
  elif have pacman; then
    sudo pacman -S --noconfirm "${pkgs[@]}"
  else
    warn "No supported package manager; install manually: ${pkgs[*]}"
  fi
}

cd "$ROOT"
say "Checking prerequisites…"

# Node 20+
have node || err "Node.js not found. Install Node 20+ https://nodejs.org/"
NV="$(node -v)"; ver_ge "$NV" "v20.0.0" || err "Need Node >=20 (found $NV)"
have npm || err "npm missing (install Node with npm)"

# Python 3.10+
have python3 || err "python3 not found. Install Python 3.10+"
PV="$(python3 -V 2>&1 | awk '{print $2}')"; ver_ge "$PV" "3.10.0" || err "Need Python >=3.10 (found $PV)"

# Tesseract OCR
if ! have tesseract; then
  warn "tesseract not found (required for OCR)."
  if confirm "Attempt to install tesseract now?"; then
    case "$(os_id)" in
      macos)
        have brew || err "Homebrew required on macOS: https://brew.sh"
        try_install tesseract ;;
      ubuntu|debian) try_install tesseract-ocr ;;
      fedora) try_install tesseract ;;
      arch) try_install tesseract ;;
      *) warn "Unknown distro. Install tesseract manually."; exit 1 ;;
    esac
  else err "Install tesseract and re-run."; fi
fi

# Ollama (optional)
if ! have ollama; then
  warn "ollama not found (recommended for local models). Install from https://ollama.com/ (optional)."
fi

# Docker if RAG
if [ "$WITH_RAG" -eq 1 ] && ! have docker; then
  err "Docker not found (needed for Qdrant). Install Docker and re-run with --with-rag."
fi

# Create configs
[ -f .env ] || { cp .env.example .env && say "Created .env"; }
[ -f server/router/router.config.json ] || { cp server/router/router.config.example.json server/router/router.config.json && say "Created router.config.json"; }

# Node deps
say "Installing Node dependencies…"
npm install

# Python venv + OCR deps
say "Creating venv & installing OCR deps…"
[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r services/ocr/requirements.txt
deactivate

# RAG optional
if [ "$WITH_RAG" -eq 1 ]; then
  say "Setting up RAG (Qdrant + service)…"
  docker compose up -d qdrant
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -r services/rag/requirements.txt
  deactivate
  if grep -q '^RAG_ENABLED=' .env; then
    sed -i.bak 's/^RAG_ENABLED=.*/RAG_ENABLED=true/' .env || true
  else
    printf "\nRAG_ENABLED=true\n" >> .env
  fi
fi

# Model pulls
if [ "$PULL_MODELS" -eq 1 ]; then
  if have ollama; then
    say "Pulling Ollama models (llama3.1:8b, qwen2.5:14b)…"
    ollama pull llama3.1:8b || true
    ollama pull qwen2.5:14b || true
  else
    warn "Skipping model pulls (ollama not installed)."
  fi
fi

say "✅ Install complete."

cat <<'EOS'

Next:
1) Start OCR service (new terminal):
   source .venv/bin/activate
   uvicorn services.ocr.app:app --port 8001 --reload

2) (Optional RAG) If enabled:
   source .venv/bin/activate
   uvicorn services.rag.app:app --port 8002 --reload

3) Run the app:
   npm run dev
   # Overlay hotkeys:
   #  • Ctrl/Cmd+B  toggle
   #  • Ctrl/Cmd+H  OCR
   #  • Ctrl/Cmd+Enter  send
EOS
