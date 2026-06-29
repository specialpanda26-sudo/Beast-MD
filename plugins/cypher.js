// ── CYPHER X - RPG & Utility ──────────────────────────────────────────────────
const sessions = {};

module.exports = {

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
  summarize: async ({ sock, from, msg, args, config }) => {
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
