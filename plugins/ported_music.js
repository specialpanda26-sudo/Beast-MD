// AUTO-PORTED from friend's MEGA-MD bot (category: music)
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

    // ── .lyrics ─── Get lyrics of a song along with artist and image | usage: .lyrics <song name>
    "lyrics": async (h) => {
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
        rawText: (h.config.prefix + 'lyrics ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const songTitle = args.join(' ').trim();
        if (!songTitle) {
            await sock.sendMessage(chatId, {
                text: '*Please enter the song name to get the lyrics!*\nUsage: `.lyrics <song name>`',
                quoted: message
            });
            return;
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(songTitle)}`;
            const res = await fetch(apiUrl);
            if (!res.ok)
                throw new Error(`API request failed with status ${res.status}`);
            const data = await res.json();
            const messageData = data?.result?.message;
            if (!messageData?.lyrics) {
                await sock.sendMessage(chatId, {
                    text: `❌ Sorry, I couldn't find any lyrics for "${songTitle}".`,
                    quoted: message
                });
                return;
            }
            const { artist, lyrics, image, title, url } = messageData;
            const maxChars = 4096;
            const lyricsOutput = lyrics.length > maxChars ? `${lyrics.slice(0, maxChars - 3) }...` : lyrics;
            const caption = `
🎵 *${title}*
👤 *Artist:* ${artist}
🔗 *URL:* ${url}

📝 *Lyrics:*
${lyricsOutput}
      `.trim();
            if (image) {
                await sock.sendMessage(chatId, {
                    image: { url: image },
                    caption,
                    quoted: message
                });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: caption,
                    quoted: message
                });
            }
        }
        catch (error) {
            console.error('Lyrics Command Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ An error occurred while fetching the lyrics for "${songTitle}".`,
                quoted: message
            });
        }
    
      } catch (portErr) {
        console.error('[ported:lyrics] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .lyrics: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "lyric": async (h) => module.exports["lyrics"](h),
    "songlyrics": async (h) => module.exports["lyrics"](h),
  };
})());


Object.assign(module.exports, (() => {
  const yts = require('yt-search');
  const axios = require('axios');
  // --- helper code from play.js ---
  const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
  const API_KEY = 'xbps-install-Syu';
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const downloadWithRetry = async (url, retries = 3) => {
      for (let i = 0; i < retries; i++) {
          try {
              const { data } = await axios.get(DL_API, {
                  params: { apiKey: API_KEY, format: 'mp3', url },
                  timeout: 90000
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
  // ✅ NEW: same self-hosted yt-dlp fallback chain as ported_download.js —
  // try the properly-maintained pipeline first, old scraper as backup only.
  const downloadAudioViaYtdlp = async (apiClient, url) => {
    const { data } = await apiClient.post('/internal/ytdl', { url, mode: 'audio' }, { timeout: 50000 });
    if (!data?.success || !data.url) throw new Error(data?.error || 'yt-dlp had no result for that link');
    return { downloadUrl: data.url, title: data.title };
  };
  return {

    // ── .play ─── Search and download a song as MP3 from YouTube | usage: .play <song name>
    "play": async (h) => {
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
        rawText: (h.config.prefix + 'play ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query)
            return sock.sendMessage(chatId, { text: '*Which song do you want to play?*\nUsage: .play <song name>' }, { quoted: message });
        try {
            await sock.sendMessage(chatId, { text: '🔍 *Searching...*' }, { quoted: message });
            const { videos } = await yts(query);
            if (!videos?.length)
                return sock.sendMessage(chatId, { text: '❌ *No results found!*' }, { quoted: message });
            const video = videos[0];
            await sock.sendMessage(chatId, {
                text: `✅ *Found:* ${video.title}\n⏱️ ${video.timestamp}\n👤 ${video.author.name}\n\n⏳ *Downloading... (this may take up to 30s)*`
            }, { quoted: message });
            const songData = await downloadAudioViaYtdlp(h.apiClient, video.url)
                .catch(async (ytErr) => {
                    console.log('[PLAY] internal yt-dlp failed, falling back to scraper:', ytErr.message);
                    return downloadWithRetry(video.url);
                });
            let thumbnailBuffer;
            try {
                const img = await axios.get(songData.thumbnail || video.thumbnail, { responseType: 'arraybuffer', timeout: 15000 });
                thumbnailBuffer = Buffer.from(img.data);
            }
            catch { /* no thumbnail */ }
            await sock.sendMessage(chatId, {
                audio: { url: songData.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${songData.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: songData.title,
                        body: `${video.author.name} • ${video.timestamp}`,
                        thumbnail: thumbnailBuffer,
                        mediaType: 2,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: message });
        }
        catch (err) {
            console.error('Play error:', err.message);
            const reason = err.response?.status === 408
                ? 'Download timed out. Try again in a moment.'
                : err.response?.status === 429
                    ? 'Rate limited. Wait a minute.'
                    : err.message;
            await sock.sendMessage(chatId, { text: `❌ *Failed:* ${reason}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:play] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .play: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "plays": async (h) => module.exports["play"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from ringtone.js ---
  /*****************************************************************************
   *                                                                           *
   *                     Developed By Qasim Ali                                *
   *                                                                           *
   *                                                                           *
   *                                                                           *
   *    Description: This file is part of the MEGA-MD Project.                 *
   *                 Unauthorized copying or distribution is prohibited.       *
   *                                                                           *
   *****************************************************************************/
  return {

    // ── .ringtone ─── Search and download ringtones | usage: .ringtone <search term>
    "ringtone": async (h) => {
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
        rawText: (h.config.prefix + 'ringtone ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const searchQuery = args.join(' ').trim();
        try {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, {
                    text: "*Which ringtone do you want to search?*\nUsage: .ringtone <name>\n\nExample: .ringtone Nokia"
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                text: "🔍 *Searching for ringtones...*"
            }, { quoted: message });
            await new Promise(resolve => setTimeout(resolve, 10000));
            const searchUrl = `https://discardapi.dpdns.org/api/dl/ringtone?apikey=guru&title=${encodeURIComponent(searchQuery)}`;
            const response = await axios.get(searchUrl, { timeout: 30000 });
            if (!response.data?.result || response.data.result.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: "❌ *No ringtones found!*\nTry a different search term."
                }, { quoted: message });
            }
            const ringtones = response.data.result;
            const totalFound = ringtones.length;
            const limit = Math.min(2, totalFound);
            for (let i = 0; i < limit; i++) {
                const audioUrl = ringtones[i].audio;
                try {
                    await sock.sendMessage(chatId, {
                        audio: { url: audioUrl },
                        mimetype: "audio/mpeg",
                        fileName: `${searchQuery}_${i + 1}.mp3`,
                        contextInfo: {
                            externalAdReply: {
                                title: `${searchQuery} Ringtone ${i + 1}`,
                                body: `Ringtone ${i + 1} of ${limit}`,
                                mediaType: 2,
                                thumbnail: null
                            }
                        }
                    }, { quoted: message });
                    if (i < limit - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                catch (sendError) {
                    console.error(`Failed to send ringtone ${i + 1}:`, sendError.message);
                    continue;
                }
            }
            await sock.sendMessage(chatId, {
                text: `✅ *Sent ${limit} ringtones!*\n\n${totalFound > limit ? `📊 *${totalFound - limit} more available*\nUse the same command again for different results.` : ''}`
            }, { quoted: message });
        }
        catch (error) {
            console.error('Ringtone Command Error:', error);
            let errorMsg = "❌ *Search failed!*\n\n";
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                errorMsg += "*Reason:* Connection timeout\nThe API took too long to respond.";
            }
            else if (error.response) {
                errorMsg += `*Status:* ${error.response.status}\n*Error:* ${error.response.statusText}`;
            }
            else {
                errorMsg += `*Error:* ${error.message}`;
            }
            errorMsg += "\n\nPlease try again later.";
            await sock.sendMessage(chatId, {
                text: errorMsg
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:ringtone] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .ringtone: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ring": async (h) => module.exports["ringtone"](h),
    "tone": async (h) => module.exports["ringtone"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .scloud ─── Search for tracks on SoundCloud | usage: .scloud <song name>
    "scloud": async (h) => {
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
        rawText: (h.config.prefix + 'scloud ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const searchQuery = args.join(' ').trim();
        try {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, {
                    text: "*What do you want to search on SoundCloud?*\nUsage: .soundcloud <song name>\n\nExample: .soundcloud never gonna give you up"
                }, { quoted: message });
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
            const searchUrl = `https://discardapi.dpdns.org/api/search/soundcloud?apikey=guru&query=${encodeURIComponent(searchQuery)}`;
            const response = await axios.get(searchUrl, { timeout: 30000 });
            if (!response.data?.result?.result || response.data.result.result.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: "❌ *No results found!*\nTry a different search term."
                }, { quoted: message });
            }
            const results = response.data.result.result;
            const totalFound = results.length;
            const tracks = results.filter((item) => item.kind === 'track');
            if (tracks.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: "❌ *No tracks found!*\nOnly found user profiles. Try searching for specific songs."
                }, { quoted: message });
            }
            const limit = Math.min(5, tracks.length);
            let resultText = `🎵 *SoundCloud Results*\n`;
            resultText += `📊 Found ${totalFound} results (${tracks.length} tracks)\n\n`;
            for (let i = 0; i < limit; i++) {
                const track = tracks[i];
                const duration = Math.floor(track.duration / 1000);
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                resultText += `*${i + 1}. ${track.title}*\n`;
                resultText += `👤 Artist: ${track.user_id ? 'Available' : 'Unknown'}\n`;
                resultText += `⏱️ Duration: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
                resultText += `👂 Plays: ${track.playback_count?.toLocaleString() || 'N/A'}\n`;
                resultText += `❤️ Likes: ${track.likes_count?.toLocaleString() || 'N/A'}\n`;
                resultText += `💬 Comments: ${track.comment_count?.toLocaleString() || 'N/A'}\n`;
                resultText += `🎼 Genre: ${track.genre || 'Unknown'}\n`;
                resultText += `🔗 Link: ${track.permalink_url}\n\n`;
            }
            if (tracks.length > limit) {
                resultText += `_+${tracks.length - limit} more tracks available_`;
            }
            const firstTrack = tracks[0];
            if (firstTrack.artwork_url) {
                try {
                    const imageBuffer = await axios.get(firstTrack.artwork_url, {
                        responseType: 'arraybuffer',
                        timeout: 15000
                    }).then(res => Buffer.from(res.data));
                    await sock.sendMessage(chatId, {
                        image: imageBuffer,
                        caption: resultText
                    }, { quoted: message });
                }
                catch (imgError) {
                    await sock.sendMessage(chatId, {
                        text: resultText
                    }, { quoted: message });
                }
            }
            else {
                await sock.sendMessage(chatId, {
                    text: resultText
                }, { quoted: message });
            }
        }
        catch (error) {
            console.error('SoundCloud Search Error:', error);
            let errorMsg = "❌ *Search failed!*\n\n";
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                errorMsg += "*Reason:* Connection timeout\nThe API took too long to respond.";
            }
            else if (error.response) {
                errorMsg += `*Status:* ${error.response.status}\n*Error:* ${error.response.statusText}`;
            }
            else {
                errorMsg += `*Error:* ${error.message}`;
            }
            errorMsg += "\n\nPlease try again later.";
            await sock.sendMessage(chatId, {
                text: errorMsg
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:scloud] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .scloud: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "scsearch": async (h) => module.exports["scloud"](h),
    "soundcloud": async (h) => module.exports["scloud"](h),
  };
})());


Object.assign(module.exports, (() => {
  const yts = require('yt-search');
  // --- helper code from ytsearch.js ---
  /*****************************************************************************
   *                                                                           *
   *                     Developed By Qasim Ali                                *
   *                                                                           *
   *                                                                           *
   *                                                                           *
   *    Description: This file is part of the MEGA-MD Project.                 *
   *                 Unauthorized copying or distribution is prohibited.       *
   *                                                                           *
   *****************************************************************************/
  return {

    // ── .ytsearch ─── Search YouTube | usage: .yts [query]
    "ytsearch": async (h) => {
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
        rawText: (h.config.prefix + 'ytsearch ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, config } = context;
        const query = args.join(' ');
        const prefix = config.prefix;
        if (!query) {
            return sock.sendMessage(chatId, {
                text: `Example: *${prefix}yts* Lil Peep`
            }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });
            const result = await yts(query);
            const videos = result.videos.slice(0, 10);
            if (videos.length === 0) {
                return sock.sendMessage(chatId, { text: '❌ No results found.' });
            }
            let searchText = `✨ *MUSIC SEARCH* ✨\n\n`;
            videos.forEach((v, index) => {
                searchText += `*${index + 1}.🎧 ${v.title}*\n`;
                searchText += `*⌚ Duration:* ${v.timestamp}\n`;
                searchText += `*👀 Views:* ${v.views}\n`;
                searchText += `*🔗 URL:* ${v.url}\n`;
                searchText += `──────────────────\n`;
            });
            await sock.sendMessage(chatId, {
                image: { url: videos[0].image },
                caption: searchText
            }, { quoted: message });
        }
        catch (error) {
            console.error('YouTube Search Error:', error);
            await sock.sendMessage(chatId, { text: '❌ Error searching YouTube.' });
        }
    
      } catch (portErr) {
        console.error('[ported:ytsearch] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .ytsearch: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "yts": async (h) => module.exports["ytsearch"](h),
    "playlist": async (h) => module.exports["ytsearch"](h),
    "playlista": async (h) => module.exports["ytsearch"](h),
  };
})());

