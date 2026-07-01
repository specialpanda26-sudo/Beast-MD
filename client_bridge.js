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
// ✅ FIX: 'games' and 'osint' plugin files existed on disk but were never
// in this list, so .hangman/.trivia/.guess/.truth/.dare/.wyr/.validate/
// .ipinfo/.whois all resolved to "Unknown command" even though fully coded.
const PLUGIN_NAMES = ['general', 'group', 'media', 'cypher', 'atassa', 'scheduler', 'wallet', 'games', 'osint'];
const allCommands = {};
PLUGIN_NAMES.forEach(name => {
  try {
    Object.assign(allCommands, require(`./plugins/${name}`));
  } catch (e) {
    console.warn(`⚠️  Plugin "${name}" failed to load: ${e.message}`);
  }
});
// ✅ FIX: some plugin files export internal helpers alongside real commands
// (games.js#_handleGameReply, group.js#canUseCommand) via the same
// module.exports object. Left in, a user could type ".canUseCommand" or
// "._handleGameReply" and the dispatcher would blindly call it with the
// wrong argument shape. These are consumed directly by name elsewhere in
// this file, not through the .command dispatcher, so strip them here.
const NON_COMMAND_KEYS = ['_handleGameReply', 'canUseCommand', 'startSchedulerLoop'];
NON_COMMAND_KEYS.forEach(k => delete allCommands[k]);

// ✅ FIX: .reload (plugins/general.js) mutated global.allCommandsRef, but
// nothing ever pointed that at the real dispatch table below — so .reload
// silently did nothing to the commands actually being used. Now it does.
global.allCommandsRef = allCommands;

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
// ✅ NEW: live socket registry, keyed by sessionId — lets HTTP routes (like
// /send-otp-whatsapp) reach a connected WhatsApp socket to send messages
// on behalf of the bot, outside the normal messages.upsert flow.
const activeSockets = new Map();

// ── Paid Pairing / Activation Keys ───────────────────────────────────────
// Per-session lock state for the customer-paid activation flow. Every
// session gets its own entry (unlike global.subscriptionExpired, which is
// shared across sessions and only really correct for a single-session
// deploy) — keyed by sessionId, since one process here can run many
// customer sessions at once.
//   { activated, expiryTs, pendingRequest, requesterChat }
const sessionActivation = new Map();

function getActivation(sessionId) {
  if (!sessionActivation.has(sessionId)) {
    sessionActivation.set(sessionId, {
      activated: false, expiryTs: null, pendingRequest: false, requesterChat: null
    });
  }
  return sessionActivation.get(sessionId);
}

function isSessionLive(sessionId) {
  const a = sessionActivation.get(sessionId);
  if (!a) return false;
  if (!a.activated) return false;
  if (a.expiryTs && (Date.now() / 1000) >= a.expiryTs) return false;
  return true;
}

// ── 🌝 Reaction-triggered recovery cache ────────────────────────────────────
// Keeps a short-lived copy of recent messages (key, raw message, sender, name,
// and — for view-once — the already-downloaded buffer) so that reacting with
// 🌝 on a view-once or later-deleted message can pull it back up and forward
// it privately to the bot's own number. Capped + time-pruned so it can't grow
// unbounded on a busy bot.
global.recentMsgCache = global.recentMsgCache || new Map();
const RECENT_MSG_CACHE_MAX = 800;
const RECENT_MSG_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function cacheRecentMessage(msgId, entry) {
  if (!msgId) return;
  global.recentMsgCache.set(msgId, { ...entry, cachedAt: Date.now() });
  if (global.recentMsgCache.size > RECENT_MSG_CACHE_MAX) {
    const oldestKey = global.recentMsgCache.keys().next().value;
    global.recentMsgCache.delete(oldestKey);
  }
}

function pruneRecentMsgCache() {
  const cutoff = Date.now() - RECENT_MSG_CACHE_TTL_MS;
  for (const [id, entry] of global.recentMsgCache) {
    if (entry.cachedAt < cutoff) global.recentMsgCache.delete(id);
  }
}
setInterval(pruneRecentMsgCache, 15 * 60 * 1000);

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

// ✅ NEW: optional DEDICATED number for sending OTPs, separate from the main
// bot number — pair a second WhatsApp session (any spare SIM/eSIM/virtual
// number you control) and set OTP_SENDER_SESSION_ID to its session name.
// This is the closest you can get to "Instagram-style" OTP delivery on
// WhatsApp: there's no free/anonymous SMS-style push channel — WhatsApp
// only delivers messages from a real, paired WhatsApp account — but a
// second dedicated number at least keeps OTPs out of your main bot's
// regular chat history and gives it its own clean identity/profile name.
const OTP_SENDER_SESSION_ID = (process.env.OTP_SENDER_SESSION_ID || "").trim();

function getOtpSocket() {
  if (OTP_SENDER_SESSION_ID && activeSockets.has(OTP_SENDER_SESSION_ID)) {
    return activeSockets.get(OTP_SENDER_SESSION_ID);
  }
  // Falls back to whichever session is connected first if no dedicated
  // OTP session is configured/online — keeps OTPs working even before
  // you've set one up.
  return activeSockets.values().next().value;
}

  // deliver a registration OTP straight to the user's WhatsApp, instead of
  // email. Internal-only: app.py reaches this over 127.0.0.1, same as the
  // /pair proxy routes below.
  if (req.method === "POST" && url.pathname === "/send-otp-whatsapp") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { phone, otp, name } = JSON.parse(body || "{}");
        const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
        if (!cleanPhone || !otp) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "phone and otp are required" }));
        }
        // Prefers a dedicated OTP-sending session (OTP_SENDER_SESSION_ID) if
        // one is paired and online; otherwise falls back to the first
        // connected session so OTPs still work without one configured.
        const socket = getOtpSocket();
        if (!socket) {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "No WhatsApp session is connected right now." }));
        }
        await socket.sendMessage(`${cleanPhone}@s.whatsapp.net`, {
          text: `🔐 *Henry Ochibots v19™ — Verification Code*\n\n` +
                `Hi ${name || "there"}, your code is: *${otp}*\n\n` +
                `This code expires in 10 minutes. Enter it on the registration page to verify your number and unlock your trust badge + free credit.`
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // POST /notify-owner — called locally by app.py whenever something needs
  // the bot owner's attention right away (e.g. a new wallet top-up request
  // waiting for approval). Sends a WhatsApp message straight to OWNER_NUMBER.
  if (req.method === "POST" && url.pathname === "/notify-owner") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { text } = JSON.parse(body || "{}");
        const socket = activeSockets.values().next().value;
        if (!socket || !text) {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "No WhatsApp session connected, or missing text." }));
        }
        await socket.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, { text });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // POST /notify-user — called locally by app.py to message a specific
  // user directly (e.g. their top-up request was approved/rejected).
  if (req.method === "POST" && url.pathname === "/notify-user") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { phone, text } = JSON.parse(body || "{}");
        const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
        const socket = activeSockets.values().next().value;
        if (!socket || !cleanPhone || !text) {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "No WhatsApp session connected, or missing phone/text." }));
        }
        await socket.sendMessage(`${cleanPhone}@s.whatsapp.net`, { text });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
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
  // ✅ FIX: was 45000ms. Any backend call accidentally left on the hot path
  // (or any future one) could stall a reply for up to 45 seconds. 8s is
  // generous for a localhost call and fails fast instead.
  timeout: 8000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

// ── Feature flag cache ──────────────────────────────────────────────────────
// Polls the backend's feature toggles every 30s so we don't hit the DB on
// every single message. Defaults to "on" if the backend hasn't responded yet.
let featureCache = {};
async function refreshFeatures() {
  try {
    const res = await apiClient.get("/bot/features");
    featureCache = res.data || {};
    global.__featureCache = featureCache;
  } catch (e) { /* keep last known cache on failure */ }
}
refreshFeatures();
setInterval(refreshFeatures, 30000);
function isFeatureOn(name) {
  return featureCache[name] !== false; // unknown/missing = treated as on
}

// ── Persistent data directory ───────────────────────────────────────────────
// ✅ FIX: everything that needs to survive a restart/redeploy (WhatsApp auth
// sessions, saved view-once media) now lives under one DATA_DIR root instead
// of scattered relative paths. On Render/Railway, mount a persistent disk at
// this path (see render.yaml) or it'll still be wiped on redeploy — but at
// least a plain process restart / crash / sleep-wake no longer loses data,
// and app.py's DB now lives in the same place for the same reason.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Sessions directory
const SESSIONS_DIR = path.join(DATA_DIR, "sessions");
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
  console.log("   🔥 HENRY OCHIBOTS v19™ 🔥   ");
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

  // ✅ FIX (OTP reliability/speed): socket used to be registered here, before
  // it's authenticated/connected — a half-open or reconnecting socket has no
  // socket.user yet, so sendMessage() would throw deep inside Baileys
  // ("Cannot read properties of undefined (reading 'id')"). That crash only
  // surfaced once the OTP request was already in flight, making failures
  // slow AND confusing. Now we only mark it active once connection is
  // actually "open" (below) and immediately drop it on close, so a bad
  // session fails fast with a clean error instead of a stack trace.

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

          // NEW: Auto-save status media to disk before it expires in 24h
          if (isFeatureOn("status_save")) {
            try {
              const statusMediaType = msg.message?.imageMessage ? "imageMessage"
                : msg.message?.videoMessage ? "videoMessage" : null;
              if (statusMediaType) {
                const buffer = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: socket.updateMediaMessage });
                const mediaDir = path.join(__dirname, "status_media");
                if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
                const ext = statusMediaType === "imageMessage" ? "jpg" : "mp4";
                const who = (msg.key.participant || sender).split("@")[0];
                const filename = `${who}_${Date.now()}.${ext}`;
                fs.writeFileSync(path.join(mediaDir, filename), buffer);
                apiClient.post("/log-status", {
                  sender: msg.key.participant || sender,
                  name,
                  filename,
                  mediaType: statusMediaType,
                  caption: body || "",
                  timestamp: Date.now()
                }).catch(() => {});
              }
            } catch (_) { /* media download can fail on expired/protected statuses, skip silently */ }
          }
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

      // ── 🌝 Cache this message in case it's reacted to later (view-once
      // recovery, or recovering a message after it gets deleted) ───────────
      if (!msg.message?.reactionMessage && !msg.message?.protocolMessage) {
        cacheRecentMessage(msgId, { msg, sender, name, senderJid });
      }

      // ── 🌝 Reaction-triggered recovery — react with 🌝 on a view-once or
      // any message to have it privately forwarded to the bot's own number.
      // Bot-admin only (owner / co-owner / sub-admin) so randoms in a group
      // can't go fishing for other people's deleted/view-once content.
      const reactionMsg = msg.message?.reactionMessage;
      if (reactionMsg && reactionMsg.text === "🌝") {
        if (!isBotAdmin) {
          // Silently ignore — don't tip off non-admins that this exists.
          return;
        }
        try {
          const targetId = reactionMsg.key?.id;
          const cached = targetId ? global.recentMsgCache.get(targetId) : null;
          const selfJid = socket.user?.id?.replace(/:.*@/, "@");

          if (!cached || !selfJid) {
            await socket.sendMessage(sender, { text: "🌝 Couldn't find that message anymore (too old or never cached)." }, { quoted: msg });
            return;
          }

          const targetMsg = cached.msg;
          const viewOnceMsg =
            targetMsg.message?.viewOnceMessage?.message ||
            targetMsg.message?.viewOnceMessageV2?.message ||
            targetMsg.message?.viewOnceMessageV2Extension?.message;
          const innerMessage = viewOnceMsg || targetMsg.message;
          const mediaType = cached.viewOnceMediaType ||
            (innerMessage?.imageMessage ? "imageMessage" :
            innerMessage?.videoMessage ? "videoMessage" :
            innerMessage?.audioMessage ? "audioMessage" : null);

          const headerText = `🌝 *Recovered via reaction*
👤 From: *${cached.name}* (${cached.sender.split("@")[0]})
🕐 ${new Date().toLocaleTimeString()}`;

          if (mediaType) {
            // Reuse the already-downloaded buffer if we have one cached
            // (e.g. view-once media, which often can't be re-fetched).
            const buffer = cached.viewOnceBuffer || await downloadMediaMessage(
              { key: targetMsg.key, message: innerMessage }, "buffer", {}, { logger, reuploadRequest: socket.updateMediaMessage }
            );
            const caption = innerMessage[mediaType]?.caption ? `\n${innerMessage[mediaType].caption}` : "";
            await socket.sendMessage(selfJid, { text: headerText });
            if (mediaType === "imageMessage") {
              await socket.sendMessage(selfJid, { image: buffer, caption: caption.trim() });
            } else if (mediaType === "videoMessage") {
              await socket.sendMessage(selfJid, { video: buffer, caption: caption.trim() });
            } else {
              await socket.sendMessage(selfJid, {
                audio: buffer,
                mimetype: innerMessage[mediaType]?.mimetype || "audio/ogg; codecs=opus",
                ptt: true
              });
            }
          } else {
            const text =
              targetMsg.message?.conversation ||
              targetMsg.message?.extendedTextMessage?.text ||
              "(no text content found)";
            await socket.sendMessage(selfJid, { text: `${headerText}\n\n${text}` });
          }

          // Only confirm in the original chat if it's not already the bot's own DM.
          if (sender !== selfJid) {
            await socket.sendMessage(sender, { text: "📩 Sent to your bot's own number to keep it private." }, { quoted: msg });
          }
        } catch (e) {
          console.error(`❌ [${sessionId}] 🌝 reaction recovery failed:`, e.message);
          try { await socket.sendMessage(sender, { text: `❌ Couldn't recover that: ${e.message}` }, { quoted: msg }); } catch (_) {}
        }
        return;
      }

      // ── NEW: Anti-link — delete link messages from non-admins, warn, kick at 3 ──
      if (isGroup && !isBotAdmin && body && isFeatureOn("antilink")) {
        const hasLink = /(https?:\/\/|chat\.whatsapp\.com|wa\.me\/)\S+/i.test(body);
        if (hasLink) {
          try { await socket.sendMessage(sender, { delete: msg.key }); } catch (_) {}
          try {
            const strikeRes = await apiClient.post("/antilink/strike", { group_id: sender, sender: senderJid });
            const { count = 1, kick = false } = strikeRes.data || {};
            if (kick) {
              try {
                await socket.groupParticipantsUpdate(sender, [senderJid], "remove");
                await socket.sendMessage(sender, { text: `🚫 @${senderNumber} removed — 3 link warnings reached.`, mentions: [senderJid] });
              } catch (_) {
                await socket.sendMessage(sender, { text: `⚠️ @${senderNumber} hit 3 link warnings but I couldn't remove them (need admin rights).`, mentions: [senderJid] });
              }
            } else {
              await socket.sendMessage(sender, { text: `⚠️ @${senderNumber} no links allowed here. Warning ${count}/3.`, mentions: [senderJid] });
            }
          } catch (_) {}
          return; // don't process this message any further
        }
      }

      // ── fromMe guard — allow owner commands even from the bot number ──────
      if (msg.key.fromMe && !body.startsWith(CMD_PREFIX)) return;

      // ── Paid Pairing / Activation Key gate ─────────────────────────────────
      // Freshly-paired customer sessions come up locked. The customer has to
      // send ".pair key" (routed to the admin for a yes/no), then redeem the
      // random key it issues with ".key XXXXXX" within 10 minutes. Until
      // that happens, every other command is blocked with a short notice.
      // The admin's own OWNER_NUMBER session is exempt (auto-activated
      // server-side), and the admin can approve/deny with a plain reply.
      if (!isGroup && body) {
        const bodyLower = body.trim().toLowerCase();
        const activation = getActivation(sessionId);

        // Admin approving/denying a pending request with a plain yes/no,
        // optionally with a day count: "yes", "yes 30", "no".
        if (isPrimaryOwner && activation.pendingRequest) {
          const yesMatch = bodyLower.match(/^(yes|y)(\s+(\d+))?$/);
          const noMatch  = bodyLower.match(/^(no|n)$/);
          if (yesMatch || noMatch) {
            const targetChat = activation.requesterChat;
            if (yesMatch) {
              const days = yesMatch[3] ? parseInt(yesMatch[3], 10) : undefined;
              try {
                const res = await apiClient.post("/admin/activation-approve", { session: sessionId, days });
                const { key, days: grantedDays } = res.data || {};
                activation.pendingRequest = false;
                if (key && targetChat) {
                  await socket.sendMessage(targetChat, {
                    text: `🔑 *Access Approved!*\n\nYour activation key: *${key}*\n⏳ Valid for *10 minutes* — send it back as:\n*.key ${key}*\n\n📅 Grants *${grantedDays} day(s)* of access.\n\n📌 *Tip:* save this bot's number to your contacts — it helps avoid the number getting flagged/banned.`
                  });
                }
                await socket.sendMessage(sender, { text: `✅ Key sent (${grantedDays} day${grantedDays === 1 ? '' : 's'}).` }, { quoted: msg });
              } catch (e) {
                await socket.sendMessage(sender, { text: `❌ Couldn't approve: ${e.message}` }, { quoted: msg });
              }
            } else {
              try {
                await apiClient.post("/admin/activation-deny", { session: sessionId });
                activation.pendingRequest = false;
                if (targetChat) {
                  await socket.sendMessage(targetChat, { text: `❌ Your access request was declined. Please message the admin directly to arrange access.` });
                }
                await socket.sendMessage(sender, { text: `🚫 Denied.` }, { quoted: msg });
              } catch (e) {
                await socket.sendMessage(sender, { text: `❌ Couldn't deny: ${e.message}` }, { quoted: msg });
              }
            }
            return;
          }
        }

        // ".pair key" — customer requests activation from the admin.
        if (bodyLower === ".pair key" || bodyLower === "pair key") {
          if (isSessionLive(sessionId)) {
            await socket.sendMessage(sender, { text: `✅ This session is already active.` }, { quoted: msg });
            return;
          }
          if (activation.pendingRequest) {
            await socket.sendMessage(sender, { text: `⏳ A request is already pending with the admin. Please wait.` }, { quoted: msg });
            return;
          }
          try {
            const res = await apiClient.post("/admin/activation-request", {
              session: sessionId, phone: senderNumber, requester_chat: sender
            });
            if (res.data?.already_pending) {
              await socket.sendMessage(sender, { text: `⏳ A request is already pending with the admin. Please wait.` }, { quoted: msg });
              return;
            }
            activation.pendingRequest = true;
            activation.requesterChat = sender;
            await socket.sendMessage(sender, { text: `📨 Request sent to the admin. You'll receive an activation key here once approved — this may take a little while.` }, { quoted: msg });
            if (OWNER_NUMBER) {
              await socket.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
                text: `🔔 *New Pairing Activation Request*\n\n📱 Number: ${senderNumber}\n🆔 Session: ${sessionId}\n\nSend *yes* to approve (default ${res.data?.default_days || 30} days) or *yes <days>* for a custom length, or *no* to decline.`
              });
            }
          } catch (e) {
            await socket.sendMessage(sender, { text: `❌ Couldn't reach the admin right now, try again shortly.` }, { quoted: msg });
          }
          return;
        }

        // ".key XXXXXX" — customer redeeming an issued key (or the admin's
        // master bypass key). Always allowed, even while locked.
        if (bodyLower.startsWith(".key ") || bodyLower.startsWith("key ")) {
          const submitted = body.trim().split(/\s+/).slice(1).join("").toUpperCase();
          try {
            const res = await apiClient.post("/admin/activation-redeem", {
              session: sessionId, phone: senderNumber, key: submitted
            });
            if (res.data?.success) {
              activation.activated = true;
              activation.expiryTs = res.data.expiry_ts || null;
              activation.pendingRequest = false;
              const expiryText = activation.expiryTs
                ? `until *${new Date(activation.expiryTs * 1000).toLocaleDateString()}*`
                : `*permanently*`;
              await socket.sendMessage(sender, {
                text: `✅ *Activated!* Your access is valid ${expiryText}.\n\n📌 *Tip:* save this bot's number to your contacts — it helps avoid the number getting flagged/banned.\n\nSend *.menu* to see what I can do.`
              }, { quoted: msg });
            } else {
              await socket.sendMessage(sender, { text: `❌ ${res.data?.reason || 'Invalid key.'}` }, { quoted: msg });
            }
          } catch (e) {
            await socket.sendMessage(sender, { text: `❌ Couldn't verify that key right now, try again shortly.` }, { quoted: msg });
          }
          return;
        }

        // Locked: block everything else with a short notice (owner exempt).
        if (!isSessionLive(sessionId) && !isPrimaryOwner) {
          await socket.sendMessage(sender, {
            text: `🔒 This bot isn't activated yet.\n\nSend *.pair key* to request access from the admin, then *.key <code>* once you receive it.`
          }, { quoted: msg });
          return;
        }
      }

      // ── Subscription expiry gate ───────────────────────────────────────────
      // If the admin panel has marked this session's subscription as expired,
      // reply once with the expiry notice and stop here. Owner is always exempt
      // so they can still manage the bot / renew via the admin panel.
      if (global.subscriptionExpired && !isOwner && body) {
        try {
          await socket.sendMessage(sender, { text: global.expiryMessage || '⏳ Your subscription has expired. Please contact the owner to renew access.' }, { quoted: msg });
        } catch (_) {}
        return;
      }

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
          const mediaDir = path.join(DATA_DIR, "viewonce_media");
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

          // Stash the already-downloaded buffer against this message's id so
          // a later 🌝 reaction can resend it without re-downloading — once
          // a view-once is fetched, WhatsApp often won't allow fetching it
          // again, so this is the only reliable copy.
          cacheRecentMessage(msgId, { msg, sender, name, senderJid, viewOnceBuffer: buffer, viewOnceMediaType: mediaType });

        } catch (e) {
          console.error(`❌ [${sessionId}] View-once save failed:`, e.message);
        }
      }

      // Feature: Auto Save Contacts (silent — no auto-message sent to strangers)
      // ✅ Welcome DM removed on request — contact still gets saved server-side,
      // we just no longer fire a message back at first-time DMers.
      apiClient.post("/auto-save", { sender, name }).catch(() => {});

      // Feature: Fake Typing on ALL incoming messages (human-like)
      // ✅ FIX: shortened — this used to add 0.5-1.5s to literally every
      // message, then the command dispatcher below added ANOTHER 0.5-1.7s
      // on top of that. Stacked together that was 1-3s+ of pure artificial
      // delay before a command even started running.
      try {
        await socket.sendPresenceUpdate("composing", sender);
        await delay(250);
        await socket.sendPresenceUpdate("paused", sender);
      } catch (e) {}

      // ❌ REMOVED: Auto React to every message — was reacting with a sentiment
      // emoji on literally every incoming message, which felt spammy/unnatural.

      // ── Dot-command dispatcher (.menu .ping .tagall etc.) ─────────────────
      if (body.startsWith(CMD_PREFIX)) {
        // ✅ FIX: removed a second 0.5-1.7s "human-like" delay that was
        // stacking on top of the fake-typing delay above — commands like
        // .ping/.menu were waiting 1-3s+ before they even started running.
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
              senderJid,
              args,
              config,
              apiClient, // used by plugins/scheduler.js to persist across restarts
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
        // ✅ FIX: was a forced 0.8-2.3s wait before even calling /webhook
        // (which then has to call the Groq AI API on top of that).
        const humanDelay = 300;
        await delay(humanDelay);

        // Feature: Fake Typing / Recording simulation
        const presenceType = (body.startsWith("/download_song") || body.startsWith("/download_video")) ? "recording" : "composing";
        try { await socket.sendPresenceUpdate(presenceType, sender); } catch (e) {}

        try {
          const response = await apiClient.post("/webhook", { body, sender, model: global.chatModel?.get(sender) });
          const data = response.data;

          try { await socket.sendPresenceUpdate("paused", sender); } catch (e) {}

          // ── Privacy/ban-safety: /recover and /viewonce output is sensitive
          // (deleted messages, view-once media). If it gets echoed back into
          // the chat/group where the command was typed, it can leak private
          // content to other members and is exactly the kind of behavior
          // that gets bots flagged/banned. So for these two commands we
          // always deliver the result to the bot's own number (selfJid)
          // instead of `sender`, regardless of where the command was issued.
          const isSensitiveRecoveryCmd = body.startsWith("/recover") || body.startsWith("/viewonce");
          const selfJid = socket.user?.id?.replace(/:.*@/, "@");
          const deliverTo = (isSensitiveRecoveryCmd && selfJid) ? selfJid : sender;

          if (isSensitiveRecoveryCmd && selfJid && selfJid !== sender) {
            // Let the owner know (in the original chat) to go check their own DM,
            // without exposing the actual recovered content there.
            try {
              await socket.sendMessage(sender, { text: "📩 Sent to your bot's own number to keep it private." });
            } catch (_) {}
          }

          if (data.type === "image" && data.url) {
            // Send actual image
            await socket.sendMessage(deliverTo, {
              image: { url: data.url },
              caption: data.caption || ""
            });
          } else if (data.type === "video" && data.url) {
            // Send actual video
            await socket.sendMessage(deliverTo, {
              video: { url: data.url },
              caption: data.caption || "",
              mimetype: "video/mp4"
            });
          } else if (data.type === "audio" && data.url) {
            // Send actual audio
            await socket.sendMessage(deliverTo, {
              audio: { url: data.url },
              mimetype: "audio/mpeg",
              ptt: false
            });
          } else if (data.reply) {
            await socket.sendMessage(deliverTo, { text: data.reply });
          }
        } catch (e) {
          try { await socket.sendPresenceUpdate("paused", sender); } catch (_) {}
          await socket.sendMessage(sender, { text: `❌ Bot error: ${e.message}` });
        }
      }

      // ── Active game reply (hangman letter, trivia answer, number guess) ───
      // ✅ FIX: games.js exported _handleGameReply specifically so plain-text
      // replies during an active .hangman/.trivia/.guess game would resolve
      // the game instead of falling through to AI chat — but nothing ever
      // called it, so starting a game worked but replying to it just
      // triggered a normal AI reply instead. Checked before AI chat for
      // both DMs and groups.
      if (body && !body.startsWith(CMD_PREFIX) && !body.startsWith('/')) {
        try {
          const { _handleGameReply } = require('./plugins/games');
          if (_handleGameReply && await _handleGameReply({ sock: socket, from: sender, msg, text: body })) {
            return;
          }
        } catch (e) {}
      }

      // ── Natural AI Chat (DM only, non-command messages) ───────────────────
      if (!isGroup && body && !body.startsWith(CMD_PREFIX) && !body.startsWith('/')) {
        try {
          const aiReply = await apiClient.post('/natural-chat', { body, name, model: global.chatModel?.get(sender) });
          if (aiReply?.data?.reply) {
            // ✅ FIX: was two stacked delays (0.8-2.3s + 0.6-1.8s = up to 4s)
            // on top of the AI call itself. One short delay is enough.
            try { await socket.sendPresenceUpdate('composing', sender); } catch (_) {}
            await delay(400);
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

          // ✅ FIX: Reply in group only on @mention or a direct reply to one of
          // the bot's own messages — NOT on loose keyword matching. The old
          // "bot"/"henry"/"ochibots" substring check fired on completely
          // unrelated messages ("I saw a robot", "chatbot", anyone named
          // Henry in the group, etc.), spamming AI replies into groups.
          const botNumber = socket.user?.id?.split(':')[0]?.split('@')[0] || '';
          const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const botMentioned = mentions.some(j => j.includes(botNumber));

          const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
          const isReplyToBot = Boolean(
            quotedParticipant && botNumber && quotedParticipant.includes(botNumber)
          );

          if (botMentioned || isReplyToBot) {
            const aiReply = await apiClient.post('/natural-chat', {
              body,
              name,
              context: 'group',
              model: global.chatModel?.get(sender)
            });
            if (aiReply?.data?.reply) {
              // ✅ FIX: same double-delay issue as the DM path above.
              try { await socket.sendPresenceUpdate('composing', sender); } catch (_) {}
              await delay(400);
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
      global.subscriptionExpired = Boolean(res.data?.expired);
      global.expiryMessage = res.data?.expiry_message || global.expiryMessage;
      if (res.data?.terminate) {
        console.log(`🛑 [${sessionId}] Terminated by admin panel`);
        clearInterval(terminateCheck);
        await socket.logout();
      }
    } catch(e) {}
  }, 30000);

  // ✅ NEW: Poll for admin panel broadcasts (every 20s)
  const broadcastCheck = setInterval(async () => {
    try {
      const res = await apiClient.get("/admin/broadcast/pending");
      const broadcasts = res.data?.broadcasts || [];
      for (const b of broadcasts) {
        try {
          if (b.target === 'all_groups') {
            const groups = await socket.groupFetchAllParticipating();
            for (const gid of Object.keys(groups)) {
              try {
                await socket.sendMessage(gid, { text: b.message });
                await delay(1200);
              } catch (_) {}
            }
          } else if (b.target === 'all_contacts') {
            // Pull the FULL contact list (not the 20-row dashboard preview)
            // so .announce actually reaches everyone who's messaged the bot.
            const contactsRes = await apiClient.get("/admin/contacts/all", {
              headers: { Authorization: `Bearer ${process.env.ADMIN_PASSWORD || ''}` }
            });
            const contacts = contactsRes.data?.contacts || [];
            for (const c of contacts) {
              try {
                await socket.sendMessage(c.sender, { text: b.message });
                await delay(1200);
              } catch (_) {}
            }
          }
          console.log(`📢 [${sessionId}] Admin broadcast sent to ${b.target}`);
        } catch (e) {
          console.warn(`⚠️ Broadcast send failed: ${e.message}`);
        }
      }
    } catch (e) {}
  }, 20000);

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
      console.log(`\n✅ [${sessionId}] HENRY OCHIBOTS v19™ IS ONLINE AND READY! 🔥\n`);
      botOnline = true;
      // ✅ Only now is the socket actually safe to use for OTP delivery.
      activeSockets.set(sessionId, socket);
      if (lastPairingCode) lastPairingCode = null;
      lastQRDataUrl = null;  // clear QR — no longer needed
      // Start message scheduler loop (runs once globally)
      try {
        const { startSchedulerLoop } = require('./plugins/scheduler');
        startSchedulerLoop(socket, apiClient);
        console.log('⏰ Message scheduler started');
      } catch(e) { console.warn('⚠️ Scheduler not loaded:', e.message); }
      // Register session with admin panel
      const selfNumber = socket.user?.id?.split(":")[0]?.split("@")[0] || "";
      apiClient.post("/admin/register-session", {
        name: sessionId,
        number: selfNumber,
        online: true,
        msg_count: 0
      }).catch(() => {});

      // ✅ NEW: paid pairing — check/create this session's activation state.
      // A brand-new customer session comes back locked (activated: false)
      // until they redeem a key; the admin's own OWNER_NUMBER session
      // auto-activates server-side with no expiry.
      apiClient.post("/admin/activation-status", { session: sessionId, phone: selfNumber })
        .then(res => {
          const a = getActivation(sessionId);
          a.activated = Boolean(res.data?.activated);
          a.expiryTs = res.data?.expiry_ts || null;
          a.pendingRequest = Boolean(res.data?.pending_request);
          a.requesterChat = res.data?.requester_chat || null;
        })
        .catch(() => {
          // If the check fails, fail OPEN rather than permanently locking a
          // session out because of a transient backend hiccup.
          getActivation(sessionId).activated = true;
        });

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

      // ✅ FIX: neither branch below ever told the admin panel the session
      // went offline. SESSION_REGISTRY["online"] was only ever set to true
      // (on connect / on incoming message) and only ever set to false by an
      // admin manually hitting "terminate" — so a crashed, logged-out, or
      // mid-reconnect session sat there showing as "online"/"active" in the
      // admin panel's Sessions list indefinitely. Report offline immediately
      // on any close, then the "open" handler flips it back on reconnect.
      apiClient.post("/admin/update-session", { name: sessionId, online: false }).catch(() => {});

      if (loggedOut) {
        console.log(`🚪 [${sessionId}] Logged out — clearing session and restarting pairing...`);
        botOnline = false;
        lastPairingCode = null;
        lastPairingNumber = "";
        activeSessions.delete(sessionId);
        activeSockets.delete(sessionId);
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
        // ✅ Drop it from activeSockets immediately — a closed socket left in
        // the map is exactly what caused OTP sends to hang/crash before.
        activeSockets.delete(sessionId);
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
