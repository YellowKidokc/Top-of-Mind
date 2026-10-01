#!/usr/bin/env bash
# Top of Mind — install (first run) and start. Then use http://localhost:8000
set -euo pipefail
cd "$(dirname "$0")"

command -v python3 >/dev/null || { echo "Python 3 is not installed: https://www.python.org/downloads/"; exit 1; }
command -v npm >/dev/null || { echo "Node.js is not installed: https://nodejs.org/"; exit 1; }

[ -x .venv/bin/python ] || { echo "[1/4] Creating Python environment..."; python3 -m venv .venv; }
echo "[2/4] Installing hub packages..."
.venv/bin/python -m pip install -q --disable-pip-version-check -r hub/requirements.txt

if [ ! -f hub/.env ]; then
  cp hub/.env.example hub/.env
  echo "Created hub/.env — add your API keys there. The Echo lane works without any key."
fi

echo "[3/4] Building the app..."
( cd frontend/top-of-mind && { [ -d node_modules ] || npm install --no-audit --no-fund; } && npm run build )

echo "[4/4] Starting Top of Mind at http://localhost:8000  (Ctrl+C to stop)"
( sleep 3; (command -v open >/dev/null && open http://localhost:8000) || (command -v xdg-open >/dev/null && xdg-open http://localhost:8000) || true ) &
exec .venv/bin/python -m uvicorn hub.app:app --host 127.0.0.1 --port 8000
