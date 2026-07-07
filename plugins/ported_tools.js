// AUTO-PORTED from friend's MEGA-MD bot (category: tools)
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

    // ── .base64 ─── Encode text to Base64 | usage: .base64 <text> OR reply to a message
    "base64": async (h) => {
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
        rawText: (h.config.prefix + 'base64 ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let txt = args?.join(' ') || "";
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                txt = quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    txt;
            }
            txt = txt.replace(/^\.\w+\s*/, '').trim();
            if (!txt) {
                return await sock.sendMessage(chatId, { text: '*Please provide text to encode or reply to a message.*\nExample: .base64 Hello World' }, { quoted: message });
            }
            const encoded = Buffer.from(txt, 'utf-8').toString('base64');
            const response = `*🔗 Base64 Encoded:*\n\n${encoded}`;
            await sock.sendMessage(chatId, { text: response }, { quoted: message });
        }
        catch (err) {
            console.error('Base64 plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to encode text.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:base64] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .base64: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "b64": async (h) => module.exports["base64"](h),
    "encode": async (h) => module.exports["base64"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .bfdecode ─── Decode/Run Brainfuck code | usage: Reply to BF code with .bfdecode
    "bfdecode": async (h) => {
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
        rawText: (h.config.prefix + 'bfdecode ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let code = args?.join('') || "";
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                code = quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    "";
            }
            code = code.trim();
            if (!code) {
                return await sock.sendMessage(chatId, { text: '*Please reply to a Brainfuck code or provide it after the command.*' }, { quoted: message });
            }
            const bf = code.replace(/[^><+\-.,[\]]/g, '');
            const tape = new Uint8Array(30000);
            let ptr = 0, pc = 0, output = "", steps = 0;
            const maxSteps = 100000;
            while (pc < bf.length && steps < maxSteps) {
                const char = bf[pc];
                if (char === '>')
                    ptr++;
                else if (char === '<')
                    ptr--;
                else if (char === '+')
                    tape[ptr]++;
                else if (char === '-')
                    tape[ptr]--;
                else if (char === '.')
                    output += String.fromCharCode(tape[ptr]);
                else if (char === '[') {
                    if (tape[ptr] === 0) {
                        let depth = 1;
                        while (depth > 0) {
                            pc++;
                            if (bf[pc] === '[')
                                depth++;
                            if (bf[pc] === ']')
                                depth--;
                        }
                    }
                }
                else if (char === ']') {
                    if (tape[ptr] !== 0) {
                        let depth = 1;
                        while (depth > 0) {
                            pc--;
                            if (bf[pc] === ']')
                                depth++;
                            if (bf[pc] === '[')
                                depth--;
                        }
                    }
                }
                pc++;
                steps++;
            }
            await sock.sendMessage(chatId, { text: `*🔓 Decoded Result:* \n\n${output || "_No output generated_"}` }, { quoted: message });
        }
        catch (err) {
            console.error('BF Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error reading quoted message.' });
        }
    
      } catch (portErr) {
        console.error('[ported:bfdecode] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .bfdecode: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "brun": async (h) => module.exports["bfdecode"](h),
    "bfread": async (h) => module.exports["bfdecode"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .brainfuck ─── Convert text into Brainfuck code | usage: .brainfuck <text> OR reply to a message
    "brainfuck": async (h) => {
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
        rawText: (h.config.prefix + 'brainfuck ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let text = args?.join(' ') || "";
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                text = quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    text;
            }
            text = text.replace(/^\.\w+\s*/, '').trim();
            if (!text) {
                return await sock.sendMessage(chatId, { text: '*Please provide text or reply to a message to obfuscate!*' }, { quoted: message });
            }
            let bfCode = "";
            let lastAscii = 0;
            for (let i = 0; i < text.length; i++) {
                const ascii = text.charCodeAt(i);
                const diff = ascii - lastAscii;
                if (diff > 0) {
                    bfCode += "+".repeat(diff);
                }
                else if (diff < 0) {
                    bfCode += "-".repeat(Math.abs(diff));
                }
                bfCode += ".";
                lastAscii = ascii;
            }
            const response = `*❄️ Brainfuck Obfuscated Text:*\n\n${bfCode}`;
            await sock.sendMessage(chatId, { text: response }, { quoted: message });
        }
        catch (err) {
            console.error('BF Encoding Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error generating code.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:brainfuck] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .brainfuck: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "bfcode": async (h) => module.exports["brainfuck"](h),
    "obfuscate": async (h) => module.exports["brainfuck"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .excard ─── Create a rich media card | usage: .excard Title | Body | ImageURL
    "excard": async (h) => {
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
        rawText: (h.config.prefix + 'excard ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const input = args.join(' ');
        if (!input.includes('|')) {
            return await sock.sendMessage(chatId, {
                text: '*Usage:* .excard Title | Body | ImageURL\n\n*Example:* .excard Google | Search anything | https://google.com/logo.png'
            }, { quoted: message });
        }
        const [title, body, url] = input.split('|').map((t) => t.trim());
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const _hasQuotedImage = quoted?.imageMessage;
        await sock.sendMessage(chatId, {
            text: body || " ",
            contextInfo: {
                externalAdReply: {
                    title,
                    body: 'Shared via Henry Ochibots v19',
                    thumbnailUrl: url || 'https://i.ibb.co/3S6f0mS/default.jpg',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    sourceUrl: url || 'https://github.com'
                }
            }
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:excard] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .excard: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const { fileTypeFromBuffer } = require('file-type');

  return {

    // ── .fetch ─── Download a file directly from a URL | usage: .fetch <url>
    "fetch": async (h) => {
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
        rawText: (h.config.prefix + 'fetch ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args[0];
        if (!url || !url.startsWith('http')) {
            return await sock.sendMessage(chatId, { text: 'Provide a valid URL starting with http/https.' });
        }
        try {
            await sock.sendMessage(chatId, { text: '📡 *Fetching data...*' });
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(res.data, 'binary');
            const type = await fileTypeFromBuffer(buffer);
            if (!type) {
                return await sock.sendMessage(chatId, { text: buffer.toString().slice(0, 1000) });
            }
            if (type.mime.startsWith('image/')) {
                await sock.sendMessage(chatId, { image: buffer });
            }
            else if (type.mime.startsWith('video/')) {
                await sock.sendMessage(chatId, { video: buffer });
            }
            else if (type.mime.startsWith('audio/')) {
                await sock.sendMessage(chatId, { audio: buffer, mimetype: type.mime });
            }
            else {
                await sock.sendMessage(chatId, { document: buffer, mimetype: type.mime, fileName: `file.${type.ext}` });
            }
        }
        catch (err) {
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch. URL might be private or invalid.' });
        }
    
      } catch (portErr) {
        console.error('[ported:fetch] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .fetch: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "get": async (h) => module.exports["fetch"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from flip.js ---
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

    // ── .flip ─── Flip text upside down (supports Uppercase) | usage: .flip <text> OR reply to a message
    "flip": async (h) => {
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
        rawText: (h.config.prefix + 'flip ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        let txt = args?.join(' ') || "";
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            txt = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || txt;
        }
        txt = txt.replace(/^\.\w+\s*/, '').trim();
        if (!txt)
            return await sock.sendMessage(chatId, { text: '*What should I flip?*' });
        const charMap = {
            'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ',
            'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ',
            'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
            'A': '∀', 'B': 'ᗺ', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'H': 'H', 'I': 'I', 'J': 'ſ',
            'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N', 'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '⊥',
            'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
            '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
            '.': '˙', ',': '\'', '\'': ',', '"': '„', '!': '¡', '?': '¿', '(': ')', ')': '(', '[': ']', ']': '[',
            '{': '}', '}': '{', '<': '>', '>': '<', '_': '‾', '&': '⅋'
        };
        const flipped = txt.split('').map((char) => charMap[char] || char).reverse().join('');
        await sock.sendMessage(chatId, { text: flipped }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:flip] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .flip: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "mirror": async (h) => module.exports["flip"](h),
    "upside": async (h) => module.exports["flip"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from forwarded.js ---
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

    // ── .forwarded ─── Send text with a fake "Frequently Forwarded" tag | usage: .viral <text> OR reply to a message
    "forwarded": async (h) => {
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
        rawText: (h.config.prefix + 'forwarded ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let txt = "";
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                txt = quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    "";
            }
            if (!txt || txt.trim() === "") {
                txt = args?.join(' ') || "";
            }
            if (!txt || txt.trim() === "") {
                return await sock.sendMessage(chatId, {
                    text: 'Please provide text or reply to a message to forward.'
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                text: txt,
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 999
                }
            });
        }
        catch (err) {
            console.error('Forwarding Spoof Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to spoof forwarding.' });
        }
    
      } catch (portErr) {
        console.error('[ported:forwarded] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .forwarded: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "viral": async (h) => module.exports["forwarded"](h),
    "fakeforward": async (h) => module.exports["forwarded"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .grayscale ─── Convert an image to grayscale | usage: Reply to an image with .grayscale
    "grayscale": async (h) => {
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
        rawText: (h.config.prefix + 'grayscale ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(chatId, { text: '🖤 *Grayscale Image*\n\nReply to an image to convert it to grayscale\n\nUsage:\n.grayscale' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const tempFile = path.join(process.cwd(), `grayscale_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);
            const form = new FormData();
            form.append('apikey', 'guru');
            form.append('file', fs.createReadStream(tempFile));
            const res = await axios.post('https://discardapi.dpdns.org/api/image/grayscale', form, { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 });
            fs.unlinkSync(tempFile);
            if (!res?.data)
                throw new Error('Grayscale conversion failed');
            const grayFile = path.join(process.cwd(), `grayscale_result_${Date.now()}.jpg`);
            fs.writeFileSync(grayFile, res.data);
            await sock.sendMessage(chatId, {
                image: { url: grayFile },
                caption: `🖤 *Grayscale Image*\n\nProcessed by: Henry Ochibots v19`
            }, { quoted: message });
            fs.unlinkSync(grayFile);
        }
        catch (err) {
            console.error('Grayscale Plugin Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to convert image to grayscale. Make sure the image is clear and try again.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:grayscale] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .grayscale: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gray": async (h) => module.exports["grayscale"](h),
    "grey": async (h) => module.exports["grayscale"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const sharp = require('sharp');

  return {

    // ── .blur ─── Apply a blur effect to an image | usage: .blur (reply to an image or send image with caption)
    "blur": async (h) => {
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
        rawText: (h.config.prefix + 'blur ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        try {
            let imageBuffer;
            if (quotedMessage?.imageMessage) {
                const quoted = { message: { imageMessage: quotedMessage.imageMessage } };
                imageBuffer = await downloadMediaMessage(quoted, 'buffer', {});
            }
            else if (message.message?.imageMessage) {
                imageBuffer = await downloadMediaMessage(message, 'buffer', {}, {});
            }
            else {
                await sock.sendMessage(chatId, {
                    text: 'Please reply to an image or send an image with caption `.blur`'
                }, { quoted: message });
                return;
            }
            const resizedImage = await sharp(imageBuffer)
                .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .jpeg({ quality: 80 })
                .toBuffer();
            const blurredImage = await sharp(resizedImage)
                .blur(10)
                .toBuffer();
            await sock.sendMessage(chatId, {
                image: blurredImage,
                caption: '✨ *Image Blurred Successfully!*',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363319098372999@newsletter',
                        newsletterName: 'MEGA MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in blur command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to blur image. Please try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:blur] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .blur: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "blurimg": async (h) => module.exports["blur"](h),
    "blurpic": async (h) => module.exports["blur"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .invert ─── Convert an image to negative | usage: Reply to an image with .invert
    "invert": async (h) => {
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
        rawText: (h.config.prefix + 'invert ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(chatId, { text: '🤍 *Invert Image*\n\nReply to an image to convert it to negative\n\nUsage:\n.invert' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const tempFile = path.join(process.cwd(), `invert_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);
            const form = new FormData();
            form.append('apikey', 'guru');
            form.append('file', fs.createReadStream(tempFile));
            const res = await axios.post('https://discardapi.dpdns.org/api/image/invert', form, { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 });
            fs.unlinkSync(tempFile);
            if (!res?.data)
                throw new Error('Negative conversion failed');
            const grayFile = path.join(process.cwd(), `invert_result_${Date.now()}.jpg`);
            fs.writeFileSync(grayFile, res.data);
            await sock.sendMessage(chatId, {
                image: { url: grayFile },
                caption: `🤍 *Inverted Image*\n\nProcessed by: Henry Ochibots v19`
            }, { quoted: message });
            fs.unlinkSync(grayFile);
        }
        catch (err) {
            console.error('Invert Plugin Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to convert image to sepia. Make sure the image is clear and try again.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:invert] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .invert: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "negative": async (h) => module.exports["invert"](h),
  };
})());


Object.assign(module.exports, (() => {
  const QRCode = require('qrcode');

  return {

    // ── .qrcode ─── Generate a QR code from text | usage: .qrcode <text>
    "qrcode": async (h) => {
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
        rawText: (h.config.prefix + 'qrcode ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args?.join(' ')?.trim();
        if (!text) {
            return await sock.sendMessage(chatId, { text: '*Provide text to generate QR*\nExample: .qrcode Hello World' }, { quoted: message });
        }
        try {
            const qr = await QRCode.toDataURL(text.slice(0, 2048), {
                errorCorrectionLevel: 'H',
                scale: 8
            });
            await sock.sendMessage(chatId, { image: { url: qr }, caption: '✅ QR Code Generated' }, { quoted: message });
        }
        catch (err) {
            console.error('QR plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to generate QR code.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:qrcode] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .qrcode: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "qr": async (h) => module.exports["qrcode"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .qmaker ─── Create a quote image from text or replied message | usage: .qmaker <text> or reply to a message
    "qmaker": async (h) => {
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
        rawText: (h.config.prefix + 'qmaker ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        let text = args?.join(' ')?.trim();
        try {
            if (!text) {
                const quotedText = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
                if (!quotedText) {
                    return await sock.sendMessage(chatId, { text: '*Provide text or reply to a message to create a quote.*' }, { quoted: message });
                }
                text = quotedText;
            }
            const author = message.pushName || message?.key?.participant || 'Anonymous';
            const createRes = await fetch('https://quozio.com/api/v1/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author,
                    quote: text
                })
            });
            const quoteData = await createRes.json();
            if (!quoteData?.quoteId)
                throw new Error('Quote creation failed');
            const quoteId = quoteData.quoteId;
            const templatesRes = await fetch('https://quozio.com/api/v1/templates');
            const templatesData = await templatesRes.json();
            const templates = templatesData.data;
            if (!templates?.length)
                throw new Error('No templates found');
            const template = templates[Math.floor(Math.random() * templates.length)];
            const imageRes = await fetch(`https://quozio.com/api/v1/quotes/${quoteId}/imageUrls?templateId=${template.templateId}`);
            const imageData = await imageRes.json();
            if (!imageData?.medium)
                throw new Error('Image generation failed');
            await sock.sendMessage(chatId, { image: { url: imageData.medium }, caption: `📝 Quote Created\n\nAuthor: ${author}\n\n${text}` }, { quoted: message });
        }
        catch (error) {
            console.error('Quote plugin error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to create quote. Try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:qmaker] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .qmaker: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "qmkr": async (h) => module.exports["qmaker"](h),
    "quozio": async (h) => module.exports["qmaker"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from readmore.js ---
  const more = String.fromCharCode(8206);
  const readMore = more.repeat(4001);
  return {

    // ── .readmore ─── Hide text using read more | usage: .readmore text\n.readmore text1|text2
    "readmore": async (h) => {
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
        rawText: (h.config.prefix + 'readmore ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(chatId, { text: 'Usage:\n.readmore text\n.readmore text1|text2' }, { quoted: message });
        }
        let output;
        if (text.includes('|')) {
            const parts = text.split('|');
            const firstPart = parts.shift();
            const rest = parts.join('|');
            output = firstPart + readMore + rest;
        }
        else {
            output = text + readMore;
        }
        await sock.sendMessage(chatId, { text: output }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:readmore] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .readmore: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "rmadd": async (h) => module.exports["readmore"](h),
    "readadd": async (h) => module.exports["readmore"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .readqr ─── Read QR code from an image | usage: Reply to an image with .readqr
    "readqr": async (h) => {
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
        rawText: (h.config.prefix + 'readqr ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(chatId, { text: '🧾 *QR Reader*\n\n📌 Reply to an image that contains a QR code\n\nUsage:\n.readqr' }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                react: { text: '🔍', key: message.key }
            });
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const tempFile = path.join(process.cwd(), `qr_${Date.now()}.png`);
            fs.writeFileSync(tempFile, buffer);
            const form = new FormData();
            form.append('apikey', 'guru');
            form.append('image', fs.createReadStream(tempFile));
            const res = await axios.post('https://discardapi.dpdns.org/api/tools/readqr', form, { headers: form.getHeaders(), timeout: 60000 });
            fs.unlinkSync(tempFile);
            if (!res?.data?.status)
                throw new Error('Decode failed');
            await sock.sendMessage(chatId, {
                text: `✅ *QR Code Decoded*

📄 *Result:*
\`\`\`
${res.data.result}
\`\`\`

👤 ${res.data.creator}
`
            }, { quoted: message });
        }
        catch (err) {
            console.error('QR Reader Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to read QR code. Please try a clearer image.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:readqr] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .readqr: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "qrread": async (h) => module.exports["readqr"](h),
    "decodeqr": async (h) => module.exports["readqr"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const FormData = require('form-data');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  // --- helper code from removebg.js ---
  async function getImageBuffer(message) {
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMessage = quoted?.imageMessage || message.message?.imageMessage;
      if (!imageMessage)
          return null;
      const stream = await downloadContentFromMessage(imageMessage, 'image');
      const chunks = [];
      for await (const chunk of stream)
          chunks.push(chunk);
      return Buffer.concat(chunks);
  }
  return {

    // ── .removebg ─── Remove background from an image | usage: .removebg (reply to image or send image with caption)
    "removebg": async (h) => {
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
        rawText: (h.config.prefix + 'removebg ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const imageBuffer = await getImageBuffer(message);
            if (!imageBuffer) {
                return await sock.sendMessage(chatId, {
                    text: '📸 *Remove Background*\n\nUsage:\n' +
                        '• Reply to an image with `.removebg`\n' +
                        '• Send image with caption `.removebg`'
                }, { quoted: message });
            }
            const apiKey = process.env.REMOVEBG_KEY;
            if (!apiKey) {
                return await sock.sendMessage(chatId, {
                    text: '❌ RemoveBG API key not configured.'
                }, { quoted: message });
            }
            const form = new FormData();
            form.append('size', 'auto');
            form.append('image_file', imageBuffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });
            const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
                headers: { ...form.getHeaders(), 'X-Api-Key': apiKey },
                responseType: 'arraybuffer',
                timeout: 60000
            });
            await sock.sendMessage(chatId, {
                image: response.data,
                caption: '✨ *Background removed successfully*\n\n𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗘𝗚𝗔-𝗠𝗗'
            }, { quoted: message });
        }
        catch (err) {
            console.error('RemoveBG Error:', err?.response?.data || err.message);
            let msg = '❌ Failed to remove background.';
            if (err.response?.status === 402)
                msg = '💳 API quota exceeded.';
            else if (err.response?.status === 401)
                msg = '🔑 Invalid API key.';
            else if (err.code === 'ECONNABORTED')
                msg = '⏰ Request timeout. Try again.';
            await sock.sendMessage(chatId, { text: msg }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:removebg] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .removebg: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "rmbg": async (h) => module.exports["removebg"](h),
    "bgremove": async (h) => module.exports["removebg"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { uploadImage } = require('../lib_ported/uploadImage.js');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  // --- helper code from resize.js ---
  async function downloadMedia(msg, type) {
      const stream = await downloadContentFromMessage(msg, type);
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream)
          buffer = Buffer.concat([buffer, chunk]);
      return buffer;
  }
  return {

    // ── .length ─── Send an image or video with a custom file length | usage: .length <size> (reply to media)
    "length": async (h) => {
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
        rawText: (h.config.prefix + 'length ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const text = args?.join(' ')?.trim();
        try {
            let mediaMsg, mediaType;
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                if (quoted.imageMessage) {
                    mediaMsg = quoted.imageMessage;
                    mediaType = 'image';
                }
                else if (quoted.videoMessage) {
                    mediaMsg = quoted.videoMessage;
                    mediaType = 'video';
                }
            }
            if (!mediaMsg) {
                if (message.message?.imageMessage) {
                    mediaMsg = message.message.imageMessage;
                    mediaType = 'image';
                }
                else if (message.message?.videoMessage) {
                    mediaMsg = message.message.videoMessage;
                    mediaType = 'video';
                }
            }
            if (!mediaMsg) {
                return await sock.sendMessage(chatId, { text: '*⚠️ Reply to an image or video.*' }, { quoted: message });
            }
            if (!text || isNaN(text)) {
                return await sock.sendMessage(chatId, { text: '*🔢 Provide numeric file size.*\nExample: .length 999999' }, { quoted: message });
            }
            const buffer = await downloadMedia(mediaMsg, mediaType);
            const url = await uploadImage(buffer);
            await sock.sendMessage(chatId, mediaType === 'image'
                ? { image: { url }, caption: 'Here you go', fileLength: text }
                : { video: { url }, caption: 'Here you go', fileLength: text }, { quoted: message });
        }
        catch (err) {
            console.error('FileLength plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to process media.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:length] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .length: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "filelength": async (h) => module.exports["length"](h),
    "resize": async (h) => module.exports["length"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .reverse ─── Reverse any text | usage: .reverse <text>
    "reverse": async (h) => {
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
        rawText: (h.config.prefix + 'reverse ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const textToReverse = args?.join(' ')?.trim();
        if (!textToReverse) {
            return await sock.sendMessage(chatId, { text: 'Please provide text to reverse.\nExample: .reverse Hello World' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/tools/reverse?apikey=guru&text=${encodeURIComponent(textToReverse)}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !data.result) {
                return await sock.sendMessage(chatId, { text: '❌ Failed to reverse the text.' }, { quoted: message });
            }
            const reply = `*Reversed:* ${data.result}`;
            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
        }
        catch (error) {
            console.error('Reverse plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. Please try again.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to reverse the text.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:reverse] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .reverse: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "revt": async (h) => module.exports["reverse"](h),
    "reversetext": async (h) => module.exports["reverse"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .sepia ─── Convert an image to sepia | usage: Reply to an image with .sepia
    "sepia": async (h) => {
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
        rawText: (h.config.prefix + 'sepia ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(chatId, { text: '🧡 *Sepia Image*\n\nReply to an image to convert it to sepia\n\nUsage:\n.sepia' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const tempFile = path.join(process.cwd(), `sepia_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);
            const form = new FormData();
            form.append('apikey', 'guru');
            form.append('file', fs.createReadStream(tempFile));
            const res = await axios.post('https://discardapi.dpdns.org/api/image/sepia', form, { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 });
            fs.unlinkSync(tempFile);
            if (!res?.data)
                throw new Error('Sepia conversion failed');
            const grayFile = path.join(process.cwd(), `sepia_result_${Date.now()}.jpg`);
            fs.writeFileSync(grayFile, res.data);
            await sock.sendMessage(chatId, {
                image: { url: grayFile },
                caption: `🧡 *Sepia Image*\n\nProcessed by: Henry Ochibots v19`
            }, { quoted: message });
            fs.unlinkSync(grayFile);
        }
        catch (err) {
            console.error('Sepia Plugin Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to convert image to sepia. Make sure the image is clear and try again.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:sepia] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sepia: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "vintage": async (h) => module.exports["sepia"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  return {

    // ── .sharpen ─── Convert an image to sharpen | usage: Reply to an image with .sharpen
    "sharpen": async (h) => {
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
        rawText: (h.config.prefix + 'sharpen ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(chatId, { text: '🩵 *Sharpen Image*\n\nReply to an image to convert it to sepia\n\nUsage:\n.sharpen' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const tempFile = path.join(process.cwd(), `sepia_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, buffer);
            const form = new FormData();
            form.append('apikey', 'guru');
            form.append('file', fs.createReadStream(tempFile));
            const res = await axios.post('https://discardapi.dpdns.org/api/image/sharpen', form, { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 });
            fs.unlinkSync(tempFile);
            if (!res?.data)
                throw new Error('Sharpen conversion failed');
            const grayFile = path.join(process.cwd(), `sepia_result_${Date.now()}.jpg`);
            fs.writeFileSync(grayFile, res.data);
            await sock.sendMessage(chatId, {
                image: { url: grayFile },
                caption: `🩵 *Sharpen Image*\n\n𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚎𝚍 𝚋𝚢: 𝙼𝙴𝙶𝙰-𝙼𝙳`
            }, { quoted: message });
            fs.unlinkSync(grayFile);
        }
        catch (err) {
            console.error('Sharpen Plugin Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to convert image to sepia. Make sure the image is clear and try again.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:sharpen] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sharpen: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "enhance": async (h) => module.exports["sharpen"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from source.js ---
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

    // ── .getpage ─── Get the raw HTML source of a website | usage: .getpage <url>
    "getpage": async (h) => {
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
        rawText: (h.config.prefix + 'getpage ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const url = args[0];
        if (!url || !url.startsWith('http')) {
            return await sock.sendMessage(chatId, { text: 'Provide a valid URL (include http/https).' }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, { text: '🌐 *Fetching source code...*' });
            const res = await axios.get(url);
            const html = res.data;
            const buffer = Buffer.from(html, 'utf-8');
            await sock.sendMessage(chatId, {
                document: buffer,
                mimetype: 'text/html',
                fileName: 'source.html',
                caption: `*Source code for:* ${url}`
            }, { quoted: message });
        }
        catch (err) {
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch source. The site might be protected.' });
        }
    
      } catch (portErr) {
        console.error('[ported:getpage] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .getpage: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "source": async (h) => module.exports["getpage"](h),
    "viewsource": async (h) => module.exports["getpage"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .screenshot ─── Get a screenshot of a website | usage: .screenshot <url>
    "screenshot": async (h) => {
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
        rawText: (h.config.prefix + 'screenshot ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        let url = args?.[0]?.trim();
        if (!url) {
            return await sock.sendMessage(chatId, { text: '*Provide a URL.*\nExample: .screenshot https://github.com' }, { quoted: message });
        }
        if (!/^https?:\/\//i.test(url)) {
            url = `https://${ url}`;
        }
        try {
            new URL(url);
        }
        catch {
            return await sock.sendMessage(chatId, { text: '❌ Invalid URL provided.' }, { quoted: message });
        }
        try {
            const apiUrl = `https://discardapi.dpdns.org/api/tools/ssweb?apikey=guru&url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 10000,
            });
            const caption = `🌐 Screenshot of:\n${url}`;
            await sock.sendMessage(chatId, { image: { buffer: data }, caption }, { quoted: message });
        }
        catch (error) {
            console.error('Screenshot plugin error:', error);
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { text: '❌ Request timed out. The site may be slow or unreachable.' }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch screenshot. Make sure the URL is correct.' }, { quoted: message });
            }
        }
    
      } catch (portErr) {
        console.error('[ported:screenshot] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .screenshot: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ss": async (h) => module.exports["screenshot"](h),
    "ssweb": async (h) => module.exports["screenshot"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from tinytext.js ---
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

    // ── .smallcaps ─── Convert text to small-capital style | usage: .smallcaps <text> OR reply to a message
    "smallcaps": async (h) => {
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
        rawText: (h.config.prefix + 'smallcaps ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let txt = args?.join(' ') || "";
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                txt = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || txt;
            }
            txt = txt.replace(/^\.\w+\s*/, '').trim();
            if (!txt) {
                return await sock.sendMessage(chatId, {
                    text: 'Please provide text or reply to a message to convert.\nExample: `.smallcaps Hello World`'
                }, { quoted: message });
            }
            const capsMap = {
                'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ',
                'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ',
                'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
                'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ', 'J': 'ᴊ',
                'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 'S': 's', 'T': 'ᴛ',
                'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ',
                '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
            };
            const result = txt.split('').map((char) => capsMap[char] || char).join('');
            await sock.sendMessage(chatId, { text: result }, { quoted: message });
        }
        catch (err) {
            console.error('SmallCaps Error:', err);
            await sock.sendMessage(chatId, { text: '❌ Failed to process text.' });
        }
    
      } catch (portErr) {
        console.error('[ported:smallcaps] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .smallcaps: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "tinytext": async (h) => module.exports["smallcaps"](h),
    "mini": async (h) => module.exports["smallcaps"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const axios = require('axios');
  const FormData = require('form-data');
  const { fileTypeFromBuffer } = require('file-type');
  // --- helper code from tourl.js ---
  async function getMediaBuffer(msg, sock) {
      return await downloadMediaMessage(msg, 'buffer', {}, {
          logger: sock.logger,
          reuploadRequest: sock.updateMediaMessage
      });
  }
  function getQuotedMessage(message) {
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      if (!ctx?.quotedMessage)
          return null;
      return {
          key: {
              remoteJid: message.key.remoteJid,
              fromMe: false,
              id: ctx.stanzaId,
              participant: ctx.participant
          },
          message: ctx.quotedMessage
      };
  }
  return {

    // ── .tourl ─── Upload media and get a URL. | usage: .tourl (reply to media or send media with caption)
    "tourl": async (h) => {
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
        rawText: (h.config.prefix + 'tourl ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        try {
            let targetMsg = null;
            if (message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.audioMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage) {
                targetMsg = message;
            }
            if (!targetMsg) {
                const quoted = getQuotedMessage(message);
                if (quoted)
                    targetMsg = quoted;
            }
            if (!targetMsg) {
                return sock.sendMessage(chatId, { text: 'Reply to a media or send media with `.tourl`' }, { quoted: message });
            }
            const buffer = await getMediaBuffer(targetMsg, sock);
            if (!buffer)
                throw new Error('Failed to download media');
            if (buffer.length > 10 * 1024 * 1024) {
                return sock.sendMessage(chatId, { text: '✴️ Media exceeds 10 MB limit.' }, { quoted: message });
            }
            const type = await fileTypeFromBuffer(buffer);
            if (!type)
                throw new Error('Could not detect file type');
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, `upload.${type.ext}`);
            const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders() });
            const url = res.data;
            if (typeof url !== 'string' || !url.startsWith('https://')) {
                throw new Error('Invalid upload URL');
            }
            const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
            await sock.sendMessage(chatId, { text: `✅ Upload Successful\n🔗 ${url}\n💾 ${sizeMB} MB` }, { quoted: message });
        }
        catch (e) {
            console.error('Catbox upload error:', e);
            await sock.sendMessage(chatId, { text: `❌ Upload failed: ${e.message}` }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:tourl] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tourl: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "mediaurl": async (h) => module.exports["tourl"](h),
    "upload": async (h) => module.exports["tourl"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const fs = require('fs');
  const path = require('path');
  const { UploadFileUgu, TelegraPh } = require('../lib_ported/uploader.js');
  // --- helper code from url.js ---
  async function getMediaBuffer(msg, sock) {
      return await downloadMediaMessage(msg, 'buffer', {}, {
          logger: sock.logger,
          reuploadRequest: sock.updateMediaMessage
      });
  }
  function getQuotedMessage(message) {
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      if (!ctx?.quotedMessage)
          return null;
      return {
          key: {
              remoteJid: message.key.remoteJid,
              fromMe: false,
              id: ctx.stanzaId,
              participant: ctx.participant
          },
          message: ctx.quotedMessage
      };
  }
  function getExtFromMessage(msg) {
      const m = msg.message;
      if (m.imageMessage)
          return '.jpg';
      if (m.videoMessage)
          return '.mp4';
      if (m.audioMessage)
          return '.mp3';
      if (m.stickerMessage)
          return '.webp';
      if (m.documentMessage) {
          return path.extname(m.documentMessage.fileName || '') || '.bin';
      }
      return null;
  }
  return {

    // ── .url ─── Get a URL for media (image, video, audio, sticker, document). | usage: .url (send or reply to media)
    "url": async (h) => {
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
        rawText: (h.config.prefix + 'url ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let targetMsg = null;
            if (message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.audioMessage ||
                message.message?.stickerMessage ||
                message.message?.documentMessage) {
                targetMsg = message;
            }
            if (!targetMsg) {
                const quoted = getQuotedMessage(message);
                if (quoted)
                    targetMsg = quoted;
            }
            if (!targetMsg) {
                return sock.sendMessage(chatId, { text: 'Send or reply to a media to get a URL.' }, { quoted: message });
            }
            const ext = getExtFromMessage(targetMsg);
            if (!ext)
                throw new Error('Unsupported media type');
            const buffer = await getMediaBuffer(targetMsg, sock);
            if (!buffer)
                throw new Error('Failed to download media');
            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `${Date.now()}${ext}`);
            fs.writeFileSync(tempPath, buffer);
            let url = '';
            try {
                if (['.jpg', '.png', '.webp'].includes(ext)) {
                    try {
                        url = await TelegraPh(tempPath);
                    }
                    catch {
                        const res = await UploadFileUgu(tempPath);
                        url = typeof res === 'string'
                            ? res
                            : (res.url || res.url_full || '');
                    }
                }
                else {
                    const res = await UploadFileUgu(tempPath);
                    url = typeof res === 'string'
                        ? res
                        : (res.url || res.url_full || '');
                }
            }
            finally {
                setTimeout(() => {
                    try {
                        fs.unlinkSync(tempPath);
                    }
                    catch { }
                }, 2000);
            }
            if (!url) {
                return sock.sendMessage(chatId, { text: 'Failed to upload media.' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { text: `URL: ${url}` }, { quoted: message });
        }
        catch (error) {
            console.error('[URL] error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to convert media to URL.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:url] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .url: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "geturl": async (h) => module.exports["url"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const { promisify } = require('util');
  // --- helper code from vnote.js ---
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
   *****************************************************************************/
  
  
  
  
  
  const execAsync = promisify(exec);
  return {

    // ── .vnote ─── Convert any audio message into a voice note | usage: Reply to an audio file with .vnote
    "vnote": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const _args = h.args;
      const _context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'vnote ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.audioMessage) {
            return sock.sendMessage(chatId, {
                text: '❌ Please reply to an *audio file* to convert it to a voice note.'
            }, { quoted: message });
        }
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir))
            fs.mkdirSync(tmpDir, { recursive: true });
        const tmpIn = path.join(tmpDir, `vnote_in_${Date.now()}`);
        const tmpOut = path.join(tmpDir, `vnote_out_${Date.now()}.ogg`);
        try {
            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream)
                buffer = Buffer.concat([buffer, chunk]);
            console.log('[VNOTE] original size:', buffer.length, 'mimetype:', quoted.audioMessage.mimetype);
            fs.writeFileSync(tmpIn, buffer);
            await execAsync(`ffmpeg -y -i "${tmpIn}" -c:a libopus -b:a 64k -ar 48000 -ac 1 "${tmpOut}"`);
            const opusBuffer = fs.readFileSync(tmpOut);
            console.log('[VNOTE] converted size:', opusBuffer.length);
            await sock.sendMessage(chatId, {
                audio: opusBuffer,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus'
            }, { quoted: message });
        }
        catch (error) {
            console.error('[VNOTE] Error:', error.message);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to convert audio to voice note.'
            }, { quoted: message });
        }
        finally {
            try {
                fs.unlinkSync(tmpIn);
            }
            catch { }
            try {
                fs.unlinkSync(tmpOut);
            }
            catch { }
        }
    
      } catch (portErr) {
        console.error('[ported:vnote] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .vnote: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "voicenote": async (h) => module.exports["vnote"](h),
    "vn": async (h) => module.exports["vnote"](h),
  };
})());

