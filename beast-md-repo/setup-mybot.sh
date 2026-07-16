#!/bin/bash
# ============================================================
#  Shark Bot V6 — One-Time Setup
#  Run this ONCE from inside the shark-bot-v6 folder.
#  After it finishes, just type:  mybot
# ============================================================

set -e

BOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🦈 Shark Bot V6 — Setup Starting"
echo "📂 Bot folder: $BOT_DIR"
echo ""

# ── Step 1: System packages (no rust!) ──────────────────────
echo "📦 Step 1/5 — Installing system packages..."
pkg update -y
pkg install -y python nodejs git build-essential ffmpeg curl
echo "✅ System packages done"
echo ""

# ── Step 2: Python virtual environment ──────────────────────
echo "🐍 Step 2/5 — Setting up Python environment..."
cd "$BOT_DIR"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --prefer-binary -q
deactivate
echo "✅ Python dependencies installed"
echo ""

# ── Step 3: Node.js dependencies ────────────────────────────
echo "📦 Step 3/5 — Installing Node.js dependencies..."
npm install --silent --legacy-peer-deps
echo "✅ Node dependencies installed"
echo ""

# ── Step 4: .env file ───────────────────────────────────────
echo "🔑 Step 4/5 — Environment file..."
if [ ! -f "$BOT_DIR/.env" ]; then
  cp "$BOT_DIR/.env.example" "$BOT_DIR/.env"
  echo ""
  echo "  ⚠️  A .env file was created. Add your Groq API key:"
  echo "  nano $BOT_DIR/.env"
  echo ""
else
  echo "  ✅ .env already exists, skipping"
fi
echo ""

# ── Step 5: Register 'mybot' command ────────────────────────
echo "🔧 Step 5/5 — Registering 'mybot' command..."

MYBOT_BIN="$PREFIX/bin/mybot"

cat > "$MYBOT_BIN" << SCRIPT
#!/bin/bash
# mybot — starts Shark Bot V6
BOT_DIR="$BOT_DIR"
echo ""
echo "🦈 Starting Shark Bot..."
echo "📂 \$BOT_DIR"
echo ""
termux-wake-lock
cd "\$BOT_DIR"
bash start.sh
termux-wake-unlock
SCRIPT

chmod +x "$MYBOT_BIN"
echo "✅ 'mybot' command registered"
echo ""

# ── Done ────────────────────────────────────────────────────
echo "=============================================="
echo "✅  Setup complete!"
echo ""
echo "  From now on, just type:"
echo ""
echo "      mybot"
echo ""
echo "  to start your bot from anywhere in Termux."
echo ""
if [ ! -s "$BOT_DIR/.env" ] || grep -q "your_groq_api_key_here" "$BOT_DIR/.env" 2>/dev/null; then
  echo "  ⚠️  Don't forget to add your GROQ_API_KEY:"
  echo "      nano $BOT_DIR/.env"
  echo ""
fi
echo "=============================================="
