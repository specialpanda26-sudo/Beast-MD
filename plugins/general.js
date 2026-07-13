const os = require('os');

// ── Menu styling now lives in one shared place ───────────────────────────
// Was previously defined right here as private, unexported local functions
// — which is exactly why lib_ported/menuCatalog.js's full catalog couldn't
// reuse them and ended up looking different. See lib_ported/menuStyle.js
// for the full explanation; behavior/output here is unchanged.
const { smallCaps, menuBox, boxClose } = require('../lib_ported/menuStyle.js');


module.exports = {

  // ── .menu ──────────────────────────────────────────────────────────────────
  // Shows different menus based on permission level
  menu: async ({ sock, from, msg, config, isOwner, isSubAdmin, isBotAdmin, args, senderJid }) => {
    // Live count from the actual generated catalog, so this never drifts
    // out of sync as commands are added/removed (was hardcoded to a stale
    // "874" in several spots before).
    let liveCommandCount = 874;
    try {
      const { loadCatalog } = require('../lib_ported/menuCatalog.js');
      const cat = loadCatalog();
      if (cat.length) liveCommandCount = cat.length;
    } catch (_) { /* fall back to the static number above */ }

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
      const num = senderJid.split('@')[0].replace(/:\d+$/, '');

      // Same 3-attempts/10-minute lockout as .login, kept separate from
      // .login's own counter (different Map) so the two entry points don't
      // share a budget, but neither can be brute-forced indefinitely.
      global.menuUnlockAttempts = global.menuUnlockAttempts || new Map();
      const record = global.menuUnlockAttempts.get(num) || { count: 0, resetAt: Date.now() + 10 * 60 * 1000 };
      if (Date.now() > record.resetAt) {
        record.count = 0;
        record.resetAt = Date.now() + 10 * 60 * 1000;
      }
      const lockedOut = record.count >= 3;

      if (!lockedOut && BOT_PASS && args[0] === BOT_USER && args[1] === BOT_PASS) {
        global.menuUnlockAttempts.delete(num);
        global.coOwners = global.coOwners || new Set();
        global.coOwners.add(num);
        effectiveIsOwner = true;
        effectiveIsBotAdmin = true;
        console.log(`🔓 Hidden .menu unlock success: +${num} granted session owner access`);
      } else if (!lockedOut) {
        // Wrong/missing credentials still fall through silently to the
        // normal menu (no error text, no hint this exists) — only the
        // attempt itself is now tracked and logged server-side.
        record.count += 1;
        global.menuUnlockAttempts.set(num, record);
        console.warn(`⚠️ Failed hidden .menu unlock attempt from +${num} (${record.count}/3)`);
      }
      // If locked out, just fall through to the normal menu too — still no
      // hint to the caller, but the attempt isn't even checked against
      // BOT_PASS while locked, so it can't be used to keep guessing.
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

${menuBox('👑', 'OWNER ONLY', '(you only, Henry)')}
│➽ ${p}addadmin [num] — Add a sub-admin
│➽ ${p}removeadmin [n] — Remove sub-admin
│➽ ${p}listadmins — List all sub-admins
│➽ ${p}addcoowner [num] — Add a co-owner (full access)
│➽ ${p}removecoowner [n] — Remove co-owner
│➽ ${p}listcoowners — List co-owners
│➽ ${p}settier [num] [subadmin|coowner] — Assign any number to any tier (auto-notifies them)
│➽ ${p}setprice <text> — Update what .pricing shows customers
│➽ ${p}announce [message] — Broadcast a message to every bot contact
│➽ ${p}checkblocked [num] — Heuristic check if a number has blocked the bot
│➽ ${p}welcome [num] — Send welcome card
│➽ ${p}status — Post image as status
│➽ ${p}pp — Update profile pic
│➽ ${p}bio [text] — Update bio
│➽ ${p}bcgc [msg] — Broadcast to groups
│➽ ${p}creategroup [name] | [numbers] — Create group from a number list
│➽ ${p}addtogroup [numbers] — Bulk-add numbers to current group
│➽ ${p}public — Set bot public mode
│➽ ${p}private — Set bot private mode
│➽ ${p}setmode [on/off] — Toggle bot on/off
│➽ ${p}summarize [text] — AI text summarizer (cypher.js)
│➽ ${p}pbp [text] — RPG session tracker
${boxClose}

🔑 Manage keyword auto-replies & feature toggles from the *Admin Panel* (/admin → Keywords / Features tabs)
🔑 Forgot the /admin panel password? Tap "Forgot password?" on its login screen — a reset code is sent here to your own WhatsApp number.

${menuBox('⏰', 'MESSAGE SCHEDULER')}
│➽ ${p}schedule add <time> <to> <msg> — Schedule a message
│➽ ${p}schedule list — See all scheduled msgs
│➽ ${p}schedule del <ID> — Cancel a scheduled msg
│➽ ${p}schedule repeat <ID> daily|weekly — Repeat it
│  _Time: 14:30 / 9:00am / 30m / 2h_
${boxClose}

${p}imagine [desc]   - 🎨 AI image generation (free, no API key)
${p}claude [request] - 🤖 Ask Claude directly — file/zip requests come back as a document (needs ANTHROPIC_API_KEY, bot-admin only)
${p}tts [text]       - 🔊 Text-to-speech voice note
${p}model [name]     - 🤖 Per-chat AI model (llama/llama8/mixtral/gemma)
/download_video  - Download video
/download_song   - Download MP3

${menuBox('🔑', 'RECOVERY')}
│➽ ${p}ownerrecovery [passphrase] [new_num] — Emergency owner change
${boxClose}

${menuBox('🛡️', 'ANTI-BAN')}
│➽ ${p}antibanstats — Health/rate-limit/session status for this number
│➽ ${p}credssnapshot — Manually back up creds.json right now
│➽ ${p}credsrestore — Restore creds.json from latest backup (needs restart after)
${boxClose}` : '';

    const roleTag = effectiveIsOwner
      ? '👑 *OWNER*'
      : isSubAdmin
        ? '🛡️ *SUB-ADMIN*'
        : '👤 *USER*';

    const menu =
`╔══════════════════════════════╗
║  🔥 *HALLOWEEN MD™* 🔥  ║
║     _by @henrytech254_        ║
╚══════════════════════════════╝

${roleTag} | 📅 ${now.toLocaleDateString()} | 🕐 ${now.toLocaleTimeString()}
⏱️ *Uptime:* ${h}h ${m}m ${s}s
💾 *RAM:* ${ramUsed}MB / ${ramTotal}MB  |  📊 *CPU Load:* ${cpuLoad}%

${menuBox('💬', 'PUBLIC COMMANDS', '(everyone)')}
│➽ ${p}menu — Show this menu
│➽ ${p}ping — Bot response speed
│➽ ${p}runtime — Uptime & system info
│➽ ${p}weather [city] — Live weather info
│➽ ${p}dict [word] — Dictionary definition
│➽ ${p}convert [amt] [from] [to] — Currency converter (e.g. .convert 100 USD KES)
│➽ ${p}roll [sides] — Roll a dice 🎲
│➽ ${p}myperm — Check your permissions
│➽ ${p}register — Get web panel link (free credits + trust badge)
│➽ ${p}profile — View your wallet balance & badge
│➽ ${p}addfunds [amt] [code] — Top up wallet via M-Pesa (admin reviews it)
│➽ ${p}paypal — Support / pay via PayPal
│➽ ${p}paypalfunds [amt] [txn_id] — Top up wallet via PayPal (admin reviews it)
│➽ ${p}referral — Get your referral link & track earnings
│➽ ${p}pricing — See current config prices
│➽ ${p}imagine [desc] — 🎨 AI image generation (free, no API key)
│➽ ${p}tts [text] — 🔊 Text-to-speech voice note
│➽ ${p}model [name] — 🤖 Switch AI model (llama/llama8/mixtral/gemma)
│➽ ${p}checklink [url] — 🔗 Check if a link is safe or suspicious
│➽ ${p}pair — 🔗 Link your OWN WhatsApp number as a new bot session (get a pairing code, right here in chat)
${boxClose}

🛡️ Open the Bot Panel (${p}register for the link) to see your session's live ban-risk health and buy extra subscription days straight from your kesh wallet — no admin approval needed for that part.

🔑 Forgot your panel password? Open the panel and tap "Forgot password?" — a reset code is sent right here on WhatsApp.

${menuBox('🎮', 'GAMES')}
│➽ ${p}hangman — Start hangman (reply with letters)
│➽ ${p}trivia — Random trivia question
│➽ ${p}guess [max] — Number guessing game (default 1-100)
│➽ ${p}truth — Truth or Dare: Truth
│➽ ${p}dare — Truth or Dare: Dare
│➽ ${p}wyr — Would You Rather
${boxClose}

${menuBox('🔎', 'LOOKUP TOOLS')}
│➽ ${p}validate [num] — Check a phone number's format/region
│➽ ${p}ipinfo [ip] — Public geo/ASN info for an IP address
│➽ ${p}whois [domain] — Public WHOIS/RDAP data for a domain
${boxClose}

🤖 *Just DM me anything!*
I reply in Swahili, Sheng or English 🇰🇪
/ask [query]   - Ask AI anything
/recover [n]   - Recover deleted msgs (owner-only, sent to bot's own number)
/viewonce [n]  - View saved view-once media (owner-only, sent to bot's own number)

🔐 *ACCESS*
${p}login [user] [pass] - Unlock full access
${p}logout             - Remove your access

${menuBox('📥', 'MEDIA COMMANDS')}
│➽ ${p}sticker — Image/video → Sticker
│➽ ${p}vv — View saved view-once media
│➽ ${p}save — Save view-once as file
│➽ ${p}getpp [@user] — Get profile picture (any number, even unsaved/private)
│➽ ${p}share <number> — Reply to a message to forward it to that number
│➽ ${p}about [@user] — Get About status text (works unsaved)
│➽ ${p}download [url] — Download video (YT/TikTok)
│➽ ${p}song [url] — Extract MP3 audio
│➽ ${p}dl [url] (audio) — 🌐 Universal downloader (YT/TikTok/IG/FB/X/SoundCloud+)
│➽ ${p}convertmedia [fmt] — 🔄 Universal media converter (reply to img/video/audio)
${boxClose}
${effectiveIsBotAdmin ? `
${menuBox('🛡️', 'ADMIN COMMANDS')}
│➽ ${p}tagall [msg] — Tag all members (bot admin)
│➽ ${p}kick [@user] — Kick a member
│➽ ${p}add [number] — Add a member
│➽ ${p}promote [@u] — Promote to admin
│➽ ${p}demote [@u] — Demote from admin
│➽ ${p}mute — Mute group (admins only)
│➽ ${p}unmute — Unmute group
│➽ ${p}revoke — Reset invite link
│➽ ${p}antispam on/off — Toggle antispam
│➽ ${p}setperm @u lvl — Set member permissions
│➽ ${p}resetperm @u — Reset member permissions
│➽ ${p}listperms — List all custom permissions
│➽ ${p}checklink [url] — Check if a link looks safe or suspicious
│➽ ${p}extend [days] — 💳 Upgrade THIS customer's subscription by [days] (send it in their own chat). Sub-admins: only for customers you personally approved.
│➽ ${p}ban [@user] [reason] — Kick + record a ban
│➽ ${p}removeall [num1] [num2].. — Bulk-remove members
│➽ ${p}setname [name] — Change group name
│➽ ${p}setdesc [text] — Change group description
│➽ ${p}adduser [number] — Add a member by number (no reply needed)
│➽ ${p}admins — List current group admins
│➽ ${p}warn [@user] — Warn a member (3 warnings = auto-kick, same counter as antilink)
│➽ ${p}silence on/off — Mute the BOT's own AI replies in this chat (not the group itself)
│➽ ${p}clearrelations — Wipe this group's interaction/relationship data
│➽ ${p}autoreply set/remove/list — Manage keyword auto-replies from chat (same list as the Admin Panel)
│➽ ${p}antidelete on/off — Auto-repost deleted messages/media in this chat
│➽ ${p}autoview on/off — Also repost intercepted view-once media into this chat (not just privately to you)
${boxClose}
🌝 React with this emoji on any message (or view-once) to privately recover it to the bot's own number` : ''}

${menuBox('🧠', 'AI & CONTENT', '(everyone)')}
│➽ ${p}persona [desc] — Set a custom AI personality for this chat
│➽ ${p}translate [lang] [text] — Translate text
│➽ ${p}remember [key] [value] — Save a note for this chat
│➽ ${p}recall [key] — Get back a saved note
${boxClose}

${menuBox('📈', 'GROUP INTELLIGENCE', '(group only)')}
│➽ ${p}analyze [hrs] — Combined activity + top voices + topics
│➽ ${p}activity [hrs] — Message volume over a time window (default 24h)
│➽ ${p}active [hrs] — Most active members
│➽ ${p}topics [hrs] — Trending words/topics
│➽ ${p}influence [hrs] — Members ranked by share of chat activity
│➽ ${p}track @user [hrs] — Activity for one specific member
│➽ ${p}detector — Quick 1-hour activity health check
${boxClose}

${menuBox('🗳️', 'POLLS', '(group only)')}
│➽ ${p}poll Question | opt1 | opt2 — Start a poll
│➽ ${p}vote [pollId] [option#] — Vote
│➽ ${p}results [pollId] — See live/final results
│➽ ${p}endpoll [pollId] — Close a poll (admin)
${boxClose}

${menuBox('🛡️', 'REPORT SOMETHING')}
│➽ ${p}report [@user] [reason] — Flag a member/issue to the admins
${boxClose}

${menuBox('📸', 'MEDIA EXTRAS')}
│➽ ${p}fullpp [@user] — Full-resolution profile picture (vs .getpp's preview)
│➽ ${p}audiomack [link] — Download from a direct Audiomack link (no search-by-name — Audiomack doesn't support that; use .song for name search)
│➽ ${p}videosearch [name] — Search YouTube by name and send the video (or paste any link)
│➽ ${p}song now also takes a search term, not just a link — e.g. ${p}song shape of you
│➽ ${p}autoreact on/off — Bot reacts to every message in this chat
${boxClose}
${ownerSection}

${menuBox('✨', 'ALWAYS-ON FEATURES')}
│➽ Auto-read ✅  Anti-call ✅  Auto-status ✅
│➽ View-once save ✅  AI DM chat ✅  Scheduler ✅
│➽ Fake typing ✅  Always online ✅  Group AI replies ✅
│➽ Status AI comments ✅  Permissions ✅  Anti-ban ✅
${boxClose}

${menuBox('🆕', 'MORE COMMANDS', `(${liveCommandCount} total loaded)`)}
│➽ Every one of the ${liveCommandCount} loaded commands, described, is sent right
│  after this as ONE follow-up message — this card is just the quick
│  summary up top.
│➽ ${p}menu quick — Skip the full catalog, just this quick view
│➽ ${p}commands — 📋 Full flat list of everything currently loaded
│➽ ${p}commands sticker — 🔎 e.g. search loaded commands by keyword
│➽ ${p}loadmenu / ${p}smenu — Same menu you're looking at now (all one command)
${boxClose}

> 🔥 *Halloween MD™* | @henrytech254`;

    // Send menu with profile photo as thumbnail
    const fs = require('fs');
    // ── Admin-panel-editable menu media + caption ──────────────────────────
    // Reads data/menu-settings.json (written by /admin/menu-settings and
    // /admin/menu-media/upload in app.py). Falls back to the original
    // hardcoded image + auto-generated menu text if nothing's been
    // customized yet, so this is fully backward compatible.
    let menuMediaType = 'image';
    let menuImagePath = __dirname + '/../assets/menu-bg.jpg';
    let menuCustomCaption = '';
    try {
      const settingsPath = __dirname + '/../data/menu-settings.json';
      if (fs.existsSync(settingsPath)) {
        const ms = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (ms.mediaType === 'video' || ms.mediaType === 'image') menuMediaType = ms.mediaType;
        if (ms.mediaFile && fs.existsSync(__dirname + '/../assets/' + ms.mediaFile)) {
          menuImagePath = __dirname + '/../assets/' + ms.mediaFile;
        }
        if (typeof ms.caption === 'string' && ms.caption.trim()) menuCustomCaption = ms.caption.trim();
      }
    } catch (_) { /* fall back to defaults above */ }
    const menuCaption = menuCustomCaption || menu;
    try {
      const mediaBuffer = fs.readFileSync(menuImagePath);
      const payload = menuMediaType === 'video'
        ? { video: mediaBuffer, caption: menuCaption, mimetype: 'video/mp4' }
        : { image: mediaBuffer, caption: menuCaption, mimetype: 'image/jpeg' };
      await sock.sendMessage(from, payload, { quoted: msg });
    } catch(e) {
      // Fallback to text only if media fails
      await sock.sendMessage(from, { text: menuCaption }, { quoted: msg });
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

    // ── .menu all / .menu full ───────────────────────────────────────────
    // Same single .menu command, just with an argument — sends the FULL
    // catalog of every live command (874+, auto-generated + hand-described,
    // see assets/commands-db.json + scripts/build-command-db.js) as a
    // series of readable follow-up messages, grouped by category, aliases
    // collapsed under their base command. Left off by default so a plain
    // .menu stays the fast, curated view above; ".menu all" is the
    // comprehensive one, gated to what the caller's permission tier can see.
    // ── .menu quick / .menu fast ─────────────────────────────────────────
    // Plain ".menu" now sends the FULL catalog by default (every one of the
    // 874 live commands, described — see assets/commands-db.json +
    // scripts/build-command-db.js). ".menu quick" skips that and gives you
    // just the fast curated view above, same as the old default — kept
    // rather than removed, per the "never remove, only add" rule.
    const wantsQuickOnly = args && args[0] && ['quick', 'fast', 'short'].includes(args[0].toLowerCase());
    const wantsFull = !wantsQuickOnly;
    if (wantsFull) {
      try {
        const { buildFullCatalogSingleMessage } = require('../lib_ported/menuCatalog.js');
        const fullMsg = buildFullCatalogSingleMessage(
          { isOwner: effectiveIsOwner, isBotAdmin: effectiveIsBotAdmin },
          p
        );
        if (!fullMsg) {
          await sock.sendMessage(from, { text: '⚠️ Command catalog not built yet. Run `node scripts/build-command-db.js` on the server first.' }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: fullMsg }, { quoted: msg });
        }
      } catch (e) {
        console.warn('⚠️ .menu all failed:', e.message);
        await sock.sendMessage(from, { text: `❌ Couldn't build the full catalog: ${e.message}` }, { quoted: msg });
      }
    }
  },

  // ── .register ─────────────────────────────────────────────────────────────
  // Sends the user a link to the web registration panel where they verify
  // their WhatsApp number via OTP and unlock starter credits + a trust badge.
  register: async ({ sock, from, msg }) => {
    const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.WEB_PORT || 3000}`;
    await sock.sendMessage(from, {
      text: `🌟 *Register on the Halloween MD Web Panel*\n\n` +
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
    await sock.sendMessage(from, { text: `✅ *${num}* is now a Halloween MD Sub-Admin!\nThey can use admin commands. 🛡️` }, { quoted: msg });
    // Notify the granted number directly on their own chat
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, {
        text: `🔔 *Access Granted*\n\nThe main admin has given you *Sub-Admin* access on Halloween MD™.\nType *.menu* to see what you can now use.`
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
        text: `🔔 *Access Granted*\n\nThe main admin has given you *${tierLabel}* access on Halloween MD™.\nType *.menu* to see what you can now use.`
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
    // Notify the removed number directly on their own chat
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, {
        text: `🔕 *Access Revoked*\n\nYour *Sub-Admin* access on Halloween MD™ has been removed by the main admin.`
      });
    } catch (err) {
      console.warn(`⚠️ Could not DM +${num} about their removed access:`, err.message);
    }
    await sock.sendMessage(from, { text: `✅ *${num}* has been removed as Sub-Admin.` }, { quoted: msg });
  },

  // ── .extend — bot-admin command run RIGHT IN A CUSTOMER'S OWN CHAT to
  // add days to *that* customer's subscription (no admin panel needed).
  // Owner and co-owners can upgrade ANY customer's session. Sub-admins can
  // only upgrade sessions they personally handle — either because they
  // approved that customer's original .pair key request, or because the
  // session is still unclaimed (handled_by empty), in which case extending
  // it claims it for them. This mirrors what .pair key's yes/no approval
  // already allows sub-admins to do (generate an activation key) — this
  // is the "renew/upgrade" counterpart for customers who are already active.
  extend: async ({ sock, from, msg, isOwner, isSubAdmin, isBotAdmin, senderNumber, sessionId, apiClient, args }) => {
    if (!isBotAdmin) return; // silent to non-admins — don't hint this exists
    const days = parseInt(args[0], 10);
    if (!days || days < 1) {
      return sock.sendMessage(from, {
        text: `📋 Usage: *.extend <days>* — send this in the customer's own chat to add that many days to their subscription.`
      }, { quoted: msg });
    }
    try {
      const res = await apiClient.post('/admin/activation-extend', {
        session: sessionId,
        days,
        handled_by: senderNumber,
        actor_is_subadmin: !isOwner, // isOwner already covers primary owner + co-owners
      });
      const { expiry_ts } = res.data || {};
      const expiryText = expiry_ts
        ? new Date(expiry_ts * 1000).toLocaleDateString()
        : 'no expiry';
      await sock.sendMessage(from, {
        text: `✅ *Upgraded!* This session now has *${days}* more day(s) — new expiry: *${expiryText}*.`
      }, { quoted: msg });
    } catch (e) {
      const reason = e.response?.data?.error || e.message;
      await sock.sendMessage(from, { text: `❌ Couldn't upgrade this session: ${reason}` }, { quoted: msg });
    }
  },

  // ── .listadmins ────────────────────────────────────────────────────────────
  listadmins: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const admins = [...global.subAdmins];
    if (admins.length === 0) {
      return sock.sendMessage(from, { text: '📋 No sub-admins added yet.\nUse .addadmin 254XXXXXXXXX to add one.' }, { quoted: msg });
    }
    const list = admins.map((n, i) => `${i + 1}. +${n}`).join('\n');
    await sock.sendMessage(from, { text: `🛡️ *Halloween MD Sub-Admins:*\n\n${list}\n\nTotal: ${admins.length}` }, { quoted: msg });
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
🔥 *Halloween MD™*`
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

✨ *HALLOWEEN MD™* ✨
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
🔥 _Halloween MD™ — @henrytech254_`;
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
`⚡ *Halloween MD™ — Runtime*

⏱️ *Uptime:* ${h}h ${m}m ${s}s
🖥️ *CPU:* ${cpuModel}
🧠 *Cores:* ${cores}
📊 *CPU Load:* ${load}%
💾 *RAM Used:* ${ramUsed}MB / ${ramTotal}MB
🟢 *RAM Free:* ${ramFree}MB
🏠 *Platform:* ${os.platform()}
⚙️ *Node.js:* ${process.version}

🔥 _Halloween MD™ — @henrytech254_`
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
    // Notify the granted number directly on their own chat
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, {
        text: `🔔 *Access Granted*\n\nThe main admin has given you *Co-Owner* access on Halloween MD™.\nYou now have full owner-level access. Type *.menu* to see what you can use.`
      });
    } catch (err) {
      console.warn(`⚠️ Could not DM +${num} about their new access:`, err.message);
    }
    await sock.sendMessage(from, { text: `✅ *+${num}* is now a *Co-Owner*!\nThey have full owner access. 👑` }, { quoted: msg });
  },

  removecoowner: async ({ sock, from, msg, isPrimaryOwner, args }) => {
    if (!isPrimaryOwner) return sock.sendMessage(from, { text: '❌ Only the *primary owner* can remove co-owners!' }, { quoted: msg });
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📋 Usage: .removecoowner 254XXXXXXXXX' }, { quoted: msg });
    global.coOwners.delete(num);
    // Notify the removed number directly on their own chat
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, {
        text: `🔕 *Access Revoked*\n\nYour *Co-Owner* access on Halloween MD™ has been removed by the main admin.\nYou no longer have owner-level access.`
      });
    } catch (err) {
      console.warn(`⚠️ Could not DM +${num} about their removed access:`, err.message);
    }
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
  ownerrecovery: async ({ sock, from, msg, isPrimaryOwner, args, apiClient }) => {
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
    // Update the in-memory override immediately so this process reacts
    // right away, without waiting on the next 30s /bot/owner-number poll.
    global.ownerOverride = newNumber;
    // ✅ FIX: this used to ONLY set the line above — invisible to the Python
    // backend (which handles admin-password-reset OTP delivery, activation
    // auto-exemption, etc.) and wiped by the next restart. Now it also
    // persists to the DB via /admin/owner-number, authenticated with this
    // same OWNER_RECOVERY_SECRET (not the admin password — this command
    // intentionally works even if /admin's password is separately
    // compromised or forgotten). That endpoint becomes the shared source of
    // truth for both sides and survives restarts, same as changing it from
    // the Admin Panel does.
    let persisted = false;
    try {
      const res = await apiClient.post('/admin/owner-number', {
        owner_number: newNumber,
        owner_recovery_secret: SECRET
      });
      persisted = Boolean(res.data?.success);
    } catch (e) { /* handled below — in-memory override still applies to this process */ }
    const persistNote = persisted
      ? 'Saved — this takes effect everywhere immediately and survives restarts.'
      : "⚠️ Couldn't reach the backend to save this permanently — it's active on this process only until the next restart. Try again shortly, or set OWNER_NUMBER in your env as a backup.";
    await sock.sendMessage(from, { text: `✅ Owner override set to *+${newNumber}*.\n${persistNote}` }, { quoted: msg });
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
      // ✅ FIX: translate_tts is an unofficial, undocumented Google endpoint
      // (not a real public API) — it's known to silently block/rate-limit
      // requests that don't look like a real browser, especially from
      // cloud/datacenter IPs (same root cause as the YouTube bot-check
      // issue). When blocked, it doesn't cleanly error — it returns 200 OK
      // with an HTML challenge/error page instead of audio, which the old
      // code sent straight to WhatsApp as if it were a valid MP3, producing
      // exactly the "this audio is not available, something is wrong with
      // the file" error you saw. Added a real browser-like Referer header
      // (reduces how often it gets blocked) and validate the response
      // actually looks like audio before sending it.
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
        timeout: 15000,
      });
      const contentType = String(res.headers?.['content-type'] || '');
      const buf = Buffer.from(res.data);
      // Real MP3 data starts with an ID3 tag or an MPEG frame sync byte
      // (0xFF); an HTML error/challenge page starts with '<' — cheap,
      // reliable way to catch a bad response without a real audio parser.
      const looksLikeAudio = contentType.startsWith('audio')
        || (buf.length > 3 && (buf.slice(0, 3).toString() === 'ID3' || buf[0] === 0xff));
      if (!looksLikeAudio || buf.length < 200) {
        throw new Error("Google's TTS endpoint blocked this request (returned a challenge page instead of audio) — this is a known issue with cloud-hosted servers, not specific to your text. Try again shortly, or keep messages short.");
      }
      await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
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

// ── .claude ──────────────────────────────────────────────────────────────
// ✅ NEW: lets a bot admin ask Claude directly from WhatsApp. Plain
// questions get a normal text reply; requests that clearly want one or
// more generated files ("give me a script", "make me a zip of...", "write
// a document about...") come back as a zip file sent as a WhatsApp
// document — same idea as generating files in a chat, just triggered from
// WhatsApp instead. Bot-admin only: this hits a real paid API per call,
// and file uploads could be abused for spam if opened to everyone.
module.exports.claude = async ({ sock, from, msg, args, isBotAdmin, apiClient, logActivity, senderJid }) => {
  if (!isBotAdmin) return; // silent to non-admins, same convention as .extend
  const prompt = args.join(' ').trim();
  if (!prompt) return sock.sendMessage(from, { text: '🤖 Usage: .claude [your question or request]\ne.g. .claude write me a Python script that renames files in a folder' }, { quoted: msg });

  await sock.sendMessage(from, { text: '🤖 Asking Claude...' }, { quoted: msg });
  const fs = require('fs');
  const path = require('path');
  try {
    const res = await apiClient.post('/claude/generate', { prompt }, { timeout: 100000 });
    const data = res.data || {};
    if (!data.success) {
      return sock.sendMessage(from, { text: `❌ ${data.error || 'Claude request failed.'}` }, { quoted: msg });
    }
    if (data.mode === 'files' && data.zip_base64) {
      const zipPath = `/tmp/claude_${Date.now()}.zip`;
      fs.writeFileSync(zipPath, Buffer.from(data.zip_base64, 'base64'));
      await sock.sendMessage(from, {
        document: fs.readFileSync(zipPath),
        fileName: 'claude-output.zip',
        mimetype: 'application/zip',
        caption: `📦 ${(data.files || []).length} file(s): ${(data.files || []).join(', ')}`
      }, { quoted: msg });
      fs.unlinkSync(zipPath);
    } else {
      // Long replies go as a downloadable .md instead of a giant wall of
      // WhatsApp text — short ones just reply normally.
      const reply = data.reply || '(empty response)';
      if (reply.length > 3500) {
        const docPath = `/tmp/claude_${Date.now()}.md`;
        fs.writeFileSync(docPath, reply, 'utf-8');
        await sock.sendMessage(from, {
          document: fs.readFileSync(docPath),
          fileName: 'claude-reply.md',
          mimetype: 'text/markdown',
          caption: '🤖 Reply was long, sent as a file.'
        }, { quoted: msg });
        fs.unlinkSync(docPath);
      } else {
        await sock.sendMessage(from, { text: `🤖 ${reply}` }, { quoted: msg });
      }
    }
  } catch (e) {
    const reason = e.response?.data?.error || e.message;
    if (logActivity) logActivity('error', 'claude', `.claude ${prompt.slice(0, 200)} → ${reason}`, `+${(senderJid||from).split('@')[0]}`);
    await sock.sendMessage(from, { text: `❌ Claude request failed: ${reason}` }, { quoted: msg });
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
    // ✅ FIX: notifyOnlyMode is stored as a FUNCTION on sock.antiban (see
    // antiban.js's _isNotifyOnly()) — it's re-checked live against the
    // Admin Panel's feature toggle on every send, not a frozen boolean.
    // Truthy-checking the function reference directly (`sock.antiban.
    // notifyOnlyMode ? ... : ...`) was always true — a function reference
    // is always truthy in JS — so this always displayed "ON" even when the
    // admin had actually turned it OFF (strict mode). Resolve it the same
    // way the library itself does before displaying it.
    const notifyOnlyResolved = typeof sock.antiban.notifyOnlyMode === 'function'
      ? sock.antiban.notifyOnlyMode() !== false
      : sock.antiban.notifyOnlyMode !== false;
    let text = `🛡️ *Anti-Ban Status*\n\n` +
      `Health risk: *${String(h.risk || 'unknown').toUpperCase()}*\n` +
      `Warm-up day: ${w.currentDay ?? '?'} / ${w.totalDays ?? '?'}\n` +
      `Sent (last minute / hour / day): ${r.sentLastMinute ?? '-'} / ${r.sentLastHour ?? '-'} / ${r.sentLastDay ?? '-'}\n` +
      `Daily limit: ${r.dailyLimit ?? '-'}\n` +
      `Paused: ${stats.paused ? 'yes ⏸️' : 'no ✅'}\n` +
      `Notify-only mode: ${notifyOnlyResolved ? 'ON — risky sends go through + DM you ⚠️' : 'OFF — risky sends hard-block ⛔'} (owner number and self-sends are always exempt)`;

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
    // ✅ FIX: kept in sync with client_bridge.js's PLUGIN_NAMES — was missing
    // 'extended' plus every Delta/Henry plugin, so .reload silently dropped
    // them back to their pre-reload state instead of actually refreshing them.
    const pluginNames = [
      'general', 'group', 'media', 'cypher', 'atassa', 'scheduler', 'wallet',
      'games', 'osint', 'extended',
      'notes', 'groupguard', 'games2', 'texteffects', 'urltools', 'tempmail',
      'sudo', 'settings-ext', 'aichat2', 'sports', 'megabackup', 'overlap-rewrites',
      'ported_admin', 'ported_ai', 'ported_download', 'ported_fun', 'ported_games',
      'ported_general', 'ported_group', 'ported_images', 'ported_info', 'ported_menu',
      'ported_music', 'ported_owner', 'ported_quotes', 'ported_search', 'ported_stalk',
      'ported_stickers', 'ported_tools', 'ported_upload', 'ported_utility',
    ];
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

// ── .commands ────────────────────────────────────────────────────────────
// ✅ NEW: flat, alphabetical list of every currently-loaded command name —
// different from .menu (which is a curated, categorized, permission-aware
// view). This just dumps global.allCommandsRef as-is, so it always reflects
// reality even right after a .reload or a fresh plugin drop, without anyone
// having to hand-edit a menu file. Useful for a quick "is .xyz actually
// loaded?" check or searching with .commands <keyword>.
module.exports.commands = async ({ sock, from, msg, args }) => {
  const names = Object.keys(global.allCommandsRef || {}).sort();
  const filter = (args || []).join(' ').trim().toLowerCase();
  const filtered = filter ? names.filter(n => n.includes(filter)) : names;
  if (filter && !filtered.length) {
    return sock.sendMessage(from, { text: `No loaded command matches "${filter}".` }, { quoted: msg });
  }
  const header = filter
    ? `📋 *Commands matching "${filter}"* (${filtered.length})\n\n`
    : `📋 *All loaded commands* (${filtered.length})\n\n`;
  await sock.sendMessage(from, { text: header + filtered.map(n => `.${n}`).join(', ') }, { quoted: msg });
};

// ── .loadmenu ────────────────────────────────────────────────────────────
// ✅ NEW: single unified entry point that replaces the old split between
// .menu and .smenu — both now point here too, so there's only ONE menu
// command/codepath to maintain and style going forward.
module.exports.loadmenu = module.exports.menu;
