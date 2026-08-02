// Beast MD ported module (category: stickers)
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
  const { spawn } = require('child_process');
  const fs = require('fs');
  const { writeExifVid } = require('../lib_ported/exif.js');

  return {

    // ── .attp ─── Generate an animated sticker from text | usage: .attp <text>
    "attp": async (h) => {
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
        rawText: (h.config.prefix + 'attp ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ');
        if (!text) {
            return await sock.sendMessage(chatId, { text: 'Please provide text after the .attp command.' }, { quoted: message });
        }
        try {
            const mp4Buffer = await renderBlinkingVideoWithFfmpeg(text);
            const webpPath = await writeExifVid(mp4Buffer, { packname: 'Beast MD', author: '' });
            const webpBuffer = fs.readFileSync(webpPath);
            try {
                fs.unlinkSync(webpPath);
            }
            catch { }
            await sock.sendMessage(chatId, { sticker: webpBuffer }, { quoted: message });
        }
        catch {
            await sock.sendMessage(chatId, { text: '❌ Failed to generate the sticker locally.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:attp] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .attp: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "texts": async (h) => module.exports["attp"](h),
    "textsticker": async (h) => module.exports["attp"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const { exec } = require('child_process');
  const path = require('path');

  return {

    // ── .emojimix ─── Mix two emojis into a sticker | usage: .emojimix 😎+🥰
    "emojimix": async (h) => {
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
        rawText: (h.config.prefix + 'emojimix ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            if (!args[0]) {
                await sock.sendMessage(chatId, {
                    text: '🎴 Example: .emojimix 😎+🥰'
                }, { quoted: message });
                return;
            }
            if (!args[0].includes('+')) {
                await sock.sendMessage(chatId, {
                    text: '✳️ Separate the emoji with a *+* sign\n\n📌 Example:\n.emojimix 😎+🥰'
                }, { quoted: message });
                return;
            }
            const [emoji1, emoji2] = args[0].split('+').map((e) => e.trim());
            const url = `https://tenor.googleapis.com/v2/featured?` +
                `key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ` +
                `&contentfilter=high&media_filter=png_transparent` +
                `&component=proactive&collection=emoji_kitchen_v5` +
                `&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.results || data.results.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '❌ These emojis cannot be mixed! Try different ones.'
                }, { quoted: message });
                return;
            }
            const imageUrl = data.results[0].url;
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tempFile = path.join(tmpDir, `temp_${Date.now()}.png`).replace(/\\/g, '/');
            const outputFile = path.join(tmpDir, `sticker_${Date.now()}.webp`).replace(/\\/g, '/');
            const imageResponse = await fetch(imageUrl);
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            fs.writeFileSync(tempFile, buffer);
            const ffmpegCommand = `ffmpeg -i "${tempFile}" ` +
                `-vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,` +
                `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" ` +
                `"${outputFile}"`;
            await new Promise((resolve, reject) => {
                exec(ffmpegCommand, (error) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        reject(error);
                    }
                    else {
                        resolve(undefined);
                    }
                });
            });
            if (!fs.existsSync(outputFile)) {
                throw new Error('Sticker creation failed');
            }
            const stickerBuffer = fs.readFileSync(outputFile);
            await sock.sendMessage(chatId, {
                sticker: stickerBuffer
            }, { quoted: message });
            // Cleanup
            try {
                fs.unlinkSync(tempFile);
                fs.unlinkSync(outputFile);
            }
            catch (err) {
                console.error('Temp cleanup error:', err);
            }
        }
        catch (error) {
            console.error('Error in emojimix command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to mix emojis!\n\n' +
                    '📌 Example:\n.emojimix 😎+🥰'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:emojimix] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .emojimix: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "mixemoji": async (h) => module.exports["emojimix"](h),
    "emix": async (h) => module.exports["emojimix"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .gif ─── Get a GIF based on a search term | usage: .gif <search term>
    "gif": async (h) => {
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
        rawText: (h.config.prefix + 'gif ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const config = context.config;
        const query = args.join(' ');
        if (!query) {
            await sock.sendMessage(chatId, { text: 'Please provide a search term for the GIF.' }, { quoted: message });
            return;
        }
        try {
            const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
                params: {
                    api_key: config.giphyApiKey,
                    q: query,
                    limit: 1,
                    rating: 'g'
                }
            });
            const gifData = response.data.data[0];
            if (!gifData) {
                await sock.sendMessage(chatId, { text: 'No GIFs found for your search term.' }, { quoted: message });
                return;
            }
            const mp4Url = gifData.images.original_mp4?.mp4;
            if (mp4Url) {
                await sock.sendMessage(chatId, { video: { url: mp4Url }, caption: `Here is your GIF for "${query}"` }, { quoted: message });
            }
            else {
                const gifUrl = gifData.images.original?.url;
                await sock.sendMessage(chatId, { document: { url: gifUrl }, mimetype: 'image/gif', caption: `Here is your GIF for "${query}"` }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Error in gif command:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch GIF. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:gif] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gif: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "giphy": async (h) => module.exports["gif"](h),
    "searchgif": async (h) => module.exports["gif"](h),
  };
})());


Object.assign(module.exports, (() => {
  const config = require('../config_ported.js');
  const { igdl } = require('ruhend-scraper');
  const axios = require('axios');
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const webp = require('node-webpmux');
  const crypto = require('crypto');
  // --- helper code from igs.js ---
  async function convertBufferToStickerWebp(inputBuffer, isAnimated, cropSquare) {
      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir))
          fs.mkdirSync(tmpDir, { recursive: true });
      const tempInputBase = path.join(tmpDir, `igs_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      const tempInput = isAnimated ? `${tempInputBase}.mp4` : `${tempInputBase}.jpg`;
      const tempOutput = path.join(tmpDir, `igs_out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
      fs.writeFileSync(tempInput, inputBuffer);
      const filesToDelete = [];
      const scheduleDelete = (p) => {
          if (!p)
              return;
          filesToDelete.push(p);
          setTimeout(() => {
              try {
                  fs.unlinkSync(p);
              }
              catch { }
          }, 5000);
      };
      const vfCropSquareImg = "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512";
      const vfPadSquareImg = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000";
      let ffmpegCommand;
      if (isAnimated) {
          const isLargeVideo = inputBuffer.length > (5 * 1024 * 1024);
          if (cropSquare) {
              if (isLargeVideo) {
                  ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
              }
              else {
                  ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
              }
          }
          else {
              if (isLargeVideo) {
                  ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 35 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
              }
              else {
                  ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
              }
          }
      }
      else {
          const vf = `${cropSquare ? vfCropSquareImg : vfPadSquareImg},format=rgba`;
          ffmpegCommand = `ffmpeg -y -i "${tempInput}" -vf "${vf}" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 20 -compression_level 6 "${tempOutput}"`;
      }
      await new Promise((resolve, reject) => {
          exec(ffmpegCommand, (error) => {
              if (error)
                  return reject(error);
              resolve(undefined);
          });
      });
      let webpBuffer = fs.readFileSync(tempOutput);
      scheduleDelete(tempOutput);
      if (isAnimated && webpBuffer.length > 1000 * 1024) {
          try {
              const tempOutput2 = path.join(tmpDir, `igs_out2_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
              const harsherCmd = cropSquare
                  ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`
                  : `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 35 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`;
              await new Promise((resolve, reject) => {
                  exec(harsherCmd, (error) => error ? reject(error) : resolve(undefined));
              });
              if (fs.existsSync(tempOutput2)) {
                  webpBuffer = fs.readFileSync(tempOutput2);
                  scheduleDelete(tempOutput2);
              }
          }
          catch { }
      }
      const img = new webp.Image();
      await img.load(webpBuffer);
      const json = {
          'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
          'sticker-pack-name': config.packname || 'MegaBot',
          'emojis': ['📸']
      };
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
      const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);
      img.exif = exif;
      let finalBuffer = await img.save(null);
      if (finalBuffer.length > 900 * 1024) {
          try {
              const tempOutput3 = path.join(tmpDir, `igs_out3_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
              const vfSmall = cropSquare
                  ? `crop=min(iw\\,ih):min(iw\\,ih),scale=320:320${isAnimated ? ',fps=8' : ''}`
                  : `scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000${isAnimated ? ',fps=8' : ''}`;
              const cmdSmall = `ffmpeg -y -i "${tempInput}" ${isAnimated ? '-t 2' : ''} -vf "${vfSmall}" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality ${isAnimated ? 28 : 65} -compression_level 6 -b:v 80k -max_muxing_queue_size 1024 "${tempOutput3}"`;
              await new Promise((resolve, reject) => {
                  exec(cmdSmall, (error) => error ? reject(error) : resolve(undefined));
              });
              if (fs.existsSync(tempOutput3)) {
                  const smallWebp = fs.readFileSync(tempOutput3);
                  const img2 = new webp.Image();
                  await img2.load(smallWebp);
                  const json2 = {
                      'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                      'sticker-pack-name': config.packname || 'MegaBot',
                      'emojis': ['📸']
                  };
                  const exifAttr2 = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                  const jsonBuffer2 = Buffer.from(JSON.stringify(json2), 'utf8');
                  const exif2 = Buffer.concat([exifAttr2, jsonBuffer2]);
                  exif2.writeUIntLE(jsonBuffer2.length, 14, 4);
                  img2.exif = exif2;
                  finalBuffer = await img2.save(null);
                  scheduleDelete(tempOutput3);
              }
          }
          catch { }
      }
      scheduleDelete(tempInput);
      return finalBuffer;
  }
  async function fetchBufferFromUrl(url) {
      try {
          const res = await axios.get(url, {
              responseType: 'arraybuffer',
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': '*/*',
                  'Accept-Encoding': 'identity'
              },
              timeout: 30000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              decompress: true,
              validateStatus: s => s >= 200 && s < 400
          });
          return Buffer.from(res.data);
      }
      catch (e1) {
          try {
              const res = await axios.get(url, {
                  responseType: 'stream',
                  headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                      'Accept': '*/*',
                      'Accept-Encoding': 'identity'
                  },
                  timeout: 40000,
                  maxContentLength: Infinity,
                  maxBodyLength: Infinity,
                  validateStatus: s => s >= 200 && s < 400
              });
              const chunks = [];
              await new Promise((resolve, reject) => {
                  res.data.on('data', (c) => chunks.push(c));
                  res.data.on('end', resolve);
                  res.data.on('error', reject);
              });
              return Buffer.concat(chunks);
          }
          catch (e2) {
              console.error('Both axios download attempts failed:', e1?.message || e1, e2?.message || e2);
              throw e2;
          }
      }
  }
  async function forceMiniSticker(inputBuffer, isVideo, cropSquare) {
      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir))
          fs.mkdirSync(tmpDir, { recursive: true });
      const tempInput = path.join(tmpDir, `mini_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
      const tempOutput = path.join(tmpDir, `mini_out_${Date.now()}.webp`);
      fs.writeFileSync(tempInput, inputBuffer);
      const vf = cropSquare
          ? `crop=min(iw\\,ih):min(iw\\,ih),scale=256:256${isVideo ? ',fps=6' : ''}`
          : `scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=#00000000${isVideo ? ',fps=6' : ''}`;
      const cmd = `ffmpeg -y -i "${tempInput}" ${isVideo ? '-t 2' : ''} -vf "${vf}" -c:v libwebp -preset default -loop 0 -pix_fmt yuva420p -quality 10 -compression_level 6 -b:v 40k "${tempOutput}"`;
      await new Promise((resolve, reject) => {
          exec(cmd, (error) => error ? reject(error) : resolve(undefined));
      });
      if (!fs.existsSync(tempOutput)) {
          try {
              fs.unlinkSync(tempInput);
          }
          catch { }
          return null;
      }
      const smallWebp = fs.readFileSync(tempOutput);
      const img = new webp.Image();
      await img.load(smallWebp);
      const json = {
          'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
          'sticker-pack-name': config.packname || 'MegaBot',
          'emojis': ['📸']
      };
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
      const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);
      img.exif = exif;
      const finalBuffer = await img.save(null);
      try {
          fs.unlinkSync(tempInput);
      }
      catch { }
      try {
          fs.unlinkSync(tempOutput);
      }
      catch { }
      return finalBuffer;
  }
  return {

    // ── .igs ─── Convert Instagram post/reel to sticker | usage: .igs <instagram URL>
    "igs": async (h) => {
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
        rawText: (h.config.prefix + 'igs ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
            const urlMatch = text.match(/https?:\/\/\S+/);
            if (!urlMatch) {
                await sock.sendMessage(chatId, {
                    text: `Send an Instagram post/reel link.\nUsage: .igs <url>`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            const downloadData = await igdl(urlMatch[0]).catch(() => null);
            if (!downloadData || !downloadData.data) {
                await sock.sendMessage(chatId, {
                    text: '❌ Failed to fetch media from Instagram link.',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const rawItems = (downloadData?.data || []).filter((m) => m && m.url);
            const seenUrls = new Set();
            const items = [];
            for (const m of rawItems) {
                if (!seenUrls.has(m.url)) {
                    seenUrls.add(m.url);
                    items.push(m);
                }
            }
            if (items.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '❌ No media found at the provided link.',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const maxItems = Math.min(items.length, 10);
            const seenHashes = new Set();
            for (let i = 0; i < maxItems; i++) {
                try {
                    const media = items[i];
                    const mediaUrl = media.url;
                    const isVideo = (media?.type === 'video') || /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl);
                    const buffer = await fetchBufferFromUrl(mediaUrl);
                    const { createHash } = await import('crypto');
                    const hash = createHash('sha1').update(buffer).digest('hex');
                    if (seenHashes.has(hash)) {
                        continue;
                    }
                    seenHashes.add(hash);
                    let finalSticker = await forceMiniSticker(buffer, isVideo, false);
                    if (!finalSticker)
                        finalSticker = await convertBufferToStickerWebp(buffer, isVideo, false);
                    await sock.sendMessage(chatId, {
                        sticker: finalSticker,
                        ...channelInfo
                    }, { quoted: message });
                    if (i < maxItems - 1) {
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
                catch (perItemErr) {
                    console.error('IGS item error:', perItemErr);
                }
            }
        }
        catch (err) {
            console.error('Error in igs command:', err);
            await sock.sendMessage(chatId, {
                text: 'Failed to create sticker from Instagram link.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:igs] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .igs: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "igsticker": async (h) => module.exports["igs"](h),
    "instasticker": async (h) => module.exports["igs"](h),
  };
})());


Object.assign(module.exports, (() => {
  const config = require('../config_ported.js');
  const { igdl } = require('ruhend-scraper');
  const axios = require('axios');
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const webp = require('node-webpmux');
  const crypto = require('crypto');
  const { stickercropFromBuffer } = require('../lib_ported/stickercrop.js');
  // --- helper code from igsc.js ---
  async function _convertBufferToStickerWebp(inputBuffer, isAnimated, cropSquare) {
      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir))
          fs.mkdirSync(tmpDir, { recursive: true });
      const tempInputBase = path.join(tmpDir, `igs_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      const tempInput = isAnimated ? `${tempInputBase}.mp4` : `${tempInputBase}.jpg`;
      const tempOutput = path.join(tmpDir, `igs_out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
      fs.writeFileSync(tempInput, inputBuffer);
      const scheduleDelete = (p) => {
          if (!p)
              return;
          setTimeout(() => {
              try {
                  fs.unlinkSync(p);
              }
              catch { }
          }, 5000);
      };
      const vfCropSquareImg = "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512";
      const vfPadSquareImg = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000";
      let ffmpegCommand;
      if (isAnimated) {
          const isLargeVideo = inputBuffer.length > (5 * 1024 * 1024);
          if (cropSquare) {
              ffmpegCommand = isLargeVideo
                  ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`
                  : `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
          }
          else {
              ffmpegCommand = isLargeVideo
                  ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 35 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`
                  : `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
          }
      }
      else {
          const vf = `${cropSquare ? vfCropSquareImg : vfPadSquareImg},format=rgba`;
          ffmpegCommand = `ffmpeg -y -i "${tempInput}" -vf "${vf}" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 40 -compression_level 6 "${tempOutput}"`;
      }
      await new Promise((resolve, reject) => {
          exec(ffmpegCommand, (error) => error ? reject(error) : resolve(undefined));
      });
      const webpBuffer = fs.readFileSync(tempOutput);
      scheduleDelete(tempOutput);
      scheduleDelete(tempInput);
      const img = new webp.Image();
      await img.load(webpBuffer);
      const json = {
          'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
          'sticker-pack-name': config.packname || 'MegaBot',
          'emojis': ['📸']
      };
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
      const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);
      img.exif = exif;
      return await img.save(null);
  }
  async function fetchBufferFromUrl(url) {
      try {
          const res = await axios.get(url, {
              responseType: 'arraybuffer',
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': '*/*'
              },
              timeout: 30000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity
          });
          return Buffer.from(res.data);
      }
      catch (e) {
          throw e;
      }
  }
  return {

    // ── .igsc ─── Convert Instagram post/reel to cropped sticker | usage: .igsc <instagram URL>
    "igsc": async (h) => {
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
        rawText: (h.config.prefix + 'igsc ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
            const urlMatch = text.match(/https?:\/\/\S+/);
            if (!urlMatch) {
                await sock.sendMessage(chatId, {
                    text: `Send an Instagram post/reel link.\nUsage: .igsc <url>`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            const downloadData = await igdl(urlMatch[0]).catch(() => null);
            if (!downloadData || !downloadData.data) {
                await sock.sendMessage(chatId, {
                    text: '❌ Failed to fetch media from Instagram link.',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const rawItems = (downloadData?.data || []).filter((m) => m && m.url);
            const seenUrls = new Set();
            const items = [];
            for (const m of rawItems) {
                if (!seenUrls.has(m.url)) {
                    seenUrls.add(m.url);
                    items.push(m);
                }
            }
            if (items.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '❌ No media found at the provided link.',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const maxItems = Math.min(items.length, 10);
            const seenHashes = new Set();
            for (let i = 0; i < maxItems; i++) {
                try {
                    const media = items[i];
                    const mediaUrl = media.url;
                    const isVideo = (media?.type === 'video') || /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl);
                    const buffer = await fetchBufferFromUrl(mediaUrl);
                    const { createHash } = await import('crypto');
                    const hash = createHash('sha1').update(buffer).digest('hex');
                    if (seenHashes.has(hash))
                        continue;
                    seenHashes.add(hash);
                    const stickerBuffer = await stickercropFromBuffer(buffer, isVideo);
                    await sock.sendMessage(chatId, {
                        sticker: stickerBuffer,
                        ...channelInfo
                    }, { quoted: message });
                    if (i < maxItems - 1) {
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
                catch (perItemErr) {
                    console.error('IGSC item error:', perItemErr);
                }
            }
        }
        catch (err) {
            console.error('Error in igsc command:', err);
            await sock.sendMessage(chatId, {
                text: 'Failed to create cropped sticker from Instagram link.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:igsc] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .igsc: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "igstickercrop": async (h) => module.exports["igsc"](h),
    "instacrop": async (h) => module.exports["igsc"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const { Sticker, StickerTypes } = require('wa-sticker-formatter');

  return {

    // ── .quoted ─── Generate a quote sticker from text | usage: .quote <text> or reply to a message
    "quoted": async (h) => {
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
        rawText: (h.config.prefix + 'quoted ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        let text = args.join(' ').trim();
        if (!text) {
            const q = ctx?.quotedMessage;
            if (!q)
                return sock.sendMessage(chatId, { text: '📝 Please provide text or reply to a message.\n\nUsage: .quote <text>' }, { quoted: message });
            text = q.conversation
                || q.extendedTextMessage?.text
                || q.imageMessage?.caption
                || q.videoMessage?.caption
                || 'Media message';
        }
        const who = ctx?.participant
            || ctx?.mentionedJid?.[0]
            || message.key.participant
            || message.key.remoteJid;
        const [userPfp, contactInfo] = await Promise.allSettled([
            sock.profilePictureUrl(who, 'image'),
            sock.onWhatsApp(who)
        ]);
        const pfp = userPfp.status === 'fulfilled'
            ? userPfp.value
            : 'https://i.ibb.co/9HY4wjz/a4c0b1af253197d4837ff6760d5b81c0.jpg';
        const contactValue = contactInfo.status === 'fulfilled' ? contactInfo.value : null;
        // Try multiple sources for name
        const storeContact = sock.store?.contacts?.[who];
        const userName = storeContact?.name
            || storeContact?.notify
            || contactValue?.[0]?.notify
            || (who.includes('@s.whatsapp.net') ? `+${ who.replace('@s.whatsapp.net', '')}` : 'User');
        try {
            const res = await axios.post('https://bot.lyo.su/quote/generate', {
                type: 'quote',
                format: 'png',
                backgroundColor: '#FFFFFF',
                width: 1800,
                height: 200,
                scale: 2,
                messages: [{
                        entities: [],
                        avatar: true,
                        from: { id: 1, name: userName, photo: { url: pfp } },
                        text,
                        replyMessage: {}
                    }]
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            if (!res.data?.result?.image)
                throw new Error('Invalid API response');
            const bufferImage = Buffer.from(res.data.result.image, 'base64');
            try {
                const stickerBuffer = await new Sticker(bufferImage, {
                    pack: 'Beast MD',
                    author: userName,
                    type: StickerTypes.FULL,
                    categories: ['🤩', '🎉'],
                    quality: 100,
                    background: '#00000000'
                }).toBuffer();
                await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: message });
            }
            catch {
                await sock.sendMessage(chatId, { image: bufferImage, caption: '📝 Quote image (sticker conversion failed)' }, { quoted: message });
            }
        }
        catch (err) {
            console.error('Quote plugin error:', err);
            const msg = err.message.includes('timeout')
                ? 'Request timed out.'
                : err.message.includes('Invalid API')
                    ? 'API returned invalid data.'
                    : 'Please try again later.';
            await sock.sendMessage(chatId, { text: `❌ Failed to generate quote. ${msg}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:quoted] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .quoted: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "q": async (h) => module.exports["quoted"](h),
    "fakereply": async (h) => module.exports["quoted"](h),
  };
})());


Object.assign(module.exports, (() => {
  const sharp = require('sharp');
  const fs = require('fs');
  const fsPromises = require('fs/promises');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  // --- helper code from simage.js ---
  const tempDir = './temp';
  if (!fs.existsSync(tempDir))
      fs.mkdirSync(tempDir);
  const scheduleFileDeletion = (filePath) => {
      setTimeout(async () => {
          try {
              await fsPromises.unlink(filePath);
              console.log(`File deleted: ${filePath}`);
          }
          catch (error) {
              console.error(`Failed to delete file:`, error);
          }
      }, 10000); // 10 seconds
  };
  return {

    // ── .s2img ─── Convert a sticker to an image | usage: .s2img (reply to a sticker)
    "s2img": async (h) => {
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
        rawText: (h.config.prefix + 's2img ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMessage?.stickerMessage) {
                await sock.sendMessage(chatId, { text: '⚠️ Reply to a sticker with .simage to convert it.' }, { quoted: message });
                return;
            }
            const stickerFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);
            const outputImagePath = path.join(tempDir, `converted_image_${Date.now()}.png`);
            const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream)
                buffer = Buffer.concat([buffer, chunk]);
            await fsPromises.writeFile(stickerFilePath, buffer);
            await sharp(stickerFilePath).toFormat('png').toFile(outputImagePath);
            const imageBuffer = await fsPromises.readFile(outputImagePath);
            await sock.sendMessage(chatId, { image: imageBuffer, caption: '✨ Here is the converted image!' }, { quoted: message });
            scheduleFileDeletion(stickerFilePath);
            scheduleFileDeletion(outputImagePath);
        }
        catch (error) {
            console.error('SImage Command Error:', error);
            await sock.sendMessage(chatId, { text: '❌ An error occurred while converting the sticker.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:s2img] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .s2img: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "simage": async (h) => module.exports["s2img"](h),
    "stoimg": async (h) => module.exports["s2img"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const webp = require('node-webpmux');
  const crypto = require('crypto');

  return {

    // ── .sticker2 ─── Convert image/video to sticker | usage: .sticker2 (reply to image/video or send with caption)
    "sticker2": async (h) => {
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
        rawText: (h.config.prefix + 'sticker2 ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, config, channelInfo } = context;
        const messageToQuote = message;
        let targetMessage = message;
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedInfo = message.message.extendedTextMessage.contextInfo;
            targetMessage = {
                key: {
                    remoteJid: chatId,
                    id: quotedInfo.stanzaId,
                    participant: quotedInfo.participant
                },
                message: quotedInfo.quotedMessage
            };
        }
        const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.documentMessage;
        if (!mediaMessage) {
            await sock.sendMessage(chatId, {
                text: 'Please reply to an image/video with .sticker2, or send an image/video with .sticker2 as the caption.',
                ...channelInfo
            }, { quoted: messageToQuote });
            return;
        }
        try {
            const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
                logger: undefined,
                reuploadRequest: sock.updateMediaMessage
            });
            if (!mediaBuffer) {
                await sock.sendMessage(chatId, {
                    text: 'Failed to download media. Please try again.',
                    ...channelInfo
                }, { quoted: messageToQuote });
                return;
            }
            const tmpDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tempInput = path.join(tmpDir, `temp_${Date.now()}`);
            const tempOutput = path.join(tmpDir, `sticker_${Date.now()}.webp`);
            fs.writeFileSync(tempInput, mediaBuffer);
            const isAnimated = mediaMessage.mimetype?.includes('gif') ||
                mediaMessage.mimetype?.includes('video') ||
                mediaMessage.seconds > 0;
            const ffmpegCommand = isAnimated
                ? `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`
                : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
            await new Promise((resolve, reject) => {
                exec(ffmpegCommand, (error) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        reject(error);
                    }
                    else
                        resolve(undefined);
                });
            });
            let webpBuffer = fs.readFileSync(tempOutput);
            if (isAnimated && webpBuffer.length > 1000 * 1024) {
                try {
                    const tempOutput2 = path.join(tmpDir, `sticker_fallback_${Date.now()}.webp`);
                    const fileSizeKB = mediaBuffer.length / 1024;
                    const isLargeFile = fileSizeKB > 5000;
                    const fallbackCmd = isLargeFile
                        ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`
                        : `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput2}"`;
                    await new Promise((resolve, reject) => {
                        exec(fallbackCmd, (error) => error ? reject(error) : resolve(undefined));
                    });
                    if (fs.existsSync(tempOutput2)) {
                        webpBuffer = fs.readFileSync(tempOutput2);
                        try {
                            fs.unlinkSync(tempOutput2);
                        }
                        catch { }
                    }
                }
                catch { }
            }
            const img = new webp.Image();
            await img.load(webpBuffer);
            const json = {
                'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                'sticker-pack-name': config.packname || 'Beast MD',
                'emojis': ['🤖']
            };
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);
            img.exif = exif;
            let finalBuffer = await img.save(null);
            if (isAnimated && finalBuffer.length > 900 * 1024) {
                try {
                    const tempOutput3 = path.join(tmpDir, `sticker_small_${Date.now()}.webp`);
                    const smallCmd = `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=320:320:force_original_aspect_ratio=decrease,fps=8,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 80k -max_muxing_queue_size 1024 "${tempOutput3}"`;
                    await new Promise((resolve, reject) => {
                        exec(smallCmd, (error) => error ? reject(error) : resolve(undefined));
                    });
                    if (fs.existsSync(tempOutput3)) {
                        const smallWebp = fs.readFileSync(tempOutput3);
                        const img2 = new webp.Image();
                        await img2.load(smallWebp);
                        const json2 = {
                            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                            'sticker-pack-name': config.packname || 'Beast MD',
                            'emojis': ['🤖']
                        };
                        const exifAttr2 = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                        const jsonBuffer2 = Buffer.from(JSON.stringify(json2), 'utf8');
                        const exif2 = Buffer.concat([exifAttr2, jsonBuffer2]);
                        exif2.writeUIntLE(jsonBuffer2.length, 14, 4);
                        img2.exif = exif2;
                        finalBuffer = await img2.save(null);
                        try {
                            fs.unlinkSync(tempOutput3);
                        }
                        catch { }
                    }
                }
                catch { }
            }
            await sock.sendMessage(chatId, {
                sticker: finalBuffer,
                ...channelInfo
            }, { quoted: messageToQuote });
            try {
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
            }
            catch (err) {
                console.error('Error cleaning up temp files:', err);
            }
        }
        catch (error) {
            console.error('Error in sticker command:', error);
            await sock.sendMessage(chatId, {
                text: 'Failed to create sticker! Try again later.',
                ...channelInfo
            }, { quoted: messageToQuote });
        }
    
      } catch (portErr) {
        console.error('[ported:sticker2] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sticker2: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "s2": async (h) => module.exports["sticker2"](h),
    "stik2": async (h) => module.exports["sticker2"](h),
  };
})());


Object.assign(module.exports, (() => {
  const config = require('../config_ported.js');
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const webp = require('node-webpmux');
  const crypto = require('crypto');
  // --- helper code from stickercrop.js ---
  async function stickercropFromBuffer(inputBuffer, isAnimated) {
      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir))
          fs.mkdirSync(tmpDir, { recursive: true });
      const tempInput = path.join(tmpDir, `cropbuf_${Date.now()}`);
      const tempOutput = path.join(tmpDir, `cropbuf_out_${Date.now()}.webp`);
      fs.writeFileSync(tempInput, inputBuffer);
      const fileSizeKB = inputBuffer.length / 1024;
      const isLargeFile = fileSizeKB > 5000;
      let ffmpegCommand;
      if (isAnimated) {
          if (isLargeFile) {
              ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
          }
          else {
              ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
          }
      }
      else {
          ffmpegCommand = `ffmpeg -y -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=256:256" -c:v libwebp -quality 15 -compression_level 6 "${tempOutput}"`;
      }
      await new Promise((resolve, reject) => {
          exec(ffmpegCommand, (error) => {
              if (error)
                  return reject(error);
              resolve(undefined);
          });
      });
      const webpBuffer = fs.readFileSync(tempOutput);
      const img = new webp.Image();
      await img.load(webpBuffer);
      const json = {
          'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
          'sticker-pack-name': config.packname || 'Beast MD',
          'emojis': ['✂️']
      };
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
      const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);
      img.exif = exif;
      const finalBuffer = await img.save(null);
      try {
          fs.unlinkSync(tempInput);
          fs.unlinkSync(tempOutput);
      }
      catch { }
      return finalBuffer;
  }
  return {

    // ── .crop ─── Crop image/video/sticker to circle sticker | usage: .crop (reply to image/video/sticker)
    "crop": async (h) => {
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
        rawText: (h.config.prefix + 'crop ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const messageToQuote = message;
        let targetMessage = message;
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedInfo = message.message.extendedTextMessage.contextInfo;
            targetMessage = {
                key: {
                    remoteJid: chatId,
                    id: quotedInfo.stanzaId,
                    participant: quotedInfo.participant
                },
                message: quotedInfo.quotedMessage
            };
        }
        const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.documentMessage || targetMessage.message?.stickerMessage;
        if (!mediaMessage) {
            await sock.sendMessage(chatId, {
                text: 'Please reply to an image/video/sticker with .crop, or send an image/video/sticker with .crop as the caption.',
                ...channelInfo
            }, { quoted: messageToQuote });
            return;
        }
        try {
            const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
                logger: undefined,
                reuploadRequest: sock.updateMediaMessage
            });
            if (!mediaBuffer) {
                await sock.sendMessage(chatId, {
                    text: 'Failed to download media. Please try again.',
                    ...channelInfo
                }, { quoted: messageToQuote });
                return;
            }
            const tmpDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tempInput = path.join(tmpDir, `temp_${Date.now()}`);
            const tempOutput = path.join(tmpDir, `crop_${Date.now()}.webp`);
            fs.writeFileSync(tempInput, mediaBuffer);
            const isAnimated = mediaMessage.mimetype?.includes('gif') ||
                mediaMessage.mimetype?.includes('video') ||
                mediaMessage.seconds > 0;
            const fileSizeKB = mediaBuffer.length / 1024;
            const isLargeFile = fileSizeKB > 5000;
            let ffmpegCommand;
            if (isAnimated) {
                if (isLargeFile) {
                    ffmpegCommand = `ffmpeg -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
                }
                else {
                    ffmpegCommand = `ffmpeg -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
                }
            }
            else {
                ffmpegCommand = `ffmpeg -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
            }
            await new Promise((resolve, reject) => {
                exec(ffmpegCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        console.error('FFmpeg stderr:', stderr);
                        reject(error);
                    }
                    else {
                        console.log('FFmpeg stdout:', stdout);
                        resolve(undefined);
                    }
                });
            });
            if (!fs.existsSync(tempOutput)) {
                throw new Error('FFmpeg failed to create output file');
            }
            const outputStats = fs.statSync(tempOutput);
            if (outputStats.size === 0) {
                throw new Error('FFmpeg created empty output file');
            }
            const webpBuffer = fs.readFileSync(tempOutput);
            const finalSizeKB = webpBuffer.length / 1024;
            console.log(`Final sticker size: ${Math.round(finalSizeKB)} KB`);
            if (finalSizeKB > 1000) {
                console.log(`⚠️ Warning: Sticker size (${Math.round(finalSizeKB)} KB) exceeds recommended limit but will be sent anyway`);
            }
            const img = new webp.Image();
            await img.load(webpBuffer);
            const json = {
                'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                'sticker-pack-name': config.packname || 'MegaBot',
                'emojis': ['✂️']
            };
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);
            img.exif = exif;
            const finalBuffer = await img.save(null);
            await sock.sendMessage(chatId, {
                sticker: finalBuffer,
                ...channelInfo
            }, { quoted: messageToQuote });
            try {
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
            }
            catch (err) {
                console.error('Error cleaning up temp files:', err);
            }
        }
        catch (error) {
            console.error('Error in stickercrop command:', error);
            await sock.sendMessage(chatId, {
                text: 'Failed to crop sticker! Try with an image.',
                ...channelInfo
            }, { quoted: messageToQuote });
        }
    
      } catch (portErr) {
        console.error('[ported:crop] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .crop: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "stickercrop": async (h) => module.exports["crop"](h),
    "scrop": async (h) => module.exports["crop"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .stickers ─── Search for stickers using Tenor | usage: .stickers <search term>
    "stickers": async (h) => {
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
        rawText: (h.config.prefix + 'stickers ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args?.join(' ')?.trim();
        if (!text) {
            return await sock.sendMessage(chatId, { text: '*Provide a search term.*\nExample: .stickers funny' }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, { text: 'Searching for stickers...' }, { quoted: message });
            const { data } = await axios.get(`https://g.tenor.com/v1/search?q=${encodeURIComponent(text)}&key=LIVDSRZULELA&limit=8`);
            if (!data?.results?.length) {
                return await sock.sendMessage(chatId, { text: '❌ No stickers found.' }, { quoted: message });
            }
            const limit = Math.min(data.results.length, 5);
            for (let i = 0; i < limit; i++) {
                const media = data.results[i].media?.[0]?.mp4?.url;
                if (!media)
                    continue;
                await sock.sendMessage(chatId, { video: { url: media }, caption: `Sticker ${i + 1}`, mimetype: 'video/mp4' }, { quoted: message });
            }
        }
        catch (error) {
            console.error('StickerSearch plugin error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch stickers.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:stickers] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .stickers: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "stickersearch": async (h) => module.exports["stickers"](h),
    "ssticker": async (h) => module.exports["stickers"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const path = require('path');
  const webp = require('node-webpmux');
  const crypto = require('crypto');
  const { exec } = require('child_process');
  // --- helper code from stickertelegram.js ---
  const delay = (time) => new Promise(res => setTimeout(res, time));
  return {

    // ── .tgstk ─── Download stickers from Telegram | usage: .tgstk <telegram sticker URL>
    "tgstk": async (h) => {
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
        rawText: (h.config.prefix + 'tgstk ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, config, channelInfo } = context;
        try {
            if (!args[0]) {
                await sock.sendMessage(chatId, {
                    text: '⚠️ Please enter the Telegram sticker URL!\n\nExample: .tgstk https://t.me/addstickers/Porcientoreal',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            if (!args[0].match(/(https:\/\/t.me\/addstickers\/)/gi)) {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid URL! Make sure it\'s a Telegram sticker URL.',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const packName = args[0].replace("https://t.me/addstickers/", "");
            const botToken = '7801479976:AAGuPL0a7kXXBYz6XUSR_ll2SR5V_W6oHl4';
            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/getStickerSet?name=${encodeURIComponent(packName)}`, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0"
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const stickerSet = await response.json();
                if (!stickerSet.ok || !stickerSet.result) {
                    throw new Error('Invalid sticker pack or API response');
                }
                await sock.sendMessage(chatId, {
                    text: `📦 Found ${stickerSet.result.stickers.length} stickers\n⏳ Starting download...`,
                    ...channelInfo
                }, { quoted: message });
                const tmpDir = path.join(process.cwd(), 'temp');
                if (!fs.existsSync(tmpDir)) {
                    fs.mkdirSync(tmpDir, { recursive: true });
                }
                let successCount = 0;
                for (let i = 0; i < stickerSet.result.stickers.length; i++) {
                    try {
                        const sticker = stickerSet.result.stickers[i];
                        const fileId = sticker.file_id;
                        const fileInfo = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                        if (!fileInfo.ok)
                            continue;
                        const fileData = await fileInfo.json();
                        if (!fileData.ok || !fileData.result.file_path)
                            continue;
                        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                        const imageResponse = await fetch(fileUrl);
                        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                        const tempInput = path.join(tmpDir, `temp_${Date.now()}_${i}`);
                        const tempOutput = path.join(tmpDir, `sticker_${Date.now()}_${i}.webp`);
                        fs.writeFileSync(tempInput, imageBuffer);
                        const isAnimated = sticker.is_animated || sticker.is_video;
                        const ffmpegCommand = isAnimated
                            ? `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`
                            : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
                        await new Promise((resolve, reject) => {
                            exec(ffmpegCommand, (error) => {
                                if (error) {
                                    console.error('FFmpeg error:', error);
                                    reject(error);
                                }
                                else
                                    resolve(undefined);
                            });
                        });
                        const webpBuffer = fs.readFileSync(tempOutput);
                        const img = new webp.Image();
                        await img.load(webpBuffer);
                        const metadata = {
                            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                            'sticker-pack-name': config.packname,
                            'emojis': sticker.emoji ? [sticker.emoji] : ['🤖']
                        };
                        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                        const jsonBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
                        const exif = Buffer.concat([exifAttr, jsonBuffer]);
                        exif.writeUIntLE(jsonBuffer.length, 14, 4);
                        img.exif = exif;
                        const finalBuffer = await img.save(null);
                        await sock.sendMessage(chatId, {
                            sticker: finalBuffer,
                            ...channelInfo
                        });
                        successCount++;
                        await delay(1000);
                        try {
                            fs.unlinkSync(tempInput);
                            fs.unlinkSync(tempOutput);
                        }
                        catch (err) {
                            console.error('Error cleaning up temp files:', err);
                        }
                    }
                    catch (err) {
                        console.error(`Error processing sticker ${i}:`, err);
                        continue;
                    }
                }
                await sock.sendMessage(chatId, {
                    text: `✅ Successfully downloaded ${successCount}/${stickerSet.result.stickers.length} stickers!`,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (error) {
                throw new Error(`Failed to process sticker pack: ${error.message}`);
            }
        }
        catch (error) {
            console.error('Error in stickertelegram command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to process Telegram stickers!\nMake sure:\n1. The URL is correct\n2. The sticker pack exists\n3. The sticker pack is public',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:tgstk] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tgstk: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "telegram": async (h) => module.exports["tgstk"](h),
    "tgsticker": async (h) => module.exports["tgstk"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const webp = require('node-webpmux');
  const crypto = require('crypto');

  return {

    // ── .take ─── Change sticker pack name | usage: .take <packname> (reply to sticker)
    "take": async (h) => {
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
        rawText: (h.config.prefix + 'take ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMessage?.stickerMessage) {
                await sock.sendMessage(chatId, {
                    text: '❌ Reply to a sticker with .take <packname>',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const packname = args.join(' ') || 'MEGA AI';
            try {
                const stickerBuffer = await downloadMediaMessage({
                    key: message.message.extendedTextMessage.contextInfo.stanzaId,
                    message: quotedMessage,
                    // messageType: 'stickerMessage'
                }, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                });
                if (!stickerBuffer) {
                    await sock.sendMessage(chatId, {
                        text: '❌ Failed to download sticker',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                const img = new webp.Image();
                await img.load(stickerBuffer);
                const json = {
                    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                    'sticker-pack-name': packname,
                    'emojis': ['🤖']
                };
                const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
                const exif = Buffer.concat([exifAttr, jsonBuffer]);
                exif.writeUIntLE(jsonBuffer.length, 14, 4);
                img.exif = exif;
                const finalBuffer = await img.save(null);
                await sock.sendMessage(chatId, {
                    sticker: finalBuffer,
                    ...channelInfo
                }, {
                    quoted: message
                });
            }
            catch (error) {
                console.error('Sticker processing error:', error);
                await sock.sendMessage(chatId, {
                    text: '❌ Error processing sticker',
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (error) {
            console.error('Error in take command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Error processing command',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:take] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .take: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "steal": async (h) => module.exports["take"](h),
    "wm": async (h) => module.exports["take"](h),
  };
})());

