// ── leveling.js ───────────────────────────────────────────────────────────
// Activity-based XP/level system for groups, built on top of the message
// counter that already existed in lib_ported/lightweight_store.js
// (incrementMessageCount/getMessageCount/getAllMessageCounts) — no new
// storage backend, so it automatically works across whatever backend the
// store is already configured for (memory/Mongo/Postgres/etc).
//
// 🐛 FIX: that counter was already wired into .rank (plugins/ported_group.js)
// but the increment half was dead code — incrementMessageCount() was
// defined and never called from anywhere, so .rank/.leaderboard/.top always
// showed "No message activity recorded yet". trackActivity() below (called
// from client_bridge.js on every real incoming group message) is what
// actually increments it now, so .rank starts working too as a side effect.
//
// Level curve: level = floor(sqrt(messages / 20)) — i.e. level 1 at 20
// messages, level 2 at 80, level 3 at 180, level 4 at 320, level 5 at 500,
// etc. (quadratic, so each level takes progressively more activity).

const store = require('../lib_ported/lightweight_store.js');

const XP_BASE = 20;

function levelForCount(count) {
  return Math.floor(Math.sqrt(Math.max(0, count) / XP_BASE));
}
function countForLevel(level) {
  return Math.ceil(level * level * XP_BASE);
}
function progressBar(current, min, max, size = 10) {
  const span = Math.max(1, max - min);
  const filled = Math.max(0, Math.min(size, Math.round(((current - min) / span) * size)));
  return '▰'.repeat(filled) + '▱'.repeat(size - filled);
}

// Resolves a display name the same way .rank does — group participant
// notify/name first, falling back to the raw number.
async function resolveName(sock, chatId, userId) {
  try {
    const meta = await sock.groupMetadata(chatId);
    const p = meta.participants.find(x => x.id === userId || x.lid === userId);
    if (p?.notify || p?.name) return p.notify || p.name;
  } catch { /* not a group, or metadata fetch failed — fall through */ }
  try {
    const c = sock.store?.contacts?.[userId];
    if (c?.name || c?.notify) return c.name || c.notify;
  } catch { /* no local store entry */ }
  return userId.split('@')[0];
}

// ── trackActivity ─── called from client_bridge.js's messages.upsert
// handler on every real (non-fromMe) incoming group message. Fire-and-forget
// from the caller's side — this function itself never throws.
async function trackActivity({ sock, chatId, userId }) {
  try {
    const before = await store.getMessageCount(chatId, userId);
    await store.incrementMessageCount(chatId, userId);
    const after = before + 1;

    const levelBefore = levelForCount(before);
    const levelAfter = levelForCount(after);
    if (levelAfter > levelBefore) {
      let levelupOn = true;
      try { levelupOn = require('./settings-ext.js').__getSetting('levelup'); } catch { /* default stays on */ }
      if (levelupOn) {
        const name = await resolveName(sock, chatId, userId);
        await sock.sendMessage(chatId, {
          text: `🆙 @${userId.split('@')[0]} leveled up to *Level ${levelAfter}*! (${after} messages) 🎉`,
          mentions: [userId],
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[LEVELING] trackActivity failed:', e.message);
  }
}

module.exports = {
  __trackActivity: trackActivity,

  // ── .level ─── Show your (or a mentioned/replied user's) level and XP progress | usage: .level [@user]
  level: async ({ sock, from, msg, isGroup }) => {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ Leveling is a group-activity feature — use this inside a group.' }, { quoted: msg });
    }
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid?.[0];
    const replied = ctx?.participant;
    const target = mentioned || replied || msg.key.participant || msg.key.remoteJid;

    const count = await store.getMessageCount(from, target);
    const level = levelForCount(count);
    const floor = countForLevel(level);
    const ceil = countForLevel(level + 1);
    const bar = progressBar(count, floor, ceil);
    const name = await resolveName(sock, from, target);

    await sock.sendMessage(from, {
      text: `📊 *Level Card — ${name}*\n\n`
        + `🏅 Level: *${level}*\n`
        + `💬 Messages: *${count}*\n`
        + `${bar}  ${count - floor}/${ceil - floor} to Level ${level + 1}`,
      mentions: [target],
    }, { quoted: msg });
  },
  lvl: async (h) => module.exports.level(h),
  rank2: async (h) => module.exports.level(h),

  // ── .levelboard ─── Top 10 group members by level/activity | usage: .levelboard
  levelboard: async ({ sock, from, msg, isGroup }) => {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ Leveling is a group-activity feature — use this inside a group.' }, { quoted: msg });
    }
    try {
      const all = await store.getAllMessageCounts();
      const groupCounts = (all.messageCount || {})[from] || {};

      // Resolve @lid participant IDs to real JIDs the same way .rank does.
      const lidMap = {};
      try {
        const meta = await sock.groupMetadata(from);
        for (const p of meta.participants) {
          if (p.lid) lidMap[p.lid] = p.id;
          if (p.id) lidMap[p.id] = p.id;
        }
      } catch { /* fall through with raw IDs */ }

      const resolved = {};
      for (const [uid, count] of Object.entries(groupCounts)) {
        const key = lidMap[uid] || uid;
        resolved[key] = (resolved[key] || 0) + count;
      }

      const top = Object.entries(resolved).sort(([, a], [, b]) => b - a).slice(0, 10);
      if (top.length === 0) {
        return sock.sendMessage(from, { text: '📊 No activity recorded yet — start chatting to appear here!' }, { quoted: msg });
      }

      const medals = ['🥇', '🥈', '🥉'];
      const lines = await Promise.all(top.map(async ([uid, count], i) => {
        const name = await resolveName(sock, from, uid);
        const badge = medals[i] || `${i + 1}.`;
        return `${badge} *${name}* — Level ${levelForCount(count)} (${count} msgs)`;
      }));

      await sock.sendMessage(from, {
        text: `🏆 *Level Leaderboard*\n\n${lines.join('\n')}`,
        mentions: top.map(([uid]) => uid),
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Failed to load level leaderboard: ${e.message}` }, { quoted: msg });
    }
  },
  lvltop: async (h) => module.exports.levelboard(h),
};
