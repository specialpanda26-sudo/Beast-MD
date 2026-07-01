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

# If node exits, kill python too
kill $PYTHON_PID 2>/dev/null || true
