// ── Group Guard (ported/rebuilt from atassa) ────────────────────────────────
// Anti-link, anti-promote/demote-by-non-admin, badword filter, join-request
// management, and a few group-info helpers your bot didn't have yet.
//
// Per-group settings stored in DATA_DIR/groupguard.json, keyed by group jid.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const GG_FILE = path.join(DATA_DIR, 'groupguard.json');

function loadGG() {
  try { return JSON.parse(fs.readFileSync(GG_FILE, 'utf8')); }
  catch (_) { return {}; }
}
function saveGG(db) { fs.writeFileSync(GG_FILE, JSON.stringify(db, null, 2)); }
function getSettings(from) {
  const db = loadGG();
  db[from] = db[from] || { antilink: false, antipromote: false, antidemote: false, antigroupmention: false, badwords: [], antiflood: false, floodLimit: 6, floodWindowSec: 8, floodKickAfter: 3 };
  // Backfill flood fields for groups saved before this feature existed.
  if (db[from].antiflood === undefined) db[from].antiflood = false;
  if (!db[from].floodLimit) db[from].floodLimit = 6;
  if (!db[from].floodWindowSec) db[from].floodWindowSec = 8;
  if (!db[from].floodKickAfter) db[from].floodKickAfter = 3;
  return { db, settings: db[from] };
}

// ── Flood/spam tracking — in-memory only (resets on restart, which is
// fine: it's a short rolling window, not a persistent record). Keyed by
// "groupJid|senderJid" → { timestamps: [epoch ms...], warnCount }.
const floodTracker = new Map();
function _checkFlood(groupJid, sender, limit, windowSec) {
  const key = `${groupJid}|${sender}`;
  const now = Date.now();
  const entry = floodTracker.get(key) || { timestamps: [], warnCount: 0 };
  entry.timestamps = entry.timestamps.filter(t => now - t < windowSec * 1000);
  entry.timestamps.push(now);
  floodTracker.set(key, entry);
  return entry;
}

const INVITE_LINK_RE = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

module.exports = {

  // ── Toggles ────────────────────────────────────────────────────────────
  setantilink: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const { db, settings } = getSettings(from);
    settings.antilink = on;
    saveGG(db);
    await sock.sendMessage(from, { text: `🔗 Anti-link is now *${on ? 'ON' : 'OFF'}*.` }, { quoted: msg });
  },

  antibadwarn: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const { db, settings } = getSettings(from);
    settings.antibad = on;
    saveGG(db);
    await sock.sendMessage(from, { text: `🚫 Bad-word warnings are now *${on ? 'ON' : 'OFF'}*.` }, { quoted: msg });
  },

  // ── Anti-flood ─── auto-mutes (kicks after repeated offenses) senders
  // who send too many messages too fast. Usage: .setantiflood on/off
  setantiflood: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const { db, settings } = getSettings(from);
    settings.antiflood = on;
    saveGG(db);
    await sock.sendMessage(from, {
      text: `🌊 Anti-flood is now *${on ? 'ON' : 'OFF'}*.` + (on
        ? `\n_Default: ${settings.floodLimit} messages in ${settings.floodWindowSec}s deletes + warns; ${settings.floodKickAfter} warns removes the sender. Tune with .setfloodlimit and .setfloodkick._`
        : '')
    }, { quoted: msg });
  },

  setfloodlimit: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const n = parseInt(args[0], 10);
    const secs = parseInt(args[1], 10) || undefined;
    if (!n || n < 2) return sock.sendMessage(from, { text: '📝 Usage: .setfloodlimit <messages> [windowSeconds]' }, { quoted: msg });
    const { db, settings } = getSettings(from);
    settings.floodLimit = n;
    if (secs && secs >= 2) settings.floodWindowSec = secs;
    saveGG(db);
    await sock.sendMessage(from, { text: `✅ Flood limit set to ${n} messages per ${settings.floodWindowSec}s.` }, { quoted: msg });
  },

  setfloodkick: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const n = parseInt(args[0], 10);
    if (!n || n < 1) return sock.sendMessage(from, { text: '📝 Usage: .setfloodkick <warnCount>' }, { quoted: msg });
    const { db, settings } = getSettings(from);
    settings.floodKickAfter = n;
    saveGG(db);
    await sock.sendMessage(from, { text: `✅ Sender gets removed after ${n} flood warning(s).` }, { quoted: msg });
  },

  badwords: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const { db, settings } = getSettings(from);
    if (!args.length) {
      return sock.sendMessage(from, {
        text: settings.badwords.length
          ? `🚫 *Filtered words:*\n${settings.badwords.join(', ')}`
          : '📭 No filtered words set. Usage: .badwords add/remove <word>'
      }, { quoted: msg });
    }
    const [action, ...rest] = args;
    const word = rest.join(' ').toLowerCase();
    if (action === 'add' && word) {
      if (!settings.badwords.includes(word)) settings.badwords.push(word);
      saveGG(db);
      return sock.sendMessage(from, { text: `✅ Added *${word}* to the filter.` }, { quoted: msg });
    }
    if (action === 'remove' && word) {
      settings.badwords = settings.badwords.filter(w => w !== word);
      saveGG(db);
      return sock.sendMessage(from, { text: `✅ Removed *${word}* from the filter.` }, { quoted: msg });
    }
    await sock.sendMessage(from, { text: '📝 Usage: .badwords add/remove <word>' }, { quoted: msg });
  },

  antipromote: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const { db, settings } = getSettings(from);
    settings.antipromote = on;
    saveGG(db);
    await sock.sendMessage(from, { text: `👑 Anti-promote (only the bot can promote) is now *${on ? 'ON' : 'OFF'}*.\n\n_Note: this warns/logs unauthorized promotions — WhatsApp doesn't let a bot silently undo an admin action performed by another real admin without demoting them explicitly, which this does automatically when ON._` }, { quoted: msg });
  },

  antidemote: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const { db, settings } = getSettings(from);
    settings.antidemote = on;
    saveGG(db);
    await sock.sendMessage(from, { text: `👑 Anti-demote is now *${on ? 'ON' : 'OFF'}*.` }, { quoted: msg });
  },

  antigroupmention: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const on = (args[0] || '').toLowerCase() === 'on';
    const { db, settings } = getSettings(from);
    settings.antigroupmention = on;
    saveGG(db);
    await sock.sendMessage(from, { text: `📢 Anti @everyone-style mass-mention is now *${on ? 'ON' : 'OFF'}*.` }, { quoted: msg });
  },

  setantigcmentionwarnlimit: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const n = parseInt(args[0], 10);
    if (!n || n < 1) return sock.sendMessage(from, { text: '📝 Usage: .setantigcmentionwarnlimit <number>' }, { quoted: msg });
    const { db, settings } = getSettings(from);
    settings.mentionWarnLimit = n;
    saveGG(db);
    await sock.sendMessage(from, { text: `✅ Mention-spam warn limit set to ${n}.` }, { quoted: msg });
  },

  groupsettings: async ({ sock, from, msg, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    const { settings } = getSettings(from);
    const lines = Object.entries(settings)
      .filter(([k]) => k !== 'badwords')
      .map(([k, v]) => `${v === true ? '✅' : v === false ? '❌' : 'ℹ️'} ${k}: ${v}`);
    await sock.sendMessage(from, { text: `⚙️ *Group Settings*\n\n${lines.join('\n')}\n🚫 badwords: ${settings.badwords.length}` }, { quoted: msg });
  },

  resetgroup: async ({ sock, from, msg, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const db = loadGG();
    delete db[from];
    saveGG(db);
    await sock.sendMessage(from, { text: '✅ Group settings reset to defaults.' }, { quoted: msg });
  },

  // ── This message hook is called from client_bridge.js on every group
  // message BEFORE command dispatch, to enforce antilink/badwords/mention
  // guard. Not a user-facing command — stripped from allCommands by name.
  _enforceGroupGuard: async ({ sock, from, msg, body, sender, isGroup, groupMeta }) => {
    if (!isGroup) return false;
    const { settings } = getSettings(from);
    const senderIsAdmin = groupMeta?.participants?.find(p => p.id === sender)?.admin;
    if (senderIsAdmin) return false; // never act against real group admins

    if (settings.antilink && INVITE_LINK_RE.test(body || '')) {
      try {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        await sock.sendMessage(from, { text: `🔗 @${sender.split('@')[0]} removed for posting a group invite link.`, mentions: [sender] });
      } catch (e) { /* bot may not be admin — fail silently, already logged elsewhere */ }
      return true;
    }

    if (settings.antiflood) {
      const entry = _checkFlood(from, sender, settings.floodLimit, settings.floodWindowSec);
      if (entry.timestamps.length >= settings.floodLimit) {
        entry.warnCount = (entry.warnCount || 0) + 1;
        entry.timestamps = []; // reset the window so we don't re-trigger every message while flooding continues
        floodTracker.set(`${from}|${sender}`, entry);
        try { await sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
        if (entry.warnCount >= settings.floodKickAfter) {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
            await sock.sendMessage(from, { text: `🌊 @${sender.split('@')[0]} removed for repeated message flooding.`, mentions: [sender] });
          } catch (e) {
            await sock.sendMessage(from, { text: `🌊 @${sender.split('@')[0]}, you're flooding this chat — slow down.`, mentions: [sender] });
          }
          floodTracker.delete(`${from}|${sender}`);
        } else {
          try {
            await sock.sendMessage(from, {
              text: `🌊 @${sender.split('@')[0]}, slow down — that's flood warning ${entry.warnCount}/${settings.floodKickAfter}.`,
              mentions: [sender]
            });
          } catch (e) {}
        }
        return true;
      }
    }

    if (settings.antibad && settings.badwords.some(w => (body || '').toLowerCase().includes(w))) {
      try {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]}, that word isn't allowed here.`, mentions: [sender] });
      } catch (e) {}
      return true;
    }

    if (settings.antigroupmention) {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const limit = settings.mentionWarnLimit || 5;
      if (mentioned.length >= limit) {
        try {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.sendMessage(from, { text: `📢 @${sender.split('@')[0]}, mass-mentioning ${mentioned.length} people at once isn't allowed here.`, mentions: [sender] });
        } catch (e) {}
        return true;
      }
    }
    return false;
  },

  // ── Join request management (WhatsApp community/group approval mode) ───
  listrequests: async ({ sock, from, msg, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    try {
      const reqs = await sock.groupRequestParticipantsList(from);
      if (!reqs.length) return sock.sendMessage(from, { text: '📭 No pending join requests.' }, { quoted: msg });
      const text = reqs.map(r => `• @${r.jid.split('@')[0]}`).join('\n');
      await sock.sendMessage(from, { text: `📋 *Pending join requests (${reqs.length})*\n\n${text}`, mentions: reqs.map(r => r.jid) }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Could not fetch join requests: ${e.message}\n\n_This only works if group approval mode is enabled._` }, { quoted: msg });
    }
  },

  acceptall: async ({ sock, from, msg, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    try {
      const reqs = await sock.groupRequestParticipantsList(from);
      if (!reqs.length) return sock.sendMessage(from, { text: '📭 No pending join requests.' }, { quoted: msg });
      await sock.groupRequestParticipantsUpdate(from, reqs.map(r => r.jid), 'approve');
      await sock.sendMessage(from, { text: `✅ Approved ${reqs.length} join request(s).` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  rejectall: async ({ sock, from, msg, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    try {
      const reqs = await sock.groupRequestParticipantsList(from);
      if (!reqs.length) return sock.sendMessage(from, { text: '📭 No pending join requests.' }, { quoted: msg });
      await sock.groupRequestParticipantsUpdate(from, reqs.map(r => r.jid), 'reject');
      await sock.sendMessage(from, { text: `🚫 Rejected ${reqs.length} join request(s).` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
  },

  accept: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📝 Usage: .accept <number>' }, { quoted: msg });
    try {
      await sock.groupRequestParticipantsUpdate(from, [`${num}@s.whatsapp.net`], 'approve');
      await sock.sendMessage(from, { text: `✅ Approved +${num}.` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  reject: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📝 Usage: .reject <number>' }, { quoted: msg });
    try {
      await sock.groupRequestParticipantsUpdate(from, [`${num}@s.whatsapp.net`], 'reject');
      await sock.sendMessage(from, { text: `🚫 Rejected +${num}.` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  // ── Group info helpers ───────────────────────────────────────────────────
  groupname: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const name = args.join(' ');
    if (!name) return sock.sendMessage(from, { text: '📝 Usage: .groupname <new name>' }, { quoted: msg });
    try {
      await sock.groupUpdateSubject(from, name);
      await sock.sendMessage(from, { text: `✅ Group name updated to *${name}*.` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  gcdesc: async ({ sock, from, msg, args, isGroup, isBotAdmin }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const desc = args.join(' ');
    if (!desc) return sock.sendMessage(from, { text: '📝 Usage: .gcdesc <new description>' }, { quoted: msg });
    try {
      await sock.groupUpdateDescription(from, desc);
      await sock.sendMessage(from, { text: '✅ Group description updated.' }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  mygroups: async ({ sock, from, msg }) => {
    try {
      const groups = await sock.groupFetchAllParticipating();
      const list = Object.values(groups);
      if (!list.length) return sock.sendMessage(from, { text: '📭 Bot is not in any groups.' }, { quoted: msg });
      const text = list.map(g => `• ${g.subject} (${g.participants.length} members)`).join('\n');
      await sock.sendMessage(from, { text: `👥 *Bot's groups (${list.length})*\n\n${text}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  killgc: async ({ sock, from, msg, isGroup, isOwner }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    try {
      await sock.sendMessage(from, { text: '💥 Bot is leaving this group now.' });
      await sock.groupLeave(from);
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  newgroup: async ({ sock, from, msg, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const [name, ...nums] = args.join(' ').split('|').map(s => s.trim());
    const numbers = (nums.join(' ') || '').split(/[\s,]+/).filter(Boolean).map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    if (!name || !numbers.length) return sock.sendMessage(from, { text: '📝 Usage: .newgroup GroupName | 2547xxxx, 2547yyyy' }, { quoted: msg });
    try {
      const group = await sock.groupCreate(name, numbers);
      await sock.sendMessage(from, { text: `✅ Created *${name}* with ${numbers.length} member(s).` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  tagadmins: async ({ sock, from, msg, args, isGroup }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
    try {
      const groupMeta = await sock.groupMetadata(from);
      const admins = groupMeta.participants.filter(p => p.admin);
      if (!admins.length) return sock.sendMessage(from, { text: '📭 No admins found.' }, { quoted: msg });
      const customMsg = args.join(' ') || '';
      const text = `〔 *Admins* 〕\n${customMsg ? customMsg + '\n\n' : ''}${admins.map(a => `• @${a.id.split('@')[0]}`).join('\n')}`;
      await sock.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  everyone: async (ctx) => {
    // Alias of the existing, already-solid .tagall implementation.
    const { tagall } = require('./group');
    return tagall(ctx);
  },
};
