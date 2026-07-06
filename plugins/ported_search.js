// AUTO-PORTED from friend's MEGA-MD bot (category: search)
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

    // ── .element ─── Get information about a chemical element | usage: .element <name or symbol>
    "element": async (h) => {
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
        rawText: (h.config.prefix + 'element ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args?.join(' ')?.trim();
        if (!query) {
            return await sock.sendMessage(chatId, { text: '*Provide element name or symbol.*\nExample: .element H' }, { quoted: message });
        }
        try {
            const { data: json } = await axios.get(`https://api.popcat.xyz/periodic-table?element=${encodeURIComponent(query)}`);
            if (!json?.name) {
                return await sock.sendMessage(chatId, { text: '❌ Element not found.' }, { quoted: message });
            }
            const text = `🧪 *Element Info*\n` +
                `• Name: ${json.name}\n` +
                `• Symbol: ${json.symbol}\n` +
                `• Atomic #: ${json.atomic_number}\n` +
                `• Atomic Mass: ${json.atomic_mass}\n` +
                `• Period: ${json.period}\n` +
                `• Phase: ${json.phase}\n` +
                `• Discovered By: ${json.discovered_by || 'Unknown'}\n\n` +
                `📘 Summary:\n${json.summary}`;
            await sock.sendMessage(chatId, { image: { url: json.image }, caption: text }, { quoted: message });
        }
        catch (error) {
            console.error('Element plugin error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch element info.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:element] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .element: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "atom": async (h) => module.exports["element"](h),
    "periodictable": async (h) => module.exports["element"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from iplookup.js ---
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

    // ── .whoisip ─── Get location info from an IP or Domain | usage: .ip <address/domain>
    "whoisip": async (h) => {
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
        rawText: (h.config.prefix + 'whoisip ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args[0];
        if (!query)
            return await sock.sendMessage(chatId, { text: 'Enter an IP or Domain (e.g., google.com).' });
        try {
            const res = await axios.get(`http://ip-api.com/json/${query}?fields=status,message,country,regionName,city,zip,isp,org,as,query`);
            const data = res.data;
            if (data.status === 'fail')
                return await sock.sendMessage(chatId, { text: `❌ Error: ${data.message}` });
            const info = `
🌐 *IP/Domain Lookup*
---
📍 *Target:* ${data.query}
🌍 *Country:* ${data.country}
🏙️ *City/Region:* ${data.city}, ${data.regionName}
📮 *Zip:* ${data.zip}
📡 *ISP:* ${data.isp}
🏢 *Organization:* ${data.org}
      `.trim();
            await sock.sendMessage(chatId, { text: info }, { quoted: message });
        }
        catch (err) {
            await sock.sendMessage(chatId, { text: '❌ Network error.' });
        }
    
      } catch (portErr) {
        console.error('[ported:whoisip] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .whoisip: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ip": async (h) => module.exports["whoisip"](h),
    "iplookup": async (h) => module.exports["whoisip"](h),
  };
})());


Object.assign(module.exports, (() => {
  const pkg = require('api-qasim');
  const { channelInfo } = require('../lib_ported/messageConfig.js');
  // --- helper code from wattpad.js ---
  const QasimAny = pkg;
  return {

    // ── .wattpad ─── Search for stories on Wattpad! | usage: .wattpad <query>
    "wattpad": async (h) => {
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
        rawText: (h.config.prefix + 'wattpad ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a query (e.g., story title, author, or tag).*' +
                    `\nExample: .wattpad The Hunger Games`,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            const results = await QasimAny.wattpad(query);
            if (!Array.isArray(results) || results.length === 0) {
                throw new Error('No results found for your query.');
            }
            const formattedResults = results.slice(0, 9).map((story, index) => {
                const title = story.judul || 'No title available';
                const reads = story.dibaca || 'No reads available';
                const votes = story.divote || 'No votes available';
                const thumb = story.thumb || '';
                const link = story.link || 'No link available';
                return `${index + 1}. *${title}*\n*Reads*: ${reads}\n*Votes*: ${votes}\nRead more: ${link}${thumb ? `\n${thumb}` : ''}`;
            }).join('\n\n');
            await sock.sendMessage(chatId, {
                text: `*Search Results For "${query}":*\n\n${formattedResults}`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ An error occurred: ${error.message || error}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:wattpad] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .wattpad: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "wattpadsearch": async (h) => module.exports["wattpad"](h),
    "searchwattpad": async (h) => module.exports["wattpad"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const { channelInfo } = require('../lib_ported/messageConfig.js');

  return {

    // ── .wiki ─── Search Wikipedia for a topic! | usage: .wiki <query>
    "wiki": async (h) => {
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
        rawText: (h.config.prefix + 'wiki ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(chatId, {
                text: "*Enter what you want to search for on Wikipedia.*\nExample: .wiki Pakistan",
                ...channelInfo
            }, { quoted: message });
        }
        const formattedQuery = query.replace(/ /g, "_");
        try {
            const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedQuery)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MEGA-BOT/1.0',
                    'Accept-Language': 'en'
                }
            });
            const data = res.data;
            if (data.extract) {
                await sock.sendMessage(chatId, {
                    text: `▢ *Wikipedia*\n\n‣ Search: ${data.title}\n\n${data.extract}\n\nRead more: ${data.content_urls.desktop.page}`,
                    ...channelInfo
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: "⚠️ No results found.",
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (e) {
            console.error('Wikipedia plugin error:', e.message || e);
            await sock.sendMessage(chatId, {
                text: "⚠️ No results found or Wikipedia blocked the request.",
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:wiki] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .wiki: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "wikipedia": async (h) => module.exports["wiki"](h),
  };
})());

