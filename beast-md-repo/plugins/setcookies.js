// ── .setcookies — upload a YouTube cookies.txt from your phone ─────────────
// Built for Henry's phone-only Termux workflow: no desktop, no Render shell
// access needed. Send the cookies.txt file to the bot as a WhatsApp
// document (or reply .setcookies to one you already sent), and it's saved
// straight to the persistent data disk where app.py / media.js already
// look for it by default (DATA_DIR/cookies.txt — see YTDLP_COOKIES_FILE
// defaults added alongside this command).
//
// How to get cookies.txt on Android (no desktop needed):
//   1. Install Kiwi Browser (Chromium-based, supports Chrome extensions).
//   2. Log into youtube.com in Kiwi with a real Google account — NOT your
//      main personal one, in case YouTube ever flags the session.
//   3. Install the "Get cookies.txt LOCALLY" extension from the Chrome Web
//      Store inside Kiwi (Kiwi has a built-in extension store button).
//   4. On youtube.com, tap the extension icon → export → saves cookies.txt
//      to your Downloads.
//   5. Open that file from Files/WhatsApp and forward/send it to this bot,
//      captioned ".setcookies" (or send it plain, then reply to it with
//      .setcookies).
//
// ⚠️ cookies.txt is a live login session for that Google account — treat it
// like a password. Never commit it to GitHub (already covered by
// data/.gitignore). Cookies expire every few weeks/months; when downloads
// start failing again with "sign in to confirm you're not a bot", re-export
// and re-send.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

module.exports = {

  setcookies: async ({ sock, from, msg, isOwner, isCoOwner }) => {
    if (!isOwner && !isCoOwner) {
      return sock.sendMessage(from, { text: '🔒 Only the owner can set the YouTube cookies file.' }, { quoted: msg });
    }

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const directDoc = msg.message?.documentMessage;
      const quotedDoc = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.documentMessage;

      if (!directDoc && !quotedDoc) {
        return sock.sendMessage(from, {
          text:
            `📋 *Usage:*\n` +
            `Send your cookies.txt file as a document with caption *.setcookies*, ` +
            `or reply *.setcookies* to a cookies.txt you already sent.\n\n` +
            `Don't have one yet? Ask me "how do I get yt-dlp cookies" and I'll walk you through it on your phone.`
        }, { quoted: msg });
      }

      const targetMsg = directDoc
        ? msg
        : { key: msg.message.extendedTextMessage.contextInfo, message: { documentMessage: quotedDoc } };

      const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
      const text = buffer.toString('utf8');

      // Light sanity check — real cookies.txt exports are either Netscape
      // format (starts with "# Netscape HTTP Cookie File" / "# HTTP Cookie
      // File") or at minimum mention youtube.com somewhere in the rows.
      const looksValid = /netscape http cookie file|http cookie file/i.test(text) || /youtube\.com/i.test(text);
      if (!looksValid) {
        return sock.sendMessage(from, {
          text: '⚠️ That doesn\'t look like a valid cookies.txt export (no YouTube cookie rows found). Double-check you exported from youtube.com and try again.'
        }, { quoted: msg });
      }

      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const dest = path.join(DATA_DIR, 'cookies.txt');
      fs.writeFileSync(dest, buffer);

      await sock.sendMessage(from, {
        text:
          `✅ *cookies.txt saved*\n\n` +
          `Downloads (.dl / .song / .video / .videosearch etc.) will pick it up automatically — no restart or env var needed.\n\n` +
          `⏰ Reminder: cookies expire every few weeks/months. When downloads start hitting "sign in to confirm you're not a bot" again, export a fresh one and re-send *.setcookies*.`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Couldn't save cookies file: ${e.message}` }, { quoted: msg });
    }
  },

};
