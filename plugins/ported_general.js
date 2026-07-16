// Beast MD ported module (category: general)
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
  const os = require('os');
  const process = require('process');

  return {

    // ── .alive ─── Check bot status and system info | usage: .alive
    "alive": async (h) => {
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
        rawText: (h.config.prefix + 'alive ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, config } = context;
        try {
            let uptime = Math.floor(process.uptime());
            const days = Math.floor(uptime / 86400);
            uptime %= 86400;
            const hours = Math.floor(uptime / 3600);
            uptime %= 3600;
            const minutes = Math.floor(uptime / 60);
            const seconds = (Number(uptime) % Number(60));
            const uptimeParts = [];
            if (days)
                uptimeParts.push(`${days}d`);
            if (hours)
                uptimeParts.push(`${hours}h`);
            if (minutes)
                uptimeParts.push(`${minutes}m`);
            if (seconds || uptimeParts.length === 0)
                uptimeParts.push(`${seconds}s`);
            const uptimeText = uptimeParts.join(' ');
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
            const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
            const usedMem = (Number(totalMem) - Number(freeMem)).toFixed(2);
            const cpuLoad = os.loadavg()[0].toFixed(2);
            const platform = os.platform();
            const arch = os.arch();
            const nodeVersion = process.version;
            const text = `*🤖 ${config.botName} IS ACTIVE!*\n\n` +
                `*Version:* ${config.version}\n` +
                `*Uptime:* ${uptimeText}\n` +
                `*RAM Usage:* ${usedMem} MB / ${totalMem} MB\n` +
                `*CPU Load:* ${cpuLoad}\n` +
                `*Platform:* ${platform} (${arch})\n` +
                `*Node.js:* ${nodeVersion}\n`;
            await sock.sendMessage(chatId, {
                text,
                contextInfo: {}
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in alive command:', error);
            await sock.sendMessage(chatId, { text: '✅ Bot is alive and running!' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:alive] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .alive: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "bot": async (h) => module.exports["alive"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .channelid ─── Get the internal JID of a WhatsApp Channel | usage: .channelid <url>
    "channelid": async (h) => {
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
        rawText: (h.config.prefix + 'channelid ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        let url = args[0] || "";
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            url = quoted.conversation || quoted.extendedTextMessage?.text || url;
        }
        if (!url || !url.includes('whatsapp.com/channel/')) {
            return await sock.sendMessage(chatId, {
                text: 'Please provide a valid WhatsApp Channel URL.\n\n*Example:* .channelid https://whatsapp.com/channel/xxxxx'
            }, { quoted: message });
        }
        const code = url.split('/').pop();
        try {
            const metadata = await sock.newsletterMetadata("invite", code);
            const response = `
🆔 *JID:* ${metadata.id}
      `.trim();
            await sock.sendMessage(chatId, { text: response }, { quoted: message });
        }
        catch (err) {
            console.error('Channel ID Error:', err);
            await sock.sendMessage(chatId, {
                text: '❌ *Failed to resolve:* This channel might be private, deleted, or the link is invalid.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:channelid] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .channelid: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "newsletterid": async (h) => module.exports["channelid"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .echo ─── Repeats your message a specified number of times. | usage: .echo <text> <count>
    "echo": async (h) => {
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
        rawText: (h.config.prefix + 'echo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        if (args.length < 2) {
            return await sock.sendMessage(chatId, { text: 'Usage: .echo <text> <count>' }, { quoted: message });
        }
        const count = parseInt(args[args.length - 1], 10);
        if (isNaN(count) || count <= 0) {
            return await sock.sendMessage(chatId, { text: 'Count must be a positive number.' }, { quoted: message });
        }
        args.pop();
        const text = args.join(' ').trim();
        const repeated = Array(count).fill(text).join('\n');
        await sock.sendMessage(chatId, { text: repeated }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:echo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .echo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .pair ─── Get session id for the bot | usage: .pair
    // ✅ FIX: this used to call an unrelated third-party server
    // (mega-pairing.onrender.com) left over from the ported source bot —
    // it had nothing to do with this bot's own Baileys session, so any
    // code it returned would never actually link this account. Now it
    // just points to the bot's real pairing page (pair.html /
    // client_bridge.js), which has pairing-code, QR, and session-ID
    // restore all wired to the live socket.
    "pair": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      try {
        const { chatId } = { chatId: h.from };
        const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.WEB_PORT || 3000}`;
        const text = `🔗 *Link a WhatsApp number to ${h.config.botName || 'Beast MD'}*\n\n` +
          `Open this page to connect: ${publicUrl}/pair\n\n` +
          `There you can choose:\n` +
          `• *Pairing Code* — enter a phone number, get an 8-character code\n` +
          `• *QR Code* — scan directly from Linked Devices\n` +
          `• *Session ID* — paste an exported session to restore an already-linked account instantly`;
        await sock.sendMessage(chatId, { text }, { quoted: message });
      } catch (portErr) {
        console.error('[ported:pair] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pair: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "paircode": async (h) => module.exports["pair"](h),
    "session": async (h) => module.exports["pair"](h),
    "getsession": async (h) => module.exports["pair"](h),
    "sessionid": async (h) => module.exports["pair"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .pingweb ─── Check bot response time and ping a website | usage: .pingweb [website URL]
    "pingweb": async (h) => {
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
        rawText: (h.config.prefix + 'pingweb ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo, rawText } = context;
        const prefix = rawText.match(/^[.!#]/)?.[0] || '.';
        const commandPart = rawText.slice(prefix.length).trim();
        const parts = commandPart.split(/\s+/);
        const url = parts.slice(1).join(' ').trim();
        const startBot = Date.now();
        const sent = await sock.sendMessage(chatId, {
            text: '🏓 Pinging...',
            ...channelInfo
        }, { quoted: message });
        const endBot = Date.now();
        const botLatency = endBot - startBot;
        let responseText = `🏓 *Pong!*\n\n📶 *Bot Latency:* ${botLatency}ms`;
        if (url) {
            try {
                let testUrl = url;
                if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
                    testUrl = `https://${ testUrl}`;
                }
                const urlObj = new URL(testUrl);
                const startWeb = Date.now();
                const response = await axios.get(testUrl, {
                    timeout: 10000,
                    validateStatus: () => true,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                const endWeb = Date.now();
                const webLatency = endWeb - startWeb;
                responseText += `\n\n🌐 *Website:* ${urlObj.hostname}`;
                responseText += `\n⚡ *Response Time:* ${webLatency}ms`;
                responseText += `\n📡 *Status:* ${response.status} ${response.statusText}`;
                responseText += `\n✅ *Reachable:* Yes`;
            }
            catch (error) {
                if (error.code === 'ENOTFOUND') {
                    responseText += `\n\n🌐 *Website:* ${url}`;
                    responseText += `\n❌ *Error:* Domain not found`;
                }
                else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                    responseText += `\n\n🌐 *Website:* ${url}`;
                    responseText += `\n❌ *Error:* Connection timeout`;
                }
                else if (error.message.includes('Invalid URL')) {
                    responseText += `\n\n❌ *Invalid URL format*`;
                    responseText += `\n💡 Example: .ping google.com`;
                }
                else {
                    responseText += `\n\n🌐 *Website:* ${url}`;
                    responseText += `\n❌ *Error:* ${error.message}`;
                }
            }
        }
        else {
            responseText += `\n\n💡 *Tip:* Use \`.ping <url>\` to test website response time`;
            responseText += `\n📝 *Example:* .ping google.com`;
        }
        await sock.sendMessage(chatId, {
            text: responseText,
            edit: sent.key,
            ...channelInfo
        });
    
      } catch (portErr) {
        console.error('[ported:pingweb] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pingweb: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "pweb": async (h) => module.exports["pingweb"](h),
  };
})());


Object.assign(module.exports, (() => {
  const CommandHandler = require('../lib_ported/commandHandler.js');
  // --- helper code from searchcmd.js ---
  /*****************************************************************************
 *  Henry Bots / Henry Config Tools                                          *
 *  Owner:                                              *
 *****************************************************************************/
  return {

    // ── .find ─── Find a command by keyword or description | usage: .find [keyword]
    "find": async (h) => {
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
        rawText: (h.config.prefix + 'find ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').toLowerCase();
        if (!query) {
            return await sock.sendMessage(chatId, { text: 'What are you looking for? Example: *.find status*' }, { quoted: message });
        }
        try {
            const allCommands = Array.from(CommandHandler.commands.values());
            const results = allCommands.filter(commandObject => {
                const nameMatch = commandObject.command?.toLowerCase().includes(query);
                const descMatch = commandObject.description?.toLowerCase().includes(query);
                const aliasMatch = commandObject.aliases?.some((a) => a.toLowerCase().includes(query));
                return nameMatch || descMatch || aliasMatch;
            });
            if (results.length === 0) {
                const suggestion = CommandHandler.findSuggestion(query);
                let failText = `❌ No commands found matching *"${query}"*`;
                if (suggestion)
                    failText += `\n\nDid you mean: *.${suggestion}*?`;
                return await sock.sendMessage(chatId, { text: failText }, { quoted: message });
            }
            let resultText = `🔍 *SEARCH RESULTS FOR:* "${query.toUpperCase()}"\n\n`;
            results.forEach((res, index) => {
                const status = CommandHandler.disabledCommands.has(res.command.toLowerCase()) ? '🔸' : '🔹';
                resultText += `${index + 1}. ${status} *.${res.command}*\n`;
                resultText += `📝 _${res.description || 'No description available.'}_\n`;
                if (res.aliases && res.aliases.length > 0) {
                    resultText += `🔗 Aliases: ${res.aliases.join(', ')}\n`;
                }
                resultText += `\n`;
            });
            resultText += `💡 _Tip: Use the prefix before the command name to run it._`;
            await sock.sendMessage(chatId, { text: resultText }, { quoted: message });
        }
        catch (error) {
            console.error('Search Error:', error);
            await sock.sendMessage(chatId, { text: '❌ An error occurred during the search.' });
        }
    
      } catch (portErr) {
        console.error('[ported:find] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .find: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "lookup": async (h) => module.exports["find"](h),
    "searchcmd": async (h) => module.exports["find"](h),
  };
})());


Object.assign(module.exports, (() => {
  const config = require('../config_ported.js');
  const CommandHandler = require('../lib_ported/commandHandler.js');
  const fs = require('fs');
  const path = require('path');
  // --- helper code from smartmenu.js ---
  const menuEmojis = ['✨', '🌟', '⭐', '💫', '🎯', '🎨', '🎪', '🎭'];
  const activeEmojis = ['✅', '🟢', '💚', '✔️', '☑️'];
  const disabledEmojis = ['❌', '🔴', '⛔', '🚫', '❎'];
  const fastEmojis = ['⚡', '🚀', '💨', '⏱️', '🔥'];
  const slowEmojis = ['🐢', '🐌', '⏳', '⌛', '🕐'];
  const categoryEmojis = {
      general: ['📱', '🔧', '⚙️', '🛠️'],
      owner: ['👑', '🔱', '💎', '🎖️'],
      admin: ['🛡️', '⚔️', '🔐', '👮'],
      group: ['👥', '👫', '🧑‍🤝‍🧑', '👨‍👩‍👧‍👦'],
      download: ['📥', '⬇️', '💾', '📦'],
      ai: ['🤖', '🧠', '💭', '🎯'],
      search: ['🔍', '🔎', '🕵️', '📡'],
      apks: ['📲', '📦', '💿', '🗂️'],
      info: ['ℹ️', '📋', '📊', '📄'],
      fun: ['🎮', '🎲', '🎰', '🎪'],
      stalk: ['👀', '🔭', '🕵️', '🎯'],
      games: ['🎮', '🕹️', '🎯', '🏆'],
      images: ['🖼️', '📸', '🎨', '🌄'],
      menu: ['📜', '📋', '📑', '📚'],
      tools: ['🔨', '🔧', '⚡', '🛠️'],
      stickers: ['🎭', '😀', '🎨', '🖼️'],
      quotes: ['💬', '📖', '✍️', '💭'],
      music: ['🎵', '🎶', '🎧', '🎤'],
      utility: ['📂', '🔧', '⚙️', '🛠️']
  };
  function getRandomEmoji(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
  }
  function getCategoryEmoji(category) {
      const emojis = categoryEmojis[category.toLowerCase()] || ['📂', '📁', '🗂️', '📋'];
      return getRandomEmoji(emojis);
  }
  function formatTime() {
      const now = new Date();
      const options = {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: config.timeZone || 'UTC'
      };
      return now.toLocaleTimeString('en-US', options);
  }
  return {

    // ── .smenu ─── Now just an alias for the unified .loadmenu / .menu ──────
    // ✅ MERGED: .smenu used to run its own separate "live status" menu with
    // a different look and no command descriptions. That's gone — .smenu,
    // .shelp, .smart, and .help2 all now show exactly the same styled menu
    // as .menu/.loadmenu, so there's one menu to maintain, not two.
    "smenu": async (h) => {
      const generalPlugin = require('./general.js');
      return generalPlugin.menu({
        sock: h.sock, from: h.from, msg: h.msg, config: h.config,
        isOwner: h.isOwner, isSubAdmin: h.isSubAdmin, isBotAdmin: h.isBotAdmin,
        args: h.args, senderJid: h.senderJid,
      });
    },
    "shelp": async (h) => module.exports["smenu"](h),
    "smart": async (h) => module.exports["smenu"](h),
    "help2": async (h) => module.exports["smenu"](h),
  };
})());


Object.assign(module.exports, (() => {
  const CommandHandler = require('../lib_ported/commandHandler.js');
  // --- helper code from stats.js ---
  /*****************************************************************************
 *  Henry Bots / Henry Config Tools                                          *
 *  Owner:                                              *
 *****************************************************************************/
  return {

    // ── .perf ─── View command performance and error metrics | usage: .perf
    "perf": async (h) => {
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
        rawText: (h.config.prefix + 'perf ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const report = CommandHandler.getDiagnostics();
            if (!report || report.length === 0) {
                return await sock.sendMessage(chatId, { text: '_No performance data collected yet._' }, { quoted: message });
            }
            let text = `📊 *PLUGINS PERFORMANCE*\n\n`;
            report.forEach((cmd, index) => {
                const errorText = cmd.errors > 0 ? `❗ Errors: ${cmd.errors}` : `✅ Smooth`;
                text += `${index + 1}. *${cmd.command.toUpperCase()}*\n`;
                text += `   ↳ Calls: ${cmd.usage}\n`;
                text += `   ↳ Latency: ${cmd.average_speed}\n`;
                text += `   ↳ Status: ${errorText}\n\n`;
            });
            await sock.sendMessage(chatId, {
                text: text.trim(),
                contextInfo: {}
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in perf command:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch performance metrics.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:perf] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .perf: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "metrics": async (h) => module.exports["perf"](h),
    "diagnostics": async (h) => module.exports["perf"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from uptime.js ---
  /*****************************************************************************
 *  Henry Bots / Henry Config Tools                                          *
 *  Owner:                                              *
 *****************************************************************************/
  return {

    // ── .uptime ─── Show bot status information | usage: .uptime
    "uptime": async (h) => {
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
        rawText: (h.config.prefix + 'uptime ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const commandHandler = (await import('../lib_ported/commandHandler.js')).default;
        const uptimeMs = process.uptime() * 1000;
        const formatUptime = (ms) => {
            const sec = Math.floor(ms / 1000) % 60;
            const min = Math.floor(ms / (1000 * 60)) % 60;
            const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
            const day = Math.floor(ms / (1000 * 60 * 60 * 24));
            const parts = [];
            if (day)
                parts.push(`${day}d`);
            if (hr)
                parts.push(`${hr}h`);
            if (min)
                parts.push(`${min}m`);
            parts.push(`${sec}s`);
            return parts.join(' ');
        };
        const startedAt = new Date(Date.now() - uptimeMs).toLocaleString();
        const ramMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const commandCount = commandHandler.commands.size;
        const text = `🤖 *${config.botName || 'Beast MD'} STATUS*\n\n` +
            `⏱ Uptime: ${formatUptime(uptimeMs)}\n` +
            `🚀 Started: ${startedAt}\n` +
            `📦 Plugins: ${commandCount}\n` +
            `💾 RAM: ${ramMb} MB`;
        await sock.sendMessage(chatId, { text });
    
      } catch (portErr) {
        console.error('[ported:uptime] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .uptime: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .viewonce ─── Re-send a view-once image or video. | usage: .viewonce (reply to a view-once media)
    "viewonce": async (h) => {
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
        rawText: (h.config.prefix + 'viewonce ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedImage = quoted?.imageMessage;
            const quotedVideo = quoted?.videoMessage;
            if (quotedImage && quotedImage.viewOnce) {
                const stream = await downloadContentFromMessage(quotedImage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream)
                    buffer = Buffer.concat([buffer, chunk]);
                await sock.sendMessage(chatId, {
                    image: buffer,
                    fileName: 'media.jpg',
                    caption: quotedImage.caption || ''
                }, { quoted: message });
            }
            else if (quotedVideo && quotedVideo.viewOnce) {
                const stream = await downloadContentFromMessage(quotedVideo, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream)
                    buffer = Buffer.concat([buffer, chunk]);
                await sock.sendMessage(chatId, {
                    video: buffer,
                    fileName: 'media.mp4',
                    caption: quotedVideo.caption || ''
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: '*Please reply to a view-once image or video.*'
                }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Error in viewonceCommand:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to retrieve the view-once media. Please try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:viewonce] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .viewonce: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "viewmedia": async (h) => module.exports["viewonce"](h),
  };
})());

