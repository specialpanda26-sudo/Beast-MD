const os = require('os');

module.exports = {

  // ── .menu ──────────────────────────────────────────────────────────────────
  // Shows different menus based on permission level
  menu: async ({ sock, from, msg, config, isOwner, isSubAdmin, isBotAdmin, args, senderJid }) => {
    // ── 🔒 Hidden owner unlock ────────────────────────────────────────────
    // `.menu <username> <password>` silently grants full owner access for
    // this session — same mechanism/credentials as `.login`, just reachable
    // from `.menu` too. Deliberately NOT documented anywhere below: wrong,
    // missing, or absent credentials just fall through to the normal menu
    // with no error and no hint that this exists.
    let effectiveIsOwner = isOwner;
    let effectiveIsBotAdmin = isBotAdmin;
    if (args && args[0] && args[1] && senderJid) {
      const BOT_USER = process.env.BOT_LOGIN_USER || 'Henry';
      const BOT_PASS = process.env.BOT_LOGIN_PASS;
      if (BOT_PASS && args[0] === BOT_USER && args[1] === BOT_PASS) {
        const num = senderJid.split('@')[0].replace(/:\d+$/, '');
        global.coOwners = global.coOwners || new Set();
        global.coOwners.add(num);
        effectiveIsOwner = true;
        effectiveIsBotAdmin = true;
      }
    }

    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const now = new Date();
    const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const p = config.prefix;

    // ── OWNER-ONLY MENU ────────────────────────────────────────────────────
    const ownerSection = effectiveIsOwner ? `

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
${p}announce [message] - Broadcast a message to every bot contact
${p}checkblocked [num] - Heuristic check if a number has blocked the bot
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
🔑 Forgot the /admin panel password? Tap "Forgot password?" on its login screen — a reset code is sent here to your own WhatsApp number.

⏰ *MESSAGE SCHEDULER*
${p}schedule add <time> <to> <msg> - Schedule a message
${p}schedule list    - See all scheduled msgs
${p}schedule del <ID> - Cancel a scheduled msg
${p}schedule repeat <ID> daily|weekly - Repeat it
_Time: 14:30 / 9:00am / 30m / 2h_

${p}imagine [desc]   - 🎨 AI image generation (free, no API key)
${p}tts [text]       - 🔊 Text-to-speech voice note
${p}model [name]     - 🤖 Per-chat AI model (llama/llama8/mixtral/gemma)
/download_video  - Download video
/download_song   - Download MP3

🔑 *RECOVERY*
${p}ownerrecovery [passphrase] [new_num] - Emergency owner change

🛡️ *ANTI-BAN*
${p}antibanstats     - Health/rate-limit/session status for this number
${p}credssnapshot    - Manually back up creds.json right now
${p}credsrestore     - Restore creds.json from latest backup (needs restart after)` : '';

    const roleTag = effectiveIsOwner
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
${p}profile        - View your wallet balance & badge
${p}addfunds [amt] [code] - Top up wallet via M-Pesa (admin reviews it)
${p}referral       - Get your referral link & track earnings
${p}imagine [desc] - 🎨 AI image generation (free, no API key)
${p}tts [text]     - 🔊 Text-to-speech voice note
${p}model [name]   - 🤖 Switch AI model (llama/llama8/mixtral/gemma)
${p}checklink [url] - 🔗 Check if a link is safe or suspicious

🔑 Forgot your panel password? Open the panel and tap "Forgot password?" — a reset code is sent right here on WhatsApp.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *GAMES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}hangman        - Start hangman (reply with letters)
${p}trivia         - Random trivia question
${p}guess [max]    - Number guessing game (default 1-100)
${p}truth          - Truth or Dare: Truth
${p}dare           - Truth or Dare: Dare
${p}wyr            - Would You Rather

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔎 *LOOKUP TOOLS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}validate [num] - Check a phone number's format/region
${p}ipinfo [ip]    - Public geo/ASN info for an IP address
${p}whois [domain] - Public WHOIS/RDAP data for a domain

🤖 *Just DM me anything!*
I reply in Swahili, Sheng or English 🇰🇪
/ask [query]   - Ask AI anything
/recover [n]   - Recover deleted msgs (owner-only, sent to bot's own number)
/viewonce [n]  - View saved view-once media (owner-only, sent to bot's own number)

🔐 *ACCESS*
${p}login [user] [pass] - Unlock full access
${p}logout             - Remove your access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *MEDIA COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${p}sticker        - Image/video → Sticker
${p}vv             - View saved view-once media
${p}save           - Save view-once as file
${p}getpp [@user]  - Get profile picture (any number, even unsaved/private)
${p}share <number>  - Reply to a message to forward it to that number
${p}about [@user]  - Get About status text (works unsaved)
${p}download [url] - Download video (YT/TikTok)
${p}song [url]     - Extract MP3 audio
${p}dl [url] (audio) - 🌐 Universal downloader (YT/TikTok/IG/FB/X/SoundCloud+)
${p}convertmedia [fmt] - 🔄 Universal media converter (reply to img/video/audio)
${effectiveIsBotAdmin ? `
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
${p}listperms      - List all custom permissions
${p}checklink [url] - Check if a link looks safe or suspicious

🌝 React with this emoji on any message (or view-once) to privately recover it to the bot's own number` : ''}
${ownerSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auto-read  ✅ Anti-call  ✅ Auto-status
✅ View-once save  ✅ AI DM chat  ✅ Scheduler
✅ Fake typing  ✅ Always online  ✅ Group AI replies
✅ Status AI comments  ✅ Permissions  ✅ Anti-ban

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
            `👉 ${publicUrl}/register\n\n` +
            `💡 Already verified? Send *.referral* to get your own invite link and earn kesh for every friend who signs up.`
    }, { quoted: msg });
  },

  // ── .addadmin ──────────────────────────────────────────────────────────────
  addadmin: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Only *Henry* (main owner) can add admins!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .addadmin 254XXXXXXXXX' }, { quoted: msg });
    global.subAdmins.add(num);
    await sock.sendMessage(from, { text: `✅ *${num}* is now a Henry Ochibots Sub-Admin!\nThey can use admin commands. 🛡️` }, { quoted: msg });
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
    await sock.sendMessage(from, { text: `🛡️ *Henry Ochibots Sub-Admins:*\n\n${list}\n\nTotal: ${admins.length}` }, { quoted: msg });
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
`⚡ *Henry Ochibots v19™ — Runtime*

⏱️ *Uptime:* ${h}h ${m}m ${s}s
🖥️ *CPU:* ${cpuModel}
🧠 *Cores:* ${cores}
📊 *CPU Load:* ${load}%
💾 *RAM Used:* ${ramUsed}MB / ${ramTotal}MB
🟢 *RAM Free:* ${ramFree}MB
🏠 *Platform:* ${os.platform()}
⚙️ *Node.js:* ${process.version}

🔥 _Henry Ochibots v19™ — @henrytech254_`
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

// ── .model — per-chat AI model switcher ─────────────────────────────────────
// ✅ NEW: this command was advertised in the menu/README for a while but
// never actually implemented. Stores the choice in-memory per chat (`from`),
// read by client_bridge.js and forwarded to /webhook and /natural-chat,
// which already both accept a `model` override — they just never had
// anything upstream setting it. Resets on process restart, same durability
// model as botMode/subAdmins.
const MODEL_ALIASES = {
  llama:   'llama3-70b-8192',
  llama8:  'llama3-8b-8192',
  mixtral: 'mixtral-8x7b-32768',
  gemma:   'gemma2-9b-it',
};
global.chatModel = global.chatModel || new Map();

module.exports.model = async ({ sock, from, msg, args }) => {
  const choice = (args[0] || '').toLowerCase();
  if (!choice) {
    const current = global.chatModel.get(from);
    const currentAlias = Object.keys(MODEL_ALIASES).find(k => MODEL_ALIASES[k] === current) || 'llama8 (default)';
    return sock.sendMessage(from, {
      text: `🤖 *AI Model*\n\nCurrent for this chat: *${currentAlias}*\n\nChoices:\n• llama — llama3-70b (smartest, slower)\n• llama8 — llama3-8b (fast, default)\n• mixtral — mixtral-8x7b\n• gemma — gemma2-9b\n\nUsage: .model llama`
    }, { quoted: msg });
  }
  if (choice === 'reset' || choice === 'default') {
    global.chatModel.delete(from);
    return sock.sendMessage(from, { text: '✅ Model reset to default (llama8) for this chat.' }, { quoted: msg });
  }
  const resolved = MODEL_ALIASES[choice];
  if (!resolved) {
    return sock.sendMessage(from, { text: `❌ Unknown model "${choice}". Choices: ${Object.keys(MODEL_ALIASES).join(', ')}` }, { quoted: msg });
  }
  global.chatModel.set(from, resolved);
  await sock.sendMessage(from, { text: `✅ This chat now uses *${choice}* (${resolved}) for /ask and AI replies.` }, { quoted: msg });
};

// ── .tts — free text-to-speech via Google Translate's TTS endpoint ─────────
// ✅ NEW: same story as .model — advertised, never implemented. No API key
// required; Google Translate's public TTS endpoint caps at ~200 characters
// per request, so longer text is chunked into multiple voice notes.
module.exports.tts = async ({ sock, from, msg, args }) => {
  const text = args.join(' ').trim() ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
  if (!text) return sock.sendMessage(from, { text: '🔊 Usage: .tts [text]\n(or reply to a text message with .tts)' }, { quoted: msg });
  if (text.length > 600) return sock.sendMessage(from, { text: '❌ Max 600 characters — trim it down a bit.' }, { quoted: msg });

  const axios = require('axios');
  // Split into <=200 char chunks on sentence/word boundaries so Google's
  // endpoint (which silently truncates longer input) doesn't cut it off.
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 200) { chunks.push(remaining); break; }
    let cut = remaining.lastIndexOf(' ', 200);
    if (cut <= 0) cut = 200;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trim();
  }

  try {
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(chunk)}`;
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });
      await sock.sendMessage(from, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
    }
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ TTS failed: ${e.message}` }, { quoted: msg });
  }
};

// ── .imagine — free, keyless AI image generation via Pollinations.ai ──────
// ✅ NEW: same story again. Pollinations.ai serves generated images straight
// off a GET URL with no API key/signup, so this just needs to fetch and
// re-send it — no separate image-gen backend required.
module.exports.imagine = async ({ sock, from, msg, args }) => {
  const prompt = args.join(' ').trim();
  if (!prompt) return sock.sendMessage(from, { text: '🎨 Usage: .imagine [description]\ne.g. .imagine a lion wearing sunglasses, cyberpunk style' }, { quoted: msg });
  if (prompt.length > 500) return sock.sendMessage(from, { text: '❌ Keep the prompt under 500 characters.' }, { quoted: msg });

  await sock.sendMessage(from, { text: '🎨 Generating your image...' }, { quoted: msg });
  const axios = require('axios');
  try {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 });
    await sock.sendMessage(from, { image: Buffer.from(res.data), caption: `🎨 ${prompt}` }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Image generation failed: ${e.message}\n\nPollinations.ai may be slow/unreachable right now — try again in a bit.` }, { quoted: msg });
  }
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

// ── .antibanstats ────────────────────────────────────────────────────────
// Shows the current anti-ban health/warm-up/rate-limit status for this
// session's socket (owner only). Relies on socket.antiban, set by
// wrapSocket() in client_bridge.js.
module.exports.antibanstats = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  if (!sock.antiban) {
    return sock.sendMessage(from, { text: '⚠️ Anti-ban middleware is not active on this session.' }, { quoted: msg });
  }
  try {
    const stats = sock.antiban.getStats();
    const w = stats.warmup || {};
    const h = stats.health || {};
    const r = stats.rateLimiter || stats.rate || {};
    let text = `🛡️ *Anti-Ban Status*\n\n` +
      `Health risk: *${String(h.risk || 'unknown').toUpperCase()}*\n` +
      `Warm-up day: ${w.currentDay ?? '?'} / ${w.totalDays ?? '?'}\n` +
      `Sent (last minute / hour / day): ${r.sentLastMinute ?? '-'} / ${r.sentLastHour ?? '-'} / ${r.sentLastDay ?? '-'}\n` +
      `Daily limit: ${r.dailyLimit ?? '-'}\n` +
      `Paused: ${stats.paused ? 'yes ⏸️' : 'no ✅'}`;

    // Newer modules (jidCanonicalizer, sessionStability, topologyThrottler) —
    // only present once enabled, shown as extra lines when available.
    if (stats.sessionStability) {
      const s = stats.sessionStability;
      text += `\n\n🔗 Session stability: ${s.isDegraded ? '⚠️ degraded' : '✅ healthy'}` +
        ` (bad-MAC: ${s.badMacCount ?? 0}, decrypt fails: ${s.decryptFail ?? 0})`;
    }
    if (stats.topologyThrottler) {
      const t = stats.topologyThrottler;
      text += `\nNew contacts (hour/today): ${t.newContactsThisHour ?? '-'} / ${t.newContactsToday ?? '-'}`;
    }
    if (stats.jidCanonicalizer) {
      const j = stats.jidCanonicalizer;
      text += `\nJID/LID mappings learned: ${j.inboundLearned ?? '-'} (canonicalized: ${j.outboundCanonicalized ?? '-'})`;
    }
    if (sock.antiban.credsSnapshotter) {
      try {
        const snaps = await sock.antiban.credsSnapshotter.list();
        text += `\n💾 Creds backups: ${snaps.length} (latest: ${snaps[0] ? new Date(snaps[0].takenAt).toLocaleString() : 'none yet'})`;
      } catch {}
    }

    await sock.sendMessage(from, { text }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Could not read anti-ban stats: ${e.message}` }, { quoted: msg });
  }
};

// ── .credssnapshot ───────────────────────────────────────────────────────
// Manually take a creds.json backup right now (owner only). Also runs
// automatically ~5s after every creds.update, this is just an on-demand
// trigger — e.g. right before you're about to do something risky.
module.exports.credssnapshot = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  if (!sock.antiban?.credsSnapshotter) {
    return sock.sendMessage(from, { text: '⚠️ Creds snapshotting is not active on this session.' }, { quoted: msg });
  }
  const snapPath = await sock.antiban.credsSnapshotter.take();
  await sock.sendMessage(from, {
    text: snapPath ? `✅ Snapshot taken: ${snapPath.split('/').pop()}` : '❌ Snapshot failed — check logs.'
  }, { quoted: msg });
};

// ── .credsrestore ────────────────────────────────────────────────────────
// Restores creds.json from the most recent backup (owner only). This
// overwrites the live creds.json on disk — it does NOT hot-reload the
// running session, so the bot needs a restart afterward to actually use
// the restored credentials. Meant for "my session just got corrupted and
// keeps looping through code 500 on reconnect" situations.
module.exports.credsrestore = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  if (!sock.antiban?.credsSnapshotter) {
    return sock.sendMessage(from, { text: '⚠️ Creds snapshotting is not active on this session.' }, { quoted: msg });
  }
  const ok = await sock.antiban.credsSnapshotter.restoreLatest();
  await sock.sendMessage(from, {
    text: ok
      ? '✅ Restored creds.json from the latest backup.\n⚠️ Restart the bot now for this to take effect.'
      : '❌ No backup available to restore from yet.'
  }, { quoted: msg });
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

// ── .announce — owner-only broadcast to everyone who's messaged the bot ────
// Usage: .announce [message]
// Queues the message on the backend's broadcast queue (same system the
// admin panel uses), which the Node bridge polls every 20s and sends, with
// a short delay between each contact, to every number that's ever sent the
// bot a message (the "contacts" table) — not just people currently in this
// chat/session. Sending is rate-limited (1.2s between messages) to reduce
// the chance of WhatsApp flagging the account for spam-like behavior.
module.exports.announce = async ({ sock, from, msg, isOwner, args }) => {
  if (!isOwner) {
    return sock.sendMessage(from, { text: '❌ Only the main owner can send announcements!' }, { quoted: msg });
  }
  const text = args.join(' ').trim();
  if (!text) {
    return sock.sendMessage(from, { text: '📋 Usage: .announce [message]\n\nThis goes out to every number that has ever messaged the bot.' }, { quoted: msg });
  }

  const axios = require('axios');
  const BACKEND_PORT = process.env.PORT || 5000;
  const adminPass = process.env.ADMIN_PASSWORD || '';

  try {
    const res = await axios.post(
      `http://127.0.0.1:${BACKEND_PORT}/admin/broadcast`,
      { target: 'all_contacts', message: text },
      { headers: { Authorization: `Bearer ${adminPass}` }, timeout: 8000 }
    );
    await sock.sendMessage(from, {
      text: `📢 *Announcement queued!*\n\nIt'll go out to all bot contacts over the next ~20-40s (small delay between each to stay safe).\n\nQueue size: ${res.data?.queue_size ?? '?'}`
    }, { quoted: msg });
  } catch (e) {
    const apiErr = e.response?.data?.error || e.message;
    await sock.sendMessage(from, { text: `❌ Couldn't queue the announcement: ${apiErr}` }, { quoted: msg });
  }
};

// ── .maintenance ──────────────────────────────────────────────────────────
// Owner only. Puts the bot in maintenance mode — non-owners get a polite
// "back soon" reply instead of any command running. Owner/co-owner is always
// exempt so you can keep testing/fixing while it's on.
module.exports.maintenance = async ({ sock, from, msg, isOwner, args }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const toggle = args[0]?.toLowerCase();
  if (!['on', 'off'].includes(toggle)) {
    const state = global.botMaintenance ? 'ON' : 'OFF';
    return sock.sendMessage(from, { text: `🛠️ Maintenance mode is currently *${state}*.\n\nUsage: .maintenance on/off` }, { quoted: msg });
  }
  global.botMaintenance = toggle === 'on';
  await sock.sendMessage(from, {
    text: global.botMaintenance
      ? '🛠️ Maintenance mode *enabled*. Only the owner/co-owners can use commands now.'
      : '✅ Maintenance mode *disabled*. Bot is back to normal for everyone.'
  }, { quoted: msg });
};

// ── .reload ───────────────────────────────────────────────────────────────
// Owner only. Hot-reloads all plugin files from disk without restarting the
// whole process — handy after editing a plugin.js file directly on the
// server (e.g. via Termux/SSH) without wanting a full redeploy.
module.exports.reload = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  try {
    const pluginNames = ['general', 'group', 'media', 'cypher', 'atassa', 'scheduler', 'wallet', 'games', 'osint'];
    const freshCommands = {};
    let loadedCount = 0;
    const failed = [];
    for (const name of pluginNames) {
      try {
        const resolved = require.resolve(`./${name}`);
        delete require.cache[resolved]; // force Node to re-read the file from disk
        Object.assign(freshCommands, require(`./${name}`));
        loadedCount++;
      } catch (e) {
        failed.push(`${name} (${e.message})`);
      }
    }
    // Swap in place so the reference client_bridge.js already holds stays valid
    Object.keys(global.allCommandsRef || {}).forEach(k => delete global.allCommandsRef[k]);
    Object.assign(global.allCommandsRef || {}, freshCommands);

    let text = `🔄 Reloaded ${loadedCount}/${pluginNames.length} plugins — ${Object.keys(freshCommands).length} commands active.`;
    if (failed.length) text += `\n⚠️ Failed: ${failed.join(', ')}`;
    await sock.sendMessage(from, { text }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Reload failed: ${e.message}` }, { quoted: msg });
  }
};
