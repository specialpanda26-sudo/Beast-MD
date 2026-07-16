// Beast MD ported module (category: upload)
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
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadFile } = require('../lib_ported/uploaders.js');

  return {

    // ── .aupload ─── Upload media to cloud and get URL | usage: .aupload (reply to image/video/gif/sticker)
    "aupload": async (h) => {
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
        rawText: (h.config.prefix + 'aupload ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please reply to an image, video, GIF, or sticker!' }, { quoted: message });
                return;
            }
            const type = Object.keys(quotedMsg)[0];
            const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'];
            if (!supportedTypes.includes(type)) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported file type! Reply to image/video/gif/sticker/document' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to cloud...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(quotedMsg[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (type === 'documentMessage') {
                const fileName = quotedMsg[type].fileName || 'file';
                ext = fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `upload_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const stats = fs.statSync(tempPath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            const result = await uploadFile(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Upload Successful!*\n\n` +
                    `📊 *Service:* ${result.service}\n` +
                    `📦 *Size:* ${fileSizeMB} MB\n` +
                    `🔗 *URL:* ${result.url}\n\n` +
                    `_Click the link to view/download_`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Upload Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ Upload failed!\n\nError: ${error.message}`
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:aupload] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .aupload: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "upall": async (h) => module.exports["aupload"](h),
    "aup": async (h) => module.exports["aupload"](h),
    "toall": async (h) => module.exports["aupload"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToFreeimage } = require('../lib_ported/uploaders.js');

  return {

    // ── .freeimage ─── Upload to Freeimage.host | usage: .freeimage (reply to image)
    "freeimage": async (h) => {
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
        rawText: (h.config.prefix + 'freeimage ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg?.imageMessage) {
                await sock.sendMessage(chatId, { text: '⚠️ Please reply to an image!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to Freeimage...' }, { quoted: message });
            const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `freeimage_${Date.now()}.jpg`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToFreeimage(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Freeimage Upload Success!*\n\n` +
                    `🔗 *URL:* ${result.url}\n` +
                    `🖼️ *Display:* ${result.display_url}\n` +
                    `🗑️ *Delete:* ${result.delete_url}`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Freeimage Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:freeimage] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .freeimage: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "fimg": async (h) => module.exports["freeimage"](h),
    "freeimg": async (h) => module.exports["freeimage"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToLitterbox } = require('../lib_ported/uploaders.js');

  return {

    // ── .litterbox ─── Upload temporarily (1h/12h/24h/72h) | usage: .litterbox <1h/12h/24h/72h> (reply to media)
    "litterbox": async (h) => {
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
        rawText: (h.config.prefix + 'litterbox ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please reply to media!' }, { quoted: message });
                return;
            }
            const type = Object.keys(quotedMsg)[0];
            const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'];
            if (!supportedTypes.includes(type)) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported type!' }, { quoted: message });
                return;
            }
            const time = args[0] || '1h';
            const validTimes = ['1h', '12h', '24h', '72h'];
            const uploadTime = validTimes.includes(time) ? time : '1h';
            await sock.sendMessage(chatId, { text: `Uploading to Litterbox (${uploadTime})...` }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(quotedMsg[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (quotedMsg[type].fileName) {
                ext = quotedMsg[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `litterbox_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToLitterbox(tempPath, uploadTime);
            await sock.sendMessage(chatId, {
                text: `✅ *Litterbox Upload Success!*\n\n` +
                    `⏰ *Expires:* ${result.expires}\n` +
                    `🔗 *URL:* ${result.url}\n\n` +
                    `_Link will expire after ${result.expires}_`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Litterbox Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:litterbox] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .litterbox: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tempup": async (h) => module.exports["litterbox"](h),
    "litter": async (h) => module.exports["litterbox"](h),
    "litr": async (h) => module.exports["litterbox"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToPixhost } = require('../lib_ported/uploaders.js');

  return {

    // ── .pixhost ─── Upload to Pixhost (images only) | usage: .pixhost (reply to media or caption on media)
    "pixhost": async (h) => {
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
        rawText: (h.config.prefix + 'pixhost ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const hasMedia = message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage;
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!hasMedia && !quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please send media with caption or reply to media!' }, { quoted: message });
                return;
            }
            const mediaSource = hasMedia ? message.message : quotedMsg;
            const type = Object.keys(mediaSource).find(key => ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'].includes(key));
            if (!type) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported media type!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to Pixhost...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(mediaSource[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (mediaSource[type].fileName) {
                ext = mediaSource[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `pixhost_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToPixhost(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Pixhost Upload Success!*\n\n🔗 ${result.url}`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Pixhost Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:pixhost] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pixhost: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ph": async (h) => module.exports["pixhost"](h),
    "pix": async (h) => module.exports["pixhost"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToPomf2 } = require('../lib_ported/uploaders.js');

  return {

    // ── .pomf ─── Upload to Pomf.lain.la (1GB, permanent) | usage: .pomf (reply to media)
    "pomf": async (h) => {
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
        rawText: (h.config.prefix + 'pomf ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please reply to media!' }, { quoted: message });
                return;
            }
            const type = Object.keys(quotedMsg)[0];
            const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'];
            if (!supportedTypes.includes(type)) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported type!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to Pomf...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(quotedMsg[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (quotedMsg[type].fileName) {
                ext = quotedMsg[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `pomf_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToPomf2(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Pomf Upload Success!*\n\n🔗 ${result.url}`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Pomf Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:pomf] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .pomf: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "lain": async (h) => module.exports["pomf"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToQuax } = require('../lib_ported/uploaders.js');

  return {

    // ── .quax ─── Upload to Qu.ax (anonymous) | usage: .quax (reply to media or caption on media)
    "quax": async (h) => {
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
        rawText: (h.config.prefix + 'quax ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const hasMedia = message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage;
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!hasMedia && !quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please send media with caption or reply to media!' }, { quoted: message });
                return;
            }
            const mediaSource = hasMedia ? message.message : quotedMsg;
            const type = Object.keys(mediaSource).find(key => ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'].includes(key));
            if (!type) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported media type!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to Quax...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(mediaSource[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (mediaSource[type].fileName) {
                ext = mediaSource[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `quax_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToQuax(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Qu.ax Upload Success!*\n\n🔗 ${result.url}`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Qu.ax Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:quax] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .quax: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "qu": async (h) => module.exports["quax"](h),
    "qx": async (h) => module.exports["quax"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToTmpfiles } = require('../lib_ported/uploaders.js');

  return {

    // ── .tmpfiles ─── Upload to Tmpfiles.org (temporary) | usage: .tmpfiles (reply to media or caption on media)
    "tmpfiles": async (h) => {
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
        rawText: (h.config.prefix + 'tmpfiles ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const hasMedia = message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage;
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!hasMedia && !quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please send media with caption or reply to media!' }, { quoted: message });
                return;
            }
            const mediaSource = hasMedia ? message.message : quotedMsg;
            const type = Object.keys(mediaSource).find(key => ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'].includes(key));
            if (!type) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported media type!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to Tmpfiles...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(mediaSource[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (mediaSource[type].fileName) {
                ext = mediaSource[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `tmpfiles_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToTmpfiles(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Tmpfiles Upload Success!*\n\n🔗 Direct: ${result.url}\n📄 Page: ${result.page_url}`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Tmpfiles Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:tmpfiles] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tmpfiles: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tmpf": async (h) => module.exports["tmpfiles"](h),
    "tfiles": async (h) => module.exports["tmpfiles"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToUguu } = require('../lib_ported/uploaders.js');

  return {

    // ── .uguu ─── Upload to Uguu.se (temporary) | usage: .uguu (reply to media or caption on media)
    "uguu": async (h) => {
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
        rawText: (h.config.prefix + 'uguu ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const hasMedia = message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage;
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!hasMedia && !quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please send media with caption or reply to media!' }, { quoted: message });
                return;
            }
            const mediaSource = hasMedia ? message.message : quotedMsg;
            const type = Object.keys(mediaSource).find(key => ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'].includes(key));
            if (!type) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported media type!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to Uguu...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(mediaSource[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (mediaSource[type].fileName) {
                ext = mediaSource[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `uguu_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToUguu(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *Uguu Upload Success!*\n\n🔗 ${result.url}\n⚠️ Temporary link`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('Uguu Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:uguu] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .uguu: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ug": async (h) => module.exports["uguu"](h),
    "uguuse": async (h) => module.exports["uguu"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { uploadToX0 } = require('../lib_ported/uploaders.js');

  return {

    // ── .xoat ─── Upload to X0.at (anonymous) | usage: .xoat (reply to media or caption on media)
    "xoat": async (h) => {
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
        rawText: (h.config.prefix + 'xoat ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const hasMedia = message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage;
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!hasMedia && !quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please send media with caption or reply to media!' }, { quoted: message });
                return;
            }
            const mediaSource = hasMedia ? message.message : quotedMsg;
            const type = Object.keys(mediaSource).find(key => ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'].includes(key));
            if (!type) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported media type!' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, { text: 'Uploading to X0at...' }, { quoted: message });
            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(mediaSource[type], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let ext = 'bin';
            if (type === 'imageMessage')
                ext = 'jpg';
            else if (type === 'videoMessage')
                ext = 'mp4';
            else if (type === 'stickerMessage')
                ext = 'webp';
            else if (mediaSource[type].fileName) {
                ext = mediaSource[type].fileName.split('.').pop() || 'bin';
            }
            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `x0_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);
            const result = await uploadToX0(tempPath);
            await sock.sendMessage(chatId, {
                text: `✅ *X0at Upload Success!*\n\n🔗 ${result.url}`
            }, { quoted: message });
            fs.unlinkSync(tempPath);
        }
        catch (error) {
            console.error('X0.at Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:xoat] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .xoat: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "x0at": async (h) => module.exports["xoat"](h),
    "x0": async (h) => module.exports["xoat"](h),
  };
})());

