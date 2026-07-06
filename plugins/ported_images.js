// AUTO-PORTED from friend's MEGA-MD bot (category: images)
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

  return {

    // ── .coding ─── Get a random programming image | usage: .coding
    "coding": async (h) => {
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
        rawText: (h.config.prefix + 'coding ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/coding.json');
            if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
            }
            const randomImage = res.data[Math.floor(Math.random() * res.data.length)];
            await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '💻 Programming Image' }, { quoted: message });
        }
        catch (err) {
            console.error('Programming image plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:coding] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .coding: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "codingimg": async (h) => module.exports["coding"](h),
    "programming": async (h) => module.exports["coding"](h),
    "programmingimg": async (h) => module.exports["coding"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .cyberimg ─── Get a random cyberspace image | usage: .cyberimg
    "cyberimg": async (h) => {
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
        rawText: (h.config.prefix + 'cyberimg ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/cyberspace.json');
            if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
            }
            const randomImage = res.data[Math.floor(Math.random() * res.data.length)];
            await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '🌐 Cyberspace Image' }, { quoted: message });
        }
        catch (err) {
            console.error('Cyberspace image plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:cyberimg] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .cyberimg: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "cyber": async (h) => module.exports["cyberimg"](h),
    "cyberspace": async (h) => module.exports["cyberimg"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .game ─── Get a random gaming image | usage: .game
    "game": async (h) => {
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
        rawText: (h.config.prefix + 'game ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/game.json');
            if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
            }
            const randomImage = res.data[Math.floor(Math.random() * res.data.length)];
            await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '🎮 Gaming Image' }, { quoted: message });
        }
        catch (err) {
            console.error('Game image plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:game] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .game: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gaming": async (h) => module.exports["game"](h),
    "gameimg": async (h) => module.exports["game"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .islamic ─── Get a random Islamic image | usage: .islamic
    "islamic": async (h) => {
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
        rawText: (h.config.prefix + 'islamic ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/islamic.json');
            if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
            }
            const randomImage = res.data[Math.floor(Math.random() * res.data.length)];
            await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '🕌 Islamic Image' }, { quoted: message });
        }
        catch (err) {
            console.error('Islamic image plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:islamic] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .islamic: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "islampic": async (h) => module.exports["islamic"](h),
    "muslimpic": async (h) => module.exports["islamic"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .mountain ─── Get a random mountain image | usage: .mountain
    "mountain": async (h) => {
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
        rawText: (h.config.prefix + 'mountain ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/mountain.json');
            if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
            }
            const randomImage = res.data[Math.floor(Math.random() * res.data.length)];
            await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '🏔️ Mountain Image' }, { quoted: message });
        }
        catch (err) {
            console.error('Mountain image plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:mountain] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .mountain: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "mountains": async (h) => module.exports["mountain"](h),
    "mountainimg": async (h) => module.exports["mountain"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from pies.js ---
  const BASE = 'https://shizoapi.onrender.com/api/pies';
  const VALID_COUNTRIES = ['china', 'indonesia', 'japan', 'korea', 'hijab'];
  async function fetchPiesImageBuffer(country) {
      const url = `${BASE}/${country}?apikey=shizo`;
      const res = await fetch(url);
      if (!res.ok)
          throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('image'))
          throw new Error('API did not return an image');
      return res.arrayBuffer().then(b => Buffer.from(b));
  }
  return {

    // ── .pies ─── Get a pies image from a specific country
    "pies": async (h) => {
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
        rawText: (h.config.prefix + 'pies ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const sub = (args[0] || '').toLowerCase();
        if (!sub) {
            await sock.sendMessage(chatId, {
                text: `Usage: .pies <country>\nCountries: ${VALID_COUNTRIES.join(', ')}`
            }, { quoted: message });
            return;
        }
        if (!VALID_COUNTRIES.includes(sub)) {
            await sock.sendMessage(chatId, {
                text: `Unsupported country: ${sub}. Try one of: ${VALID_COUNTRIES.join(', ')}`
            }, { quoted: message });
            return;
        }
        try {
            const imageBuffer = await fetchPiesImageBuffer(sub);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🍰 pies: ${sub}`
            }, { quoted: message });
        }
        catch (err) {
            console.error('Pies Command Error:', err);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch image. Please try again.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:pies] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pies: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "pie": async (h) => module.exports["pies"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .tech ─── Get a random tech image | usage: .tech
    "tech": async (h) => {
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
        rawText: (h.config.prefix + 'tech ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/tech.json');
            if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
            }
            const randomImage = res.data[Math.floor(Math.random() * res.data.length)];
            await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '💻 Tech Image' }, { quoted: message });
        }
        catch (err) {
            console.error('Tech image plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:tech] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tech: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "technology": async (h) => module.exports["tech"](h),
    "techimg": async (h) => module.exports["tech"](h),
  };
})());

