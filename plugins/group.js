module.exports = {

  // ── .tagall ────────────────────────────────────────────────────────────────
  tagall: async ({ sock, from, msg, isGroup, isBotAdmin, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only command!' });
    if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin only!' }, { quoted: msg });
    const groupMeta = await sock.groupMetadata(from);
    const members = groupMeta.participants;
    const customMsg = args.join(' ') || '';
    let text = `〔 *Tag All* 〕\n•• Message : ${customMsg || 'empty'} ••\n\n`;
    const mentions = [];
    for (const mem of members) {
      const num = mem.id.split('@')[0];
      text += `♂ @${num}\n`;
      mentions.push(mem.id);
    }
    await sock.sendMessage(from, { text, mentions }, { quoted: msg });
  },

  // ── .bcgc ──────────────────────────────────────────────────────────────────
  bcgc: async ({ sock, from, msg, isOwner, args }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' });
    const message = args.join(' ');
    if (!message) return sock.sendMessage(from, { text: '📢 Usage: .bcgc [message]\nExample: .bcgc Good morning everyone!' });
    // Fixed: use sock.groupFetchAllParticipating() instead of store.chats.all()
    // (store is not available in this bot architecture)
    let groups = [];
    try {
      const allGroups = await sock.groupFetchAllParticipating();
      groups = Object.keys(allGroups);
    } catch (e) {
      return sock.sendMessage(from, { text: `❌ Could not fetch groups: ${e.message}` });
    }
    if (groups.length === 0) return sock.sendMessage(from, { text: '❌ No groups found. Make sure the bot is in at least one group.' });
    let sent = 0;
    for (const gid of groups) {
      try { await sock.sendMessage(gid, { text: `📢 *Broadcast*\n\n${message}` }); sent++; } catch (e) {}
      await new Promise(r => setTimeout(r, 500)); // anti-spam delay between groups
    }
    await sock.sendMessage(from, { text: `✅ Broadcast sent to ${sent}/${groups.length} groups.` }, { quoted: msg });
  },

  // ── .kick ──────────────────────────────────────────────────────────────────
  kick: async ({ sock, from, msg, isGroup, sender, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0] ? args[0].replace('@', '') + '@s.whatsapp.net' : null);
    if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to kick!' });
    await sock.groupParticipantsUpdate(from, [target], 'remove');
    await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} kicked!`, mentions: [target] }, { quoted: msg });
  },

  // ── .add ───────────────────────────────────────────────────────────────────
  add: async ({ sock, from, msg, isGroup, sender, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    const number = args[0]?.replace(/[^0-9]/g, '');
    if (!number) return sock.sendMessage(from, { text: '❌ Usage: .add [number with country code]' });
    const jid = number + '@s.whatsapp.net';
    await sock.groupParticipantsUpdate(from, [jid], 'add');
    await sock.sendMessage(from, { text: `✅ @${number} added to group!`, mentions: [jid] }, { quoted: msg });
  },

  // ── .promote ───────────────────────────────────────────────────────────────
  promote: async ({ sock, from, msg, isGroup, sender, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0] ? args[0].replace('@', '') + '@s.whatsapp.net' : null);
    if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to promote!' });
    await sock.groupParticipantsUpdate(from, [target], 'promote');
    await sock.sendMessage(from, { text: `⬆️ @${target.split('@')[0]} promoted to admin!`, mentions: [target] }, { quoted: msg });
  },

  // ── .demote ────────────────────────────────────────────────────────────────
  demote: async ({ sock, from, msg, isGroup, sender, args }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0] ? args[0].replace('@', '') + '@s.whatsapp.net' : null);
    if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to demote!' });
    await sock.groupParticipantsUpdate(from, [target], 'demote');
    await sock.sendMessage(from, { text: `⬇️ @${target.split('@')[0]} demoted!`, mentions: [target] }, { quoted: msg });
  },

  // ── .mute / .unmute ────────────────────────────────────────────────────────
  mute: async ({ sock, from, msg, isGroup, sender }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    await sock.groupSettingUpdate(from, 'announcement');
    await sock.sendMessage(from, { text: '🔇 Group *muted*.' }, { quoted: msg });
  },

  unmute: async ({ sock, from, msg, isGroup, sender }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    await sock.groupSettingUpdate(from, 'not_announcement');
    await sock.sendMessage(from, { text: '🔊 Group *unmuted*.' }, { quoted: msg });
  },

  // ── .revoke ────────────────────────────────────────────────────────────────
  revoke: async ({ sock, from, msg, isGroup, sender }) => {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
    const groupMeta = await sock.groupMetadata(from);
    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' });
    const code = await sock.groupRevokeInvite(from);
    await sock.sendMessage(from, { text: `🔄 Group invite link revoked!\nNew link: https://chat.whatsapp.com/${code}` }, { quoted: msg });
  },

  // ── .antispam ──────────────────────────────────────────────────────────────
  antispam: async ({ sock, from, msg, isGroup, isOwner, args }) => {
    if (!isGroup || !isOwner) return sock.sendMessage(from, { text: '❌ Owner/group only!' });
    const toggle = args[0]?.toLowerCase();
    if (!toggle) return sock.sendMessage(from, { text: '🛡️ Usage: .antispam on/off' });
    global.antispam = global.antispam || {};
    global.antispam[from] = toggle === 'on';
    await sock.sendMessage(from, { text: `🛡️ Antispam ${toggle === 'on' ? '*enabled*' : '*disabled*'} for this group.` }, { quoted: msg });
  },
};

// ── PERMISSIONS SYSTEM ───────────────────────────────────────────────────────
// In-memory store: { groupId: { memberJid: { level, allowed: Set, blocked: Set } } }
if (!global.memberPerms) global.memberPerms = {};

function getPerms(groupId, jid) {
  if (!global.memberPerms[groupId]) global.memberPerms[groupId] = {};
  if (!global.memberPerms[groupId][jid]) {
    global.memberPerms[groupId][jid] = { level: 'member', allowed: new Set(), blocked: new Set() };
  }
  return global.memberPerms[groupId][jid];
}

// Check if a member can use a specific command (called from main command handler)
// level: 'owner' > 'superadmin' > 'admin' > 'trusted' > 'member' > 'restricted'
function canUseCommand(groupId, jid, cmd) {
  const p = global.memberPerms?.[groupId]?.[jid];
  if (!p) return true; // default: allowed
  if (p.level === 'restricted') return p.allowed.has(cmd); // only explicitly allowed
  if (p.level === 'trusted')    return !p.blocked.has(cmd); // all except blocked
  if (p.level === 'superadmin') return true; // all commands
  return !p.blocked.has(cmd); // member: all except blocked
}

module.exports.canUseCommand = canUseCommand;


const PERM_LEVELS = ['restricted', 'member', 'trusted', 'superadmin'];

module.exports.setperm = async ({ sock, from, msg, isGroup, sender, args }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
  const groupMeta = await sock.groupMetadata(from);
  const senderInfo = groupMeta.participants.find(p => p.id === sender);
  const isAdmin = senderInfo?.admin;
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin only!' });

  // Usage: .setperm @user <level> [+cmd1,cmd2 / -cmd1,cmd2]
  // Example: .setperm @henry trusted +sticker,ai
  // Example: .setperm @henry restricted +help
  // Example: .setperm @henry member -nsfw,adult

  const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || (args[0]?.replace('@','') + '@s.whatsapp.net');
  if (!target || !target.includes('@s.whatsapp.net')) {
    return sock.sendMessage(from, { text: `📋 *Usage:* .setperm @user <level> [+cmds / -cmds]\n\n*Levels:*\n• *superadmin* — can use all commands\n• *trusted* — all commands except blocked ones\n• *member* — default level\n• *restricted* — can only use explicitly allowed commands\n\n*Examples:*\n.setperm @henry trusted\n.setperm @henry restricted +help,ping\n.setperm @henry trusted -adult,nsfw` });
  }

  const level = args[1]?.toLowerCase();
  const extraArg = args[2] || '';

  if (level && !PERM_LEVELS.includes(level)) {
    return sock.sendMessage(from, { text: `❌ Invalid level. Use: ${PERM_LEVELS.join(' | ')}` });
  }

  const perms = getPerms(from, target);

  if (level) perms.level = level;

  // Parse +cmd1,cmd2 or -cmd1,cmd2
  if (extraArg.startsWith('+')) {
    const cmds = extraArg.slice(1).split(',').map(c => c.trim()).filter(Boolean);
    cmds.forEach(c => { perms.allowed.add(c); perms.blocked.delete(c); });
  } else if (extraArg.startsWith('-')) {
    const cmds = extraArg.slice(1).split(',').map(c => c.trim()).filter(Boolean);
    cmds.forEach(c => { perms.blocked.add(c); perms.allowed.delete(c); });
  }

  const levelEmoji = { superadmin: '👑', trusted: '⭐', member: '👤', restricted: '🔒' };
  const tag = target.split('@')[0];
  let reply = `✅ *Permissions Updated*\n\n👤 @${tag}\n${levelEmoji[perms.level] || '👤'} Level: *${perms.level}*`;
  if (perms.allowed.size > 0) reply += `\n✅ Allowed: ${[...perms.allowed].join(', ')}`;
  if (perms.blocked.size > 0) reply += `\n🚫 Blocked: ${[...perms.blocked].join(', ')}`;

  await sock.sendMessage(from, { text: reply, mentions: [target] }, { quoted: msg });
};

module.exports.resetperm = async ({ sock, from, msg, isGroup, sender, args }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
  const groupMeta = await sock.groupMetadata(from);
  const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin only!' });
  const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!target) return sock.sendMessage(from, { text: '❌ Tag the user to reset!' });
  if (global.memberPerms?.[from]) delete global.memberPerms[from][target];
  const tag = target.split('@')[0];
  await sock.sendMessage(from, { text: `🔄 @${tag} permissions reset to default.`, mentions: [target] }, { quoted: msg });
};

module.exports.myperm = async ({ sock, from, msg, isGroup, sender }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
  const perms = global.memberPerms?.[from]?.[sender];
  const tag = sender.split('@')[0];
  if (!perms) return sock.sendMessage(from, { text: `👤 @${tag}\n⭐ Level: *member* (default)\n✅ Can use all commands`, mentions: [sender] });
  const levelEmoji = { superadmin: '👑', trusted: '⭐', member: '👤', restricted: '🔒' };
  let reply = `👤 @${tag}\n${levelEmoji[perms.level]||'👤'} Level: *${perms.level}*`;
  if (perms.allowed.size > 0) reply += `\n✅ Extra allowed: ${[...perms.allowed].join(', ')}`;
  if (perms.blocked.size > 0) reply += `\n🚫 Blocked: ${[...perms.blocked].join(', ')}`;
  await sock.sendMessage(from, { text: reply, mentions: [sender] }, { quoted: msg });
};

module.exports.listperms = async ({ sock, from, msg, isGroup, sender }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' });
  const groupMeta = await sock.groupMetadata(from);
  const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin only!' });
  const groupPerms = global.memberPerms?.[from] || {};
  const entries = Object.entries(groupPerms);
  if (entries.length === 0) return sock.sendMessage(from, { text: '📋 No custom permissions set in this group.' });
  const levelEmoji = { superadmin: '👑', trusted: '⭐', member: '👤', restricted: '🔒' };
  let reply = '📋 *Group Permissions*\n\n';
  const mentions = [];
  for (const [jid, p] of entries) {
    const tag = jid.split('@')[0];
    reply += `${levelEmoji[p.level]||'👤'} @${tag} — *${p.level}*`;
    if (p.blocked.size) reply += ` 🚫${[...p.blocked].join(',')}`;
    if (p.allowed.size) reply += ` ✅${[...p.allowed].join(',')}`;
    reply += '\n';
    mentions.push(jid);
  }
  await sock.sendMessage(from, { text: reply.trim(), mentions }, { quoted: msg });
};

// ── .creategroup ───────────────────────────────────────────────────────────
// Owner only. Bulk-create a new WhatsApp group from a plain list of numbers.
// Usage: .creategroup Group Name | 254712345678,254798765432,0712345678
module.exports.creategroup = async ({ sock, from, msg, isOwner, args }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const raw = args.join(' ');
  if (!raw.includes('|')) {
    return sock.sendMessage(from, {
      text: `📋 *Usage:*\n${'.'}creategroup Group Name | 254712345678,254798765432,254700111222\n\n• Separate the group name and numbers with *|*\n• Numbers can be plain (with or without country code), comma or space separated\n• Names are optional — just paste raw numbers`
    }, { quoted: msg });
  }
  const [namePartRaw, numsPartRaw] = raw.split('|');
  const groupName = namePartRaw.trim() || 'New Group';
  const numbers = numsPartRaw.split(/[,\s]+/).map(n => n.trim()).filter(Boolean);
  if (numbers.length === 0) {
    return sock.sendMessage(from, { text: '❌ No numbers found after the | separator.' }, { quoted: msg });
  }

  const jids = numbers.map(n => {
    let clean = n.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1); // default to KE country code for local-format numbers
    return `${clean}@s.whatsapp.net`;
  });

  await sock.sendMessage(from, { text: `⏳ Creating group *${groupName}* with ${jids.length} number(s)...` }, { quoted: msg });

  try {
    const group = await sock.groupCreate(groupName, jids);
    const addedCount = group?.participants?.length || jids.length;
    await sock.sendMessage(from, {
      text: `✅ Group created!\n\n📛 *${groupName}*\n👥 ${addedCount} member(s) added\n🆔 ${group.id}\n\nNote: numbers without WhatsApp, or that block adding by unknown contacts, may not have been added — check the group directly.`
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed to create group: ${e.message}` }, { quoted: msg });
  }
};

// ── .addtogroup ────────────────────────────────────────────────────────────
// Owner only. Bulk-add a plain list of numbers to an EXISTING group.
// Run this command INSIDE the target group: .addtogroup 254712345678,254798765432
module.exports.addtogroup = async ({ sock, from, msg, isGroup, isOwner, args }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  if (!isGroup) {
    return sock.sendMessage(from, {
      text: `📋 *Usage:* run this command inside the group you want people added to:\n${'.'}addtogroup 254712345678,254798765432,254700111222\n\nNumbers can be plain, with or without country code, comma or space separated.`
    }, { quoted: msg });
  }
  const numbers = args.join(' ').split(/[,\s]+/).map(n => n.trim()).filter(Boolean);
  if (numbers.length === 0) {
    return sock.sendMessage(from, { text: '❌ Please list the numbers to add, e.g. .addtogroup 254712345678,254798765432' }, { quoted: msg });
  }

  const jids = numbers.map(n => {
    let clean = n.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1);
    return `${clean}@s.whatsapp.net`;
  });

  try {
    const result = await sock.groupParticipantsUpdate(from, jids, 'add');
    const ok = result.filter(r => r.status === '200').length;
    const failed = result.length - ok;
    let text = `✅ Added ${ok}/${jids.length} number(s) to the group.`;
    if (failed > 0) text += `\n⚠️ ${failed} could not be added directly — they may need a WhatsApp invite link (privacy settings).`;
    await sock.sendMessage(from, { text }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed to add members: ${e.message}` }, { quoted: msg });
  }
};
