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
/viewonce [n]  - View saved view-once media

💡 Some words trigger instant auto-replies (set by the owner) — just message normally.`;

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
${p}dl [url] (audio) - Universal downloader (YT/TikTok/IG/FB/X/SoundCloud+)
${p}convertmedia [fmt] - Universal media converter (reply to file)
${p}weather [city] - Live weather
${p}dict [word]    - Dictionary
${p}convert [x y]  - Currency converter
${p}roll [dice]    - Roll dice e.g 3d6+2
${p}checklink [url] - Check if a link looks safe or suspicious` : '';

    // ── OWNER-ONLY MENU ────────────────────────────────────────────────────
    const ownerSection = isOwner ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *OWNER ONLY* (you only, Henry)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}addadmin [num]    - Add a sub-admin
${p}removeadmin [n]   - Remove sub-admin
${p}listadmins        - List all sub-admins
${p}addcoowner [num]  - Add a co-owner (full access)
${p}removecoowner [n] - Remove co-owner
${p}listcoowners      - List co-owners
${p}settier [num] [subadmin|coowner] - Assign any number to any tier (auto-notifies them)
${p}welcome [num]     - Send welcome card
${p}status            - Post image as status
${p}pp                - Update profile pic
${p}bio [text]        - Update bio
${p}bcgc [msg]        - Broadcast to groups
${p}creategroup [name] | [numbers] - Create group from a number list
${p}addtogroup [numbers]           - Bulk-add numbers to current group
${p}public            - Set bot public mode
${p}private           - Set bot private mode
${p}setmode [on/off]  - Toggle bot on/off
${p}summarize [text]  - AI text summarizer (cypher.js)
${p}pbp [text]        - RPG session tracker

🔑 Manage keyword auto-replies & feature toggles from the *Admin Panel* (/admin → Keywords / Features tabs)

⏰ *MESSAGE SCHEDULER*
${p}schedule add <time> <to> <msg> - Schedule a message
${p}schedule list    - See all scheduled msgs
${p}schedule del <ID> - Cancel a scheduled msg
${p}schedule repeat <ID> daily|weekly - Repeat it
_Time: 14:30 / 9:00am / 30m / 2h_

/paint [text]    - Generate text image
/download_video  - Download video
/download_song   - Download MP3

🔑 *RECOVERY*
${p}ownerrecovery [passphrase] [new_num] - Emergency owner change` : '';

    const roleTag = isOwner
      ? '👑 *OWNER*'
      : isSubAdmin
        ? '🛡️ *SUB-ADMIN*'
        : '👤 *USER*';

    const menu =
`╔══════════════════════════════╗
║  🔥 *HENRY OCHIBOTS V19™* 🔥  ║
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
${p}register       - Get web panel link (free credits + trust badge)

🤖 *Just DM me anything!*
I reply in Swahili, Sheng or English 🇰🇪
/ask [query]   - Ask AI anything

🔐 *ACCESS*
${p}login [user] [pass] - Unlock full access
${p}logout             - Remove your access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *MEDIA COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}sticker        - Image/video → Sticker
${p}vv             - View saved view-once media
${p}save           - Save view-once as file
${p}getpp [@user]  - Get profile picture (works unsaved)
${p}about [@user]  - Get About status text (works unsaved)
${p}download [url] - Download video (YT/TikTok)
${p}song [url]     - Extract MP3 audio
${p}dl [url] (audio) - 🌐 Universal downloader (YT/TikTok/IG/FB/X/SoundCloud+)
${p}convertmedia [fmt] - 🔄 Universal media converter (reply to img/video/audio)
${isBotAdmin ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *ADMIN COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}tagall [msg]   - Tag all members (bot admin)
${p}kick [@user]   - Kick a member
${p}add [number]   - Add a member
${p}promote [@u]   - Promote to admin
${p}demote [@u]    - Demote from admin
${p}mute           - Mute group (admins only)
${p}unmute         - Unmute group
${p}revoke         - Reset invite link
${p}antispam on/off- Toggle antispam
${p}setperm @u lvl - Set member permissions
${p}resetperm @u   - Reset member permissions
${p}listperms      - List all custom permissions` : ''}
${ownerSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auto-read  ✅ Anti-call  ✅ Auto-status
✅ View-once save  ✅ AI DM chat  ✅ Scheduler
✅ Fake typing  ✅ Always online  ✅ Group AI replies
✅ Status AI comments  ✅ Permissions

> 🔥 *Henry Ochibots v19™* | @henrytech254`;

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

    // NEW: tappable quick-reply buttons under the menu, if enabled.
    // Falls back silently if WhatsApp rejects buttons for this client —
    // the menu above already sent and always works regardless.
    const buttonsEnabled = global.__featureCache ? global.__featureCache.menu_buttons !== false : true;
    if (buttonsEnabled) {
      try {
        await sock.sendMessage(from, {
          text: "👇 Quick actions:",
          footer: config.botName,
          buttons: [
            { buttonId: `${p}ping`,    buttonText: { displayText: "🏓 Ping" },     type: 1 },
            { buttonId: `${p}runtime`, buttonText: { displayText: "⏱️ Runtime" },  type: 1 },
            { buttonId: `${p}myperm`,  buttonText: { displayText: "🔑 My Perms" }, type: 1 }
          ],
          headerType: 1
        }, { quoted: msg });
      } catch (_) { /* buttons unsupported here, text/image menu already sent */ }
    }
  },

  // ── .register ─────────────────────────────────────────────────────────────
  // Sends the user a link to the web registration panel where they verify
  // their WhatsApp number via OTP and unlock starter credits + a trust badge.
  register: async ({ sock, from, msg }) => {
    const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.WEB_PORT || 3000}`;
    await sock.sendMessage(from, {
      text: `🌟 *Register on the Henry Ochibots Web Panel*\n\n` +
            `Verify your number to unlock:\n` +
            `✅ Free starter credits\n` +
            `✅ A trust badge on your profile\n\n` +
            `👉 ${publicUrl}/register`
    }, { quoted: msg });
  },

  // ── .addadmin ──────────────────────────────────────────────────────────────
  addadmin: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Only *Henry* (main owner) can add admins!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .addadmin 254XXXXXXXXX' }, { quoted: msg });
    global.subAdmins.add(num);
    await sock.sendMessage(from, { text: `✅ *${num}* is now a Beast Bot Sub-Admin!\nThey can use admin commands. 🛡️` }, { quoted: msg });
    // Notify the granted number directly on their own chat
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, {
        text: `🔔 *Access Granted*\n\nThe main admin has given you *Sub-Admin* access on Henry Ochibots v19™.\nType *.menu* to see what you can now use.`
      });
    } catch (err) {
      console.warn(`⚠️ Could not DM +${num} about their new access:`, err.message);
    }
  },

  // ── .settier — owner-only, assign ANY number to ANY permission tier ────────
  // Usage: .settier 254XXXXXXXXX [subadmin|coowner]
  // Unlike .addadmin (sub-admin only), this lets the main owner grant full
  // co-owner (same tier as themselves) access too. Always DMs the target.
  settier: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Only the main owner can assign tiers!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    const tier = (args[1] || '').toLowerCase();
    if (!num || !['subadmin', 'coowner'].includes(tier)) {
      return sock.sendMessage(from, {
        text: '📋 Usage: .settier 254XXXXXXXXX [subadmin|coowner]'
      }, { quoted: msg });
    }

    global.subAdmins = global.subAdmins || new Set();
    global.coOwners = global.coOwners || new Set();

    let tierLabel;
    if (tier === 'subadmin') {
      global.subAdmins.add(num);
      tierLabel = 'Sub-Admin';
    } else {
      global.coOwners.add(num);
      tierLabel = 'Co-Owner (full owner access)';
    }

    await sock.sendMessage(from, {
      text: `✅ *${num}* has been set to tier: *${tierLabel}*.`
    }, { quoted: msg });

    // Notify the granted number directly on their own chat
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, {
        text: `🔔 *Access Granted*\n\nThe main admin has given you *${tierLabel}* access on Henry Ochibots v19™.\nType *.menu* to see what you can now use.`
      });
    } catch (err) {
      console.warn(`⚠️ Could not DM +${num} about their new access:`, err.message);
    }
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

  // ── .login — unlock full access with credentials ───────────────────────────
  // Usage: .login [username] [password]
  // Grants the user temporary session-level owner access (stored in global)
  // ✅ SECURITY FIX: usage hint no longer reveals the real username/password.
  // ✅ SECURITY FIX: failed attempts are rate-limited per number to slow brute force.
  login: async ({ sock, from, msg, args, senderJid }) => {
    const BOT_USER = process.env.BOT_LOGIN_USER || 'Henry';
    const BOT_PASS = process.env.BOT_LOGIN_PASS;
    // 🔒 SECURITY FIX: this used to fall back to a hardcoded default
    // password ('7lq4mv00') baked into the source code on a public repo —
    // anyone reading the code could log in as owner. Now it refuses to
    // work at all until you set BOT_LOGIN_PASS yourself.
    if (!BOT_PASS) {
      return sock.sendMessage(from, {
        text: '🔒 Login is disabled — BOT_LOGIN_PASS is not set in the environment.'
      }, { quoted: msg });
    }
    const inputUser = args[0];
    const inputPass = args[1];
    const num = senderJid.split('@')[0].replace(/:\d+$/, '');

    if (!inputUser || !inputPass) {
      return sock.sendMessage(from, {
        text: '🔐 *Login Required*\n\nUsage: .login [username] [password]'
      }, { quoted: msg });
    }

    // ── Rate limiting: max 3 failed attempts per number per 10 minutes ──────
    global.loginAttempts = global.loginAttempts || new Map();
    const record = global.loginAttempts.get(num) || { count: 0, resetAt: Date.now() + 10 * 60 * 1000 };
    if (Date.now() > record.resetAt) {
      record.count = 0;
      record.resetAt = Date.now() + 10 * 60 * 1000;
    }
    if (record.count >= 3) {
      const waitMin = Math.ceil((record.resetAt - Date.now()) / 60000);
      return sock.sendMessage(from, {
        text: `🚫 Too many failed attempts. Try again in ${waitMin} min.`
      }, { quoted: msg });
    }

    if (inputUser === BOT_USER && inputPass === BOT_PASS) {
      global.loginAttempts.delete(num);
      global.coOwners = global.coOwners || new Set();
      global.coOwners.add(num);
      console.log(`🔓 Login success: +${num} granted session owner access`);
      await sock.sendMessage(from, {
        text:
`✅ *Login Successful!*

🔓 Access: *FULL OWNER ACCESS*

You now have access to all commands and features for this session. Type *.menu* to see everything.

_Access resets when bot restarts._
🔥 *Henry Ochibots v19™*`
      }, { quoted: msg });
    } else {
      record.count += 1;
      global.loginAttempts.set(num, record);
      console.warn(`⚠️ Failed login attempt from +${num} (${record.count}/3)`);
      await sock.sendMessage(from, {
        text: '❌ *Wrong credentials!*'
      }, { quoted: msg });
    }
  },

  // ── .logout — remove session access ───────────────────────────────────────
  logout: async ({ sock, from, msg, senderJid }) => {
    const num = senderJid.split('@')[0].replace(/:\d+$/, '');
    if (global.coOwners?.has(num)) {
      global.coOwners.delete(num);
      await sock.sendMessage(from, { text: '✅ Logged out successfully. Access removed.' }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: 'ℹ️ You are not logged in.' }, { quoted: msg });
    }
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

✨ *HENRY OCHIBOTS V19™* ✨
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
🛡️ Always Online | AI Chat Active
🔥 _Henry Ochibots v19™ — @henrytech254_`;
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
  // ✅ FIX: write to global directly — config was a throwaway object
  public: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    global.botMode = 'public';
    await sock.sendMessage(from, { text: '✅ Bot is now in *PUBLIC* mode — responds to everyone.' }, { quoted: msg });
  },

  private: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    global.botMode = 'private';
    await sock.sendMessage(from, { text: '🔒 Bot is now in *PRIVATE* mode — owner & admins only.' }, { quoted: msg });
  },

  setmode: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const mode = args[0];
    if (!mode) return sock.sendMessage(from, { text: '⚙️ Usage: .setmode on/off' }, { quoted: msg });
    global.botActive = mode === 'on';
    await sock.sendMessage(from, { text: `⚙️ Bot mode: *${mode.toUpperCase()}*` }, { quoted: msg });
  },

  // ── .addcoowner / .removecoowner / .listcoowners ───────────────────────────
  addcoowner: async ({ sock, from, msg, isPrimaryOwner, args }) => {
    if (!isPrimaryOwner) return sock.sendMessage(from, { text: '❌ Only the *primary owner* (Henry) can add co-owners!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .addcoowner 254XXXXXXXXX' }, { quoted: msg });
    global.coOwners.add(num);
    await sock.sendMessage(from, { text: `✅ *+${num}* is now a *Co-Owner*!\nThey have full owner access. 👑` }, { quoted: msg });
  },

  removecoowner: async ({ sock, from, msg, isPrimaryOwner, args }) => {
    if (!isPrimaryOwner) return sock.sendMessage(from, { text: '❌ Only the *primary owner* can remove co-owners!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .removecoowner 254XXXXXXXXX' }, { quoted: msg });
    global.coOwners.delete(num);
    await sock.sendMessage(from, { text: `✅ *+${num}* removed from co-owners.` }, { quoted: msg });
  },

  listcoowners: async ({ sock, from, msg, isPrimaryOwner }) => {
    if (!isPrimaryOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const list = [...global.coOwners];
    if (list.length === 0) return sock.sendMessage(from, { text: '📋 No co-owners added yet.\nUse .addcoowner 254XXXXXXXXX' }, { quoted: msg });
    await sock.sendMessage(from, { text: `👑 *Co-Owners:*\n\n${list.map((n,i) => `${i+1}. +${n}`).join('\n')}` }, { quoted: msg });
  },

  // ── .ownerrecovery — change owner number via secret passphrase ─────────────
  // Usage: .ownerrecovery [OWNER_RECOVERY_SECRET] 254NEWPHONE
  ownerrecovery: async ({ sock, from, msg, isPrimaryOwner, args }) => {
    const SECRET = process.env.OWNER_RECOVERY_SECRET;
    // 🔒 SECURITY FIX: this used to fall back to the same hardcoded default
    // ('7lq4mv00') as .login, sitting in plain text in a public repo —
    // anyone could hijack bot ownership with it. Now it silently does
    // nothing (same as a wrong passphrase) until OWNER_RECOVERY_SECRET is
    // actually set.
    if (!SECRET) return;
    const passphrase = args[0];
    const newNumber = args[1]?.replace(/[^0-9]/g, '');
    if (passphrase !== SECRET) return; // silent fail — don't hint that this command exists
    if (!newNumber) return sock.sendMessage(from, { text: '❌ Usage: .ownerrecovery [passphrase] [new_number]' }, { quoted: msg });
    // Update the global so new messages are checked against new number
    // (full effect requires restart for OWNER_NUMBER const, but this covers runtime)
    global.ownerOverride = newNumber;
    await sock.sendMessage(from, { text: `✅ Owner override set to *+${newNumber}*.\nRestart bot and set OWNER_NUMBER=${newNumber} in your env for permanent effect.` }, { quoted: msg });
  },

  // (summarize is implemented in cypher.js with full AI support)

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

// ── .checklink — heuristic URL safety checker (no external API) ────────────
// Usage: .checklink [url]
// Flags common phishing/scam red flags. This is NOT a guarantee of safety —
// just a fast first-pass screen. Encourage users to still be cautious.
module.exports.checklink = async ({ sock, from, msg, args }) => {
  const input = args[0];
  if (!input) {
    return sock.sendMessage(from, { text: '🔗 Usage: .checklink [url]' }, { quoted: msg });
  }

  let url;
  try {
    url = new URL(input.startsWith('http') ? input : `http://${input}`);
  } catch (e) {
    return sock.sendMessage(from, { text: "❌ That doesn't look like a valid URL." }, { quoted: msg });
  }

  const host = url.hostname.toLowerCase();
  const flags = [];

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    flags.push('Uses a raw IP address instead of a domain name');
  }

  const riskyTlds = ['.zip', '.xyz', '.top', '.tk', '.gq', '.ml', '.cf', '.work', '.click', '.country', '.kim'];
  if (riskyTlds.some(tld => host.endsWith(tld))) {
    flags.push('Uses a TLD frequently abused for scams/phishing');
  }

  const labels = host.split('.');
  if (labels.length > 4) {
    flags.push('Unusually long chain of subdomains');
  }

  const knownBrands = ['paypal', 'whatsapp', 'facebook', 'instagram', 'google', 'apple', 'amazon', 'netflix', 'mpesa', 'safaricom', 'binance'];
  const rootDomain = labels.slice(-2).join('.');
  const brandHit = knownBrands.find(b => host.includes(b) && !rootDomain.startsWith(b));
  if (brandHit) {
    flags.push(`Mentions "${brandHit}" but that's not the actual root domain — classic lookalike pattern`);
  }

  const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rebrand.ly', 'shorturl.at'];
  if (shorteners.includes(host)) {
    flags.push('This is a shortened link — the real destination is hidden until clicked');
  }

  if (url.protocol !== 'https:') {
    flags.push('Not using HTTPS — connection is not encrypted');
  }

  let verdict, emoji;
  if (flags.length === 0) {
    verdict = 'No obvious red flags found.';
    emoji = '✅';
  } else if (flags.length <= 2) {
    verdict = 'A few warning signs — proceed with caution.';
    emoji = '⚠️';
  } else {
    verdict = 'Multiple red flags — this looks risky, avoid entering any info.';
    emoji = '🚫';
  }

  const flagText = flags.length ? flags.map(f => `• ${f}`).join('\n') : '• None detected';

  await sock.sendMessage(from, {
    text:
`${emoji} *Link Check: ${host}*

${verdict}

*Findings:*
${flagText}

_This is a heuristic check, not a guarantee. When in doubt, don't enter passwords or payment info._`
  }, { quoted: msg });
};
