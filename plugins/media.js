const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { execFile } = require('child_process');  // ✅ FIX: use execFile (no shell injection)
const fs = require('fs');
const path = require('path');

module.exports = {

  // ── .getpp (upgraded) ────────────────────────────────────────────────────
  // Usage: .getpp (your own pfp) | .getpp @user | .getpp 254712345678 | reply to someone's msg with .getpp
  // ✅ Works for ANY number — saved, unsaved, or even ones WhatsApp's lookup
  // can't confirm (privacy settings can make onWhatsApp() return a false
  // negative). We no longer hard-block on "not on WhatsApp" — we just try.
  // ✅ On failure, folds in the .checkblocked heuristic so the error message
  // tells you *why* it likely failed instead of a generic "private or no pfp".
  getpp: async ({ sock, from, msg, args, senderJid, isGroup }) => {
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const rawArgNumber = args[0]?.replace(/[^0-9]/g, '');

    let target =
      mentioned ||
      quotedParticipant ||
      (rawArgNumber ? `${rawArgNumber}@s.whatsapp.net` : null) ||
      senderJid ||
      from;

    // In a group with no target specified, default to the requester not the group
    if (isGroup && !mentioned && !quotedParticipant && !rawArgNumber) {
      target = senderJid;
    }

    // ✅ If a raw number was given, try to resolve it to WhatsApp's official
    // JID for accuracy — but treat the number as valid either way. A failed
    // or negative onWhatsApp() lookup doesn't mean the number is invalid; it
    // can just mean their privacy settings hide them from contact lookups.
    // We always fall through and attempt the profile picture fetch directly.
    if (rawArgNumber && !mentioned && !quotedParticipant) {
      try {
        const [result] = await sock.onWhatsApp(target);
        if (result?.exists) target = result.jid;
      } catch {
        // Lookup itself errored (network blip etc.) — keep the constructed JID and try anyway.
      }
    }

    try {
      // ✅ Try high-res first, fall back to low-res, then to a friendly error
      let ppUrl;
      try {
        ppUrl = await sock.profilePictureUrl(target, 'image');
      } catch {
        ppUrl = await sock.profilePictureUrl(target, 'preview');
      }

      await sock.sendMessage(from, {
        image: { url: ppUrl },
        caption: `📸 Profile picture of @${target.split('@')[0]}`,
        mentions: [target],
      }, { quoted: msg });
    } catch (err) {
      // ── Folded-in block-check heuristic (same logic as .checkblocked) ──
      // A "401 not authorized" on the picture fetch usually means they've
      // blocked the bot's number. Anything else more likely means no photo
      // set or privacy settings — not necessarily a block.
      const code = err?.output?.statusCode || err?.status;
      const blockedHint = code === 401
        ? `🚫 This usually means *they've blocked the bot's number* — not a 100% guarantee, but a strong signal.`
        : `🤷 They likely just have *no profile photo set* or *privacy settings* hiding it — not necessarily a block.`;

      await sock.sendMessage(from, {
        text: `❌ Could not get profile picture of @${target.split('@')[0]}.\n\n${blockedHint}\n\n_Heuristic only — WhatsApp doesn't expose a real "blocked" status._`,
        mentions: [target],
      }, { quoted: msg });
    }
  },

  // ── .share — forward a replied-to message (text/image/video/audio/doc) ─────
  // Usage: reply to any message with .share <number>
  // Forwards the exact quoted message to that number without re-typing or
  // re-uploading it — works for media too, not just text.
  share: async ({ sock, from, msg, args }) => {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMessage = ctx?.quotedMessage;

    if (!quotedMessage) {
      return sock.sendMessage(from, {
        text: `❌ Reply to the message you want to share, then type:\n*.share <number>*\n\nExample: reply to a photo, then send *.share 254712345678*`,
      }, { quoted: msg });
    }

    const target = args[0]?.replace(/[^0-9]/g, '');
    if (!target) {
      return sock.sendMessage(from, {
        text: `❌ Give a number to share to.\nExample: *.share 254712345678*`,
      }, { quoted: msg });
    }

    const targetJid = `${target}@s.whatsapp.net`;

    // Reconstruct a minimal message object pointing at the quoted content so
    // Baileys can relay it as a genuine forward (works for text and media).
    const forwardable = {
      key: {
        remoteJid: from,
        id: ctx.stanzaId,
        participant: ctx.participant,
        fromMe: false,
      },
      message: quotedMessage,
    };

    try {
      const [result] = await sock.onWhatsApp(targetJid).catch(() => [null]);
      if (result && result.exists === false) {
        return sock.sendMessage(from, {
          text: `❌ ${target} doesn't look like it's on WhatsApp — double-check the number.`,
        }, { quoted: msg });
      }

      await sock.sendMessage(targetJid, { forward: forwardable });
      await sock.sendMessage(from, {
        text: `✅ Shared to @${target}`,
        mentions: [targetJid],
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ Couldn't share that: ${err.message}`,
      }, { quoted: msg });
    }
  },

  // ── .about — get someone's WhatsApp "About" status text ────────────────────
  // Usage: .about (your own) | .about @user | .about 254712345678 | reply with .about
  // ✅ Works even for numbers NOT saved in contacts
  about: async ({ sock, from, msg, args, senderJid, isGroup }) => {
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const rawArgNumber = args[0]?.replace(/[^0-9]/g, '');

    let target =
      mentioned ||
      quotedParticipant ||
      (rawArgNumber ? `${rawArgNumber}@s.whatsapp.net` : null) ||
      senderJid ||
      from;

    if (isGroup && !mentioned && !quotedParticipant && !rawArgNumber) {
      target = senderJid;
    }

    if (rawArgNumber && !mentioned && !quotedParticipant) {
      try {
        const [result] = await sock.onWhatsApp(target);
        if (result?.exists) {
          target = result.jid;
        } else {
          return sock.sendMessage(from, { text: `❌ +${rawArgNumber} is not on WhatsApp.` }, { quoted: msg });
        }
      } catch {
        // fall back and try anyway
      }
    }

    try {
      const statusResult = await sock.fetchStatus(target);
      const aboutText = statusResult?.status || statusResult?.[0]?.status;
      const setAt = statusResult?.setAt || statusResult?.[0]?.setAt;

      if (!aboutText) {
        return sock.sendMessage(from, {
          text: `ℹ️ @${target.split('@')[0]} has no About text set or it's private.`,
          mentions: [target],
        }, { quoted: msg });
      }

      const dateLine = setAt ? `\n🕐 _Set: ${new Date(setAt).toLocaleString()}_` : '';
      await sock.sendMessage(from, {
        text: `ℹ️ *About* of @${target.split('@')[0]}:\n\n"${aboutText}"${dateLine}`,
        mentions: [target],
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(from, {
        text: `❌ Could not get About info for @${target.split('@')[0]} — it may be private.`,
        mentions: [target],
      }, { quoted: msg });
    }
  },

  // ── .sticker ───────────────────────────────────────────────────────────────
  sticker: async ({ sock, from, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = quoted?.quotedMessage;
    const imgMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;
    const vidMsg = quotedMsg?.videoMessage || msg.message?.videoMessage;

    if (!imgMsg && !vidMsg) {
      return sock.sendMessage(from, { text: '❌ Reply to an image or short video with .sticker' }, { quoted: msg });
    }

    try {
      const dlMsg = quotedMsg
        ? {
            key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant },
            message: quotedMsg,
          }
        : msg;

      const media = await downloadMediaMessage(dlMsg, 'buffer', {});
      const ext = imgMsg ? 'jpg' : 'mp4';
      const tmpIn = `/tmp/sticker_in_${Date.now()}.${ext}`;
      const tmpOut = `/tmp/sticker_out_${Date.now()}.webp`;
      fs.writeFileSync(tmpIn, media);

      await new Promise((resolve, reject) => {
        const args = imgMsg
          ? ['-i', tmpIn, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2', tmpOut, '-y']
          : ['-i', tmpIn, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=15', '-t', '6', tmpOut, '-y'];
        execFile('ffmpeg', args, (err) => err ? reject(err) : resolve());
      });

      await sock.sendMessage(from, { sticker: fs.readFileSync(tmpOut) }, { quoted: msg });
      fs.unlinkSync(tmpIn);
      fs.unlinkSync(tmpOut);
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Sticker failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .vv ───────────────────────────────────────────────────────────────────
  vv: async ({ sock, from, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = quoted?.quotedMessage;
    const audioMsg = quotedMsg?.audioMessage || msg.message?.audioMessage;

    if (!audioMsg) return sock.sendMessage(from, { text: '❌ Reply to a voice note with .vv' }, { quoted: msg });

    try {
      const dlMsg = quotedMsg
        ? { key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant }, message: quotedMsg }
        : msg;
      const buffer = await downloadMediaMessage(dlMsg, 'buffer', {});
      await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mp4',
        ptt: false,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  save: async ({ sock, from, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = quoted?.quotedMessage;
    const vidMsg = quotedMsg?.videoMessage || msg.message?.videoMessage;
    const imgMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;

    if (!vidMsg && !imgMsg) return sock.sendMessage(from, { text: '❌ Reply to a video or image with .save' }, { quoted: msg });

    try {
      const dlMsg = quotedMsg
        ? { key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant }, message: quotedMsg }
        : msg;
      const buffer = await downloadMediaMessage(dlMsg, 'buffer', {});
      if (vidMsg) {
        await sock.sendMessage(from, { video: buffer, caption: '✅ Video saved!' }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { image: buffer, caption: '✅ Image saved!' }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .song — ✅ FIX: use execFile to prevent shell injection ────────────────
  song: async ({ sock, from, msg, args }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '🎵 Usage: .song [YouTube URL]' }, { quoted: msg });
    // Basic URL validation
    if (!/^https?:\/\//i.test(url)) return sock.sendMessage(from, { text: '❌ Invalid URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Downloading audio...' }, { quoted: msg });
    const tmpFile = `/tmp/song_${Date.now()}.mp3`;

    execFile('yt-dlp', ['-x', '--audio-format', 'mp3', '-o', tmpFile, url], async (err) => {
      if (err) return sock.sendMessage(from, { text: '❌ Download failed. Check the URL.' }, { quoted: msg });
      try {
        await sock.sendMessage(from, {
          audio: fs.readFileSync(tmpFile),
          mimetype: 'audio/mpeg',
        }, { quoted: msg });
        fs.unlinkSync(tmpFile);
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Send failed: ${e.message}` }, { quoted: msg });
      }
    });
  },

  // ── .download — ✅ FIX: use execFile to prevent shell injection ────────────
  download: async ({ sock, from, msg, args }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '📥 Usage: .download [URL]' }, { quoted: msg });
    if (!/^https?:\/\//i.test(url)) return sock.sendMessage(from, { text: '❌ Invalid URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Downloading video...' }, { quoted: msg });
    const tmpFile = `/tmp/dl_${Date.now()}.mp4`;

    execFile('yt-dlp', ['-f', 'mp4', '-o', tmpFile, url], async (err) => {
      if (err) return sock.sendMessage(from, { text: '❌ Download failed. Check the URL.' }, { quoted: msg });
      try {
        await sock.sendMessage(from, {
          video: fs.readFileSync(tmpFile),
          caption: '✅ Downloaded!',
        }, { quoted: msg });
        fs.unlinkSync(tmpFile);
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Send failed: ${e.message}` }, { quoted: msg });
      }
    });
  },

  // ── .dl — UNIVERSAL DOWNLOADER ───────────────────────────────────────────
  // Usage: .dl [URL] (video, default) | .dl [URL] audio | .dl [URL] mp3
  // Powered by yt-dlp — works across YouTube, TikTok, Instagram, Facebook,
  // Twitter/X, SoundCloud, and most other sites yt-dlp supports.
  // ✅ Uses execFile only (no shell interpolation of user input).
  dl: async ({ sock, from, msg, args }) => {
    const url = args[0];
    const wantAudio = /^(audio|mp3|song)$/i.test(args[1] || '');
    if (!url) {
      return sock.sendMessage(from, {
        text: '🌐 *Universal Downloader*\nUsage: .dl [URL] — gets video\n.dl [URL] audio — gets MP3 audio\n\nWorks with YouTube, TikTok, Instagram, Facebook, Twitter/X, SoundCloud & more.',
      }, { quoted: msg });
    }
    if (!/^https?:\/\//i.test(url)) return sock.sendMessage(from, { text: '❌ Invalid URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: `⏳ Fetching ${wantAudio ? 'audio' : 'media'}...` }, { quoted: msg });

    const stamp = Date.now();
    const tmpTemplate = `/tmp/uvdl_${stamp}.%(ext)s`;
    const ytArgs = wantAudio
      ? ['-x', '--audio-format', 'mp3', '--no-playlist', '-o', tmpTemplate, url]
      : ['-f', 'mp4/best', '--no-playlist', '-o', tmpTemplate, url];

    execFile('yt-dlp', ytArgs, { maxBuffer: 1024 * 1024 * 20 }, async (err) => {
      if (err) {
        return sock.sendMessage(from, { text: '❌ Download failed. The link may be unsupported or private.' }, { quoted: msg });
      }
      try {
        // yt-dlp resolves the real extension itself, so find the produced file
        const dir = '/tmp';
        const produced = fs.readdirSync(dir).find(f => f.startsWith(`uvdl_${stamp}.`));
        if (!produced) return sock.sendMessage(from, { text: '❌ Could not locate downloaded file.' }, { quoted: msg });
        const fullPath = path.join(dir, produced);
        const buffer = fs.readFileSync(fullPath);

        if (wantAudio) {
          await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { video: buffer, caption: '✅ Downloaded via universal downloader' }, { quoted: msg });
        }
        fs.unlinkSync(fullPath);
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Send failed: ${e.message}` }, { quoted: msg });
      }
    });
  },

  // ── .convertmedia — UNIVERSAL MEDIA CONVERTER ────────────────────────────
  // Usage: reply to an image/video/audio file with .convertmedia [target format]
  // e.g. .convertmedia mp3 | .convertmedia mp4 | .convertmedia png | .convertmedia ogg
  // Distinct from .convert (currency converter in atassa.js) to avoid name collision.
  // ✅ Uses execFile only (no shell interpolation of user input).
  convertmedia: async ({ sock, from, msg, args }) => {
    const target = (args[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const allowed = ['mp3', 'mp4', 'wav', 'ogg', 'opus', 'm4a', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'webm'];

    if (!target || !allowed.includes(target)) {
      return sock.sendMessage(from, {
        text: `🔄 *Universal Media Converter*\nReply to an image, video, or audio file with:\n.convertmedia [format]\n\nSupported: ${allowed.join(', ')}`,
      }, { quoted: msg });
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = quoted?.quotedMessage;
    const imgMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;
    const vidMsg = quotedMsg?.videoMessage || msg.message?.videoMessage;
    const audMsg = quotedMsg?.audioMessage || msg.message?.audioMessage;

    if (!imgMsg && !vidMsg && !audMsg) {
      return sock.sendMessage(from, { text: '❌ Reply to an image, video, or audio file with .convertmedia [format]' }, { quoted: msg });
    }

    const sourceKind = imgMsg ? 'image' : vidMsg ? 'video' : 'audio';
    const audioOnlyTargets = ['mp3', 'wav', 'ogg', 'opus', 'm4a'];
    const imageOnlyTargets = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

    if (sourceKind === 'audio' && !audioOnlyTargets.includes(target)) {
      return sock.sendMessage(from, { text: `❌ Audio can only be converted to: ${audioOnlyTargets.join(', ')}` }, { quoted: msg });
    }
    if (sourceKind === 'image' && !imageOnlyTargets.includes(target)) {
      return sock.sendMessage(from, { text: `❌ Images can only be converted to: ${imageOnlyTargets.join(', ')}` }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { text: `⏳ Converting ${sourceKind} → ${target}...` }, { quoted: msg });

      const dlMsg = quotedMsg
        ? { key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant }, message: quotedMsg }
        : msg;
      const media = await downloadMediaMessage(dlMsg, 'buffer', {});

      const inExt = imgMsg ? 'jpg' : vidMsg ? 'mp4' : 'm4a';
      const stamp = Date.now();
      const tmpIn = `/tmp/conv_in_${stamp}.${inExt}`;
      const tmpOut = `/tmp/conv_out_${stamp}.${target}`;
      fs.writeFileSync(tmpIn, media);

      const ffArgs = ['-i', tmpIn, tmpOut, '-y'];

      await new Promise((resolve, reject) => {
        execFile('ffmpeg', ffArgs, (err) => err ? reject(err) : resolve());
      });

      const outBuffer = fs.readFileSync(tmpOut);

      if (audioOnlyTargets.includes(target)) {
        await sock.sendMessage(from, { audio: outBuffer, mimetype: `audio/${target}` }, { quoted: msg });
      } else if (imageOnlyTargets.includes(target)) {
        await sock.sendMessage(from, { image: outBuffer, caption: `✅ Converted to .${target}` }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { document: outBuffer, fileName: `converted.${target}`, mimetype: 'application/octet-stream' }, { quoted: msg });
      }

      fs.unlinkSync(tmpIn);
      fs.unlinkSync(tmpOut);
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Conversion failed: ${e.message}` }, { quoted: msg });
    }
  },
};
