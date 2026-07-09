// AUTO-PORTED from friend's MEGA-MD bot (category: stalk)
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
  // --- helper code from genshin.js ---
  // Utility to decode Unicode escapes
  function decodeUnicode(str) {
      if (!str)
          return 'N/A';
      return str.replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace("\\u", ""), 16)));
  }
  return {

    // ── .genshin ─── Stalk Genshin Impact UID | usage: .genshin <UID>
    "genshin": async (h) => {
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
        rawText: (h.config.prefix + 'genshin ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a Genshin UID.*\nExample: .genshin 826401293'
            }, { quoted: message });
        }
        const uid = args[0];
        try {
            const { data } = await axios.get(`https://discardapi.dpdns.org/api/stalk/genshin`, {
                params: { apikey: 'guru', text: uid }
            });
            if (!data?.result) {
                return await sock.sendMessage(chatId, { text: '❌ UID not found or invalid.' }, { quoted: message });
            }
            const result = data.result;
            const caption = `🎮 *Genshin UID Info*\n\n` +
                `👤 Nickname: ${result.nickname || 'N/A'}\n` +
                `🆔 UID: ${result.uid || 'N/A'}\n` +
                `🏆 Achievements: ${result.achivement || 'N/A'}\n` +
                `⚡ Level: ${result.level || 'N/A'}\n` +
                `🌌 World Level: ${result.world_level || 'N/A'}\n` +
                `🌀 Spiral Abyss: ${decodeUnicode(result.spiral_abyss)}\n` +
                `💳 Card ID: ${result.card_id || 'N/A'}`;
            await sock.sendMessage(chatId, { image: { url: result.image }, caption }, { quoted: message });
        }
        catch (err) {
            console.error('Genshin plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch UID info.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:genshin] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .genshin: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gh": async (h) => module.exports["genshin"](h),
    "uid": async (h) => module.exports["genshin"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .github ─── Lookup GitHub user profile | usage: .github <username>
    "github": async (h) => {
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
        rawText: (h.config.prefix + 'github ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a GitHub username.*\nExample: .github torvalds'
            }, { quoted: message });
        }
        const username = args[0];
        try {
            const apiUrl = `https://discardapi.onrender.com/api/stalk/github?apikey=guru&url=${username}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!data?.result) {
                return await sock.sendMessage(chatId, { text: '❌ GitHub user not found.' }, { quoted: message });
            }
            const result = data.result;
            const caption = `🐙 *GitHub Profile Info*\n\n` +
                `👤 Name: ${result.nickname || 'N/A'}\n` +
                `🆔 Username: ${result.username || 'N/A'}\n` +
                `🏢 Company: ${result.company || 'N/A'}\n` +
                `📍 Location: ${result.location || 'N/A'}\n` +
                `💬 Bio: ${result.bio || 'N/A'}\n` +
                `📦 Public Repos: ${result.public_repo || 0}\n` +
                `📜 Public Gists: ${result.public_gists || 0}\n` +
                `👥 Followers: ${result.followers || 0}\n` +
                `➡ Following: ${result.following || 0}\n` +
                `🔗 Profile URL: ${result.url || 'N/A'}\n` +
                `📅 Created At: ${new Date(result.created_at).toDateString()}\n` +
                `🕒 Last Updated: ${new Date(result.updated_at).toDateString()}`;
            await sock.sendMessage(chatId, { image: { url: result.profile_pic }, caption }, { quoted: message });
        }
        catch (err) {
            console.error('GitHub plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch GitHub profile.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:github] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .github: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ghprofile": async (h) => module.exports["github"](h),
  };
})());


Object.assign(module.exports, (() => {
  const pkg = require('api-qasim');
  // --- helper code from npmstalk.js ---
  const QasimAny = pkg;
  return {

    // ── .npmstalk ─── Get details about an NPM package | usage: .npmstalk <package-name>
    "npmstalk": async (h) => {
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
        rawText: (h.config.prefix + 'npmstalk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        if (!args[0]) {
            return await sock.sendMessage(chatId, {
                text: `✳️ Please provide an NPM package name.\n\nExample:\n.npmstalk axios`
            }, { quoted: message });
        }
        try {
            const res = await QasimAny.npmStalk(args[0]);
            if (!res || !res.result) {
                throw new Error('Package not found or API error.');
            }
            const data = res.result;
            const authorName = (typeof data.author === 'object') ? data.author.name : (data.author || 'Unknown');
            const versionCount = data.versions ? Object.keys(data.versions).length : 0;
            let te = `┌──「 *NPM PACKAGE INFO* 」\n`;
            te += `▢ *🔖Name:* ${data.name}\n`;
            te += `▢ *🔖Creator:* ${authorName}\n`;
            te += `▢ *👥Total Versions:* ${versionCount}\n`;
            te += `▢ *📌Description:* ${data.description || 'No description'}\n`;
            te += `▢ *🧩Repository:* ${data.repository?.url || 'No repository available'}\n`;
            te += `▢ *🌍Homepage:* ${data.homepage || 'No homepage available'}\n`;
            te += `▢ *🏷️Latest:* ${data['dist-tags']?.latest || 'N/A'}\n`;
            te += `▢ *🔗Link:* https://npmjs.com/package/${data.name}\n`;
            te += `└────────────`;
            await sock.sendMessage(chatId, { text: te }, { quoted: message });
        }
        catch (error) {
            console.error('NPM Stalk Error:', error);
            await sock.sendMessage(chatId, { text: `✳️ Error: Package not found or API issue.` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:npmstalk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .npmstalk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "npmstlk": async (h) => module.exports["npmstalk"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .pinstalk ─── Lookup Pinterest user profile | usage: .pinstalk <username>
    "pinstalk": async (h) => {
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
        rawText: (h.config.prefix + 'pinstalk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a Pinterest username.*\nExample: .pinstalk anti_establishment'
            }, { quoted: message });
        }
        const username = args[0];
        try {
            const { data } = await axios.get(`https://discardapi.dpdns.org/api/stalk/pinterest`, {
                params: { apikey: 'guru', username }
            });
            if (!data?.result) {
                return await sock.sendMessage(chatId, { text: '❌ Pinterest user not found.' }, { quoted: message });
            }
            const result = data.result;
            const profileImage = result.image?.large || result.image?.original || null;
            const caption = `📌 *Pinterest Profile Info*\n\n` +
                `👤 Full Name: ${result.full_name || 'N/A'}\n` +
                `🆔 Username: ${result.username || 'N/A'}\n` +
                `📝 Bio: ${result.bio || 'N/A'}\n` +
                `📌 Boards: ${result.stats?.boards || 0}\n` +
                `👥 Followers: ${result.stats?.followers || 0}\n` +
                `➡ Following: ${result.stats?.following || 0}\n` +
                `❤️ Likes: ${result.stats?.likes || 0}\n` +
                `📌 Pins: ${result.stats?.pins || 0}\n` +
                `💾 Saves: ${result.stats?.saves || 0}\n` +
                `🔗 Profile URL: ${result.profile_url || 'N/A'}\n` +
                `🌐 Website: ${result.website || 'N/A'}`;
            if (profileImage) {
                await sock.sendMessage(chatId, { image: { url: profileImage }, caption }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            }
        }
        catch (err) {
            console.error('Pinterest plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch Pinterest profile.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:pinstalk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pinstalk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "pstalk": async (h) => module.exports["pinstalk"](h),
    "pinprofile": async (h) => module.exports["pinstalk"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .tgstalk ─── Lookup Telegram channel or user | usage: .tgstalk <username>
    "tgstalk": async (h) => {
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
        rawText: (h.config.prefix + 'tgstalk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a Telegram username.*\nExample: .tginfo GlobalTechBots'
            }, { quoted: message });
        }
        const username = args[0];
        try {
            const apiUrl = `https://discardapi.onrender.com/api/stalk/telegram?apikey=guru&url=${username}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!data?.result) {
                return await sock.sendMessage(chatId, { text: '❌ Telegram user/channel not found.' }, { quoted: message });
            }
            const result = data.result;
            const profileImage = result.image_url || null;
            const caption = `📱 *Telegram Info*\n\n` +
                `👤 Title: ${result.title || 'N/A'}\n` +
                `📝 Description: ${result.description || 'N/A'}\n` +
                `🔗 Link: ${result.url || `https://t.me/${username}`}`;
            if (profileImage) {
                await sock.sendMessage(chatId, { image: { url: profileImage }, caption }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            }
        }
        catch (err) {
            console.error('Telegram plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch Telegram info.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:tgstalk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tgstalk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tguser": async (h) => module.exports["tgstalk"](h),
    "tginfo": async (h) => module.exports["tgstalk"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .thrstalk ─── Lookup Threads user profile | usage: .thrstalk <username>
    "thrstalk": async (h) => {
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
        rawText: (h.config.prefix + 'thrstalk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a Threads username.*\nExample: .thrstalk google'
            }, { quoted: message });
        }
        const username = args[0];
        try {
            const apiUrl = `https://discardapi.onrender.com/api/stalk/threads?apikey=guru&url=${username}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!data?.result) {
                return await sock.sendMessage(chatId, { text: '❌ Threads user not found.' }, { quoted: message });
            }
            const result = data.result;
            const profileImage = result.hd_profile_picture || result.profile_picture || null;
            const verifiedMark = result.is_verified ? '✅ Verified' : '';
            const caption = `🧵 *Threads Profile Info*\n\n` +
                `👤 Name: ${result.name || 'N/A'} ${verifiedMark}\n` +
                `🆔 Username: ${result.username || 'N/A'}\n` +
                `📎 Links: ${result.links?.length ? result.links.join('\n') : 'N/A'}\n` +
                `👥 Followers: ${result.followers || 0}\n` +
                `📝 Bio: ${result.bio || 'N/A'}\n` +
                `🔗 Profile URL: https://threads.net/@${result.username || username}`;
            if (profileImage) {
                await sock.sendMessage(chatId, { image: { url: profileImage }, caption }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            }
        }
        catch (err) {
            console.error('Threads plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch Threads profile.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:thrstalk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .thrstalk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "threadsprofile": async (h) => module.exports["thrstalk"](h),
    "threadsuser": async (h) => module.exports["thrstalk"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .ttstalk ─── Lookup TikTok user profile | usage: .ttstalk <username>
    "ttstalk": async (h) => {
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
        rawText: (h.config.prefix + 'ttstalk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a TikTok username.*\nExample: .ttstalk truepakistanofficial'
            }, { quoted: message });
        }
        const username = args[0];
        try {
            const { data } = await axios.get('https://discardapi.dpdns.org/api/stalk/tiktok', {
                params: { apikey: 'guru', username }
            });
            if (!data?.result?.user) {
                return await sock.sendMessage(chatId, { text: '❌ TikTok user not found.' }, { quoted: message });
            }
            const user = data.result.user;
            const stats = data.result.statsV2 || data.result.stats;
            const profileImage = user.avatarLarger || user.avatarMedium || user.avatarThumb;
            const verifiedMark = user.verified ? '✅ Verified' : '';
            const caption = `🎵 *TikTok Profile Info*\n\n` +
                `👤 Nickname: ${user.nickname || 'N/A'} ${verifiedMark}\n` +
                `🆔 Username: @${user.uniqueId || 'N/A'}\n` +
                `📝 Bio: ${user.signature || 'N/A'}\n` +
                `🔒 Private Account: ${user.privateAccount ? 'Yes' : 'No'}\n\n` +
                `👥 Followers: ${stats?.followerCount || 0}\n` +
                `➡ Following: ${stats?.followingCount || 0}\n` +
                `❤️ Likes: ${stats?.heartCount || 0}\n` +
                `🎥 Videos: ${stats?.videoCount || 0}\n\n` +
                `🔗 Profile URL: https://www.tiktok.com/@${user.uniqueId}`;
            if (profileImage) {
                await sock.sendMessage(chatId, { image: { url: profileImage }, caption }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            }
        }
        catch (err) {
            console.error('TikTok plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch TikTok profile.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:ttstalk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .ttstalk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tikstalk": async (h) => module.exports["ttstalk"](h),
    "ttprofile": async (h) => module.exports["ttstalk"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .xstalk ─── Lookup Twitter user profile | usage: .xstalk <username>
    "xstalk": async (h) => {
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
        rawText: (h.config.prefix + 'xstalk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: '*Please provide a Twitter username.*\nExample: .xstalk HarmeetSinghPk'
            }, { quoted: message });
        }
        const username = args[0];
        try {
            const { data } = await axios.get(`https://discardapi.dpdns.org/api/stalk/twitter`, {
                params: { apikey: 'guru', username }
            });
            if (!data?.result) {
                return await sock.sendMessage(chatId, { text: '❌ Twitter user not found.' }, { quoted: message });
            }
            const result = data.result;
            const profileImage = result.profile?.image || null;
            const bannerImage = result.profile?.banner || null;
            const verifiedMark = result.verified ? '✅ Verified' : '';
            const caption = `🐦 *Twitter Profile Info*\n\n` +
                `👤 Name: ${result.name || 'N/A'} ${verifiedMark}\n` +
                `🆔 Username: @${result.username || 'N/A'}\n` +
                `📝 Bio: ${result.description || 'N/A'}\n` +
                `📍 Location: ${result.location || 'N/A'}\n` +
                `📅 Joined: ${new Date(result.created_at).toDateString()}\n\n` +
                `👥 Followers: ${result.stats?.followers || 0}\n` +
                `➡ Following: ${result.stats?.following || 0}\n` +
                `❤️ Likes: ${result.stats?.likes || 0}\n` +
                `🖼 Media: ${result.stats?.media || 0}\n` +
                `🐦 Tweets: ${result.stats?.tweets || 0}\n` +
                `🔗 Profile URL: https://twitter.com/${result.username}`;
            if (profileImage) {
                await sock.sendMessage(chatId, { image: { url: profileImage }, caption }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            }
            if (bannerImage) {
                await sock.sendMessage(chatId, { image: { url: bannerImage }, caption: `📌 Banner of @${username}` });
            }
        }
        catch (err) {
            console.error('Twitter plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch Twitter profile.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:xstalk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .xstalk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "twstalk": async (h) => module.exports["xstalk"](h),
    "xprofile": async (h) => module.exports["xstalk"](h),
  };
})());

