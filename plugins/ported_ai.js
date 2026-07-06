// AUTO-PORTED from friend's MEGA-MD bot (category: ai)
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
  // --- helper code from ai-llama.js ---
  const AI_APIS = [
      (q) => `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
      (q) => `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
      (q) => `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`
  ];
  const askAI = async (query) => {
      for (const apiUrl of AI_APIS) {
          try {
              const { data } = await axios.get(apiUrl(query), { timeout: 15000 });
              const response = data?.data?.response;
              if (response && typeof response === 'string' && response.trim()) {
                  return response.trim();
              }
          }
          catch {
              continue;
          }
      }
      throw new Error('All AI APIs failed');
  };
  return {

    // ── .llama ─── Ask a question to AI | usage: .llama <question>
    "llama": async (h) => {
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
        rawText: (h.config.prefix + 'llama ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, config } = context;
        const prefix = config.prefix;
        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, { text: `🤖 *AI Assistant*\n\nUsage: \`${prefix}llama <your question>\`\nExample: \`${prefix}llama explain quantum physics\`` }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });
            const answer = await askAI(query);
            await sock.sendMessage(chatId, { text: answer }, { quoted: message });
        }
        catch (error) {
            console.error('AI Command Error:', error.message);
            await sock.sendMessage(chatId, { text: '❌ Failed to get AI response. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:llama] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .llama: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from ai-mistral.js ---
  const AI_APIS = [
      (q) => `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
      (q) => `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
      (q) => `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`
  ];
  const askAI = async (query) => {
      for (const apiUrl of AI_APIS) {
          try {
              const { data } = await axios.get(apiUrl(query), { timeout: 15000 });
              const response = data?.data?.response;
              if (response && typeof response === 'string' && response.trim()) {
                  return response.trim();
              }
          }
          catch {
              continue;
          }
      }
      throw new Error('All AI APIs failed');
  };
  return {

    // ── .mistral ─── Ask a question to AI | usage: .mistral <question>
    "mistral": async (h) => {
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
        rawText: (h.config.prefix + 'mistral ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, { text: '🤖 *AI Assistant*\n\nUsage: `.mistral <your question>`\nExample: `.mistral explain quantum physics`' }, { quoted: message });
        }
        try {
            await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });
            const answer = await askAI(query);
            await sock.sendMessage(chatId, { text: answer }, { quoted: message });
        }
        catch (error) {
            console.error('AI Command Error:', error.message);
            await sock.sendMessage(chatId, { text: '❌ Failed to get AI response. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:mistral] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .mistral: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from imagen-dalle.js ---
  const IMAGE_APIS = [
      (p) => `https://stable.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
      (p) => `https://dalle.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
      (p) => `https://flux.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(p)}`
  ];
  const generateImage = async (prompt) => {
      for (const apiUrl of IMAGE_APIS) {
          try {
              const { data } = await axios.get(apiUrl(prompt), {
                  responseType: 'arraybuffer',
                  timeout: 30000
              });
              const buf = Buffer.from(data);
              // Validate it's actually an image (PNG/JPEG magic bytes)
              if (buf[0] === 0x89 || buf[0] === 0xFF)
                  return buf;
          }
          catch {
              continue;
          }
      }
      throw new Error('All image generation APIs failed');
  };
  const enhancePrompt = (prompt) => {
      const enhancers = [
          'high quality', 'detailed', 'masterpiece', 'best quality',
          'ultra realistic', '4k', 'highly detailed', 'cinematic lighting'
      ];
      const selected = enhancers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 2) + 3);
      return `${prompt}, ${selected.join(', ')}`;
  };
  return {

    // ── .dalle ─── Generate an AI image based on your prompt | usage: .dalle <prompt>
    "dalle": async (h) => {
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
        rawText: (h.config.prefix + 'dalle ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const imagePrompt = args.join(' ').trim();
        if (!imagePrompt) {
            return sock.sendMessage(chatId, { text: '🎨 *AI Image Generator*\n\nUsage: `.dalle <prompt>`\nExample: `.dalle a beautiful sunset over mountains`' }, { quoted: message });
        }
        await sock.sendMessage(chatId, { react: { text: '🎨', key: message.key } });
        await sock.sendMessage(chatId, { text: '🎨 Generating your image... Please wait.' }, { quoted: message });
        try {
            const enhanced = enhancePrompt(imagePrompt);
            const imageBuffer = await generateImage(enhanced);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🎨 *Generated Image*\n📝 Prompt: _${imagePrompt}_`
            }, { quoted: message });
        }
        catch (error) {
            console.error('Imagine error:', error.message);
            await sock.sendMessage(chatId, { text: '❌ Failed to generate image. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:dalle] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .dalle: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "aiimage": async (h) => module.exports["dalle"](h),
    "draw": async (h) => module.exports["dalle"](h),
    "genimage": async (h) => module.exports["dalle"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from imagen-flux.js ---
  const IMAGE_APIS = [
      (p) => `https://stable.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
      (p) => `https://dalle.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
      (p) => `https://flux.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(p)}`
  ];
  const generateImage = async (prompt) => {
      for (const apiUrl of IMAGE_APIS) {
          try {
              const { data } = await axios.get(apiUrl(prompt), {
                  responseType: 'arraybuffer',
                  timeout: 30000
              });
              const buf = Buffer.from(data);
              if (buf[0] === 0x89 || buf[0] === 0xFF)
                  return buf;
          }
          catch {
              continue;
          }
      }
      throw new Error('All image generation APIs failed');
  };
  const enhancePrompt = (prompt) => {
      const enhancers = [
          'high quality', 'detailed', 'masterpiece', 'best quality',
          'ultra realistic', '4k', 'highly detailed', 'cinematic lighting'
      ];
      const selected = enhancers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 2) + 3);
      return `${prompt}, ${selected.join(', ')}`;
  };
  return {

    // ── .flux ─── Generate an AI image based on your prompt | usage: .flux <prompt>
    "flux": async (h) => {
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
        rawText: (h.config.prefix + 'flux ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const imagePrompt = args.join(' ').trim();
        if (!imagePrompt) {
            return sock.sendMessage(chatId, { text: '🎨 *AI Image Generator*\n\nUsage: `.flux <prompt>`\nExample: `.flux a beautiful sunset over mountains`' }, { quoted: message });
        }
        await sock.sendMessage(chatId, { react: { text: '🎨', key: message.key } });
        await sock.sendMessage(chatId, { text: '🎨 Generating your image... Please wait.' }, { quoted: message });
        try {
            const enhanced = enhancePrompt(imagePrompt);
            const imageBuffer = await generateImage(enhanced);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🎨 *Generated Image*\n📝 Prompt: _${imagePrompt}_`
            }, { quoted: message });
        }
        catch (error) {
            console.error('Imagine error:', error.message);
            await sock.sendMessage(chatId, { text: '❌ Failed to generate image. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:flux] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .flux: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "imagen": async (h) => module.exports["flux"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from imagine-diffusion.js ---
  const IMAGE_APIS = [
      (p) => `https://stable.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
      (p) => `https://dalle.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
      (p) => `https://flux.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(p)}`
  ];
  const generateImage = async (prompt) => {
      for (const apiUrl of IMAGE_APIS) {
          try {
              const { data } = await axios.get(apiUrl(prompt), {
                  responseType: 'arraybuffer',
                  timeout: 30000
              });
              const buf = Buffer.from(data);
              if (buf[0] === 0x89 || buf[0] === 0xFF)
                  return buf;
          }
          catch {
              continue;
          }
      }
      throw new Error('All image generation APIs failed');
  };
  const enhancePrompt = (prompt) => {
      const enhancers = [
          'high quality', 'detailed', 'masterpiece', 'best quality',
          'ultra realistic', '4k', 'highly detailed', 'cinematic lighting'
      ];
      const selected = enhancers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 2) + 3);
      return `${prompt}, ${selected.join(', ')}`;
  };
  return {

    // ── .diffusion ─── Generate an AI image based on your prompt | usage: .diffusion <prompt>
    "diffusion": async (h) => {
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
        rawText: (h.config.prefix + 'diffusion ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const imagePrompt = args.join(' ').trim();
        if (!imagePrompt) {
            return sock.sendMessage(chatId, { text: '🎨 *AI Image Generator*\n\nUsage: `.diffusion <prompt>`\nExample: `.diffusion a beautiful sunset over mountains`' }, { quoted: message });
        }
        await sock.sendMessage(chatId, { react: { text: '🎨', key: message.key } });
        await sock.sendMessage(chatId, { text: '🎨 Generating your image... Please wait.' }, { quoted: message });
        try {
            const enhanced = enhancePrompt(imagePrompt);
            const imageBuffer = await generateImage(enhanced);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🎨 *Generated Image*\n📝 Prompt: _${imagePrompt}_`
            }, { quoted: message });
        }
        catch (error) {
            console.error('Imagine error:', error.message);
            await sock.sendMessage(chatId, { text: '❌ Failed to generate image. Please try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:diffusion] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .diffusion: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .sora ─── Generate AI video from text prompt | usage: .sora <prompt>
    "sora": async (h) => {
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
        rawText: (h.config.prefix + 'sora ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
            const input = args.join(' ') || quotedText;
            if (!input) {
                await sock.sendMessage(chatId, {
                    text: 'Provide a prompt. Example: .sora anime girl with short blue hair',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
            const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(input)}`;
            const { data } = await axios.get(apiUrl, { timeout: 60000, headers: { 'user-agent': 'Mozilla/5.0' } });
            const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;
            if (!videoUrl) {
                throw new Error('No videoUrl in API response');
            }
            await sock.sendMessage(chatId, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: `Prompt: ${input}`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            console.error('[SORA] error:', error?.message || error);
            await sock.sendMessage(chatId, {
                text: 'Failed to generate video. Try a different prompt later.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:sora] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sora: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "txt2video": async (h) => module.exports["sora"](h),
    "aiVideo": async (h) => module.exports["sora"](h),
  };
})());

