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

app = Quart(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    logger.warning("⚠️  GROQ_API_KEY not set! /ask command will fail.")

DB_FILE = "henry_tech_v5.db"
SESSION_REGISTRY = {}  # tracks all bot sessions for admin panel

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
        await db.commit()
        logger.info("\033[1;32m⚡ V5.0 Master Database Synchronized — All tables ready.\033[0m")


@app.before_serving
async def startup():
    await init_db()
    logger.info("\033[1;36m🦈 Henry Tech V5.0 Backend LIVE on port %s\033[0m", os.environ.get("PORT", 5000))
    logger.info("\033[1;33m📡 Waiting for Shark Bot (Node.js) to connect...\033[0m")


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


@app.route("/")
async def landing_page():
    index_path = Path(__file__).parent / "index.html"
    if index_path.exists():
        return Response(index_path.read_text(encoding="utf-8"), mimetype="text/html")
    return jsonify({"status": "ok"})


@app.route("/status")
async def status_check():
    # Lives on the Python side because hosting platforms (Render, etc.)
    # route external traffic to whatever port app.py binds to via $PORT —
    # not to the Node bridge's internal-only WEB_PORT.
    return jsonify({"status": "ok"})


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
    if not _check_admin_auth(request):
        return Response("❌ Unauthorized", status=401,
                        headers={"WWW-Authenticate": 'Bearer realm="Admin Panel"'})
    admin_path = Path(__file__).parent / "admin.html"
    if admin_path.exists():
        return Response(admin_path.read_text(encoding="utf-8"), mimetype="text/html")
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
    for name, info in SESSION_REGISTRY.items():
        session_list.append({
            "name": name,
            "number": info.get("number", ""),
            "online": info.get("online", False),
            "msg_count": info.get("msg_count", 0),
            "since": info.get("since", "")
        })

    return jsonify({
        "sessions": len([s for s in session_list if s["online"]]),
        "contacts": contacts,
        "messages": messages,
        "viewonce": viewonce,
        "session_list": session_list,
        "recent_contacts": recent_contacts
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
    SESSION_REGISTRY[name] = {
        "number": data.get("number", ""),
        "online": data.get("online", False),
        "msg_count": data.get("msg_count", 0),
        "since": time.strftime("%d/%m %H:%M")
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
            "number": data.get("number", SESSION_REGISTRY[name].get("number", ""))
        })
    return jsonify({"status": "updated"})


@app.route("/admin/check-terminate", methods=["POST"])
async def check_terminate():
    data = await request.get_json() or {}
    name = data.get("name", "")
    should_terminate = SESSION_REGISTRY.get(name, {}).get("terminate", False)
    return jsonify({"terminate": should_terminate})


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
            return jsonify({"status": "new_user_registered", "welcome_message": WELCOME_TEXT})
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


@app.route("/natural-chat", methods=["POST"])
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

NODE_PAIR_URL = f"http://127.0.0.1:{os.environ.get('WEB_PORT', 3000)}"

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

    # 1. AI Command
    if incoming_text.startswith("/ask "):
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
