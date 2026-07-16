#!/bin/bash
set -e

# Use the project virtual environment if one was created (Setup Step 2 /
# Termux instructions: `python -m venv .venv`). Falls back to system python3
# so this still works if you didn't bother with a venv.
if [ -f ".venv/bin/python3" ]; then
  PYTHON_BIN="./.venv/bin/python3"
  echo "🐍 Using virtual environment: .venv"
else
  PYTHON_BIN="python3"
fi

# ── PO Token provider (YouTube bot-detection hardening) ────────────────────
# ✅ NEW: started before everything else since app.py/media.js's yt-dlp
# calls both talk to it. Purely optional/best-effort — if it's disabled, not
# built (e.g. a non-Docker/local dev run that skipped the Dockerfile's git
# clone step), or fails to come up, the bot still boots normally and yt-dlp
# just falls back to its existing client-order + cookies mitigation.
POT_PROVIDER_PORT="${POT_PROVIDER_PORT:-4416}"
POT_PID=""
if [ "${POT_PROVIDER_ENABLED:-true}" != "false" ] && [ -f "/opt/bgutil-pot-provider/server/build/main.js" ]; then
  echo "🔑 Starting PO Token provider on port $POT_PROVIDER_PORT..."
  node /opt/bgutil-pot-provider/server/build/main.js --port "$POT_PROVIDER_PORT" &
  POT_PID=$!
  for i in $(seq 1 10); do
    if curl -sf "http://127.0.0.1:${POT_PROVIDER_PORT}/ping" > /dev/null 2>&1; then
      echo "✅ PO Token provider ready!"
      break
    fi
    sleep 1
  done
else
  echo "⏭️  PO Token provider disabled or not built here — downloads will fall back to cookies-only mitigation."
fi

echo "🐍 Starting Python backend..."
"$PYTHON_BIN" app.py &
PYTHON_PID=$!

BACKEND_PORT="${PORT:-5000}"

# Wait for Python backend to be ready
echo "⏳ Waiting for Python backend on port $BACKEND_PORT..."
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/status" > /dev/null 2>&1; then
    echo "✅ Python backend ready!"
    break
  fi
  sleep 1
done

echo "🦈 Starting Shark Bot (Node.js)..."

# Keep-alive ping every 10 minutes to prevent Render free tier sleep
if [ -n "$RENDER_EXTERNAL_URL" ]; then
  (while true; do
    sleep 600
    curl -s "$RENDER_EXTERNAL_URL/status" > /dev/null 2>&1
  done) &
  echo "⚡ Keep-alive ping active → $RENDER_EXTERNAL_URL"
fi

node client_bridge.js

# If node exits, kill python and the PO Token provider too
kill $PYTHON_PID 2>/dev/null || true
[ -n "$POT_PID" ] && kill $POT_PID 2>/dev/null || true
