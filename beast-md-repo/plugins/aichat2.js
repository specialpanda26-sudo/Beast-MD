// ── Multi-Provider AI Chat (ported/rebuilt from atassa) ─────────────────────
// Your bot already has AI DM/group chat + .model (Groq model switcher).
// This adds direct one-off calls to other providers for people who want a
// specific model without switching the whole chat's default. Each needs its
// own API key env var — commands reply with a clear setup message if the
// key isn't set, rather than failing silently or faking a response.

const axios = require('axios');

async function callOpenAI(prompt, model, apiKey) {
  const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
    model, messages: [{ role: 'user', content: prompt }],
  }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });
  return data.choices[0].message.content;
}

async function callGemini(prompt, apiKey) {
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { timeout: 30000 }
  );
  return data.candidates[0].content.parts[0].text;
}

function missingKeyMsg(envVar, provider) {
  return `🔑 *${provider}* isn't configured yet. Set the *${envVar}* environment variable (get a key from the provider's dashboard) and restart the bot to enable this command.`;
}

module.exports = {

  gpt: async ({ sock, from, msg, args }) => {
    const prompt = args.join(' ');
    if (!prompt) return sock.sendMessage(from, { text: '📝 Usage: .gpt <question>' }, { quoted: msg });
    const key = process.env.OPENAI_API_KEY;
    if (!key) return sock.sendMessage(from, { text: missingKeyMsg('OPENAI_API_KEY', 'GPT (OpenAI)') }, { quoted: msg });
    try {
      const reply = await callOpenAI(prompt, 'gpt-3.5-turbo', key);
      await sock.sendMessage(from, { text: `🤖 ${reply}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.response?.data?.error?.message || e.message}` }, { quoted: msg }); }
  },

  gpt4: async ({ sock, from, msg, args }) => {
    const prompt = args.join(' ');
    if (!prompt) return sock.sendMessage(from, { text: '📝 Usage: .gpt4 <question>' }, { quoted: msg });
    const key = process.env.OPENAI_API_KEY;
    if (!key) return sock.sendMessage(from, { text: missingKeyMsg('OPENAI_API_KEY', 'GPT-4') }, { quoted: msg });
    try {
      const reply = await callOpenAI(prompt, 'gpt-4o-mini', key);
      await sock.sendMessage(from, { text: `🤖 ${reply}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.response?.data?.error?.message || e.message}` }, { quoted: msg }); }
  },

  gpt4o: async (ctx) => module.exports.gpt4(ctx),
  openai: async (ctx) => module.exports.gpt(ctx),
  chatai: async (ctx) => module.exports.gpt(ctx),
  giftedai: async (ctx) => module.exports.gpt(ctx),
  letmegpt: async (ctx) => module.exports.gpt(ctx),

  gemini: async ({ sock, from, msg, args }) => {
    const prompt = args.join(' ');
    if (!prompt) return sock.sendMessage(from, { text: '📝 Usage: .gemini <question>' }, { quoted: msg });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return sock.sendMessage(from, { text: missingKeyMsg('GEMINI_API_KEY', 'Gemini') }, { quoted: msg });
    try {
      const reply = await callGemini(prompt, key);
      await sock.sendMessage(from, { text: `✨ ${reply}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.response?.data?.error?.message || e.message}` }, { quoted: msg }); }
  },

  // Venice AI has no official free public endpoint at time of writing —
  // wired to read from VENICE_API_KEY/VENICE_API_URL so it's a one-line
  // fill-in if/when you have access, instead of a fake response.
  venice: async ({ sock, from, msg, args }) => {
    const prompt = args.join(' ');
    if (!prompt) return sock.sendMessage(from, { text: '📝 Usage: .venice <question>' }, { quoted: msg });
    const key = process.env.VENICE_API_KEY;
    const url = process.env.VENICE_API_URL;
    if (!key || !url) return sock.sendMessage(from, { text: missingKeyMsg('VENICE_API_KEY and VENICE_API_URL', 'Venice AI') }, { quoted: msg });
    try {
      const { data } = await axios.post(url, { prompt }, { headers: { Authorization: `Bearer ${key}` }, timeout: 30000 });
      await sock.sendMessage(from, { text: `🔮 ${data.response || JSON.stringify(data)}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },
};
