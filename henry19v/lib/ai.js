'use strict';
const axios  = require('axios');
const config = require('../config');

const MODELS = [
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma-7b-it',
];

const SYSTEM_PROMPT = `You are Henry Agent19v, a smart, friendly WhatsApp assistant created by Henrydev.ke (Henry Ogolla, +254775351698).
You are Kenyan and fluent in English, Swahili, and Sheng (Kenyan street slang).

RULES:
1. Detect the language the user writes in and ALWAYS reply in the same language.
   - Sheng (e.g. "niko fiti", "niaje", "maze", "si unajua") → reply in Sheng
   - Swahili → reply in Swahili
   - English → reply in English
   - Mix (Kenglish) → mix your reply too
2. Keep replies SHORT and casual — like a real WhatsApp friend. 1-3 sentences max.
3. Be warm, funny sometimes, very human-like. Don't start every reply with "Hello" or "Hi".
4. Use emoji occasionally but not too much.
5. Your owner/creator is Henry Ogolla (Henrydev.ke), +254775351698.
6. For non-chat questions (facts, help, etc.) give a clear, concise helpful answer.`;

const conversationCache = new Map();

async function askAI(jid, userMessage, systemOverride) {
  if (!config.groqApiKey) {
    return '❌ AI haijasetup. Mwambie owner aongeze GROQ_API_KEY kwenye .env';
  }

  if (!conversationCache.has(jid)) conversationCache.set(jid, []);
  const history = conversationCache.get(jid);
  history.push({ role: 'user', content: userMessage });
  if (history.length > 12) history.splice(0, 2);

  const sysPrompt = systemOverride || SYSTEM_PROMPT;

  for (const model of MODELS) {
    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          max_tokens: 512,
          messages: [
            { role: 'system', content: sysPrompt },
            ...history,
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      const reply = res.data.choices?.[0]?.message?.content?.trim();
      if (reply) {
        history.push({ role: 'assistant', content: reply });
        return reply;
      }
    } catch (err) {
      if (err.response?.status === 429 || err.response?.status === 503) continue;
      console.error(`[AI] Error with ${model}:`, err.message);
    }
  }
  return '❌ AI haiwezi sasa. Jaribu tena baadaye.';
}

function clearAIHistory(jid) {
  conversationCache.delete(jid);
}

module.exports = { askAI, clearAIHistory };
