// ── Bot Behavior Settings (ported/rebuilt from atassa) ──────────────────────
// Generic on/off + text-value settings store, so .setautoreact/.setautoread/
// .setbotname/.setprefix/etc all share one consistent, inspectable JSON file
// instead of each needing its own bespoke global variable.
//
// Update 17: these used to just save to data/settings.json and stop there —
// every toggle reported "✅ enabled" but nothing in the bot ever read the
// file back. client_bridge.js now calls __getSetting(...) at each relevant
// point (auto-read, auto-react, status handling, AI chat gating, presence,
// live botname/prefix) so these actually change behavior. See CHANGES.md
// Update 17 for exactly which default values were deliberately kept at
// "on" to match the bot's pre-existing hardcoded behavior, so wiring this
// up doesn't silently change what the bot already does for you.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PMPERMIT_FILE = path.join(DATA_DIR, 'pmpermit.json');
const GREETED_FILE = path.join(DATA_DIR, 'first-contact-greeted.json');

const DEFAULTS = {
  botname: process.env.BOT_NAME || 'Beast MD',
  prefix: (process.env.PREFIXES ? process.env.PREFIXES.split(',')[0] : '.'),
  pmpermit: false,          // opt-in: strangers DMing need approval first
  chatbot: true,            // matches existing always-on DM AI chat
  autoreact: false,         // was explicitly removed for feeling spammy — opt-in only
  autoread: true,           // matches existing unconditional auto-read-messages
  autoreadstatus: true,     // matches existing unconditional status auto-read
  autobio: true,            // matches existing unconditional 60s bio-refresh interval
  autoreply: true,          // matches existing always-on group @mention/name AI reply
  autoreplystatus: true,    // matches existing unconditional AI comment-on-status
  autoblock: false,         // opt-in, only acts on unapproved DMs once pmpermit is ON too
  autolikestatus: true,     // matches existing unconditional ❤️ status react
  dmpresence: 'available',  // 'available' = show typing/online cues in DMs, 'unavailable' = stay invisible
  gcpresence: 'available',  // same, for groups
  welcomemessage: '',       // '' = use the built-in default text
  goodbyemessage: '',       // '' = use the built-in default text

  // ── First-contact "save my number" greeting ────────────────────────────
  // Sent once, automatically, the first time a brand-new DM sender messages
  // this session — asks them to save the contact so the account doesn't
  // get flagged/banned for messaging "unknown numbers," and sets
  // expectations that the bot may reply on the owner's behalf. `ownerName`
  // is whatever this session's owner wants shown; `{name}` in the message
  // template gets replaced with it. Editable per-session via
  // .setownername / .setfirstcontactmessage, and can be turned off
  // entirely with .setfirstcontactgreeting off.
  firstcontactgreeting: true,
  ownername: '',            // '' = falls back to the live bot name
  firstcontactmessage:
    '👋 Hey! This is {name}\'s bot-assisted number — save this contact so '
    + 'future messages don\'t land as "unknown number" (and to keep it from '
    + 'getting flagged/banned). {name} will get back to you personally, or '
    + 'the bot may step in if {name} is away for a bit.',
};

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
  catch (_) { return { ...DEFAULTS }; }
}
function saveSettings(s) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2)); }
function getSetting(key) { return loadSettings()[key]; }

const BOOL_KEYS = ['pmpermit','chatbot','autoreact','autoread','autoreadstatus','autobio','autoreply','autoreplystatus','autoblock','autolikestatus','firstcontactgreeting'];
const TEXT_KEYS = ['botname','prefix','dmpresence','gcpresence','welcomemessage','goodbyemessage','ownername','firstcontactmessage'];

function makeBoolSetter(key) {
  return async ({ sock, from, msg, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const s = loadSettings();
    s[key] = on;
    saveSettings(s);
    await sock.sendMessage(from, { text: `⚙️ *${key}* is now *${on ? 'ON' : 'OFF'}*.` }, { quoted: msg });
  };
}
function makeTextSetter(key, label) {
  return async ({ sock, from, msg, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const value = args.join(' ');
    if (!value) return sock.sendMessage(from, { text: `📝 Usage: .set${key} <${label}>` }, { quoted: msg });
    const s = loadSettings();
    s[key] = value;
    saveSettings(s);
    await sock.sendMessage(from, { text: `✅ *${key}* set to: ${value}` }, { quoted: msg });
  };
}

// ── PM Permit list — who's allowed to DM without hitting the .pmpermit
// gate. Only consulted at all when the `pmpermit` setting above is ON. ──────
function loadPmPermit() {
  try { return JSON.parse(fs.readFileSync(PMPERMIT_FILE, 'utf8')); }
  catch (_) { return { approved: [], strikes: {} }; }
}
function savePmPermit(d) { fs.writeFileSync(PMPERMIT_FILE, JSON.stringify(d, null, 2)); }
function isPmApproved(number) { return loadPmPermit().approved.includes(number); }
function approvePm(number) {
  const d = loadPmPermit();
  if (!d.approved.includes(number)) d.approved.push(number);
  delete d.strikes[number];
  savePmPermit(d);
}
function revokePm(number) {
  const d = loadPmPermit();
  d.approved = d.approved.filter(n => n !== number);
  savePmPermit(d);
}
// Returns the new strike count for this number (used by autoblock).
function bumpPmStrike(number) {
  const d = loadPmPermit();
  d.strikes[number] = (d.strikes[number] || 0) + 1;
  savePmPermit(d);
  return d.strikes[number];
}

// ── First-contact greeting: has this number already been sent the
// "save my number" message? Persisted to disk so it survives restarts and
// only ever fires once per number, per session. ─────────────────────────
function loadGreeted() {
  try { return JSON.parse(fs.readFileSync(GREETED_FILE, 'utf8')); }
  catch (_) { return []; }
}
function hasBeenGreeted(number) { return loadGreeted().includes(number); }
function markGreeted(number) {
  const g = loadGreeted();
  if (!g.includes(number)) { g.push(number); fs.writeFileSync(GREETED_FILE, JSON.stringify(g, null, 2)); }
}
// Builds the actual text to send, substituting {name} with the session's
// configured owner name (falls back to the live bot name if unset).
function buildFirstContactMessage(fallbackName) {
  const s = loadSettings();
  const name = (s.ownername || '').trim() || fallbackName || 'the owner';
  return (s.firstcontactmessage || DEFAULTS.firstcontactmessage).split('{name}').join(name);
}

const exportsObj = {
  getsetting: async ({ sock, from, msg, args }) => {
    const key = args[0];
    const s = loadSettings();
    if (!key) return sock.sendMessage(from, { text: '📝 Usage: .getsetting <key>' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚙️ ${key} = ${JSON.stringify(s[key])}` }, { quoted: msg });
  },
  mysettings: async ({ sock, from, msg }) => {
    const s = loadSettings();
    const lines = Object.entries(s).map(([k, v]) => `${typeof v === 'boolean' ? (v ? '✅' : '❌') : 'ℹ️'} ${k}: ${v || '(empty)'}`);
    await sock.sendMessage(from, { text: `⚙️ *Bot Settings*\n\n${lines.join('\n')}` }, { quoted: msg });
  },
  resetsetting: async ({ sock, from, msg, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const key = args[0];
    if (!key || !(key in DEFAULTS)) return sock.sendMessage(from, { text: '📝 Usage: .resetsetting <key>' }, { quoted: msg });
    const s = loadSettings();
    s[key] = DEFAULTS[key];
    saveSettings(s);
    await sock.sendMessage(from, { text: `✅ *${key}* reset to default.` }, { quoted: msg });
  },
  resetallsettings: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    saveSettings({ ...DEFAULTS });
    await sock.sendMessage(from, { text: '✅ All settings reset to defaults.' }, { quoted: msg });
  },

  // ── .removerestrictions / .openbot ──────────────────────────────────────
  // Owner only. One command that clears every owner-set restriction that
  // gates general bot usage:
  //   • settings.json toggles (pmpermit, autoblock, etc.) → back to open defaults
  //   • .private / .setmode / .maintenance runtime state → public, active, off
  //   • .setperm 'restricted'/'blocked' entries on group members → cleared
  // Deliberately does NOT touch (out of scope, per explicit instructions):
  //   • the Admin Panel (blacklist, keyword auto-replies, Features tab toggles)
  //   • the anti-ban system
  //   • session termination / manual expiry (owner-set, optional)
  removerestrictions: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });

    // 1) settings.json → open defaults (pmpermit off, autoblock off, etc.)
    saveSettings({ ...DEFAULTS });

    // 2) runtime mode globals → fully open
    global.botMode = 'public';
    global.botActive = true;
    global.botMaintenance = false;

    // 3) clear any .setperm 'restricted'/'blocked' assignments on group members
    let clearedMembers = 0;
    if (global.memberPerms) {
      for (const groupId of Object.keys(global.memberPerms)) {
        clearedMembers += Object.keys(global.memberPerms[groupId] || {}).length;
      }
      global.memberPerms = {};
    }

    await sock.sendMessage(from, {
      text: `✅ *All owner-set restrictions removed.*\n\n`
        + `• PM Permit, auto-block & related settings → reset to open\n`
        + `• Bot mode → *public*, active → *on*, maintenance → *off*\n`
        + `• Per-member restricted/blocked permissions cleared (${clearedMembers} entr${clearedMembers === 1 ? 'y' : 'ies'})\n\n`
        + `Not touched (as requested): Admin Panel (blacklist/keywords/features), anti-ban, and session termination/expiry/subscription.`
    }, { quoted: msg });
  },

  // ── New: PM Permit management (only matters while .setpmpermit is ON) ──
  pmpermitapprove: async ({ sock, from, msg, args, isOwner, isBotAdmin }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const number = (args[0] || '').replace(/[^0-9]/g, '');
    if (!number) return sock.sendMessage(from, { text: '📝 Usage: .pmpermitapprove <number>' }, { quoted: msg });
    approvePm(number);
    await sock.sendMessage(from, { text: `✅ ${number} can now DM freely.` }, { quoted: msg });
  },
  pmpermitrevoke: async ({ sock, from, msg, args, isBotAdmin }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const number = (args[0] || '').replace(/[^0-9]/g, '');
    if (!number) return sock.sendMessage(from, { text: '📝 Usage: .pmpermitrevoke <number>' }, { quoted: msg });
    revokePm(number);
    await sock.sendMessage(from, { text: `✅ ${number} removed from the approved list.` }, { quoted: msg });
  },
  pmpermitlist: async ({ sock, from, msg, isBotAdmin }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const d = loadPmPermit();
    const text = d.approved.length
      ? `✅ *Approved DM senders:*\n${d.approved.map(n => `• ${n}`).join('\n')}`
      : 'No one has been approved yet.';
    await sock.sendMessage(from, { text }, { quoted: msg });
  },

  // exposed for other plugins/client_bridge.js to read behavior flags
  __getSetting: getSetting,
  __isPmApproved: isPmApproved,
  __bumpPmStrike: bumpPmStrike,
  __hasBeenGreeted: hasBeenGreeted,
  __markGreeted: markGreeted,
  __buildFirstContactMessage: buildFirstContactMessage,
};

BOOL_KEYS.forEach(k => { exportsObj[`set${k}`] = makeBoolSetter(k); });
TEXT_KEYS.forEach(k => { exportsObj[`set${k}`] = makeTextSetter(k, k); });

module.exports = exportsObj;
