const os = require('os');

module.exports = {

  // ── .menu ──────────────────────────────────────────────────────────────────
  // Shows different menus based on permission level
  menu: async ({ sock, from, msg, config, isOwner, isSubAdmin, isBotAdmin }) => {
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const now = new Date();
    const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const p = config.prefix;

    // ── PUBLIC MENU (anyone can see) ──────────────────────────────────────
    const publicSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 *PUBLIC COMMANDS* (everyone)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}menu           - Show this menu
${p}ping           - Bot response speed
${p}runtime        - Uptime & system info

🤖 *Just DM me anything!*
I reply in Swahili, Sheng or English 🇰🇪

/ask [query]   - Ask AI a question
/recover [n]   - Recover deleted msgs
/viewonce [n]  - View saved view-once media`;

    // ── SUB-ADMIN MENU ─────────────────────────────────────────────────────
    const subAdminSection = isBotAdmin ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *SUB-ADMIN COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}tagall         - Tag all group members
${p}kick [@user]   - Kick a member
${p}promote [@u]   - Promote to admin
${p}demote [@u]    - Demote from admin
${p}mute           - Mute group
${p}unmute         - Unmute group
${p}sticker        - Image → Sticker
${p}getpp [@user]  - Get profile picture
${p}download [url] - Download video
${p}song [url]     - Extract MP3
${p}weather [city] - Live weather
${p}dict [word]    - Dictionary
${p}convert [x y]  - Currency converter
${p}roll [dice]    - Roll dice e.g 3d6+2` : '';

    // ── OWNER-ONLY MENU ────────────────────────────────────────────────────
    const ownerSection = isOwner ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *OWNER ONLY* (you only, Henry)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}addadmin [num]   - Add a sub-admin
${p}removeadmin [n]  - Remove sub-admin
${p}listadmins       - List all sub-admins
${p}welcome [num]    - Send welcome card
${p}status           - Post image as status
${p}pp               - Update profile pic
${p}bio [text]       - Update bio
${p}bcgc [msg]       - Broadcast to groups
${p}public           - Set bot public mode
${p}private          - Set bot private mode
${p}setmode [on/off] - Toggle bot on/off
${p}summarize [text] - AI text summarizer
${p}pbp [text]       - RPG session tracker

⏰ *MESSAGE SCHEDULER*
${p}schedule add <time> <to> <msg> - Schedule a message
${p}schedule list    - See all scheduled msgs
${p}schedule del <ID> - Cancel a scheduled msg
${p}schedule repeat <ID> daily|weekly - Repeat it
_Time: 14:30 / 9:00am / 30m / 2h_

/paint [text]    - Generate text image
/download_video  - Download video
/download_song   - Download MP3` : '';

    const roleTag = isOwner
      ? '👑 *OWNER*'
      : isSubAdmin
        ? '🛡️ *SUB-ADMIN*'
        : '👤 *USER*';

    const menu =
`╔══════════════════════════════╗
║  🔥 *HENRY V19™ BEAST BOT* 🔥 ║
║     _by @henrytech254_        ║
╚══════════════════════════════╝

${roleTag} | 📅 ${now.toLocaleDateString()} | 🕐 ${now.toLocaleTimeString()}
⏱️ *Uptime:* ${h}h ${m}m ${s}s
💾 *RAM:* ${ramUsed}MB / ${ramTotal}MB  |  📊 *CPU Load:* ${cpuLoad}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 *PUBLIC COMMANDS* (everyone)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}menu           - Show this menu
${p}ping           - Bot response speed
${p}runtime        - Uptime & system info
${p}weather [city] - Live weather info
${p}dict [word]    - Dictionary definition
${p}roll [sides]   - Roll a dice 🎲
${p}myperm         - Check your permissions

🤖 *Just DM me anything!*
I reply in Swahili, Sheng or English 🇰🇪
/ask [query]   - Ask AI anything

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *MEDIA COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}sticker        - Image/video → Sticker
${p}vv             - View saved view-once media
${p}save           - Save view-once as file
${p}getpp [@user]  - Get profile picture
${p}download [url] - Download video (YT/TikTok)
${p}song [url]     - Extract MP3 audio
${p}convert        - Convert media format
${isBotAdmin ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *ADMIN COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}tagall [msg]   - Tag all members
${p}kick [@user]   - Kick a member
${p}add [number]   - Add a member
${p}promote [@u]   - Promote to admin
${p}demote [@u]    - Demote from admin
${p}mute           - Mute group (admins only)
${p}unmute         - Unmute group
${p}revoke         - Reset invite link
${p}antispam on/off- Toggle antispam
${p}bcgc [msg]     - Broadcast to all groups
${p}setperm @u lvl - Set member permissions
${p}resetperm @u   - Reset member permissions
${p}listperms      - List all custom permissions` : ''}
${ownerSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auto-read  ✅ Anti-call  ✅ Auto-status
✅ View-once save  ✅ AI DM chat  ✅ Scheduler
✅ Fake typing  ✅ Always online  ✅ Permissions

> 🔥 *Henry v19™ Beast Bot* | @henrytech254`;

    // Send menu with profile photo as thumbnail
    const fs = require('fs');
    const menuImagePath = __dirname + '/../assets/menu-bg.jpg';
    try {
      const imageBuffer = fs.readFileSync(menuImagePath);
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: menu,
        mimetype: 'image/jpeg'
      }, { quoted: msg });
    } catch(e) {
      // Fallback to text only if image fails
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    }
  },

  // ── .addadmin ──────────────────────────────────────────────────────────────
  addadmin: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Only *Henry* (main owner) can add admins!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .addadmin 254XXXXXXXXX' }, { quoted: msg });
    global.subAdmins.add(num);
    await sock.sendMessage(from, { text: `✅ *${num}* is now a Beast Bot Sub-Admin!\nThey can use admin commands. 🛡️` }, { quoted: msg });
  },

  // ── .removeadmin ───────────────────────────────────────────────────────────
  removeadmin: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Only *Henry* (main owner) can remove admins!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .removeadmin 254XXXXXXXXX' }, { quoted: msg });
    global.subAdmins.delete(num);
    await sock.sendMessage(from, { text: `✅ *${num}* has been removed as Sub-Admin.` }, { quoted: msg });
  },

  // ── .listadmins ────────────────────────────────────────────────────────────
  listadmins: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const admins = [...global.subAdmins];
    if (admins.length === 0) {
      return sock.sendMessage(from, { text: '📋 No sub-admins added yet.\nUse .addadmin 254XXXXXXXXX to add one.' }, { quoted: msg });
    }
    const list = admins.map((n, i) => `${i + 1}. +${n}`).join('\n');
    await sock.sendMessage(from, { text: `🛡️ *Beast Bot Sub-Admins:*\n\n${list}\n\nTotal: ${admins.length}` }, { quoted: msg });
  },

  // ── .welcome ───────────────────────────────────────────────────────────────
  welcome: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const target = args[0]?.replace(/[^0-9]/g, '');
    if (!target) return sock.sendMessage(from, { text: '📋 Usage: .welcome 254XXXXXXXXX' }, { quoted: msg });
    const jid = `${target}@s.whatsapp.net`;
    const card =
`╔═══════════════════════════════════════╗
  █░█ █▀▀ █▄░█ █▀█ █▄█   ▀█▀ █▀▀ █▀▀ █░█
  █▀█ ██▄ █░▀█ █▀▄ ░█░   ░█░ ██▄ █▄▄ █▀█
╚═══════════════════════════════════════╝

✨ *HENRY V19™ BEAST BOT* ✨
_by @henrytech254_

Karibu! Niko online na niko ready kukusaidia. 🇰🇪
Ninaongea Kiswahili, Sheng na English!

⚡ *COMMANDS UNAZOWEZA KUTUMIA:*
/ask [swali] - Niulize chochote (AI)
/recover [n] - Recover deleted messages
/viewonce [n] - View saved view-once media
.menu        - See all commands

💬 *Au niandike tu ujumbe wowote — nitakujibu!* 😄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ Auto-react | Always Online | AI Chat Active
🔥 _Henry v19™ Beast Bot — @henrytech254_`;
    try {
      await sock.sendMessage(jid, { text: card });
      await sock.sendMessage(from, { text: `✅ Welcome card sent to +${target} 🎉` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .ping ──────────────────────────────────────────────────────────────────
  ping: async ({ sock, from, msg }) => {
    const start = Date.now();
    await sock.sendMessage(from, { text: '⚡' }, { quoted: msg });
    const end = Date.now();
    await sock.sendMessage(from, { text: `🏓 *Pong!*\n⚡ Response: *${end - start}ms*` });
  },

  // ── .runtime ───────────────────────────────────────────────────────────────
  runtime: async ({ sock, from, msg }) => {
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
    const ramFree = (os.freemem() / 1024 / 1024).toFixed(0);
    const cpuModel = os.cpus()[0]?.model?.trim() || 'Cloud Server';
    const cores = os.cpus().length;
    const load = os.loadavg()[0].toFixed(2);
    await sock.sendMessage(from, {
      text:
`⚡ *Henry v19™ Beast Bot — Runtime*

⏱️ *Uptime:* ${h}h ${m}m ${s}s
🖥️ *CPU:* ${cpuModel}
🧠 *Cores:* ${cores}
📊 *CPU Load:* ${load}%
💾 *RAM Used:* ${ramUsed}MB / ${ramTotal}MB
🟢 *RAM Free:* ${ramFree}MB
🏠 *Platform:* ${os.platform()}
⚙️ *Node.js:* ${process.version}

🔥 _Henry v19™ Beast Bot — @henrytech254_`
    }, { quoted: msg });
  },

  // ── .public / .private / .setmode ─────────────────────────────────────────
  public: async ({ sock, from, msg, isOwner, config }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    config.mode = 'public';
    await sock.sendMessage(from, { text: '✅ Bot is now in *PUBLIC* mode — responds to everyone.' }, { quoted: msg });
  },

  private: async ({ sock, from, msg, isOwner, config }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    config.mode = 'private';
    await sock.sendMessage(from, { text: '🔒 Bot is now in *PRIVATE* mode — owner & admins only.' }, { quoted: msg });
  },

  setmode: async ({ sock, from, msg, isOwner, args, config }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const mode = args[0];
    if (!mode) return sock.sendMessage(from, { text: '⚙️ Usage: .setmode on/off' }, { quoted: msg });
    config.active = mode === 'on';
    await sock.sendMessage(from, { text: `⚙️ Bot mode: *${mode.toUpperCase()}*` }, { quoted: msg });
  },

  summarize: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const text = args.join(' ');
    if (!text) return sock.sendMessage(from, { text: '📋 Usage: .summarize [text to summarize]' }, { quoted: msg });
    await sock.sendMessage(from, { text: `📝 Summarizing...\n\n_(AI summary feature — connect to /ask endpoint)_\n\n${text.slice(0, 100)}...` }, { quoted: msg });
  },
};

// ── .status ────────────────────────────────────────────────────────────────
module.exports.status = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const imgMsg = msg.message?.imageMessage
    || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  if (!imgMsg) return sock.sendMessage(from, { text: '📸 Reply to an image with .status to post it as your WhatsApp status.' }, { quoted: msg });
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const dlMsg = quoted
      ? { key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant }, message: quoted.quotedMessage }
      : msg;
    const buffer = await downloadMediaMessage(dlMsg, 'buffer', {});
    await sock.sendMessage('status@broadcast', { image: buffer, caption: imgMsg.caption || '' }, {
      statusJidList: [sock.user.id.replace(/:.*@/, '@')]
    });
    await sock.sendMessage(from, { text: '✅ Status posted!' }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
  }
};

// ── .pp ────────────────────────────────────────────────────────────────────
module.exports.pp = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const imgMsg = msg.message?.imageMessage
    || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  if (!imgMsg) return sock.sendMessage(from, { text: '📸 Reply to an image with .pp to update your profile picture.' }, { quoted: msg });
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const dlMsg = quoted
      ? { key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant }, message: quoted.quotedMessage }
      : msg;
    const buffer = await downloadMediaMessage(dlMsg, 'buffer', {});
    await sock.updateProfilePicture(sock.user.id, buffer);
    await sock.sendMessage(from, { text: '✅ Profile picture updated!' }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
  }
};

// ── .bio ───────────────────────────────────────────────────────────────────
module.exports.bio = async ({ sock, from, msg, isOwner, args }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const text = args.join(' ');
  if (!text) return sock.sendMessage(from, { text: '✏️ Usage: .bio [text]' }, { quoted: msg });
  try {
    await sock.updateProfileStatus(text);
    await sock.sendMessage(from, { text: `✅ Bio updated: "${text}"` }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
  }
};
