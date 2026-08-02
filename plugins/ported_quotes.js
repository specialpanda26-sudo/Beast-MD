// Beast MD ported module (category: quotes)
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


  return {

    // ── .goodnight ─── Send a random good night message | usage: .goodnight
    "goodnight": async (h) => {
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
        rawText: (h.config.prefix + 'goodnight ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const shizokeys = 'shizo';
            const res = await fetch(`https://shizoapi.onrender.com/api/texts/lovenight?apikey=${shizokeys}`);
            if (!res.ok) {
                throw new Error(await res.text());
            }
            const json = await res.json();
            const goodnightMessage = json.result;
            await sock.sendMessage(chatId, { text: goodnightMessage }, { quoted: message });
        }
        catch (error) {
            console.error('Goodnight plugin error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to get goodnight message. Please try again later!' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:goodnight] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .goodnight: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gn": async (h) => module.exports["goodnight"](h),
    "night": async (h) => module.exports["goodnight"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .quote ─── Get a random quote | usage: .quote
    "quote": async (h) => {
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
        rawText: (h.config.prefix + 'quote ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const apiKey = 'shizo';
            const res = await fetch(`https://shizoapi.onrender.com/api/texts/quotes?apikey=${apiKey}`);
            if (!res.ok)
                throw await res.text();
            const json = await res.json();
            const quoteMessage = json.result;
            await sock.sendMessage(chatId, { text: quoteMessage }, { quoted: message });
        }
        catch (error) {
            console.error('Quote Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to get quote. Please try again later!'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:quote] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .quote: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "quotes": async (h) => module.exports["quote"](h),
    "quotetext": async (h) => module.exports["quote"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .quote2 ─── Get a random inspirational quote | usage: .quote2
    "quote2": async (h) => {
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
        rawText: (h.config.prefix + 'quote2 ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://discardapi.dpdns.org/api/quotes/random?apikey=guru');
            if (!res.data || res.data.status !== true) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch quote.' }, { quoted: message });
            }
            const quote = res.data.result?.quote || 'No quote found.';
            const _creator = res.data.creator || 'Unknown';
            const replyText = `💬 *Random Quote*\n\n${quote}`;
            await sock.sendMessage(chatId, { text: replyText }, { quoted: message });
        }
        catch (err) {
            console.error('Quote plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching quote.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:quote2] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .quote2: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "quotes2": async (h) => module.exports["quote2"](h),
    "randomquote": async (h) => module.exports["quote2"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .roseday ─── Get a random Rose Day message/quote | usage: .roseday
    "roseday": async (h) => {
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
        rawText: (h.config.prefix + 'roseday ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await fetch(`https://api.princetechn.com/api/fun/roseday?apikey=prince`);
            if (!res.ok) {
                throw await res.text();
            }
            const json = await res.json();
            const rosedayMessage = json.result;
            await sock.sendMessage(chatId, { text: rosedayMessage }, { quoted: message });
        }
        catch (error) {
            console.error('RoseDay Command Error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to get Rose Day quote. Please try again later!' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:roseday] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .roseday: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "rose": async (h) => module.exports["roseday"](h),
    "rosequote": async (h) => module.exports["roseday"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .shayari ─── Get a random shayari | usage: .shayari
    "shayari": async (h) => {
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
        rawText: (h.config.prefix + 'shayari ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const response = await fetch('https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo');
            const data = await response.json();
            if (!data || !data.result) {
                throw new Error('Invalid response from API');
            }
            const buttons = [
                { buttonId: '.shayari', buttonText: { displayText: 'Shayari 🪄' }, type: 1 },
                { buttonId: '.roseday', buttonText: { displayText: '🌹 RoseDay' }, type: 1 }
            ];
            await sock.sendMessage(chatId, {
                text: data.result,
                buttons,
                headerType: 1
            }, { quoted: message });
        }
        catch (error) {
            console.error('Shayari Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch shayari. Please try again later.',
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:shayari] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .shayari: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "poetry": async (h) => module.exports["shayari"](h),
    "shayar": async (h) => module.exports["shayari"](h),
  };
})());

