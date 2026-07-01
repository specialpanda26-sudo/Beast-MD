'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom }  = require('@hapi/boom');
const pino      = require('pino');
const chalk     = require('chalk');
const express   = require('express');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');

const config  = require('./config');
const db      = require('./lib/database');
const { getText, getSender, isOwner } = require('./lib/utils');
const { commands } = require('./plugins/commands');
const { handleAntiLink, handleAntiBadWord, autoReact, autoReadStatus, handleGroupUpdate } = require('./plugins/antis');
const { askAI }  = require('./lib/ai');
const games      = require('./lib/games');

// ── Dirs ──────────────────────────────────────────────────────────────────────
const SESSION_DIR = path.join(__dirname, 'session');
const TEMP_DIR    = path.join(__dirname, 'temp');
fs.mkdirSync(SESSION_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR,    { recursive: true });

const logger = pino({ level: 'silent' });

// ── State ─────────────────────────────────────────────────────────────────────
let pairingCode  = null;
let pairingPhone = null;
let botReady     = false;
let activeSock   = null;
let sessionCount = 0;

// ── Web server ────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
app.use(express.json());

app.get('/',       (_req, res) => res.redirect('/pair'));
app.get('/pair',   (_req, res) => res.send(pairHTML()));
app.get('/status', (_req, res) => res.json({
  ready: botReady,
  code:  pairingCode,
  sessions: sessionCount,
  online: botReady,
}));

app.post('/request-code', async (req, res) => {
  const phone = (req.body.phone || '').replace(/[^0-9]/g, '');
  if (!phone || phone.length < 7)
    return res.json({ error: 'Enter a valid number with country code' });

  // Clear any previous stale session
  pairingCode  = null;
  pairingPhone = phone;

  res.json({ ok: true });

  if (activeSock && !activeSock.authState?.creds?.registered) {
    await requestCode(activeSock);
  } else {
    if (activeSock) { try { activeSock.end(); } catch {} }
    setTimeout(() => startBot(), 500);
  }
});

// Abandon session when user leaves page without pairing
app.post('/pair-abandon', (_req, res) => {
  if (!botReady) {
    pairingCode  = null;
    pairingPhone = null;
  }
  res.json({ ok: true });
});

// ── Request pairing code ──────────────────────────────────────────────────────
async function requestCode(sock) {
  if (!pairingPhone) return;
  try {
    await new Promise(r => setTimeout(r, 3000));
    const code = await sock.requestPairingCode(pairingPhone);
    pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
    console.log(chalk.bgGreen.black(`\n\n  🔑 PAIRING CODE: ${pairingCode}  \n`));
  } catch (e) {
    console.error(chalk.red('[Pairing Error]'), e.message);
    pairingCode = null;
  }
}

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  const ramUsed  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
  const cpuModel = os.cpus()[0]?.model?.trim()?.split(' ')[0] || 'Cloud';
  console.log(chalk.green(`
╔══════════════════════════════════════════╗
║                                          ║
║   🔥 HENRY AGENT19V™                    ║
║   by Henrydev.ke | +254775351698         ║
║   WhatsApp Ultimate Bot v${config.version}         ║
║                                          ║
║   Prefix: ${config.prefix}  Mode: ${config.botMode}                  ║
║   CPU: ${cpuModel}  RAM: ${ramUsed}MB/${ramTotal}MB       ║
╚══════════════════════════════════════════╝
`));
}

// ── Start bot ─────────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth:  state,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    getMessage: async () => ({ conversation: '' }),
  });

  activeSock = sock;

  if (pairingPhone && !state.creds?.registered) {
    requestCode(sock);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      botReady    = true;
      pairingCode = null;
      pairingPhone = null;
      sessionCount++;
      const user = sock.user;
      const ramUsed  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
      const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
      const cpuLoad  = os.loadavg()[0].toFixed(2);
      const uptime   = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);
      console.log(chalk.green(`\n✅ Connected: ${user?.name} | +${user?.id?.split(':')[0]}`));
      try {
        await sock.sendMessage(config.ownerJid, {
          text:
`╔══════════════════════════════════════╗
║  🔥 *HENRY AGENT19V™ IS ONLINE!* 🔥 ║
║       _by Henrydev.ke_               ║
╚══════════════════════════════════════╝

✅ *Bot connected successfully!*
📞 *Number:* +${user?.id?.split(':')[0]}
🔰 *Prefix:* *${config.prefix}*
⚙️ *Mode:* *${config.botMode}*
📅 *Time:* ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *LIVE SYSTEM STATS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ *CPU:* ${os.cpus()[0]?.model?.trim() || 'Cloud Server'}
🧠 *Cores:* ${os.cpus().length}
📊 *CPU Load:* ${cpuLoad}%
💾 *RAM Used:* ${ramUsed}MB / ${ramTotal}MB
🟢 *RAM Free:* ${(os.freemem() / 1024 / 1024).toFixed(0)}MB
⏱️ *Uptime:* ${h}h ${m}m ${s}s
🏠 *Platform:* ${os.platform()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *AUTO-FEATURES ACTIVE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auto-read messages
✅ Auto-view & like statuses
✅ Auto-react (emoji)
✅ Anti-call protection
✅ AI DM chat (Swahili/Sheng/EN)
✅ Anti-link & anti-bad-word (groups)
✅ Welcome/goodbye messages

Type *${config.prefix}menu* to see all commands.
_Henry Agent19v™ — Henrydev.ke_ 🔥`,
        });
      } catch {}
    }

    if (connection === 'close') {
      botReady = false;
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reconnect = reason !== DisconnectReason.loggedOut;
      console.log(chalk.red(`\n❌ Disconnected. Code: ${reason}. Reconnect: ${reconnect}`));
      if (reconnect) {
        setTimeout(() => startBot(), 5000);
      } else {
        console.log(chalk.red('🔴 Logged out. Delete session/ folder and restart.'));
        process.exit(1);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Messages ────────────────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const from    = msg.key.remoteJid;
      const isGroup = from?.endsWith('@g.us');
      const sender  = getSender(msg);
      const text    = getText(msg);
      const fromMe  = msg.key.fromMe;

      // Status updates
      if (from === 'status@broadcast') {
        await autoReadStatus(sock, msg);
        continue;
      }

      // Skip fromMe messages unless it's a command from owner
      if (fromMe && !text.startsWith(config.prefix)) continue;

      // Auto react in groups (5% chance)
      if (isGroup && Math.random() < 0.05) await autoReact(sock, msg);

      let isAdmin = false;
      if (isGroup) {
        try {
          const meta = await sock.groupMetadata(from);
          const mem  = meta.participants.find(p => p.id === sender);
          isAdmin    = !!mem?.admin;
          db.getGroup(from);
        } catch {}
        if (await handleAntiLink(sock, msg, from, sender))    continue;
        if (await handleAntiBadWord(sock, msg, from, sender)) continue;
      }

      // Game answer checks
      if (text && !text.startsWith(config.prefix)) {
        const tr = games.checkTrivia(from, text);
        if (tr?.correct) {
          await sock.sendMessage(from, {
            text: `🎉 Correct! Answer was *${tr.answer}* — @${sender.split('@')[0]} wins! 🏆`,
            mentions: [sender],
          }, { quoted: msg });
        }
        const gr = games.checkGuess(from, text);
        if (gr) {
          if (gr.correct) {
            await sock.sendMessage(from, { text: `🎯 Yes! The number was *${gr.num}* in ${gr.tries} tries! 🏆` }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: `💡 Go *${gr.hint}* (attempt #${gr.tries})` }, { quoted: msg });
          }
        }

        // ── Natural AI chat for DMs ────────────────────────────────────────
        if (!isGroup && text && !fromMe) {
          try {
            const humanDelay = Math.floor(Math.random() * 1200) + 600;
            await new Promise(r => setTimeout(r, humanDelay));
            try { await sock.sendPresenceUpdate('composing', from); } catch {}
            const reply = await askAI(sender, text);
            if (reply) {
              await new Promise(r => setTimeout(r, Math.floor(Math.random() * 800) + 400));
              try { await sock.sendPresenceUpdate('paused', from); } catch {}
              await sock.sendMessage(from, { text: reply }, { quoted: msg });
            }
          } catch (e) {
            console.error('[NaturalChat]', e.message);
          }
        }
        continue;
      }

      if (!text.startsWith(config.prefix)) continue;

      const [rawCmd, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
      const cmd = rawCmd?.toLowerCase();
      if (!cmd) continue;

      const senderIsOwner = isOwner(sender);
      const senderIsSudo  = db.isSudo(sender);
      const mode = db.getSetting('botMode', config.botMode);
      if (mode === 'private' && !senderIsOwner && !senderIsSudo) continue;
      if (mode === 'groups'  && !isGroup) continue;

      const quotedCtx = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = quotedCtx?.quotedMessage ? {
        key: {
          remoteJid:   from,
          id:          quotedCtx.stanzaId,
          participant: quotedCtx.participant,
        },
        message: quotedCtx.quotedMessage,
      } : null;

      if (commands[cmd]) {
        console.log(chalk.blue(`[CMD] ${config.prefix}${cmd}`) + chalk.gray(` | ${sender.split('@')[0]}`));
        try {
          await commands[cmd]({
            sock, msg, from, sender, args, text,
            isGroup, isAdmin,
            isOwner: senderIsOwner,
            isSudo:  senderIsSudo,
            quoted, config, db,
            prefix: config.prefix,
          });
        } catch (err) {
          console.error(`[ERR] ${cmd}:`, err.message);
          try { await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg }); } catch {}
        }
      }
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    await handleGroupUpdate(sock, update);
  });

  return sock;
}

// ── Pair page HTML ────────────────────────────────────────────────────────────
function pairHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Henry Agent19v™ — Link WhatsApp</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;background:#08090f;color:#e2eaf4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.bg{position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(124,58,237,0.15) 0%,transparent 70%);z-index:0;pointer-events:none}
.card{position:relative;z-index:1;background:rgba(16,17,26,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px 24px;width:100%;max-width:440px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.6)}
.logo{width:72px;height:72px;border-radius:50%;background:conic-gradient(from 0deg,#ff6b9d,#c44dff,#4d79ff,#00e5ff,#ff6b9d);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:spin 8s linear infinite}
@keyframes spin{to{filter:hue-rotate(360deg)}}
.logo-inner{width:58px;height:58px;border-radius:50%;background:#08090f;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#a78bfa;letter-spacing:1px;line-height:1.3}
h1{font-size:1.6rem;font-weight:800;background:linear-gradient(135deg,#fff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{color:#555;font-size:.82rem;margin-bottom:22px}
input{width:100%;padding:13px 15px;background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;color:#e2eaf4;font-size:1rem;margin-bottom:10px;outline:none;transition:border .2s}
input:focus{border-color:#7c3aed}
button{width:100%;padding:13px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;transition:opacity .2s}
button:disabled{opacity:.4;cursor:not-allowed}
.code-wrap{background:rgba(124,58,237,0.08);border:1.5px solid rgba(124,58,237,0.3);border-radius:12px;padding:18px;margin-top:16px;display:none;cursor:pointer}
.code-wrap:hover{background:rgba(124,58,237,0.15)}
.code{font-size:2.2rem;font-weight:900;letter-spacing:8px;font-family:monospace;background:linear-gradient(135deg,#a78bfa,#00cfff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;user-select:all}
.code-hint{font-size:.75rem;color:#555;margin-top:6px}
.timer{font-size:.8rem;color:#f59e0b;margin-top:8px}
.btn-row{display:flex;gap:8px;margin-top:10px}
.btn-copy{flex:1;padding:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer}
.btn-copy.copied{background:linear-gradient(135deg,#059669,#10b981)!important}
.btn-new{flex:1;padding:10px;background:transparent;border:1.5px solid rgba(255,255,255,0.12);color:#aaa;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer}
.status{margin-top:14px;padding:10px 14px;border-radius:8px;font-size:.88rem;display:none}
.ok{background:rgba(5,150,105,0.15);color:#34d399;border:1px solid rgba(5,150,105,0.3)}
.err{background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25)}
.steps{margin-top:20px;text-align:left;display:none}
.steps-title{font-size:.78rem;color:#a78bfa;text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:10px}
.step{display:flex;gap:10px;margin-bottom:8px;font-size:.85rem;color:#888;align-items:flex-start}
.step-n{min-width:20px;height:20px;border-radius:50%;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#a78bfa;flex-shrink:0}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(22,24,35,0.95);border:1px solid rgba(255,255,255,0.1);color:#e2eaf4;padding:10px 20px;border-radius:20px;font-size:.84rem;opacity:0;transition:all .25s;pointer-events:none;z-index:999;white-space:nowrap}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.footer{margin-top:20px;color:#333;font-size:.72rem}
</style>
</head>
<body>
<div class="bg"></div>
<div class="card">
  <div class="logo"><div class="logo-inner">HENRY<br>19v</div></div>
  <h1>Link Your WhatsApp</h1>
  <p class="sub">Henry Agent19v™ by Henrydev.ke — instant code, no QR scan</p>

  <input type="tel" id="phone" placeholder="e.g. 254712345678 (no + sign)" onkeydown="if(event.key==='Enter')getCode()"/>
  <button id="btn" onclick="getCode()">🔑 Get Pairing Code</button>

  <div class="code-wrap" id="codeBox" onclick="copyCode()">
    <div style="font-size:.75rem;color:#777;margin-bottom:6px">Your pairing code (tap to copy)</div>
    <div class="code" id="codeText">--------</div>
    <div class="code-hint">Tap to copy • Or use button below</div>
    <div class="timer" id="timer">Valid for 60s</div>
  </div>

  <div class="btn-row" id="btnRow" style="display:none">
    <button class="btn-copy" id="copyBtn" onclick="copyCode()">📋 Copy Code</button>
    <button class="btn-new" onclick="reset()">🔄 New Code</button>
  </div>

  <div class="status" id="st"></div>

  <div class="steps" id="steps">
    <div class="steps-title">How to link</div>
    <div class="step"><div class="step-n">1</div><span>Copy the 8-character code above</span></div>
    <div class="step"><div class="step-n">2</div><span>Open WhatsApp → ⋮ → <strong>Linked Devices</strong></span></div>
    <div class="step"><div class="step-n">3</div><span>Tap <strong>Link a Device</strong> → <strong>Link with phone number instead</strong></span></div>
    <div class="step"><div class="step-n">4</div><span>Enter the code — bot goes live! 🚀</span></div>
  </div>

  <div class="footer">Henry Agent19v™ v${config.version} • Henrydev.ke</div>
</div>
<div class="toast" id="toast"></div>

<script>
let currentCode = null;
let timerInterval = null;

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(window._tt);window._tt=setTimeout(()=>t.classList.remove('show'),2600);
}

function show(msg,cls){
  const el=document.getElementById('st');
  el.textContent=msg;el.className='status '+cls;el.style.display='block';
}

function reset(){
  clearInterval(timerInterval);
  currentCode=null;
  document.getElementById('phone').value='';
  document.getElementById('codeBox').style.display='none';
  document.getElementById('btnRow').style.display='none';
  document.getElementById('steps').style.display='none';
  document.getElementById('st').style.display='none';
  document.getElementById('btn').disabled=false;
  document.getElementById('btn').textContent='🔑 Get Pairing Code';
  fetch('/pair-abandon',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}}).catch(()=>{});
}

async function getCode(){
  const phone=document.getElementById('phone').value.replace(/\D/g,'');
  if(!phone||phone.length<7) return show('Please enter a valid number with country code','err');
  const btn=document.getElementById('btn');
  btn.disabled=true;btn.textContent='⏳ Requesting...';
  show('Connecting to WhatsApp...','ok');
  try{
    const r=await fetch('/request-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
    const d=await r.json();
    if(d.error){show(d.error,'err');btn.disabled=false;btn.textContent='🔑 Get Pairing Code';return;}
    show('⏳ Waiting for code (up to 20 seconds)...','ok');
    poll();
  }catch(e){
    show('Connection error: '+e.message,'err');
    btn.disabled=false;btn.textContent='🔑 Get Pairing Code';
  }
}

async function poll(){
  for(let i=0;i<25;i++){
    await new Promise(r=>setTimeout(r,2000));
    try{
      const r=await fetch('/status');
      const d=await r.json();
      if(d.ready&&currentCode){show('✅ Bot connected!','ok');return;}
      if(d.code&&d.code!==currentCode){
        currentCode=d.code;
        showCode(d.code);
        return;
      }
    }catch{}
  }
  show('⏰ Timed out. Check if bot is running, then try again.','err');
  document.getElementById('btn').disabled=false;
  document.getElementById('btn').textContent='🔑 Try Again';
}

function showCode(code){
  document.getElementById('codeText').textContent=code;
  document.getElementById('codeBox').style.display='block';
  document.getElementById('btnRow').style.display='flex';
  document.getElementById('steps').style.display='block';
  document.getElementById('btn').textContent='✅ Code Ready';
  show('✅ Code ready! Enter it in WhatsApp now.','ok');
  startTimer(60);
  // Auto-copy
  setTimeout(()=>copyCode(true),300);
}

function startTimer(sec){
  clearInterval(timerInterval);
  let rem=sec;
  const el=document.getElementById('timer');
  function tick(){
    if(rem<=0){clearInterval(timerInterval);el.textContent='Code expired — tap New Code';return;}
    el.textContent='Valid for '+rem+'s';rem--;
  }
  tick();timerInterval=setInterval(tick,1000);
}

async function copyCode(silent){
  const code=currentCode||document.getElementById('codeText').textContent.trim();
  if(!code||code==='--------') return;
  let ok=false;
  if(navigator.clipboard&&window.isSecureContext){
    try{await navigator.clipboard.writeText(code);ok=true;}catch{}
  }
  if(!ok){
    try{
      const el=document.createElement('input');el.setAttribute('readonly','');el.value=code;
      el.style.cssText='position:fixed;top:50%;left:50%;width:1px;height:1px;opacity:.01;font-size:16px';
      document.body.appendChild(el);el.focus();el.select();el.setSelectionRange(0,99999);
      ok=document.execCommand('copy');document.body.removeChild(el);
    }catch{}
  }
  if(!ok){
    try{
      const ta=document.createElement('textarea');ta.value=code;
      ta.style.cssText='position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);ta.focus();ta.select();
      ok=document.execCommand('copy');document.body.removeChild(ta);
    }catch{}
  }
  if(ok){
    const btn=document.getElementById('copyBtn');
    btn.className='btn-copy copied';btn.textContent='✅ Copied!';
    if(!silent) showToast('✅ Code copied to clipboard!');
    setTimeout(()=>{btn.className='btn-copy';btn.textContent='📋 Copy Code';},2500);
  }else if(!silent){
    window.prompt('Long-press to copy:',code);
  }
}

// Clear session if user leaves without pairing
window.addEventListener('beforeunload',()=>{
  if(!currentCode) fetch('/pair-abandon',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}}).catch(()=>{});
});
</script>
</body>
</html>`;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  printBanner();
  server.listen(config.port, () => {
    console.log(chalk.cyan(`🌐 Pair page → http://localhost:${config.port}/pair\n`));
  });
  await startBot();
})();
