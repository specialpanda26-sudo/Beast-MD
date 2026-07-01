import os
import time
import asyncio
import logging
import json
import random
import hashlib
import secrets
import html
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
║      \033[1;33m✦ Henry Ochibots v19™ — created by Henry ✦\033[1;36m              ║
║      \033[1;32m⚡ HENRY OCHIBOTS v19™  |  PYTHON BACKEND\033[1;36m              ║
║      \033[1;33m⚡ AI  |  DATABASE  |  COMMANDS  |  API\033[1;36m            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
\033[0m"""
    print(banner)

print_banner()

# ── Persistent data directory ───────────────────────────────────────────────
# ✅ FIX: DB file, view-once media, and payment proofs were all scattered as
# plain relative/local paths, so a redeploy on Render/Railway silently wiped
# all of them. They now share one DATA_DIR root with client_bridge.js's
# sessions folder — set DATA_DIR in your env to a mounted persistent disk
# path (see render.yaml) to survive redeploys, not just process restarts.
DATA_DIR = Path(os.environ.get("DATA_DIR", str(Path(__file__).parent / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = Quart(__name__, static_folder="assets", static_url_path="/assets")

# ✅ Force browsers to always fetch the latest HTML instead of using a stale
# local cache — without this, anyone who'd visited before kept seeing old
# landing-page/admin-page content even after a fresh deploy.
NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}

# ✅ NEW: baseline security headers on every response.
# Referrer-Policy matters a lot here specifically because the admin panel
# authenticates via a ?pass=PASSWORD query string — without a strict
# referrer policy, clicking any outbound link (or loading any external
# resource) from an authenticated admin page could leak the password to
# a third-party site via the Referer header. no-referrer stops that.
@app.after_request
async def _apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    return response


def _client_ip(req) -> str:
    """Best-effort real client IP behind a reverse proxy (Render/Railway
    etc. sit in front of this app), falling back to the direct socket addr."""
    fwd = req.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return req.remote_addr or "unknown"


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

# ── Referral program ─────────────────────────────────────────────────────
# Whoever invited a new user (referrer) gets REFERRAL_REFERRER_BONUS kesh,
# and the new user themself gets REFERRAL_REFERRED_BONUS kesh — paid out
# automatically (no human review) the moment the referred user completes
# OTP verification. This stacks on top of REG_STARTER_CREDITS, which every
# verified user gets regardless of referral.
REFERRAL_REFERRER_BONUS = int(os.environ.get("REFERRAL_REFERRER_BONUS", "15"))
REFERRAL_REFERRED_BONUS = int(os.environ.get("REFERRAL_REFERRED_BONUS", "30"))
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
PAYMENT_PROOFS_DIR = DATA_DIR / "payment_proofs"
PAYMENT_PROOFS_DIR.mkdir(exist_ok=True)
ADMIN_PAYTO_NUMBER = os.environ.get("ADMIN_PAYTO_NUMBER", "")  # e.g. 254712345678 — shown to users as where to send M-Pesa funds


def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def _hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 with a random per-user salt. Stored as
    'salt_hex$hash_hex' — no plaintext or reversible encoding ever touches
    the database."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest_hex = stored.split("$", 1)
    except (ValueError, AttributeError):
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return secrets.compare_digest(check.hex(), digest_hex)


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
    except smtplib.SMTPAuthenticationError:
        logger.error("OTP email send failed: SMTP authentication rejected.")
        return {
            "success": False,
            "error": (
                "Email login was rejected by the mail server. If you're using Gmail, "
                "SMTP_PASSWORD must be a 16-character App Password (Google Account → "
                "Security → 2-Step Verification → App passwords), not your normal Gmail "
                "password — Gmail blocks regular passwords for SMTP."
            ),
        }
    except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, OSError) as e:
        logger.error("OTP email send failed: could not reach SMTP server: %s", e)
        return {
            "success": False,
            "error": (
                "Couldn't reach the email server (host/port unreachable or blocked by your "
                "hosting provider's firewall). Double-check SMTP_HOST/SMTP_PORT, and note "
                "some free hosts block outbound port 587."
            ),
        }
    except Exception as e:
        logger.error("OTP email send failed: %s", e)
        return {"success": False, "error": "Couldn't send the email right now. Please try again or use WhatsApp delivery instead."}


DB_FILE = str(DATA_DIR / "henry_tech_v5.db")
SESSION_REGISTRY = {}  # tracks all bot sessions for admin panel
DEFAULT_EXPIRY_MESSAGE = "⏳ Your subscription has expired. Please contact the owner to renew access."
PROCESS_START_TIME = time.time()  # ✅ NEW: for admin uptime tracking

async def call_groq_ai(prompt: str, model: str = None) -> str:
    if not GROQ_API_KEY:
        return "❌ AI not configured. Set GROQ_API_KEY in your .env file."
    chosen_model = model or "llama3-8b-8192"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": chosen_model,
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
        # ✅ FIX: .schedule used to live only in client_bridge.js's in-memory
        # global.scheduledMessages — any restart/redeploy silently dropped
        # every pending scheduled message with no warning to whoever set it.
        # Now persisted here so client_bridge.js can reload it on boot.
        await db.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id TEXT PRIMARY KEY,
                to_jid TEXT, message TEXT,
                next_run REAL, repeat TEXT,
                sent INTEGER DEFAULT 0,
                created_by TEXT
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
                verified_at REAL,
                referred_by TEXT,
                referral_bonus_given INTEGER NOT NULL DEFAULT 0,
                password_hash TEXT
            )
        """)
        # Best-effort migration for DBs created before the referral/password
        # columns existed — ALTER TABLE ... ADD COLUMN throws if the column
        # is already there, so each is wrapped individually and ignored.
        for col, ddl in [
            ("referred_by", "ALTER TABLE registrations ADD COLUMN referred_by TEXT"),
            ("referral_bonus_given", "ALTER TABLE registrations ADD COLUMN referral_bonus_given INTEGER NOT NULL DEFAULT 0"),
            ("password_hash", "ALTER TABLE registrations ADD COLUMN password_hash TEXT"),
            ("reset_otp_attempts", "ALTER TABLE registrations ADD COLUMN reset_otp_attempts INTEGER NOT NULL DEFAULT 0"),
        ]:
            try:
                await db.execute(ddl)
            except Exception:
                pass
        # NEW: referral audit log — one row per successful referral payout,
        # so .myreferrals / an admin can see who referred whom and when.
        await db.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_phone TEXT NOT NULL,
                referred_phone TEXT NOT NULL,
                referrer_bonus INTEGER NOT NULL,
                referred_bonus INTEGER NOT NULL,
                created_at REAL
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
        # ✅ NEW: paid pairing / activation-key system — every newly paired
        # customer session starts LOCKED (can't run commands) until it's
        # unlocked with a random key issued by the admin after payment.
        # Survives restarts, unlike in-memory SESSION_REGISTRY.
        await db.execute("""
            CREATE TABLE IF NOT EXISTS session_subscriptions (
                session TEXT PRIMARY KEY,
                phone TEXT,
                activated INTEGER NOT NULL DEFAULT 0,
                activated_at REAL,
                expiry_ts REAL,
                subscription_days INTEGER,
                request_status TEXT NOT NULL DEFAULT 'none',
                requester_chat TEXT,
                pending_key TEXT,
                pending_key_expires_at REAL,
                created_at REAL,
                updated_at REAL
            )
        """)
        # ✅ NEW: admin_settings — lets the admin password be changed at
        # runtime (via "forgot password" reset) instead of being permanently
        # fixed to whatever ADMIN_PASSWORD was set to at deploy time.
        # Also holds the (hashed, one-time) reset code state.
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        await db.commit()
        logger.info("\033[1;32m⚡ Henry Ochibots v19™ — Master Database Synchronized — All tables ready.\033[0m")


@app.before_serving
async def startup():
    await init_db()
    logger.info("\033[1;36m🔥 Henry Ochibots v19™ Backend LIVE on port %s\033[0m", os.environ.get("PORT", 5000))
    logger.info("\033[1;33m📡 Waiting for WhatsApp bot session (Node.js) to connect...\033[0m")
    if not ADMIN_PASSWORD:
        logger.warning("\033[1;31m⚠️  ADMIN_PASSWORD is not set — /admin has FULL OPEN ACCESS to anyone with the URL. Set ADMIN_PASSWORD in your environment before going live.\033[0m")


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
    ref = (data.get("ref") or "").strip().replace(" ", "").replace("+", "")
    password = data.get("password") or ""

    if not phone or not phone.isdigit() or len(phone) < 9:
        return jsonify({"success": False, "error": "Enter a valid WhatsApp number with country code."}), 400

    if not name:
        return jsonify({"success": False, "error": "Enter your name."}), 400

    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters."}), 400

    if method == "email":
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            return jsonify({"success": False, "error": "Enter a valid email address."}), 400
    elif method != "whatsapp":
        return jsonify({"success": False, "error": "Invalid delivery method."}), 400

    # A referral code is just the referrer's own verified phone number.
    # Reject self-referral and codes that don't match a verified account —
    # otherwise this becomes a free way to mint bonus credits.
    valid_ref = None
    if ref and ref != phone and ref.isdigit():
        async with aiosqlite.connect(DB_FILE) as db:
            async with db.execute("SELECT verified FROM registrations WHERE phone = ?", (ref,)) as c:
                ref_row = await c.fetchone()
        if ref_row and ref_row[0] == 1:
            valid_ref = ref

    otp = _generate_otp()
    now = time.time()
    password_hash = _hash_password(password)

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT verified FROM registrations WHERE phone = ?", (phone,)) as c:
            row = await c.fetchone()
        if row and row[0] == 1:
            return jsonify({"success": False, "error": "This number is already verified. Use the panel login instead."}), 400

        await db.execute("""
            INSERT INTO registrations (phone, name, email, otp, otp_expiry, verified, credits, badge, created_at, referred_by, password_hash)
            VALUES (?, ?, ?, ?, ?, 0, 0, 'none', ?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET
                name=excluded.name, email=excluded.email, otp=excluded.otp,
                otp_expiry=excluded.otp_expiry,
                referred_by=COALESCE(registrations.referred_by, excluded.referred_by),
                password_hash=excluded.password_hash
        """, (phone, name, email, otp, now + OTP_TTL_SECONDS, now, valid_ref, password_hash))
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
            "SELECT otp, otp_expiry, verified, name, referred_by FROM registrations WHERE phone = ?", (phone,)
        ) as c:
            row = await c.fetchone()

        if not row:
            return jsonify({"success": False, "error": "No registration found for this number."}), 404

        stored_otp, expiry, verified, name, referred_by = row
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

        referral_message = ""
        total_credits = REG_STARTER_CREDITS
        if referred_by:
            # Re-check the referrer is still a verified account at payout time
            # (defensive — they were checked at registration too).
            async with db.execute("SELECT verified FROM registrations WHERE phone = ?", (referred_by,)) as c:
                ref_row = await c.fetchone()
            if ref_row and ref_row[0] == 1:
                await db.execute(
                    "UPDATE registrations SET credits = credits + ? WHERE phone = ?",
                    (REFERRAL_REFERRER_BONUS, referred_by)
                )
                await db.execute(
                    "UPDATE registrations SET credits = credits + ?, referral_bonus_given = 1 WHERE phone = ?",
                    (REFERRAL_REFERRED_BONUS, phone)
                )
                await db.execute("""
                    INSERT INTO referrals (referrer_phone, referred_phone, referrer_bonus, referred_bonus, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (referred_by, phone, REFERRAL_REFERRER_BONUS, REFERRAL_REFERRED_BONUS, time.time()))
                total_credits += REFERRAL_REFERRED_BONUS
                referral_message = f" Plus a {REFERRAL_REFERRED_BONUS} kesh referral bonus for signing up via invite!"

        await db.commit()

    return jsonify({
        "success": True,
        "message": f"Number verified! 🛡️ Trust badge unlocked + {REG_STARTER_CREDITS} kesh free credit added.{referral_message}",
        "badge": "Trusted",
        "credits": total_credits
    })


@app.route("/api/forgot-password", methods=["POST"])
async def api_forgot_password():
    """
    ✅ NEW: "forgot panel password" for regular registered users (the
    Name/Number/Password login at /panel — separate from /admin).
    Sends a one-time 6-digit code to the user's OWN registered WhatsApp
    number (reusing send_otp_whatsapp), reusing the same otp/otp_expiry
    columns already on `registrations` for the registration-verify flow.
    Safe to reuse: /api/verify-otp only acts on accounts that are NOT YET
    verified, and this only acts on accounts that ARE verified, so the two
    flows never collide on the same row.
    """
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid WhatsApp number required."}), 400

    now = time.time()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT name, verified, otp_expiry FROM registrations WHERE phone = ?", (phone,)
        ) as c:
            row = await c.fetchone()

        if not row:
            return jsonify({"success": False, "error": "No account found for this number. Register first."}), 404
        name, verified, otp_expiry = row
        if not verified:
            return jsonify({"success": False, "error": "This number isn't verified yet. Complete registration first."}), 403

        # Cooldown: block re-requesting while a still-fresh code was sent
        # less than 60s ago, so this can't be used to spam a number.
        if otp_expiry and (otp_expiry - OTP_TTL_SECONDS) > (now - RESET_REQUEST_COOLDOWN_SECONDS):
            wait = int(RESET_REQUEST_COOLDOWN_SECONDS - (now - (otp_expiry - OTP_TTL_SECONDS)))
            return jsonify({"success": False, "error": f"Please wait {max(wait, 1)}s before requesting another code."}), 429

        otp = _generate_otp()
        await db.execute(
            "UPDATE registrations SET otp = ?, otp_expiry = ?, reset_otp_attempts = 0 WHERE phone = ?",
            (otp, now + OTP_TTL_SECONDS, phone)
        )
        await db.commit()

    result = await send_otp_whatsapp(phone, otp, name)
    if not result.get("success"):
        return jsonify({"success": False, "error": result.get("error", "Couldn't send the reset code. Is the bot connected to WhatsApp?")}), 502

    return jsonify({"success": True, "message": "A reset code was sent to your WhatsApp. It expires in 10 minutes."})


@app.route("/api/reset-password", methods=["POST"])
async def api_reset_password():
    """Step 2 of panel password reset: verify the code and set a new password."""
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    otp = (data.get("otp") or "").strip()
    new_password = data.get("new_password") or ""

    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid WhatsApp number required."}), 400
    if not otp:
        return jsonify({"success": False, "error": "Enter the code sent to your WhatsApp."}), 400
    if len(new_password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters."}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT otp, otp_expiry, verified, reset_otp_attempts FROM registrations WHERE phone = ?", (phone,)
        ) as c:
            row = await c.fetchone()

        if not row:
            return jsonify({"success": False, "error": "No account found for this number."}), 404
        stored_otp, expiry, verified, attempts = row
        if not verified:
            return jsonify({"success": False, "error": "This number isn't verified yet."}), 403
        if not stored_otp or not expiry:
            return jsonify({"success": False, "error": "No reset code was requested. Tap 'Forgot password' first."}), 400
        if (attempts or 0) >= RESET_OTP_MAX_ATTEMPTS:
            await db.execute(
                "UPDATE registrations SET otp = NULL, otp_expiry = NULL, reset_otp_attempts = 0 WHERE phone = ?",
                (phone,)
            )
            await db.commit()
            return jsonify({"success": False, "error": "Too many wrong attempts. Request a new code."}), 429
        if time.time() > expiry:
            return jsonify({"success": False, "error": "That code expired. Request a new one."}), 400
        if otp != stored_otp:
            await db.execute(
                "UPDATE registrations SET reset_otp_attempts = reset_otp_attempts + 1 WHERE phone = ?",
                (phone,)
            )
            await db.commit()
            return jsonify({"success": False, "error": "Incorrect code."}), 401

        await db.execute(
            "UPDATE registrations SET password_hash = ?, otp = NULL, otp_expiry = NULL, reset_otp_attempts = 0 WHERE phone = ?",
            (_hash_password(new_password), phone)
        )
        await db.commit()

    return jsonify({"success": True, "message": "Password updated! You can log in with your new password now."})


@app.route("/api/referrals", methods=["GET"])
async def api_referrals():
    """Referral summary for a verified user: their referral code (their own
    phone number), total kesh earned from referrals, and the list of people
    who signed up using their code."""
    phone = (request.args.get("phone") or "").strip().replace(" ", "").replace("+", "")
    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid phone number required."}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT verified FROM registrations WHERE phone = ?", (phone,)) as c:
            row = await c.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Not registered yet. Send *.register* to the bot first."}), 404
        if not row[0]:
            return jsonify({"success": False, "error": "Verify your number first — send *.register*."}), 403

        async with db.execute(
            "SELECT referred_phone, referrer_bonus, created_at FROM referrals WHERE referrer_phone = ? ORDER BY created_at DESC",
            (phone,)
        ) as c:
            rows = await c.fetchall()

    total_earned = sum(r[1] for r in rows)
    return jsonify({
        "success": True,
        "referral_code": phone,
        "total_referrals": len(rows),
        "total_earned": total_earned,
        "referrer_bonus": REFERRAL_REFERRER_BONUS,
        "referred_bonus": REFERRAL_REFERRED_BONUS,
        "referrals": [{"phone": r[0], "bonus": r[1], "created_at": r[2]} for r in rows]
    })



@app.route("/panel")
async def panel_page():
    panel_path = Path(__file__).parent / "panel.html"
    if panel_path.exists():
        return Response(panel_path.read_text(encoding="utf-8"), mimetype="text/html", headers=NO_CACHE_HEADERS)
    return jsonify({"status": "ok"})


@app.route("/api/profile", methods=["POST"])
async def api_profile():
    """Profile panel data for a verified user — wallet balance, badge, and
    recent top-up requests with their review status.

    ✅ FIX: this function existed in the codebase with no @app.route above
    it, so it was dead code — nothing could ever call it, and the profile
    panel it was written for was never reachable. Now wired up properly.

    ✅ Also fixed: it was designed to trust a bare phone number with no
    password, which would have exposed wallet balance and M-Pesa payment
    history to anyone who guessed/knew a registered number. Now requires
    name + phone + the password set at registration, matching how
    /api/register and the rest of the panel login work.
    """
    data = await request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip().replace(" ", "").replace("+", "")
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""

    if not phone or not phone.isdigit():
        return jsonify({"success": False, "error": "Valid phone number required."}), 400
    if not name or not password:
        return jsonify({"success": False, "error": "Enter your name, WhatsApp number, and password."}), 400

    # ✅ SECURITY: brute-force lockout, tracked per phone number (the account
    # being targeted) rather than per IP — this stops someone brute-forcing
    # one specific victim's password even if they rotate IPs, which is the
    # more realistic threat here than someone trying many accounts from one IP.
    now = time.time()
    lock_entry = _panel_login_failures.get(phone)
    if lock_entry and lock_entry.get("locked_until", 0) > now:
        return jsonify({"success": False, "error": "Too many failed attempts. Try again in a few minutes."}), 429

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT name, email, verified, credits, badge, verified_at, created_at, password_hash FROM registrations WHERE phone = ?",
            (phone,)
        ) as c:
            row = await c.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Not registered yet. Send *.register* to the bot first."}), 404

        stored_name, email, verified, credits, badge, verified_at, created_at, password_hash = row

        if not verified:
            return jsonify({"success": False, "error": "Verify your number first — send *.register*."}), 403
        if not password_hash or not _verify_password(password, password_hash):
            if not lock_entry or now - lock_entry.get("window_start", now) > ADMIN_LOCKOUT_WINDOW_SECONDS:
                lock_entry = {"fails": 0, "window_start": now}
            lock_entry["fails"] = lock_entry.get("fails", 0) + 1
            if lock_entry["fails"] >= ADMIN_LOCKOUT_THRESHOLD:
                lock_entry["locked_until"] = now + ADMIN_LOCKOUT_DURATION_SECONDS
            _panel_login_failures[phone] = lock_entry
            return jsonify({"success": False, "error": "Incorrect password."}), 401
        if stored_name.strip().lower() != name.strip().lower():
            return jsonify({"success": False, "error": "Name doesn't match our records for this number."}), 403

        _panel_login_failures.pop(phone, None)

        async with db.execute(
            "SELECT id, amount, mpesa_code, status, created_at FROM payments WHERE phone = ? ORDER BY created_at DESC LIMIT 10",
            (phone,)
        ) as c:
            prows = await c.fetchall()

    return jsonify({
        "success": True,
        "phone": phone,
        "name": stored_name,
        "email": email,
        "verified": bool(verified),
        "credits": credits,
        "badge": badge if verified else "none",
        "verified_at": verified_at,
        "member_since": created_at,
        "recent_payments": [
            {"id": p[0], "amount": p[1], "mpesa_code": p[2], "status": p[3], "created_at": p[4]}
            for p in prows
        ],
    })


@app.route("/api/payment-info", methods=["GET"])
async def api_payment_info():
    """Public info the panel's top-up form needs: where to send M-Pesa
    funds. No auth required — this is just instructions, not user data."""
    return jsonify({
        "success": True,
        "payto_number": ADMIN_PAYTO_NUMBER,
        "configured": bool(ADMIN_PAYTO_NUMBER)
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

# ✅ NEW: in-memory cooldown so /admin/forgot-password can't be spammed to
# flood the owner's WhatsApp with reset codes. Not persisted on purpose —
# a restart clearing this is a harmless edge case, not a security hole.
_last_reset_request_time = 0.0
RESET_REQUEST_COOLDOWN_SECONDS = 60
RESET_OTP_TTL_SECONDS = 10 * 60
RESET_OTP_MAX_ATTEMPTS = 5

# ✅ NEW: brute-force lockout for the admin login itself. Before this,
# _check_admin_auth was a bare string comparison with NO limit on how many
# times someone could guess — a short/weak ADMIN_PASSWORD was crackable by
# just hammering /admin/stats with different values. Now tracked per client
# IP, in-memory: 5 wrong attempts within 5 minutes locks that IP out for 5
# minutes, even if the very next guess would've been correct. A restart
# clearing this table is an acceptable trade-off for a single-admin tool.
_admin_login_failures: dict[str, dict] = {}
ADMIN_LOCKOUT_THRESHOLD = 5
ADMIN_LOCKOUT_WINDOW_SECONDS = 5 * 60
ADMIN_LOCKOUT_DURATION_SECONDS = 5 * 60

# ✅ NEW: same brute-force protection for the /panel user login, tracked
# per registered phone number (see api_profile below for why per-account
# rather than per-IP fits this threat better).
_panel_login_failures: dict[str, dict] = {}


async def _get_admin_setting(key: str):
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT value FROM admin_settings WHERE key = ?", (key,)) as c:
            row = await c.fetchone()
            return row[0] if row else None


async def _set_admin_setting(key: str, value: str):
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT INTO admin_settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value)
        )
        await db.commit()


async def _clear_admin_settings(*keys: str):
    async with aiosqlite.connect(DB_FILE) as db:
        await db.executemany("DELETE FROM admin_settings WHERE key = ?", [(k,) for k in keys])
        await db.commit()


def _check_admin_auth(req) -> bool:
    """
    ✅ FIX: admin panel had no server-side auth — anyone who found the URL
    could read all sessions, contacts, messages. Now requires either:
    - ?pass=PASSWORD query param, or
    - Authorization: Bearer PASSWORD header
    Falls back to open if ADMIN_PASSWORD env var is not set (dev mode).

    NOTE: kept as a sync check using the env-var password only, for all the
    existing call sites below. The DB-stored (resettable) password is
    checked by _check_admin_auth_async, used at the login/stats entry point
    so a password reset via WhatsApp OTP actually takes effect.

    ✅ SECURITY: uses secrets.compare_digest instead of `==` so this can't
    leak timing information about how many leading characters of the
    password were guessed correctly.
    """
    if not ADMIN_PASSWORD:
        return True  # dev mode: no password set
    token = req.args.get("pass") or req.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    return secrets.compare_digest(token or "", ADMIN_PASSWORD)


async def _check_admin_auth_async(req) -> bool:
    """
    Same as _check_admin_auth, but also:
    - accepts a password that was reset via the "forgot password" WhatsApp
      OTP flow (stored hashed in admin_settings)
    - enforces the brute-force lockout described above

    Deliberately returns a plain False for both "wrong password" and
    "locked out" (never distinguishing the two in the response) so an
    attacker can't use the error message to detect when they're being
    rate-limited vs just guessing wrong.
    """
    ip = _client_ip(req)
    now = time.time()
    entry = _admin_login_failures.get(ip)
    if entry and entry.get("locked_until", 0) > now:
        return False

    token = req.args.get("pass") or req.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    stored_hash = await _get_admin_setting("password_hash")
    if stored_hash:
        ok = _verify_password(token or "", stored_hash)
    elif not ADMIN_PASSWORD:
        ok = True  # dev mode: no password set, and no reset has ever happened
    else:
        ok = secrets.compare_digest(token or "", ADMIN_PASSWORD)

    if ok:
        _admin_login_failures.pop(ip, None)
        return True

    if not entry or now - entry.get("window_start", now) > ADMIN_LOCKOUT_WINDOW_SECONDS:
        entry = {"fails": 0, "window_start": now}
    entry["fails"] = entry.get("fails", 0) + 1
    if entry["fails"] >= ADMIN_LOCKOUT_THRESHOLD:
        entry["locked_until"] = now + ADMIN_LOCKOUT_DURATION_SECONDS
    _admin_login_failures[ip] = entry
    return False


@app.route("/admin/forgot-password", methods=["POST"])
async def admin_forgot_password():
    """
    ✅ NEW: "forgot admin password" — sends a one-time 6-digit reset code
    to the BOT OWNER'S OWN WhatsApp number (OWNER_NUMBER), reusing the same
    send_otp_whatsapp() delivery path already used for user registration.
    Deliberately does NOT accept any phone number from the requester — the
    code always goes to the fixed owner number configured on the server,
    so this can't be abused to send codes to an attacker-controlled number.
    """
    global _last_reset_request_time
    now = time.time()
    if now - _last_reset_request_time < RESET_REQUEST_COOLDOWN_SECONDS:
        wait = int(RESET_REQUEST_COOLDOWN_SECONDS - (now - _last_reset_request_time))
        return jsonify({"success": False, "error": f"Please wait {wait}s before requesting another code."}), 429

    owner_number = os.environ.get("OWNER_NUMBER", "").replace("+", "").replace(" ", "")
    if not owner_number:
        return jsonify({"success": False, "error": "No OWNER_NUMBER configured on the server — password reset isn't available. Set it manually via ADMIN_PASSWORD instead."}), 400

    _last_reset_request_time = now
    otp = _generate_otp()
    await _set_admin_setting("reset_otp_hash", _hash_password(otp))
    await _set_admin_setting("reset_otp_expires", str(now + RESET_OTP_TTL_SECONDS))
    await _set_admin_setting("reset_otp_attempts", "0")

    result = await send_otp_whatsapp(owner_number, otp, "Admin")
    if not result.get("success"):
        return jsonify({"success": False, "error": result.get("error", "Couldn't send the reset code. Is the bot connected to WhatsApp?")}), 502

    return jsonify({"success": True, "message": "A reset code was sent to the owner's WhatsApp. It expires in 10 minutes."})


@app.route("/admin/reset-password", methods=["POST"])
async def admin_reset_password():
    """✅ NEW: verify the OTP from /admin/forgot-password and set a new admin password."""
    data = await request.get_json(force=True, silent=True) or {}
    otp = str(data.get("otp", "")).strip()
    new_password = str(data.get("new_password", ""))

    if len(new_password) < 8:
        return jsonify({"success": False, "error": "New password must be at least 8 characters."}), 400

    stored_hash = await _get_admin_setting("reset_otp_hash")
    expires_raw = await _get_admin_setting("reset_otp_expires")
    attempts_raw = await _get_admin_setting("reset_otp_attempts")
    if not stored_hash or not expires_raw:
        return jsonify({"success": False, "error": "No reset code was requested. Tap 'Forgot password' first."}), 400

    attempts = int(attempts_raw or "0")
    if attempts >= RESET_OTP_MAX_ATTEMPTS:
        await _clear_admin_settings("reset_otp_hash", "reset_otp_expires", "reset_otp_attempts")
        return jsonify({"success": False, "error": "Too many wrong attempts. Request a new code."}), 429

    if time.time() > float(expires_raw):
        await _clear_admin_settings("reset_otp_hash", "reset_otp_expires", "reset_otp_attempts")
        return jsonify({"success": False, "error": "That code expired. Request a new one."}), 400

    if not _verify_password(otp, stored_hash):
        await _set_admin_setting("reset_otp_attempts", str(attempts + 1))
        return jsonify({"success": False, "error": "Incorrect code."}), 401

    await _set_admin_setting("password_hash", _hash_password(new_password))
    await _clear_admin_settings("reset_otp_hash", "reset_otp_expires", "reset_otp_attempts")
    logger.info("🔑 Admin password was reset via WhatsApp OTP.")
    return jsonify({"success": True, "message": "Password updated. You can log in with your new password now."})


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
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT COUNT(*) FROM contacts") as c:
            contacts = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM messages") as c:
            messages = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM viewonce_media") as c:
            viewonce = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM scheduled_messages WHERE sent = 0") as c:
            scheduled_pending = (await c.fetchone())[0]
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
        "scheduled_pending": scheduled_pending,
        "session_list": session_list,
        "recent_contacts": recent_contacts,
        "server_time": time.strftime("%d %b %Y, %H:%M:%S", time.localtime()),
    })


@app.route("/admin/terminate", methods=["POST"])
async def admin_terminate():
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json() or {}
    session_name = data.get("session", "")
    if session_name in SESSION_REGISTRY:
        SESSION_REGISTRY[session_name]["online"] = False
        SESSION_REGISTRY[session_name]["terminate"] = True
    return jsonify({"status": "terminated", "session": session_name})


@app.route("/admin/register-session", methods=["POST"])
async def register_session():
    # ✅ FIX: was missing the auth check every other /admin/* route has —
    # let anyone on the internet spoof/overwrite session registry entries.
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
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
    # ✅ FIX: was missing the auth check every other /admin/* route has.
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
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
    if not await _check_admin_auth_async(request):
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
    # ✅ FIX: was missing the auth check every other /admin/* route has.
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
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


# ── Paid Pairing / Activation Keys ───────────────────────────────────────────
# Every newly-paired customer session (via /pair or .pair in chat) starts
# LOCKED. It stays locked until the customer requests a key (".pair key"),
# the admin approves it (from WhatsApp with a plain yes/no, or from
# /admin → 🔑 Activation), and the customer redeems the key (".key XXXXXX")
# within its 10-minute window. Activating sets an expiry based on however
# many days the admin granted; re-approving/extending just pushes that
# expiry further out without breaking the already-connected session.
#
# All routes below are called internally by client_bridge.js (Bearer token,
# same pattern as every other /admin/* internal call) OR by the /admin web
# panel (?pass= / Bearer, same _check_admin_auth_async as everything else)
# — there's no distinction, both are equally "admin" by design so the admin
# can approve from WhatsApp or the panel interchangeably.

ACTIVATION_KEY_TTL_SECONDS = 600  # 10 minutes to redeem an issued key
DEFAULT_ACTIVATION_SETTINGS = {
    "activation_default_days": "30",
    "activation_bypass_key": "",  # empty until admin sets one (or auto-generated below)
}


def _gen_activation_key() -> str:
    # Short, easy to type over WhatsApp — 8 uppercase alnum chars.
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I ambiguity
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def _get_activation_settings() -> dict:
    out = dict(DEFAULT_ACTIVATION_SETTINGS)
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT key, value FROM admin_settings WHERE key IN ('activation_default_days','activation_bypass_key')"
        ) as c:
            rows = await c.fetchall()
        got = {k: v for k, v in rows}
        if not got.get("activation_bypass_key"):
            # Auto-generate one on first use so there's always a working
            # master bypass, without forcing the admin to configure it
            # before the feature works at all.
            bypass = _gen_activation_key() + _gen_activation_key()
            await db.execute(
                "INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('activation_bypass_key', ?)",
                (bypass,)
            )
            await db.commit()
            got["activation_bypass_key"] = bypass
        out.update({k: v for k, v in got.items() if v is not None})
    return out


async def _get_subscription(session: str):
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT session, phone, activated, activated_at, expiry_ts, subscription_days, "
            "request_status, requester_chat, pending_key, pending_key_expires_at FROM session_subscriptions WHERE session = ?",
            (session,)
        ) as c:
            row = await c.fetchone()
    if not row:
        return None
    return {
        "session": row[0], "phone": row[1], "activated": bool(row[2]), "activated_at": row[3],
        "expiry_ts": row[4], "subscription_days": row[5], "request_status": row[6],
        "requester_chat": row[7], "pending_key": row[8], "pending_key_expires_at": row[9],
    }


@app.route("/admin/activation-status", methods=["POST"])
async def activation_status():
    """Called right after a session connects. Auto-creates its subscription
    row on first sight. A session whose phone number matches OWNER_NUMBER
    (the reseller's own main bot) is auto-activated with no expiry — this
    lock is for paying customers, not the admin's own number."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    session = (data.get("session") or "").strip()
    phone = (data.get("phone") or "").strip()
    if not session:
        return jsonify({"error": "session required"}), 400

    owner_number = os.environ.get("OWNER_NUMBER", "").replace("+", "").replace(" ", "")
    now = time.time()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT activated, expiry_ts FROM session_subscriptions WHERE session = ?", (session,)) as c:
            row = await c.fetchone()
        if not row:
            auto_activate = bool(owner_number and phone and phone == owner_number)
            await db.execute(
                "INSERT INTO session_subscriptions (session, phone, activated, activated_at, expiry_ts, request_status, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, NULL, 'none', ?, ?)",
                (session, phone, 1 if auto_activate else 0, now if auto_activate else None, now, now)
            )
            await db.commit()
            activated, expiry_ts = (1 if auto_activate else 0), None
        else:
            activated, expiry_ts = row
            # keep phone/number fresh in case it changed on a re-pair
            await db.execute("UPDATE session_subscriptions SET phone = ?, updated_at = ? WHERE session = ?", (phone, now, session))
            await db.commit()

    live_active = bool(activated) and (not expiry_ts or now < expiry_ts)
    return jsonify({"activated": live_active, "expiry_ts": expiry_ts})


@app.route("/admin/activation-request", methods=["POST"])
async def activation_request():
    """Customer sent '.pair key' — mark a request pending so the admin
    panel/WhatsApp approval flow has something to act on."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    session = (data.get("session") or "").strip()
    phone = (data.get("phone") or "").strip()
    requester_chat = (data.get("requester_chat") or "").strip()
    if not session:
        return jsonify({"error": "session required"}), 400

    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT request_status FROM session_subscriptions WHERE session = ?", (session,)) as c:
            row = await c.fetchone()
        if row and row[0] == "pending":
            return jsonify({"success": True, "already_pending": True})
        now = time.time()
        if row:
            await db.execute(
                "UPDATE session_subscriptions SET request_status = 'pending', requester_chat = ?, phone = ?, pending_key = NULL, updated_at = ? WHERE session = ?",
                (requester_chat, phone, now, session)
            )
        else:
            await db.execute(
                "INSERT INTO session_subscriptions (session, phone, activated, request_status, requester_chat, created_at, updated_at) "
                "VALUES (?, ?, 0, 'pending', ?, ?, ?)",
                (session, phone, requester_chat, now, now)
            )
        await db.commit()
    settings = await _get_activation_settings()
    return jsonify({"success": True, "already_pending": False, "default_days": settings["activation_default_days"]})


@app.route("/admin/activation-approve", methods=["POST"])
async def activation_approve():
    """Admin said yes (via WhatsApp reply or /admin panel button). Issues a
    random key valid for 10 minutes; the customer's session stays locked
    until they redeem it with '.key XXXXXX'."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    session = (data.get("session") or "").strip()
    if not session:
        return jsonify({"error": "session required"}), 400
    settings = await _get_activation_settings()
    try:
        days = int(data.get("days") or settings["activation_default_days"])
    except (TypeError, ValueError):
        days = int(settings["activation_default_days"])
    days = max(1, days)

    key = _gen_activation_key()
    now = time.time()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT requester_chat, phone FROM session_subscriptions WHERE session = ?", (session,)) as c:
            row = await c.fetchone()
        if not row:
            return jsonify({"error": "No pending request for this session."}), 404
        requester_chat, phone = row
        await db.execute(
            "UPDATE session_subscriptions SET request_status = 'approved', pending_key = ?, pending_key_expires_at = ?, "
            "subscription_days = ?, updated_at = ? WHERE session = ?",
            (key, now + ACTIVATION_KEY_TTL_SECONDS, days, now, session)
        )
        await db.commit()
    return jsonify({
        "success": True, "key": key, "days": days,
        "expires_in": ACTIVATION_KEY_TTL_SECONDS,
        "requester_chat": requester_chat, "phone": phone,
    })


@app.route("/admin/activation-deny", methods=["POST"])
async def activation_deny():
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    session = (data.get("session") or "").strip()
    if not session:
        return jsonify({"error": "session required"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT requester_chat FROM session_subscriptions WHERE session = ?", (session,)) as c:
            row = await c.fetchone()
        await db.execute(
            "UPDATE session_subscriptions SET request_status = 'denied', pending_key = NULL, updated_at = ? WHERE session = ?",
            (time.time(), session)
        )
        await db.commit()
    return jsonify({"success": True, "requester_chat": row[0] if row else None})


@app.route("/admin/activation-redeem", methods=["POST"])
async def activation_redeem():
    """Customer sent '.key XXXXXX'. Also accepts the master bypass key
    (set/viewed from /admin → 🔑 Activation), which activates instantly
    with no expiry, no pending request needed — this is the admin's own
    override for pairing sessions without going through approval at all."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    session = (data.get("session") or "").strip()
    phone = (data.get("phone") or "").strip()
    submitted_key = (data.get("key") or "").strip().upper()
    if not session or not submitted_key:
        return jsonify({"success": False, "reason": "session and key required"}), 400

    settings = await _get_activation_settings()
    now = time.time()

    if settings["activation_bypass_key"] and secrets.compare_digest(submitted_key, settings["activation_bypass_key"].upper()):
        async with aiosqlite.connect(DB_FILE) as db:
            await db.execute(
                "INSERT INTO session_subscriptions (session, phone, activated, activated_at, expiry_ts, request_status, pending_key, created_at, updated_at) "
                "VALUES (?, ?, 1, ?, NULL, 'none', NULL, ?, ?) "
                "ON CONFLICT(session) DO UPDATE SET activated=1, activated_at=excluded.activated_at, expiry_ts=NULL, request_status='none', pending_key=NULL, updated_at=excluded.updated_at",
                (session, phone, now, now, now)
            )
            await db.commit()
        return jsonify({"success": True, "bypass": True, "expiry_ts": None})

    sub = await _get_subscription(session)
    if not sub or not sub["pending_key"]:
        return jsonify({"success": False, "reason": "No key was issued for this session. Send *.pair key* to request one."})
    if not secrets.compare_digest(submitted_key, sub["pending_key"].upper()):
        return jsonify({"success": False, "reason": "That key doesn't match. Double-check and try again."})
    if not sub["pending_key_expires_at"] or now > sub["pending_key_expires_at"]:
        return jsonify({"success": False, "reason": "That key has expired (10-minute window). Send *.pair key* to request a new one."})

    days = sub["subscription_days"] or int(settings["activation_default_days"])
    base = sub["expiry_ts"] if (sub["expiry_ts"] and sub["expiry_ts"] > now) else now
    new_expiry = base + days * 86400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "UPDATE session_subscriptions SET activated = 1, activated_at = ?, expiry_ts = ?, request_status = 'none', pending_key = NULL, updated_at = ? WHERE session = ?",
            (now, new_expiry, now, session)
        )
        await db.commit()
    return jsonify({"success": True, "bypass": False, "expiry_ts": new_expiry, "days": days})


@app.route("/admin/activation-extend", methods=["POST"])
async def activation_extend():
    """/admin panel action: re-subscribe / add more days to a session
    without the WhatsApp request-and-key dance — for renewals the admin
    wants to push through directly. Doesn't touch the connected session at
    all, just extends (or sets, if none yet) its expiry."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    session = (data.get("session") or "").strip()
    try:
        days = max(1, int(data.get("days") or 30))
    except (TypeError, ValueError):
        return jsonify({"error": "days must be a number"}), 400
    now = time.time()
    sub = await _get_subscription(session)
    base = sub["expiry_ts"] if (sub and sub["expiry_ts"] and sub["expiry_ts"] > now) else now
    new_expiry = base + days * 86400
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT INTO session_subscriptions (session, activated, activated_at, expiry_ts, subscription_days, request_status, created_at, updated_at) "
            "VALUES (?, 1, ?, ?, ?, 'none', ?, ?) "
            "ON CONFLICT(session) DO UPDATE SET activated=1, activated_at=excluded.activated_at, expiry_ts=excluded.expiry_ts, subscription_days=excluded.subscription_days, updated_at=excluded.updated_at",
            (session, now, new_expiry, days, now, now)
        )
        await db.commit()
    return jsonify({"success": True, "expiry_ts": new_expiry})


@app.route("/admin/activation-list", methods=["GET"])
async def activation_list():
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    now = time.time()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT session, phone, activated, expiry_ts, subscription_days, request_status, updated_at "
            "FROM session_subscriptions ORDER BY updated_at DESC LIMIT 300"
        ) as c:
            rows = await c.fetchall()
    return jsonify({"sessions": [
        {
            "session": r[0], "phone": r[1], "activated": bool(r[2]),
            "expiry_ts": r[3],
            "expiry_display": time.strftime("%d %b %Y, %H:%M", time.localtime(r[3])) if r[3] else None,
            "expired": bool(r[3] and now >= r[3]),
            "subscription_days": r[4], "request_status": r[5],
            "updated_at": r[6],
        } for r in rows
    ]})


@app.route("/admin/activation-settings", methods=["GET", "POST"])
async def activation_settings():
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    if request.method == "GET":
        settings = await _get_activation_settings()
        return jsonify(settings)
    data = await request.get_json(silent=True) or {}
    updates = {}
    if "activation_default_days" in data:
        try:
            updates["activation_default_days"] = str(max(1, int(data["activation_default_days"])))
        except (TypeError, ValueError):
            return jsonify({"error": "activation_default_days must be a number"}), 400
    if "activation_bypass_key" in data:
        new_key = (data["activation_bypass_key"] or "").strip().upper()
        if new_key:
            updates["activation_bypass_key"] = new_key
    if not updates:
        return jsonify({"error": "nothing to update"}), 400
    async with aiosqlite.connect(DB_FILE) as db:
        for k, v in updates.items():
            await db.execute("INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)", (k, v))
        await db.commit()
    return jsonify({"success": True, **updates})



@app.route("/admin/session-detail", methods=["GET"])
async def session_detail():
    # ✅ FIX: this was the one /admin/* route with NO auth check at all —
    # anyone with the URL could read up to 100 real chat messages for any
    # session. Now requires the same admin password as every other route.
    if not await _check_admin_auth_async(request):
        return "Unauthorized", 401
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
    # ✅ FIX: message name/body/session_name are user-controlled (they come
    # straight from WhatsApp chats) and were being dropped into this HTML
    # unescaped — a message containing "<script>" became stored XSS on this
    # page. Everything user-controlled is now html.escape()'d before it's
    # inserted into the template.
    safe_session_name = html.escape(session_name)
    html_body = "".join(
        f'<div class="msg"><div class="meta">{html.escape(m["name"] or "")} ({html.escape(m["sender"] or "")}) · '
        f'{time.strftime("%Y-%m-%d %H:%M", time.localtime(m["time"]))}</div>'
        f'<div class="body">{html.escape(m["body"] or "")}</div></div>'
        for m in msgs
    ) if msgs else '<p style="color:#555">No messages found for this session.</p>'
    html_page = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Session: {safe_session_name}</title>
<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{background:#08090f;color:#e2eaf4;font-family:'Segoe UI',sans-serif;padding:20px}}
h2{{color:#a78bfa;margin-bottom:16px}}
.msg{{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;margin-bottom:10px}}
.meta{{font-size:11px;color:#555;margin-bottom:4px}}
.body{{font-size:14px;color:#ccc;word-break:break-word}}
a{{color:#a78bfa;text-decoration:none}}</style></head>
<body><h2>📋 Session Messages — {safe_session_name}</h2>
<p style="color:#555;font-size:12px;margin-bottom:16px">Last 100 messages · <a href="/admin">← Back to Admin</a></p>
{html_body}
</body></html>"""
    return html_page, 200, {"Content-Type": "text/html; charset=utf-8"}


# ── ✅ NEW: Blacklist management ─────────────────────────────────────────────
@app.route("/admin/registrations", methods=["GET"])
async def admin_registrations():
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT sender FROM blacklist") as c:
            rows = await c.fetchall()
    return jsonify({"blacklist": [r[0] for r in rows]})


@app.route("/admin/blacklist/add", methods=["POST"])
async def admin_add_blacklist():
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    """Polled by the Node bridge to pick up queued broadcasts.
    ✅ FIX: was missing auth — anyone could hit this and silently drain the
    queue (marks broadcasts sent=True) before the real bridge polled it.
    The Node bridge already sends the admin password on its other calls, so
    this doesn't change how legitimate polling works."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    pending = [b for b in BROADCAST_QUEUE if not b["sent"]]
    for b in pending:
        b["sent"] = True
    return jsonify({"broadcasts": pending})


@app.route("/admin/contacts/all", methods=["GET"])
async def admin_contacts_all():
    """Full, unlimited contact list — used by the broadcast sender so an
    .announce isn't silently capped at the 20 shown on the dashboard
    preview. Requires the same admin auth as other /admin/* routes."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT sender, name FROM contacts ORDER BY timestamp DESC") as c:
            rows = await c.fetchall()
    return jsonify({"contacts": [{"sender": r[0], "name": r[1]} for r in rows]})


# ── ✅ NEW: Restart / health controls ────────────────────────────────────────
@app.route("/admin/uptime", methods=["GET"])
async def admin_uptime():
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    uptime_seconds = time.time() - PROCESS_START_TIME
    return jsonify({
        "uptime_seconds": uptime_seconds,
        "uptime_human": f"{int(uptime_seconds // 3600)}h {int((uptime_seconds % 3600) // 60)}m",
        "started_at": time.strftime("%d %b %Y, %H:%M:%S", time.localtime(PROCESS_START_TIME)),
    })


@app.route("/admin/keywords", methods=["GET"])
async def admin_get_keywords():
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
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
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT name, enabled FROM features ORDER BY name") as c:
            rows = await c.fetchall()
    return jsonify({"features": [{"name": r[0], "enabled": bool(r[1])} for r in rows]})


@app.route("/admin/features/toggle", methods=["POST"])
async def admin_toggle_feature():
    if not await _check_admin_auth_async(request):
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


@app.route("/scheduler/load", methods=["GET"])
async def scheduler_load():
    """Internal — client_bridge.js calls this once on boot to rehydrate
    global.scheduledMessages so a restart/redeploy doesn't drop pending
    scheduled messages."""
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT id, to_jid, message, next_run, repeat, sent, created_by FROM scheduled_messages"
        ) as c:
            rows = await c.fetchall()
    return jsonify({
        "messages": [
            {
                "id": r[0], "to": r[1], "message": r[2],
                "nextRun": r[3], "repeat": r[4],
                "sent": bool(r[5]), "createdBy": r[6],
            }
            for r in rows
        ]
    })


@app.route("/scheduler/save", methods=["POST"])
async def scheduler_save():
    """Internal — client_bridge.js calls this after every add/delete/clear
    so the schedule survives process restarts. Full-list replace is simplest
    and safe here since scheduling volume is low (personal/small-business
    use, not a high-throughput queue)."""
    data = await request.get_json() or {}
    messages = data.get("messages", [])
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute("DELETE FROM scheduled_messages")
        for m in messages:
            await db.execute(
                "INSERT INTO scheduled_messages (id, to_jid, message, next_run, repeat, sent, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (m.get("id"), m.get("to"), m.get("message"), m.get("nextRun"),
                 m.get("repeat"), int(bool(m.get("sent"))), m.get("createdBy")),
            )
        await db.commit()
    return jsonify({"status": "saved", "count": len(messages)})


@app.route("/admin/scheduler", methods=["GET"])
async def admin_scheduler():
    """Admin panel view of pending scheduled messages (the .schedule command).
    Read-only mirror of the scheduled_messages table client_bridge.js persists to."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT id, to_jid, message, next_run, repeat, sent, created_by FROM scheduled_messages ORDER BY next_run ASC"
        ) as c:
            rows = await c.fetchall()
    return jsonify({
        "messages": [
            {
                "id": r[0], "to": r[1], "message": r[2],
                "next_run": time.strftime("%d %b %Y, %H:%M", time.localtime(r[3])) if r[3] else None,
                "repeat": r[4], "sent": bool(r[5]), "created_by": r[6],
            }
            for r in rows
        ]
    })


@app.route("/admin/scheduler/<msg_id>", methods=["DELETE"])
async def admin_scheduler_delete(msg_id):
    """Lets the admin cancel a scheduled message from the panel instead of
    needing WhatsApp access to run .schedule del."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute("DELETE FROM scheduled_messages WHERE id = ?", (msg_id,))
        await db.commit()
    return jsonify({"success": True})


@app.route("/admin/viewonce", methods=["GET"])
async def admin_viewonce():
    """Browse recently intercepted view-once media from the admin panel,
    instead of digging through the bot's own WhatsApp DMs for it."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute(
            "SELECT id, sender, name, filename, media_type, caption, timestamp FROM viewonce_media ORDER BY timestamp DESC LIMIT 50"
        ) as c:
            rows = await c.fetchall()
    return jsonify({
        "items": [
            {
                "id": r[0], "sender": r[1], "name": r[2], "filename": r[3],
                "media_type": r[4], "caption": r[5],
                "time": time.strftime("%d %b %Y, %H:%M", time.localtime(r[6])),
            }
            for r in rows
        ]
    })


@app.route("/admin/viewonce/file/<path:filename>", methods=["GET"])
async def admin_viewonce_file(filename):
    """Serves the actual saved view-once file. Gated behind admin auth for
    the same reason payment screenshots are — this is private content
    intercepted from other people's chats, not public static assets.
    Path is sanitized to the basename so this can't be used to read
    arbitrary files elsewhere on disk."""
    if not await _check_admin_auth_async(request):
        return jsonify({"error": "Unauthorized"}), 401
    safe_name = Path(filename).name  # strip any directory traversal attempt
    file_path = DATA_DIR / "viewonce_media" / safe_name
    if not file_path.exists():
        return jsonify({"error": "File not found"}), 404
    return Response(file_path.read_bytes(), mimetype="application/octet-stream")


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
# ✅ FIX: this route was missing its @app.route decorator entirely — the
# function existed but Quart never registered it as an endpoint, so every
# POST to /natural-chat 404'd silently (client_bridge.js swallows the error
# in an empty catch block). That meant the entire "AI DM chat" and "Group AI
# replies" features never worked, no matter how correct the rest of the
# code was. This one decorator is the actual fix.
@app.route("/natural-chat", methods=["POST"])
async def natural_chat():
    data = await request.get_json() or {}
    body = data.get("body", "").strip()
    name = data.get("name", "rafiki")
    context = data.get("context", "dm")  # dm | group | status
    # ✅ NEW: optional per-chat model override from .model, forwarded by
    # client_bridge.js. Falls back to the hardcoded default below if unset.
    model_pref = (data.get("model") or "").strip() or None
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
                    "model": model_pref or "llama3-8b-8192",
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
        f"🤖 Henry Ochibots v19™ | Online 24/7 | {time.strftime('%H:%M')} 🌐",
        f"⚡ Powered by Henry Ochibots | Always Active | {time.strftime('%H:%M')}",
        f"🔥 Henry Ochibots v19™ Running | {time.strftime('%d/%m %H:%M')} | DM me 📩",
        f"🔥 Henry Ochibots Automation | {time.strftime('%H:%M')} | All systems go",
    ]
    return jsonify({"bio": random.choice(bios)})


@app.route("/webhook", methods=["POST"])
async def process_command_pipeline():
    data = await request.get_json() or {}
    incoming_text = data.get("body", "").strip()
    sender = data.get("sender", "").strip()
    model_pref = data.get("model", "").strip() or None

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
        reply = await call_groq_ai(prompt, model=model_pref)
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
