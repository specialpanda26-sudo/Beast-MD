// AUTO-PORTED from friend's MEGA-MD bot (category: download)
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
  // --- helper code from alamy.js ---
  /*****************************************************************************
 *  Henry Bots / Henry Config Tools                                          *
 *  Owner: Henry (henrytech254)                                              *
 *****************************************************************************/
  return {

    // ── .alamy ─── Download image or video from Alamy URL | usage: .alamy <Alamy URL>
    "alamy": async (h) => {
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
        rawText: (h.config.prefix + 'alamy ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0]?.trim();
        if (!url) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide an Alamy URL.\nExample: .alamy https://www.alamy.com/video/beautiful-lake...' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/alamy?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result?.length) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch media from the provided Alamy URL.' }, { quoted: message });
            }
            const isValidUrl = (u) => u && u.startsWith('http');
            let sent = false;
            for (const item of data.result) {
                if (isValidUrl(item.video)) {
                    await sock.sendMessage(chatId, { video: { url: item.video }, caption: '🎬 *Alamy Video*' }, { quoted: message });
                    sent = true;
                }
                if (isValidUrl(item.image)) {
                    await sock.sendMessage(chatId, { image: { url: item.image }, caption: '🖼️ *Alamy Image*' }, { quoted: message });
                    sent = true;
                }
            }
            if (!sent) {
                await sock.sendMessage(chatId, { text: '❌ No valid media found in the Alamy URL.' }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Alamy download plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to download media from Alamy URL.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:alamy] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .alamy: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "alamydl": async (h) => module.exports["alamy"](h),
    "alamydownload": async (h) => module.exports["alamy"](h),
  };
})());


Object.assign(module.exports, (() => {
  const pkg = require('api-qasim');
  const axios = require('axios');
  // --- helper code from android1.js ---
  const QasimAny = pkg;
  return {

    // ── .apkdl ─── Search APKs and download by reply | usage: .apkdl <apk_name>
    "apkdl": async (h) => {
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
        rawText: (h.config.prefix + 'apkdl ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();
        try {
            if (!query) {
                return await sock.sendMessage(chatId, { text: '*Please provide an APK name.*\nExample: .apkdl Telegram' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { text: '🔎 Searching for APKs...' }, { quoted: message });
            const res = await QasimAny.apksearch(query);
            if (!res?.data || !Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ No APKs found.' }, { quoted: message });
            }
            const results = res.data;
            const first = results[0];
            let caption = `📱 *APK Search Results for:* *${query}*\n\n`;
            caption += `↩️ *Reply with a number to download*\n\n`;
            results.forEach((item, i) => {
                caption +=
                    `*${i + 1}.* ${item.judul}\n` +
                        `👨‍💻 Developer: ${item.dev}\n` +
                        `⭐ Rating: ${item.rating}\n` +
                        `🔗 ${item.link}\n\n`;
            });
            const sentMsg = await sock.sendMessage(chatId, { image: { url: first.thumb }, caption }, { quoted: message });
            const timeout = setTimeout(async () => {
                sock.ev.off('messages.upsert', listener);
                await sock.sendMessage(chatId, { text: '⏱ APK selection expired. Please search again.' }, { quoted: sentMsg });
            }, 5 * 60 * 1000);
            const listener = async ({ messages }) => {
                const m = messages[0];
                if (!m?.message || m.key.remoteJid !== chatId)
                    return;
                const ctx = m.message?.extendedTextMessage?.contextInfo;
                if (!ctx?.stanzaId || ctx.stanzaId !== sentMsg.key.id)
                    return;
                const replyText = m.message.conversation ||
                    m.message.extendedTextMessage?.text ||
                    '';
                const choice = parseInt(replyText.trim(), 10);
                if (isNaN(choice) || choice < 1 || choice > results.length) {
                    return await sock.sendMessage(chatId, { text: `❌ Invalid choice. Pick 1-${results.length}.` }, { quoted: m });
                }
                clearTimeout(timeout);
                sock.ev.off('messages.upsert', listener);
                const selected = results[choice - 1];
                await sock.sendMessage(chatId, { text: `⬇️ Downloading *${selected.judul}*...\n⏱ Please wait...` }, { quoted: m });
                const apiUrl = `https://discardapi.dpdns.org/api/apk/dl/android1?apikey=guru&url=${ 
                    encodeURIComponent(selected.link)}`;
                const dlRes = await axios.get(apiUrl);
                const apk = dlRes.data?.result;
                if (!apk?.url) {
                    return await sock.sendMessage(chatId, { text: '❌ Failed to get APK download link.' }, { quoted: m });
                }
                const safeName = apk.name.replace(/[^\w.-]/g, '_');
                const apkCaption = `📦 *APK Downloaded*\n\n` +
                    `📛 Name: ${apk.name}\n` +
                    `⭐ Rating: ${apk.rating}\n` +
                    `📦 Size: ${apk.size}\n` +
                    `📱 Android: ${apk.requirement}\n` +
                    `🧒 Age: ${apk.rated}\n` +
                    `📅 Published: ${apk.published}\n\n` +
                    `📝 Description:\n${apk.description}`;
                await sock.sendMessage(chatId, { document: { url: apk.url }, fileName: `${safeName}.apk`, mimetype: 'application/vnd.android.package-archive', caption: apkCaption }, { quoted: m });
            };
            sock.ev.on('messages.upsert', listener);
        }
        catch (err) {
            console.error('❌ Android Plugin Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to process APK request.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:apkdl] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .apkdl: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "apk": async (h) => module.exports["apkdl"](h),
    "an1apk": async (h) => module.exports["apkdl"](h),
    "appdl": async (h) => module.exports["apkdl"](h),
    "app": async (h) => module.exports["apkdl"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from facebook.js ---
  const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*'
      }
  };
  return {

    // ── .facebook ─── Download Facebook videos | usage: .fb <facebook video link>
    "facebook": async (h) => {
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
        rawText: (h.config.prefix + 'facebook ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args.join(' ') ||
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text;
        try {
            if (!url) {
                return await sock.sendMessage(chatId, { text: '📘 *Facebook Downloader*\n\nUsage:\n.fb <facebook video link>' }, { quoted: message });
            }
            if (!/facebook\.com|fb\.watch/i.test(url)) {
                return await sock.sendMessage(chatId, { text: '❌ Invalid Facebook link.\nPlease send a valid Facebook video URL.' }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                react: { text: '🔄', key: message.key }
            });
            const apiUrl = `https://gtech-api-xtp1.onrender.com/api/download/fb?url=${encodeURIComponent(url)}&apikey=APIKEY`;
            const res = await axios.get(apiUrl, AXIOS_DEFAULTS);
            const videos = res?.data?.data?.data;
            if (!res?.data?.status || !Array.isArray(videos) || !videos.length) {
                throw new Error('No downloadable video found');
            }
            const sorted = videos.sort((a, b) => {
                const qa = parseInt(a.resolution, 10) || 0;
                const qb = parseInt(b.resolution, 10) || 0;
                return qb - qa;
            });
            const selected = sorted[0];
            const videoUrl = selected.url.startsWith('http')
                ? selected.url
                : `https://gtech-api-xtp1.onrender.com${selected.url}`;
            const caption = `📘 *Facebook Downloader*
🎞 Quality: *${selected.resolution || 'Unknown'}*

> *_Downloaded by Henry Ochibots_*`;
            await sock.sendMessage(chatId, { video: { url: videoUrl }, mimetype: 'video/mp4', caption }, { quoted: message });
        }
        catch (err) {
            console.error('Facebook downloader error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to download Facebook video. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:facebook] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .facebook: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "fb": async (h) => module.exports["facebook"](h),
    "fbdl": async (h) => module.exports["facebook"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .getty ─── Download video or image from Getty Images | usage: .getty <Getty URL>
    "getty": async (h) => {
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
        rawText: (h.config.prefix + 'getty ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0];
        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a Getty URL.\nExample: .getty https://www.gettyimages.com/detail/video/482277170' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/getty?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No video found for this URL.' }, { quoted: message });
            }
            const videoUrl = data.result[0].video;
            const imageUrl = data.result[0].image;
            if (imageUrl) {
                await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: '🖼️ Getty Thumbnail' }, { quoted: message });
            }
            if (videoUrl) {
                await sock.sendMessage(chatId, { video: { url: videoUrl }, caption: '🎬 Getty Video' }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Getty plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch Getty video.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:getty] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .getty: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gettyvideo": async (h) => module.exports["getty"](h),
    "gettydl": async (h) => module.exports["getty"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .gimage ─── Search and send first 4 Google images | usage: .gimage <search query>
    "gimage": async (h) => {
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
        rawText: (h.config.prefix + 'gimage ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args?.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(chatId, { text: 'Please provide a search query.\nExample: .gimage Pakistan' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/gimage?apikey=guru&query=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.imageUrls?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No images found for this query.' }, { quoted: message });
            }
            const imagesToSend = data.imageUrls.slice(0, 4);
            for (let i = 0; i < imagesToSend.length; i++) {
                const imgUrl = imagesToSend[i];
                await sock.sendMessage(chatId, { image: { url: imgUrl }, caption: `🖼️ *Google Image ${i + 1}*` }, { quoted: message });
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
        }
        catch (error) {
            console.error('GImage plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch Google images.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:gimage] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gimage: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "googleimage": async (h) => module.exports["gimage"](h),
    "gimg": async (h) => module.exports["gimage"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .gitclone ─── Download a GitHub repository as zip | usage: .gitclone <url> OR <username> <repo>
    "gitclone": async (h) => {
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
        rawText: (h.config.prefix + 'gitclone ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        if (!args || args.length === 0) {
            return sock.sendMessage(chatId, {
                text: '*🌟 Please provide a GitHub URL or username and repository name.*\n\n*Example usage:*\n\n.clone https://github.com/specialpanda26-sudo/Beast-bot-ogolla\n\n.clone specialpanda26-sudo Beast-bot-ogolla'
            });
        }
        let url = '';
        let repoName = '';
        if (args[0].startsWith('http')) {
            const inputUrl = args[0].replace(/\.git$/, '');
            const parts = inputUrl.split('/');
            repoName = parts[parts.length - 1];
            url = inputUrl;
            if (!url.endsWith('/'))
                url += '/';
            url += 'archive/refs/heads/main.zip';
        }
        else if (args.length >= 2) {
            const username = args[0];
            const repo = args[1];
            repoName = repo;
            url = `https://github.com/${username}/${repo}/archive/refs/heads/main.zip`;
        }
        else {
            return sock.sendMessage(chatId, {
                text: '*Missing repository info.*\n\n*Example usage:*\n\n.clone https://github.com/specialpanda26-sudo/Beast-bot-ogolla\n\n.clone specialpanda26-sudo Beast-bot-ogolla'
            });
        }
        await sock.sendMessage(chatId, { text: '⏱️ Preparing repository zip...' });
        try {
            await sock.sendMessage(chatId, {
                document: { url },
                fileName: `${repoName }.zip`,
                mimetype: 'application/zip'
            });
        }
        catch (e) {
            console.error(e);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch the repository. Please make sure the repository exists and try again.'
            });
        }
    
      } catch (portErr) {
        console.error('[ported:gitclone] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gitclone: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "githubdl": async (h) => module.exports["gitclone"](h),
    "clone": async (h) => module.exports["gitclone"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .gitclone2 ─── Download a GitHub repository as a ZIP file | usage: .gitclone2 <github-link>
    "gitclone2": async (h) => {
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
        rawText: (h.config.prefix + 'gitclone2 ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        const regex = new RegExp('(?:https|git)(?://|@)github.com[/:]([^/:]+)/(.+)', 'i');
        try {
            const link = args[0];
            if (!link) {
                return await sock.sendMessage(chatId, {
                    text: `❌ *Missing Link!*\n\nExample: .gitclone2 https://github.com/specialpanda26-sudo/Beast-bot-ogolla`
                }, { quoted: message });
            }
            if (!regex.test(link)) {
                return await sock.sendMessage(chatId, { text: '⚠️ *Invalid GitHub link!*' }, { quoted: message });
            }
            // eslint-disable-next-line prefer-const
            let [_, user, repo] = link.match(regex) || [];
            repo = repo.replace(/.git$/, '');
            const url = `https://api.github.com/repos/${user}/${repo}/zipball`;
            const { default: _axios } = await import('axios');
            const _response = _axios.head;
            const headRes = await axios.head(url);
            const contentDisposition = headRes.headers['content-disposition'];
            let filename = `${repo}.zip`;
            if (contentDisposition) {
                const match = contentDisposition.match(/attachment; filename=(.*)/);
                if (match)
                    filename = match[1];
            }
            await sock.sendMessage(chatId, { text: `✳️ *Wait, sending repository...*` }, { quoted: message });
            await sock.sendMessage(chatId, {
                document: { url },
                fileName: filename,
                mimetype: 'application/zip',
                caption: `📦 *Repository:* ${user}/${repo}\n✨ *Cloned by Henry Ochibots*`
            }, { quoted: message });
        }
        catch (err) {
            console.error('Gitclone Error:', err);
            await sock.sendMessage(chatId, { text: '❌ *Failed to download the repository.* Make sure it is public.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:gitclone2] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gitclone2: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "githubdl2": async (h) => module.exports["gitclone2"](h),
    "clone2": async (h) => module.exports["gitclone2"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { igdl } = require('ruhend-scraper');
  // --- helper code from instagram.js ---
  const processedMessages = new Set();
  function extractUniqueMedia(mediaData = []) {
      const seen = new Set();
      return mediaData.filter((m) => {
          if (!m?.url || seen.has(m.url))
              return false;
          seen.add(m.url);
          return true;
      });
  }
  return {

    // ── .instagram ─── Download Instagram posts, reels & videos | usage: .ig <instagram link>
    "instagram": async (h) => {
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
        rawText: (h.config.prefix + 'instagram ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ') ||
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text;
        try {
            if (processedMessages.has(message.key.id))
                return;
            processedMessages.add(message.key.id);
            setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);
            if (!text) {
                return await sock.sendMessage(chatId, { text: '📸 *Instagram Downloader*\n\nUsage:\n.ig <post | reel | video link>' }, { quoted: message });
            }
            const igRegex = /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv)\//i;
            if (!igRegex.test(text)) {
                return await sock.sendMessage(chatId, { text: '❌ Invalid Instagram link.\nPlease send a valid post, reel, or video URL.' }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                react: { text: '🔄', key: message.key }
            });
            const res = await igdl(text);
            if (!res?.data?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No media found.\nThe post may be private or unavailable.' }, { quoted: message });
            }
            const mediaList = extractUniqueMedia(res.data).slice(0, 20);
            if (!mediaList.length) {
                return await sock.sendMessage(chatId, { text: '❌ No downloadable media found.' }, { quoted: message });
            }
            for (let i = 0; i < mediaList.length; i++) {
                const media = mediaList[i];
                const url = media.url;
                const isVideo = media.type === 'video' ||
                    /\.(mp4|mov|webm|mkv)$/i.test(url) ||
                    text.includes('/reel/') ||
                    text.includes('/tv/');
                if (isVideo) {
                    await sock.sendMessage(chatId, {
                        video: { url },
                        mimetype: 'video/mp4',
                        caption: '📥 *Downloaded by Henry Ochibots*'
                    }, { quoted: message });
                }
                else {
                    await sock.sendMessage(chatId, {
                        image: { url },
                        caption: '📥 *Downloaded by Henry Ochibots*'
                    }, { quoted: message });
                }
                if (i < mediaList.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        catch (err) {
            console.error('Instagram plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to download Instagram media. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:instagram] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .instagram: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ig": async (h) => module.exports["instagram"](h),
    "igdl": async (h) => module.exports["instagram"](h),
    "insta": async (h) => module.exports["instagram"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .istock ─── Download image or video from iStock URL | usage: .istock <iStock URL>
    "istock": async (h) => {
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
        rawText: (h.config.prefix + 'istock ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0]?.trim();
        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide an iStock URL.\nExample: .istock https://www.istockphoto.com/video/...' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/istock?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to fetch media from the provided iStock URL.' }, { quoted: message });
            }
            const item = data.result;
            if (item.video) {
                await sock.sendMessage(chatId, { video: { url: item.video }, caption: '🎬 *iStock Video*' }, { quoted: message });
            }
            if (item.image) {
                await sock.sendMessage(chatId, { image: { url: item.image }, caption: '🖼️ *iStock Image*' }, { quoted: message });
            }
        }
        catch (error) {
            console.error('iStock download plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to download media from iStock URL.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:istock] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .istock: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "istockdl": async (h) => module.exports["istock"](h),
    "istockdownload": async (h) => module.exports["istock"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const cheerio = require('cheerio');
  // --- helper code from mediafire.js ---
  async function mediafireDl(url) {
      try {
          const { data } = await axios.get(url, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
              }
          });
          const $ = cheerio.load(data);
          const link = $('#downloadButton').attr('href');
          const name = $('div.dl-info > div.promo-text').text().trim() || $('.dl-btn-label').attr('title');
          const size = $('#downloadButton').text().replace(/Download|[()]|\s/g, '').trim() || 'Unknown';
          const ext = name.split('.').pop();
          return { name, size, link, ext };
      }
      catch (e) {
          return null;
      }
  }
  return {

    // ── .mediafire ─── Download files from MediaFire | usage: .mediafire <url>
    "mediafire": async (h) => {
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
        rawText: (h.config.prefix + 'mediafire ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId } = context;
        const text = args.join(' ');
        if (!text)
            return await sock.sendMessage(chatId, { text: "❌ Provide a MediaFire URL.\n\nExample:\n.mfire https://www.mediafire.com/file/5e54xv2cislhfgb/twoxzhn.zip/file" }, { quoted: message });
        try {
            const data = await mediafireDl(text);
            if (!data || !data.link) {
                return await sock.sendMessage(chatId, { text: "❌ Failed to parse MediaFire page. Link might be private or broken." }, { quoted: message });
            }
            let caption = `≡ *MEDIAFIRE DOWNLOADER*\n\n`;
            caption += `▢ *File:* ${data.name}\n`;
            caption += `▢ *Size:* ${data.size}\n`;
            caption += `▢ *Extension:* ${data.ext}\n\n`;
            caption += `*Download In Progress... Please Wait ⌛*`;
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            const response = await axios({
                method: 'get',
                url: data.link,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                    'Referer': text
                }
            });
            const buffer = Buffer.from(response.data);
            if (buffer.length < 10000) {
                return await sock.sendMessage(chatId, { text: "❌ Error: The downloaded file is corrupt or invalid." });
            }
            let mimeType = 'application/octet-stream';
            const mimes = {
                'zip': 'application/zip',
                'pdf': 'application/pdf',
                'apk': 'application/vnd.android.package-archive',
                'mp4': 'video/mp4',
                'mp3': 'audio/mpeg',
                'jpg': 'image/jpeg',
                'png': 'image/png'
            };
            if (mimes[data.ext.toLowerCase()])
                mimeType = mimes[data.ext.toLowerCase()];
            await sock.sendMessage(chatId, {
                document: buffer,
                fileName: data.name,
                mimetype: mimeType,
                caption: `✅ *Download Complete:* ${data.name}`
            }, { quoted: message });
        }
        catch (err) {
            console.error('MF Download Error:', err);
            await sock.sendMessage(chatId, { text: `❌ Error: ${ err.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:mediafire] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .mediafire: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "mfire": async (h) => module.exports["mediafire"](h),
    "mf": async (h) => module.exports["mediafire"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { File } = require('megajs');
  const path = require('path');
  // --- helper code from mega.js ---
  const formatBytes = (bytes) => {
      if (bytes === 0)
          return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2)) } ${ sizes[i]}`;
  };
  const generateBar = (percentage) => {
      const totalBars = 10;
      const filledBars = Math.floor((percentage / 100) * totalBars);
      return '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars);
  };
  const MIME_TYPES = {
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.apk': 'application/vnd.android.package-archive',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.mp3': 'audio/mpeg',
      '.mkv': 'video/x-matroska'
  };
  return {

    // ── .mega ─── Download from MEGA with real-time progress | usage: .mega <mega-url>
    "mega": async (h) => {
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
        rawText: (h.config.prefix + 'mega ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ').trim();
        if (!text) {
            return sock.sendMessage(chatId, { text: `*Usage:* .mega https://mega.nz/file/xxxx#xxxx` }, { quoted: message });
        }
        try {
            const file = File.fromURL(text);
            await file.loadAttributes();
            if (file.size >= 500 * 1024 * 1024) {
                return sock.sendMessage(chatId, { text: '❌ *Error:* File too large (Limit: 500MB)' }, { quoted: message });
            }
            const { key } = await sock.sendMessage(chatId, {
                text: `🌩️ *MEGA DOWNLOAD*\n\n▢ *File:* ${file.name}\n▢ *Size:* ${formatBytes(file.size)}\n\n*Progress:* 0% [░░░░░░░░░░]`
            }, { quoted: message });
            const stream = file.download();
            const chunks = [];
            let lastUpdate = Date.now();
            stream.on('progress', async (info) => {
                const { bytesLoaded, bytesTotal } = info;
                const percentage = Math.floor((bytesLoaded / bytesTotal) * 100);
                if (Date.now() - lastUpdate > 3000 || percentage === 100) {
                    const bar = generateBar(percentage);
                    await sock.sendMessage(chatId, {
                        text: `🌩️ *MEGA DOWNLOAD*\n\n▢ *File:* ${file.name}\n▢ *Size:* ${formatBytes(bytesTotal)}\n\n*Progress:* ${percentage}% [${bar}]`,
                        edit: key
                    });
                    lastUpdate = Date.now();
                }
            });
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                const ext = path.extname(file.name ?? '').toLowerCase();
                await sock.sendMessage(chatId, {
                    document: buffer,
                    fileName: file.name,
                    mimetype: MIME_TYPES[ext] || 'application/octet-stream',
                    caption: `✅ *Download Complete*\n▢ *File:* ${file.name}\n▢ *Size:* ${formatBytes(file.size)}`
                }, { quoted: message });
            });
            stream.on('error', async (err) => {
                await sock.sendMessage(chatId, { text: `❌ *Download Error:* ${err.message}` }, { quoted: message });
            });
        }
        catch (error) {
            await sock.sendMessage(chatId, { text: `❌ *Error:* ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:mega] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .mega: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "megadl": async (h) => module.exports["mega"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .sharechat ─── Download video from ShareChat | usage: .sharechat <ShareChat URL>
    "sharechat": async (h) => {
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
        rawText: (h.config.prefix + 'sharechat ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0];
        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a ShareChat URL.\nExample: .sharechat https://sharechat.com/video/XDPQKxb?referrer=url' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/sharechat?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No video found for this URL.' }, { quoted: message });
            }
            const videoUrl = data.result[0].video;
            const imageUrl = data.result[0].image;
            if (imageUrl) {
                await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: '🖼️ ShareChat Thumbnail' }, { quoted: message });
            }
            if (videoUrl) {
                await sock.sendMessage(chatId, { video: { url: videoUrl }, caption: '🎬 ShareChat Video' }, { quoted: message });
            }
        }
        catch (error) {
            console.error('ShareChat plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch ShareChat video.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:sharechat] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sharechat: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "sharechatdl": async (h) => module.exports["sharechat"](h),
    "sharechatvideo": async (h) => module.exports["sharechat"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .snack ─── Download media (video or image) from SnackVideo URL | usage: .snack <SnackVideo URL>
    "snack": async (h) => {
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
        rawText: (h.config.prefix + 'snack ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0];
        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a SnackVideo URL.\nExample: .snack https://sck.io/p/...' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/snack?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No media found for this SnackVideo URL.' }, { quoted: message });
            }
            for (const mediaItem of data.result) {
                if (mediaItem.video) {
                    await sock.sendMessage(chatId, { video: { url: mediaItem.video }, caption: '📹 SnackVideo Video' }, { quoted: message });
                }
                if (mediaItem.image) {
                    await sock.sendMessage(chatId, { image: { url: mediaItem.image }, caption: '🖼 SnackVideo Image' }, { quoted: message });
                }
            }
        }
        catch (error) {
            console.error('SnackVideo plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch SnackVideo media.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:snack] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .snack: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "snackvideo": async (h) => module.exports["snack"](h),
    "snackdl": async (h) => module.exports["snack"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .snapchat ─── Download media (video or image) from Snapchat Spotlight URL | usage: .snapchat <Snapchat URL>
    "snapchat": async (h) => {
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
        rawText: (h.config.prefix + 'snapchat ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo, rawText } = context;
        const prefix = context.rawText.match(/^[.!#]/)?.[0] || '.';
        const commandPart = rawText.slice(prefix.length).trim();
        const parts = commandPart.split(/\s+/);
        const url = parts.slice(1).join(' ').trim();
        if (!url) {
            return await sock.sendMessage(chatId, {
                text: 'Please provide a Snapchat Spotlight URL.\nExample: .snapchat https://www.snapchat.com/spotlight/...',
                ...channelInfo
            }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, {
                text: '⏳ Fetching Snapchat media...',
                ...channelInfo
            }, { quoted: message });
            const apiUrl = `https://discardapi.dpdns.org/api/dl/snapchat?apikey=guru&url=${encodeURIComponent(url)}`;
            console.log('Requesting URL:', apiUrl);
            console.log('Original URL:', url);
            const { data } = await axios.get(apiUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            console.log('Snapchat API Response:', JSON.stringify(data, null, 2));
            if (!data || data.status !== true || !data.result || !Array.isArray(data.result) || data.result.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: '❌ No media found for this Snapchat Spotlight URL.',
                    ...channelInfo
                }, { quoted: message });
            }
            for (const mediaItem of data.result) {
                if (mediaItem.video) {
                    await sock.sendMessage(chatId, {
                        video: { url: mediaItem.video },
                        caption: '📹 Snapchat Spotlight Video',
                        ...channelInfo
                    }, { quoted: message });
                }
                if (mediaItem.image) {
                    await sock.sendMessage(chatId, {
                        image: { url: mediaItem.image },
                        caption: '🖼 Snapchat Spotlight Image',
                        ...channelInfo
                    }, { quoted: message });
                }
            }
        }
        catch (error) {
            console.error('Snapchat plugin error:', error.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to fetch Snapchat media.\nError: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:snapchat] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .snapchat: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "scspot": async (h) => module.exports["snapchat"](h),
    "snapdl": async (h) => module.exports["snapchat"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from spotify.js ---
  const API = 'https://api.qasimdev.dpdns.org/api/spotify/download';
  const API_KEY = 'qasim-dev';
  const formatDuration = (ms) => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };
  return {

    // ── .spotify ─── Download music from Spotify | usage: .spotify <spotify-url>
    "spotify": async (h) => {
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
        rawText: (h.config.prefix + 'spotify ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args.join(' ').trim();
        if (!url || !url.includes('spotify.com')) {
            return sock.sendMessage(chatId, {
                text: '🎵 *Spotify Downloader*\n\nUsage: `.spotify <spotify track url>`\nExample: `.spotify https://open.spotify.com/track/4LMlVCXHJtCE9abhmn0mYo`'
            }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, { react: { text: '🎵', key: message.key } });
            const { data } = await axios.get(API, {
                params: { apiKey: API_KEY, url },
                timeout: 30000
            });
            if (!data?.success || !data?.data) {
                throw new Error('Invalid API response');
            }
            const track = data.data;
            if (!track.download) {
                return sock.sendMessage(chatId, {
                    text: '❌ No downloadable audio found for this track.'
                }, { quoted: message });
            }
            const caption = [
                `🎵 *${track.title || 'Unknown Title'}*`,
                track.artist ? `👤 ${track.artist}` : '',
                track.duration ? `⏱ ${formatDuration(track.duration)}` : '',
                track.format ? `🎧 Format: ${track.format.toUpperCase()}` : ''
            ].filter(Boolean).join('\n');
            if (track.cover) {
                await sock.sendMessage(chatId, {
                    image: { url: track.cover },
                    caption
                }, { quoted: message });
            }
            else if (caption) {
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                audio: { url: track.download },
                mimetype: 'audio/mpeg',
                fileName: `${(track.title || 'track').replace(/[\\/:*?"<>|]/g, '')}.mp3`
            }, { quoted: message });
        }
        catch (error) {
            console.error('[SPOTIFY] error:', error.message);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to download track. Please check the URL and try again.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:spotify] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .spotify: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "sptfdl": async (h) => module.exports["spotify"](h),
    "spotifydl": async (h) => module.exports["spotify"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .dlstatus ─── Download quoted Status updates | usage: Reply to a status and type .dlstatus
    "dlstatus": async (h) => {
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
        rawText: (h.config.prefix + 'dlstatus ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const m = message.message;
        const type = Object.keys(m)[0];
        const contextInfo = m[type]?.contextInfo;
        if (!contextInfo || contextInfo.remoteJid !== 'status@broadcast') {
            return await sock.sendMessage(chatId, {
                text: "Please reply/quote a Status update to download it."
            }, { quoted: message });
        }
        const quotedMsg = contextInfo.quotedMessage;
        if (!quotedMsg)
            return;
        try {
            const quotedType = Object.keys(quotedMsg)[0];
            const mediaData = quotedMsg[quotedType];
            if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
                const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
                return await sock.sendMessage(chatId, { text: `📝 *Status Text:*\n\n${text}` }, { quoted: message });
            }
            const stream = await downloadContentFromMessage(mediaData, quotedType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            if (quotedType === 'imageMessage') {
                await sock.sendMessage(chatId, { image: buffer, caption: mediaData.caption || '' }, { quoted: message });
            }
            else if (quotedType === 'videoMessage') {
                await sock.sendMessage(chatId, { video: buffer, caption: mediaData.caption || '' }, { quoted: message });
            }
        }
        catch (e) {
            console.error('SW Download Error:', e);
            await sock.sendMessage(chatId, { text: "❌ Failed to download status media." }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:dlstatus] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .dlstatus: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "swdl": async (h) => module.exports["dlstatus"](h),
    "statusdl": async (h) => module.exports["dlstatus"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');

  return {

    // ── .terabox ─── Download files from TeraBox | usage: .terabox <terabox link>
    "terabox": async (h) => {
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
        rawText: (h.config.prefix + 'terabox ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const apiCallWithRetry = async (url, maxRetries = 3, baseDelay = 2000) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await wait(1000);
                    const response = await axios.get(url, {
                        timeout: 60000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    return response;
                }
                catch (error) {
                    const isRateLimited = error.response?.status === 429 ||
                        error.code === 'ECONNABORTED' ||
                        error.code === 'ETIMEDOUT';
                    if (attempt === maxRetries)
                        throw error;
                    if (isRateLimited) {
                        const delay = baseDelay * Math.pow(2, attempt - 1);
                        console.log(`Retrying in ${delay}ms... (${attempt}/${maxRetries})`);
                        await wait(delay);
                    }
                    else {
                        throw error;
                    }
                }
            }
        };
        const downloadFileWithProgress = async (url, filepath, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = await axios({
                        method: 'GET',
                        url,
                        responseType: 'arraybuffer', // Changed to arraybuffer for better stability
                        timeout: 600000, // 10 minutes
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://1024terabox.com/',
                            'Accept': '*/*',
                            'Connection': 'keep-alive'
                        }
                    });
                    fs.writeFileSync(filepath, response.data);
                    return true;
                }
                catch (error) {
                    console.error(`Download attempt ${attempt} failed:`, error.message);
                    if (attempt === maxRetries) {
                        throw error;
                    }
                    // Wait before retry
                    const delay = 2000 * attempt;
                    console.log(`Retrying download in ${delay}ms...`);
                    await wait(delay);
                }
            }
        };
        const isValidTeraBoxUrl = (url) => {
            return url.includes('terabox.com') ||
                url.includes('1024terabox.com') ||
                url.includes('teraboxapp.com') ||
                url.includes('terabox.app');
        };
        try {
            const url = args.join(' ').trim();
            if (!url) {
                return await sock.sendMessage(chatId, { text: '📦 *TeraBox Downloader*\n\nUsage:\n.terabox <terabox link>\n\nExample:\n.terabox https://1024terabox.com/s/xxxxx' }, { quoted: message });
            }
            if (!isValidTeraBoxUrl(url)) {
                return await sock.sendMessage(chatId, { text: '❌ *Invalid TeraBox link!*\n\nPlease provide a valid TeraBox URL.' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { text: '⏳ *Processing TeraBox link...*\n\nPlease wait, fetching file information...' }, { quoted: message });
            // Fetch file information
            const apiUrl = `https://api.qasimdev.dpdns.org/api/terabox/download?apiKey=qasim-dev&url=${encodeURIComponent(url)}`;
            const apiResponse = await apiCallWithRetry(apiUrl, 3, 3000);
            if (!apiResponse?.data?.success || !apiResponse.data?.data?.files || apiResponse?.data?.data?.files?.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ *Download failed!*\n\nNo files found or invalid link.' }, { quoted: message });
            }
            const fileData = apiResponse.data.data;
            const files = fileData.files;
            const totalFiles = fileData.totalFiles;
            // Process first file
            const file = files[0];
            const title = file.title;
            const size = file.size;
            const downloadUrl = file.downloadUrl;
            const fileType = file.type;
            // Show file info without thumbnail to avoid issues
            await sock.sendMessage(chatId, { text: `📦 *TeraBox File*\n\n📄 *Name:* ${title}\n📊 *Size:* ${size}\n📁 *Type:* ${fileType}\n📂 *Total Files:* ${totalFiles}\n\n⏳ *Downloading...*\nPlease wait, this may take a while for large files...` }, { quoted: message });
            // Create temp directory
            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const sanitizedTitle = title.replace(/[^a-z0-9.]/gi, '_').substring(0, 100);
            const filename = `${Date.now()}_${sanitizedTitle}`;
            const filePath = path.join(tempDir, filename);
            // Download file
            await downloadFileWithProgress(downloadUrl, filePath);
            // Check file size
            const stats = fs.statSync(filePath);
            const fileSizeInMB = stats.size / (1024 * 1024);
            // WhatsApp has file size limits
            if (fileSizeInMB > 100) {
                fs.unlinkSync(filePath);
                return await sock.sendMessage(chatId, { text: `❌ *File too large!*\n\n📄 *File:* ${title}\n📊 *Size:* ${size}\n\n⚠️ WhatsApp has a 100MB file limit.\nThis file is ${fileSizeInMB.toFixed(2)}MB.` }, { quoted: message });
            }
            // Determine file type and send accordingly
            const fileExtension = title.split('.').pop().toLowerCase();
            const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', '3gp'];
            const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'opus'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
            const fileBuffer = fs.readFileSync(filePath);
            if (videoExtensions.includes(fileExtension)) {
                // Send as video
                await sock.sendMessage(chatId, {
                    video: fileBuffer,
                    mimetype: 'video/mp4',
                    fileName: title,
                    caption: `✅ *Download Complete!*\n\n📄 *File:* ${title}\n📊 *Size:* ${size}\n\n> *_Downloaded from TeraBox_*`
                }, { quoted: message });
            }
            else if (audioExtensions.includes(fileExtension)) {
                // Send as audio
                await sock.sendMessage(chatId, {
                    audio: fileBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: title,
                    ptt: false
                }, { quoted: message });
                await sock.sendMessage(chatId, { text: `✅ *Download Complete!*\n\n📄 *File:* ${title}\n📊 *Size:* ${size}` }, { quoted: message });
            }
            else if (imageExtensions.includes(fileExtension)) {
                // Send as image
                await sock.sendMessage(chatId, {
                    image: fileBuffer,
                    caption: `✅ *Download Complete!*\n\n📄 *File:* ${title}\n📊 *Size:* ${size}`
                }, { quoted: message });
            }
            else {
                // Send as document
                await sock.sendMessage(chatId, {
                    document: fileBuffer,
                    mimetype: 'application/octet-stream',
                    fileName: title,
                    caption: `✅ *Download Complete!*\n\n📄 *File:* ${title}\n📊 *Size:* ${size}\n\n> *_Downloaded from TeraBox_*`
                }, { quoted: message });
            }
            // Clean up
            fs.unlinkSync(filePath);
            // If there are multiple files, notify user
            if (totalFiles > 1) {
                await sock.sendMessage(chatId, { text: `ℹ️ *Note:* This TeraBox link contains ${totalFiles} files.\nOnly the first file was downloaded.` }, { quoted: message });
            }
        }
        catch (error) {
            console.error('[TERABOX] Command Error:', error);
            let errorMsg = "❌ *Download failed!*\n\n";
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                errorMsg += "*Reason:* Timeout - File might be too large or connection is slow";
            }
            else if (error.code === 'ECONNRESET' || error.message?.includes('aborted')) {
                errorMsg += "*Reason:* Connection reset - The download was interrupted\nPlease try again.";
            }
            else if (error.response?.status === 429) {
                errorMsg += "*Reason:* Rate limit exceeded\nPlease wait a minute and try again.";
            }
            else if (error.response?.status === 403) {
                errorMsg += "*Reason:* Access forbidden - Link might be private or expired";
            }
            else if (error.response?.status === 404) {
                errorMsg += "*Reason:* File not found - Link might be invalid or deleted";
            }
            else {
                errorMsg += `*Error:* ${error.message || 'Unknown error'}`;
            }
            errorMsg += "\n\n💡 *Tips:*\n- Make sure the link is public\n- Check if the link hasn't expired\n- Try with smaller files first\n- Wait 10-15 seconds between requests";
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:terabox] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .terabox: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tera": async (h) => module.exports["terabox"](h),
    "tbox": async (h) => module.exports["terabox"](h),
    "tbdl": async (h) => module.exports["terabox"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .tiktok ─── Download TikTok video without watermark (HD if available) | usage: .tiktok <TikTok URL>
    "tiktok": async (h) => {
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
        rawText: (h.config.prefix + 'tiktok ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, rawText } = context;
        const prefix = rawText.match(/^[.!#]/)?.[0] || '.';
        const commandPart = rawText.slice(prefix.length).trim();
        const parts = commandPart.split(/\s+/);
        const url = parts.slice(1).join(' ').trim();
        if (!url) {
            return await sock.sendMessage(chatId, {
                text: '🎵 *TikTok Downloader*\n\nPlease provide a TikTok URL.\nExample:\n.tiktok https://vm.tiktok.com/XXXX'
            }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, {
                text: '⏳ Downloading TikTok video...'
            }, { quoted: message });
            const apiUrl = `https://discardapi.onrender.com/api/dl/tiktok?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!data?.status || !data?.result) {
                throw new Error('Invalid API response');
            }
            const res = data.result;
            const hd = res.data.find((v) => v.type === 'nowatermark_hd');
            const noWm = res.data.find((v) => v.type === 'nowatermark');
            const videoUrl = hd?.url || noWm?.url;
            if (!videoUrl) {
                throw new Error('No downloadable video found');
            }
            const caption = `🎵 *TikTok Downloader*
━━━━━━━━━━━━━━━━━━━
👤 *User:* ${res.author.nickname}
🆔 *Username:* ${res.author.fullname}
🌍 *Region:* ${res.region}
⏱️ *Duration:* ${res.duration}

❤️ *Likes:* ${res.stats.likes}
💬 *Comments:* ${res.stats.comment}
🔁 *Shares:* ${res.stats.share}
👀 *Views:* ${res.stats.views}

🎧 *Sound:* ${res.music_info.title}
📅 *Posted:* ${res.taken_at}

📝 *Caption:*
${res.title || 'No caption'}

✨ *Quality:* ${hd ? 'HD No Watermark' : 'No Watermark'}
━━━━━━━━━━━━━━━━━━━`;
            await sock.sendMessage(chatId, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption
            }, { quoted: message });
        }
        catch (error) {
            console.error('TikTok plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, {
                    text: '⏱️ Request timed out. Please try again later.'
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: `❌ Failed to download TikTok video.\nReason: ${error.message}`
                }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:tiktok] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tiktok: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tt": async (h) => module.exports["tiktok"](h),
    "ttdl": async (h) => module.exports["tiktok"](h),
    "tiktokdl": async (h) => module.exports["tiktok"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .twitter ─── Download media (video or image) from X/Twitter post | usage: .twitter <Tweet URL>
    "twitter": async (h) => {
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
        rawText: (h.config.prefix + 'twitter ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0];
        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a Twitter/X URL.\nExample: .twitter https://x.com/i/status/2002054360428167305' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/twitter?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result?.media?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No media found for this Tweet.' }, { quoted: message });
            }
            const tweet = data.result;
            const caption = `
📝 @${tweet.authorUsername} (${tweet.authorName})
📅 ${tweet.date}
❤️ Likes: ${tweet.likes} | 🔁 Retweets: ${tweet.retweets} | 💬 Replies: ${tweet.replies}

💬 ${tweet.text}
      `.trim();
            for (const mediaItem of tweet.media) {
                if (mediaItem.type === 'video') {
                    await sock.sendMessage(chatId, { video: { url: mediaItem.url }, caption }, { quoted: message });
                }
                else if (mediaItem.type === 'image') {
                    await sock.sendMessage(chatId, { image: { url: mediaItem.url }, caption }, { quoted: message });
                }
            }
        }
        catch (error) {
            console.error('Twitter plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch Twitter/X media.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:twitter] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .twitter: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "xtweet": async (h) => module.exports["twitter"](h),
    "tweetdl": async (h) => module.exports["twitter"](h),
    "twitterdl": async (h) => module.exports["twitter"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const yts = require('yt-search');
  // --- helper code from video.js ---
  const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
  const API_KEY = process.env.MUSIC_DL_API_KEY || 'xbps-install-Syu';
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const downloadWithRetry = async (url, retries = 3) => {
      for (let i = 0; i < retries; i++) {
          try {
              const { data } = await axios.get(DL_API, {
                  params: { apiKey: API_KEY, format: '360', url },
                  timeout: 120000
              });
              if (data?.data?.downloadUrl)
                  return data.data;
              throw new Error('No download URL');
          }
          catch (err) {
              if (i === retries - 1)
                  throw err;
              console.log(`Download attempt ${i + 1} failed, retrying in 5s...`);
              await wait(5000);
          }
      }
      throw new Error('All download attempts failed');
  };
  // ✅ NEW: try the self-hosted yt-dlp pipeline first (properly maintained,
  // updated on every deploy — see app.py's /internal/ytdl). Only fall back
  // to the third-party scraper above if that fails for any reason, so
  // nothing that worked before stops working.
  const downloadViaYtdlp = async (apiClient, url, mode = 'video') => {
    const { data } = await apiClient.post('/internal/ytdl', { url, mode }, { timeout: 50000 });
    if (!data?.success || !data.url) throw new Error(data?.error || 'yt-dlp had no result for that link');
    return { downloadUrl: data.url, title: data.title };
  };
  return {

    // ── .video ─── Download YouTube videos by link or search | usage: .video <youtube link | search query>
    "video": async (h) => {
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
        rawText: (h.config.prefix + 'video ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query)
            return sock.sendMessage(chatId, { text: '🎥 *What video do you want to download?*\nExample:\n.video Alan Walker Faded' }, { quoted: message });
        try {
            let videoUrl;
            let videoTitle;
            let videoThumbnail;
            if (query.startsWith('http://') || query.startsWith('https://')) {
                videoUrl = query;
            }
            else {
                const { videos } = await yts(query);
                if (!videos?.length)
                    return sock.sendMessage(chatId, { text: '❌ No videos found!' }, { quoted: message });
                videoUrl = videos[0].url;
                videoTitle = videos[0].title;
                videoThumbnail = videos[0].thumbnail;
            }
            const validYT = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
            if (!validYT)
                return sock.sendMessage(chatId, { text: '❌ Not a valid YouTube link!' }, { quoted: message });
            const ytId = validYT[1];
            const thumb = videoThumbnail || `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;
            await sock.sendMessage(chatId, {
                image: { url: thumb },
                caption: `🎬 *${videoTitle || query}*\n⬇️ Downloading... *(may take up to 30s)*`
            }, { quoted: message });
            const videoData = await downloadViaYtdlp(h.apiClient, videoUrl, 'video')
                .catch(async (ytErr) => {
                    console.log('[VIDEO] internal yt-dlp failed, falling back to scraper:', ytErr.message);
                    return downloadWithRetry(videoUrl);
                });
            await sock.sendMessage(chatId, {
                video: { url: videoData.downloadUrl },
                mimetype: 'video/mp4',
                fileName: `${videoData.title || videoTitle || 'video'}.mp4`,
                caption: `🎬 *${videoData.title || videoTitle || 'Video'}*\n\n> *_Downloaded by Henry Ochibots_*`
            }, { quoted: message });
        }
        catch (err) {
            console.error('[VIDEO] Error:', err.message);
            const reason = err.response?.status === 408
                ? 'Download timed out. Try again.'
                : err.message;
            await sock.sendMessage(chatId, { text: `❌ Download failed!\nReason: ${reason}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:video] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .video: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ytmp4": async (h) => module.exports["video"](h),
    "ytvideo": async (h) => module.exports["video"](h),
    "ytdl": async (h) => module.exports["video"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .vidsplay ─── Download video and thumbnail from Vidsplay | usage: .vidsplay <Vidsplay URL>
    "vidsplay": async (h) => {
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
        rawText: (h.config.prefix + 'vidsplay ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args?.[0];
        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a Vidsplay URL.\nExample: .vidsplay https://www.vidsplay.com/golf-free-stock-video/' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/dl/vidsplay?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No video found for this URL.' }, { quoted: message });
            }
            const videoUrl = data.result[0].video;
            const imageUrl = data.result[0].image;
            if (imageUrl) {
                await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: '🖼️ Vidsplay Thumbnail' }, { quoted: message });
            }
            if (videoUrl) {
                await sock.sendMessage(chatId, { video: { url: videoUrl }, caption: '🎬 Vidsplay Video' }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Vidsplay plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch Vidsplay video.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:vidsplay] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .vidsplay: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "vidsplaydl": async (h) => module.exports["vidsplay"](h),
    "vidsplayvideo": async (h) => module.exports["vidsplay"](h),
  };
})());

