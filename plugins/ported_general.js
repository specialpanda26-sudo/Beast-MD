// AUTO-PORTED from friend's MEGA-MD bot (category: general)
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
                contextInfo: {
                    }
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

    // ── .pair ─── Get session id for the bot | usage: .pair 92305395XXXX
    "pair": async (h) => {
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
        rawText: (h.config.prefix + 'pair ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        const forwardInfo = {
            };
        const query = args.join('').trim();
        if (!query) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Missing Number*\nExample: .pair 92305395XXXX",
                contextInfo: forwardInfo
            }, { quoted: message });
        }
        const number = query.replace(/[^0-9]/g, '');
        if (number.length < 10 || number.length > 15) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Invalid Format*\nPlease provide the number with country code but without + or spaces.",
                contextInfo: forwardInfo
            }, { quoted: message });
        }
        await sock.sendMessage(chatId, {
            text: "⚡ *Requesting code from server...*",
            contextInfo: forwardInfo
        }, { quoted: message });
        try {
            const response = await axios.get(`https://mega-pairing.onrender.com/pair?number=${number}`, {
                timeout: 60000
            });
            if (response.data && response.data.code) {
                const pairingCode = response.data.code;
                if (pairingCode.includes("Unavailable") || pairingCode.includes("Error")) {
                    throw new Error("Server is busy");
                }
                const successText = `✅ *${config.botName || 'Henry Ochibots v19'} PAIRING CODE*\n\n` +
                    `Code: *${pairingCode}*\n\n` +
                    `*How to use:*\n` +
                    `1. Open WhatsApp Settings\n` +
                    `2. Tap 'Linked Devices'\n` +
                    `3. Tap 'Link a Device'\n` +
                    `4. Select 'Link with phone number instead'\n` +
                    `5. Enter the code above.`;
                await sock.sendMessage(chatId, {
                    text: successText,
                    contextInfo: forwardInfo
                }, { quoted: message });
            }
            else {
                throw new Error("Invalid response format");
            }
        }
        catch (error) {
            console.error('Pairing Plugin Error:', error.message);
            let errorMsg = "❌ *Pairing Failed*\nReason: ";
            if (error.code === 'ECONNABORTED') {
                errorMsg += "Server timeout. Please try again in 1 minute.";
            }
            else if (error.response?.status === 400) {
                errorMsg += "Invalid phone number format.";
            }
            else {
                errorMsg += "The server is currently offline or busy. Try again later.";
            }
            await sock.sendMessage(chatId, {
                text: errorMsg,
                contextInfo: forwardInfo
            }, { quoted: message });
        }
    
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
 *  Owner: Henry (henrytech254)                                              *
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

    // ── .smenu ─── Interactive smart menu with live status | usage: .smenu
    "smenu": async (h) => {
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
        rawText: (h.config.prefix + 'smenu ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const imagePath = path.join(process.cwd(), 'assets/thumb.png');
            const thumbnail = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;
            const categories = Array.from(CommandHandler.categories.keys());
            const stats = CommandHandler.getDiagnostics();
            const menuEmoji = getRandomEmoji(menuEmojis);
            const activeEmoji = getRandomEmoji(activeEmojis);
            const disabledEmoji = getRandomEmoji(disabledEmojis);
            const fastEmoji = getRandomEmoji(fastEmojis);
            const slowEmoji = getRandomEmoji(slowEmojis);
            let menuText = `${menuEmoji} *${config.botName || 'Henry Ochibots v19'}* ${menuEmoji}\n\n`;
            menuText += `┏━━━━━━━━━━━━━━━━┓\n`;
            menuText += `┃ 📱 *Bot:* ${config.botName || 'Henry Ochibots v19'}\n`;
            menuText += `┃ 🔖 *Version:* ${config.version || '6.0.0'}\n`;
            menuText += `┃ 👤 *Owner:* ${config.botOwner || 'Unknown'}\n`;
            menuText += `┃ ⏰ *Time:* ${formatTime()}\n`;
            menuText += `┃ ℹ️ *Prefix:* ${config.prefixes ? config.prefixes.join(', ') : '.'}\n`;
            menuText += `┃ 📊 *Plugins:* ${CommandHandler.commands.size}\n`;
            menuText += `┗━━━━━━━━━━━━━━━━┛\n\n`;
            const topCmds = stats.slice(0, 3).filter(s => s.usage > 0);
            if (topCmds.length > 0) {
                menuText += `🔥 *TOP COMMANDS:*\n`;
                topCmds.forEach((c, i) => {
                    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                    menuText += `${rank} .${c.command} • ${c.usage} uses\n`;
                });
                menuText += `\n`;
            }
            for (const cat of categories) {
                const catEmoji = getCategoryEmoji(cat);
                menuText += `${catEmoji} *${cat.toUpperCase()}*\n`;
                menuText += `┌─────────────────\n`;
                const catCmds = CommandHandler.getCommandsByCategory(cat);
                catCmds.forEach((cmdName, index) => {
                    const isLast = index === catCmds.length - 1;
                    const prefix = isLast ? '└' : '├';
                    const isOff = CommandHandler.disabledCommands.has(cmdName.toLowerCase());
                    const cmdStats = stats.find(s => s.command === cmdName.toLowerCase());
                    const statusIcon = isOff ? disabledEmoji : activeEmoji;
                    let speedTag = '';
                    if (cmdStats && !isOff) {
                        const ms = parseFloat(cmdStats.average_speed);
                        if (ms > 0 && ms < 100)
                            speedTag = ` ${fastEmoji}`;
                        else if (ms > 1000)
                            speedTag = ` ${slowEmoji}`;
                    }
                    menuText += `${prefix}─ ${statusIcon} .${cmdName}${speedTag}\n`;
                });
                menuText += `\n`;
            }
            menuText += `┌────────────────\n`;
            menuText += `├  💡 *LEGEND*\n`;
            menuText += `├─ ${activeEmoji} Active Command\n`;
            menuText += `├─ ${disabledEmoji} Disabled Command\n`;
            menuText += `├─ ${fastEmoji} Fast Response\n`;
            menuText += `├─ ${slowEmoji} Slow Response\n`;
            menuText += `⁠└────────────────`;
            const contextInfo = {
                };
            const messageOptions = thumbnail
                ? { image: thumbnail, caption: menuText, contextInfo }
                : { text: menuText, contextInfo };
            await sock.sendMessage(chatId, messageOptions, { quoted: message });
        }
        catch (error) {
            console.error('Menu Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ *Menu Error*\n\n${error.message}`
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:smenu] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .smenu: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
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
 *  Owner: Henry (henrytech254)                                              *
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
                contextInfo: {
                    }
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
 *  Owner: Henry (henrytech254)                                              *
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
        const text = `🤖 *${config.botName || 'Henry Ochibots v19'} STATUS*\n\n` +
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

