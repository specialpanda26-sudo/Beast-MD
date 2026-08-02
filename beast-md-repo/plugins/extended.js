// plugins/extended.js
// ─────────────────────────────────────────────────────────────────────────
// ✅ NEW FILE — extended-commands update.
// Adds AI/Content, Group Intelligence, Moderation, Polls, Auto-Reply, extra
// Standard Group Admin, and a few Media/Utility commands.
//
// Deliberately SKIPPED here because they already exist elsewhere in the bot
// (no duplicates added):
//   .kick .promote .demote        → plugins/group.js
//   .schedule ... / .broadcast    → existing scheduler + .announce/.bcgc
//   .summarize                    → existing owner-only command (cypher.js)
//   .tt (TikTok-only download)    → already covered by .dl / .download
//
// Built as thin wrappers around EXISTING infrastructure (not duplicate
// systems) where one already existed:
//   .autoreply   → same `keywords` table the Admin Panel's Keywords tab uses
//   .warn        → same `group_warnings` table / 3-strike logic as the
//                  existing antilink auto-strike system
//   .fullpp      → same profilePictureUrl mechanism as .getpp, just
//                  requesting the high-res variant
//   .antidelete / .autoview → same recentMsgCache/log-viewonce plumbing
//                  already used by .vv / .save / the 🌝 recovery reaction
// ─────────────────────────────────────────────────────────────────────────

const SETTING_KEYS = {
  PERSONA: 'persona',
  SILENCE: 'silence',
  ANTIDELETE: 'antidelete',
  AUTOVIEW: 'autoview',
  AUTOREACT: 'autoreact',
  FULLPP: 'fullpp_default',
};

function memKey(key) {
  return `mem:${key}`;
}

async function getSetting(apiClient, chatId, key) {
  try {
    const res = await apiClient.get('/chat-settings/get', { params: { chat_id: chatId, key } });
    return res?.data?.value ?? null;
  } catch (_) {
    return null;
  }
}

async function setSetting(apiClient, chatId, key, value) {
  try {
    await apiClient.post('/chat-settings/set', { chat_id: chatId, key, value });
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {

  // ═══════════════════════════════════════════════════════════════════════
  // AI & CONTENT
  // ═══════════════════════════════════════════════════════════════════════

  // .persona [description] — sets a custom AI personality for THIS chat.
  // .persona clear — resets to the bot's default personality.
  // .persona — shows the current one.
  persona: async ({ sock, from, msg, args, apiClient }) => {
    if (!args.length) {
      const current = await getSetting(apiClient, from, SETTING_KEYS.PERSONA);
      await sock.sendMessage(from, {
        text: current
          ? `🎭 Current persona for this chat:\n"${current}"`
          : `🎭 No custom persona set for this chat. Using default.\n\nUse *.persona [description]* to set one, e.g.\n*.persona a sarcastic pirate who loves tech*`
      }, { quoted: msg });
      return;
    }
    if (args[0].toLowerCase() === 'clear') {
      await apiClient.post('/chat-settings/delete', { chat_id: from, key: SETTING_KEYS.PERSONA }).catch(() => {});
      await sock.sendMessage(from, { text: '🎭 Persona cleared — back to default.' }, { quoted: msg });
      return;
    }
    const persona = args.join(' ');
    await setSetting(apiClient, from, SETTING_KEYS.PERSONA, persona);
    await sock.sendMessage(from, { text: `🎭 Persona set for this chat:\n"${persona}"\n\n_Note: applies to .ask and this chat's AI replies going forward._` }, { quoted: msg });
  },

  // .translate <lang> <text>
  translate: async ({ sock, from, msg, args, apiClient }) => {
    if (args.length < 2) {
      await sock.sendMessage(from, { text: '⚠️ Usage: *.translate [language] [text]*\ne.g. *.translate french Good morning*' }, { quoted: msg });
      return;
    }
    const lang = args[0];
    const text = args.slice(1).join(' ');
    try {
      const res = await apiClient.post('/ai/reply', {
        prompt: text,
        system: `You are a translator. Translate the user's message into ${lang}. Reply with ONLY the translation, no explanation, no quotes.`
      });
      const reply = res?.data?.reply;
      await sock.sendMessage(from, { text: reply ? `🌐 ${reply}` : '❌ Translation failed — AI may not be configured.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Translate error: ${e.message}` }, { quoted: msg });
    }
  },

  // .remember <key> <value> — save a note for this chat
  remember: async ({ sock, from, msg, args, apiClient }) => {
    if (args.length < 2) {
      await sock.sendMessage(from, { text: '⚠️ Usage: *.remember [key] [value]*\ne.g. *.remember wifi password12345*' }, { quoted: msg });
      return;
    }
    const key = args[0].toLowerCase();
    const value = args.slice(1).join(' ');
    await setSetting(apiClient, from, memKey(key), value);
    await sock.sendMessage(from, { text: `🧠 Remembered *${key}* for this chat.\nUse *.recall ${key}* to get it back.` }, { quoted: msg });
  },

  // .recall <key> — get back a saved note. .recall with no args isn't
  // supported (there's no list endpoint for arbitrary keys) — keeps this
  // simple and avoids scanning all chat_settings rows on every call.
  recall: async ({ sock, from, msg, args, apiClient }) => {
    if (!args.length) {
      await sock.sendMessage(from, { text: '⚠️ Usage: *.recall [key]*' }, { quoted: msg });
      return;
    }
    const key = args[0].toLowerCase();
    const value = await getSetting(apiClient, from, memKey(key));
    await sock.sendMessage(from, {
      text: value ? `🧠 *${key}*: ${value}` : `❌ Nothing remembered under *${key}* in this chat.`
    }, { quoted: msg });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GROUP INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════

  // .activity [hours] — message volume for this group over a window (default 24h)
  activity: async ({ sock, from, msg, args, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const hours = parseFloat(args[0]) || 24;
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours } });
      const d = res.data;
      const lines = [`📊 *Group activity — last ${hours}h*`, `Messages: ${d.total_messages}`, `Active people: ${d.unique_participants}`];
      await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Couldn't load activity: ${e.message}` }, { quoted: msg });
    }
  },

  // .active [hours] — top most active members
  active: async ({ sock, from, msg, args, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const hours = parseFloat(args[0]) || 24;
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours } });
      const list = res.data.most_active || [];
      if (!list.length) return sock.sendMessage(from, { text: 'No activity recorded yet in this window.' }, { quoted: msg });
      const text = `🏆 *Most active (last ${hours}h)*\n\n` + list.map((u, i) => `${i + 1}. ${u.name || u.sender} — ${u.messages} msgs`).join('\n');
      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .topics [hours] — most-mentioned words/topics
  topics: async ({ sock, from, msg, args, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const hours = parseFloat(args[0]) || 24;
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours } });
      const topics = res.data.top_topics || [];
      if (!topics.length) return sock.sendMessage(from, { text: 'Not enough text to detect topics yet.' }, { quoted: msg });
      const text = `🗣️ *Hot topics (last ${hours}h)*\n\n` + topics.map((t, i) => `${i + 1}. ${t.word} (${t.count})`).join('\n');
      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .influence [hours] — same underlying ranking as .active, framed as
  // "influence" (message-share of the group) rather than raw counts.
  influence: async ({ sock, from, msg, args, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const hours = parseFloat(args[0]) || 24;
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours } });
      const { most_active = [], total_messages = 0 } = res.data;
      if (!total_messages) return sock.sendMessage(from, { text: 'No activity to rank yet.' }, { quoted: msg });
      const text = `⚡ *Influence ranking (share of chat, last ${hours}h)*\n\n` +
        most_active.map((u, i) => `${i + 1}. ${u.name || u.sender} — ${((u.messages / total_messages) * 100).toFixed(0)}%`).join('\n');
      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .track @user [hours] — how active one specific member has been
  track: async ({ sock, from, msg, args, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) return sock.sendMessage(from, { text: '⚠️ Usage: *.track @user [hours]*' }, { quoted: msg });
    const targetNum = mentioned.split('@')[0];
    const hours = parseFloat(args.find(a => /^\d+(\.\d+)?$/.test(a))) || 168; // default 7 days
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours } });
      const found = (res.data.most_active || []).find(u => u.sender.includes(targetNum));
      await sock.sendMessage(from, {
        text: found
          ? `📈 @${targetNum} sent ${found.messages} messages in the last ${hours}h`
          : `📈 No recorded messages for @${targetNum} in the last ${hours}h`,
        mentions: [mentioned]
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .detector — quick 24h health snapshot (spam-y volume / topic spike)
  detector: async ({ sock, from, msg, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours: 1 } });
      const { total_messages = 0, unique_participants = 0 } = res.data;
      const rate = total_messages / 60;
      const verdict = rate > 3 ? '🔥 Very active right now' : rate > 0.5 ? '💬 Normal chatter' : '😴 Quiet';
      await sock.sendMessage(from, { text: `🔍 *Activity detector*\n${verdict}\nLast hour: ${total_messages} msgs from ${unique_participants} people` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .analyze [hours] — combined summary (activity + top people + topics)
  analyze: async ({ sock, from, msg, args, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const hours = parseFloat(args[0]) || 24;
    try {
      const res = await apiClient.get('/group-intel/stats', { params: { group_id: from, hours } });
      const d = res.data;
      const top3 = (d.most_active || []).slice(0, 3).map(u => u.name || u.sender).join(', ') || 'nobody yet';
      const topics = (d.top_topics || []).slice(0, 5).map(t => t.word).join(', ') || 'none detected';
      const text =
        `🧠 *Group analysis — last ${hours}h*\n\n` +
        `💬 Messages: ${d.total_messages}\n` +
        `👥 Active people: ${d.unique_participants}\n` +
        `🏆 Top voices: ${top3}\n` +
        `🗣️ Topics: ${topics}`;
      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .clearrelations — bot-admin only, wipes the interaction graph for this group
  clearrelations: async ({ sock, from, msg, isBotAdmin, isGroup, apiClient }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    try {
      await apiClient.post('/group-intel/clear', { group_id: from });
      await sock.sendMessage(from, { text: '🧹 Interaction data cleared for this group.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MODERATION
  // ═══════════════════════════════════════════════════════════════════════

  // .warn @user [reason] — bot-admin only. Reuses the SAME group_warnings
  // table/3-strike logic as the existing antilink auto-strike system.
  warn: async ({ sock, from, msg, isBotAdmin, isGroup, apiClient }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) return sock.sendMessage(from, { text: '⚠️ Usage: *.warn @user [reason]*' }, { quoted: msg });
    try {
      const res = await apiClient.post('/moderation/warn', { group_id: from, target: mentioned });
      const { count, kick } = res.data;
      if (kick) {
        await sock.groupParticipantsUpdate(from, [mentioned], 'remove').catch(() => {});
        await sock.sendMessage(from, { text: `🚫 @${mentioned.split('@')[0]} hit 3 warnings and was removed.`, mentions: [mentioned] }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: `⚠️ @${mentioned.split('@')[0]} warned (${count}/3).`, mentions: [mentioned] }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .report @user [reason] — anyone can file, admins get pinged
  report: async ({ sock, from, msg, args, senderJid, apiClient, isGroup }) => {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const reason = args.filter(a => !a.startsWith('@')).join(' ') || 'No reason given';
    if (!reason || reason === 'No reason given' && !mentioned) {
      return sock.sendMessage(from, { text: '⚠️ Usage: *.report @user [reason]* (or just *.report [reason]* for a general issue)' }, { quoted: msg });
    }
    try {
      await apiClient.post('/reports/create', {
        group_id: isGroup ? from : null,
        reporter: senderJid,
        target: mentioned || null,
        reason,
      });
      await sock.sendMessage(from, { text: '📮 Report filed — admins have been notified.' }, { quoted: msg });
      global.coOwners?.forEach(() => {}); // no-op, keeps lint happy about unused set if bundlers tree-shake
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .silence on/off — mutes the BOT's own AI auto-replies in this chat.
  // NOT the same as .mute (which uses WhatsApp's native group-send lock).
  silence: async ({ sock, from, msg, args, apiClient }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) {
      const current = await getSetting(apiClient, from, SETTING_KEYS.SILENCE);
      return sock.sendMessage(from, { text: `🔇 Silence is currently *${current === 'on' ? 'ON' : 'OFF'}* for this chat.\nUsage: *.silence on* / *.silence off*` }, { quoted: msg });
    }
    await setSetting(apiClient, from, SETTING_KEYS.SILENCE, mode);
    await sock.sendMessage(from, { text: mode === 'on' ? '🔇 Bot AI replies silenced in this chat.' : '🔊 Bot AI replies re-enabled in this chat.' }, { quoted: msg });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // POLLS
  // ═══════════════════════════════════════════════════════════════════════

  // .poll "Question" opt1 | opt2 | opt3
  poll: async ({ sock, from, msg, args, senderJid, apiClient, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    const full = args.join(' ');
    const parts = full.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      return sock.sendMessage(from, { text: '⚠️ Usage: *.poll Question | option1 | option2 | ...*\ne.g. *.poll Pizza or burgers? | Pizza | Burgers*' }, { quoted: msg });
    }
    const [question, ...options] = parts;
    try {
      const res = await apiClient.post('/polls/create', { group_id: from, question, options, created_by: senderJid });
      const pollId = res.data.poll_id;
      const optionsText = options.map((o, i) => `${i + 1}. ${o}`).join('\n');
      await sock.sendMessage(from, {
        text: `📊 *Poll #${pollId}: ${question}*\n\n${optionsText}\n\nVote with *.vote ${pollId} [number]*`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .vote <pollId> <optionNumber>
  vote: async ({ sock, from, msg, args, senderJid, apiClient }) => {
    const pollId = parseInt(args[0], 10);
    const optionNum = parseInt(args[1], 10);
    if (!pollId || !optionNum) {
      return sock.sendMessage(from, { text: '⚠️ Usage: *.vote [pollId] [optionNumber]*' }, { quoted: msg });
    }
    try {
      await apiClient.post('/polls/vote', { poll_id: pollId, voter: senderJid, option_index: optionNum - 1 });
      await sock.sendMessage(from, { text: `✅ Vote recorded for poll #${pollId}.` }, { quoted: msg });
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message;
      await sock.sendMessage(from, { text: `❌ ${errMsg}` }, { quoted: msg });
    }
  },

  // .results <pollId>
  results: async ({ sock, from, msg, args, apiClient }) => {
    const pollId = parseInt(args[0], 10);
    if (!pollId) return sock.sendMessage(from, { text: '⚠️ Usage: *.results [pollId]*' }, { quoted: msg });
    try {
      const res = await apiClient.get('/polls/results', { params: { poll_id: pollId } });
      const d = res.data;
      const lines = d.results.map(r => `${r.option}: ${r.votes} vote${r.votes === 1 ? '' : 's'}`).join('\n');
      await sock.sendMessage(from, { text: `📊 *${d.question}* ${d.active ? '(live)' : '(ended)'}\n\n${lines}\n\nTotal: ${d.total_votes}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Poll not found.` }, { quoted: msg });
    }
  },

  // .endpoll <pollId> — bot-admin only
  endpoll: async ({ sock, from, msg, args, isBotAdmin, apiClient }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const pollId = parseInt(args[0], 10);
    if (!pollId) return sock.sendMessage(from, { text: '⚠️ Usage: *.endpoll [pollId]*' }, { quoted: msg });
    try {
      const res = await apiClient.post('/polls/end', { poll_id: pollId });
      const d = res.data;
      const lines = (d.results || []).map(r => `${r.option}: ${r.votes} vote${r.votes === 1 ? '' : 's'}`).join('\n');
      await sock.sendMessage(from, { text: `🔒 *Poll #${pollId} ended*\n${d.question || ''}\n\n${lines}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUTO-REPLY (thin command-line interface onto the EXISTING keywords table
  // that already powers the admin panel's Keywords tab — no new storage)
  // ═══════════════════════════════════════════════════════════════════════

  autoreply: async ({ sock, from, msg, args, isBotAdmin, apiClient }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list') {
      try {
        const res = await apiClient.get('/bot/autoreply/list');
        const list = res.data.keywords || [];
        if (!list.length) return sock.sendMessage(from, { text: 'No autoreply keywords set yet.' }, { quoted: msg });
        const text = '🔁 *Autoreply keywords*\n\n' + list.map(k => `• "${k.trigger}" → "${k.reply}" ${k.enabled ? '' : '(disabled)'}`).join('\n');
        await sock.sendMessage(from, { text }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
      return;
    }

    if (sub === 'remove') {
      const trigger = args.slice(1).join(' ');
      if (!trigger) return sock.sendMessage(from, { text: '⚠️ Usage: *.autoreply remove [trigger]*' }, { quoted: msg });
      try {
        await apiClient.post('/bot/autoreply/remove', { trigger });
        await sock.sendMessage(from, { text: `🗑️ Removed autoreply for "${trigger}".` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
      return;
    }

    if (sub === 'set') {
      // .autoreply set <trigger> | <reply>
      const rest = args.slice(1).join(' ');
      const [trigger, reply] = rest.split('|').map(s => s && s.trim());
      if (!trigger || !reply) {
        return sock.sendMessage(from, { text: '⚠️ Usage: *.autoreply set trigger | reply text*' }, { quoted: msg });
      }
      try {
        await apiClient.post('/bot/autoreply/add', { trigger, reply });
        await sock.sendMessage(from, { text: `✅ Autoreply set: "${trigger}" → "${reply}"` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
      return;
    }

    await sock.sendMessage(from, { text: '⚠️ Usage:\n*.autoreply set trigger | reply*\n*.autoreply remove trigger*\n*.autoreply list*' }, { quoted: msg });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STANDARD GROUP ADMIN (only the ones NOT already covered elsewhere)
  // ═══════════════════════════════════════════════════════════════════════

  // .ban @user [reason] — kick + record so re-adds can be flagged
  ban: async ({ sock, from, msg, isBotAdmin, isGroup, apiClient, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) return sock.sendMessage(from, { text: '⚠️ Usage: *.ban @user [reason]*' }, { quoted: msg });
    const reason = args.filter(a => !a.startsWith('@')).join(' ') || 'No reason given';
    try {
      await sock.groupParticipantsUpdate(from, [mentioned], 'remove');
      await apiClient.post('/bans/add', { group_id: from, number: mentioned.split('@')[0], reason });
      await sock.sendMessage(from, { text: `🚫 @${mentioned.split('@')[0]} banned. Reason: ${reason}`, mentions: [mentioned] }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .removeall <num1> <num2> ... — bulk-remove numbers from the group
  removeall: async ({ sock, from, msg, isBotAdmin, isGroup, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    if (!args.length) return sock.sendMessage(from, { text: '⚠️ Usage: *.removeall 2547xxxxxxx 2547yyyyyyy ...*' }, { quoted: msg });
    const jids = args.map(n => `${n.replace(/\D/g, '')}@s.whatsapp.net`);
    try {
      await sock.groupParticipantsUpdate(from, jids, 'remove');
      await sock.sendMessage(from, { text: `🧹 Removed ${jids.length} member(s).` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .setname <new group name>
  setname: async ({ sock, from, msg, isBotAdmin, isGroup, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const name = args.join(' ');
    if (!name) return sock.sendMessage(from, { text: '⚠️ Usage: *.setname [new group name]*' }, { quoted: msg });
    try {
      await sock.groupUpdateSubject(from, name);
      await sock.sendMessage(from, { text: `✏️ Group name updated to: ${name}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .setdesc <new description>
  setdesc: async ({ sock, from, msg, isBotAdmin, isGroup, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const desc = args.join(' ');
    if (!desc) return sock.sendMessage(from, { text: '⚠️ Usage: *.setdesc [new description]*' }, { quoted: msg });
    try {
      await sock.groupUpdateDescription(from, desc);
      await sock.sendMessage(from, { text: '✏️ Group description updated.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // .adduser <number> — different from .add: takes a plain number arg
  // (existing .add likely expects a reply/mention — this is a straight
  // "type the number" variant some admins asked for).
  adduser: async ({ sock, from, msg, isBotAdmin, isGroup, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const num = (args[0] || '').replace(/\D/g, '');
    if (!num) return sock.sendMessage(from, { text: '⚠️ Usage: *.adduser 2547xxxxxxx*' }, { quoted: msg });
    try {
      await sock.groupParticipantsUpdate(from, [`${num}@s.whatsapp.net`], 'add');
      await sock.sendMessage(from, { text: `➕ Added ${num} to the group.` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Couldn't add ${num}: ${e.message}\n(they may have privacy settings blocking group adds)` }, { quoted: msg });
    }
  },

  // .admins — list current group admins
  admins: async ({ sock, from, msg, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group-only command.' }, { quoted: msg });
    try {
      const metadata = await sock.groupMetadata(from);
      const admins = metadata.participants.filter(p => p.admin);
      if (!admins.length) return sock.sendMessage(from, { text: 'No admins found (unexpected).' }, { quoted: msg });
      const text = '👑 *Group Admins*\n\n' + admins.map(a => `• @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(owner)' : ''}`).join('\n');
      await sock.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MEDIA / UTILITY (thin additions on top of existing plumbing)
  // ═══════════════════════════════════════════════════════════════════════

  // .fullpp [@user] — like .getpp, but requests the full-resolution image
  // instead of the thumbnail Baileys returns by default.
  fullpp: async ({ sock, from, msg, args }) => {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const target = mentioned || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : from);
    try {
      const url = await sock.profilePictureUrl(target, 'image'); // 'image' = full-res, vs default 'preview'
      await sock.sendMessage(from, { image: { url }, caption: `🖼️ Full-res profile picture` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Couldn't fetch full profile picture (private, or none set).` }, { quoted: msg });
    }
  },

  // .autoreact on/off — per-chat toggle for reacting to every incoming msg.
  // (The old blanket "react to everything" behavior was intentionally
  // removed bot-wide as noted in client_bridge.js — this brings it back
  // as an explicit opt-in per chat instead of an always-on default.)
  autoreact: async ({ sock, from, msg, args, apiClient }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) {
      const current = await getSetting(apiClient, from, SETTING_KEYS.AUTOREACT);
      return sock.sendMessage(from, { text: `⚡ Autoreact is currently *${current === 'on' ? 'ON' : 'OFF'}* here.\nUsage: *.autoreact on* / *.autoreact off*` }, { quoted: msg });
    }
    await setSetting(apiClient, from, SETTING_KEYS.AUTOREACT, mode);
    await sock.sendMessage(from, { text: mode === 'on' ? '⚡ Autoreact enabled for this chat.' : '⚡ Autoreact disabled for this chat.' }, { quoted: msg });
  },

  // .antidelete on/off — per-chat toggle. When on, client_bridge.js's
  // additive revoke-listener (see CHANGES.md) auto-forwards a deleted
  // message here instead of requiring the manual 🌝 reaction.
  antidelete: async ({ sock, from, msg, args, apiClient, isBotAdmin }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) {
      const current = await getSetting(apiClient, from, SETTING_KEYS.ANTIDELETE);
      return sock.sendMessage(from, { text: `🗑️ Antidelete is currently *${current === 'on' ? 'ON' : 'OFF'}* here.\nUsage: *.antidelete on* / *.antidelete off*` }, { quoted: msg });
    }
    await setSetting(apiClient, from, SETTING_KEYS.ANTIDELETE, mode);
    await sock.sendMessage(from, { text: mode === 'on' ? '🗑️ Antidelete ON — deleted messages here will be auto-reposted.' : '🗑️ Antidelete OFF.' }, { quoted: msg });
  },

  // .autoview on/off — per-chat toggle. When on, view-once media sent here
  // is auto-saved (same /log-viewonce pipeline .vv/.save already use)
  // without needing the manual 🌝 reaction.
  autoview: async ({ sock, from, msg, args, apiClient, isBotAdmin }) => {
    if (!isBotAdmin) return sock.sendMessage(from, { text: '🔒 Admin only.' }, { quoted: msg });
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) {
      const current = await getSetting(apiClient, from, SETTING_KEYS.AUTOVIEW);
      return sock.sendMessage(from, { text: `👁️ Autoview is currently *${current === 'on' ? 'ON' : 'OFF'}* here.\nUsage: *.autoview on* / *.autoview off*` }, { quoted: msg });
    }
    await setSetting(apiClient, from, SETTING_KEYS.AUTOVIEW, mode);
    await sock.sendMessage(from, { text: mode === 'on' ? '👁️ Autoview ON — view-once media here auto-saves.' : '👁️ Autoview OFF.' }, { quoted: msg });
  },
};

module.exports.__SETTING_KEYS = SETTING_KEYS;
module.exports.__memKey = memKey;
