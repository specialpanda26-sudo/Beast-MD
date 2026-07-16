// Beast MD ported module (category: info)
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
  const moment = require('moment-timezone');
  const fs = require('fs');
  const path = require('path');

  return {

    // ── .script ─── Get information about this bot's GitHub repository | usage: .script
    "script": async (h) => {
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
        rawText: (h.config.prefix + 'script ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await fetch('https://api.github.com/repos/specialpanda26-sudo/Beast-MD');
            if (!res.ok)
                throw new Error('Error fetching repository data');
            const json = await res.json();
            let txt = `*乂  MEGA MDX  乂*\n\n`;
            txt += `✩  *Name* : ${json.name}\n`;
            txt += `✩  *Watchers* : ${json.watchers_count}\n`;
            txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
            txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
            txt += `✩  *URL* : ${json.html_url}\n`;
            txt += `✩  *Forks* : ${json.forks_count}\n`;
            txt += `✩  *Stars* : ${json.stargazers_count}\n\n`;
            txt += `💥 *MEGA MD*`;
            const imgPath = path.join(process.cwd(), 'assets/thumb.png');
            const imgBuffer = fs.readFileSync(imgPath);
            await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
        }
        catch (error) {
            console.error('Error in github command:', error);
            await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:script] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .script: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "repo": async (h) => module.exports["script"](h),
    "sc": async (h) => module.exports["script"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .imdb ─── Get detailed information about a movie or series from IMDB | usage: .imdb <movie/series title>
    "imdb": async (h) => {
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
        rawText: (h.config.prefix + 'imdb ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ').trim();
        if (!text) {
            await sock.sendMessage(chatId, {
                text: '*Please provide a movie or series title.*\nExample: `.imdb Inception`',
                quoted: message
            });
            return;
        }
        try {
            const res = await fetch(`https://api.popcat.xyz/imdb?q=${encodeURIComponent(text)}`);
            if (!res.ok)
                throw new Error(`API request failed with status ${res.status}`);
            const json = await res.json();
            const ratings = (json.ratings || [])
                .map((r) => `⭐ *${r.source}:* ${r.value}`)
                .join('\n') || 'No ratings available';
            const movieInfo = `
🎬 *${json.title || 'N/A'}* (${json.year || 'N/A'})
🎭 *Genres:* ${json.genres || 'N/A'}
📺 *Type:* ${json.type || 'N/A'}
📝 *Plot:* ${json.plot || 'N/A'}
⭐ *IMDB Rating:* ${json.rating || 'N/A'} (${json.votes || 'N/A'} votes)
🏆 *Awards:* ${json.awards || 'N/A'}
🎬 *Director:* ${json.director || 'N/A'}
✍️ *Writer:* ${json.writer || 'N/A'}
👨‍👩‍👧‍👦 *Actors:* ${json.actors || 'N/A'}
⏱️ *Runtime:* ${json.runtime || 'N/A'}
📅 *Released:* ${json.released || 'N/A'}
🌐 *Country:* ${json.country || 'N/A'}
🗣️ *Languages:* ${json.languages || 'N/A'}
💰 *Box Office:* ${json.boxoffice || 'N/A'}
💽 *DVD Release:* ${json.dvd || 'N/A'}
🏢 *Production:* ${json.production || 'N/A'}
🔗 *Website:* ${json.website || 'N/A'}

*Ratings:*
${ratings}
      `.trim();
            if (json.poster) {
                await sock.sendMessage(chatId, {
                    image: { url: json.poster },
                    caption: movieInfo,
                    quoted: message
                });
            }
            else {
                await sock.sendMessage(chatId, { text: movieInfo, quoted: message });
            }
        }
        catch (error) {
            console.error('IMDB Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch movie information. Please try again later.',
                quoted: message
            });
        }
    
      } catch (portErr) {
        console.error('[ported:imdb] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .imdb: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "film": async (h) => module.exports["imdb"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .itunes ─── Get detailed information about a song from iTunes | usage: .itunes <song name>
    "itunes": async (h) => {
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
        rawText: (h.config.prefix + 'itunes ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ').trim();
        if (!text) {
            await sock.sendMessage(chatId, {
                text: '*Please provide a song name.*\nExample: `.itunes Blinding Lights`',
                quoted: message
            });
            return;
        }
        try {
            const url = `https://api.popcat.xyz/itunes?q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`API request failed with status ${res.status}`);
            const json = await res.json();
            const songInfo = `
🎵 *${json.name || 'N/A'}*
👤 *Artist:* ${json.artist || 'N/A'}
💿 *Album:* ${json.album || 'N/A'}
📅 *Release Date:* ${json.release_date || 'N/A'}
💰 *Price:* ${json.price || 'N/A'}
⏱️ *Length:* ${json.length || 'N/A'}
🎼 *Genre:* ${json.genre || 'N/A'}
🔗 *URL:* ${json.url || 'N/A'}
      `.trim();
            if (json.thumbnail) {
                await sock.sendMessage(chatId, {
                    image: { url: json.thumbnail },
                    caption: songInfo,
                    quoted: message
                });
            }
            else {
                await sock.sendMessage(chatId, { text: songInfo, quoted: message });
            }
        }
        catch (error) {
            console.error('iTunes Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ An error occurred while fetching the song info. Please try again later.',
                quoted: message
            });
        }
    
      } catch (portErr) {
        console.error('[ported:itunes] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .itunes: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "music": async (h) => module.exports["itunes"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .medicine ─── Get medicine/drug info: uses, side effects, warnings | usage: .medicine aspirin\n.medicine paracetamol
    "medicine": async (h) => {
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
        rawText: (h.config.prefix + 'medicine ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `💊 *Medicine Info*\n\n` +
                    `*Usage:* \`.medicine <name>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.medicine aspirin\`\n` +
                    `• \`.medicine paracetamol\`\n` +
                    `• \`.medicine amoxicillin\`\n` +
                    `• \`.medicine ibuprofen\`\n` +
                    `• \`.medicine metformin\`\n\n` +
                    `⚠️ _Information is from FDA database. Always consult a doctor._`,
                ...channelInfo
            }, { quoted: message });
        }
        await sock.sendMessage(chatId, { text: `🔍 Looking up *${query}*...`, ...channelInfo }, { quoted: message });
        try {
            const res = await axios.get(`https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`, { timeout: 15000 });
            const result = res.data.results?.[0];
            if (!result) {
                return await sock.sendMessage(chatId, {
                    text: `❌ No information found for: *${query}*\n\nTry the generic name (e.g. paracetamol instead of Panadol)`,
                    ...channelInfo
                }, { quoted: message });
            }
            const openfda = result.openfda || {};
            const brandName = openfda.brand_name?.[0] || query;
            const genericName = openfda.generic_name?.[0] || 'N/A';
            const manufacturer = openfda.manufacturer_name?.[0] || 'N/A';
            const route = openfda.route?.[0] || 'N/A';
            const substanceName = openfda.substance_name?.[0] || 'N/A';
            const clean = (text, maxLen = 400) => {
                if (!text)
                    return 'N/A';
                const str = Array.isArray(text) ? text[0] : text;
                const cleaned = str.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                return cleaned.length > maxLen ? `${cleaned.substring(0, maxLen) }...` : cleaned;
            };
            const purpose = clean(result.purpose, 300);
            const indications = clean(result.indications_and_usage, 400);
            const warnings = clean(result.warnings, 400);
            const sideEffects = clean(result.adverse_reactions, 400);
            const dosage = clean(result.dosage_and_administration, 300);
            const storage = clean(result.storage_and_handling, 200);
            let text = `💊 *${brandName}*\n`;
            if (genericName !== 'N/A')
                text += `_(${genericName})_\n`;
            text += `\n`;
            if (substanceName !== 'N/A')
                text += `🧪 *Active Substance:* ${substanceName}\n`;
            text += `🏭 *Manufacturer:* ${manufacturer}\n`;
            text += `💉 *Route:* ${route}\n\n`;
            if (purpose !== 'N/A')
                text += `🎯 *Purpose:*\n${purpose}\n\n`;
            if (indications !== 'N/A')
                text += `✅ *Uses:*\n${indications}\n\n`;
            if (dosage !== 'N/A')
                text += `📏 *Dosage:*\n${dosage}\n\n`;
            if (warnings !== 'N/A')
                text += `⚠️ *Warnings:*\n${warnings}\n\n`;
            if (sideEffects !== 'N/A')
                text += `🔴 *Side Effects:*\n${sideEffects}\n\n`;
            if (storage !== 'N/A')
                text += `📦 *Storage:* ${storage}\n\n`;
            text += `⚕️ _Always consult a qualified doctor before taking any medication._`;
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
        catch (error) {
            if (error.response?.status === 404) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Medicine not found: *${query}*\n\nTry using the generic/scientific name.`,
                    ...channelInfo
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:medicine] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .medicine: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "drug": async (h) => module.exports["medicine"](h),
    "medinfo": async (h) => module.exports["medicine"](h),
    "druginfo": async (h) => module.exports["medicine"](h),
    "med": async (h) => module.exports["medicine"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from momo.js ---
  const MOMO_DATA = {
      mtn: {
          name: 'MTN Mobile Money (MoMo)',
          countries: ['Ghana 🇬🇭', 'Uganda 🇺🇬', 'Rwanda 🇷🇼', 'Cameroon 🇨🇲', 'Ivory Coast 🇨🇮',
              'Zambia 🇿🇲', 'Benin 🇧🇯', 'South Africa 🇿🇦', 'Nigeria 🇳🇬', 'Congo 🇨🇬'],
          ussd: {
              'Ghana': '*170#',
              'Uganda': '*165#',
              'Rwanda': '*182#',
              'Cameroon': '*126#',
              'Nigeria': '*671#',
              'Zambia': '*303#',
          },
          shortcodes: {
              'Ghana': '1-300',
              'Uganda': '165',
              'Rwanda': '182',
          },
          features: [
              'Send & receive money',
              'Buy airtime & data',
              'Pay bills (electricity, water, TV)',
              'Bank transfers',
              'International transfers',
              'Merchant payments',
              'Savings & loans',
              'Insurance',
          ],
          website: 'mtn.com/momo',
          helpline: {
              'Ghana': '100',
              'Uganda': '100',
              'Rwanda': '100',
              'Nigeria': '180',
          }
      },
      airtel: {
          name: 'Airtel Money',
          countries: ['Kenya 🇰🇪', 'Tanzania 🇹🇿', 'Uganda 🇺🇬', 'Rwanda 🇷🇼', 'Zambia 🇿🇲',
              'Malawi 🇲🇼', 'Madagascar 🇲🇬', 'Niger 🇳🇪', 'Congo DR 🇨🇩', 'Seychelles 🇸🇨'],
          ussd: {
              'Kenya': '*334#',
              'Tanzania': '*150*60#',
              'Uganda': '*185#',
              'Rwanda': '*171#',
              'Zambia': '*778#',
              'Malawi': '*121#',
          },
          shortcodes: {
              'Kenya': '334',
              'Tanzania': '150',
              'Uganda': '185',
          },
          features: [
              'Send & receive money',
              'Buy airtime & data',
              'Pay bills',
              'Bank to Airtel Money',
              'Airtel Money to bank',
              'International remittance',
              'Merchant payments',
          ],
          website: 'airtel.com/airtelmoney',
          helpline: {
              'Kenya': '100',
              'Tanzania': '100',
              'Uganda': '100',
          }
      },
      mpesa: {
          name: 'M-Pesa',
          countries: ['Kenya 🇰🇪', 'Tanzania 🇹🇿', 'Mozambique 🇲🇿', 'DRC 🇨🇩',
              'Lesotho 🇱🇸', 'Ghana 🇬🇭', 'Egypt 🇪🇬', 'Ethiopia 🇪🇹'],
          ussd: {
              'Kenya': '*334# or *737#',
              'Tanzania': '*150*00#',
              'Mozambique': '*150*5#',
              'Ghana': '*500#',
              'Egypt': '*9#',
          },
          shortcodes: {
              'Kenya': '737 / 334',
              'Tanzania': '150',
          },
          features: [
              'Send money (Lipa na M-Pesa)',
              'Withdraw at agents',
              'Buy airtime',
              'Pay bills & merchants',
              'M-Shwari savings & loans',
              'KCB M-Pesa loans',
              'International transfers (WorldRemit, Western Union)',
              'Pay with QR code',
              'M-Pesa App',
          ],
          website: 'safaricom.co.ke/mpesa',
          helpline: {
              'Kenya': '234',
              'Tanzania': '100',
          }
      },
      orange: {
          name: 'Orange Money',
          countries: ['Senegal 🇸🇳', 'Mali 🇲🇱', 'Cameroon 🇨🇲', 'Ivory Coast 🇨🇮',
              'Burkina Faso 🇧🇫', 'Guinea 🇬🇳', 'Madagascar 🇲🇬', 'Tunisia 🇹🇳'],
          ussd: {
              'Senegal': '#144#',
              'Mali': '#144#',
              'Cameroon': '#150#',
              'Ivory Coast': '#144#',
          },
          shortcodes: { 'Senegal': '144' },
          features: [
              'Send & receive money',
              'Buy airtime',
              'Pay bills',
              'Orange Bank transfers',
              'International transfers',
          ],
          website: 'orange.com/orangemoney',
          helpline: { 'Senegal': '888', 'Mali': '888' }
      },
      wave: {
          name: 'Wave Mobile Money',
          countries: ['Senegal 🇸🇳', 'Ivory Coast 🇨🇮', 'Mali 🇲🇱', 'Burkina Faso 🇧🇫',
              'Guinea 🇬🇳', 'Uganda 🇺🇬', 'Gambia 🇬🇲'],
          ussd: {
              'Senegal': '*999#',
              'Ivory Coast': '*999#',
          },
          shortcodes: {},
          features: [
              'Zero fees on transfers (between Wave users)',
              'Send & receive money',
              'Pay merchants',
              'Buy airtime',
              'Cash in/out at agents',
              'Wave App (iOS & Android)',
          ],
          website: 'wave.com',
          helpline: { 'Senegal': '33 889 05 55' }
      },
  };
  return {

    // ── .momo ─── Mobile Money info for African networks (MTN, Airtel, M-Pesa, Wave, Orange) | usage: .momo mtn\n.momo mpesa\n.momo airtel
    "momo": async (h) => {
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
        rawText: (h.config.prefix + 'momo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo, userMessage } = context;
        // Detect from command used
        let query = args[0]?.toLowerCase() || '';
        if (userMessage.includes('mpesa'))
            query = 'mpesa';
        else if (userMessage.includes('airtelmoney'))
            query = 'airtel';
        else if (userMessage.includes('mtnmomo'))
            query = 'mtn';
        else if (userMessage.includes('wave'))
            query = 'wave';
        if (!query) {
            const list = Object.entries(MOMO_DATA).map(([k, v]) => `• \`.momo ${k}\` — ${v.name}`).join('\n');
            return await sock.sendMessage(chatId, {
                text: `📡 *Mobile Money Info*\n\n` +
                    `*Available networks:*\n${list}\n\n` +
                    `*Examples:*\n` +
                    `\`.momo mtn\`\n` +
                    `\`.momo mpesa\`\n` +
                    `\`.momo airtel\``,
                ...channelInfo
            }, { quoted: message });
        }
        // Fuzzy match
        const key = Object.keys(MOMO_DATA).find(k => query.includes(k) || k.includes(query) ||
            MOMO_DATA[k].name.toLowerCase().includes(query));
        if (!key) {
            return await sock.sendMessage(chatId, {
                text: `❌ Unknown network: *${query}*\n\nAvailable: ${Object.keys(MOMO_DATA).join(', ')}`,
                ...channelInfo
            }, { quoted: message });
        }
        const m = MOMO_DATA[key];
        const ussdList = Object.entries(m.ussd).map(([c, u]) => `• ${c}: \`${u}\``).join('\n');
        const helpList = Object.entries(m.helpline).map(([c, h]) => `• ${c}: ${h}`).join('\n');
        const featureList = m.features.map(f => `✅ ${f}`).join('\n');
        await sock.sendMessage(chatId, {
            text: `📡 *${m.name}*\n\n` +
                `🌍 *Available in:*\n${m.countries.join(', ')}\n\n` +
                `📲 *USSD Codes:*\n${ussdList}\n\n` +
                `⚡ *Features:*\n${featureList}\n\n${ 
                helpList ? `📞 *Helpline:*\n${helpList}\n\n` : '' 
                }🌐 *Website:* ${m.website}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:momo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .momo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "mobilemoney": async (h) => module.exports["momo"](h),
    "mpesa": async (h) => module.exports["momo"](h),
    "airtelmoney": async (h) => module.exports["momo"](h),
    "mtnmomo": async (h) => module.exports["momo"](h),
    "wave": async (h) => module.exports["momo"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from movie.js ---
  const OMDB_KEY = 'trilogy';
  return {

    // ── .movie ─── Search movie info, ratings, cast, plot | usage: .movie <movie name>\n.movie Pathaan\n.movie Jawan 2023
    "movie": async (h) => {
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
        rawText: (h.config.prefix + 'movie ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const input = args.join(' ').trim();
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `🎬 *Movie Info*\n\n` +
                    `*Usage:* \`.movie <name>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.movie Pathaan\`\n` +
                    `• \`.movie Jawan 2023\`\n` +
                    `• \`.movie Avengers Endgame\`\n` +
                    `• \`.movie RRR\`\n` +
                    `• \`.movie Black Panther\`\n\n` +
                    `Works for Bollywood, Hollywood, and all languages!`,
                ...channelInfo
            }, { quoted: message });
        }
        await sock.sendMessage(chatId, { text: `🔍 Searching *${input}*...`, ...channelInfo }, { quoted: message });
        try {
            // Try exact title first, then search
            const year = input.match(/\b(19|20)\d{2}\b/)?.[0];
            const title = input.replace(/\b(19|20)\d{2}\b/, '').trim();
            let url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_KEY}&plot=full`;
            if (year)
                url += `&y=${year}`;
            const res = await axios.get(url, { timeout: 15000 });
            let data = res.data;
            // If not found, try search
            if (data.Response === 'False') {
                const searchRes = await axios.get(`https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${OMDB_KEY}&type=movie`, { timeout: 15000 });
                const searchData = searchRes.data;
                if (searchData.Response === 'True' && searchData.Search?.length) {
                    const first = searchData.Search[0];
                    const detailRes = await axios.get(`https://www.omdbapi.com/?i=${first.imdbID}&apikey=${OMDB_KEY}&plot=full`, { timeout: 15000 });
                    data = detailRes.data;
                }
            }
            if (data.Response === 'False') {
                return await sock.sendMessage(chatId, {
                    text: `❌ Movie not found: *${input}*`,
                    ...channelInfo
                }, { quoted: message });
            }
            const ratings = (data.Ratings || []).map((r) => `• ${r.Source}: *${r.Value}*`).join('\n');
            const imdbStars = data.imdbRating !== 'N/A'
                ? `${'⭐'.repeat(Math.round(parseFloat(data.imdbRating) / 2)) } (${data.imdbRating}/10)`
                : 'N/A';
            const text = `🎬 *${data.Title}* (${data.Year})\n\n` +
                `🎭 *Genre:* ${data.Genre}\n` +
                `🌍 *Language:* ${data.Language}\n` +
                `🎬 *Director:* ${data.Director}\n` +
                `🎭 *Cast:* ${data.Actors}\n` +
                `⏱️ *Runtime:* ${data.Runtime}\n` +
                `🏆 *Awards:* ${data.Awards}\n\n` +
                `${imdbStars}\n` +
                `${ratings}\n\n` +
                `📝 *Plot:*\n${data.Plot}\n\n${ 
                data.BoxOffice && data.BoxOffice !== 'N/A' ? `💰 *Box Office:* ${data.BoxOffice}\n` : '' 
                }🔗 imdb.com/title/${data.imdbID}`;
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:movie] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .movie: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "bollywood": async (h) => module.exports["movie"](h),
    "omdb": async (h) => module.exports["movie"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .news ─── Get the latest top 5 news headlines from the US | usage: .news
    "news": async (h) => {
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
        rawText: (h.config.prefix + 'news ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const apiKey = process.env.NEWSAPI_KEY || 'dcd720a6f1914e2d9dba9790c188c08c';
            const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
            if (!response.data || !response.data.articles)
                throw new Error('Invalid API response');
            const articles = response.data.articles.slice(0, 5);
            if (articles.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '❌ No news found at the moment. Please try again later.',
                    quoted: message
                });
                return;
            }
            let newsMessage = '📰 *Latest News*:\n\n';
            articles.forEach((article, index) => {
                newsMessage += `${index + 1}. *${article.title}*\n${article.description || 'No description'}\n\n`;
            });
            await sock.sendMessage(chatId, {
                text: newsMessage.trim(),
                quoted: message
            });
        }
        catch (error) {
            console.error('News Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Sorry, I could not fetch news right now. Please try again later.',
                quoted: message
            });
        }
    
      } catch (portErr) {
        console.error('[ported:news] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .news: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "headlines": async (h) => module.exports["news"](h),
    "latestnews": async (h) => module.exports["news"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .owner ─── Get the contact of the bot owner | usage: .owner
    "owner": async (h) => {
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
        rawText: (h.config.prefix + 'owner ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const config = context.config;
        try {
            const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${config.botOwner}
TEL;waid=${config.ownerNumber}:${config.ownerNumber}
END:VCARD
      `.trim();
            await sock.sendMessage(chatId, {
                contacts: { displayName: config.botOwner, contacts: [{ vcard }] },
            }, { quoted: message });
        }
        catch (error) {
            console.error('Owner Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch owner contact.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:owner] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .owner: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "creator": async (h) => module.exports["owner"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .pokedex ─── Get information about a Pokémon | usage: .pokedex <pokemon name>
    "pokedex": async (h) => {
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
        rawText: (h.config.prefix + 'pokedex ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a Pokémon name to search for.*\nExample: `.pokedex pikachu`'
            }, { quoted: message });
        }
        try {
            const url = `https://some-random-api.com/pokemon/pokedex?pokemon=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok)
                throw json.error || 'Unknown error';
            const messageText = `
*≡ Name:* ${json.name}
*≡ ID:* ${json.id}
*≡ Type:* ${Array.isArray(json.type) ? json.type.join(', ') : json.type}
*≡ Abilities:* ${Array.isArray(json.abilities) ? json.abilities.join(', ') : json.abilities}
*≡ Species:* ${Array.isArray(json.species) ? json.species.join(', ') : json.species}
*≡ Height:* ${json.height}
*≡ Weight:* ${json.weight}
*≡ Experience:* ${json.base_experience}
*≡ Description:* ${json.description}
      `.trim();
            await sock.sendMessage(chatId, { text: messageText, quoted: message });
        }
        catch (error) {
            console.error('Pokedex Command Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:pokedex] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pokedex: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "pokemon": async (h) => module.exports["pokedex"](h),
    "poke": async (h) => module.exports["pokedex"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from quran.js ---
  const BASE = 'https://api.alquran.cloud/v1';
  const SURAH_NAMES = {
      1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
      6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
      11: 'Hud', 12: 'Yusuf', 13: 'Ar-Rad', 14: 'Ibrahim', 15: 'Al-Hijr',
      16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
      21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
      26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
      31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
      36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
      41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
      46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
      51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
      56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
      61: 'As-Saf', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
      66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
      71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
      76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
      81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
      86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
      91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
      96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
      101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
      106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
      111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
  };
  return {

    // ── .quran ─── Search Quran verses by surah:ayah or keyword | usage: .quran 1:1\n.quran 2:255\n.quran mercy
    "quran": async (h) => {
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
        rawText: (h.config.prefix + 'quran ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const input = args.join(' ').trim();
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `📖 *Quran*\n\n` +
                    `*By Surah:Ayah:*\n` +
                    `\`.quran 1:1\` — Al-Fatihah, verse 1\n` +
                    `\`.quran 2:255\` — Ayat Al-Kursi\n` +
                    `\`.quran 36:1\` — Ya-Sin, verse 1\n\n` +
                    `*By keyword:*\n` +
                    `\`.quran mercy\`\n` +
                    `\`.quran patience\`\n` +
                    `\`.quran paradise\`\n\n` +
                    `*Full Surah:*\n` +
                    `\`.surah 1\` — Al-Fatihah\n` +
                    `\`.surah 112\` — Al-Ikhlas`,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            // Check if surah:ayah format
            if (/^\d+:\d+$/.test(input)) {
                const [surah, ayah] = input.split(':');
                const [arRes, enRes] = await Promise.all([
                    axios.get(`${BASE}/ayah/${input}/quran-uthmani`),
                    axios.get(`${BASE}/ayah/${input}/en.asad`)
                ]);
                const ar = arRes.data.data;
                const en = enRes.data.data;
                const surahName = SURAH_NAMES[parseInt(surah, 10)] || ar.surah?.englishName;
                await sock.sendMessage(chatId, {
                    text: `📖 *Surah ${surahName} — Ayah ${ayah}*\n\n` +
                        `*Arabic:*\n${ar.text}\n\n` +
                        `*Translation (Asad):*\n_${en.text}_\n\n` +
                        `📍 Surah: ${surah} | Ayah: ${ayah} | Juz: ${ar.juz} | Page: ${ar.page}`,
                    ...channelInfo
                }, { quoted: message });
            }
            else if (/^\d+$/.test(input) || input.toLowerCase().startsWith('surah')) {
                // Full surah
                const num = input.replace(/[^0-9]/g, '') || '1';
                const res = await axios.get(`${BASE}/surah/${num}/en.asad`);
                const data = res.data.data;
                const arRes = await axios.get(`${BASE}/surah/${num}/quran-uthmani`);
                const arData = arRes.data.data;
                const verses = data.ayahs.slice(0, 7).map((a, i) => `*${i + 1}.* ${arData.ayahs[i]?.text || ''}\n_${a.text}_`).join('\n\n');
                await sock.sendMessage(chatId, {
                    text: `📖 *Surah ${data.englishName} (${data.name})*\n` +
                        `_${data.englishNameTranslation}_ — ${data.numberOfAyahs} verses — ${data.revelationType}\n\n` +
                        `${verses}\n\n` +
                        `_Showing first 7 of ${data.numberOfAyahs} verses_\n` +
                        `Use \`.quran ${num}:8\` for more`,
                    ...channelInfo
                }, { quoted: message });
            }
            else {
                // Keyword search
                const res = await axios.get(`${BASE}/search/${encodeURIComponent(input)}/all/en`);
                const matches = res.data.data?.matches || [];
                if (!matches.length) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No verses found for: *${input}*`,
                        ...channelInfo
                    }, { quoted: message });
                }
                const top = matches.slice(0, 5);
                const results = top.map((m) => {
                    const surahName = SURAH_NAMES[m.surah?.number] || m.surah?.englishName;
                    return `📍 *${surahName} ${m.surah?.number}:${m.numberInSurah}*\n_${m.text}_`;
                }).join('\n\n');
                await sock.sendMessage(chatId, {
                    text: `📖 *Quran Search: "${input}"*\n` +
                        `Found ${matches.length} results (showing top 5)\n\n${ 
                        results}`,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:quran] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .quran: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "quranverse": async (h) => module.exports["quran"](h),
    "ayah": async (h) => module.exports["quran"](h),
    "surah": async (h) => module.exports["quran"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { createRequire } = require('module');
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  // --- helper code from shazam.js ---
  const acrcloud = createRequire(__filename)('acrcloud');
  
  const acr = new acrcloud({
      host: 'identify-eu-west-1.acrcloud.com',
      access_key: process.env.ACRCLOUD_ACCESS_KEY || 'c33c767d683f78bd17d4bd4991955d81',
      access_secret: process.env.ACRCLOUD_ACCESS_SECRET || 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu',
  });
  /* ================= MEDIA HELPERS ================= */
  function getAudioOrVideo(message) {
      const m = message.message || {};
      if (m.audioMessage)
          return { msg: m.audioMessage, type: 'audio', ext: '.mp3' };
      if (m.videoMessage)
          return { msg: m.videoMessage, type: 'video', ext: '.mp4' };
      const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted)
          return null;
      if (quoted.audioMessage)
          return { msg: quoted.audioMessage, type: 'audio', ext: '.mp3' };
      if (quoted.videoMessage)
          return { msg: quoted.videoMessage, type: 'video', ext: '.mp4' };
      return null;
  }
  async function downloadMedia(msg, type) {
      const stream = await downloadContentFromMessage(msg, type);
      const chunks = [];
      for await (const chunk of stream)
          chunks.push(chunk);
      return Buffer.concat(chunks);
  }
  /* ================= COMMAND MODULE ================= */
  return {

    // ── .shazam ─── Identify a song from audio or video | usage: .shazam (reply to audio or video)
    "shazam": async (h) => {
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
        rawText: (h.config.prefix + 'shazam ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const media = getAudioOrVideo(message);
            if (!media) {
                return await sock.sendMessage(chatId, { text: '⚠️ *RESPOND TO AN AUDIO OR VIDEO*' }, { quoted: message });
            }
            const buffer = await downloadMedia(media.msg, media.type);
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir))
                fs.mkdirSync(tmpDir, { recursive: true });
            const tmpPath = path.join(tmpDir, `${Date.now()}${media.ext}`);
            fs.writeFileSync(tmpPath, buffer);
            const res = await acr.identify(fs.readFileSync(tmpPath));
            fs.unlinkSync(tmpPath);
            const { code, msg } = res.status;
            if (code !== 0)
                throw msg;
            const music = res.metadata.music?.[0];
            if (!music)
                throw new Error('No match found');
            const text = `
𝚁𝙴𝚂𝚄𝙻𝚃
• 📌 *TITLE*: ${music.title || 'NOT FOUND'}
• 👨‍🎤 *ARTIST*: ${music.artists?.map((a) => a.name).join(', ') || 'NOT FOUND'}
• 💾 *ALBUM*: ${music.album?.name || 'NOT FOUND'}
• 🌐 *GENRE*: ${music.genres?.map((g) => g.name).join(', ') || 'NOT FOUND'}
• 📆 *RELEASE DATE*: ${music.release_date || 'NOT FOUND'}
`.trim();
            await sock.sendMessage(chatId, { text }, { quoted: message });
        }
        catch (err) {
            console.error('[SHZ]', err);
            await sock.sendMessage(chatId, { text: `❌ Error: ${err}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:shazam] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .shazam: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "whatmusic": async (h) => module.exports["shazam"](h),
    "songid": async (h) => module.exports["shazam"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .string ─── Get detailed info about a text string | usage: .string <text>
    "string": async (h) => {
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
        rawText: (h.config.prefix + 'string ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const textInput = args?.join(' ')?.trim();
        if (!textInput) {
            return await sock.sendMessage(chatId, { text: '*Provide some text to analyze.*\nExample: .string What is AI' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/tools/string?apikey=guru&text=${encodeURIComponent(textInput)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to analyze text.' }, { quoted: message });
            }
            const reply = `📝 *Text Analysis*\n\n` +
                `✏️ Text: ${textInput}\n` +
                `🔠 Letters: ${data.letters}\n` +
                `🔢 Characters (including spaces): ${data.length}\n` +
                `📄 Words: ${data.words}\n\n` +
                `💡 Tip: Keep your text concise for better readability!`;
            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
        }
        catch (error) {
            console.error('String plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. Please try again later.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch text information.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:string] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .string: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "textinfo": async (h) => module.exports["string"](h),
    "textstats": async (h) => module.exports["string"](h),
  };
})());


Object.assign(module.exports, (() => {
  const pkg = require('api-qasim');
  // --- helper code from trends.js ---
  const PortedAPI = pkg;
  return {

    // ── .trends ─── Get trending topics from a country. | usage: .trends <country-name>
    "trends": async (h) => {
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
        rawText: (h.config.prefix + 'trends ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const country = args.join(' ').trim();
            if (!country) {
                await sock.sendMessage(chatId, {
                    text: '*Please provide a country name.*\nExample: .trends Pakistan or .trends South-Africa'
                }, { quoted: message });
                return;
            }
            const result = await PortedAPI.trendtwit(country);
            if (!result) {
                throw new Error('No data received');
            }
            let output = `*Trending topics in ${country}:*\n\n`;
            if (typeof result === 'string') {
                output += result;
            }
            else if (result.result && Array.isArray(result.result) && result.result.length) {
                result.result.forEach((trend, i) => {
                    if (trend.hastag && trend.tweet) {
                        output += `${i + 1}. ${trend.hastag} - ${trend.tweet}\n`;
                    }
                });
            }
            else {
                throw new Error('No trending data found');
            }
            await sock.sendMessage(chatId, {
                text: output
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in trendsCommand:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch trending topics. Please try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:trends] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .trends: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "trend": async (h) => module.exports["trends"](h),
    "trending": async (h) => module.exports["trends"](h),
  };
})());

