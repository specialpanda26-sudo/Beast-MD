// ── Notes System (ported/rebuilt from atassa) ───────────────────────────────
// .addnote <name> <text>   - save a note for this chat
// .getnote <name>          - retrieve a note by name
// .getnotes / .allnotes    - list all note names in this chat
// .delnote <name>          - delete a note (author or bot admin)
// .updatenote <name> <txt> - overwrite an existing note
// .delallnotes             - wipe all notes in this chat (bot admin only)
//
// Storage: one JSON file per install under DATA_DIR/notes.json, keyed by
// chat id, matching the existing "persistent data directory" convention
// used by scheduler/view-once media (see client_bridge.js DATA_DIR).

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

function loadNotes() {
  try { return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')); }
  catch (_) { return {}; }
}
function saveNotes(db) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(db, null, 2));
}

module.exports = {

  addnote: async ({ sock, from, msg, args, senderJid }) => {
    const name = (args[0] || '').toLowerCase();
    const text = args.slice(1).join(' ');
    if (!name || !text) {
      return sock.sendMessage(from, { text: '📝 Usage: .addnote <name> <text>' }, { quoted: msg });
    }
    const db = loadNotes();
    db[from] = db[from] || {};
    if (db[from][name]) {
      return sock.sendMessage(from, { text: `⚠️ A note called *${name}* already exists. Use .updatenote to change it.` }, { quoted: msg });
    }
    db[from][name] = { text, author: senderJid, createdAt: Date.now() };
    saveNotes(db);
    await sock.sendMessage(from, { text: `✅ Note *${name}* saved.` }, { quoted: msg });
  },

  updatenote: async ({ sock, from, msg, args }) => {
    const name = (args[0] || '').toLowerCase();
    const text = args.slice(1).join(' ');
    if (!name || !text) return sock.sendMessage(from, { text: '📝 Usage: .updatenote <name> <new text>' }, { quoted: msg });
    const db = loadNotes();
    if (!db[from]?.[name]) return sock.sendMessage(from, { text: `❌ No note called *${name}* here.` }, { quoted: msg });
    db[from][name].text = text;
    db[from][name].updatedAt = Date.now();
    saveNotes(db);
    await sock.sendMessage(from, { text: `✅ Note *${name}* updated.` }, { quoted: msg });
  },

  getnote: async ({ sock, from, msg, args }) => {
    const name = (args[0] || '').toLowerCase();
    if (!name) return sock.sendMessage(from, { text: '📝 Usage: .getnote <name>' }, { quoted: msg });
    const db = loadNotes();
    const note = db[from]?.[name];
    if (!note) return sock.sendMessage(from, { text: `❌ No note called *${name}* here.` }, { quoted: msg });
    await sock.sendMessage(from, { text: `📝 *${name}*\n\n${note.text}` }, { quoted: msg });
  },

  getnotes: async ({ sock, from, msg }) => {
    const db = loadNotes();
    const names = Object.keys(db[from] || {});
    if (!names.length) return sock.sendMessage(from, { text: '📭 No notes saved in this chat yet.' }, { quoted: msg });
    await sock.sendMessage(from, { text: `📝 *Notes in this chat*\n\n${names.map(n => `• ${n}`).join('\n')}` }, { quoted: msg });
  },

  // alias
  allnotes: async (ctx) => module.exports.getnotes(ctx),

  delnote: async ({ sock, from, msg, args, senderJid, isBotAdmin }) => {
    const name = (args[0] || '').toLowerCase();
    if (!name) return sock.sendMessage(from, { text: '📝 Usage: .delnote <name>' }, { quoted: msg });
    const db = loadNotes();
    const note = db[from]?.[name];
    if (!note) return sock.sendMessage(from, { text: `❌ No note called *${name}* here.` }, { quoted: msg });
    if (note.author !== senderJid && !isBotAdmin) {
      return sock.sendMessage(from, { text: '❌ Only the note author or a bot admin can delete this note.' }, { quoted: msg });
    }
    delete db[from][name];
    saveNotes(db);
    await sock.sendMessage(from, { text: `🗑️ Note *${name}* deleted.` }, { quoted: msg });
  },

  delallnotes: async ({ sock, from, msg, isBotAdmin }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const db = loadNotes();
    const count = Object.keys(db[from] || {}).length;
    delete db[from];
    saveNotes(db);
    await sock.sendMessage(from, { text: `🗑️ Deleted all ${count} note(s) in this chat.` }, { quoted: msg });
  },

  // ── Admin variants (owner/sub-admin can manage notes in ANY chat by id) ──
  adminclearnotes: async ({ sock, from, msg, args, isOwner, isSubAdmin }) => {
    if (!isOwner && !isSubAdmin) return sock.sendMessage(from, { text: '❌ Owner/sub-admin only!' }, { quoted: msg });
    const targetChat = args[0];
    if (!targetChat) return sock.sendMessage(from, { text: '📝 Usage: .adminclearnotes <chat_jid>' }, { quoted: msg });
    const db = loadNotes();
    delete db[targetChat];
    saveNotes(db);
    await sock.sendMessage(from, { text: `🗑️ Cleared notes for ${targetChat}.` }, { quoted: msg });
  },

  admindelnote: async ({ sock, from, msg, args, isOwner, isSubAdmin }) => {
    if (!isOwner && !isSubAdmin) return sock.sendMessage(from, { text: '❌ Owner/sub-admin only!' }, { quoted: msg });
    const [targetChat, name] = args;
    if (!targetChat || !name) return sock.sendMessage(from, { text: '📝 Usage: .admindelnote <chat_jid> <name>' }, { quoted: msg });
    const db = loadNotes();
    if (db[targetChat]) delete db[targetChat][name.toLowerCase()];
    saveNotes(db);
    await sock.sendMessage(from, { text: `🗑️ Deleted *${name}* from ${targetChat}.` }, { quoted: msg });
  },

  adminupdatenote: async ({ sock, from, msg, args, isOwner, isSubAdmin }) => {
    if (!isOwner && !isSubAdmin) return sock.sendMessage(from, { text: '❌ Owner/sub-admin only!' }, { quoted: msg });
    const [targetChat, name, ...rest] = args;
    const text = rest.join(' ');
    if (!targetChat || !name || !text) return sock.sendMessage(from, { text: '📝 Usage: .adminupdatenote <chat_jid> <name> <text>' }, { quoted: msg });
    const db = loadNotes();
    db[targetChat] = db[targetChat] || {};
    db[targetChat][name.toLowerCase()] = { text, author: 'admin', updatedAt: Date.now() };
    saveNotes(db);
    await sock.sendMessage(from, { text: `✅ Note *${name}* set for ${targetChat}.` }, { quoted: msg });
  },
};
