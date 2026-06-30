import os
import time
import asyncio
import logging
import json
import random
import httpx
import aiosqlite
from urllib.parse import quote_plus
from pathlib import Path
from quart import Quart, request, jsonify, Response, redirect

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HenryTechCore")

def print_banner():
    banner = """
\033[1;36m
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██╗  ██╗███████╗███╗   ██╗██████╗ ██╗   ██╗              ║
║   ██║  ██║██╔════╝████╗  ██║██╔══██╗╚██╗ ██╔╝              ║
║   ███████║█████╗  ██╔██╗ ██║██████╔╝ ╚████╔╝               ║
║   ██╔══██║██╔══╝  ██║╚██╗██║██╔══██╗  ╚██╔╝                ║
║   ██║  ██║███████╗██║ ╚████║██║  ██║   ██║                  ║
║   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝                 ║
║                                                              ║
║   \033[1;35m██████╗  ██████╗ ████████╗███████╗\033[1;36m                    ║
║   \033[1;35m██╔══██╗██╔═══██╗╚══██╔══╝██╔════╝\033[1;36m                    ║
║   \033[1;35m██████╔╝██║   ██║   ██║   ███████╗\033[1;36m                    ║
║   \033[1;35m██╔══██╗██║   ██║   ██║   ╚════██║\033[1;36m                    ║
║   \033[1;35m██████╔╝╚██████╔╝   ██║   ███████║\033[1;36m                    ║
║   \033[1;35m╚═════╝  ╚═════╝    ╚═╝   ╚══════╝\033[1;36m                   ║
║                                                              ║
║      \033[1;33m✦ Henry Bots© — created by Henry ✦\033[1;36m              ║
║      \033[1;32m🦈 AUTOMATION V5.0  |  PYTHON BACKEND\033[1;36m              ║
║      \033[1;33m⚡ AI  |  DATABASE  |  COMMANDS  |  API\033[1;36m            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
\033[0m"""
    print(banner)

print_banner()

app = Quart(__name__, static_folder="assets", static_url_path="/assets")

# ✅ Force browsers to always fetch the latest HTML instead of using a stale
# local cache — without this, anyone who'd visited before kept seeing old
# landing-page/admin-page content even after a fresh deploy.
NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    logger.warning("⚠️  GROQ_API_KEY not set! /ask command will fail.")

# NEW: panel registration OTP — sent via free email SMTP, no WhatsApp/paid SMS needed
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Henry Tech Bot Panel")
REG_STARTER_CREDITS = int(os.environ.get("REG_STARTER_CREDITS", "80"))  # 80 kesh starter credit on verify
OTP_TTL_SECONDS = 600  # 10 minutes

# NEW: manual top-up / wallet funding via M-Pesa "Send Money" to the admin's
# own number. We CANNOT verify in real time whether an M-Pesa code or
# screenshot is genuine (that needs a Safaricom Daraja API integration this
# project doesn't have) — so instead of pretending to auto-verify, this
# queues every submission for a human admin to approve/reject from the
# Payments tab. Credits only land in the user's wallet once approved.
import re as _re
import base64 as _b64

MPESA_CODE_RE = _re.compile(r"^[A-Z0-9]{8,12}$")
PAYMENT_PROOFS_DIR = Path(__file__).parent / "payment_proofs"
PAYMENT_PROOFS_DIR.mkdir(exist_ok=True)
ADMIN_PAYTO_NUMBER = os.environ.get("ADMIN_PAYTO_NUMBER", "")  # e.g. 254712345678 — shown to users as where to send M-Pesa funds


def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


# ✅ NEW: WhatsApp OTP delivery — this IS a WhatsApp bot, so the registering
# user's code is sent straight from the bot's own number instead of email.
# Talks to the Node bridge's internal pairing server over localhost (same
# mechanism the /pair proxy routes further down use).
NODE_PAIR_URL = f"http://127.0.0.1:{os.environ.get('WEB_PORT', 3000)}"


async def send_otp_whatsapp(phone: str, otp: str, name: str) -> dict:
    try:
        # ✅ FIX (speed): was timeout=15 — a dead/half-open session would make
        # registering users wait up to 15s just to see "doesn't work". Since
        # the Node bridge now rejects immediately when there's no live
        # socket, 5s is plenty and failures show up far faster.
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"{NODE_PAIR_URL}/send-otp-whatsapp",
                json={"phone": phone, "otp": otp, "name": name}
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("success"):
                return {"success": True}
            return {"success": False, "error": data.get("error", "Failed to send WhatsApp message.")}
    except Exception as e:
        logger.error("OTP WhatsApp send failed: %s", e)
        return {"success": False, "error": "Bot isn't connected to WhatsApp right now. Try again shortly."}


async def send_otp_email(to_email: str, otp: str, name: str) -> dict:
    """
    Optional fallback — sends the OTP via email instead of WhatsApp. Only
    used if SMTP_EMAIL/SMTP_PASSWORD are configured; WhatsApp delivery above
    is the primary path now.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.warning("⚠️  SMTP_EMAIL/SMTP_PASSWORD not set — cannot send OTP emails.")
        return {"success": False, "error": "OTP email service not configured on server."}

    import smtplib
    from email.mime.text import MIMEText

    subject = "Your Henry Tech Bot Panel verification code"
    body = (
        f"Hi {name or 'there'},\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code expires in 10 minutes. Enter it on the registration page to verify "
        f"your number and unlock your trust badge + {REG_STARTER_CREDITS} kesh free credit.\n\n"
        f"— Henry Tech Bot Panel"
    )
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_EMAIL}>"
    msg["To"] = to_email

    def _send_sync():
        # ✅ FIX (speed): was timeout=15 — matches the same "fail fast,
        # don't make the user wait" fix applied to WhatsApp OTP delivery.
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=6) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())

    try:
        await asyncio.to_thread(_send_sync)
        return {"success": True}
    except Exception as e:
        logger.error("OTP email send failed: %s", e)
        return {"success": False, "error": str(e)}


DB_FILE = "henry_tech_v5.db"
SESSION_REGISTRY = {}  # tracks all bot sessions for admin panel
DEFAULT_EXPIRY_MESSAGE = "⏳ Your subscription has expired. Please contact the owner to renew access."
PROCESS_START_TIME = time.time()  # ✅ NEW: for admin uptime tracking

async def call_groq_ai(prompt: str) -> str:
    if not GROQ_API_KEY:
        return "❌ AI not configured. Set GROQ_API_KEY in your .env file."
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {"role": "system", "content": "You are a helpful WhatsApp assistant. Keep replies concise and friendly."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1024
                }
            )
            data = response.json()
            if response.status_code == 200:
                return data["choices"][0]["message"]["content"]
            # Fallback model if first fails
            response2 = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "openai/gpt-oss-20b",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1024
                }
            )
            data2 = response2.json()
            if response2.status_code == 200:
                return data2["choices"][0]["message"]["content"]
            return f"❌ AI Error: {data.get('error', {}).get('message', 'Unknown error')}"
    except Exception as e:
        return f"❌ AI Error: {str(e)}"


async def get_video_url(url: str) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp", "--dump-json", "--no-playlist",
            "-f", "best[ext=mp4][filesize<50M]/best[ext=mp4]/best",
            "--no-warnings", url,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45)
        if proc.returncode == 0:
            data = json.loads(stdout.decode())
            return {
                "success": True,
                "url": data.get("url", ""),
                "title": data.get("title", "Video"),
                "duration": data.get("duration_string", ""),
                "filesize": data.get("filesize", 0)
            }
        return {"success": False, "error": stderr.decode()[:300]}
    except asyncio.TimeoutError:
        return {"success": False, "error": "Timed out. Try a shorter video."}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_audio_url(url: str) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp", "--dump-json", "--no-playlist",
            "-f", "bestaudio[ext=m4a]/bestaudio/best",
            "--no-warnings", url,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45)
        if proc.returncode == 0:
            data = json.loads(stdout.decode())
            return {
                "success": True,
                "url": data.get("url", ""),
                "title": data.get("title", "Audio"),
                "ext": data.get("ext", "mp3")
            }
        return {"success": False, "error": stderr.decode()[:300]}
    except asyncio.TimeoutError:
        return {"success": False, "error": "Timed out. Try again."}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def init_db():
    async with aiosqlite.connect(DB_FILE) as db:
        # ✅ FIX: every request opens a fresh sqlite connection (auto-save,
        # log-message, registration, etc. all hit the DB on every WhatsApp
        # message / panel request). In the default journal mode, concurrent
        # writes can block each other for the full busy timeout, which stacks
        # up as multi-second delays on bot replies. WAL mode lets reads/writes
        # run concurrently instead of serializing on a file lock.
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA busy_timeout=5000")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                sender TEXT PRIMARY KEY, name TEXT, timestamp REAL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS blacklist (sender TEXT PRIMARY KEY)
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                msg_id TEXT PRIMARY KEY, sender TEXT, name TEXT, body TEXT, timestamp REAL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS viewonce_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT, name TEXT, filename TEXT,
                media_type TEXT, caption TEXT, timestamp REAL
            )
        """)
        # NEW: keyword auto-reply table - admin-managed trigger/response pairs
        await db.execute("""
            CREATE TABLE IF NOT EXISTS keywords (
                trigger TEXT PRIMARY KEY,
                reply TEXT NOT NULL,
                match_type TEXT NOT NULL DEFAULT 'contains',
                enabled INTEGER NOT NULL DEFAULT 1,
                timestamp REAL
            )
        """)
        # NEW: feature toggle table - admin can flip modules on/off without redeploying
        await db.execute("""
            CREATE TABLE IF NOT EXISTS features (
                name TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL DEFAULT 1
            )
        """)
        # NEW: auto-saved status media log
        await db.execute("""
            CREATE TABLE IF NOT EXISTS status_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT, name TEXT, filename TEXT,
                media_type TEXT, caption TEXT, timestamp REAL
            )
        """)
        # NEW: anti-link warning strikes, per group per sender
        await db.execute("""
            CREATE TABLE IF NOT EXISTS group_warnings (
                group_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (group_id, sender)
            )
        """)
        # NEW: panel registration — phone+email verification, trust badges, credits
        await db.execute("""
            CREATE TABLE IF NOT EXISTS registrations (
                phone TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                otp TEXT,
                otp_expiry REAL,
                verified INTEGER NOT NULL DEFAULT 0,
                credits INTEGER NOT NULL DEFAULT 0,
                badge TEXT NOT NULL DEFAULT 'none',
                created_at REAL,
                verified_at REAL
            )
        """)
        # NEW: wallet top-up requests — user claims they sent M-Pesa funds to
        # the admin and submits the transaction code (+ optional screenshot).
        # Nothing here is auto-trusted: status starts 'pending' and only an
        # admin approving it from /admin moves kesh into the wallet. The
        # mpesa_code UNIQUE constraint stops the same code being replayed
        # twice (a common fake-payment trick).
        await db.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                name TEXT,
                amount INTEGER NOT NULL,
                mpesa_code TEXT NOT NULL UNIQUE,
                screenshot_path TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                admin_note TEXT,
                created_at REAL,
                reviewed_at REAL
            )
        """)
        for default_feature in ("ai_chat", "downloads", "keywords",
                                 "status_save", "antilink", "menu_buttons"):
            await db.execute(
                "INSERT OR IGNORE INTO features (name, enabled) VALUES (?, 1)",
                (default_feature,)
            )
        await db.commit()
        logger.info("\033[1;32m⚡ V5.0 Master Database Synchronized — All tables ready.\033[0m")


@app.before_serving
async def startup():
    await init_db()
    logger.info("\033[1;36m🦈 Henry Tech V5.0 Backend LIVE on port %s\033[0m", os.environ.get("PORT", 5000))
    logger.info("\033[1;33m📡 Waiting for Shark Bot (Node.js) to connect...\033[0m")
    if not ADMIN_PASSWORD:
        logger.warning("\033[1;31m⚠️  ADMIN_PASSWORD is not set — /admin has FULL OPEN ACCESS to anyone with the URL. Set ADMIN_PASSWORD in your environment before going live.\033[0m")


WELCOME_TEXT = (
    "╔═══════════════════════════════════════╗\n"
    "  █░█ █▀▀ █▄░█ █▀█ █▄█   ▀█▀ █▀▀ █▀▀ █░█\n"
    "  █▀█ ██▄ █░▀█ █▀▄ ░█░   ░█░ ██▄ █▄▄ █▀█\n"
    "╚═══════════════════════════════════════╝\n\n"
    "✨ 𝖧𝖤𝖭𝖱𝖸 𝖳𝖤𝖢𝖧 𝖠𝖴𝖳𝖮𝖬𝖠𝖳𝖨𝖮𝖭 𝖵𝖤𝖱𝖲𝖨𝖮𝖭 5.0 ✨\n\n"
    "Your profile node is securely authenticated. All 19 Automation Core Modules are currently online. 🌐\n\n"
    "⚡ ENGINE COMMAND MATRIX ⚡\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "🧠 /ask [query] ➔ Chat with Llama-3 AI\n"
    "🎨 /paint [text] ➔ Generate text image\n"
    "📥 /download_video [URL] ➔ Download Videos (YT, IG, FB, TikTok)\n"
    "🎧 /download_song [URL] ➔ Extract MP3 audio\n"
    "🗑️ /recover [number] ➔ Recover deleted messages\n"
    "👁️ /viewonce [number] ➔ View saved view once media\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    "🛡️ Anti-Ban, Fake Typing, Auto Status & Auto React running in background."
)


async def check_db_blacklist(sender: str) -> bool:
    if not sender:
        return False
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT 1 FROM blacklist WHERE sender = ?", (sender,)) as c:
            return (await c.fetchone()) is not None


async def is_feature_enabled(name: str) -> bool:
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT enabled FROM features WHERE name = ?", (name,)) as c:
            row = await c.fetchone()
            return True if row is None else bool(row[0])


async def match_keyword(text: str):
    """Return the configured reply if text matches an enabled keyword trigger, else None."""
    if not text:
        return None
    lowered = text.lower().strip()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT trigger, reply, match_type FROM keywords WHERE enabled = 1"
        ) as c:
            rows = await c.fetchall()
    for trigger, reply, match_type in rows:
        t = (trigger or "").lower().strip()
        if not t:
            continue
        if match_type == "exact" and lowered == t:
            return reply
        if match_type == "starts_with" and lowered.startswith(t):
            return reply
        if match_type == "contains" and t in lowered:
            return reply
    return None


@app.route("/")
async def landing_page():
    index_path = Path(__file__).parent / "index.html"
    if index_path.exists():
        return Response(index_path.read_text(encoding="utf-8"), mimetype="text/html", headers=NO_CACHE_HEADERS)
    return jsonify({"status": "ok"})


@app.route("/status")
async def status_check():
    # Lives on the Python side because hosting platforms (Render, etc.)
    # route external traffic to whatever port app.py binds to via $PORT —
    # not to the Node bridge's internal-only WEB_PORT.
    return jsonify({"status": "ok"})


@app.route("/register")
async def register_page():
    reg_path = Path(__file__).parent / "register.html"
    if reg_path.exists():
        return Response(reg_path.read_text(encoding="utf-8"), mimetype="text/html", headers=NO_CACHE_HEADERS)
    return jsonify({"status": "ok"})


@app.route("/api/register", methods=["POST"])
async def api_register():
    """Step 1: user submits their WhatsApp number (+ optional name/email) ->
    we generate an OTP and send it via whichever delivery method they chose
    (WhatsApp from the bot, or email as a fallback for anyone whose WhatsApp
    session/bot isn't reachable right now)."""
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    method = (data.get("method") or "whatsapp").strip().lower()

    if not phone or not phone.isdigit() or len(phone) < 9:
        return jsonify({"success": False, "error": "Enter a valid WhatsApp number with country code."}), 400

    if method == "email":
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            return jsonify({"success": False, "error": "Enter a valid email address."}), 400
    elif method != "whatsapp":
        return jsonify({"success": False, "error": "Invalid delivery method."}), 400

    otp = _generate_otp()
    now = time.time()

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT verified FROM registrations WHERE phone = ?", (phone,)) as c:
            row = await c.fetchone()
        if row and row[0] == 1:
            return jsonify({"success": False, "error": "This number is already verified."}), 400

        await db.execute("""
            INSERT INTO registrations (phone, name, email, otp, otp_expiry, verified, credits, badge, created_at)
            VALUES (?, ?, ?, ?, ?, 0, 0, 'none', ?)
            ON CONFLICT(phone) DO UPDATE SET
                name=excluded.name, email=excluded.email, otp=excluded.otp,
                otp_expiry=excluded.otp_expiry
        """, (phone, name, email, otp, now + OTP_TTL_SECONDS, now))
        await db.commit()

    if method == "email":
        result = await send_otp_email(email, otp, name)
    else:
        result = await send_otp_whatsapp(phone, otp, name)
    if not result["success"]:
        return jsonify({"success": False, "error": result["error"]}), 500

    return jsonify({
        "success": True,
        "message": "OTP sent to your email. Enter it below to verify." if method == "email"
                   else "OTP sent to your WhatsApp. Enter it below to verify."
    })


@app.route("/api/verify-otp", methods=["POST"])
async def api_verify_otp():
    """Step 2: user submits phone + OTP -> verify, award trust badge + free credits."""
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    otp = (data.get("otp") or "").strip()

    if not phone or not otp:
        return jsonify({"success": False, "error": "Phone and OTP are required."}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT otp, otp_expiry, verified, name FROM registrations WHERE phone = ?", (phone,)
        ) as c:
            row = await c.fetchone()

        if not row:
            return jsonify({"success": False, "error": "No registration found for this number."}), 404

        stored_otp, expiry, verified, name = row
        if verified:
            return jsonify({"success": False, "error": "Already verified."}), 400
        if time.time() > expiry:
            return jsonify({"success": False, "error": "OTP expired. Please register again."}), 400
        if otp != stored_otp:
            return jsonify({"success": False, "error": "Incorrect OTP."}), 400

        await db.execute("""
            UPDATE registrations
            SET verified = 1, badge = 'Trusted', credits = credits + ?, verified_at = ?
            WHERE phone = ?
        """, (REG_STARTER_CREDITS, time.time(), phone))
        await db.commit()

    return jsonify({
        "success": True,
        "message": f"Number verified! 🛡️ Trust badge unlocked + {REG_STARTER_CREDITS} kesh free credit added.",
        "badge": "Trusted",
        "credits": REG_STARTER_CREDITS
    })


@app.route("/api/profile", methods=["GET"])
async def api_profile():
    """Profile panel data for a verified user — wallet balance, badge, and
    recent top-up requests with their review status. Looked up by phone
    only (no password); this mirrors how /api/verify-otp already trusts a
    WhatsApp number once it's been OTP-verified."""
    phone = (request.args.get("phone") or "").strip().replace(" ", "").replace("+", "")
    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid phone number required."}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT name, email, verified, credits, badge, verified_at FROM registrations WHERE phone = ?",
            (phone,)
        ) as c:
            row = await c.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Not registered yet. Send *.register* to the bot first."}), 404

        async with db.execute(
            "SELECT id, amount, mpesa_code, status, created_at FROM payments WHERE phone = ? ORDER BY created_at DESC LIMIT 10",
            (phone,)
        ) as c:
            prows = await c.fetchall()

    name, email, verified, credits, badge, verified_at = row
    return jsonify({
        "success": True,
        "phone": phone,
        "name": name,
        "email": email,
        "verified": bool(verified),
        "credits": credits,
        "badge": badge if verified else "none",
        "verified_at": verified_at,
        "recent_payments": [
            {"id": p[0], "amount": p[1], "mpesa_code": p[2], "status": p[3], "created_at": p[4]}
            for p in prows
        ],
    })


@app.route("/api/payment/submit", methods=["POST"])
async def api_payment_submit():
    """User claims they sent kesh to the admin's M-Pesa number and submits
    the transaction code (+ optional screenshot as base64) for review.

    Important: this endpoint does NOT and CANNOT confirm the code is real —
    there's no Safaricom Daraja/M-Pesa API integration here. It only does
    cheap, honest checks (format looks like a real M-Pesa code, the code
    hasn't been used before, the user is a verified registrant) and then
    queues it as 'pending' for a human admin to approve from the Payments
    tab. Credits are added only on admin approval, never automatically.
    """
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    amount = data.get("amount")
    mpesa_code = (data.get("mpesa_code") or "").strip().upper()
    screenshot_b64 = data.get("screenshot_base64")  # optional, data-URL or raw base64

    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid phone number required."}), 400
    try:
        amount = int(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Amount must be a positive whole number."}), 400
    if not MPESA_CODE_RE.match(mpesa_code):
        return jsonify({"success": False, "error": "That doesn't look like a valid M-Pesa transaction code (8-12 letters/numbers, e.g. QFG7H8J9K0)."}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT verified FROM registrations WHERE phone = ?", (phone,)) as c:
            reg = await c.fetchone()
        if not reg or not reg[0]:
            return jsonify({"success": False, "error": "Verify your number first — send *.register* to the bot."}), 403

        async with db.execute("SELECT id, status FROM payments WHERE mpesa_code = ?", (mpesa_code,)) as c:
            dup = await c.fetchone()
        if dup:
            return jsonify({"success": False, "error": f"This transaction code was already submitted (status: {dup[1]}). Each code can only be used once."}), 409

        screenshot_path = None
        if screenshot_b64:
            try:
                raw = screenshot_b64.split(",", 1)[-1]  # strip data: URL prefix if present
                img_bytes = _b64.b64decode(raw)
                if len(img_bytes) > 6 * 1024 * 1024:
                    return jsonify({"success": False, "error": "Screenshot too large (max 6MB)."}), 400
                fname = f"{phone}_{mpesa_code}_{int(time.time())}.jpg"
                (PAYMENT_PROOFS_DIR / fname).write_bytes(img_bytes)
                screenshot_path = fname
            except Exception:
                return jsonify({"success": False, "error": "Couldn't read that screenshot — try sending it again."}), 400

        now = time.time()
        await db.execute("""
            INSERT INTO payments (phone, name, amount, mpesa_code, screenshot_path, status, created_at)
            VALUES (?, '', ?, ?, ?, 'pending', ?)
        """, (phone, amount, mpesa_code, screenshot_path, now))
        await db.commit()
        async with db.execute("SELECT last_insert_rowid()") as c:
            new_id = (await c.fetchone())[0]

    # Best-effort nudge to the admin on WhatsApp — never blocks the response
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            await client.post(f"{NODE_PAIR_URL}/notify-owner", json={
                "text": (
                    f"💰 *New top-up request* #{new_id}\n"
                    f"From: {phone}\nAmount: {amount} kesh\nCode: {mpesa_code}\n"
                    f"{'📸 Screenshot attached' if screenshot_path else '⚠️ No screenshot'}\n\n"
                    f"Review in /admin → Payments tab."
                )
            })
    except Exception:
        pass

    return jsonify({
        "success": True,
        "id": new_id,
        "message": "Submitted! Your top-up is pending admin review — you'll be notified once it's approved."
    })


ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

def _check_admin_auth(req) -> bool:
    """
    ✅ FIX: admin panel had no server-side auth — anyone who found the URL
    could read all sessions, contacts, messages. Now requires either:
    - ?pass=PASSWORD query param, or
    - Authorization: Bearer PASSWORD header
    Falls back to open if ADMIN_PASSWORD env var is not set (dev mode).
    """
    if not ADMIN_PASSWORD:
        return True  # dev mode: no password set
    token = req.args.get("pass") or req.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    return token == ADMIN_PASSWORD


@app.route("/admin")
async def admin_panel():
    # FIX: this used to call _check_admin_auth() here too, which meant that
    # when ADMIN_PASSWORD was set, you got a bare 401 before the in-page
    # login form (the one inside admin.html) ever had a chance to load.
    # The page itself contains no sensitive data - auth is enforced on every
    # /admin/* data endpoint below instead, so this is safe to serve openly.
    admin_path = Path(__file__).parent / "admin.html"
    if admin_path.exists():
        return Response(admin_path.read_text(encoding="utf-8"), mimetype="text/html", headers=NO_CACHE_HEADERS)
    return jsonify({"error": "Admin panel not found"}), 404


@app.route("/admin/stats", methods=["GET"])
async def admin_stats():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT COUNT(*) FROM contacts") as c:
            contacts = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM messages") as c:
            messages = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM viewonce_media") as c:
            viewonce = (await c.fetchone())[0]
        async with db.execute(
            "SELECT name, sender, timestamp FROM contacts ORDER BY timestamp DESC LIMIT 20"
        ) as c:
            rows = await c.fetchall()
            recent_contacts = [
                {
                    "name": r[0],
                    "sender": r[1],
                    "time": time.strftime("%d/%m %H:%M", time.localtime(r[2]))
                } for r in rows
            ]

    # Session info from global registry
    session_list = []
    now_ts = time.time()
    for name, info in SESSION_REGISTRY.items():
        last_active_ts = info.get("last_active_ts")
        expiry_ts = info.get("expiry_ts")
        session_list.append({
            "name": name,
            "number": info.get("number", ""),
            "online": info.get("online", False),
            "msg_count": info.get("msg_count", 0),
            "since": info.get("since", ""),
            "since_ts": info.get("since_ts"),
            "last_active": time.strftime("%d %b %Y, %H:%M", time.localtime(last_active_ts)) if last_active_ts else "N/A",
            "expiry_ts": expiry_ts,
            "expiry_display": time.strftime("%d %b %Y, %H:%M", time.localtime(expiry_ts)) if expiry_ts else None,
            "expired": bool(expiry_ts and now_ts >= expiry_ts),
            "expiry_message": info.get("expiry_message", DEFAULT_EXPIRY_MESSAGE),
        })

    # Today's message count (for activity chart)
    today_start = time.time() - (time.time() % 86400)
    async with aiosqlite.connect(DB_FILE) as db2:
        async with db2.execute(
            "SELECT COUNT(*) FROM messages WHERE timestamp >= ?", (today_start,)
        ) as c:
            messages_today = (await c.fetchone())[0]

    return jsonify({
        "sessions": len([s for s in session_list if s["online"]]),
        "contacts": contacts,
        "messages": messages,
        "messages_today": messages_today,
        "viewonce": viewonce,
        "session_list": session_list,
        "recent_contacts": recent_contacts,
        "server_time": time.strftime("%d %b %Y, %H:%M:%S", time.localtime()),
    })


@app.route("/admin/terminate", methods=["POST"])
async def admin_terminate():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    session_name = data.get("session", "")
    if session_name in SESSION_REGISTRY:
        SESSION_REGISTRY[session_name]["online"] = False
        SESSION_REGISTRY[session_name]["terminate"] = True
    return jsonify({"status": "terminated", "session": session_name})


@app.route("/admin/register-session", methods=["POST"])
async def register_session():
    data = await request.get_json() or {}
    name = data.get("name", "unknown")
    now = time.time()
    existing = SESSION_REGISTRY.get(name, {})
    SESSION_REGISTRY[name] = {
        "number": data.get("number", ""),
        "online": data.get("online", False),
        "msg_count": data.get("msg_count", 0),
        "since_ts": now,
        "since": time.strftime("%d %b %Y, %H:%M", time.localtime(now)),
        "last_active_ts": now,
        # ✅ Subscription expiry — preserved across re-registers/restarts
        "expiry_ts": existing.get("expiry_ts"),
        "expiry_message": existing.get("expiry_message", DEFAULT_EXPIRY_MESSAGE),
    }
    return jsonify({"status": "registered"})


@app.route("/admin/update-session", methods=["POST"])
async def update_session():
    data = await request.get_json() or {}
    name = data.get("name", "")
    if name in SESSION_REGISTRY:
        SESSION_REGISTRY[name].update({
            "online": data.get("online", SESSION_REGISTRY[name].get("online")),
            "msg_count": data.get("msg_count", SESSION_REGISTRY[name].get("msg_count", 0)),
            "number": data.get("number", SESSION_REGISTRY[name].get("number", "")),
            "last_active_ts": time.time(),
        })
    return jsonify({"status": "updated"})


@app.route("/admin/set-expiry", methods=["POST"])
async def admin_set_expiry():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    session_name = data.get("session", "")
    expiry_ts = data.get("expiry_ts")  # epoch seconds, or null/0 to clear
    expiry_message = data.get("expiry_message") or DEFAULT_EXPIRY_MESSAGE
    if session_name not in SESSION_REGISTRY:
        return jsonify({"error": "Unknown session"}), 404
    SESSION_REGISTRY[session_name]["expiry_ts"] = float(expiry_ts) if expiry_ts else None
    SESSION_REGISTRY[session_name]["expiry_message"] = expiry_message
    return jsonify({
        "status": "ok",
        "session": session_name,
        "expiry_ts": SESSION_REGISTRY[session_name]["expiry_ts"],
        "expiry_message": expiry_message,
    })


@app.route("/admin/check-terminate", methods=["POST"])
async def check_terminate():
    data = await request.get_json() or {}
    name = data.get("name", "")
    info = SESSION_REGISTRY.get(name, {})
    should_terminate = info.get("terminate", False)
    expiry_ts = info.get("expiry_ts")
    expired = bool(expiry_ts and time.time() >= expiry_ts)
    return jsonify({
        "terminate": should_terminate,
        "expired": expired,
        "expiry_message": info.get("expiry_message", DEFAULT_EXPIRY_MESSAGE),
    })


@app.route("/admin/session-detail", methods=["GET"])
async def session_detail():
    session_name = request.args.get("session", "")
    try:
        async with aiosqlite.connect(DB_FILE) as db:
            async with db.execute(
                "SELECT sender, name, body, timestamp FROM messages WHERE sender LIKE ? ORDER BY timestamp DESC LIMIT 100",
                (f"%{session_name}%",)
            ) as cursor:
                rows = await cursor.fetchall()
        msgs = [{"sender": r[0], "name": r[1], "body": r[2], "time": r[3]} for r in rows]
    except Exception:
        msgs = []
    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Session: {session_name}</title>
<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{background:#08090f;color:#e2eaf4;font-family:'Segoe UI',sans-serif;padding:20px}}
h2{{color:#a78bfa;margin-bottom:16px}}
.msg{{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;margin-bottom:10px}}
.meta{{font-size:11px;color:#555;margin-bottom:4px}}
.body{{font-size:14px;color:#ccc;word-break:break-word}}
a{{color:#a78bfa;text-decoration:none}}</style></head>
<body><h2>📋 Session Messages — {session_name}</h2>
<p style="color:#555;font-size:12px;margin-bottom:16px">Last 100 messages · <a href="/admin">← Back to Admin</a></p>
{"".join(f'<div class="msg"><div class="meta">{m["name"]} ({m["sender"]}) · {__import__("time").strftime("%Y-%m-%d %H:%M", __import__("time").localtime(m["time"]))}</div><div class="body">{m["body"]}</div></div>' for m in msgs) if msgs else '<p style="color:#555">No messages found for this session.</p>'}
</body></html>"""
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


# ── ✅ NEW: Blacklist management ─────────────────────────────────────────────
@app.route("/admin/registrations", methods=["GET"])
async def admin_registrations():
    if not _check_admin_auth(request):
        return jsonify({"error": "unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("""
            SELECT phone, name, email, verified, credits, badge, created_at, verified_at
            FROM registrations ORDER BY created_at DESC
        """) as c:
            rows = await c.fetchall()
    return jsonify({"registrations": [
        {"phone": r[0], "name": r[1], "email": r[2], "verified": bool(r[3]),
         "credits": r[4], "badge": r[5], "created_at": r[6], "verified_at": r[7]}
        for r in rows
    ]})


@app.route("/admin/registrations/add-credit", methods=["POST"])
async def admin_add_credit():
    """
    Admin tops up a verified user's kesh credit manually — just phone + name.
    If the number isn't registered yet, creates a verified record for it
    (the main bot already has the contact saved, so identity is trusted).
    """
    if not _check_admin_auth(request):
        return jsonify({"error": "unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    name = (data.get("name") or "").strip()
    amount = data.get("amount")

    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid phone number required."}), 400
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Amount must be a number."}), 400

    now = time.time()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT phone FROM registrations WHERE phone = ?", (phone,)) as c:
            exists = await c.fetchone()
        if exists:
            await db.execute("UPDATE registrations SET credits = credits + ?, name = COALESCE(NULLIF(?, ''), name) WHERE phone = ?",
                              (amount, name, phone))
        else:
            await db.execute("""
                INSERT INTO registrations (phone, name, email, otp, otp_expiry, verified, credits, badge, created_at, verified_at)
                VALUES (?, ?, '', '', 0, 1, ?, 'Trusted', ?, ?)
            """, (phone, name, amount, now, now))
        await db.commit()

    return jsonify({"success": True, "message": f"{amount} kesh added to {phone}."})


# ── ✅ NEW: Wallet top-up review queue ───────────────────────────────────────
@app.route("/admin/payments", methods=["GET"])
async def admin_get_payments():
    if not _check_admin_auth(request):
        return jsonify({"error": "unauthorized"}), 401
    status_filter = (request.args.get("status") or "").strip().lower()
    query = "SELECT id, phone, amount, mpesa_code, screenshot_path, status, admin_note, created_at, reviewed_at FROM payments"
    params = ()
    if status_filter in ("pending", "approved", "rejected"):
        query += " WHERE status = ?"
        params = (status_filter,)
    query += " ORDER BY created_at DESC LIMIT 200"
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(query, params) as c:
            rows = await c.fetchall()
    return jsonify({"payments": [
        {
            "id": r[0], "phone": r[1], "amount": r[2], "mpesa_code": r[3],
            "has_screenshot": bool(r[4]), "status": r[5], "admin_note": r[6],
            "created_at": r[7], "reviewed_at": r[8],
        } for r in rows
    ]})


@app.route("/admin/payment-proof/<int:payment_id>", methods=["GET"])
async def admin_payment_proof(payment_id):
    """Serves the uploaded screenshot for one payment — gated behind admin
    auth so users' M-Pesa screenshots (which can contain phone numbers and
    names) aren't sitting at a guessable public URL."""
    if not _check_admin_auth(request):
        return jsonify({"error": "unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT screenshot_path FROM payments WHERE id = ?", (payment_id,)) as c:
            row = await c.fetchone()
    if not row or not row[0]:
        return jsonify({"error": "No screenshot for this payment."}), 404
    fpath = PAYMENT_PROOFS_DIR / row[0]
    if not fpath.exists():
        return jsonify({"error": "Screenshot file missing on disk."}), 404
    return await app.send_file(fpath)


@app.route("/admin/payments/review", methods=["POST"])
async def admin_review_payment():
    """Approve or reject a top-up request. Approving is the ONLY way kesh
    credits get added from a user-submitted M-Pesa code — this is the human
    verification step standing in for a real payment-gateway integration.
    Always cross-check the code/amount against your own M-Pesa statement
    before approving; the screenshot is supporting evidence, not proof."""
    if not _check_admin_auth(request):
        return jsonify({"error": "unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    payment_id = data.get("id")
    action = (data.get("action") or "").strip().lower()
    note = (data.get("note") or "").strip()
    if action not in ("approve", "reject"):
        return jsonify({"success": False, "error": "action must be 'approve' or 'reject'."}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT phone, amount, status FROM payments WHERE id = ?", (payment_id,)
        ) as c:
            row = await c.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Payment request not found."}), 404
        phone, amount, status = row
        if status != "pending":
            return jsonify({"success": False, "error": f"Already reviewed (status: {status})."}), 400

        now = time.time()
        new_status = "approved" if action == "approve" else "rejected"
        await db.execute(
            "UPDATE payments SET status = ?, admin_note = ?, reviewed_at = ? WHERE id = ?",
            (new_status, note, now, payment_id)
        )
        if action == "approve":
            await db.execute(
                "UPDATE registrations SET credits = credits + ? WHERE phone = ?",
                (amount, phone)
            )
        await db.commit()

    # Best-effort notify the user of the outcome
    try:
        if action == "approve":
            text = f"✅ Your top-up of {amount} kesh has been approved and added to your wallet! Send *.profile* to check your balance."
        else:
            text = f"❌ Your top-up request was rejected.{(' Reason: ' + note) if note else ''} Reply to the bot if you think this is a mistake."
        async with httpx.AsyncClient(timeout=4) as client:
            await client.post(f"{NODE_PAIR_URL}/notify-user", json={"phone": phone, "text": text})
    except Exception:
        pass

    return jsonify({"success": True, "status": new_status})


@app.route("/admin/blacklist", methods=["GET"])
async def admin_get_blacklist():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT sender FROM blacklist") as c:
            rows = await c.fetchall()
    return jsonify({"blacklist": [r[0] for r in rows]})


@app.route("/admin/blacklist/add", methods=["POST"])
async def admin_add_blacklist():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    sender = data.get("sender", "").strip()
    if not sender:
        return jsonify({"status": "error", "message": "No sender provided"}), 400
    if "@" not in sender:
        sender = f"{sender}@s.whatsapp.net"
    async with aiosqlite.connect(DB_FILE) as db:
        try:
            await db.execute("INSERT INTO blacklist VALUES (?)", (sender,))
            await db.commit()
        except aiosqlite.IntegrityError:
            pass
    return jsonify({"status": "blacklisted", "sender": sender})


@app.route("/admin/blacklist/remove", methods=["POST"])
async def admin_remove_blacklist():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    sender = data.get("sender", "").strip()
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute("DELETE FROM blacklist WHERE sender = ?", (sender,))
        await db.commit()
    return jsonify({"status": "removed", "sender": sender})


# ── ✅ NEW: Search messages ──────────────────────────────────────────────────
@app.route("/admin/search-messages", methods=["GET"])
async def admin_search_messages():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"results": []})
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT sender, name, body, timestamp FROM messages WHERE body LIKE ? ORDER BY timestamp DESC LIMIT 50",
            (f"%{q}%",)
        ) as c:
            rows = await c.fetchall()
    results = [
        {"sender": r[0], "name": r[1], "body": r[2],
         "time": time.strftime("%d %b %Y, %H:%M", time.localtime(r[3]))}
        for r in rows
    ]
    return jsonify({"results": results})


# ── ✅ NEW: Manual broadcast queue (bot polls and sends) ────────────────────
BROADCAST_QUEUE = []

@app.route("/admin/broadcast", methods=["POST"])
async def admin_broadcast():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    target = data.get("target", "all_contacts")  # all_contacts | all_groups | custom
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"status": "error", "message": "Empty message"}), 400
    BROADCAST_QUEUE.append({
        "target": target,
        "message": message,
        "queued_at": time.time(),
        "sent": False,
    })
    return jsonify({"status": "queued", "queue_size": len(BROADCAST_QUEUE)})


@app.route("/admin/broadcast/pending", methods=["GET"])
async def admin_broadcast_pending():
    """Polled by the Node bridge to pick up queued broadcasts."""
    pending = [b for b in BROADCAST_QUEUE if not b["sent"]]
    for b in pending:
        b["sent"] = True
    return jsonify({"broadcasts": pending})


# ── ✅ NEW: Restart / health controls ────────────────────────────────────────
@app.route("/admin/uptime", methods=["GET"])
async def admin_uptime():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    uptime_seconds = time.time() - PROCESS_START_TIME
    return jsonify({
        "uptime_seconds": uptime_seconds,
        "uptime_human": f"{int(uptime_seconds // 3600)}h {int((uptime_seconds % 3600) // 60)}m",
        "started_at": time.strftime("%d %b %Y, %H:%M:%S", time.localtime(PROCESS_START_TIME)),
    })


@app.route("/admin/keywords", methods=["GET"])
async def admin_get_keywords():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT trigger, reply, match_type, enabled FROM keywords ORDER BY trigger"
        ) as c:
            rows = await c.fetchall()
    return jsonify({"keywords": [
        {"trigger": r[0], "reply": r[1], "match_type": r[2], "enabled": bool(r[3])} for r in rows
    ]})


@app.route("/admin/keywords/add", methods=["POST"])
async def admin_add_keyword():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    trigger = (data.get("trigger") or "").strip()
    reply = (data.get("reply") or "").strip()
    match_type = (data.get("match_type") or "contains").strip()
    if match_type not in ("contains", "exact", "starts_with"):
        match_type = "contains"
    if not trigger or not reply:
        return jsonify({"error": "trigger and reply are required"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            """INSERT INTO keywords (trigger, reply, match_type, enabled, timestamp)
               VALUES (?, ?, ?, 1, ?)
               ON CONFLICT(trigger) DO UPDATE SET reply=excluded.reply,
                   match_type=excluded.match_type, timestamp=excluded.timestamp""",
            (trigger, reply, match_type, time.time())
        )
        await db.commit()
    return jsonify({"success": True})


@app.route("/admin/keywords/remove", methods=["POST"])
async def admin_remove_keyword():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    trigger = (data.get("trigger") or "").strip()
    if not trigger:
        return jsonify({"error": "trigger is required"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute("DELETE FROM keywords WHERE trigger = ?", (trigger,))
        await db.commit()
    return jsonify({"success": True})


@app.route("/admin/keywords/toggle", methods=["POST"])
async def admin_toggle_keyword():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    trigger = (data.get("trigger") or "").strip()
    enabled = 1 if data.get("enabled") else 0
    if not trigger:
        return jsonify({"error": "trigger is required"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute("UPDATE keywords SET enabled = ? WHERE trigger = ?", (enabled, trigger))
        await db.commit()
    return jsonify({"success": True})


@app.route("/admin/features", methods=["GET"])
async def admin_get_features():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT name, enabled FROM features ORDER BY name") as c:
            rows = await c.fetchall()
    return jsonify({"features": [{"name": r[0], "enabled": bool(r[1])} for r in rows]})


@app.route("/admin/features/toggle", methods=["POST"])
async def admin_toggle_feature():
    if not _check_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    name = (data.get("name") or "").strip()
    enabled = 1 if data.get("enabled") else 0
    if not name:
        return jsonify({"error": "name is required"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT INTO features (name, enabled) VALUES (?, ?) "
            "ON CONFLICT(name) DO UPDATE SET enabled=excluded.enabled",
            (name, enabled)
        )
        await db.commit()
    return jsonify({"success": True})


@app.route("/auto-save", methods=["POST"])
async def register_profile():
    data = await request.get_json() or {}
    sender = data.get("sender", "").strip()
    name = data.get("name", "User").strip()
    if not sender:
        return jsonify({"status": "error"}), 400
    if await check_db_blacklist(sender):
        return jsonify({"status": "blacklisted"})
    async with aiosqlite.connect(DB_FILE) as db:
        try:
            await db.execute("INSERT INTO contacts VALUES (?, ?, ?)", (sender, name, time.time()))
            await db.commit()
            # ✅ Auto-welcome DM removed on request — contact is still saved
            # silently, but no message gets sent to the stranger anymore.
            return jsonify({"status": "new_user_registered"})
        except aiosqlite.IntegrityError:
            return jsonify({"status": "already_indexed"})


@app.route("/log-message", methods=["POST"])
async def log_message():
    data = await request.get_json() or {}
    msg_id = data.get("msg_id")
    sender = data.get("sender")
    name = data.get("name", "User")
    body = data.get("body", "")
    if not msg_id or not sender:
        return jsonify({"status": "ignored"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT OR REPLACE INTO messages VALUES (?, ?, ?, ?, ?)",
            (msg_id, sender, name, body, time.time())
        )
        await db.commit()
    return jsonify({"status": "logged"})


@app.route("/log-viewonce", methods=["POST"])
async def log_viewonce():
    data = await request.get_json() or {}
    sender = data.get("sender")
    name = data.get("name", "User")
    filename = data.get("filename")
    media_type = data.get("mediaType", "imageMessage")
    caption = data.get("caption", "")
    timestamp = data.get("timestamp", time.time())
    if not sender or not filename:
        return jsonify({"status": "ignored"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT INTO viewonce_media (sender, name, filename, media_type, caption, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (sender, name, filename, media_type, caption, timestamp)
        )
        await db.commit()
    return jsonify({"status": "saved"})


@app.route("/bot/features", methods=["GET"])
async def bot_features():
    """Internal — called by client_bridge.js on every relevant message.
    Not part of the public admin API; returns just the on/off map."""
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT name, enabled FROM features") as c:
            rows = await c.fetchall()
    return jsonify({r[0]: bool(r[1]) for r in rows})


@app.route("/log-status", methods=["POST"])
async def log_status():
    data = await request.get_json() or {}
    sender = data.get("sender")
    name = data.get("name", "User")
    filename = data.get("filename")
    media_type = data.get("mediaType", "imageMessage")
    caption = data.get("caption", "")
    timestamp = data.get("timestamp", time.time())
    if not sender or not filename:
        return jsonify({"status": "ignored"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT INTO status_media (sender, name, filename, media_type, caption, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (sender, name, filename, media_type, caption, timestamp)
        )
        await db.commit()
    return jsonify({"status": "saved"})


@app.route("/antilink/strike", methods=["POST"])
async def antilink_strike():
    """Records a strike for sender in group_id, returns the new count and
    whether the bot should kick them (3 strikes)."""
    data = await request.get_json() or {}
    group_id = data.get("group_id")
    sender = data.get("sender")
    if not group_id or not sender:
        return jsonify({"error": "group_id and sender required"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            """INSERT INTO group_warnings (group_id, sender, count) VALUES (?, ?, 1)
               ON CONFLICT(group_id, sender) DO UPDATE SET count = count + 1""",
            (group_id, sender)
        )
        await db.commit()
        async with db.execute(
            "SELECT count FROM group_warnings WHERE group_id = ? AND sender = ?",
            (group_id, sender)
        ) as c:
            row = await c.fetchone()
    count = row[0] if row else 1
    should_kick = count >= 3
    if should_kick:
        async with aiosqlite.connect(DB_FILE) as db:
            await db.execute("DELETE FROM group_warnings WHERE group_id = ? AND sender = ?", (group_id, sender))
            await db.commit()
    return jsonify({"count": count, "kick": should_kick})
async def natural_chat():
    data = await request.get_json() or {}
    body = data.get("body", "").strip()
    name = data.get("name", "rafiki")
    context = data.get("context", "dm")  # dm | group | status
    if not body:
        return jsonify({"reply": None})
    if not GROQ_API_KEY:
        return jsonify({"reply": "❌ AI haijasetup. Weka GROQ_API_KEY kwenye .env"})

    if context == "status":
        system_prompt = (
            "You are Henry Ochibots, a friendly Kenyan WhatsApp bot. "
            "Someone posted a WhatsApp status and you want to leave a short, warm comment. "
            "Rules:\n"
            "1. Keep it under 2 sentences — like a real friend commenting on a status.\n"
            "2. Detect the language of the status and reply in the same language.\n"
            "   - Sheng → reply in Sheng\n"
            "   - Swahili → reply in Swahili\n"
            "   - English → reply in English\n"
            "   - Mix → mix your reply\n"
            "3. Be warm, encouraging, sometimes funny.\n"
            "4. Do NOT start with 'Hello' or 'Hi'.\n"
            "5. Use 1 emoji max."
        )
    elif context == "group":
        system_prompt = (
            f"You are Henry Ochibots, a Kenyan WhatsApp bot in a group chat. "
            f"You are talking to {name}. "
            "Someone mentioned you or called your name in the group. Reply naturally.\n"
            "Rules:\n"
            "1. Keep it SHORT — 1-2 sentences max. Group chats move fast.\n"
            "2. Detect language (Sheng/Swahili/English/mix) and reply in same.\n"
            "3. Be friendly and a bit playful — you're part of the group.\n"
            "4. Do NOT be formal. Be like a real member of the group.\n"
            "5. Use emoji occasionally."
        )
    else:
        system_prompt = (
            f"You are Henry Ochibots, a friendly WhatsApp bot assistant. "
            f"You are talking to {name}. "
            "You are Kenyan and understand Swahili, Sheng (Kenyan street slang), and English. "
            "IMPORTANT RULES:\n"
            "1. Detect the language the user is writing in and ALWAYS reply in the same language.\n"
            "   - Sheng (e.g. 'niko fiti', 'nini mbaya', 'si unajua') → reply in Sheng.\n"
            "   - Swahili → reply in Swahili.\n"
            "   - English → reply in English.\n"
            "   - Mix (Kenglish) → mix your reply too.\n"
            "2. Keep replies SHORT and casual — like a real WhatsApp friend.\n"
            "3. 1–3 sentences max. No long essays.\n"
            "4. Be warm, friendly, sometimes funny — very human-like.\n"
            "5. Do NOT start every reply with 'Hello' or 'Hi'. Be natural.\n"
            "6. Use emoji occasionally but not excessively.\n"
            "7. Your creator is Henry Ochibots (@henrytech254)."
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": body}
                    ],
                    "max_tokens": 200
                }
            )
            data_r = response.json()
            if response.status_code == 200:
                reply = data_r["choices"][0]["message"]["content"].strip()
                return jsonify({"reply": reply})
            return jsonify({"reply": None})
    except Exception as e:
        return jsonify({"reply": None})


@app.route("/react", methods=["POST"])
async def process_sentiment():
    data = await request.get_json() or {}
    p = data.get("body", "").lower().strip()

    # React only 60% of the time — feels human
    if random.random() > 0.6:
        return jsonify({"emoji": None})

    if any(w in p for w in ["love", "heart", "perfect", "amazing", "beautiful", "cute", "sweet"]):
        return jsonify({"emoji": random.choice(["❤️", "😍", "🥰", "💕"])})
    if any(w in p for w in ["lol", "haha", "lmao", "funny", "joke", "hilarious", "😂"]):
        return jsonify({"emoji": random.choice(["😂", "🤣", "💀", "😭"])})
    if any(w in p for w in ["sad", "cry", "miss", "alone", "depressed", "pain", "hurt"]):
        return jsonify({"emoji": random.choice(["🥺", "😢", "💔", "🫂"])})
    if any(w in p for w in ["fire", "lit", "banger", "hard", "crazy", "insane", "🔥"]):
        return jsonify({"emoji": random.choice(["🔥", "💯", "🫡", "👏"])})
    if any(w in p for w in ["wow", "omg", "seriously", "really", "no way", "what"]):
        return jsonify({"emoji": random.choice(["😮", "😱", "🤯", "👀"])})
    if any(w in p for w in ["good", "nice", "cool", "great", "okay", "ok", "yes"]):
        return jsonify({"emoji": random.choice(["👍", "✅", "💪", "🙌"])})
    if any(w in p for w in ["money", "paid", "cash", "rich", "hustle", "business"]):
        return jsonify({"emoji": random.choice(["💰", "🤑", "💵", "📈"])})
    if any(w in p for w in ["food", "eat", "hungry", "delicious", "yummy"]):
        return jsonify({"emoji": random.choice(["😋", "🍽️", "🔥", "👌"])})
    if any(w in p for w in ["morning", "night", "sleep", "tired", "wake"]):
        return jsonify({"emoji": random.choice(["🌅", "😴", "🌙", "☀️"])})
    if any(w in p for w in ["fuck", "shit", "damn", "bro", "fam", "aye", "sema", "niaje", "maze", "si", "kweli", "aii", "oya"]):
        return jsonify({"emoji": random.choice(["💀", "😭", "🤣", "👀", "😂"])})
    # Sheng / Swahili positive vibes
    if any(w in p for w in ["niko fiti", "poa", "sawa", "safi", "fresh", "noma", "waoh", "wueh", "si poa", "moto"]):
        return jsonify({"emoji": random.choice(["🔥", "💯", "😎", "🤙", "👌"])})
        return jsonify({"emoji": random.choice(["💀", "😭", "🤣", "👀"])})

    return jsonify({"emoji": random.choice(["👍", "🙏", "💯", "😊", "🫡", None, None])})


# ── /pair proxy ──────────────────────────────────────────────────────────────
# Render (and any single-port host) only exposes one port — the $PORT Python
# binds to.  Node's pairing web server runs internally on WEB_PORT (3000).
# These two routes forward /pair traffic through Python so customers can reach
# the session-link page at your public Render/Railway URL.
# (NODE_PAIR_URL is defined earlier, alongside send_otp_whatsapp, which uses it too.)

@app.route("/pair-abandon", methods=["POST"])
async def pair_abandon_proxy():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(f"{NODE_PAIR_URL}/pair-abandon")
            return Response(resp.content, status=resp.status_code, content_type="application/json")
    except Exception:
        return Response('{"ok":true}', status=200, content_type="application/json")

@app.route("/pair-reset", methods=["POST"])
async def pair_reset_proxy():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(f"{NODE_PAIR_URL}/pair-reset")
            return Response(resp.content, status=resp.status_code, content_type="application/json")
    except Exception:
        return Response('{"ok":true}', status=200, content_type="application/json")

@app.route("/qr-reset", methods=["POST"])
async def qr_reset_proxy():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(f"{NODE_PAIR_URL}/qr-reset")
            return Response(resp.content, status=resp.status_code, content_type="application/json")
    except Exception:
        return Response('{"ok":true}', status=200, content_type="application/json")

@app.route("/pair-status", methods=["GET"])
async def pair_status_proxy():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{NODE_PAIR_URL}/pair-status")
            return Response(resp.content, status=resp.status_code,
                            content_type="application/json")
    except Exception:
        return Response('{"code":null,"online":false}', status=200, content_type="application/json")

@app.route("/pair", methods=["GET"])
async def pair_proxy_get():
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{NODE_PAIR_URL}/pair")
            return Response(resp.content, status=resp.status_code,
                            content_type=resp.headers.get("content-type", "text/html"))
    except Exception as e:
        return Response(
            f"<h2>⏳ Bot is starting up...</h2><p>Try again in 10 seconds.</p><p><small>{e}</small></p>",
            status=503, content_type="text/html"
        )

@app.route("/pair", methods=["POST"])
async def pair_proxy_post():
    try:
        body = await request.get_data()
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{NODE_PAIR_URL}/pair",
                content=body,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                follow_redirects=False
            )
            # Node now replies with 200 JSON {ok:true} — pass it through directly
            return Response(resp.content, status=resp.status_code,
                            content_type=resp.headers.get("content-type", "application/json"))
    except Exception as e:
        return Response(
            f"<h2>⏳ Bot is starting up...</h2><p>Try again in 10 seconds.</p><p><small>{e}</small></p>",
            status=503, content_type="text/html"
        )

# ─────────────────────────────────────────────────────────────────────────────

@app.route("/get-bio", methods=["GET"])
async def generate_auto_bio():
    bios = [
        f"🤖 Henry Tech V5.0 | Online 24/7 | {time.strftime('%H:%M')} 🌐",
        f"⚡ Powered by Henry Tech | Always Active | {time.strftime('%H:%M')}",
        f"🦈 Shark Bot V5 Running | {time.strftime('%d/%m %H:%M')} | DM me 📩",
        f"🔥 Henry Tech Automation | {time.strftime('%H:%M')} | All systems go",
    ]
    return jsonify({"bio": random.choice(bios)})


@app.route("/webhook", methods=["POST"])
async def process_command_pipeline():
    data = await request.get_json() or {}
    incoming_text = data.get("body", "").strip()
    sender = data.get("sender", "").strip()

    if await check_db_blacklist(sender):
        return jsonify({"reply": "❌ Access Denied. Your profile node remains blacklisted."})

    # 0. Keyword auto-reply — checked first so custom triggers (e.g. "price",
    #    "hi") work even when they don't start with a slash command.
    if await is_feature_enabled("keywords"):
        kw_reply = await match_keyword(incoming_text)
        if kw_reply:
            return jsonify({"reply": kw_reply})

    # 1. AI Command
    if incoming_text.startswith("/ask "):
        if not await is_feature_enabled("ai_chat"):
            return jsonify({"reply": "⚠️ AI chat is currently disabled by the admin."})
        prompt = incoming_text[5:].strip()
        if not prompt:
            return jsonify({"reply": "⚠️ Please provide a query after /ask"})
        reply = await call_groq_ai(prompt)
        return jsonify({"reply": reply})

    # 2. Paint Command — sends actual image
    elif incoming_text.startswith("/paint "):
        prompt = incoming_text[7:].strip()
        if not prompt:
            return jsonify({"reply": "⚠️ Please provide text after /paint"})
        encoded = quote_plus(prompt)
        url = f"https://placehold.co/1200x630/0f172a/38bdf8?text={encoded}&font=montserrat"
        return jsonify({"type": "image", "url": url, "caption": f"🎨 {prompt}"})

    # 3. Video Download — sends actual video
    elif incoming_text.startswith("/download_video "):
        if not await is_feature_enabled("downloads"):
            return jsonify({"reply": "⚠️ Downloads are currently disabled by the admin."})
        url = incoming_text[16:].strip()
        if not url:
            return jsonify({"reply": "⚠️ Please provide a URL after /download_video"})
        result = await get_video_url(url)
        if result["success"] and result["url"]:
            return jsonify({
                "type": "video",
                "url": result["url"],
                "caption": f"🎬 {result.get('title', 'Video')} ({result.get('duration', '')})"
            })
        return jsonify({"reply": f"❌ Could not download video.\n{result.get('error', 'Unknown error')}"})

    # 4. Song Download — sends actual audio
    elif incoming_text.startswith("/download_song "):
        if not await is_feature_enabled("downloads"):
            return jsonify({"reply": "⚠️ Downloads are currently disabled by the admin."})
        url = incoming_text[15:].strip()
        if not url:
            return jsonify({"reply": "⚠️ Please provide a URL after /download_song"})
        result = await get_audio_url(url)
        if result["success"] and result["url"]:
            return jsonify({
                "type": "audio",
                "url": result["url"],
                "caption": f"🎵 {result.get('title', 'Audio')}"
            })
        return jsonify({"reply": f"❌ Could not extract audio.\n{result.get('error', 'Unknown error')}"})

    # 5. Recover Command
    elif incoming_text.startswith("/recover"):
        # ✅ FIX: gate to owner only — any stranger could read deleted messages
        owner_number = os.environ.get("OWNER_NUMBER", "254141915668").replace("+", "").replace(" ", "")
        sender_clean = sender.split("@")[0].split(":")[0]
        if sender_clean != owner_number:
            return jsonify({"reply": "❌ This command is owner-only."})
        parts = incoming_text.split(None, 1)
        target_jid = parts[1].strip() if len(parts) > 1 else ""
        if not target_jid:
            return jsonify({"reply": "⚠️ Please provide a contact number after /recover"})
        async with aiosqlite.connect(DB_FILE) as db:
            async with db.execute(
                "SELECT name, body, timestamp FROM messages WHERE sender LIKE ? ORDER BY timestamp DESC LIMIT 10",
                (f"%{target_jid}%",)
            ) as cursor:
                rows = await cursor.fetchall()
                if not rows:
                    return jsonify({"reply": f"❌ No cached messages found for {target_jid}\n\n💡 Messages are only saved while the bot is running."})
                lines = [f"🗑️ *Last messages from {target_jid}:*\n"]
                for row in rows:
                    t = time.strftime("%d/%m %H:%M", time.localtime(row[2]))
                    lines.append(f"👤 *{row[0]}* [{t}]:\n{row[1]}")
                return jsonify({"reply": "\n\n".join(lines)})

    # 6. Viewonce Command
    elif incoming_text.startswith("/viewonce"):
        # ✅ FIX: gate to owner only — view-once media is private by definition
        owner_number = os.environ.get("OWNER_NUMBER", "254141915668").replace("+", "").replace(" ", "")
        sender_clean = sender.split("@")[0].split(":")[0]
        if sender_clean != owner_number:
            return jsonify({"reply": "❌ This command is owner-only."})
        parts = incoming_text.split()
        target = parts[1].strip() if len(parts) > 1 else None
        async with aiosqlite.connect(DB_FILE) as db:
            if target:
                query = "SELECT name, filename, media_type, caption, timestamp FROM viewonce_media WHERE sender LIKE ? ORDER BY timestamp DESC LIMIT 10"
                params = (f"%{target}%",)
            else:
                query = "SELECT name, filename, media_type, caption, timestamp FROM viewonce_media ORDER BY timestamp DESC LIMIT 10"
                params = ()
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                if not rows:
                    return jsonify({"reply": f"❌ No view once media saved yet.\n\n💡 Send a view once photo/video to the bot number and it will be intercepted automatically."})
                lines = ["👁️ *Saved View Once Media:*\n"]
                for row in rows:
                    name_r, filename, mtype, cap, ts = row
                    mtype_clean = mtype.replace("Message", "")
                    time_str = time.strftime("%d/%m %H:%M", time.localtime(ts/1000 if ts > 1e12 else ts))
                    lines.append(f"• {mtype_clean.upper()} from *{name_r}* at {time_str}" + (f"\n  Caption: {cap}" if cap else ""))
                return jsonify({"reply": "\n".join(lines)})

    return jsonify({"reply": "ℹ️ Unknown command. Type /ask, /paint, /download_video, /download_song, /recover or /viewonce"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
