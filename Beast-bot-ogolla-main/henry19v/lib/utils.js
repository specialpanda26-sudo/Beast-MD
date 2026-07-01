'use strict';
const config = require('../config');

/**
 * Extract plain text from any message type
 */
function getText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.documentMessage?.caption ||
    msg?.message?.buttonsResponseMessage?.selectedDisplayText ||
    msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

/**
 * Get sender JID — handles group & DM
 */
function getSender(msg) {
  return (
    msg.key.participant ||
    msg.key.remoteJid
  );
}

/**
 * Check if JID is owner
 */
function isOwner(jid) {
  const num = jid.split('@')[0].replace(/[^0-9]/g, '');
  return num === config.ownerNumber;
}

/**
 * Format uptime
 */
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Mention a user by JID
 */
function mention(jid) {
  return `@${jid.split('@')[0]}`;
}

/**
 * Download media from a message
 */
async function downloadMsg(msg, sock) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  return await downloadMediaMessage(msg, 'buffer', {}, {
    logger: require('pino')({ level: 'silent' }),
    reuploadRequest: sock.updateMediaMessage,
  });
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build the main menu text
 */
function buildMenu(prefix) {
  const p = prefix;
  return `╔══════════════════════════════╗
║   🤖 *HENRY AGENT19V™*       ║
║   ⚡ by Henrydev.ke           ║
╚══════════════════════════════╝

👑 *Owner:* Henrydev.ke
📞 *Number:* +254775351698
🌍 *Mode:* Public
🔰 *Prefix:* ${p}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *AI COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}ask [question]   - Ask AI anything
${p}clearchat        - Clear AI memory

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 *MEDIA & STICKER*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}sticker / ${p}s     - Image → sticker
${p}assticker / ${p}as  - Animated sticker
${p}toimage / ${p}ti    - Sticker → image
${p}getpp [@user]    - Get profile photo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *DOWNLOADER*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}ytmp3 [url]      - YouTube audio
${p}ytmp4 [url]      - YouTube video
${p}tiktok [url]     - TikTok video
${p}ytinfo [url]     - YouTube info

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *GROUP MANAGEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}tagall [msg]     - Tag all members
${p}kick [@user]     - Remove member
${p}add [number]     - Add member
${p}promote [@user]  - Make admin
${p}demote [@user]   - Remove admin
${p}mute             - Mute group
${p}unmute           - Unmute group
${p}groupname [name] - Rename group
${p}grouplink        - Get invite link
${p}antilink on/off  - Toggle anti-link
${p}antibadword on/off - Toggle filter
${p}warn [@user]     - Warn member
${p}warns [@user]    - Check warns
${p}clearwarn [@u]   - Clear warns
${p}kick [@user]     - Kick member
${p}bcgc [msg]       - Broadcast groups

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *GAMES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}trivia           - Random question
${p}tictactoe [@u]   - Play TicTacToe
${p}rps [choice]     - Rock Paper Scissors
${p}roll [NdS]       - Roll dice (e.g 2d6)
${p}guess [max]      - Number guess game

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *BOT TOOLS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}ping             - Response speed
${p}runtime          - Bot uptime
${p}menu             - Show this menu
${p}botinfo          - Bot information
${p}weather [city]   - Weather info
${p}calc [expr]      - Calculator
${p}define [word]    - Dictionary
${p}joke             - Random joke
${p}quote            - Motivational quote

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *OWNER ONLY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}broadcast [msg]  - Broadcast all chats
${p}addsudo [@user]  - Add sudo admin
${p}delsudo [@user]  - Remove sudo
${p}setmode [mode]   - public/private/groups
${p}block [@user]    - Block contact
${p}unblock [@user]  - Unblock contact
${p}restart          - Restart bot

> 🔥 *Henry Agent19v™* | Henrydev.ke`;
}

module.exports = { getText, getSender, isOwner, formatUptime, formatBytes, mention, downloadMsg, sleep, buildMenu };
