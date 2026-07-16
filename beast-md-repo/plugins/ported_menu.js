// Beast MD ported module (category: menu)
// Mechanically converted from ESM handler(sock,message,args,context) shape
// into Henry's CommonJS module.exports = { cmdName: async (h) => {...} } shape.
// h = { sock, from, msg, isOwner, isPrimaryOwner, isCoOwner, isSubAdmin, isBotAdmin,
//       isGroup, sender, senderJid, sessionId, senderNumber, args, config, apiClient, logActivity }
// NOTE: review each command before relying on it in production — mechanical port,
// not manually re-verified line by line. Some referenced npm packages must be
// installed (see NEW_DEPENDENCIES.txt) and some external API keys/endpoints are
// the friend's own third-party services (discardapi.onrender.com etc.) which may
// be rate-limited, unreliable, or disappear without notice.

module.exports = {};


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from animes.js ---
  const supportedAnimes = [
      'akira', 'akiyama', 'anna', 'asuna', 'ayuzawa', 'boruto', 'chiho', 'chitoge',
      'deidara', 'erza', 'elaina', 'eba', 'emilia', 'hestia', 'hinata', 'inori',
      'isuzu', 'itachi', 'itori', 'kaga', 'kagura', 'kaori', 'keneki', 'kotori',
      'kurumi', 'madara', 'mikasa', 'miku', 'minato', 'naruto', 'nezuko', 'sagiri',
      'sasuke', 'sakura'
  ];
  function pickRandom(arr, count = 1) {
      const shuffled = arr.slice().sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
  }
  const animuMenu = '🎀 *Animes Menu* 🎀\n\n' +
      '• *akira*\n' +
      '• *akiyama*\n' +
      '• *anna*\n' +
      '• *asuna*\n' +
      '• *ayuzawa*\n' +
      '• *boruto*\n' +
      '• *chiho*\n' +
      '• *chitoge*\n' +
      '• *deidara*\n' +
      '• *erza*\n' +
      '• *elaina*\n' +
      '• *eba*\n' +
      '• *emilia*\n' +
      '• *hestia*\n' +
      '• *hinata*\n' +
      '• *inori*\n' +
      '• *isuzu*\n' +
      '• *itachi*\n' +
      '• *itori*\n' +
      '• *kaga*\n' +
      '• *kagura*\n' +
      '• *kaori*\n' +
      '• *keneki*\n' +
      '• *kotori*\n' +
      '• *kurumi*\n' +
      '• *madara*\n' +
      '• *mikasa*\n' +
      '• *miku*\n' +
      '• *minato*\n' +
      '• *naruto*\n' +
      '• *nezuko*\n' +
      '• *sagiri*\n' +
      '• *sasuke*\n' +
      '• *sakura*\n\n' +
      '📌 *Usage:*\n' +
      '.animes <name>\n' +
      'Example: *.animes naruto*';
  return {

    // ── .animes ─── Send random anime images | usage: .animes <anime_name>
    "animes": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'animes ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const input = args[0] ? args[0] : '';
        const typeLower = input.toLowerCase();
        if (!input || !supportedAnimes.includes(typeLower)) {
            const replyText = input && !supportedAnimes.includes(typeLower)
                ? `Unsupported anime: ${typeLower}\n\n`
                : '';
            return await sock.sendMessage(chatId, { text: replyText + animuMenu }, { quoted: message });
        }
        try {
            const apiUrl = `https://raw.githubusercontent.com/Guru322/api/Guru/BOT-JSON/anime-${typeLower}.json`;
            const res = await axios.get(apiUrl, { timeout: 15000, validateStatus: s => s < 500 });
            const images = res.data;
            if (!Array.isArray(images) || images.length === 0)
                throw new Error('No images found');
            const randomImages = pickRandom(images, Math.min(3, images.length));
            for (const img of randomImages) {
                try {
                    const imageData = await axios.get(img, { responseType: 'arraybuffer', timeout: 15000 });
                    await sock.sendMessage(chatId, { image: Buffer.from(imageData.data), caption: `_${typeLower}_` }, { quoted: message });
                }
                catch { }
            }
        }
        catch (err) {
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch anime images. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:animes] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .animes: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "animeimg": async (h) => module.exports["animes"](h),
    "animepic": async (h) => module.exports["animes"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { exec } = require('child_process');
  // --- helper code from audiofx.js ---
  const effectsMenu = '🎧 *Audio Effects* 🎧\n\n' +
      '• *bass*\n' +
      '• *blown*\n' +
      '• *deep*\n' +
      '• *earrape*\n' +
      '• *fast*\n' +
      '• *fat*\n' +
      '• *nightcore*\n' +
      '• *reverse*\n' +
      '• *robot*\n' +
      '• *slow*\n' +
      '• *chipmunk*\n\n' +
      '📌 *Usage:*\n' +
      'Reply to an audio / voice note with:\n' +
      'Example: *.audiofx bass*';
  function getFilter(cmd) {
      if (/bass/i.test(cmd))
          return 'equalizer=f=94:width_type=o:width=2:g=30';
      if (/blown/i.test(cmd))
          return 'acrusher=.1:1:64:0:log';
      if (/deep/i.test(cmd))
          return 'atempo=1,asetrate=44500*2/3';
      if (/earrape/i.test(cmd))
          return 'volume=12';
      if (/fast/i.test(cmd))
          return 'atempo=1.63';
      if (/fat/i.test(cmd))
          return 'atempo=1.6';
      if (/nightcore/i.test(cmd))
          return 'atempo=1.06';
      if (/reverse/i.test(cmd))
          return 'areverse';
      if (/robot/i.test(cmd))
          return "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)'";
      if (/slow/i.test(cmd))
          return 'atempo=0.7';
      if (/tupai|squirrel|chipmunk/i.test(cmd))
          return 'atempo=0.5';
      return null;
  }
  async function getAudio(message) {
      const m = message.message || {};
      const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
      const audio = m.audioMessage || m.voiceMessage || quoted?.audioMessage || quoted?.voiceMessage;
      if (!audio)
          return null;
      const stream = await downloadContentFromMessage(audio, 'audio');
      const chunks = [];
      for await (const c of stream)
          chunks.push(c);
      return Buffer.concat(chunks);
  }
  return {

    // ── .audiofx ─── Apply audio effects to voice notes | usage: .bass / .nightcore (reply to audio)
    "audiofx": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'audiofx ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const cmd = message.body || args.join(' ');
        const filter = getFilter(cmd);
        const audioBuffer = await getAudio(message);
        if (!audioBuffer || !filter) {
            return await sock.sendMessage(chatId, { text: effectsMenu }, { quoted: message });
        }
        try {
            const tmp = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmp))
                fs.mkdirSync(tmp, { recursive: true });
            const input = path.join(tmp, `in_${Date.now()}.ogg`);
            const output = path.join(tmp, `out_${Date.now()}.ogg`);
            fs.writeFileSync(input, audioBuffer);
            exec(`ffmpeg -y -i "${input}" -af "${filter},aresample=48000,asetpts=N/SR" -c:a libopus -b:a 64k -ac 1 "${output}"`, async () => {
                const out = fs.readFileSync(output);
                await sock.sendMessage(chatId, { audio: out, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
                try {
                    fs.unlinkSync(input);
                }
                catch { }
                try {
                    fs.unlinkSync(output);
                }
                catch { }
            });
        }
        catch {
            await sock.sendMessage(chatId, { text: '❌ Audio processing failed. Make sure ffmpeg is installed.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:audiofx] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .audiofx: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "bass": async (h) => module.exports["audiofx"](h),
    "blown": async (h) => module.exports["audiofx"](h),
    "deep": async (h) => module.exports["audiofx"](h),
    "earrape": async (h) => module.exports["audiofx"](h),
    "fast": async (h) => module.exports["audiofx"](h),
    "fat": async (h) => module.exports["audiofx"](h),
    "nightcore": async (h) => module.exports["audiofx"](h),
    "robot": async (h) => module.exports["audiofx"](h),
    "slow": async (h) => module.exports["audiofx"](h),
    "chipmunk": async (h) => module.exports["audiofx"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from notes.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const notesDB = {};
  async function getUserNotes(userId) {
      if (HAS_DB) {
          const notes = await store.getSetting(userId, 'notes');
          return notes || [];
      }
      else {
          return notesDB[userId] || [];
      }
  }
  async function saveUserNotes(userId, notes) {
      if (HAS_DB) {
          await store.saveSetting(userId, 'notes', notes);
      }
      else {
          notesDB[userId] = notes;
      }
  }
  return {

    // ── .notes ─── Store, view, and delete your personal notes | usage: .notes <add|all|del|delall> [text|ID]
    "notes": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'notes ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;
        try {
            const action = args[0] ? args[0].toLowerCase() : null;
            const content = args.slice(1).join(" ").trim();
            const menuText = `
╭───── *『 NOTES 』* ───◆
┃ Store notes for later use
┃ Storage: ${HAS_DB ? 'Database 🗄️' : 'Memory 📁'}
┃
┃ ● Add Note
┃    .notes add your text here
┃
┃ ● Get All Notes
┃    .notes all
┃
┃ ● Delete Note
┃    .notes del noteID
┃
┃ ● Delete All Notes
┃    .notes delall
╰━━━━━━━━━━━━━━━━━──⊷`;
            if (!action) {
                return await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
            }
            if (action === 'add') {
                if (!content) {
                    return await sock.sendMessage(chatId, {
                        text: "*Please write a note to save.*\nExample: .notes add buy milk"
                    }, { quoted: message });
                }
                const userNotes = await getUserNotes(sender);
                const newID = userNotes.length + 1;
                userNotes.push({ id: newID, text: content, createdAt: Date.now() });
                await saveUserNotes(sender, userNotes);
                return await sock.sendMessage(chatId, {
                    text: `✅ Note saved.\nID: ${newID}\nStorage: ${HAS_DB ? 'Database' : 'Memory'}`
                }, { quoted: message });
            }
            if (action === 'all') {
                const userNotes = await getUserNotes(sender);
                if (userNotes.length === 0) {
                    return await sock.sendMessage(chatId, { text: "*You have no notes saved.*" }, { quoted: message });
                }
                const list = userNotes.map((n) => `${n.id}. ${n.text}`).join("\n");
                return await sock.sendMessage(chatId, {
                    text: `*📝 Your Notes:*\n\n${list}\n\n_Total: ${userNotes.length} notes_`
                }, { quoted: message });
            }
            if (action === 'del') {
                const id = parseInt(args[1], 10);
                const userNotes = await getUserNotes(sender);
                if (!id || !userNotes.find((n) => n.id === id)) {
                    return await sock.sendMessage(chatId, {
                        text: "Invalid note ID.\nExample: .notes del 1"
                    }, { quoted: message });
                }
                const filteredNotes = userNotes.filter((n) => n.id !== id);
                await saveUserNotes(sender, filteredNotes);
                return await sock.sendMessage(chatId, { text: `*✅ Note ID ${id} deleted.*` }, { quoted: message });
            }
            if (action === 'delall') {
                const userNotes = await getUserNotes(sender);
                if (userNotes.length === 0) {
                    return await sock.sendMessage(chatId, { text: "*You have no notes to delete.*" }, { quoted: message });
                }
                await saveUserNotes(sender, []);
                return await sock.sendMessage(chatId, { text: "*✅ All notes deleted successfully.*" }, { quoted: message });
            }
            return await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
        }
        catch (err) {
            console.error("Notes Command Error:", err);
            await sock.sendMessage(chatId, { text: "❌ Error in notes module." }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:notes] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .notes: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "note": async (h) => module.exports["notes"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .privacy ─── Manage all WhatsApp privacy settings, block/unblock users | usage: .privacy — show menu
    "privacy": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'privacy ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const setting = args[0]?.toLowerCase();
        const value = args[1]?.toLowerCase();
        // ── No args: show full menu ───────────────────────────────────────
        if (!setting) {
            return await sock.sendMessage(chatId, {
                text: `╔══════════════╗\n` +
                    `║🔒*PRIVACY SETTING*║\n` +
                    `╚══════════════╝\n` +
                    `📌 *Usage:* \`.pvcy <set> <val>\`\n\n` +
                    `────────────────────\n` +
                    `*⚙️ PRIVACY CONTROLS*\n\n` +
                    `👁️ *lastseen* — \`all\` \`contacts\` \`blacklist\` \`none\`\n\n` +
                    `🟢 *online* — \`all\` \`match_last_seen\`\n\n` +
                    `🖼️ *profile* — \`all\` \`contacts\` \`blacklist\` \`none\`\n\n` +
                    `📊 *status* — \`all\` \`contacts\` \`blacklist\` \`none\`\n\n` +
                    `✅ *receipts* — \`all\` \`none\`\n\n` +
                    `👥 *groups* — \`all\` \`contacts\` \`blacklist\`\n\n` +
                    `⏳ *timer* — \`off\` \`24h\` \`7d\` \`90d\`\n\n` +
                    `*🚫 BLOCK CONTROLS*\n\n` +
                    `🔴 *block* — \`<number>\` or reply to msg\n\n` +
                    `🟢 *unblock* — \`<number>\` or reply to msg\n\n` +
                    `📋 *blocklist* — view blocked users\n\n` +
                    `*📊 INFO*\n` +
                    `🔍 *status* — view privacy settings\n` +
                    `────────────────────\n\n` +
                    `💡 *Examples:*\n` +
                    `› \`.privacy lastseen all\`\n\n` +
                    `› \`.privacy receipts none\`\n\n` +
                    `› \`.privacy timer 7d\`\n\n` +
                    `› \`.privacy block 923001234567\`\n\n` +
                    `› \`.privacy blocklist\`\n\n` +
                    `› \`.privacy status\``,
                ...channelInfo
            }, { quoted: message });
        }
        // ── status: show current privacy settings ─────────────────────────
        if (setting === 'status') {
            try {
                const s = await sock.fetchPrivacySettings(true);
                const fmt = (v) => v ? `\`${v}\`` : `\`unknown\``;
                return await sock.sendMessage(chatId, {
                    text: `╔═══════════════╗\n` +
                        `║🔒*CURRENT PRIVACY*║\n` +
                        `╚═══════════════╝\n\n` +
                        `👁️ *Last Seen:* ${fmt(s.last)}\n\n` +
                        `🟢 *Online:* ${fmt(s.online)}\n\n` +
                        `🖼️ *Profile Pic:* ${fmt(s.profile)}\n\n` +
                        `📊 *Status:* ${fmt(s.status)}\n\n` +
                        `✅ *Read Receipts:* ${fmt(s.readreceipts)}\n\n` +
                        `👥 *Groups Add:* ${fmt(s.groupadd)}\n\n` +
                        `_Use \`.pvcy <set> <value>\` to change_`,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (e) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to fetch settings: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }
        // ── blocklist ─────────────────────────────────────────────────────
        if (setting === 'blocklist') {
            try {
                const list = await sock.fetchBlocklist();
                if (!list || list.length === 0) {
                    return await sock.sendMessage(chatId, { text: `📋 *Block List*\n\n_No blocked users._`, ...channelInfo }, { quoted: message });
                }
                const entries = list.map((jid, i) => `${i + 1}. +${jid.split('@')[0]}`).join('\n');
                return await sock.sendMessage(chatId, {
                    text: `╔═════════════╗\n` +
                        `║🚫 *BLOCK LIST*   ║\n` +
                        `╚═════════════╝\n\n` +
                        `${entries}\n\n` +
                        `────────────────────\n` +
                        `*Total:* ${list.length} blocked user(s)`,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (e) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to fetch block list: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }
        // ── block/unblock ─────────────────────────────────────────────────
        if (setting === 'block' || setting === 'unblock') {
            let targetJid = null;
            const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
            if (quotedParticipant) {
                const num = quotedParticipant.split('@')[0].split(':')[0];
                targetJid = `${num}@s.whatsapp.net`;
            }
            if (!targetJid && value) {
                const num = value.replace(/[^0-9]/g, '');
                if (num.length >= 7)
                    targetJid = `${num}@s.whatsapp.net`;
            }
            if (!targetJid && !chatId.endsWith('@g.us')) {
                targetJid = chatId;
            }
            if (!targetJid) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Provide a number or reply to a message.\n\nExample: \`.privacy block 923001234567\``,
                    ...channelInfo
                }, { quoted: message });
            }
            try {
                await sock.updateBlockStatus(targetJid, setting);
                const icon = setting === 'block' ? '🚫' : '✅';
                const action = setting === 'block' ? 'Blocked' : 'Unblocked';
                return await sock.sendMessage(chatId, {
                    text: `${icon} *${action}* +${targetJid.split('@')[0]}`,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (e) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to ${setting}: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }
        // ── default disappearing timer ────────────────────────────────────
        if (setting === 'timer') {
            const durations = {
                'off': 0, '0': 0,
                '24h': 86400, '1d': 86400,
                '7d': 604800, '1w': 604800,
                '90d': 7776000, '3m': 7776000,
            };
            if (!value || !(value in durations)) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Choose: \`off\` \`24h\` \`7d\` \`90d\`\n\nExample: \`.privacy timer 7d\``,
                    ...channelInfo
                }, { quoted: message });
            }
            try {
                await sock.updateDefaultDisappearingMode(durations[value]);
                const label = value === 'off' || value === '0' ? 'disabled' : `set to *${value}*`;
                return await sock.sendMessage(chatId, { text: `⏳ Default disappearing timer ${label}`, ...channelInfo }, { quoted: message });
            }
            catch (e) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to set timer: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }
        // ── privacy setting updates ───────────────────────────────────────
        const privacySettings = {
            lastseen: { fn: (v) => sock.updateLastSeenPrivacy(v), allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist', 'none'], label: 'Last Seen' },
            online: { fn: (v) => sock.updateOnlinePrivacy(v), allowed: ['all', 'match_last_seen'], label: 'Online Status' },
            profile: { fn: (v) => sock.updateProfilePicturePrivacy(v), allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist', 'none'], label: 'Profile Picture' },
            status: { fn: (v) => sock.updateStatusPrivacy(v), allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist', 'none'], label: 'Status' },
            receipts: { fn: (v) => sock.updateReadReceiptsPrivacy(v), allowed: ['all', 'none'], label: 'Read Receipts' },
            groups: { fn: (v) => sock.updateGroupsAddPrivacy(v), allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist'], label: 'Groups Add' },
        };
        const config = privacySettings[setting];
        if (!config) {
            return await sock.sendMessage(chatId, {
                text: `❌ Unknown option: *${setting}*\n\nUse \`.privacy\` to see all commands.`,
                ...channelInfo
            }, { quoted: message });
        }
        if (!value || !config.allowed.includes(value)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Invalid value for *${setting}*\n\nAllowed: ${config.allowed.filter(v => v !== 'contact_blacklist').map(v => `\`${v}\``).join(' ')}`,
                ...channelInfo
            }, { quoted: message });
        }
        const resolvedValue = value === 'blacklist' ? 'contact_blacklist' : value;
        try {
            await config.fn(resolvedValue);
            return await sock.sendMessage(chatId, {
                text: `✅ *${config.label}* set to \`${value}\``,
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[PRIVACY] Error:', e.message);
            return await sock.sendMessage(chatId, {
                text: `❌ Failed to update ${config.label}: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:privacy] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .privacy: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "setprivacy": async (h) => module.exports["privacy"](h),
    "pvcy": async (h) => module.exports["privacy"](h),
    "pri": async (h) => module.exports["privacy"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { loadArray } = require('../lib_ported/localData');

  // --- helper code from random-img.js ---
  const imageUrls = {
      chinese: 'images/tiktokpics/china.json',
      hijab: 'images/tiktokpics/hijab.json',
      malaysia: 'images/tiktokpics/malaysia.json',
      japanese: 'images/tiktokpics/japan.json',
      korean: 'images/tiktokpics/korea.json',
      malay: 'images/tiktokpics/malaysia.json',
      random: 'images/tiktokpics/random.json',
      random2: 'images/tiktokpics/random2.json',
      thai: 'images/tiktokpics/thailand.json',
      vietnamese: 'images/tiktokpics/vietnam.json',
      indo: 'images/tiktokpics/indonesia.json',
      boneka: 'images/randompics/boneka.json',
      blackpink3: 'images/randompics/blackpink.json',
      bike: 'images/randompics/bike.json',
      antiwork: 'images/randompics/antiwork.json',
      aesthetic: 'images/randompics/aesthetic.json',
      justina: 'images/randompics/justina.json',
      doggo: 'images/randompics/doggo.json',
      cosplay2: 'images/randompics/cosplay.json',
      cat: 'images/randompics/cat.json',
      car: 'images/randompics/car.json',
      profile2: 'images/randompics/profile.json',
      ppcouple2: 'images/randompics/ppcouple.json',
      notnot: 'images/randompics/notnot.json',
      kpop: 'images/randompics/kpop.json',
      kayes: 'images/randompics/kayes.json',
      ulzzanggirl: 'images/randompics/ulzzanggirl.json',
      ulzzangboy: 'images/randompics/ulzzangboy.json',
      ryujin: 'images/randompics/ryujin.json',
      rose: 'images/randompics/rose.json',
      pubg: 'images/randompics/pubg.json',
      wallml: 'images/randompics/wallml.json',
      wallhp: 'images/randompics/wallhp.json',
  };
  function pickRandom(arr, count = 1) {
      const result = [];
      const copy = [...arr];
      for (let i = 0; i < count; i++) {
          if (copy.length === 0)
              break;
          const index = Math.floor(Math.random() * copy.length);
          result.push(copy.splice(index, 1)[0]);
      }
      return result;
  }
  return {

    // ── .images ─── Send 3 random images for a given category | usage: .images <category>
    "images": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'images ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const category = (args[0] || '').toLowerCase();
        if (!category || !imageUrls[category]) {
            const categoriesList = Object.keys(imageUrls)
                .map((c, i) => `┃ ${i + 1}. ${c}`)
                .join('\n');
            const menuText = `
╭──── *『 IMAGES 』* ──◆
┃ Available Categories:
${categoriesList}
┃
┃ *Usage example:*
┃   .images cat
╰━━━━━━━━━━━━━━────⊷
            `.trim();
            return await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
        }
        try {
            const images = loadArray(imageUrls[category]);
            if (!Array.isArray(images) || images.length === 0) {
                throw new Error('No images found in the dataset');
            }
            const selectedImages = pickRandom(images, 3);
            for (const img of selectedImages) {
                await sock.sendMessage(chatId, {
                    image: { url: img },
                    caption: `📷 Random ${category} image`
                }, { quoted: message });
            }
        }
        catch (err) {
            console.error('Images Command Error:', err);
            await sock.sendMessage(chatId, {
                text: '❌ An error occurred while processing your request. Please try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:images] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .images: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "wallpics": async (h) => module.exports["images"](h),
    "pics": async (h) => module.exports["images"](h),
  };
})());


Object.assign(module.exports, (() => {
  const pkg = require('api-qasim');
  // --- helper code from styletext.js ---
  const PortedAPI = pkg;
  return {

    // ── .stext ─── Style text in different fancy formats | usage: .stext <text>
    "stext": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'stext ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ');
        try {
            if (!text || text.trim() === '') {
                await sock.sendMessage(chatId, {
                    text: "*Please provide a text to style.*\nExample: .stext Hello"
                }, { quoted: message });
                return;
            }
            const styledResult = await PortedAPI.styletext(text);
            if (!Array.isArray(styledResult) || styledResult.length === 0) {
                throw new Error('No styled text found.');
            }
            let messageText = 'Reply with choosen number:\n\n';
            styledResult.forEach((item, index) => {
                const styledText = item.result || item;
                messageText += `*${index + 1}.* ${styledText}\n`;
            });
            const sentMsg = await sock.sendMessage(chatId, {
                text: messageText
            }, { quoted: message });
            sock.styletext = sock.styletext || {};
            sock.styletext[sentMsg.key.id] = styledResult;
            const listener = async ({ messages }) => {
                const m = messages[0];
                if (!m.message || !m.key || !m.key.remoteJid)
                    return;
                if (m.key.remoteJid !== chatId)
                    return;
                let isQuoted = false;
                if (m.message.extendedTextMessage &&
                    m.message.extendedTextMessage.contextInfo &&
                    m.message.extendedTextMessage.contextInfo.quotedMessage) {
                    const quotedId = m.message.extendedTextMessage.contextInfo.stanzaId
                        || m.message.extendedTextMessage.contextInfo.quotedMessageKey?.id;
                    if (quotedId === sentMsg.key.id)
                        isQuoted = true;
                }
                let userReply = m.message.conversation || '';
                if (m.message.extendedTextMessage && m.message.extendedTextMessage.text)
                    userReply = m.message.extendedTextMessage.text;
                if (!userReply)
                    return;
                if (!isQuoted && m.message.conversation !== sentMsg.key.id)
                    return;
                const choice = parseInt(userReply.trim(), 10);
                if (!isNaN(choice) && choice >= 1 && choice <= styledResult.length) {
                    const selectedText = styledResult[choice - 1].result || styledResult[choice - 1];
                    await sock.sendMessage(m.key.remoteJid, { text: selectedText }, { quoted: m });
                    delete sock.styletext[sentMsg.key.id];
                    sock.ev.off('messages.upsert', listener);
                }
                else {
                    await sock.sendMessage(m.key.remoteJid, {
                        text: `Invalid selection. Please choose a number between 1 and ${styledResult.length}.`
                    }, { quoted: m });
                }
            };
            sock.ev.on('messages.upsert', listener);
        }
        catch (error) {
            console.error('Error in styleTextCommand:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to style the text. Please try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:stext] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .stext: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "fancytext": async (h) => module.exports["stext"](h),
    "textstyle": async (h) => module.exports["stext"](h),
    "styletext": async (h) => module.exports["stext"](h),
  };
})());


Object.assign(module.exports, (() => {
  const mumaker = require('mumaker');
  // --- helper code from textmaker.js ---
  const allTypes = [
      'metallic', 'ice', 'snow', 'impressive', 'matrix', 'light', 'neon', 'devil',
      'purple', 'thunder', 'leaves', '1917', 'arena', 'hacker', 'sand',
      'blackpink', 'glitch', 'fire'
  ];
  return {

    // ── .ephoto ─── Generate styled text with various effects | usage: .ephoto <type> <text>
    "ephoto": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'ephoto ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const type = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');
        if (!type || !allTypes.includes(type) || !text) {
            let menuText = `✨🎨 *EPHOTO TEXT MAKER* 🎨✨
━━━━━━━━━━━━━━━━━━━
🖌️ *Create stunning text styles*
⚡ Fast • Stylish • HD Effects

📌 *Usage*
👉 *.ephoto <type> <text>*
📖 Example:
👉 *.ephoto metallic Hello*

━━━━━━━━━━━━━━━━━━━
🎭 *AVAILABLE STYLES*
`;
            allTypes.forEach((t, i) => {
                menuText += `🔹 *${i + 1}.* ${t}\n`;
            });
            menuText +=
                `━━━━━━━━━━━━━━━━━━━
💡 *Tip:* Use short & clear text for best results
🤖 Powered by *Beast MD*`;
            return await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
        }
        try {
            let url;
            switch (type) {
                case 'metallic':
                    url = "https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html";
                    break;
                case 'ice':
                    url = "https://en.ephoto360.com/ice-text-effect-online-101.html";
                    break;
                case 'snow':
                    url = "https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html";
                    break;
                case 'impressive':
                    url = "https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html";
                    break;
                case 'matrix':
                    url = "https://en.ephoto360.com/matrix-text-effect-154.html";
                    break;
                case 'light':
                    url = "https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html";
                    break;
                case 'neon':
                    url = "https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html";
                    break;
                case 'devil':
                    url = "https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html";
                    break;
                case 'purple':
                    url = "https://en.ephoto360.com/purple-text-effect-online-100.html";
                    break;
                case 'thunder':
                    url = "https://en.ephoto360.com/thunder-text-effect-online-97.html";
                    break;
                case 'leaves':
                    url = "https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html";
                    break;
                case '1917':
                    url = "https://en.ephoto360.com/1917-style-text-effect-523.html";
                    break;
                case 'arena':
                    url = "https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html";
                    break;
                case 'hacker':
                    url = "https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html";
                    break;
                case 'sand':
                    url = "https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html";
                    break;
                case 'blackpink':
                    url = "https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html";
                    break;
                case 'glitch':
                    url = "https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html";
                    break;
                case 'fire':
                    url = "https://en.ephoto360.com/flame-lettering-effect-372.html";
                    break;
            }
            const result = await mumaker.ephoto(url, text);
            if (!result?.image) {
                throw new Error('No image URL received from the API');
            }
            await sock.sendMessage(chatId, {
                image: { url: result.image },
                caption: `🔥 *GENERATED SUCCESSFULLY* 🔥\n✨ Powered by *Beast MD*`
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error generating styled text:', error);
            await sock.sendMessage(chatId, { text: `❌ *Generation Failed*\nReason: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:ephoto] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .ephoto: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tmaker": async (h) => module.exports["ephoto"](h),
    "textmaker": async (h) => module.exports["ephoto"](h),
  };
})());

