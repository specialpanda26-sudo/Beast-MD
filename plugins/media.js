const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {

  // ── .getpp ─────────────────────────────────────────────────────────────────
  getpp: async ({ sock, from, msg, args, sender }) => {
    let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0] ? args[0].replace('@', '') + '@s.whatsapp.net' : sender);

    try {
      const ppUrl = await sock.profilePictureUrl(target, 'image');
      await sock.sendMessage(from, {
        image: { url: ppUrl },
        caption: `📸 Profile picture of @${target.split('@')[0]}`,
        mentions: [target],
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(from, { text: '❌ No profile picture found or it is private.' }, { quoted: msg });
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
      // Build a proper message object for download
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
        const cmd = imgMsg
          ? `ffmpeg -i ${tmpIn} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2" ${tmpOut} -y`
          : `ffmpeg -i ${tmpIn} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=15" -t 6 ${tmpOut} -y`;
        exec(cmd, (err) => err ? reject(err) : resolve());
      });

      await sock.sendMessage(from, { sticker: fs.readFileSync(tmpOut) }, { quoted: msg });
      fs.unlinkSync(tmpIn);
      fs.unlinkSync(tmpOut);
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Sticker failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .vv (save voice note) ──────────────────────────────────────────────────
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

  // ── .song / .download (yt-dlp) ─────────────────────────────────────────────
  song: async ({ sock, from, msg, args }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '🎵 Usage: .song [YouTube URL]' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Downloading audio...' }, { quoted: msg });
    const tmpFile = `/tmp/song_${Date.now()}.mp3`;

    exec(`yt-dlp -x --audio-format mp3 -o "${tmpFile}" "${url}"`, async (err) => {
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

  download: async ({ sock, from, msg, args }) => {
    const url = args[0];
    if (!url) return sock.sendMessage(from, { text: '📥 Usage: .download [URL]' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Downloading video...' }, { quoted: msg });
    const tmpFile = `/tmp/dl_${Date.now()}.mp4`;

    exec(`yt-dlp -f mp4 -o "${tmpFile}" "${url}"`, async (err) => {
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
};
