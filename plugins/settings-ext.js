// ── Bot Behavior Settings (ported/rebuilt from atassa) ──────────────────────
// Generic on/off + text-value settings store, so .setautoreact/.setautoread/
// .setbotname/.setprefix/etc all share one consistent, inspectable JSON file
// instead of each needing its own bespoke global variable.
//
// NOTE on .setprefix specifically: your bot's command prefix (CMD_PREFIX) is
// read once from client_bridge.js at startup from config/env. Changing it
// here updates the *stored* value and takes effect after a restart, OR
// immediately if you wire client_bridge.js to read CMD_PREFIX from
// getSetting('prefix') on every message instead of a constant — see
// INTEGRATION.md for the one-line change if you want it live without a
// restart.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULTS = {
  botname: 'Henry Ochibots v19',
  prefix: '.',
  pmpermit: false,
  chatbot: true,
  autoreact: false,
  autoread: false,
  autoreadstatus: false,
  autobio: false,
  autoreply: false,
  autoreplystatus: false,
  autoblock: false,
  autolikestatus: false,
  dmpresence: 'available',
  gcpresence: 'available',
  welcomemessage: '',
  goodbyemessage: '',
};

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
  catch (_) { return { ...DEFAULTS }; }
}
function saveSettings(s) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2)); }
function getSetting(key) { return loadSettings()[key]; }

const BOOL_KEYS = ['pmpermit','chatbot','autoreact','autoread','autoreadstatus','autobio','autoreply','autoreplystatus','autoblock','autolikestatus'];
const TEXT_KEYS = ['botname','prefix','dmpresence','gcpresence','welcomemessage','goodbyemessage'];

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

const exportsObj = {
  getsetting: async ({ sock, from, msg, args }) => {
    const key = args[0];
    const s = loadSettings();
    if (!key) return sock.sendMessage(from, { text: '📝 Usage: .getsetting <key>' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚙️ ${key} = ${JSON.stringify(s[key])}` }, { quoted: msg });
  },
  settings: async ({ sock, from, msg }) => {
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
  // exposed for other plugins/client_bridge.js to read behavior flags
  __getSetting: getSetting,
};

BOOL_KEYS.forEach(k => { exportsObj[`set${k}`] = makeBoolSetter(k); });
TEXT_KEYS.forEach(k => { exportsObj[`set${k}`] = makeTextSetter(k, k); });

module.exports = exportsObj;
