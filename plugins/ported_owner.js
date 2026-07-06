// AUTO-PORTED from friend's MEGA-MD bot (category: owner)
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
  const { initConfig, saveConfig } = require('../lib_ported/autoreply.js');

  return {

    // ── .addreply ─── Add an auto-reply trigger | usage: .addreply <trigger> | <response>\nFor exact match: .addreply exact:<trigger> | <response>\nUse {name} in response to mention sender name
    "addreply": async (h) => {
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
        rawText: (h.config.prefix + 'addreply ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const fullText = args.join(' ');
        const pipeIndex = fullText.indexOf('|');
        if (!fullText || pipeIndex === -1) {
            return await sock.sendMessage(chatId, {
                text: `*➕ ADD AUTO-REPLY*\n\n` +
                    `*Usage:*\n` +
                    `\`.addreply <trigger> | <response>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.addreply hello | Hi there! 👋\`\n` +
                    `• \`.addreply exact:good morning | Good morning! ☀️\`\n` +
                    `• \`.addreply hi | Hello {name}! How are you?\`\n\n` +
                    `*Tips:*\n` +
                    `• Use \`exact:\` prefix for full message match\n` +
                    `• Without \`exact:\` it matches if message *contains* trigger\n` +
                    `• Use \`{name}\` in response to mention the sender's name`,
                ...channelInfo
            }, { quoted: message });
        }
        let trigger = fullText.substring(0, pipeIndex).trim();
        const response = fullText.substring(pipeIndex + 1).trim();
        if (!trigger || !response) {
            return await sock.sendMessage(chatId, {
                text: '❌ Both trigger and response are required.\n\nExample: `.addreply hello | Hi there!`',
                ...channelInfo
            }, { quoted: message });
        }
        let exactMatch = false;
        if (trigger.toLowerCase().startsWith('exact:')) {
            exactMatch = true;
            trigger = trigger.substring(6).trim();
        }
        if (!trigger) {
            return await sock.sendMessage(chatId, {
                text: '❌ Trigger cannot be empty after `exact:` prefix.',
                ...channelInfo
            }, { quoted: message });
        }
        const config = await initConfig();
        const exists = config.replies.find(r => r.trigger === trigger.toLowerCase());
        if (exists) {
            return await sock.sendMessage(chatId, {
                text: `⚠️ A reply for *"${trigger}"* already exists!\n\nUse \`.delreply ${trigger}\` to remove it first.`,
                ...channelInfo
            }, { quoted: message });
        }
        config.replies.push({
            trigger: trigger.toLowerCase(),
            response,
            exactMatch,
            addedBy: senderId,
            createdAt: Date.now()
        });
        await saveConfig(config);
        await sock.sendMessage(chatId, {
            text: `✅ *Auto-Reply Added!*\n\n` +
                `🔑 *Trigger:* ${trigger}\n` +
                `🎯 *Match type:* ${exactMatch ? 'Exact' : 'Contains'}\n` +
                `💬 *Response:* ${response}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:addreply] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .addreply: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "newtrigger": async (h) => module.exports["addreply"](h),
    "setreply": async (h) => module.exports["addreply"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  const fs = require('fs');
  // --- helper code from anticall.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const ANTICALL_PATH = './data/anticall.json';
  async function readState() {
      try {
          if (HAS_DB) {
              const settings = await store.getSetting('global', 'anticall');
              return settings || { enabled: false };
          }
          else {
              if (!fs.existsSync(ANTICALL_PATH))
                  return { enabled: false };
              const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
              const data = JSON.parse(raw || '{}');
              return { enabled: !!data.enabled };
          }
      }
      catch {
          return { enabled: false };
      }
  }
  async function writeState(enabled) {
      try {
          if (HAS_DB) {
              await store.saveSetting('global', 'anticall', { enabled: !!enabled });
          }
          else {
              if (!fs.existsSync('./data'))
                  fs.mkdirSync('./data', { recursive: true });
              fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
          }
      }
      catch (e) {
          console.error('Error writing anticall state:', e);
      }
  }
  return {

    // ── .anticall ─── Enable or disable auto-blocking of incoming calls | usage: .anticall <on|off|status>
    "anticall": async (h) => {
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
        rawText: (h.config.prefix + 'anticall ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const state = await readState();
        const sub = args.join(' ').trim().toLowerCase();
        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            return await sock.sendMessage(chatId, {
                text: '*ANTICALL SETTINGS*\n\n' +
                    '📵 Auto-block incoming calls\n\n' +
                    '*Usage:*\n' +
                    '• `.anticall on` - Enable\n' +
                    '• `.anticall off` - Disable\n' +
                    '• `.anticall status` - Current status\n\n' +
                    `*Current Status:* ${state.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                    `*Storage:* ${HAS_DB ? 'Database' : 'File System'}`
            }, { quoted: message });
        }
        if (sub === 'status') {
            return await sock.sendMessage(chatId, {
                text: `📵 *Anticall Status*\n\n` +
                    `Current: ${state.enabled ? '✅ *ENABLED*' : '❌ *DISABLED*'}\n` +
                    `Storage: ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                    `${state.enabled ? 'All incoming calls will be rejected and blocked.' : 'Incoming calls are allowed.'}`
            }, { quoted: message });
        }
        const enable = sub === 'on';
        await writeState(enable);
        await sock.sendMessage(chatId, {
            text: `📵 *Anticall ${enable ? 'ENABLED' : 'DISABLED'}*\n\n` +
                `${enable ? '✅ Incoming calls will now be rejected and blocked automatically.' : '❌ Incoming calls are now allowed.'}`
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:anticall] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .anticall: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "acall": async (h) => module.exports["anticall"](h),
    "callblock": async (h) => module.exports["anticall"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .archivechat ─── Archive or unarchive the current chat | usage: .archivechat <archive|unarchive>
    "archivechat": async (h) => {
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
        rawText: (h.config.prefix + 'archivechat ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = context.rawText || '';
        // Auto-detect from command name
        const isUnarchive = rawText.toLowerCase().startsWith('.unarchive');
        const action = args[0]?.toLowerCase() || (isUnarchive ? 'unarchive' : 'archive');
        if (!['archive', 'unarchive'].includes(action)) {
            return await sock.sendMessage(chatId, {
                text: `*📦 ARCHIVE CHAT*\n\n*Usage:*\n• \`.archivechat archive\` — Archive this chat\n• \`.archivechat unarchive\` — Unarchive this chat\n\n_Or use aliases: \`.archive\` / \`.unarchive\`_`,
                ...channelInfo
            }, { quoted: message });
        }
        const shouldArchive = action === 'archive';
        try {
            const lastMsg = message;
            await sock.chatModify({
                archive: shouldArchive,
                lastMessages: [
                    {
                        key: lastMsg.key,
                        messageTimestamp: lastMsg.messageTimestamp
                    }
                ]
            }, chatId);
            await sock.sendMessage(chatId, {
                text: shouldArchive
                    ? `📦 *Chat archived!*`
                    : `📂 *Chat unarchived!*`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[ARCHIVECHAT] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${action} chat: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:archivechat] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .archivechat: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "archive": async (h) => module.exports["archivechat"](h),
    "unarchive": async (h) => module.exports["archivechat"](h),
    "unarchivechat": async (h) => module.exports["archivechat"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from autoread.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const configPath = dataFile('autoread.json');
  async function initConfig() {
      if (HAS_DB) {
          const config = await store.getSetting('global', 'autoread');
          return config || { enabled: false };
      }
      else {
          if (!fs.existsSync(configPath)) {
              const dataDir = path.dirname(configPath);
              if (!fs.existsSync(dataDir)) {
                  fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
          }
          return JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
  }
  async function saveConfig(config) {
      if (HAS_DB) {
          await store.saveSetting('global', 'autoread', config);
      }
      else {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
  }
  async function isAutoreadEnabled() {
      try {
          const config = await initConfig();
          return config.enabled;
      }
      catch (error) {
          console.error('Error checking autoread status:', error);
          return false;
      }
  }
  function isBotMentionedInMessage(message, botNumber) {
      if (!message.message)
          return false;
      const messageTypes = [
          'extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage',
          'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'
      ];
      for (const type of messageTypes) {
          if (message.message[type]?.contextInfo?.mentionedJid) {
              const mentionedJid = message.message[type].contextInfo.mentionedJid;
              if (mentionedJid.some((jid) => jid === botNumber)) {
                  return true;
              }
          }
      }
      const textContent = message.message.conversation ||
          message.message.extendedTextMessage?.text ||
          message.message.imageMessage?.caption ||
          message.message.videoMessage?.caption || '';
      if (textContent) {
          const botUsername = botNumber.split('@')[0];
          if (textContent.includes(`@${botUsername}`)) {
              return true;
          }
          const botNames = [global.botname?.toLowerCase(), 'bot', 'mega', 'mega bot'];
          const words = textContent.toLowerCase().split(/\s+/);
          if (botNames.some(name => words.includes(name))) {
              return true;
          }
      }
      return false;
  }
  async function handleAutoread(sock, message) {
      try {
          const ghostMode = await store.getSetting('global', 'stealthMode');
          if (ghostMode && ghostMode.enabled) {
              console.log('👻 Stealth mode active - skipping read receipt');
              return false;
          }
      }
      catch (err) {
      }
      const enabled = await isAutoreadEnabled();
      if (enabled) {
          const botNumber = `${sock.user.id.split(':')[0] }@s.whatsapp.net`;
          const isBotMentioned = isBotMentionedInMessage(message, botNumber);
          if (isBotMentioned) {
              return false;
          }
          else {
              try {
                  const key = {
                      remoteJid: message.key.remoteJid,
                      id: message.key.id,
                      participant: message.key.participant
                  };
                  await sock.readMessages([key]);
                  return true;
              }
              catch (error) {
                  console.error('Error marking message as read:', error);
                  return false;
              }
          }
      }
      return false;
  }
  return {

    // ── .autoread ─── Toggle automatic message reading (blue ticks) | usage: .autoread <on|off>
    "autoread": async (h) => {
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
        rawText: (h.config.prefix + 'autoread ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        try {
            const config = await initConfig();
            const action = args[0]?.toLowerCase();
            if (!action) {
                const ghostMode = await store.getSetting('global', 'stealthMode');
                const ghostActive = ghostMode && ghostMode.enabled;
                await sock.sendMessage(chatId, {
                    text: `*📖 AUTOREAD STATUS*\n\n` +
                        `*Current Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `*Stealth Mode:* ${ghostActive ? '👻 Active (overrides autoread)' : '❌ Inactive'}\n` +
                        `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                        `*Commands:*\n` +
                        `• \`.autoread on\` - Enable auto-read\n` +
                        `• \`.autoread off\` - Disable auto-read\n\n` +
                        `*What it does:*\n` +
                        `When enabled, the bot automatically marks all messages as read (blue ticks).\n\n` +
                        `*Note:* Ghost mode takes priority over autoread. If ghost mode is active, no read receipts will be sent.`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            if (action === 'on' || action === 'enable') {
                if (config.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Autoread is already enabled*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                config.enabled = true;
                await saveConfig(config);
                const ghostMode = await store.getSetting('global', 'stealthMode');
                const ghostActive = ghostMode && ghostMode.enabled;
                await sock.sendMessage(chatId, {
                    text: `✅ *Auto-read enabled!*\n\nAll messages will now be automatically marked as read.${ghostActive ? '\n\n⚠️ *Note:* Ghost mode is currently active and will override autoread.' : ''}`,
                    ...channelInfo
                }, { quoted: message });
            }
            else if (action === 'off' || action === 'disable') {
                if (!config.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Autoread is already disabled*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                config.enabled = false;
                await saveConfig(config);
                await sock.sendMessage(chatId, {
                    text: '❌ *Auto-read disabled!*\n\nMessages will no longer be automatically marked as read.',
                    ...channelInfo
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: '❌ *Invalid option!*\n\nUse: `.autoread on/off`',
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Error in autoread command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error processing command!*',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:autoread] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .autoread: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "read": async (h) => module.exports["autoread"](h),
    "autoreadmsg": async (h) => module.exports["autoread"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from autostatus.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const configPath = dataFile('autoStatus.json');
  if (!HAS_DB && !fs.existsSync(configPath)) {
      if (!fs.existsSync(path.dirname(configPath))) {
          fs.mkdirSync(path.dirname(configPath), { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify({
          enabled: false,
          reactOn: false
      }, null, 2));
  }
  const channelInfo = {
      contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
              newsletterJid: '120363319098372999@newsletter',
              newsletterName: 'GlobalTechInc',
              serverMessageId: -1
          }
      }
  };
  async function readConfig() {
      try {
          if (HAS_DB) {
              const config = await store.getSetting('global', 'autoStatus');
              return config || { enabled: false, reactOn: false };
          }
          else {
              const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              return {
                  enabled: !!config.enabled,
                  reactOn: !!config.reactOn
              };
          }
      }
      catch (error) {
          console.error('Error reading auto status config:', error);
          return { enabled: false, reactOn: false };
      }
  }
  async function writeConfig(config) {
      try {
          if (HAS_DB) {
              await store.saveSetting('global', 'autoStatus', config);
          }
          else {
              fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          }
      }
      catch (error) {
          console.error('Error writing auto status config:', error);
      }
  }
  async function isAutoStatusEnabled() {
      const config = await readConfig();
      return config.enabled;
  }
  async function isStatusReactionEnabled() {
      const config = await readConfig();
      return config.reactOn;
  }
  async function reactToStatus(sock, statusKey) {
      try {
          const enabled = await isStatusReactionEnabled();
          if (!enabled) {
              return;
          }
          await sock.relayMessage('status@broadcast', {
              reactionMessage: {
                  key: {
                      remoteJid: 'status@broadcast',
                      id: statusKey.id,
                      participant: statusKey.participant || statusKey.remoteJid,
                      fromMe: false
                  },
                  text: '💚'
              }
          }, {
              messageId: statusKey.id,
              statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
          });
          console.log('✅ Reacted to status');
      }
      catch (error) {
          console.error('❌ Error reacting to status:', error.message);
      }
  }
  async function handleStatusUpdate(sock, status) {
      try {
          const enabled = await isAutoStatusEnabled();
          if (!enabled) {
              return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (status.messages && status.messages.length > 0) {
              const msg = status.messages[0];
              if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                  try {
                      await sock.readMessages([msg.key]);
                      console.log('✅ Viewed status from messages');
                      await reactToStatus(sock, msg.key);
                  }
                  catch (err) {
                      if (err.message?.includes('rate-overlimit')) {
                          console.log('⚠️ Rate limit hit, waiting before retrying...');
                          await new Promise(resolve => setTimeout(resolve, 2000));
                          await sock.readMessages([msg.key]);
                      }
                      else {
                          throw err;
                      }
                  }
                  return;
              }
          }
          if (status.key && status.key.remoteJid === 'status@broadcast') {
              try {
                  await sock.readMessages([status.key]);
                  console.log('✅ Viewed status from key');
                  await reactToStatus(sock, status.key);
              }
              catch (err) {
                  if (err.message?.includes('rate-overlimit')) {
                      console.log('⚠️ Rate limit hit, waiting before retrying...');
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      await sock.readMessages([status.key]);
                  }
                  else {
                      throw err;
                  }
              }
              return;
          }
          if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
              try {
                  await sock.readMessages([status.reaction.key]);
                  console.log('✅ Viewed status from reaction');
                  await reactToStatus(sock, status.reaction.key);
              }
              catch (err) {
                  if (err.message?.includes('rate-overlimit')) {
                      console.log('⚠️ Rate limit hit, waiting before retrying...');
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      await sock.readMessages([status.reaction.key]);
                  }
                  else {
                      throw err;
                  }
              }
          }
      }
      catch (error) {
          console.error('❌ Error in auto status view:', error.message);
      }
  }
  return {

    // ── .autostatus ─── Automatically view and react to WhatsApp statuses | usage: .autostatus <on|off|react on|react off>
    "autostatus": async (h) => {
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
        rawText: (h.config.prefix + 'autostatus ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const config = await readConfig();
            if (!args || args.length === 0) {
                const viewStatus = config.enabled ? '✅ Enabled' : '❌ Disabled';
                const reactStatus = config.reactOn ? '✅ Enabled' : '❌ Disabled';
                await sock.sendMessage(chatId, {
                    text: `🔄 *Auto Status Settings*\n\n` +
                        `📱 *Auto Status View:* ${viewStatus}\n` +
                        `💫 *Status Reactions:* ${reactStatus}\n` +
                        `🗄️ *Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                        `*Commands:*\n` +
                        `• \`.autostatus on\` - Enable auto view\n` +
                        `• \`.autostatus off\` - Disable auto view\n` +
                        `• \`.autostatus react on\` - Enable reaction\n` +
                        `• \`.autostatus react off\` - Disable reaction`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const command = args[0].toLowerCase();
            if (command === 'on') {
                config.enabled = true;
                await writeConfig(config);
                await sock.sendMessage(chatId, {
                    text: '✅ *Auto status view enabled!*\n\n' +
                        'Bot will now automatically view all contact statuses.',
                    ...channelInfo
                }, { quoted: message });
            }
            else if (command === 'off') {
                config.enabled = false;
                await writeConfig(config);
                await sock.sendMessage(chatId, {
                    text: '❌ *Auto status view disabled!*\n\n' +
                        'Bot will no longer automatically view statuses.',
                    ...channelInfo
                }, { quoted: message });
            }
            else if (command === 'react') {
                if (!args[1]) {
                    await sock.sendMessage(chatId, {
                        text: '❌ *Please specify on/off for reactions!*\n\n' +
                            'Usage: `.autostatus react on/off`',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                const reactCommand = args[1].toLowerCase();
                if (reactCommand === 'on') {
                    config.reactOn = true;
                    await writeConfig(config);
                    await sock.sendMessage(chatId, {
                        text: '💫 *Status reactions enabled!*\n\n' +
                            'Bot will now react to status updates with 💚',
                        ...channelInfo
                    }, { quoted: message });
                }
                else if (reactCommand === 'off') {
                    config.reactOn = false;
                    await writeConfig(config);
                    await sock.sendMessage(chatId, {
                        text: '❌ *Status reactions disabled!*\n\n' +
                            'Bot will no longer react to status updates.',
                        ...channelInfo
                    }, { quoted: message });
                }
                else {
                    await sock.sendMessage(chatId, {
                        text: '❌ *Invalid reaction command!*\n\n' +
                            'Usage: `.autostatus react on/off`',
                        ...channelInfo
                    }, { quoted: message });
                }
            }
            else {
                await sock.sendMessage(chatId, {
                    text: '❌ *Invalid command!*\n\n' +
                        '*Usage:*\n' +
                        '• `.autostatus on/off` - Enable/disable auto view\n' +
                        '• `.autostatus react on/off` - Enable/disable reactions',
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Error in autostatus command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error occurred while managing auto status!*\n\n' +
                    `Error: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:autostatus] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .autostatus: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "statusview": async (h) => module.exports["autostatus"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from autotyping.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const configPath = dataFile('autotyping.json');
  async function initConfig() {
      if (HAS_DB) {
          const config = await store.getSetting('global', 'autotyping');
          return config || { enabled: false };
      }
      else {
          if (!fs.existsSync(configPath)) {
              const dataDir = path.dirname(configPath);
              if (!fs.existsSync(dataDir)) {
                  fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
          }
          return JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
  }
  async function saveConfig(config) {
      if (HAS_DB) {
          await store.saveSetting('global', 'autotyping', config);
      }
      else {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
  }
  async function isAutotypingEnabled() {
      try {
          const config = await initConfig();
          return config.enabled;
      }
      catch (error) {
          console.error('Error checking autotyping status:', error);
          return false;
      }
  }
  async function isGhostModeActive() {
      try {
          const ghostMode = await store.getSetting('global', 'stealthMode');
          return ghostMode && ghostMode.enabled;
      }
      catch (error) {
          return false;
      }
  }
  async function handleAutotypingForMessage(sock, chatId, userMessage) {
      const ghostActive = await isGhostModeActive();
      if (ghostActive) {
          return false;
      }
      const enabled = await isAutotypingEnabled();
      if (enabled) {
          try {
              await sock.presenceSubscribe(chatId);
              await sock.sendPresenceUpdate('available', chatId);
              await new Promise(resolve => setTimeout(resolve, 500));
              await sock.sendPresenceUpdate('composing', chatId);
              const typingDelay = Math.max(3000, Math.min(8000, userMessage.length * 150));
              await new Promise(resolve => setTimeout(resolve, typingDelay));
              await sock.sendPresenceUpdate('composing', chatId);
              await new Promise(resolve => setTimeout(resolve, 1500));
              await sock.sendPresenceUpdate('paused', chatId);
              return true;
          }
          catch (error) {
              console.error('Error sending typing indicator:', error);
              return false;
          }
      }
      return false;
  }
  async function handleAutotypingForCommand(sock, chatId) {
      const ghostActive = await isGhostModeActive();
      if (ghostActive) {
          return false;
      }
      const enabled = await isAutotypingEnabled();
      if (enabled) {
          try {
              await sock.presenceSubscribe(chatId);
              await sock.sendPresenceUpdate('available', chatId);
              await new Promise(resolve => setTimeout(resolve, 500));
              await sock.sendPresenceUpdate('composing', chatId);
              const commandTypingDelay = 3000;
              await new Promise(resolve => setTimeout(resolve, commandTypingDelay));
              await sock.sendPresenceUpdate('composing', chatId);
              await new Promise(resolve => setTimeout(resolve, 1500));
              await sock.sendPresenceUpdate('paused', chatId);
              return true;
          }
          catch (error) {
              console.error('Error sending command typing indicator:', error);
              return false;
          }
      }
      return false;
  }
  async function showTypingAfterCommand(sock, chatId) {
      const ghostActive = await isGhostModeActive();
      if (ghostActive) {
          return false;
      }
      const enabled = await isAutotypingEnabled();
      if (enabled) {
          try {
              await sock.presenceSubscribe(chatId);
              await sock.sendPresenceUpdate('composing', chatId);
              await new Promise(resolve => setTimeout(resolve, 1000));
              await sock.sendPresenceUpdate('paused', chatId);
              return true;
          }
          catch (error) {
              console.error('Error sending post-command typing indicator:', error);
              return false;
          }
      }
      return false;
  }
  return {

    // ── .autotyping ─── Toggle auto-typing indicator when bot is processing messages | usage: .autotyping <on|off>
    "autotyping": async (h) => {
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
        rawText: (h.config.prefix + 'autotyping ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        try {
            const config = await initConfig();
            const action = args[0]?.toLowerCase();
            if (!action) {
                const ghostActive = await isGhostModeActive();
                await sock.sendMessage(chatId, {
                    text: `*⌨️ AUTOTYPING STATUS*\n\n` +
                        `*Current Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `*Ghost Mode:* ${ghostActive ? '👻 Active (blocks typing)' : '❌ Inactive'}\n` +
                        `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                        `*Commands:*\n` +
                        `• \`.autotyping on\` - Enable auto-typing\n` +
                        `• \`.autotyping off\` - Disable auto-typing\n\n` +
                        `*What it does:*\n` +
                        `When enabled, the bot will show "typing..." indicator while processing messages and commands.\n\n` +
                        `*Note:* Ghost mode overrides autotyping to maintain stealth.`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            if (action === 'on' || action === 'enable') {
                if (config.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Autotyping is already enabled*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                config.enabled = true;
                await saveConfig(config);
                const ghostActive = await isGhostModeActive();
                await sock.sendMessage(chatId, {
                    text: `✅ *Auto-typing enabled!*\n\nThe bot will now show typing indicator while processing.${ghostActive ? '\n\n⚠️ *Ghost mode is active* - typing indicators are currently blocked.' : ''}`,
                    ...channelInfo
                }, { quoted: message });
            }
            else if (action === 'off' || action === 'disable') {
                if (!config.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Autotyping is already disabled*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                config.enabled = false;
                await saveConfig(config);
                await sock.sendMessage(chatId, {
                    text: '❌ *Auto-typing disabled!*\n\nThe bot will no longer show typing indicator.',
                    ...channelInfo
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: '❌ *Invalid option!*\n\nUse: `.autotyping on/off`',
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Error in autotyping command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error processing command!*',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:autotyping] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .autotyping: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "typing": async (h) => module.exports["autotyping"](h),
    "autotype": async (h) => module.exports["autotyping"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .broadcast ─── Broadcast a message to all groups the bot is in | usage: .broadcast <message>
    "broadcast": async (h) => {
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
        rawText: (h.config.prefix + 'broadcast ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(chatId, {
                text: `*📢 BROADCAST*\n\n*Usage:* .broadcast <message>\n\n*Example:*\n.broadcast Hello everyone! Bot will be down for maintenance at 10 PM.\n\n_Sends to all groups the bot is in. Has a 1 second delay between each group to avoid ban._`,
                ...channelInfo
            }, { quoted: message });
        }
        let groups = [];
        try {
            const allChats = Object.keys(sock.store?.chats || {});
            groups = allChats.filter(jid => jid.endsWith('@g.us'));
        }
        catch (e) {
            console.error('[BROADCAST] Error getting groups:', e.message);
        }
        if (groups.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No groups found. Make sure the bot is in at least one group.',
                ...channelInfo
            }, { quoted: message });
        }
        await sock.sendMessage(chatId, {
            text: `📢 *Broadcasting to ${groups.length} group(s)...*\n\nThis may take a moment.`,
            ...channelInfo
        }, { quoted: message });
        const broadcastText = `📢 *BROADCAST MESSAGE*\n\n${text}`;
        let sent = 0;
        let failed = 0;
        for (const groupJid of groups) {
            try {
                await sock.sendMessage(groupJid, {
                    text: broadcastText,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363319098372999@newsletter',
                            newsletterName: 'GlobalTechInc',
                            serverMessageId: -1
                        }
                    }
                });
                sent++;
            }
            catch (e) {
                console.error(`[BROADCAST] Failed to send to ${groupJid}: ${e.message}`);
                failed++;
            }
            // 1 second delay between sends to avoid WhatsApp rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }
        await sock.sendMessage(chatId, {
            text: `✅ *Broadcast Complete!*\n\n📤 Sent: ${sent}\n❌ Failed: ${failed}\n📊 Total: ${groups.length}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:broadcast] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .broadcast: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "bc": async (h) => module.exports["broadcast"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .broadcastdm ─── Broadcast a message to all saved DM contacts | usage: .broadcastdm <message>
    "broadcastdm": async (h) => {
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
        rawText: (h.config.prefix + 'broadcastdm ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(chatId, {
                text: `*📩 BROADCAST DM*\n\n*Usage:* .broadcastdm <message>\n\n*Example:*\n.broadcastdm Hey! Check out our new features!\n\n_Sends to all contacts in the bot's contact list. Has a 1.5s delay between each to avoid ban._`,
                ...channelInfo
            }, { quoted: message });
        }
        let contacts = [];
        try {
            const allContacts = Object.keys(sock.store?.contacts || {});
            contacts = allContacts.filter(jid => jid.endsWith('@s.whatsapp.net') &&
                jid !== sock.user?.id);
        }
        catch (e) {
            console.error('[BROADCASTDM] Error getting contacts:', e.message);
        }
        if (contacts.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No contacts found in the bot\'s contact list.',
                ...channelInfo
            }, { quoted: message });
        }
        await sock.sendMessage(chatId, {
            text: `📩 *Broadcasting to ${contacts.length} contact(s)...*\n\nThis may take a moment.`,
            ...channelInfo
        }, { quoted: message });
        const broadcastText = `📩 *MESSAGE*\n\n${text}`;
        let sent = 0;
        let failed = 0;
        for (const contactJid of contacts) {
            try {
                await sock.sendMessage(contactJid, {
                    text: broadcastText,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363319098372999@newsletter',
                            newsletterName: 'GlobalTechInc',
                            serverMessageId: -1
                        }
                    }
                });
                sent++;
            }
            catch (e) {
                console.error(`[BROADCASTDM] Failed to send to ${contactJid}: ${e.message}`);
                failed++;
            }
            // 1.5 second delay between DMs
            await new Promise(r => setTimeout(r, 1500));
        }
        await sock.sendMessage(chatId, {
            text: `✅ *DM Broadcast Complete!*\n\n📤 Sent: ${sent}\n❌ Failed: ${failed}\n📊 Total: ${contacts.length}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:broadcastdm] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .broadcastdm: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "bcdm": async (h) => module.exports["broadcastdm"](h),
    "announcedm": async (h) => module.exports["broadcastdm"](h),
    "dmall": async (h) => module.exports["broadcastdm"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .clear ─── Clear bot messages from chat | usage: .clear
    "clear": async (h) => {
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
        rawText: (h.config.prefix + 'clear ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const sent = await sock.sendMessage(chatId, {
                text: 'Clearing bot messages...',
                ...channelInfo
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendMessage(chatId, { delete: sent.key });
        }
        catch (error) {
            console.error('Error clearing messages:', error);
            await sock.sendMessage(chatId, {
                text: 'An error occurred while clearing messages.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:clear] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .clear: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "clr": async (h) => module.exports["clear"](h),
    "clean": async (h) => module.exports["clear"](h),
  };
})());


Object.assign(module.exports, (() => {
  const isAdmin = require('../lib_ported/isAdmin.js');

  return {

    // ── .clearchat ─── Clear/delete the current chat | usage: .clearchat
    "clearchat": async (h) => {
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
        rawText: (h.config.prefix + 'clearchat ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const isGroup = chatId.endsWith('@g.us');
        const senderId = context.senderId || message.key.participant || message.key.remoteJid;
        const senderIsOwnerOrSudo = context.senderIsOwnerOrSudo || false;
        if (isGroup && !senderIsOwnerOrSudo) {
            // Fetch admin status directly — context.isSenderAdmin unreliable without adminOnly flag
            const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isSenderAdmin) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Only group admins or bot owner can clear this chat.',
                    ...channelInfo
                }, { quoted: message });
            }
        }
        if (!isGroup && !senderIsOwnerOrSudo && !message.key.fromMe) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only the bot owner can clear DM chats.',
                ...channelInfo
            }, { quoted: message });
        }
        try {
            await sock.chatModify({
                delete: true,
                lastMessages: [
                    {
                        key: message.key,
                        messageTimestamp: message.messageTimestamp
                    }
                ]
            }, chatId);
            await sock.sendMessage(chatId, {
                text: `🗑️ *Chat cleared successfully!*`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[CLEARCHAT] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to clear chat: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:clearchat] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .clearchat: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "deletechat": async (h) => module.exports["clearchat"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const isOwnerOrSudo = require('../lib_ported/isOwner.js');
  const { channelInfo } = require('../lib_ported/messageConfig.js');

  return {

    // ── .clearsession ─── Clear session files | usage: .clearsession
    "clearsession": async (h) => {
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
        rawText: (h.config.prefix + 'clearsession ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const senderId = message.key.participant || message.key.remoteJid;
            const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
            if (!message.key.fromMe && !isOwner) {
                return await sock.sendMessage(chatId, { text: '*This command can only be used by the owner!*', ...channelInfo });
            }
            const sessionDir = path.join(process.cwd(), 'session');
            if (!fs.existsSync(sessionDir)) {
                return await sock.sendMessage(chatId, { text: '*Session directory not found!*', ...channelInfo });
            }
            let filesCleared = 0;
            let errors = 0;
            const errorDetails = [];
            await sock.sendMessage(chatId, { text: '🔍 Optimizing session files for better performance...', ...channelInfo });
            const files = fs.readdirSync(sessionDir);
            let appStateSyncCount = 0;
            let preKeyCount = 0;
            for (const file of files) {
                if (file.startsWith('app-state-sync-'))
                    appStateSyncCount++;
                if (file.startsWith('pre-key-'))
                    preKeyCount++;
            }
            for (const file of files) {
                if (file === 'creds.json')
                    continue;
                if (file.startsWith('app-state-sync-key-'))
                    continue;
                try {
                    fs.unlinkSync(path.join(sessionDir, file));
                    filesCleared++;
                }
                catch (err) {
                    errors++;
                    errorDetails.push(`Failed to delete ${file}: ${err.message}`);
                }
            }
            const msgText = `✅ Session files cleared successfully!\n\n` +
                `📊 Statistics:\n` +
                `• Total files cleared: ${filesCleared}\n` +
                `• App state sync files: ${appStateSyncCount}\n` +
                `• Pre-key files: ${preKeyCount}\n${ 
                errors > 0 ? `\n⚠️ Errors encountered: ${errors}\n${errorDetails.join('\n')}` : ''}`;
            await sock.sendMessage(chatId, { text: msgText, ...channelInfo });
        }
        catch {
            await sock.sendMessage(chatId, { text: '❌ Failed to clear session files!', ...channelInfo });
        }
    
      } catch (portErr) {
        console.error('[ported:clearsession] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .clearsession: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "clearses": async (h) => module.exports["clearsession"](h),
    "csession": async (h) => module.exports["clearsession"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const isOwnerOrSudo = require('../lib_ported/isOwner.js');
  // --- helper code from cleartmp.js ---
  function clearDirectory(dirPath) {
      try {
          if (!fs.existsSync(dirPath)) {
              return { success: false, message: `Directory not found: ${path.basename(dirPath)}` };
          }
          const files = fs.readdirSync(dirPath);
          let deletedCount = 0;
          for (const file of files) {
              const filePath = path.join(dirPath, file);
              const stat = fs.lstatSync(filePath);
              if (stat.isDirectory()) {
                  fs.rmSync(filePath, { recursive: true, force: true });
              }
              else {
                  fs.unlinkSync(filePath);
              }
              deletedCount++;
          }
          return {
              success: true,
              message: `Cleared ${deletedCount} items in ${path.basename(dirPath)}`,
              count: deletedCount
          };
      }
      catch (err) {
          console.error('clearDirectory error:', err);
          return {
              success: false,
              message: `Failed clearing ${path.basename(dirPath)}`
          };
      }
  }
  async function clearTmpDirectory() {
      const tmpDir = path.join(process.cwd(), 'tmp');
      const tempDir = path.join(process.cwd(), 'temp');
      const results = [
          clearDirectory(tmpDir),
          clearDirectory(tempDir)
      ];
      const success = results.every(r => r.success);
      const totalDeleted = results.reduce((a, b) => a + (b.count || 0), 0);
      const message = results.map(r => r.message).join(' | ');
      return { success, message, totalDeleted };
  }
  return {

    // ── .cleartmp ─── Clear tmp and temp directories | usage: .cleartmp
    "cleartmp": async (h) => {
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
        rawText: (h.config.prefix + 'cleartmp ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        try {
            const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
            if (!message.key.fromMe && !isOwner) {
                await sock.sendMessage(chatId, {
                    text: '*This command is only for the owner!*'
                }, { quoted: message });
                return;
            }
            const result = await clearTmpDirectory();
            const text = result.success
                ? `✅ *Temporary Files Cleared!*\n\n${result.message}`
                : `❌ *Clear Failed!*\n\n${result.message}`;
            await sock.sendMessage(chatId, {
                text
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in cleartmp command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to clear temporary files!'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:cleartmp] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .cleartmp: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "cleartemp": async (h) => module.exports["cleartmp"](h),
    "tmpclear": async (h) => module.exports["cleartmp"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { setCommandReactState } = require('../lib_ported/reactions.js');
  // --- helper code from cmdreact.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  return {

    // ── .cmdreact ─── Toggle command reactions | usage: .creact on/off
    "cmdreact": async (h) => {
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
        rawText: (h.config.prefix + 'cmdreact ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        if (!args[0] || !['on', 'off'].includes(args[0])) {
            await sock.sendMessage(chatId, {
                text: `*Usage:*\n.creact on/off\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
                ...channelInfo
            }, { quoted: message });
            return;
        }
        if (args[0] === 'on') {
            await setCommandReactState(true);
            await sock.sendMessage(chatId, {
                text: `*✅ Command reactions enabled*\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
                ...channelInfo
            }, { quoted: message });
        }
        else if (args[0] === 'off') {
            await setCommandReactState(false);
            await sock.sendMessage(chatId, {
                text: `*❌ Command reactions disabled*\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:cmdreact] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .cmdreact: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "creact": async (h) => module.exports["cmdreact"](h),
    "commandreact": async (h) => module.exports["cmdreact"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  // --- helper code from delcmd.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const STICKER_FILE = dataFile('sticker_commands.json');
  async function getStickerCommands() {
      if (HAS_DB) {
          const data = await store.getSetting('global', 'stickerCommands');
          return data || {};
      }
      else {
          try {
              if (!fs.existsSync(STICKER_FILE)) {
                  return {};
              }
              return JSON.parse(fs.readFileSync(STICKER_FILE, 'utf8'));
          }
          catch {
              return {};
          }
      }
  }
  async function saveStickerCommands(data) {
      if (HAS_DB) {
          await store.saveSetting('global', 'stickerCommands', data);
      }
      else {
          const dir = path.dirname(STICKER_FILE);
          if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(STICKER_FILE, JSON.stringify(data, null, 2));
      }
  }
  return {

    // ── .delcmd ─── Delete a sticker command | usage: .delcmd <text>
    "delcmd": async (h) => {
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
        rawText: (h.config.prefix + 'delcmd ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        let hash = args.join(' ');
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
            const fileSha256 = message.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage.fileSha256;
            if (fileSha256) {
                hash = Buffer.from(fileSha256).toString('base64');
            }
        }
        if (!hash) {
            return await sock.sendMessage(chatId, {
                text: '✳️ Please enter the command name or reply to a sticker'
            }, { quoted: message });
        }
        const stickers = await getStickerCommands();
        // Find by text name if hash not found
        if (!stickers[hash]) {
            const found = Object.entries(stickers).find(([, v]) => v.text === hash);
            if (found)
                hash = found[0];
        }
        if (stickers[hash] && stickers[hash].locked) {
            return await sock.sendMessage(chatId, {
                text: '✳️ You cannot delete this command'
            }, { quoted: message });
        }
        if (!stickers[hash]) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ Command not found'
            }, { quoted: message });
        }
        delete stickers[hash];
        await saveStickerCommands(stickers);
        await sock.sendMessage(chatId, {
            text: '✅ Command deleted'
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:delcmd] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .delcmd: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "removecmd": async (h) => module.exports["delcmd"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { join } = require('path');
  const { unlinkSync, readdirSync } = require('fs');

  return {

    // ── .delplugin ─── Delete a plugin by name (owner only) | usage: .delplugin <plugin_name>
    "delplugin": async (h) => {
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
        rawText: (h.config.prefix + 'delplugin ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            if (!args || !args[0]) {
                return await sock.sendMessage(chatId, {
                    text: `*🌟Example usage:*\n.delplugin main-menu`
                }, { quoted: message });
            }
            const pluginDir = join(process.cwd(), 'plugins');
            const pluginFiles = readdirSync(pluginDir).filter(f => f.endsWith('.js'));
            const pluginNames = pluginFiles.map(f => f.replace('.js', ''));
            if (!pluginNames.includes(args[0])) {
                return await sock.sendMessage(chatId, {
                    text: `🗃️ This plugin doesn't exist!\n\nAvailable plugins:\n${pluginNames.join('\n')}`
                }, { quoted: message });
            }
            const filePath = join(pluginDir, `${args[0] }.js`);
            unlinkSync(filePath);
            await sock.sendMessage(chatId, { text: `⚠️ Plugin "${args[0]}.js" has been deleted.` }, { quoted: message });
        }
        catch (err) {
            console.error('rmplugin error:', err);
            await sock.sendMessage(chatId, { text: `❌ Failed to delete plugin: ${err.message}`
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:delplugin] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .delplugin: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "deleteplugin": async (h) => module.exports["delplugin"](h),
    "rmplugin": async (h) => module.exports["delplugin"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { initConfig, saveConfig } = require('../lib_ported/autoreply.js');

  return {

    // ── .delreply ─── Delete an auto-reply trigger | usage: .delreply <trigger>
    "delreply": async (h) => {
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
        rawText: (h.config.prefix + 'delreply ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        if (!args || args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide the trigger to delete.\n\nUsage: `.delreply hello`\nSee all triggers: `.listreplies`',
                ...channelInfo
            }, { quoted: message });
        }
        const trigger = args.join(' ').toLowerCase().trim();
        const config = await initConfig();
        const before = config.replies.length;
        config.replies = config.replies.filter(r => r.trigger !== trigger);
        if (config.replies.length === before) {
            return await sock.sendMessage(chatId, {
                text: `❌ No auto-reply found for *"${trigger}"*\n\nUse \`.listreplies\` to see all triggers.`,
                ...channelInfo
            }, { quoted: message });
        }
        await saveConfig(config);
        await sock.sendMessage(chatId, {
            text: `🗑️ *Auto-reply deleted!*\n\nTrigger *"${trigger}"* has been removed.`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:delreply] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .delreply: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "removereply": async (h) => module.exports["delreply"](h),
    "rmreply": async (h) => module.exports["delreply"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .gcleave ─── Make the bot leave a group | usage: .groupleave — leave current group\n.groupleave <jid> — leave specific group
    "gcleave": async (h) => {
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
        rawText: (h.config.prefix + 'gcleave ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const targetJid = args[0]?.includes('@g.us') ? args[0] : chatId;
        if (!targetJid.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: `❌ This command only works in groups.\n\nTo leave a specific group: \`.groupleave 1234567890-1234567890@g.us\``,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            await sock.sendMessage(targetJid, {
                text: `👋 *Bot is leaving the group.*\n\n_Goodbye everyone!_`,
                ...channelInfo
            });
            await new Promise(r => setTimeout(r, 500));
            await sock.groupLeave(targetJid);
            // If triggered from another chat, confirm there
            if (targetJid !== chatId) {
                await sock.sendMessage(chatId, {
                    text: `✅ Left group: \`${targetJid}\``,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (e) {
            console.error('[GROUPLEAVE] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to leave group: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:gcleave] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gcleave: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "leavegroup": async (h) => module.exports["gcleave"](h),
    "groupleave": async (h) => module.exports["gcleave"](h),
    "leavegc": async (h) => module.exports["gcleave"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { promises: fs } = require('fs');
  const path = require('path');

  return {

    // ── .getfile ─── Read and display file contents from bot directory | usage: .getfile <filename>
    "getfile": async (h) => {
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
        rawText: (h.config.prefix + 'getfile ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const filename = args.join(' ').trim();
        try {
            if (!filename) {
                return await sock.sendMessage(chatId, {
                    text: `*📄 Get File*\n\n*Usage:*\n.getfile <filename>\n\n*Examples:*\n• .getfile index.js\n• .getfile plugins/ping.js\n• .getfile settings.js\n• .getfile package.json`
                }, { quoted: message });
            }
            // Check project root first, then dist/ for compiled files
            let filePath = path.join(process.cwd(), filename);
            try {
                await fs.access(filePath);
            }
            catch {
                // Try dist/ for .js files
                const distPath = path.join(process.cwd(), 'dist', filename);
                try {
                    await fs.access(distPath);
                    filePath = distPath;
                }
                catch { /* will fail below */ }
            }
            try {
                await fs.access(filePath);
            }
            catch {
                return await sock.sendMessage(chatId, {
                    text: `❌ *File not found!*\n\nNo file named "${filename}" exists.\n\n*Tip:* Use relative path from bot root directory.`
                }, { quoted: message });
            }
            const fileContent = await fs.readFile(filePath, 'utf8');
            if (!fileContent || fileContent.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: `⚠️ *File is empty*\n\nThe file "${filename}" has no content.`
                }, { quoted: message });
            }
            if (fileContent.length > 60000) {
                return await sock.sendMessage(chatId, {
                    text: `❌ *File too large!*\n\nThe file "${filename}" is too large to display (${Math.round(fileContent.length / 1024)}KB).\n\n*Limit:* 60KB\n\n*Tip:* Use a file manager or split the file.`
                }, { quoted: message });
            }
            const stats = await fs.stat(filePath);
            const fileSize = (stats.size / 1024).toFixed(2);
            const lastModified = stats.mtime.toLocaleString();
            const caption = `📄 *File: ${filename}*\n\n` +
                `📊 *Size:* ${fileSize} KB\n` +
                `📅 *Modified:* ${lastModified}\n` +
                `📝 *Lines:* ${fileContent.split('\n').length}\n\n` +
                `\`\`\`${fileContent}\`\`\``;
            await sock.sendMessage(chatId, {
                text: caption
            }, { quoted: message });
        }
        catch (error) {
            console.error('GetFile Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ *Error reading file*\n\n*Error:* ${error.message}\n\n*Possible reasons:*\n• File is corrupted\n• No read permissions\n• Invalid file path`
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:getfile] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .getfile: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "readfile": async (h) => module.exports["getfile"](h),
    "viewfile": async (h) => module.exports["getfile"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  // --- helper code from getplugin.js ---
  /*****************************************************************************
   *                                                                           *
   *                     Developed By Qasim Ali                                *
   *                                                                           *
   *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
   *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
   *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
   *                                                                           *
   *    © 2026 GlobalTechInfo. All rights reserved.                            *
   *                                                                           *
   *    Description: This file is part of the MEGA-MD Project.                 *
   *                 Unauthorized copying or distribution is prohibited.       *
   *                                                                           *
   *****************************************************************************/
  return {

    // ── .inspect ─── Read the source code of a specific plugin | usage: .inspect [plugin_name]
    "inspect": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const _context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'inspect ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const pluginName = args[0];
        if (!pluginName) {
            return await sock.sendMessage(chatId, { text: 'Which plugin do you want to inspect?\n\n*Examples:*\n- .inspect ping\n- .inspect ping.ts\n- .inspect ping.js' }, { quoted: message });
        }
        try {
            const base = pluginName.replace(/\.(ts|js)$/, '');
            let filePath;
            let fileName;
            if (pluginName.endsWith('.js')) {
                filePath = path.join(process.cwd(), 'plugins', `${base }.js`);
                fileName = `${base }.js`;
            }
            else {
                filePath = path.join(process.cwd(), 'plugins', `${base }.ts`);
                fileName = `${base }.ts`;
                if (!fs.existsSync(filePath)) {
                    filePath = path.join(process.cwd(), 'plugins', `${base }.js`);
                    fileName = `${base }.js`;
                }
            }
            if (!fs.existsSync(filePath)) {
                return await sock.sendMessage(chatId, { text: `❌ Plugin "${base}" not found.` }, { quoted: message });
            }
            const code = fs.readFileSync(filePath, 'utf8');
            const formattedCode = `💻 *SOURCE CODE: ${fileName}*\n\n\`\`\`javascript\n${code}\n\`\`\``;
            if (formattedCode.length > 4000) {
                await sock.sendMessage(chatId, {
                    document: Buffer.from(code),
                    fileName,
                    mimetype: 'text/javascript',
                    caption: `📄 Code for *${fileName}* (File too large for text message)`
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: formattedCode }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Inspect Error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to read the plugin file.' });
        }
    
      } catch (portErr) {
        console.error('[ported:inspect] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .inspect: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "cat": async (h) => module.exports["inspect"](h),
    "readcode": async (h) => module.exports["inspect"](h),
    "getplugin": async (h) => module.exports["inspect"](h),
  };
})());


Object.assign(module.exports, (() => {
  const simpleGit = require('simple-git');

  return {

    // ── .gitinfo ─── Show detailed git repository information | usage: .gitinfo
    "gitinfo": async (h) => {
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
        rawText: (h.config.prefix + 'gitinfo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const git = simpleGit();
        try {
            const isRepo = await git.checkIsRepo();
            if (!isRepo) {
                return sock.sendMessage(chatId, { text: '❌ This project is not a git repository.' });
            }
            const status = await git.status();
            const branch = status.current || 'unknown';
            const dirty = status.files.length > 0;
            const commitHash = (await git.revparse(['--short', 'HEAD'])).trim();
            const ahead = status.ahead;
            const behind = status.behind;
            const modifiedCount = status.files.length;
            const remotes = await git.getRemotes(true);
            const remoteText = remotes.length
                ? remotes.map((r) => `• ${r.name}: ${r.refs.fetch}`).join('\n')
                : 'None';
            const warning = dirty ? '⚠️ Warning: Working tree has uncommitted changes!' : '';
            const text = `📦 *Git Repository Info*\n\n` +
                `🌿 Branch: ${branch}\n` +
                `🔖 Commit: ${commitHash}\n` +
                `🧼 Working tree: ${dirty ? 'Dirty' : 'Clean'}\n` +
                `${dirty ? `${warning }\n\n` : ''}` +
                `📊 Ahead: ${ahead}, Behind: ${behind}\n` +
                `📁 Modified/Untracked files: ${modifiedCount}\n\n` +
                `🔗 Remotes:\n${remoteText}`;
            await sock.sendMessage(chatId, { text });
        }
        catch (err) {
            await sock.sendMessage(chatId, { text: `❌ Git error: ${err.message}` });
        }
    
      } catch (portErr) {
        console.error('[ported:gitinfo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gitinfo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "infogit": async (h) => module.exports["gitinfo"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');

  return {

    // ── .addplugin ─── Install a plugin from a GitHub Gist URL (owner only) | usage: .addplugin <Gist URL>
    "addplugin": async (h) => {
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
        rawText: (h.config.prefix + 'addplugin ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args?.[0];
        if (!text) {
            return await sock.sendMessage(chatId, {
                text: 'Please provide a plugin URL.\nExample: .addplugin https://gist.github.com/username/gistid'
            }, { quoted: message });
        }
        const gistMatch = text.match(/(?:\/|gist\.github\.com\/)([a-fA-F0-9]+)/);
        if (!gistMatch) {
            return await sock.sendMessage(chatId, { text: '❌ Invalid plugin URL.' }, { quoted: message });
        }
        const gistId = gistMatch[1];
        const gistURL = `https://api.github.com/gists/${gistId}`;
        try {
            const response = await axios.get(gistURL);
            const gistData = response.data;
            if (!gistData || !gistData.files) {
                return await sock.sendMessage(chatId, { text: '❌ No valid files found in the Gist.' }, { quoted: message });
            }
            const pluginDir = path.join(process.cwd(), 'plugins');
            for (const file of Object.values(gistData.files)) {
                const pluginName = file.filename;
                const pluginPath = path.join(pluginDir, pluginName);
                await fs.promises.writeFile(pluginPath, file.content);
            }
            await sock.sendMessage(chatId, { text: '*✅ Successfully installed plugin from Gist.*' }, { quoted: message });
        }
        catch (error) {
            console.error('install plugin error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error fetching or saving the plugin: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:addplugin] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .addplugin: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "installplugin": async (h) => module.exports["addplugin"](h),
    "install": async (h) => module.exports["addplugin"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .joingroup ─── Join a group via invite link or get group info from link | usage: .joingroup <link or code>\n.groupinfo <link or code>
    "joingroup": async (h) => {
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
        rawText: (h.config.prefix + 'joingroup ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const isInfo = rawText.startsWith('.groupinfo');
        const input = args[0];
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `*${isInfo ? '🔍 GROUP INFO' : '🚪 JOIN GROUP'}*\n\n` +
                    `*Usage:*\n` +
                    `• \`.joingroup https://chat.whatsapp.com/XXXX\`\n` +
                    `• \`.joingroup XXXX\` (code only)\n` +
                    `• \`.groupinfo https://chat.whatsapp.com/XXXX\` — get info without joining`,
                ...channelInfo
            }, { quoted: message });
        }
        // Extract code from full link or use directly
        const code = input.replace('https://chat.whatsapp.com/', '').trim();
        try {
            if (isInfo) {
                const info = await sock.groupGetInviteInfo(code);
                const members = info.participants?.length || 0;
                return await sock.sendMessage(chatId, {
                    text: `╔═══════════════════════╗\n` +
                        `║    🔍 *GROUP INFO*       ║\n` +
                        `╚═══════════════════════╝\n\n` +
                        `*Name:* ${info.subject || 'Unknown'}\n` +
                        `*Description:* ${info.desc || 'None'}\n` +
                        `*Members:* ${members}\n` +
                        `*Created:* ${info.creation ? new Date(info.creation * 1000).toLocaleDateString() : 'Unknown'}\n` +
                        `*JID:* \`${info.id}\``,
                    ...channelInfo
                }, { quoted: message });
            }
            else {
                const response = await sock.groupAcceptInvite(code);
                return await sock.sendMessage(chatId, {
                    text: `✅ *Joined group successfully!*\n\nJID: \`${response}\``,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (e) {
            console.error('[JOINGROUP] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:joingroup] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .joingroup: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "join": async (h) => module.exports["joingroup"](h),
    "gcjoin": async (h) => module.exports["joingroup"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  const fs = require('fs');
  const { dataFile } = require('../lib_ported/paths.js');
  // --- helper code from listcmd.js ---
  /*****************************************************************************
   *                                                                           *
   *                     Developed By Qasim Ali                                *
   *                                                                           *
   *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
   *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
   *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
   *                                                                           *
   *    © 2026 GlobalTechInfo. All rights reserved.                            *
   *                                                                           *
   *    Description: This file is part of the MEGA-MD Project.                 *
   *                 Unauthorized copying or distribution is prohibited.       *
   *                                                                           *
   *****************************************************************************/
  
  
  
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const STICKER_FILE = dataFile('sticker_commands.json');
  async function getStickerCommands() {
      if (HAS_DB) {
          const data = await store.getSetting('global', 'stickerCommands');
          return data || {};
      }
      else {
          try {
              if (!fs.existsSync(STICKER_FILE)) {
                  return {};
              }
              return JSON.parse(fs.readFileSync(STICKER_FILE, 'utf8'));
          }
          catch {
              return {};
          }
      }
  }
  return {

    // ── .listcmd ─── List all sticker commands | usage: .listcmd
    "listcmd": async (h) => {
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
        rawText: (h.config.prefix + 'listcmd ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        const stickers = await getStickerCommands();
        const entries = Object.entries(stickers);
        if (entries.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '✳️ No sticker commands found'
            }, { quoted: message });
        }
        const stickerList = entries
            .map(([key, value], index) => `${index + 1}. ${value.locked ? `*(blocked)* ${key}` : key} : ${value.text}`)
            .join('\n');
        const mentions = entries
            .map(([, value]) => value.mentionedJid)
            .flat()
            .filter(Boolean);
        await sock.sendMessage(chatId, {
            text: `*CUSTOM STICKER COMMANDS*\n\n▢ *Info:* Custom commands set via .setcmd\n\n──────────────────\n${stickerList}`,
            mentions
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:listcmd] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .listcmd: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "cmdlist": async (h) => module.exports["listcmd"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { initConfig } = require('../lib_ported/autoreply.js');

  return {

    // ── .listreplies ─── List all configured auto-reply triggers | usage: .listreplies
    "listreplies": async (h) => {
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
        rawText: (h.config.prefix + 'listreplies ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const config = await initConfig();
        if (config.replies.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `📭 *No auto-replies configured yet*\n\nStatus: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\nUse \`.addreply <trigger> | <response>\` to add one!`,
                ...channelInfo
            }, { quoted: message });
        }
        const lines = config.replies.map((r, i) => {
            const preview = r.response.length > 40
                ? `${r.response.substring(0, 40) }...`
                : r.response;
            const matchIcon = r.exactMatch ? '🎯' : '🔍';
            return `${i + 1}. ${matchIcon} *${r.trigger}*\n    ↳ ${preview}`;
        }).join('\n\n');
        await sock.sendMessage(chatId, {
            text: `*🤖 AUTO-REPLIES (${config.replies.length})*\n` +
                `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                `${lines}\n\n` +
                `🎯 = exact match | 🔍 = contains\n` +
                `_Use .delreply <trigger> to remove one_`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:listreplies] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .listreplies: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "autoreplies": async (h) => module.exports["listreplies"](h),
    "replylist": async (h) => module.exports["listreplies"](h),
    "replies": async (h) => module.exports["listreplies"](h),
  };
})());


Object.assign(module.exports, (() => {
  const CommandHandler = require('../lib_ported/commandHandler.js');

  return {

    // ── .manage ─── Manage bot commands and aliases | usage: .manage [toggle/alias] [command_name] [new_alias]
    "manage": async (h) => {
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
        rawText: (h.config.prefix + 'manage ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();
        const targetCmd = args[1]?.toLowerCase();
        try {
            if (action === 'toggle') {
                if (!CommandHandler.commands.has(targetCmd)) {
                    return await sock.sendMessage(chatId, { text: `❌ Command *${targetCmd}* not found.` }, { quoted: message });
                }
                const state = CommandHandler.toggleCommand(targetCmd);
                return await sock.sendMessage(chatId, { text: `✅ Command *${targetCmd}* has been *${state}*.` }, { quoted: message });
            }
            if (action === 'alias') {
                const newAlias = args[2]?.toLowerCase();
                if (!targetCmd || !newAlias) {
                    return await sock.sendMessage(chatId, { text: '❌ Usage: .manage alias [command] [new_alias]' }, { quoted: message });
                }
                if (!CommandHandler.commands.has(targetCmd)) {
                    return await sock.sendMessage(chatId, { text: `❌ Source command *${targetCmd}* not found.` }, { quoted: message });
                }
                CommandHandler.aliases.set(newAlias, targetCmd);
                return await sock.sendMessage(chatId, { text: `✅ Added alias *${newAlias}* for command *${targetCmd}*.` }, { quoted: message });
            }
            const helpText = `🛠️ *COMMAND MANAGER*\n\n` +
                `*⁠• Toggle:* .manage toggle [name]\n` +
                `*• Alias:* .manage alias [name] [new_alias]\n` +
                `*• Reload:* Run your reload command to reset changes.`;
            await sock.sendMessage(chatId, { text: helpText }, { quoted: message });
        }
        catch (error) {
            console.error('Error in manage plugin:', error);
            await sock.sendMessage(chatId, { text: '❌ Management action failed.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:manage] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .manage: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ctrl": async (h) => module.exports["manage"](h),
    "control": async (h) => module.exports["manage"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from mention.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const mentionFilePath = dataFile('mention.json');
  async function loadState() {
      try {
          if (HAS_DB) {
              const state = await store.getSetting('global', 'mention');
              if (state && typeof state.assetPath === 'string' && state.assetPath.endsWith('assets/mention_default.webp')) {
                  return { enabled: !!state.enabled, assetPath: '', type: 'text' };
              }
              return state || { enabled: false, assetPath: '', type: 'text' };
          }
          else {
              const raw = fs.readFileSync(mentionFilePath, 'utf8');
              const state = JSON.parse(raw);
              if (state && typeof state.assetPath === 'string' && state.assetPath.endsWith('assets/mention_default.webp')) {
                  return { enabled: !!state.enabled, assetPath: '', type: 'text' };
              }
              return state;
          }
      }
      catch {
          return { enabled: false, assetPath: '', type: 'text' };
      }
  }
  async function saveState(state) {
      if (HAS_DB) {
          await store.saveSetting('global', 'mention', state);
      }
      else {
          const dataDir = path.join(process.cwd(), 'data');
          if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(mentionFilePath, JSON.stringify(state, null, 2));
      }
  }
  async function ensureDefaultSticker(state) {
      try {
          const assetPath = path.join(process.cwd(), state.assetPath);
          if (state.assetPath.endsWith('mention_default.webp') && !fs.existsSync(assetPath)) {
              const defaultStickerPath = path.join(process.cwd(), 'assets', 'stickintro.webp');
              if (fs.existsSync(defaultStickerPath)) {
                  fs.copyFileSync(defaultStickerPath, assetPath);
              }
              else {
                  const assetsDir = path.dirname(assetPath);
                  if (!fs.existsSync(assetsDir)) {
                      fs.mkdirSync(assetsDir, { recursive: true });
                  }
                  fs.writeFileSync(assetPath.replace('.webp', '.txt'), 'Default mention sticker not available');
              }
          }
      }
      catch (e) {
          console.warn('ensureDefaultSticker failed:', e?.message || e);
      }
  }
  async function handleMentionDetection(sock, chatId, message) {
      try {
          if (message.key?.fromMe)
              return;
          if (!chatId?.endsWith('@g.us'))
              return; // Group only
          const state = await loadState();
          await ensureDefaultSticker(state);
          if (!state.enabled)
              return;
          const rawId = sock.user?.id || sock.user?.jid || '';
          if (!rawId)
              return;
          const botNum = rawId.split('@')[0].split(':')[0];
          const botJids = [
              `${botNum}@s.whatsapp.net`,
              `${botNum}@whatsapp.net`,
              rawId
          ];
          const msg = message.message || {};
          const contexts = [
              msg.extendedTextMessage?.contextInfo,
              msg.imageMessage?.contextInfo,
              msg.videoMessage?.contextInfo,
              msg.documentMessage?.contextInfo,
              msg.stickerMessage?.contextInfo,
              msg.buttonsResponseMessage?.contextInfo,
              msg.listResponseMessage?.contextInfo
          ].filter(Boolean);
          let mentioned = [];
          for (const c of contexts) {
              if (Array.isArray(c.mentionedJid)) {
                  mentioned = mentioned.concat(c.mentionedJid);
              }
          }
          const directMentionLists = [
              msg.extendedTextMessage?.mentionedJid,
              msg.mentionedJid
          ].filter(Array.isArray);
          for (const arr of directMentionLists)
              mentioned = mentioned.concat(arr);
          if (!mentioned.length) {
              const rawText = (msg.conversation ||
                  msg.extendedTextMessage?.text ||
                  msg.imageMessage?.caption ||
                  msg.videoMessage?.caption ||
                  '').toString();
              if (rawText) {
                  const safeBot = botNum.replace(/[-\s]/g, '');
                  const re = new RegExp(`@?${safeBot}\b`);
                  if (!re.test(rawText.replace(/\s+/g, '')))
                      return;
              }
              else {
                  return;
              }
          }
          const isBotMentioned = mentioned.some(j => botJids.includes(j));
          if (!isBotMentioned)
              return;
          if (!state.assetPath) {
              await sock.sendMessage(chatId, { text: 'Hi' }, { quoted: message });
              return;
          }
          const assetPath = path.join(process.cwd(), state.assetPath);
          if (!fs.existsSync(assetPath)) {
              await sock.sendMessage(chatId, { text: 'Hi' }, { quoted: message });
              return;
          }
          try {
              if (state.type === 'sticker') {
                  await sock.sendMessage(chatId, { sticker: fs.readFileSync(assetPath) }, { quoted: message });
                  return;
              }
              const payload = {};
              if (state.type === 'image')
                  payload.image = fs.readFileSync(assetPath);
              else if (state.type === 'video') {
                  payload.video = fs.readFileSync(assetPath);
                  if (state.gifPlayback)
                      payload.gifPlayback = true;
              }
              else if (state.type === 'audio') {
                  payload.audio = fs.readFileSync(assetPath);
                  if (state.mimetype)
                      payload.mimetype = state.mimetype;
                  else
                      payload.mimetype = 'audio/mpeg';
                  if (typeof state.ptt === 'boolean')
                      payload.ptt = state.ptt;
              }
              else if (state.type === 'text')
                  payload.text = fs.readFileSync(assetPath, 'utf8');
              else
                  payload.text = 'Hi';
              await sock.sendMessage(chatId, payload, { quoted: message });
          }
          catch (e) {
              await sock.sendMessage(chatId, { text: 'Hi' }, { quoted: message });
          }
      }
      catch (err) {
          console.error('handleMentionDetection error:', err);
      }
  }
  async function setMentionCommand(sock, chatId, message, isOwner) {
      if (!isOwner)
          return sock.sendMessage(chatId, { text: '❌ *Only Owner or Sudo can use this command*' }, { quoted: message });
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      const qMsg = ctx?.quotedMessage;
      if (!qMsg)
          return sock.sendMessage(chatId, { text: '❌ *Reply to a message or media*\n\nSupported: text, sticker, image, video, audio' }, { quoted: message });
      let type = 'sticker', buf, dataType;
      if (qMsg.stickerMessage) {
          dataType = 'stickerMessage';
          type = 'sticker';
      }
      else if (qMsg.imageMessage) {
          dataType = 'imageMessage';
          type = 'image';
      }
      else if (qMsg.videoMessage) {
          dataType = 'videoMessage';
          type = 'video';
      }
      else if (qMsg.audioMessage) {
          dataType = 'audioMessage';
          type = 'audio';
      }
      else if (qMsg.documentMessage) {
          dataType = 'documentMessage';
          type = 'file';
      }
      else if (qMsg.conversation || qMsg.extendedTextMessage?.text) {
          type = 'text';
      }
      else
          return sock.sendMessage(chatId, { text: '❌ *Unsupported media type*\n\nReply to: text, sticker, image, video, or audio' }, { quoted: message });
      if (type === 'text') {
          buf = Buffer.from(qMsg.conversation || qMsg.extendedTextMessage?.text || '', 'utf8');
          if (!buf.length)
              return sock.sendMessage(chatId, { text: '❌ *Empty text*' }, { quoted: message });
      }
      else {
          try {
              const media = qMsg[dataType];
              if (!media)
                  throw new Error('No media');
              const kind = type === 'sticker' ? 'sticker' : type;
              const stream = await downloadContentFromMessage(media, kind);
              const chunks = [];
              for await (const chunk of stream)
                  chunks.push(chunk);
              buf = Buffer.concat(chunks);
          }
          catch (e) {
              console.error('download error', e);
              return sock.sendMessage(chatId, { text: '❌ *Failed to download media*' }, { quoted: message });
          }
      }
      if (buf.length > 1024 * 1024) {
          return sock.sendMessage(chatId, { text: '❌ *File too large*\n\nMaximum size: 1 MB' }, { quoted: message });
      }
      let mimetype = (dataType ? qMsg[dataType]?.mimetype : undefined) || '';
      const ptt = !!qMsg.audioMessage?.ptt;
      const gifPlayback = !!qMsg.videoMessage?.gifPlayback;
      let ext = 'bin';
      if (type === 'sticker')
          ext = 'webp';
      else if (type === 'image')
          ext = mimetype.includes('png') ? 'png' : 'jpg';
      else if (type === 'video')
          ext = 'mp4';
      else if (type === 'audio') {
          if (mimetype.includes('ogg') || mimetype.includes('opus')) {
              ext = 'ogg';
              mimetype = 'audio/ogg; codecs=opus';
          }
          else if (mimetype.includes('mpeg') || mimetype.includes('mp3')) {
              ext = 'mp3';
              mimetype = 'audio/mpeg';
          }
          else if (mimetype.includes('aac')) {
              ext = 'aac';
              mimetype = 'audio/aac';
          }
          else if (mimetype.includes('wav')) {
              ext = 'wav';
              mimetype = 'audio/wav';
          }
          else if (mimetype.includes('m4a') || mimetype.includes('mp4')) {
              ext = 'm4a';
              mimetype = 'audio/mp4';
          }
          else {
              ext = 'mp3';
              mimetype = 'audio/mpeg';
          }
      }
      else if (type === 'text')
          ext = 'txt';
      const stateBefore = await loadState();
      try {
          const assetsDir = path.join(process.cwd(), 'assets');
          if (fs.existsSync(assetsDir)) {
              const files = fs.readdirSync(assetsDir);
              for (const f of files) {
                  if (f.startsWith('mention_custom.')) {
                      try {
                          fs.unlinkSync(path.join(assetsDir, f));
                      }
                      catch { }
                  }
              }
          }
          if (stateBefore.assetPath && stateBefore.assetPath.startsWith('assets/') &&
              !stateBefore.assetPath.endsWith('mention_default.webp')) {
              const prevPath = path.join(process.cwd(), stateBefore.assetPath);
              if (fs.existsSync(prevPath)) {
                  try {
                      fs.unlinkSync(prevPath);
                  }
                  catch { }
              }
          }
      }
      catch (e) {
          console.warn('cleanup previous assets failed:', e?.message || e);
      }
      const outName = `mention_custom.${ext}`;
      const assetsDir = path.join(process.cwd(), 'assets');
      if (!fs.existsSync(assetsDir)) {
          fs.mkdirSync(assetsDir, { recursive: true });
      }
      const outPath = path.join(assetsDir, outName);
      try {
          fs.writeFileSync(outPath, buf);
      }
      catch (e) {
          console.error('write error', e);
          return sock.sendMessage(chatId, { text: '❌ *Failed to save file*' }, { quoted: message });
      }
      const state = await loadState();
      state.assetPath = path.join('assets', outName);
      state.type = type;
      if (type === 'audio')
          state.mimetype = mimetype;
      if (type === 'audio')
          state.ptt = ptt;
      if (type === 'video')
          state.gifPlayback = gifPlayback;
      await saveState(state);
      return sock.sendMessage(chatId, {
          text: `✅ *Mention reply updated!*\n\nType: ${type}\nStorage: ${HAS_DB ? 'Database' : 'File System'}`
      }, { quoted: message });
  }
  return {

    // ── .mention ─── Toggle or set custom mention reply | usage: .mention <on|off> or .setmention (reply to media)
    "mention": async (h) => {
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
        rawText: (h.config.prefix + 'mention ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const onoff = args[0]?.toLowerCase();
        if (!onoff || !['on', 'off'].includes(onoff)) {
            return sock.sendMessage(chatId, {
                text: '❌ *Invalid usage*\n\nUsage: `.mention on|off`'
            }, { quoted: message });
        }
        const state = await loadState();
        state.enabled = onoff === 'on';
        await saveState(state);
        return sock.sendMessage(chatId, {
            text: `✅ *Mention reply ${state.enabled ? 'enabled' : 'disabled'}*\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:mention] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .mention: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "setmention": async (h) => module.exports["mention"](h),
    "mentionreply": async (h) => module.exports["mention"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .pinchat ─── Pin or unpin the current chat | usage: .pinchat pin | .pinchat unpin
    "pinchat": async (h) => {
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
        rawText: (h.config.prefix + 'pinchat ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const shouldPin = !rawText.startsWith('.unpin');
        try {
            await sock.chatModify({ pin: shouldPin }, chatId);
            await sock.sendMessage(chatId, {
                text: shouldPin ? `📌 *Chat pinned!*` : `📌 *Chat unpinned!*`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[PINCHAT] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${shouldPin ? 'pin' : 'unpin'} chat: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:pinchat] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pinchat: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "pin": async (h) => module.exports["pinchat"](h),
    "unpin": async (h) => module.exports["pinchat"](h),
    "unpinchat": async (h) => module.exports["pinchat"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from pmblocker.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const PMBLOCKER_PATH = './data/pmblocker.json';
  const DEFAULT_MESSAGE = '⚠️ Direct messages are blocked!\nYou cannot DM this bot. Please contact the owner in group chats only.';
  async function readState() {
      try {
          if (HAS_DB) {
              const data = await store.getSetting('global', 'pmblocker');
              if (!data) {
                  return { enabled: false, message: DEFAULT_MESSAGE };
              }
              return {
                  enabled: !!data.enabled,
                  message: typeof data.message === 'string' && data.message.trim()
                      ? data.message
                      : DEFAULT_MESSAGE
              };
          }
          else {
              if (!fs.existsSync(PMBLOCKER_PATH)) {
                  return { enabled: false, message: DEFAULT_MESSAGE };
              }
              const raw = fs.readFileSync(PMBLOCKER_PATH, 'utf8');
              const data = JSON.parse(raw || '{}');
              return {
                  enabled: !!data.enabled,
                  message: typeof data.message === 'string' && data.message.trim()
                      ? data.message
                      : DEFAULT_MESSAGE
              };
          }
      }
      catch {
          return { enabled: false, message: DEFAULT_MESSAGE };
      }
  }
  async function writeState(enabled, message) {
      try {
          const current = await readState();
          const payload = {
              enabled: !!enabled,
              message: typeof message === 'string' && message.trim() ? message : current.message
          };
          if (HAS_DB) {
              await store.saveSetting('global', 'pmblocker', payload);
          }
          else {
              if (!fs.existsSync('./data')) {
                  fs.mkdirSync('./data', { recursive: true });
              }
              fs.writeFileSync(PMBLOCKER_PATH, JSON.stringify(payload, null, 2));
          }
      }
      catch (e) {
          console.error('Error writing PM blocker state:', e);
      }
  }
  return {

    // ── .pmblocker ─── Block private messages and auto-block users who DM the bot | usage: .pmblocker <on|off|status|setmsg>
    "pmblocker": async (h) => {
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
        rawText: (h.config.prefix + 'pmblocker ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const state = await readState();
        const sub = args[0]?.toLowerCase();
        const rest = args.slice(1);
        if (!sub || !['on', 'off', 'status', 'setmsg'].includes(sub)) {
            await sock.sendMessage(chatId, {
                text: `📵 *PM BLOCKER*\n\n` +
                    `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                    `*Commands:*\n` +
                    `• \`.pmblocker on\` - Enable DM blocking\n` +
                    `• \`.pmblocker off\` - Disable DM blocking\n` +
                    `• \`.pmblocker status\` - Current status\n` +
                    `• \`.pmblocker setmsg <text>\` - Set warning message\n\n` +
                    `*Current Status:* ${state.enabled ? '✅ ENABLED' : '❌ DISABLED'}`
            }, { quoted: message });
            return;
        }
        if (sub === 'status') {
            await sock.sendMessage(chatId, {
                text: `📵 *PM BLOCKER STATUS*\n\n` +
                    `*Status:* ${state.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                    `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                    `*Warning Message:*\n${state.message}`
            }, { quoted: message });
            return;
        }
        if (sub === 'setmsg') {
            const newMsg = rest.join(' ').trim();
            if (!newMsg) {
                await sock.sendMessage(chatId, {
                    text: '*Please provide a message*\n\nUsage: `.pmblocker setmsg <your message>`'
                }, { quoted: message });
                return;
            }
            await writeState(state.enabled, newMsg);
            await sock.sendMessage(chatId, {
                text: `✅ *PM blocker message updated!*\n\n*New message:*\n${newMsg}`
            }, { quoted: message });
            return;
        }
        const enable = sub === 'on';
        await writeState(enable, undefined);
        await sock.sendMessage(chatId, {
            text: `📵 *PM Blocker ${enable ? 'ENABLED' : 'DISABLED'}*\n\n` +
                `${enable ? '✅ Users who DM the bot will be warned and blocked.' : '❌ Private messages are now allowed.'}`
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:pmblocker] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pmblocker: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "pmblock": async (h) => module.exports["pmblocker"](h),
    "blockpm": async (h) => module.exports["pmblocker"](h),
    "antipm": async (h) => module.exports["pmblocker"](h),
  };
})());


Object.assign(module.exports, (() => {
  const simpleGit = require('simple-git');

  return {

    // ── .gitpull ─── Reload all plugins (Pull changes from git if available) | usage: .gitpull
    "gitpull": async (h) => {
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
        rawText: (h.config.prefix + 'gitpull ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const commandHandler = (await import('../lib_ported/commandHandler.js')).default;
        const start = Date.now();
        let gitStatus = 'Local reload only';
        try {
            const isRepo = await git.checkIsRepo();
            if (isRepo) {
                const remotes = await git.getRemotes(true);
                if (remotes.some((r) => r.name === 'origin')) {
                    await git.pull();
                    gitStatus = 'Pulled from git remote';
                }
            }
        }
        catch (err) {
            gitStatus = 'Git unavailable, used local files';
        }
        try {
            commandHandler.reloadCommands();
            const end = Date.now();
            await sock.sendMessage(chatId, {
                text: `✅ Reload complete\n` +
                    `🔄 Mode: ${gitStatus}\n` +
                    `📦 Plugins: ${commandHandler.commands.size}\n` +
                    `⏱ Time: ${end - start}ms`
            });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Reload failed: ${error.message}`
            });
        }
    
      } catch (portErr) {
        console.error('[ported:gitpull] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gitpull: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "refresh": async (h) => module.exports["gitpull"](h),
    "pull": async (h) => module.exports["gitpull"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  const axios = require('axios');
  // --- helper code from setbio.js ---
  const QUOTE_URLS = [
      'https://raw.githubusercontent.com/GlobalTechInfo/Islamic-Database/main/text/random_quotes.txt',
      'https://raw.githubusercontent.com/GlobalTechInfo/Islamic-Database/main/text/motivational_quotes.txt',
      'https://raw.githubusercontent.com/GlobalTechInfo/Islamic-Database/main/text/pickup_quotes.txt'
  ];
  let cachedQuotes = [];
  let lastFetchTime = 0;
  const CACHE_DURATION = 60 * 60 * 1000;
  async function fetchQuotes() {
      try {
          if (cachedQuotes.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
              return cachedQuotes;
          }
          const allQuotes = [];
          for (const url of QUOTE_URLS) {
              try {
                  const response = await axios.get(url, { timeout: 15000 });
                  const lines = response.data
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 10);
                  allQuotes.push(...lines);
              }
              catch (error) {
              }
          }
          if (allQuotes.length === 0) {
              // Fallback quotes if fetch fails
              return [
                  '💎 By Henry Ochibots v19 - Your WhatsApp Bot',
                  '🌟 Stay positive, work hard, make it happen.',
                  '✨ Believe in yourself and all that you are.',
                  '🚀 The future belongs to those who believe in the beauty of their dreams.',
                  '💪 Success is not final, failure is not fatal.',
                  '🎯 Dream big, work hard, stay focused.',
                  '⭐ Every day is a new beginning.',
                  '🌈 Be the reason someone smiles today.'
              ];
          }
          cachedQuotes = allQuotes;
          lastFetchTime = Date.now();
          return allQuotes;
      }
      catch (error) {
          return cachedQuotes.length > 0 ? cachedQuotes : ['💎 By Henry Ochibots v19 - Your WhatsApp Bot'];
      }
  }
  function getRandomQuote(quotes) {
      if (!quotes || quotes.length === 0)
          return '💎 By Henry Ochibots v19';
      return quotes[Math.floor(Math.random() * quotes.length)];
  }
  async function updateAutoBio(sock) {
      try {
          const autoBioSettings = await store.getSetting('global', 'autoBio');
          if (!autoBioSettings?.enabled)
              return;
          const quotes = await fetchQuotes();
          const randomQuote = getRandomQuote(quotes);
          let bio;
          if (autoBioSettings.customBio) {
              bio = autoBioSettings.customBio.replace('{quote}', randomQuote);
          }
          else {
              bio = `${randomQuote}\n\n💎 Henry Ochibots v19`;
          }
          if (bio.length > 139) {
              bio = `${bio.substring(0, 136) }...`;
          }
          await sock.updateProfileStatus(bio);
      }
      catch (error) {
      }
  }
  let autoBioInterval = null;
  function startAutoBio(sock) {
      if (autoBioInterval)
          return;
      fetchQuotes().then(() => {
      });
      autoBioInterval = setInterval(() => {
          updateAutoBio(sock);
      }, 10 * 60 * 1000);
      updateAutoBio(sock);
  }
  function stopAutoBio() {
      if (autoBioInterval) {
          clearInterval(autoBioInterval);
          autoBioInterval = null;
      }
  }
  return {

    // ── .setbio ─── Set custom WhatsApp bio with random quotes | usage: .setbio <on|off|set|reset>
    "setbio": async (h) => {
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
        rawText: (h.config.prefix + 'setbio ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();
        try {
            const autoBioSettings = await store.getSetting('global', 'autoBio') || { enabled: false, customBio: null };
            if (!action) {
                const quotes = await fetchQuotes();
                return await sock.sendMessage(chatId, {
                    text: `*📝 AUTO BIO SETTINGS*\n\n` +
                        `*Status:* ${autoBioSettings.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `*Custom Bio:* ${autoBioSettings.customBio ? 'Set' : 'Default'}\n` +
                        `*Quotes Loaded:* ${quotes.length}\n` +
                        `*Update Interval:* Every 10 minute\n\n` +
                        `*Commands:*\n` +
                        `• \`.setbio on\` - Enable auto bio\n` +
                        `• \`.setbio off\` - Disable auto bio\n` +
                        `• \`.setbio set <text>\` - Set custom bio\n` +
                        `• \`.setbio reset\` - Reset to default bio\n` +
                        `• \`.setbio preview\` - Preview random quote\n\n` +
                        `*Default Bio:*\n{quote}\n💎 Henry Ochibots v19\n\n` +
                        `*Custom Bio:*\n${autoBioSettings.customBio || 'Not set'}\n\n` +
                        `*Note:* Use \`{quote}\` in custom bio to insert random quotes.\n\n` +
                        `*Sources:*\n• Famous Quotes\n• Motivational Quotes\n• Pickup Lines`
                }, { quoted: message });
            }
            if (action === 'preview') {
                const quotes = await fetchQuotes();
                const randomQuote = getRandomQuote(quotes);
                return await sock.sendMessage(chatId, {
                    text: `*📝 Preview Quote*\n\n${randomQuote}\n\n💎 Henry Ochibots v19\n\n_This is how your bio will look with random quotes_`
                }, { quoted: message });
            }
            if (action === 'on') {
                if (autoBioSettings.enabled) {
                    return await sock.sendMessage(chatId, {
                        text: '⚠️ *Auto bio is already enabled*'
                    }, { quoted: message });
                }
                autoBioSettings.enabled = true;
                await store.saveSetting('global', 'autoBio', autoBioSettings);
                startAutoBio(sock);
                return await sock.sendMessage(chatId, {
                    text: '✅ *Auto bio enabled!*\n\nYour bio will now update every 1 minute with random quotes from:\n• Islamic Quotes\n• Motivational Quotes\n• Pickup Lines'
                }, { quoted: message });
            }
            if (action === 'off') {
                if (!autoBioSettings.enabled) {
                    return await sock.sendMessage(chatId, {
                        text: '⚠️ *Auto bio is already disabled*'
                    }, { quoted: message });
                }
                autoBioSettings.enabled = false;
                await store.saveSetting('global', 'autoBio', autoBioSettings);
                stopAutoBio();
                return await sock.sendMessage(chatId, {
                    text: '❌ *Auto bio disabled!*\n\nYour bio will no longer auto-update.'
                }, { quoted: message });
            }
            if (action === 'set') {
                let customBio = null;
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted) {
                    customBio = quoted.conversation ||
                        quoted.extendedTextMessage?.text ||
                        null;
                }
                else {
                    customBio = args.slice(1).join(' ').trim();
                }
                if (!customBio) {
                    return await sock.sendMessage(chatId, {
                        text: '❌ *Please provide bio text!*\n\n*Usage:*\n• `.setbio set Your bio here`\n• Reply to a message with `.setbio set`\n\n*Tip:* Use `{quote}` to insert random quotes in your bio.'
                    }, { quoted: message });
                }
                autoBioSettings.customBio = customBio;
                await store.saveSetting('global', 'autoBio', autoBioSettings);
                if (autoBioSettings.enabled) {
                    await updateAutoBio(sock);
                }
                return await sock.sendMessage(chatId, {
                    text: `✅ *Custom bio set!*\n\n*Your bio:*\n${customBio}\n\n${autoBioSettings.enabled ? '✅ Auto bio is enabled - Bio updated!' : '⚠️ Auto bio is disabled - Use `.setbio on` to enable'}`
                }, { quoted: message });
            }
            if (action === 'reset') {
                autoBioSettings.customBio = null;
                await store.saveSetting('global', 'autoBio', autoBioSettings);
                if (autoBioSettings.enabled) {
                    await updateAutoBio(sock);
                }
                return await sock.sendMessage(chatId, {
                    text: '✅ *Bio reset to default!*\n\n*Default bio:*\n{quote}\n💎 Henry Ochibots v19'
                }, { quoted: message });
            }
            return await sock.sendMessage(chatId, {
                text: '❌ *Invalid command!*\n\nUse `.setbio` to see available options.'
            }, { quoted: message });
        }
        catch (error) {
            console.error('SetBio Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ *Error:* ${error.message}`
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:setbio] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .setbio: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "autobio": async (h) => module.exports["setbio"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  // --- helper code from setcmd.js ---
  /*****************************************************************************
   *                                                                           *
   *                     Developed By Qasim Ali                                *
   *                                                                           *
   *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
   *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
   *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
   *                                                                           *
   *    © 2026 GlobalTechInfo. All rights reserved.                            *
   *                                                                           *
   *    Description: This file is part of the MEGA-MD Project.                 *
   *                 Unauthorized copying or distribution is prohibited.       *
   *                                                                           *
   *****************************************************************************/
  
  
  
  
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const STICKER_FILE = dataFile('sticker_commands.json');
  async function getStickerCommands() {
      if (HAS_DB) {
          const data = await store.getSetting('global', 'stickerCommands');
          return data || {};
      }
      else {
          try {
              const dir = path.dirname(STICKER_FILE);
              if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
              }
              if (!fs.existsSync(STICKER_FILE)) {
                  fs.writeFileSync(STICKER_FILE, JSON.stringify({}));
                  return {};
              }
              return JSON.parse(fs.readFileSync(STICKER_FILE, 'utf8'));
          }
          catch {
              return {};
          }
      }
  }
  async function saveStickerCommands(data) {
      if (HAS_DB) {
          await store.saveSetting('global', 'stickerCommands', data);
      }
      else {
          const dir = path.dirname(STICKER_FILE);
          if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(STICKER_FILE, JSON.stringify(data, null, 2));
      }
  }
  return {

    // ── .setcmd ─── Set a sticker command | usage: .setcmd <text>
    "setcmd": async (h) => {
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
        rawText: (h.config.prefix + 'setcmd ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, senderId } = context;
        if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return await sock.sendMessage(chatId, {
                text: '✳️ Please reply to a sticker to set a command'
            }, { quoted: message });
        }
        const quotedMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
        if (!quotedMsg.stickerMessage) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ Please reply to a sticker, not a regular message'
            }, { quoted: message });
        }
        const fileSha256 = quotedMsg.stickerMessage.fileSha256;
        if (!fileSha256) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ File SHA256 not found'
            }, { quoted: message });
        }
        const text = args.join(' ');
        if (!text) {
            return await sock.sendMessage(chatId, {
                text: 'Command text is missing'
            }, { quoted: message });
        }
        const stickers = await getStickerCommands();
        const hash = Buffer.from(fileSha256).toString('base64');
        if (stickers[hash] && stickers[hash].locked) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ You do not have permission to change this sticker command'
            }, { quoted: message });
        }
        stickers[hash] = {
            text,
            mentionedJid: message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
            creator: senderId,
            at: Date.now(),
            locked: false,
        };
        await saveStickerCommands(stickers);
        await sock.sendMessage(chatId, {
            text: '✅ Command saved successfully'
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:setcmd] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .setcmd: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "addcmd": async (h) => module.exports["setcmd"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const isOwnerOrSudo = require('../lib_ported/isOwner.js');

  return {

    // ── .setpp ─── Set or update the bot profile picture (owner only) | usage: .setpp (reply to an image)
    "setpp": async (h) => {
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
        rawText: (h.config.prefix + 'setpp ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const senderId = message.key.participant || message.key.remoteJid;
            const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
            if (!message.key.fromMe && !isOwner) {
                await sock.sendMessage(chatId, {
                    text: '*This command is only available for the owner!*'
                }, { quoted: message });
                return;
            }
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMessage) {
                await sock.sendMessage(chatId, {
                    text: '⚠️ Please reply to an image with the .setpp command!'
                }, { quoted: message });
                return;
            }
            const imageMessage = quotedMessage.imageMessage || quotedMessage.stickerMessage;
            if (!imageMessage) {
                await sock.sendMessage(chatId, {
                    text: '*The replied message must contain an image!*'
                }, { quoted: message });
                return;
            }
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir))
                fs.mkdirSync(tmpDir, { recursive: true });
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream)
                buffer = Buffer.concat([buffer, chunk]);
            const imagePath = path.join(tmpDir, `profile_${Date.now()}.jpg`);
            fs.writeFileSync(imagePath, buffer);
            await sock.updateProfilePicture(sock.user.id, { url: imagePath });
            fs.unlinkSync(imagePath);
            await sock.sendMessage(chatId, {
                text: '✅ Successfully updated bot profile picture!'
            }, { quoted: message });
        }
        catch (error) {
            console.error('SetPP Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to update profile picture!'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:setpp] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .setpp: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "setppic": async (h) => module.exports["setpp"](h),
    "setdp": async (h) => module.exports["setpp"](h),
  };
})());


Object.assign(module.exports, (() => {
  const isOwnerOrSudo = require('../lib_ported/isOwner.js');
const { cleanJid } = isOwnerOrSudo;
  const { getChatbot, getWelcome, getGoodbye, getAntitag } = require('../lib_ported/index.js');
  const store = require('../lib_ported/lightweight_store.js');

  return {

    // ── .settings ─── Show bot settings and per-group configurations | usage: .settings
    "settings": async (h) => {
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
        rawText: (h.config.prefix + 'settings ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        try {
            const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
            const isMe = message.key.fromMe;
            if (!isMe && !isOwner) {
                return await sock.sendMessage(chatId, {
                    text: '❌ *Access Denied:* Only Owner/Sudo can view settings.'
                }, { quoted: message });
            }
            const isGroup = chatId.endsWith('@g.us');
            const botMode = await store.getBotMode();
            const autoStatus = await store.getSetting('global', 'autoStatus') || { enabled: false };
            const autoread = await store.getSetting('global', 'autoread') || { enabled: false };
            const autotyping = await store.getSetting('global', 'autotyping') || { enabled: false };
            const pmblocker = await store.getSetting('global', 'pmblocker') || { enabled: false };
            const anticall = await store.getSetting('global', 'anticall') || { enabled: false };
            const autoReactionData = await store.getSetting('global', 'autoReaction');
            const mentionData = await store.getSetting('global', 'mention');
            const autoReaction = autoReactionData?.enabled || false;
            const stealthMode = await store.getSetting('global', 'stealthMode') || { enabled: false };
            const autoBio = await store.getSetting('global', 'autoBio') || { enabled: false };
            // cmdreact saves to userGroupData.json as data.autoReaction
            const fs = (await import('fs')).default;
            let cmdReactEnabled = true;
            try {
                const ugd = JSON.parse(fs.readFileSync('./data/userGroupData.json', 'utf-8'));
                cmdReactEnabled = ugd.autoReaction ?? true;
            }
            catch {
                cmdReactEnabled = true;
            }
            const getSt = (val) => val ? '✅' : '❌';
            let menuText = `╭━〔 *MEGA CONFIG* 〕━┈\n┃\n`;
            menuText += `┃ 👤 *User:* @${cleanJid(senderId)}\n`;
            menuText += `┃ 🤖 *Mode:* ${botMode.toUpperCase()}\n`;
            menuText += `┃\n┣━〔 *GLOBAL CONFIG* 〕━┈\n`;
            menuText += `┃ ${getSt(autoStatus?.enabled)} *Auto Status*\n`;
            menuText += `┃ ${getSt(autoread?.enabled)} *Auto Read*\n`;
            menuText += `┃ ${getSt(autotyping?.enabled)} *Auto Typing*\n`;
            menuText += `┃ ${getSt(pmblocker?.enabled)} *PM Blocker*\n`;
            menuText += `┃ ${getSt(anticall?.enabled)} *Anti Call*\n`;
            menuText += `┃ ${getSt(autoReaction)} *Auto Reaction*\n`;
            menuText += `┃ ${getSt(cmdReactEnabled)} *Cmd Reactions*\n`;
            menuText += `┃ ${getSt(stealthMode?.enabled)} *Stealth Mode*\n`;
            menuText += `┃ ${getSt(autoBio?.enabled)} *Auto Bio*\n`;
            menuText += `┃ ${getSt(mentionData?.enabled)} *Mention Alert*\n`;
            menuText += `┃\n`;
            if (isGroup) {
                const groupSettings = await store.getAllSettings(chatId);
                const groupAntilink = groupSettings.antilink || { enabled: false };
                const groupBadword = groupSettings.antibadword || { enabled: false };
                const antitag = await getAntitag(chatId, 'on');
                const groupAntitag = { enabled: !!antitag };
                const chatbotData = await getChatbot(chatId);
                const welcomeData = await getWelcome(chatId);
                const goodbyeData = await getGoodbye(chatId);
                // getChatbot returns true/false or {enabled}
                const groupChatbot = chatbotData === true || chatbotData?.enabled || false;
                // getWelcome returns null or message string or {enabled}
                const groupWelcome = welcomeData !== null && welcomeData !== undefined && welcomeData !== false;
                // getGoodbye returns null or message string or {enabled}
                const groupGoodbye = goodbyeData !== null && goodbyeData !== undefined && goodbyeData !== false;
                menuText += `┣━〔 *GROUP CONFIG* 〕━┈\n`;
                menuText += `┃ ${getSt(groupAntilink.enabled)} *Antilink*\n`;
                menuText += `┃ ${getSt(groupBadword.enabled)} *Antibadword*\n`;
                menuText += `┃ ${getSt(groupAntitag.enabled)} *Antitag*\n`;
                menuText += `┃ ${getSt(groupChatbot)} *Chatbot*\n`;
                menuText += `┃ ${getSt(groupWelcome)} *Welcome*\n`;
                menuText += `┃ ${getSt(groupGoodbye)} *Goodbye*\n`;
            }
            else {
                menuText += `┃ 💡 *Note:* _Use in group for group configs._\n`;
            }
            menuText += `┃\n╰━━━━━━━━━━━━━━━━┈`;
            await sock.sendMessage(chatId, {
                text: menuText,
                mentions: [senderId],
                contextInfo: {
                    externalAdReply: {
                        title: "SYSTEM SETTINGS PANEL",
                        body: "Configuration Status",
                        thumbnailUrl: "https://github.com/GlobalTechInfo.png",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        }
        catch (error) {
            console.error('Settings Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Error: Failed to load settings.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:settings] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .settings: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "config": async (h) => module.exports["settings"](h),
    "setting": async (h) => module.exports["settings"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .star ─── Star or unstar a replied message | usage: .star — reply to a message | .unstar — reply to a message
    "star": async (h) => {
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
        rawText: (h.config.prefix + 'star ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const shouldStar = !rawText.startsWith('.unstar');
        // contextInfo can be nested in any message type
        const msg = message.message;
        const contextInfo = msg?.extendedTextMessage?.contextInfo ||
            msg?.imageMessage?.contextInfo ||
            msg?.videoMessage?.contextInfo ||
            msg?.audioMessage?.contextInfo ||
            msg?.documentMessage?.contextInfo ||
            msg?.stickerMessage?.contextInfo ||
            msg?.buttonsResponseMessage?.contextInfo ||
            null;
        if (!contextInfo?.stanzaId) {
            return await sock.sendMessage(chatId, {
                text: `*⭐ STAR MESSAGE*\n\n_Reply to any message with:_\n• \`.star\` — to star it\n• \`.unstar\` — to unstar it`,
                ...channelInfo
            }, { quoted: message });
        }
        const targetId = contextInfo.stanzaId;
        // Determine fromMe: compare phone numbers only (strip :xx@suffix)
        const botNum = (sock.user?.id || '').split(':')[0].split('@')[0];
        const participantNum = (contextInfo.participant || '').split(':')[0].split('@')[0];
        const fromMe = participantNum ? participantNum === botNum : message.key.fromMe;
        try {
            await sock.chatModify({
                star: {
                    messages: [{ id: targetId, fromMe }],
                    star: shouldStar
                }
            }, chatId);
            await sock.sendMessage(chatId, {
                text: shouldStar ? `⭐ *Message starred!*` : `✴️ *Message unstarred!*`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[STARMSG] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${shouldStar ? 'star' : 'unstar'} message: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:star] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .star: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "starmsg": async (h) => module.exports["star"](h),
    "unstar": async (h) => module.exports["star"](h),
    "unstarmsg": async (h) => module.exports["star"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');

  return {

    // ── .stealth ─── Toggle online status - bot will not send presence updates if off | usage: .stealth <on|off>
    "stealth": async (h) => {
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
        rawText: (h.config.prefix + 'stealth ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        const action = args[0]?.toLowerCase();
        if (!action || !['on', 'off'].includes(action)) {
            const currentState = await store.getSetting('global', 'stealthMode');
            const status = currentState?.enabled ? 'ON' : 'OFF';
            let autotypingWarning = '';
            try {
                const autotypingState = await store.getSetting('global', 'autotyping');
                if (autotypingState?.enabled && currentState?.enabled) {
                    autotypingWarning = '\n\n⚠️ *Autotyping is enabled* but will be blocked by stealth mode.';
                }
            }
            catch (e) { }
            let autoreadWarning = '';
            try {
                const autoreadState = await store.getSetting('global', 'autoread');
                if (autoreadState?.enabled && currentState?.enabled) {
                    autoreadWarning = '\n⚠️ *Autoread is enabled* but will be blocked by stealth mode.';
                }
            }
            catch (e) { }
            return await sock.sendMessage(chatId, {
                text: `👻 *Stealth Mode Status:* ${status}\n\n*Usage:* .stealth <on|off>\n\n*What it does:*\n• Blocks all presence updates (typing, online, last seen)\n• Makes the bot completely invisible\n\n*When enabled:*\n✓ No "typing..." indicator\n✓ No "online" status\n✓ Complete stealth mode${autotypingWarning}${autoreadWarning}`
            }, { quoted: message });
        }
        const enabled = action === 'on';
        await store.saveSetting('global', 'stealthMode', { enabled });
        let warnings = '';
        if (enabled) {
            try {
                const autotypingState = await store.getSetting('global', 'autotyping');
                const autoreadState = await store.getSetting('global', 'autoread');
                if (autotypingState?.enabled || autoreadState?.enabled) {
                    warnings = '\n\n*⚠️ Note:*\n';
                    if (autotypingState?.enabled)
                        warnings += '• Autotyping is enabled but will be blocked\n';
                    if (autoreadState?.enabled)
                        warnings += '• Autoread is enabled but will be blocked\n';
                }
            }
            catch (e) { }
        }
        await sock.sendMessage(chatId, {
            text: `👻 Stealth mode has been turned *${enabled ? 'ON' : 'OFF'}*\n\n${enabled ? '✓ Bot is now in complete stealth mode\n✓ No presence updates\n✓ No typing indicators' : '✓ Presence updates enabled\n✓ Typing indicators enabled (if autotyping is on)'}${warnings}`
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:stealth] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .stealth: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "alwaysonline": async (h) => module.exports["stealth"](h),
    "stealthmode": async (h) => module.exports["stealth"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { addSudo, removeSudo, getSudoList } = require('../lib_ported/index.js');
  const isOwnerOrSudo = require('../lib_ported/isOwner.js');
const { cleanJid } = isOwnerOrSudo;
  // --- helper code from sudo.js ---
  function extractTargetJid(message, args) {
      if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
          return message.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }
      if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
          return message.message.extendedTextMessage.contextInfo.participant;
      }
      const text = args.join(' ');
      const match = text.match(/\b(\d{7,15})\b/);
      if (match)
          return `${match[1] }@s.whatsapp.net`;
      return null;
  }
  return {

    // ── .sudo ─── Add or remove sudo users or list them | usage: .sudo add|del|list <@user|number>
    "sudo": async (h) => {
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
        rawText: (h.config.prefix + 'sudo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const config = context.config;
        const _senderJid = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const isOwner = message.key.fromMe || isOwnerOrSudo;
        const sub = (args[0] || '').toLowerCase();
        if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
            await sock.sendMessage(chatId, {
                text: '╭━━━〔 *SUDO MANAGER* 〕━━━┈\n┃\n┃ 📝 *Usage:*\n┃ ▢ .sudo add <@tag/reply/num>\n┃ ▢ .sudo del <@tag/reply/num>\n┃ ▢ .sudo list\n┃\n╰━━━━━━━━━━━━━━━━━━┈'
            }, { quoted: message });
            return;
        }
        if (sub === 'list') {
            const list = await getSudoList();
            if (list.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ No sudo users found.' }, { quoted: message });
                return;
            }
            const textList = list.map((j, i) => `┃ ${i + 1}. @${cleanJid(j)}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `╭━━〔 *SUDO USERS* 〕━━┈\n┃\n${textList}\n┃\n╰━━━━━━━━━━━━━━━┈`,
                mentions: list
            }, { quoted: message });
            return;
        }
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ *Access Denied:* Only the Main Owner can manage Sudo privileges.' }, { quoted: message });
            return;
        }
        const targetJid = extractTargetJid(message, args.slice(1));
        if (!targetJid) {
            await sock.sendMessage(chatId, { text: '❌ Please mention a user, reply to a message, or provide a number.' }, { quoted: message });
            return;
        }
        let displayId = cleanJid(targetJid);
        if (targetJid.includes('@lid') && isGroup) {
            try {
                const metadata = await sock.groupMetadata(chatId);
                const found = metadata.participants.find((p) => p.lid === targetJid || p.id === targetJid);
                if (found && found.id && !found.id.includes('@lid')) {
                    displayId = cleanJid(found.id);
                }
            }
            catch (e) { }
        }
        if (sub === 'add') {
            const ok = await addSudo(targetJid);
            await sock.sendMessage(chatId, {
                text: ok ? `✅ *Success:* @${displayId} has been granted Sudo privileges.` : `❌ *Error:* Failed to add sudo.`,
                mentions: [targetJid]
            }, { quoted: message });
            return;
        }
        if (sub === 'del' || sub === 'remove') {
            const ownerNumberClean = cleanJid(config.ownerNumber);
            if (displayId === ownerNumberClean) {
                await sock.sendMessage(chatId, { text: '❌ *Action Denied:* Cannot remove the Main Owner.' }, { quoted: message });
                return;
            }
            const ok = await removeSudo(targetJid);
            await sock.sendMessage(chatId, {
                text: ok ? `✅ *Success:* Sudo privileges revoked from @${displayId}.` : `❌ *Error:* Failed to remove sudo.`,
                mentions: [targetJid]
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:sudo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sudo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const os = require('os');
  // --- helper code from sysinfo.js ---
  const execAsync = promisify(exec);
  return {

    // ── .sysinfo ─── Show detailed server system information | usage: .sysinfo
    "sysinfo": async (h) => {
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
        rawText: (h.config.prefix + 'sysinfo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            // Memory via os module (works everywhere, no free command needed)
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const toMB = (b) => (b / 1024 / 1024).toFixed(0);
            const toGB = (b) => (b / 1024 / 1024 / 1024).toFixed(2);
            const memTotal = totalMem > 1073741824 ? `${toGB(totalMem) } GB` : `${toMB(totalMem) } MB`;
            const memUsed = usedMem > 1073741824 ? `${toGB(usedMem) } GB` : `${toMB(usedMem) } MB`;
            const memFree = freeMem > 1073741824 ? `${toGB(freeMem) } GB` : `${toMB(freeMem) } MB`;
            // Disk via df (fallback to N/A if not available)
            let diskTotal = 'N/A', diskUsed = 'N/A', diskFree = 'N/A', diskPct = 'N/A';
            try {
                const diskOut = (await execAsync('df -h /')).stdout.trim();
                const diskVals = diskOut.split('\n')[1]?.split(/\s+/) || [];
                diskTotal = diskVals[1] || 'N/A';
                diskUsed = diskVals[2] || 'N/A';
                diskFree = diskVals[3] || 'N/A';
                diskPct = diskVals[4] || 'N/A';
            }
            catch { }
            // Bot uptime (process uptime, not system uptime)
            const uptimeSec = Math.floor(process.uptime());
            const uptimeDays = Math.floor(uptimeSec / 86400);
            const uptimeHrs = Math.floor((uptimeSec % 86400) / 3600);
            const uptimeMins = Math.floor((uptimeSec % 3600) / 60);
            const uptimeSecs = uptimeSec % 60;
            const uptimeOut = uptimeDays > 0
                ? `${uptimeDays}d ${uptimeHrs}h ${uptimeMins}m`
                : uptimeHrs > 0
                    ? `${uptimeHrs}h ${uptimeMins}m ${uptimeSecs}s`
                    : `${uptimeMins}m ${uptimeSecs}s`;
            // CPU
            const cpus = os.cpus();
            const cpuModel = cpus[0]?.model?.trim() || 'Unknown';
            const cpuCores = cpus.length;
            const loadAvg = os.loadavg().map(l => l.toFixed(2)).join(', ');
            // Platform
            const platform = os.platform();
            const arch = os.arch();
            const nodeVer = process.version;
            const hostname = os.hostname();
            const text = `╔══════════════════════════════╗
║     🖥️  *SERVER STATS*        ║
╚══════════════════════════════╝

🏠 *Host:* ${hostname}
🐧 *OS:* ${platform} (${arch})
⏱️ *Uptime:* ${uptimeOut}
🟢 *Node.js:* ${nodeVer}

━━━━━━ 🧠 CPU ━━━━━━
🔧 *Model:* ${cpuModel}
⚙️ *Cores:* ${cpuCores}
📊 *Load Avg:* ${loadAvg}

━━━━━━ 💾 Memory ━━━━━━
📦 *Total:* ${memTotal}
🔴 *Used:* ${memUsed}
🟢 *Free:* ${memFree}

━━━━━━ 💿 Disk (/) ━━━━━━
📦 *Total:* ${diskTotal}
🔴 *Used:* ${diskUsed} (${diskPct})
🟢 *Free:* ${diskFree}`;
            await sock.sendMessage(chatId, {
                text,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed to get system info: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:sysinfo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sysinfo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "system": async (h) => module.exports["sysinfo"](h),
    "serverstats": async (h) => module.exports["sysinfo"](h),
    "serverinfo": async (h) => module.exports["sysinfo"](h),
  };
})());


Object.assign(module.exports, (() => {
  const config = require('../config_ported.js');
  const { createRequire } = require('module');
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  // --- helper code from update.js ---
  
  function run(cmd) {
      return new Promise((resolve, reject) => {
          exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
              if (err)
                  return reject(new Error((stderr || stdout || err.message || '').toString()));
              resolve((stdout || '').toString());
          });
      });
  }
  async function hasGitRepo() {
      const gitDir = path.join(process.cwd(), '.git');
      if (!fs.existsSync(gitDir))
          return false;
      try {
          await run('git --version');
          return true;
      }
      catch {
          return false;
      }
  }
  async function updateViaGit() {
      const oldRev = String(await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
      await run('git fetch --all --prune');
      const newRev = String(await run('git rev-parse origin/main')).trim();
      const alreadyUpToDate = oldRev === newRev;
      const commits = alreadyUpToDate ? '' : await run(`git log --pretty=format:"%h %s (%an)" ${oldRev}..${newRev}`).catch(() => '');
      const files = alreadyUpToDate ? '' : await run(`git diff --name-status ${oldRev} ${newRev}`).catch(() => '');
      await run(`git reset --hard ${newRev}`);
      await run('git clean -fd');
      return { oldRev, newRev, alreadyUpToDate, commits, files };
  }
  function downloadFile(url, dest, visited = new Set()) {
      return new Promise((resolve, reject) => {
          try {
              if (visited.has(url) || visited.size > 5) {
                  return reject(new Error('Too many redirects'));
              }
              visited.add(url);
              const useHttps = url.startsWith('https://');
              const http = require('http');
              const client = useHttps ? https : http;
              const req = client.get(url, {
                  headers: {
                      'User-Agent': 'MegaBot-Updater/1.0',
                      'Accept': '*/*'
                  }
              }, (res) => {
                  if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                      const location = res.headers.location;
                      if (!location)
                          return reject(new Error(`HTTP ${res.statusCode} without Location`));
                      const nextUrl = new URL(location, url).toString();
                      res.resume();
                      return downloadFile(nextUrl, dest, visited).then(resolve).catch(reject);
                  }
                  if (res.statusCode !== 200) {
                      return reject(new Error(`HTTP ${res.statusCode}`));
                  }
                  const file = fs.createWriteStream(dest);
                  res.pipe(file);
                  file.on('finish', () => file.close(resolve));
                  file.on('error', (err) => {
                      try {
                          file.close(() => { });
                      }
                      catch { }
                      fs.unlink(dest, () => reject(err));
                  });
              });
              req.on('error', (err) => {
                  fs.unlink(dest, () => reject(err));
              });
          }
          catch (e) {
              reject(e);
          }
      });
  }
  async function extractZip(zipPath, outDir) {
      if (process.platform === 'win32') {
          const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir.replace(/\\/g, '/')}' -Force"`;
          await run(cmd);
          return;
      }
      try {
          await run('command -v unzip');
          await run(`unzip -o '${zipPath}' -d '${outDir}'`);
          return;
      }
      catch { }
      try {
          await run('command -v 7z');
          await run(`7z x -y '${zipPath}' -o'${outDir}'`);
          return;
      }
      catch { }
      try {
          await run('busybox unzip -h');
          await run(`busybox unzip -o '${zipPath}' -d '${outDir}'`);
          return;
      }
      catch { }
      throw new Error("No system unzip tool found (unzip/7z/busybox). Git mode is recommended on this panel.");
  }
  function copyRecursive(src, dest, ignore = [], relative = '', outList = []) {
      if (!fs.existsSync(dest))
          fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
          if (ignore.includes(entry))
              continue;
          const s = path.join(src, entry);
          const d = path.join(dest, entry);
          const stat = fs.lstatSync(s);
          if (stat.isDirectory()) {
              copyRecursive(s, d, ignore, path.join(relative, entry), outList);
          }
          else {
              fs.copyFileSync(s, d);
              if (outList)
                  outList.push(path.join(relative, entry).replace(/\\/g, '/'));
          }
      }
  }
  async function updateViaZip(sock, chatId, message, zipOverride) {
      const zipUrl = (zipOverride || config.updateZipUrl || process.env.UPDATE_ZIP_URL || '').trim();
      if (!zipUrl) {
          throw new Error('No ZIP URL configured. Set config.updateZipUrl or UPDATE_ZIP_URL env.');
      }
      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir))
          fs.mkdirSync(tmpDir, { recursive: true });
      const zipPath = path.join(tmpDir, 'update.zip');
      await downloadFile(zipUrl, zipPath);
      const extractTo = path.join(tmpDir, 'update_extract');
      if (fs.existsSync(extractTo))
          fs.rmSync(extractTo, { recursive: true, force: true });
      await extractZip(zipPath, extractTo);
      const [root] = fs.readdirSync(extractTo).map(n => path.join(extractTo, n));
      const srcRoot = fs.existsSync(root) && fs.lstatSync(root).isDirectory() ? root : extractTo;
      const ignore = ['node_modules', '.git', 'session', 'tmp', 'tmp/', 'temp', 'data', 'baileys_store.json'];
      const copied = [];
      let preservedOwner = null;
      let preservedBotOwner = null;
      try {
          const currentSettings = (await import('../config.js')).default;
          preservedOwner = currentSettings && currentSettings.ownerNumber ? String(currentSettings.ownerNumber) : null;
          preservedBotOwner = currentSettings && currentSettings.botOwner ? String(currentSettings.botOwner) : null;
      }
      catch { }
      copyRecursive(srcRoot, process.cwd(), ignore, '', copied);
      if (preservedOwner) {
          try {
              const settingsPath = path.join(process.cwd(), 'config.js');
              if (fs.existsSync(settingsPath)) {
                  let text = fs.readFileSync(settingsPath, 'utf8');
                  text = text.replace(/ownerNumber:\s*'[^']*'/, `ownerNumber: '${preservedOwner}'`);
                  if (preservedBotOwner) {
                      text = text.replace(/botOwner:\s*'[^']*'/, `botOwner: '${preservedBotOwner}'`);
                  }
                  fs.writeFileSync(settingsPath, text);
              }
          }
          catch { }
      }
      try {
          fs.rmSync(extractTo, { recursive: true, force: true });
      }
      catch { }
      try {
          fs.rmSync(zipPath, { force: true });
      }
      catch { }
      return { copiedFiles: copied };
  }
  async function restartProcess() {
      // Check if running in Docker
      try {
          const { existsSync } = await import('fs');
          if (existsSync('/.dockerenv')) {
              setTimeout(() => process.exit(1), 500);
              return;
          }
      }
      catch { }
      // Try pm2 first
      try {
          await run('pm2 restart all');
          return;
      }
      catch { }
      // Spawn new process (VPS/bare metal)
      try {
          const { spawn } = await import('child_process');
          const child = spawn(process.execPath, process.argv.slice(1), {
              detached: true,
              stdio: 'ignore',
              cwd: process.cwd(),
              env: process.env
          });
          child.unref();
          setTimeout(() => process.exit(0), 1500);
          return;
      }
      catch { }
      setTimeout(() => process.exit(0), 500);
  }
  return {

    // ── .update ─── Update bot from git or zip without stopping | usage: .update [zip_url]
    "update": async (h) => {
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
        rawText: (h.config.prefix + 'update ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            await sock.sendMessage(chatId, {
                text: '🔄 Updating the bot, please wait…',
                ...channelInfo
            }, { quoted: message });
            let changesSummary = '';
            if (await hasGitRepo()) {
                const { oldRev, newRev, alreadyUpToDate, commits, files } = await updateViaGit();
                if (alreadyUpToDate) {
                    changesSummary = `✅ Already up to date\nCurrent: ${newRev.substring(0, 7)}`;
                }
                else {
                    changesSummary = `✅ Updated successfully!\n\n`;
                    changesSummary += `📌 Old: ${oldRev.substring(0, 7)}\n`;
                    changesSummary += `📌 New: ${newRev.substring(0, 7)}\n\n`;
                    if (commits) {
                        const commitLines = String(commits).split('\n').slice(0, 5);
                        changesSummary += `📝 Recent commits:\n${commitLines.map(c => `• ${c}`).join('\n')}\n\n`;
                    }
                    if (files) {
                        const fileLines = String(files).split('\n').slice(0, 10);
                        changesSummary += `📁 Changed files:\n${fileLines.map(f => `• ${f}`).join('\n')}`;
                        if (String(files).split('\n').length > 10) {
                            changesSummary += `\n... and ${String(files).split('\n').length - 10} more`;
                        }
                    }
                }
                await run('npm install --no-audit --no-fund');
            }
            else {
                const zipOverride = args[0] || null;
                const { copiedFiles } = await updateViaZip(sock, chatId, message, zipOverride);
                changesSummary = `✅ Updated from ZIP!\n\n`;
                changesSummary += `📁 Files updated: ${copiedFiles.length}\n\n`;
                if (copiedFiles.length > 0) {
                    const shown = copiedFiles.slice(0, 10);
                    changesSummary += `Recent changes:\n${shown.map(f => `• ${f}`).join('\n')}`;
                    if (copiedFiles.length > 10) {
                        changesSummary += `\n... and ${copiedFiles.length - 10} more files`;
                    }
                }
            }
            try {
                delete require.cache[require.resolve('../config')];
                const newSettings = (await import('../config.js')).default;
                const v = newSettings.version || 'unknown';
                changesSummary += `\n\n🔖 Version: ${v}`;
            }
            catch { }
            await sock.sendMessage(chatId, {
                text: `${changesSummary }\n\n♻️ Restarting bot...`,
                ...channelInfo
            }, { quoted: message });
            await new Promise(resolve => setTimeout(resolve, 1000));
            await restartProcess();
        }
        catch (err) {
            console.error('Update failed:', err);
            await sock.sendMessage(chatId, {
                text: `❌ Update failed:\n${String(err.message || err)}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:update] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .update: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "upgrade": async (h) => module.exports["update"](h),
    "restart": async (h) => module.exports["update"](h),
  };
})());

