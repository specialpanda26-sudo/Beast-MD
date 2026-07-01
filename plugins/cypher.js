// ── CYPHER X - RPG & Utility ──────────────────────────────────────────────────
const sessions = {};
const axios = require('axios');

module.exports = {

  // ── .imagine [prompt] ──────────────────────────────────────────────────────
  // Free, keyless AI image generation via Pollinations.ai (no API key needed —
  // unlike DALL-E/Flux which require paid accounts). Good enough quality for
  // a WhatsApp bot feature without asking Henry to manage another API key.
  imagine: async ({ sock, from, msg, args }) => {
    const prompt = args.join(' ');
    if (!prompt) return sock.sendMessage(from, { text: '🎨 Usage: .imagine [description]\nExample: .imagine a lion wearing sunglasses, cyberpunk style' }, { quoted: msg });

    await sock.sendMessage(from, { text: '🎨 Generating image...' }, { quoted: msg });
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&nologo=true`;
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
      await sock.sendMessage(from, { image: Buffer.from(res.data), caption: `🎨 *${prompt}*` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Image generation failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .tts [text] ────────────────────────────────────────────────────────────
  // Free, keyless text-to-speech via Google Translate's public TTS endpoint.
  // Good for short phrases; splits long text into <200 char chunks since
  // that endpoint caps input length.
  tts: async ({ sock, from, msg, args }) => {
    const text = args.join(' ');
    if (!text) return sock.sendMessage(from, { text: '🔊 Usage: .tts [text]' }, { quoted: msg });
    if (text.length > 200) return sock.sendMessage(from, { text: '❌ Keep it under 200 characters for .tts.' }, { quoted: msg });

    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      await sock.sendMessage(from, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ TTS failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .model ─────────────────────────────────────────────────────────────────
  // Switch which Groq model /ask uses, per chat. Reuses the Groq key Henry
  // already has configured — no new API key needed. Stored in global so
  // client_bridge.js's /ask handler can read it if wired up to check it.
  model: async ({ sock, from, msg, args }) => {
    const available = {
      llama:  'llama3-70b-8192',
      llama8: 'llama3-8b-8192',
      mixtral: 'mixtral-8x7b-32768',
      gemma:  'gemma2-9b-it',
    };
    const choice = (args[0] || '').toLowerCase();
    if (!choice) {
      const current = global.aiModel?.[from] || 'llama3-8b-8192 (default)';
      return sock.sendMessage(from, {
        text: `🤖 *AI Model*\n\nCurrent: ${current}\n\nAvailable: ${Object.keys(available).join(', ')}\nUsage: .model llama`
      }, { quoted: msg });
    }
    if (!available[choice]) {
      return sock.sendMessage(from, { text: `❌ Unknown model. Choose from: ${Object.keys(available).join(', ')}` }, { quoted: msg });
    }
    global.aiModel = global.aiModel || {};
    global.aiModel[from] = available[choice];
    await sock.sendMessage(from, { text: `✅ AI model for this chat set to *${available[choice]}*` }, { quoted: msg });
  },

  // ── .roll [dice] e.g .roll 3d6+2 ──────────────────────────────────────────
  roll: async ({ sock, from, msg, args }) => {
    const input = args[0] || '1d6';
    const match = input.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) return sock.sendMessage(from, { text: '🎲 Usage: .roll 3d6+2\nFormat: [count]d[sides][+/-modifier]' }, { quoted: msg });

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const mod = parseInt(match[3] || 0);

    if (count > 20 || sides > 100) return sock.sendMessage(from, { text: '❌ Max 20 dice, 100 sides!' });

    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
    const total = rolls.reduce((a, b) => a + b, 0) + mod;

    let text = `🎲 *Dice Roll: ${input}*\n\n`;
    text += `Results: [${rolls.join(', ')}]\n`;
    if (mod !== 0) text += `Modifier: ${mod > 0 ? '+' : ''}${mod}\n`;
    text += `\n🏆 *Total: ${total}*`;

    await sock.sendMessage(from, { text }, { quoted: msg });
  },

  // ── .pbp [action] - Play by Post RPG tracker ───────────────────────────────
  pbp: async ({ sock, from, msg, sender, args }) => {
    const action = args[0]?.toLowerCase();
    const tag = args[1] || 'default';

    if (!action) {
      return sock.sendMessage(from, {
        text: '🎮 *PbP Tracker*\n\n.pbp start [tag] - Start session\n.pbp log [tag] [text] - Add to log\n.pbp show [tag] - Show session\n.pbp end [tag] - End session'
      }, { quoted: msg });
    }

    const key = `${from}_${tag}`;

    if (action === 'start') {
      sessions[key] = { tag, log: [], started: new Date().toLocaleString(), owner: sender };
      await sock.sendMessage(from, { text: `⚔️ RPG Session *${tag}* started!\nUse: .pbp log ${tag} [your action]` }, { quoted: msg });
    } else if (action === 'log') {
      if (!sessions[key]) return sock.sendMessage(from, { text: `❌ No session "${tag}". Start with .pbp start ${tag}` });
      const entry = args.slice(2).join(' ');
      if (!entry) return sock.sendMessage(from, { text: '❌ Add your action text!' });
      sessions[key].log.push(`• ${entry}`);
      await sock.sendMessage(from, { text: `✅ Logged to session *${tag}*` }, { quoted: msg });
    } else if (action === 'show') {
      if (!sessions[key]) return sock.sendMessage(from, { text: `❌ No session found for "${tag}"` });
      const s = sessions[key];
      const text = `📜 *Session: ${s.tag}*\nStarted: ${s.started}\n\n${s.log.join('\n') || 'No entries yet.'}`;
      await sock.sendMessage(from, { text }, { quoted: msg });
    } else if (action === 'end') {
      delete sessions[key];
      await sock.sendMessage(from, { text: `🏁 Session *${tag}* ended and cleared.` }, { quoted: msg });
    }
  },

  // ── .summarize ─────────────────────────────────────────────────────────────
  summarize: async ({ sock, from, msg, args, config, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const text = args.join(' ') || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    if (!text) return sock.sendMessage(from, { text: '📝 Usage: .summarize [text] or reply to a message' }, { quoted: msg });
    if (!config.groqApiKey) return sock.sendMessage(from, { text: '❌ No Groq API key set!' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Summarizing...' }, { quoted: msg });

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Summarize the following text clearly and concisely.' },
            { role: 'user', content: text },
          ],
          max_tokens: 300,
        }),
      });
      const data = await res.json();
      const summary = data.choices?.[0]?.message?.content || 'Could not summarize.';
      await sock.sendMessage(from, { text: `📋 *Summary:*\n\n${summary}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ AI Error: ${e.message}` }, { quoted: msg });
    }
  },
};
