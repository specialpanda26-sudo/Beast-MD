// ── URL & File Tools (ported/rebuilt from atassa) ───────────────────────────
// All of these use either zero-key public APIs or pure local computation —
// no fragile scraping, so they should keep working without maintenance.

const axios = require('axios');
const QRCode = require('qrcode'); // add to package.json dependencies

const api = axios.create({ timeout: 10000 });

module.exports = {

  // ── .shortener <url> / .tinyurl <url> ────────────────────────────────────
  shortener: async ({ sock, from, msg, args }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '📝 Usage: .shortener <url>' }, { quoted: msg });
    try {
      const { data } = await api.get('https://tinyurl.com/api-create.php', { params: { url } });
      await sock.sendMessage(from, { text: `🔗 ${data}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Could not shorten that URL: ${e.message}` }, { quoted: msg });
    }
  },
  tinyurl: async (ctx) => module.exports.shortener(ctx),

  // ── .createqr <text> ──────────────────────────────────────────────────────
  createqr: async ({ sock, from, msg, args }) => {
    const text = args.join(' ');
    if (!text) return sock.sendMessage(from, { text: '📝 Usage: .createqr <text or url>' }, { quoted: msg });
    try {
      const buffer = await QRCode.toBuffer(text, { width: 512 });
      await sock.sendMessage(from, { image: buffer, caption: `📱 QR code for: ${text}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Failed to generate QR: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .catbox — reply to an image/video/audio to get a permanent catbox.moe link
  catbox: async ({ sock, from, msg, downloadMedia }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return sock.sendMessage(from, { text: '📎 Reply to an image/video/audio with .catbox' }, { quoted: msg });
    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const fakeMsg = { message: quoted, key: msg.message.extendedTextMessage.contextInfo.stanzaId ? msg.key : msg.key };
      const buffer = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {});
      const FormData = require('form-data'); // add to package.json dependencies
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', buffer, { filename: 'upload.bin' });
      const { data } = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 20000 });
      await sock.sendMessage(from, { text: `☁️ ${data}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Upload failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .define <word> ────────────────────────────────────────────────────────
  define: async ({ sock, from, msg, args }) => {
    const word = args.join(' ');
    if (!word) return sock.sendMessage(from, { text: '📝 Usage: .define <word>' }, { quoted: msg });
    try {
      const { data } = await api.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const entry = data[0];
      const meanings = entry.meanings.slice(0, 3).map(m =>
        `*${m.partOfSpeech}*: ${m.definitions[0].definition}`
      ).join('\n');
      await sock.sendMessage(from, { text: `📖 *${entry.word}*\n\n${meanings}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ No definition found for "${word}".` }, { quoted: msg });
    }
  },

  // ── .domaincheck <domain> — alias of the existing, already-solid .whois
  domaincheck: async (ctx) => {
    const { whois } = require('./osint');
    return whois(ctx);
  },

  // ── base64 / binary encode-decode (pure local, always works) ────────────
  ebase: async ({ sock, from, msg, args }) => {
    const text = args.join(' ');
    if (!text) return sock.sendMessage(from, { text: '📝 Usage: .ebase <text>' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔐 ${Buffer.from(text, 'utf8').toString('base64')}` }, { quoted: msg });
  },
  dbase: async ({ sock, from, msg, args }) => {
    const b64 = args.join(' ');
    if (!b64) return sock.sendMessage(from, { text: '📝 Usage: .dbase <base64>' }, { quoted: msg });
    try {
      await sock.sendMessage(from, { text: `🔓 ${Buffer.from(b64, 'base64').toString('utf8')}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: '❌ Invalid base64 string.' }, { quoted: msg }); }
  },
  ebinary: async ({ sock, from, msg, args }) => {
    const text = args.join(' ');
    if (!text) return sock.sendMessage(from, { text: '📝 Usage: .ebinary <text>' }, { quoted: msg });
    const bin = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    await sock.sendMessage(from, { text: `🔢 ${bin}` }, { quoted: msg });
  },
  debinary: async ({ sock, from, msg, args }) => {
    const bin = args.join('');
    if (!bin) return sock.sendMessage(from, { text: '📝 Usage: .debinary <binary, spaces optional>' }, { quoted: msg });
    try {
      const text = bin.match(/.{1,8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join('');
      await sock.sendMessage(from, { text: `🔡 ${text}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: '❌ Invalid binary string.' }, { quoted: msg }); }
  },

  // ── .cleanuri <url> — strip tracking params ──────────────────────────────
  cleanuri: async ({ sock, from, msg, args }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '📝 Usage: .cleanuri <url>' }, { quoted: msg });
    try {
      const u = new URL(url);
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','si'].forEach(p => u.searchParams.delete(p));
      await sock.sendMessage(from, { text: `🧹 ${u.toString()}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: '❌ Not a valid URL.' }, { quoted: msg }); }
  },
};
