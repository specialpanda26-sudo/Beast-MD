// ── Temp Mail (ported/rebuilt from atassa) ──────────────────────────────────
// Uses 1secmail.com's free, key-free public API. Per-user address stored in
// DATA_DIR/tempmail.json.

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const TM_FILE = path.join(DATA_DIR, 'tempmail.json');

function loadTM() { try { return JSON.parse(fs.readFileSync(TM_FILE, 'utf8')); } catch (_) { return {}; } }
function saveTM(db) { fs.writeFileSync(TM_FILE, JSON.stringify(db, null, 2)); }

const api = axios.create({ baseURL: 'https://www.1secmail.com/api/v1/', timeout: 10000 });

module.exports = {

  tempmail: async ({ sock, from, msg, senderJid }) => {
    const db = loadTM();
    if (db[senderJid]) {
      return sock.sendMessage(from, { text: `📧 Your temp email: *${db[senderJid]}*\n\nUse .readmail to check it, .delmail to discard it.` }, { quoted: msg });
    }
    try {
      const { data } = await api.get('', { params: { action: 'genRandomMailbox', count: 1 } });
      const address = data[0];
      db[senderJid] = address;
      saveTM(db);
      await sock.sendMessage(from, { text: `📧 Temp email created: *${address}*\n\nUse .readmail to check your inbox, .delmail to discard it.` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Could not create a temp email right now: ${e.message}` }, { quoted: msg });
    }
  },

  tempmailhelp: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, {
      text: `📧 *Temp Mail*\n\n.tempmail — get/create your disposable address\n.readmail — list messages in your inbox\n.delmail — discard your current address`
    }, { quoted: msg });
  },

  readmail: async ({ sock, from, msg, senderJid }) => {
    const db = loadTM();
    const address = db[senderJid];
    if (!address) return sock.sendMessage(from, { text: '📭 No temp email yet. Send .tempmail first.' }, { quoted: msg });
    const [login, domain] = address.split('@');
    try {
      const { data: messages } = await api.get('', { params: { action: 'getMessages', login, domain } });
      if (!messages.length) return sock.sendMessage(from, { text: `📭 Inbox for *${address}* is empty.` }, { quoted: msg });
      const preview = messages.slice(0, 5).map(m => `• From: ${m.from}\n  Subject: ${m.subject}\n  At: ${m.date}`).join('\n\n');
      await sock.sendMessage(from, { text: `📬 *Inbox: ${address}*\n\n${preview}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Could not fetch inbox: ${e.message}` }, { quoted: msg });
    }
  },

  delmail: async ({ sock, from, msg, senderJid }) => {
    const db = loadTM();
    if (!db[senderJid]) return sock.sendMessage(from, { text: '📭 You have no temp email to discard.' }, { quoted: msg });
    delete db[senderJid];
    saveTM(db);
    await sock.sendMessage(from, { text: '🗑️ Temp email discarded.' }, { quoted: msg });
  },
};
