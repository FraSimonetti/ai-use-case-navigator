#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> RegolAI setup"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required" >&2
  exit 1
fi

VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "==> Creating Python virtual environment ($VENV_DIR)"
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "==> Installing backend dependencies"
pip install --upgrade pip
pip install -r services/api/requirements.txt

echo "==> Installing frontend dependencies"
(cd apps/web && npm install)

WEB_ENV_FILE="apps/web/.env.local"
if [ ! -f "$WEB_ENV_FILE" ]; then
  echo "==> Creating apps/web/.env.local"
  cat > "$WEB_ENV_FILE" <<'ENVEOF'
API_URL=http://127.0.0.1:8010
NEXT_PUBLIC_API_URL=http://127.0.0.1:8010
ENVEOF
else
  echo "==> Keeping existing apps/web/.env.local"
fi

echo
if [ -f "data/embeddings/embeddings.npy" ] && [ -f "data/embeddings/documents.json" ]; then
  echo "==> Vector database found in data/embeddings"
else
  echo "==> Vector database not found. Build it with:"
  echo "    python3 services/api/services/vector_store.py"
fi

echo
echo "Setup complete."
echo ""
echo "Start backend:"
echo "  source .venv/bin/activate && python3 -m uvicorn services.api.main:app --host 127.0.0.1 --port 8010"
echo ""
echo "Start frontend:"
echo "  cd apps/web && npm run dev -- --hostname 127.0.0.1 --port 3001"
