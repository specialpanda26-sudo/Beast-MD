const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  delay,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const http = require("http");

// ── Owner & Bot Config ──────────────────────────────────────────────────────
// ✅ FIX: hardcoded fallback so owner check never fails on Render
// (render.yaml doesn't set OWNER_NUMBER so env var was always empty)
const OWNER_NUMBER  = (process.env.OWNER_NUMBER  || '254141915668').replace(/[^0-9]/g, '');
const OWNER_NAME_CFG = process.env.OWNER_NAME   || 'Henry Ochibots';
const BOT_NAME      = process.env.BOT_NAME      || 'Henry Ochibots v19™';
const CMD_PREFIX    = '.';

// ── Co-Owner System ─────────────────────────────────────────────────────────
// Co-owners have the same power as owner but cannot add/remove other co-owners
global.coOwners = new Set(
  (process.env.CO_OWNERS || '').split(',').map(n => n.replace(/[^0-9]/g, '')).filter(Boolean)
);

// ── Mode Persistence (global, not per-config object) ───────────────────────
// ✅ FIX: mode was stored on a throwaway config object rebuilt each message
if (global.botMode === undefined)   global.botMode   = 'public';
if (global.botActive === undefined) global.botActive = true;

// ── Sub-Admin System ─────────────────────────────────────────────────────────
// Numbers that the owner has granted bot-admin access to (without full owner power)
// Persisted in memory — owner uses .addadmin / .removeadmin to manage
global.subAdmins = global.subAdmins || new Set(
  (process.env.SUB_ADMINS || '').split(',').map(n => n.replace(/[^0-9]/g, '')).filter(Boolean)
);

// ── Plugin Loader ────────────────────────────────────────────────────────────
// Loads all command handlers from /plugins/*.js
const allCommands = {};
['general', 'group', 'media', 'cypher', 'atassa', 'scheduler'].forEach(name => {
  try {
    Object.assign(allCommands, require(`./plugins/${name}`));
  } catch (e) {
    console.warn(`⚠️  Plugin "${name}" failed to load: ${e.message}`);
  }
});
const loadedCmds = Object.keys(allCommands);
console.log(`✅ Plugins loaded — ${loadedCmds.length} commands: ${loadedCmds.join(', ')}`);

// ── Pairing Web Server ──────────────────────────────────────
// Open /pair in browser to link any WhatsApp number without touching .env
// Multi-session: each session slot gets its own resolve queue entry
const pendingPairResolves = {};   // sessionId → resolve fn (replaces single global)
let pendingPairResolve = null;    // kept for legacy single-call compat (points to active slot)
let lastPairingCode = null;
let lastPairingNumber = null;
let botOnline = false;
let pairingPending = false;  // true while a new session is starting up
let currentSessionId = "beastbot";
let lastQRDataUrl = null;  // base64 data URL of the latest QR code for web display
// Track all active session IDs so /pair-status can report correctly
const activeSessions = new Set();

const pairServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // GET / → redirect to /pair (clean URL)
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
    res.writeHead(302, { Location: "/pair" });
    res.end();
    return;
  }

  // GET /pair — serve the dedicated pairing page (pair.html)
  if (req.method === "GET" && url.pathname === "/pair") {
    const htmlPath = path.join(__dirname, "pair.html");
    const fallback = path.join(__dirname, "index.html");
    const filePath = fs.existsSync(htmlPath) ? htmlPath : fallback;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(filePath, "utf8"));
    return;
  }

  // GET /index or / for landing page
  if (req.method === "GET" && (url.pathname === "/index" || url.pathname === "/index.html")) {
    const htmlPath = path.join(__dirname, "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(htmlPath, "utf8"));
    } else { res.writeHead(404); res.end("Not found"); }
    return;
  }

  // POST /pair-reset — clear pairing state and start a NEW session
  // OLD sessions keep running — supports 100+ numbers simultaneously
  // POST /pair-abandon — user left the page without pairing; free the session slot
  // Called via navigator.sendBeacon when user closes/leaves the tab
  if (req.method === "POST" && url.pathname === "/pair-abandon") {
    // Read body (sendBeacon sends JSON)
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      console.log(`🚪 User left pairing page without pairing — auto-releasing slot`);
      // Only clear state if a code hasn't been used/connected yet
      if (!botOnline) {
        lastPairingCode = null;
        lastPairingNumber = null;
        lastQRDataUrl = null;
        pairingPending = false;
        // Kill any pending resolve so the slot is freed for the next visitor
        if (pendingPairResolve) {
          pendingPairResolve = null;
        }
      }
    });
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/pair-reset") {
    // ✅ FIX: clear code + number immediately so /pair-status never returns stale data
    lastPairingCode = null;
    lastPairingNumber = null;
    lastQRDataUrl = null;  // ✅ FIX: clear old QR so new one is generated fresh
    pendingPairResolve = null;
    pairingPending = true;  // flag: new session is starting, code not yet ready
    // NOTE: do NOT set botOnline = false — old sessions are still running
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    // Start a brand new session with a unique ID — old ones keep running
    const newSid = "session_" + Date.now();
    console.log(`🔄 Starting new session slot: ${newSid} (old sessions still active, total: ${activeSessions.size})`);
    // Delete the session folder for the new slot so it starts fresh (no stale creds)
    try {
      const newPath = path.join(SESSIONS_DIR, newSid);
      if (fs.existsSync(newPath)) fs.rmSync(newPath, { recursive: true, force: true });
    } catch (_) {}
    setTimeout(() => startSession(newSid, { forceQR: false }), 500);
    return;
  }

  // POST /qr-reset — start a NEW session in QR code mode (not pairing code)
  if (req.method === "POST" && url.pathname === "/qr-reset") {
    lastPairingCode = null;
    lastPairingNumber = null;
    lastQRDataUrl = null;
    pendingPairResolve = null;
    pairingPending = true;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    const newSid = "qr_session_" + Date.now();
    console.log(`📷 Starting QR session: ${newSid}`);
    try {
      const newPath = path.join(SESSIONS_DIR, newSid);
      if (fs.existsSync(newPath)) fs.rmSync(newPath, { recursive: true, force: true });
    } catch (_) {}
    setTimeout(() => startSession(newSid, { forceQR: true }), 500);
    return;
  }

  // GET /pair-status — JS polling endpoint (no page refresh needed)
  if (req.method === "GET" && url.pathname === "/pair-status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      code: lastPairingCode || null,
      number: lastPairingNumber || null,
      online: botOnline,
      sessions: activeSessions.size,
      pending: pairingPending,   // true = session started but code not yet generated
      qr: lastQRDataUrl || null  // base64 data URL of QR image, or null
    }));
    return;
  }

  // POST /pair — receive number and trigger pairing
  if (req.method === "POST" && url.pathname === "/pair") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const number = params.get("number")?.replace(/[\s\-\+]/g, "") || "";
      if (number) {
        lastPairingNumber = number;
        // Find the first waiting session slot (FIFO order)
        const waitingSlot = Object.keys(pendingPairResolves)[0];
        if (waitingSlot && pendingPairResolves[waitingSlot]) {
          // ✅ FIX: clear stale code before new one is generated
          lastPairingCode = null;
          lastPairingNumber = number;
          pairingPending = true;
          // A session is ready — resolve it immediately
          const resolve = pendingPairResolves[waitingSlot];
          delete pendingPairResolves[waitingSlot];
          pendingPairResolve = null;
          resolve(number);
        } else if (pendingPairResolve) {
          // Legacy fallback — single-session path
          lastPairingCode = null;
          lastPairingNumber = number;
          pairingPending = true;
          pendingPairResolve(number);
          pendingPairResolve = null;
        } else {
          // ✅ FIX: clear stale code before new one is generated
          lastPairingCode = null;
          lastPairingNumber = number;
          pairingPending = true;
          // No session ready yet — queue with retries for up to 30s
          console.log(`⏳ Number received (${number}) but no session slot ready yet — queuing...`);
          let attempts = 0;
          const retry = setInterval(() => {
            attempts++;
            const slot = Object.keys(pendingPairResolves)[0];
            if (slot && pendingPairResolves[slot]) {
              clearInterval(retry);
              const resolve = pendingPairResolves[slot];
              delete pendingPairResolves[slot];
              pendingPairResolve = null;
              resolve(number);
              console.log(`✅ Queued number delivered to slot "${slot}" after ${attempts} attempts`);
            } else if (pendingPairResolve) {
              clearInterval(retry);
              pendingPairResolve(number);
              pendingPairResolve = null;
              console.log(`✅ Queued number delivered (legacy) after ${attempts} attempts`);
            } else if (attempts >= 60) {
              clearInterval(retry);
              console.log("❌ Gave up waiting for bot to be ready");
            }
          }, 500);
        }
      }
      // ✅ FIX: return JSON instead of redirect so app.py can read res.ok + body
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, queued: !!number }));
    });
    return;
  }

  // GET /status — for keep-alive pings
  if (url.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", online: botOnline, version: "V6" }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const WEB_PORT = process.env.WEB_PORT || 3000;
pairServer.listen(WEB_PORT, () => {
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${WEB_PORT}`;
  console.log(`🌐 Pairing web UI (internal) → http://localhost:${WEB_PORT}/pair`);
  console.log(`🔗 Public session link      → ${publicUrl}/pair`);
});

const logger = pino({ level: "silent" });
// Must match the port app.py actually binds to (it reads the same PORT env
// var). Hardcoding 5000 here breaks the bridge on platforms like Railway
// that assign a dynamic PORT instead of leaving it at the default.
const BACKEND_PORT = process.env.PORT || 5000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// Env vars let the bot start unattended on Railway/Render, where there is no
// interactive terminal to answer the session-name / linking-method prompts.
const SESSION_ID_ENV = (process.env.SESSION_ID || "").trim();
const PAIRING_NUMBER_ENV = (process.env.PAIRING_NUMBER || "").replace(/[\s\-\+]/g, "");
const IS_INTERACTIVE = Boolean(process.stdin.isTTY);

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 45000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

// Sessions directory
const SESSIONS_DIR = "./sessions";
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printBanner() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("   🦈 SHARK BOT — HENRY BOTS© V5.0 🦈   ");
  console.log("╚══════════════════════════════════════╝\n");
}

async function askLinkingMethod() {
  console.log("1️⃣  QR Code  - Scan with WhatsApp camera");
  console.log("2️⃣  Pairing Code - Enter code in WhatsApp\n");
  const answer = await prompt("Choose method (1 or 2): ");
  return answer;
}

async function askPhoneNumber() {
  const num = await prompt("Enter phone number with country code (e.g. 2547XXXXXXXX): ");
  // Strip spaces, dashes, plus sign
  return num.replace(/[\s\-\+]/g, "");
}

async function askSessionId() {
  if (SESSION_ID_ENV) return SESSION_ID_ENV;
  if (!IS_INTERACTIVE) {
    console.log("ℹ️  No TTY detected and no SESSION_ID env var set — using 'default'.");
    return "default";
  }
  const existing = fs.readdirSync(SESSIONS_DIR).filter(f =>
    fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory()
  );
  if (existing.length > 0) {
    console.log("\n📂 Existing sessions:");
    existing.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
  }
  const answer = await prompt("\nEnter session name (e.g. mybot or your name): ");
  return answer || "default";
}

async function startSession(sessionId, opts = {}) {
  const forceQR = opts.forceQR === true;
  currentSessionId = sessionId;
  activeSessions.add(sessionId);
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // Fetch latest Baileys version for best compatibility
  const { version } = await fetchLatestBaileysVersion();
  console.log(`\n📦 Using Baileys WA version: ${version.join(".")}`);

  let usePairingCode = false;
  let phoneNumber = "";

  if (!state.creds.registered) {
    if (forceQR) {
      // QR mode — don't request pairing code, let Baileys generate QR naturally
      usePairingCode = false;
      console.log(`📷 [${sessionId}] QR mode — waiting for QR from Baileys...`);
      pairingPending = true;
    } else if (PAIRING_NUMBER_ENV) {
      usePairingCode = true;
      phoneNumber = PAIRING_NUMBER_ENV;
      console.log(`🔢 Using pairing code linking for ${phoneNumber} (from PAIRING_NUMBER env var.)`);
    } else if (IS_INTERACTIVE) {
      const method = await askLinkingMethod();
      if (method === "2") {
        usePairingCode = true;
        phoneNumber = await askPhoneNumber();
      }
    } else {
      // No TTY — use web UI for pairing code
      console.log(`🌐 No terminal detected. Open /pair in browser to link your number.`);
      usePairingCode = true;
      phoneNumber = await new Promise((resolve) => {
        pendingPairResolves[sessionId] = resolve;
        pendingPairResolve = resolve;
        console.log(`⏳ [${sessionId}] Waiting for number from web UI at /pair ...`);
      });
      delete pendingPairResolves[sessionId];
      pendingPairResolve = null;
      console.log(`📱 Got number from web UI: ${phoneNumber}`);
    }
  }

  let msgCount = 0;
  const socket = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // handled manually below
    logger,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    // Helps avoid bans — don't look like web browser
    browser: Browsers.ubuntu("Chrome")
  });

  // Pairing code generation
  if (usePairingCode && !state.creds.registered) {
    await delay(3000); // Wait for socket to initialize
    try {
      const code = await socket.requestPairingCode(phoneNumber);
      console.log("\n╔══════════════════════════════════════╗");
      console.log(`   🔑 PAIRING CODE: ${code.match(/.{1,4}/g).join("-")}  `);
        lastPairingCode = code.match(/.{1,4}/g).join("-");
      pairingPending = false;  // code is ready
      console.log("╚══════════════════════════════════════╝");
      console.log("\n📱 Steps:");
      console.log("1. Open WhatsApp");
      console.log("2. Go to Linked Devices");
      console.log("3. Tap Link a Device");
      console.log("4. Tap 'Link with phone number instead'");
      console.log("5. Enter the code above\n");
    } catch (e) {
      console.error("❌ Pairing code error:", e.message);
      console.log("💡 Try method 1 (QR Code) instead, or check your phone number.");
    }
  }

  socket.ev.on("creds.update", saveCreds);

  // Feature: Anti-Call
  socket.ev.on("call", async (inboundCall) => {
    for (const call of inboundCall) {
      if (call.status === "offer") {
        try {
          await socket.rejectCall(call.id, call.from);
          console.log(`🚫 [${sessionId}] AntiCall: rejected call from ${call.from}`);
        } catch (e) {
          console.error("❌ AntiCall error:", e.message);
        }
      }
    }
  });

  socket.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages[0];
      if (!msg || !msg.message) return;

      const sender = msg.key.remoteJid;
      if (!sender) return;

      const isStatus = sender === "status@broadcast";
      const name = msg.pushName || "User";
      const msgId = msg.key.id;

      // Extract message body from all common message types
      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        "";

      // Feature: Auto View & Like Status + AI comment on status
      if (isStatus) {
        try {
          await socket.readMessages([msg.key]);
          await socket.sendMessage(
            sender,
            { react: { text: "❤️", key: msg.key } },
            { statusJidList: [msg.key.participant || sender] }
          );
          // ✅ NEW: AI comment reply on text statuses (human-like)
          if (body && global.botActive !== false) {
            try {
              const statusName = msg.pushName || 'rafiki';
              const aiReply = await apiClient.post('/natural-chat', {
                body: `Mtu amepost status WhatsApp akisema: "${body}". Jibu kwa comment fupi ya kirafiki kama vile umeona status yao.`,
                name: statusName,
                context: 'status'
              });
              if (aiReply?.data?.reply) {
                await delay(Math.floor(Math.random() * 3000) + 2000);
                await socket.sendMessage(
                  sender,
                  { text: aiReply.data.reply },
                  { statusJidList: [msg.key.participant || sender] }
                );
              }
            } catch (_) {}
          }
        } catch (e) {}
        return;
      }

      // ── Sender & role detection ──────────────────────────────────────────────
      const isGroup     = sender.endsWith('@g.us');
      const senderJid   = isGroup
        ? (msg.key.participant || sender)
        : msg.key.fromMe
          ? (socket.user?.id || sender)
          : sender;
      const senderNumber = senderJid.split('@')[0].replace(/:\d+$/, '');
      const isPrimaryOwner = Boolean(OWNER_NUMBER && senderNumber === OWNER_NUMBER);
      const isCoOwner    = global.coOwners.has(senderNumber);
      const isOwner      = isPrimaryOwner || isCoOwner;  // co-owners get owner powers
      const isSubAdmin   = global.subAdmins.has(senderNumber);
      const isBotAdmin   = isOwner || isSubAdmin;

      // ── fromMe guard — allow owner commands even from the bot number ──────
      if (msg.key.fromMe && !body.startsWith(CMD_PREFIX)) return;

      // Feature: Auto Read Messages
      try {
        await socket.readMessages([msg.key]);
      } catch (e) {}

      // Update session message count for admin panel
      apiClient.post("/admin/update-session", {
        name: sessionId,
        online: true,
        msg_count: (msgCount = (msgCount || 0) + 1)
      }).catch(() => {});

      // Log message to DB for /recover
      if (body) {
        apiClient.post("/log-message", { msg_id: msgId, sender, name, body }).catch(() => {});
      }

      // Feature: Save View Once Media
      const viewOnceMsg =
        msg.message?.viewOnceMessage?.message ||
        msg.message?.viewOnceMessageV2?.message ||
        msg.message?.viewOnceMessageV2Extension?.message;

      if (viewOnceMsg) {
        try {
          const mediaType = Object.keys(viewOnceMsg)[0]; // imageMessage | videoMessage | audioMessage
          const inner = viewOnceMsg[mediaType] || {};
          const caption = inner.caption ? `\n${inner.caption}` : "";
          const timestamp = Date.now();

          // downloadMediaMessage needs a {key, message} shaped object pointing
          // at the *inner* media message, not the viewOnceMessage wrapper.
          const fakeMsg = { key: msg.key, message: viewOnceMsg };
          const buffer = await downloadMediaMessage(
            fakeMsg,
            "buffer",
            {},
            { logger, reuploadRequest: socket.updateMediaMessage }
          );

          // Save to disk
          const mediaDir = path.join(__dirname, "viewonce_media");
          if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
          const ext = mediaType === "imageMessage" ? "jpg" : mediaType === "videoMessage" ? "mp4" : "ogg";
          const filename = `${sender.split("@")[0]}_${timestamp}.${ext}`;
          const filepath = path.join(mediaDir, filename);
          fs.writeFileSync(filepath, buffer);
          console.log(`💾 [${sessionId}] View-once saved: ${filename}`);

          // Log to DB via backend
          apiClient.post("/log-viewonce", {
            sender,
            name,
            filename,
            mediaType,
            caption: caption.trim(),
            timestamp
          }).catch(() => {});

          // Forward to self (own WhatsApp number)
          const selfJid = socket.user.id.replace(/:.*@/, "@");
          const notifyText = `👁️ *View Once intercepted!*
👤 From: *${name}* (${sender.split("@")[0]})
📁 Type: ${mediaType.replace("Message","")}
🕐 ${new Date().toLocaleTimeString()}`;
          
          await socket.sendMessage(selfJid, { text: notifyText });

          if (mediaType === "imageMessage") {
            await socket.sendMessage(selfJid, { image: buffer, caption: `📸 View-once image from ${name}${caption}` });
          } else if (mediaType === "videoMessage") {
            await socket.sendMessage(selfJid, { video: buffer, caption: `🎥 View-once video from ${name}${caption}` });
          } else if (mediaType === "audioMessage") {
            await socket.sendMessage(selfJid, {
              audio: buffer,
              mimetype: inner.mimetype || "audio/ogg; codecs=opus",
              ptt: true
            });
          }

        } catch (e) {
          console.error(`❌ [${sessionId}] View-once save failed:`, e.message);
        }
      }

      // Feature: Auto Save Contacts (silent — welcome is opt-in via .welcome command)
      try {
        await apiClient.post("/auto-save", { sender, name });
      } catch (e) {}

      // Feature: Fake Typing on ALL incoming messages (human-like)
      try {
        await socket.sendPresenceUpdate("composing", sender);
        await delay(Math.floor(Math.random() * 1000) + 500);
        await socket.sendPresenceUpdate("paused", sender);
      } catch (e) {}

      // Feature: Auto React to messages
      if (body) {
        try {
          const sentiment = await apiClient.post("/react", { body });
          if (sentiment?.data?.emoji) {
            await socket.sendMessage(sender, {
              react: { text: sentiment.data.emoji, key: msg.key }
            });
          }
        } catch (e) {}
      }

      // ── Dot-command dispatcher (.menu .ping .tagall etc.) ─────────────────
      if (body.startsWith(CMD_PREFIX)) {
        const humanDelay = Math.floor(Math.random() * 1200) + 500;
        await delay(humanDelay);
        try { await socket.sendPresenceUpdate('composing', sender); } catch (_) {}

        const parts  = body.slice(CMD_PREFIX.length).trim().split(/\s+/);
        const cmd    = parts[0]?.toLowerCase();
        const args   = parts.slice(1);

        const config = {
          ownerNumber  : OWNER_NUMBER,
          ownerName    : OWNER_NAME_CFG,
          botName      : BOT_NAME,
          prefix       : CMD_PREFIX,
          groqApiKey   : process.env.GROQ_API_KEY || '',
          // ✅ FIX: read from global — these are now persistent across messages
          get mode()   { return global.botMode; },
          set mode(v)  { global.botMode = v; },
          get active() { return global.botActive; },
          set active(v){ global.botActive = v; },
        };

        if (allCommands[cmd]) {
          // ── Permission check (skip for owner/admins) ──────────────────────
          if (!isOwner && !isSubAdmin && isGroup) {
            const { canUseCommand } = require('./plugins/group');
            if (canUseCommand && !canUseCommand(sender, senderJid, cmd)) {
              await socket.sendMessage(sender, { text: `🔒 You don't have permission to use *.${cmd}*` }, { quoted: msg });
              return;
            }
          }
          try {
            await allCommands[cmd]({
              sock    : socket,
              from    : sender,
              msg,
              isOwner,
              isPrimaryOwner,
              isCoOwner,
              isSubAdmin,
              isBotAdmin,
              isGroup,
              sender  : senderJid,
              args,
              config,
            });
          } catch (e) {
            console.error(`❌ [${sessionId}] .${cmd} error:`, e.message);
            try {
              await socket.sendMessage(sender,
                { text: `❌ Error in .${cmd}: ${e.message}` },
                { quoted: msg }
              );
            } catch (_) {}
          }
        } else if (isOwner) {
          // Let the owner know the command doesn't exist
          await socket.sendMessage(sender,
            { text: `❓ Unknown command: *${CMD_PREFIX}${cmd}*\n\nType *${CMD_PREFIX}menu* to see all commands.` },
            { quoted: msg }
          );
        }
        try { await socket.sendPresenceUpdate('paused', sender); } catch (_) {}
        return;
      }

      // Core Command Handler (slash commands only)
      if (body.startsWith("/")) {
        // Feature: Anti-Ban random human-like delay
        const humanDelay = Math.floor(Math.random() * 1500) + 800;
        await delay(humanDelay);

        // Feature: Fake Typing / Recording simulation
        const presenceType = (body.startsWith("/download_song") || body.startsWith("/download_video")) ? "recording" : "composing";
        try { await socket.sendPresenceUpdate(presenceType, sender); } catch (e) {}

        try {
          const response = await apiClient.post("/webhook", { body, sender });
          const data = response.data;

          try { await socket.sendPresenceUpdate("paused", sender); } catch (e) {}

          if (data.type === "image" && data.url) {
            // Send actual image
            await socket.sendMessage(sender, {
              image: { url: data.url },
              caption: data.caption || ""
            });
          } else if (data.type === "video" && data.url) {
            // Send actual video
            await socket.sendMessage(sender, {
              video: { url: data.url },
              caption: data.caption || "",
              mimetype: "video/mp4"
            });
          } else if (data.type === "audio" && data.url) {
            // Send actual audio
            await socket.sendMessage(sender, {
              audio: { url: data.url },
              mimetype: "audio/mpeg",
              ptt: false
            });
          } else if (data.reply) {
            await socket.sendMessage(sender, { text: data.reply });
          }
        } catch (e) {
          try { await socket.sendPresenceUpdate("paused", sender); } catch (_) {}
          await socket.sendMessage(sender, { text: `❌ Bot error: ${e.message}` });
        }
      }

      // ── Natural AI Chat (DM only, non-command messages) ───────────────────
      if (!isGroup && body && !body.startsWith(CMD_PREFIX) && !body.startsWith('/')) {
        try {
          const aiReply = await apiClient.post('/natural-chat', { body, name });
          if (aiReply?.data?.reply) {
            const humanDelay = Math.floor(Math.random() * 1500) + 800;
            await delay(humanDelay);
            try { await socket.sendPresenceUpdate('composing', sender); } catch (_) {}
            await delay(Math.floor(Math.random() * 1200) + 600);
            try { await socket.sendPresenceUpdate('paused', sender); } catch (_) {}
            await socket.sendMessage(sender, { text: aiReply.data.reply }, { quoted: msg });
          }
        } catch (e) {}
      }

      // ── Group AI replies — reply when bot is mentioned or name is called ──
      if (isGroup && body && !body.startsWith(CMD_PREFIX) && !body.startsWith('/')) {
        try {
          const groupMeta = await socket.groupMetadata(sender);
          const isRestricted = groupMeta?.announce;

          if (isRestricted) {
            // React only in restricted groups
            const sentiment = await apiClient.post('/react', { body });
            const emoji = sentiment?.data?.emoji || '👍';
            await socket.sendMessage(sender, { react: { text: emoji, key: msg.key } });
            return;
          }

          // ✅ NEW: Reply in group if bot is mentioned or name called
          const botNumber = socket.user?.id?.split(':')[0]?.split('@')[0] || '';
          const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const botMentioned = mentions.some(j => j.includes(botNumber));
          const nameCalledInGroup = body.toLowerCase().includes('henry') ||
            body.toLowerCase().includes('ochibots') ||
            body.toLowerCase().includes('bot');

          if (botMentioned || nameCalledInGroup) {
            const aiReply = await apiClient.post('/natural-chat', {
              body,
              name,
              context: 'group'
            });
            if (aiReply?.data?.reply) {
              await delay(Math.floor(Math.random() * 1500) + 800);
              try { await socket.sendPresenceUpdate('composing', sender); } catch (_) {}
              await delay(Math.floor(Math.random() * 1000) + 500);
              try { await socket.sendPresenceUpdate('paused', sender); } catch (_) {}
              await socket.sendMessage(sender, { text: aiReply.data.reply }, { quoted: msg });
            }
          }
        } catch (e) {}
      }

    } catch (error) {
      console.error(`❌ [${sessionId}] Message handler error:`, error.message);
    }
  });

  // Feature: Auto Bio Update every 60 seconds
  setInterval(async () => {
    try {
      const bioResponse = await apiClient.get("/get-bio");
      if (bioResponse?.data?.bio) {
        await socket.updateProfileStatus(bioResponse.data.bio);
      }
    } catch (e) {}
  }, 60000);

  // Feature: Always Online — re-announce presence every 10 minutes
  setInterval(async () => {
    try {
      await socket.sendPresenceUpdate("available");
    } catch (e) {}
  }, 10 * 60 * 1000);

  // Check if admin panel requested session termination
  const terminateCheck = setInterval(async () => {
    try {
      const res = await apiClient.post("/admin/check-terminate", { name: sessionId });
      if (res.data?.terminate) {
        console.log(`🛑 [${sessionId}] Terminated by admin panel`);
        clearInterval(terminateCheck);
        await socket.logout();
      }
    } catch(e) {}
  }, 30000);

  // Connection state handler with null-safety fix
  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📷 Scan this QR code with WhatsApp now:\n");
      qrcode.generate(qr, { small: true });
      console.log("\n(If the QR looks cut off, pinch-zoom out in Termux to make font smaller)\n");
      // Generate base64 data URL for web UI display
      try {
        const QRCode = require('qrcode');
        lastQRDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
        console.log(`📱 [${sessionId}] QR data URL generated for web UI`);
      } catch (e) {
        console.warn("⚠️  qrcode package missing — web QR display unavailable. Run: npm install qrcode");
      }
    }

    if (connection === "connecting") {
      console.log(`🔗 [${sessionId}] Connecting to WhatsApp...`);
    }

    if (connection === "open") {
      console.log(`\n✅ [${sessionId}] HENRY V19™ BEAST BOT IS ONLINE AND READY! 🔥\n`);
      botOnline = true;
      if (lastPairingCode) lastPairingCode = null;
      lastQRDataUrl = null;  // clear QR — no longer needed
      // Start message scheduler loop (runs once globally)
      try {
        const { startSchedulerLoop } = require('./plugins/scheduler');
        startSchedulerLoop(socket);
        console.log('⏰ Message scheduler started');
      } catch(e) { console.warn('⚠️ Scheduler not loaded:', e.message); }
      // Register session with admin panel
      apiClient.post("/admin/register-session", {
        name: sessionId,
        number: socket.user?.id?.split(":")[0]?.split("@")[0] || "",
        online: true,
        msg_count: 0
      }).catch(() => {});

      // 🔔 Send startup notification with full system stats
      try {
        const selfJid = socket.user?.id?.replace(/:.*@/, "@");
        if (selfJid) {
          const os = require('os');
          const uptime = process.uptime();
          const h = Math.floor(uptime / 3600);
          const m = Math.floor((uptime % 3600) / 60);
          const s = Math.floor(uptime % 60);
          const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
          const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
          const ramFree = (os.freemem() / 1024 / 1024).toFixed(0);
          const cpuModel = os.cpus()[0]?.model?.trim() || 'Unknown CPU';
          const cpuCores = os.cpus().length;
          const platform = os.platform();
          const nodeVer = process.version;
          const loadAvg = os.loadavg()[0].toFixed(2);

          const welcomeText =
`╔════════════════════════════════════╗
║  🔥 *HENRY OCHIBOTS V19™* 🔥        ║
║       _by @henrytech254_            ║
╚════════════════════════════════════╝

✅ *Pairing Successful!*
Your bot is now live and connected. 🌐

📋 *Session:* ${sessionId}
⏰ *Time:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *LIVE SYSTEM STATS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ *CPU:* ${cpuModel}
🧠 *Cores:* ${cpuCores} cores
📊 *CPU Load:* ${loadAvg}%
💾 *RAM Used:* ${ramUsed}MB / ${ramTotal}MB
🟢 *RAM Free:* ${ramFree}MB
🏠 *Platform:* ${platform}
⚙️ *Node.js:* ${nodeVer}
⏱️ *Bot Uptime:* ${h}h ${m}m ${s}s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *AUTO-FEATURES ACTIVE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auto-read messages
✅ Anti-call protection
✅ Auto-view statuses
✅ Save view-once media
✅ AI DM chat (Swahili/Sheng/EN)
✅ Auto-react (sentiment emoji)
✅ Fake typing (anti-ban)
✅ Group react-only (restricted chats)
✅ Always online

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *PERMISSION LEVELS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *Owner* (you) — ALL commands
🛡️ *Sub-Admins* — group + media commands
👤 *Public* — AI chat + /ask + /recover

Type *.menu* to see all commands.
Use *.addadmin 254XXXXXXXXX* to give friends access.

_Henry Ochibots v19™ — @henrytech254_ 🔥`;

          await delay(3000);
          await socket.sendMessage(selfJid, { text: welcomeText });
          console.log(`🔔 [${sessionId}] Startup notification sent`);
        }
      } catch (e) {
        console.error("❌ Startup notification failed:", e.message);
      }
    }

    if (connection === "close") {
      // FIX: lastDisconnect can be null/undefined — always guard it
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : null;

      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log(`🚪 [${sessionId}] Logged out — clearing session and restarting pairing...`);
        botOnline = false;
        lastPairingCode = null;
        lastPairingNumber = "";
        activeSessions.delete(sessionId);
        delete pendingPairResolves[sessionId];
        // Delete session folder so /pair web UI can re-pair
        try {
          fs.rmSync(path.join(SESSIONS_DIR, sessionId), { recursive: true, force: true });
        } catch (_) {}
        // Preserve QR mode if this was a QR session
        const wasQR = sessionId.startsWith('qr_session_');
        setTimeout(() => startSession(sessionId, { forceQR: wasQR }), 3000);
      } else {
        const reason = statusCode ? `(code: ${statusCode})` : "(unknown reason)";
        console.log(`🔄 [${sessionId}] Reconnecting... ${reason}`);
        const wasQR = sessionId.startsWith('qr_session_');
        setTimeout(() => startSession(sessionId, { forceQR: wasQR }), 3000);
      }
    }
  });
}

async function main() {
  printBanner();
  const sessionId = await askSessionId();
  console.log(`\n🚀 Starting session: "${sessionId}"...`);
  await startSession(sessionId);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
