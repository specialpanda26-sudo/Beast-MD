const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { execFile } = require('child_process');  // ✅ FIX: use execFile (no shell injection)
const fs = require('fs');
const path = require('path');

// ── yt-dlp failure diagnosis ─────────────────────────────────────────────
// ✅ FIX: .song/.download/.dl used to throw away the real yt-dlp stderr and
// always show a hardcoded guess ("may be unsupported or private") — so
// EVERY failure looked like the same thing to the user, even when the real
// cause was totally different (YouTube bot-detection challenges, an
// outdated yt-dlp binary, rate-limiting, a genuinely dead link, etc). This
// pattern-matches the actual stderr so the reply — and the admin-panel
// error log — reflects what really happened.
function diagnoseYtdlpError(stderr, fallbackMsg) {
  const s = (stderr || fallbackMsg || '').toString();
  if (/sign in to confirm|not a bot|confirm you.?re not a bot/i.test(s)) {
    return { userMsg: '❌ YouTube is showing a bot-detection challenge on this server right now — this is a known yt-dlp/YouTube issue, not a problem with your link. Needs authenticated cookies or a yt-dlp update on the server side.', raw: s };
  }
  if (/private video|this video is private|login required to view/i.test(s)) {
    return { userMsg: '❌ That content really is private/login-restricted — the bot can\'t access it without an account that has permission.', raw: s };
  }
  if (/video unavailable|has been removed|account.*terminated/i.test(s)) {
    return { userMsg: '❌ That video is unavailable or has been removed/taken down.', raw: s };
  }
  if (/http error 403|forbidden/i.test(s)) {
    return { userMsg: '❌ Access blocked (HTTP 403) — likely a geo-restriction, rate-limit, or the server\'s yt-dlp needs updating.', raw: s };
  }
  if (/unsupported url|no extractor/i.test(s)) {
    return { userMsg: '❌ That URL/platform isn\'t supported by the downloader.', raw: s };
  }
  if (/timed out|timeout/i.test(s)) {
    return { userMsg: '❌ The download timed out — the source may be slow or blocking automated requests.', raw: s };
  }
  // Unknown cause — show a trimmed slice of the real error instead of guessing.
  const trimmed = s.split('\n').filter(Boolean).slice(-3).join(' ').slice(0, 300);
  return { userMsg: `❌ Download failed: ${trimmed || 'unknown error — check the URL and try again.'}`, raw: s };
}

module.exports = {

  // ── .getpp (upgraded) ────────────────────────────────────────────────────
  // Usage: .getpp (your own pfp) | .getpp @user | .getpp 254712345678 | reply to someone's msg with .getpp
  // ✅ Works for ANY number — saved, unsaved, or even ones WhatsApp's lookup
  // can't confirm (privacy settings can make onWhatsApp() return a false
  // negative). We no longer hard-block on "not on WhatsApp" — we just try.
  // ✅ On failure, folds in the .checkblocked heuristic so the error message
  // tells you *why* it likely failed instead of a generic "private or no pfp".
  getpp: async ({ sock, from, msg, args, senderJid, isGroup, logActivity }) => {
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
    // ✅ FIX: this used to give up after one onWhatsApp() attempt and fall
    // back to a plain `<number>@s.whatsapp.net` JID. WhatsApp has been
    // rolling out "LID" (linked ID) addressing region-by-region since 2024 —
    // for accounts on that system, the *real* JID Baileys needs is an
    // `@lid`, not `@s.whatsapp.net`, so a failed/negative lookup on those
    // numbers meant the picture fetch was always doomed regardless of
    // privacy settings. This retries the lookup once (covers transient
    // network blips) and always uses whatever JID WhatsApp itself returns.
    if (rawArgNumber && !mentioned && !quotedParticipant) {
      let resolved = null;
      for (let attempt = 0; attempt < 2 && !resolved; attempt++) {
        try {
          const [result] = await sock.onWhatsApp(target);
          if (result?.exists) resolved = result.jid;
        } catch {
          // network blip — retry once, then fall through to the raw JID
        }
        if (!resolved && attempt === 0) await new Promise(r => setTimeout(r, 400));
      }
      if (resolved) target = resolved;
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

      if (logActivity) logActivity('error', 'getpp', `.getpp ${target} → ${err.message} (code ${code || 'n/a'})`, `+${(senderJid||from).split('@')[0]}`);

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
  // ✅ FIX 2: was passing a literal "-o /tmp/song_<ts>.mp3" filename while
  // also using -x (extract audio). yt-dlp's audio postprocessor appends its
  // own extension when the output template doesn't already end in %(ext)s,
  // so the real file on disk became "song_<ts>.mp3.mp3" — the subsequent
  // fs.readFileSync(tmpFile) always threw ENOENT and every .song send
  // silently failed with "Send failed: ENOENT ...". Now uses a %(ext)s
  // template + locates the produced file by prefix, same pattern as .dl.
  song: async ({ sock, from, msg, args, logActivity, senderJid }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '🎵 Usage: .song [YouTube URL]' }, { quoted: msg });
    // Basic URL validation
    if (!/^https?:\/\//i.test(url)) return sock.sendMessage(from, { text: '❌ Invalid URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Downloading audio...' }, { quoted: msg });
    const stamp = Date.now();
    const tmpTemplate = `/tmp/song_${stamp}.%(ext)s`;

    // ✅ FIX: was swallowing the real yt-dlp error and always showing a
    // hardcoded "may be private" guess for every possible failure. Now
    // captures stderr and diagnoses the actual cause.
    execFile('yt-dlp', ['-x', '--audio-format', 'mp3', '-o', tmpTemplate, url], async (err, stdout, stderr) => {
      if (err) {
        const { userMsg, raw } = diagnoseYtdlpError(stderr, err.message);
        if (logActivity) logActivity('error', 'song', `.song ${url} → ${raw.slice(0, 300)}`, `+${(senderJid||from).split('@')[0]}`);
        return sock.sendMessage(from, { text: userMsg }, { quoted: msg });
      }
      try {
        const produced = fs.readdirSync('/tmp').find(f => f.startsWith(`song_${stamp}.`));
        if (!produced) return sock.sendMessage(from, { text: '❌ Could not locate downloaded file.' }, { quoted: msg });
        const fullPath = path.join('/tmp', produced);
        await sock.sendMessage(from, {
          audio: fs.readFileSync(fullPath),
          mimetype: 'audio/mpeg',
        }, { quoted: msg });
        fs.unlinkSync(fullPath);
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Send failed: ${e.message}` }, { quoted: msg });
      }
    });
  },

  // ── .download — ✅ FIX: use execFile to prevent shell injection ────────────
  // ✅ FIX 2: same literal-filename-vs-postprocessor mismatch as .song above
  // — when yt-dlp needs to remux/re-encode to satisfy "-f mp4", a fixed
  // "-o dl_<ts>.mp4" can end up written as "dl_<ts>.mp4.mkv" or similar, so
  // the hardcoded readFileSync path silently failed. Also widened the
  // format selector from the bare 'mp4' (which errors out entirely if no
  // single-file mp4-only stream exists) to 'mp4/best', matching .dl.
  download: async ({ sock, from, msg, args, logActivity, senderJid }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '📥 Usage: .download [URL]' }, { quoted: msg });
    if (!/^https?:\/\//i.test(url)) return sock.sendMessage(from, { text: '❌ Invalid URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Downloading video...' }, { quoted: msg });
    const stamp = Date.now();
    const tmpTemplate = `/tmp/dl_${stamp}.%(ext)s`;

    execFile('yt-dlp', ['-f', 'mp4/best', '-o', tmpTemplate, url], async (err, stdout, stderr) => {
      if (err) {
        const { userMsg, raw } = diagnoseYtdlpError(stderr, err.message);
        if (logActivity) logActivity('error', 'download', `.download ${url} → ${raw.slice(0, 300)}`, `+${(senderJid||from).split('@')[0]}`);
        return sock.sendMessage(from, { text: userMsg }, { quoted: msg });
      }
      try {
        const produced = fs.readdirSync('/tmp').find(f => f.startsWith(`dl_${stamp}.`));
        if (!produced) return sock.sendMessage(from, { text: '❌ Could not locate downloaded file.' }, { quoted: msg });
        const fullPath = path.join('/tmp', produced);
        await sock.sendMessage(from, {
          video: fs.readFileSync(fullPath),
          caption: '✅ Downloaded!',
        }, { quoted: msg });
        fs.unlinkSync(fullPath);
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
  dl: async ({ sock, from, msg, args, logActivity, senderJid }) => {
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

    // ✅ FIX: was showing "may be unsupported or private" for literally every
    // failure regardless of cause. Now captures stderr and diagnoses it.
    execFile('yt-dlp', ytArgs, { maxBuffer: 1024 * 1024 * 20 }, async (err, stdout, stderr) => {
      if (err) {
        const { userMsg, raw } = diagnoseYtdlpError(stderr, err.message);
        if (logActivity) logActivity('error', 'dl', `.dl ${url} ${wantAudio ? 'audio' : ''} → ${raw.slice(0, 300)}`, `+${(senderJid||from).split('@')[0]}`);
        return sock.sendMessage(from, { text: userMsg }, { quoted: msg });
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
