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

# Use port 8000, or the next free one if something else already has it
PORT=$(.venv/bin/python - <<'PY'
import socket
for port in range(8000, 8021):
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", port))
            print(port)
            break
        except OSError:
            pass
PY
)
[ -n "$PORT" ] || { echo "No free port between 8000 and 8020."; exit 1; }
[ "$PORT" = 8000 ] || echo "Port 8000 is in use — using $PORT instead."

URL="http://localhost:$PORT"
echo "[4/4] Starting Top of Mind at $URL  (Ctrl+C to stop)"
( sleep 3; (command -v open >/dev/null && open "$URL") || (command -v xdg-open >/dev/null && xdg-open "$URL") || true ) &
exec .venv/bin/python -m uvicorn hub.app:app --host 127.0.0.1 --port "$PORT"
