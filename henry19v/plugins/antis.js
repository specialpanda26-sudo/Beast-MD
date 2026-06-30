'use strict';
const db     = require('../lib/database');
const config = require('../config');
const { getText } = require('../lib/utils');

const LINK_REGEX = /(?:https?:\/\/|www\.)[\w.-]+\.[a-z]{2,}(?:[^\s]*)?|chat\.whatsapp\.com\/[a-z0-9]+/gi;
const EMOJIS     = ['❤️', '😂', '🔥', '👍', '🎉', '💯', '😍', '🤩', '😎', '🙌'];

/**
 * Handle anti-link — delete message and warn/kick sender
 */
async function handleAntiLink(sock, msg, from, sender) {
  const gs = db.getGroup(from);
  if (!gs?.antilink) return false;

  const text = getText(msg);
  if (!LINK_REGEX.test(text)) return false;

  // Check if sender is admin — never punish admins
  try {
    const meta   = await sock.groupMetadata(from);
    const member = meta.participants.find(p => p.id === sender);
    if (member?.admin) return false;
  } catch {}

  // Delete the message
  try { await sock.sendMessage(from, { delete: msg.key }); } catch {}

  const warns = db.addWarn(sender, from, 'Sent a link (anti-link enabled)');
  const max   = gs.warn_limit || 3;

  if (warns.length >= max) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sock.sendMessage(from, {
      text: `🚫 @${sender.split('@')[0]} was removed for repeatedly sending links.`,
      mentions: [sender],
    });
    db.clearWarns(sender, from);
  } else {
    await sock.sendMessage(from, {
      text: `⚠️ @${sender.split('@')[0]}, links are *not allowed* here!\n📊 Warn: ${warns.length}/${max}`,
      mentions: [sender],
    });
  }
  return true;
}

/**
 * Handle anti-bad-word
 */
async function handleAntiBadWord(sock, msg, from, sender) {
  const gs = db.getGroup(from);
  if (!gs?.antibadword) return false;

  const text  = getText(msg).toLowerCase();
  const words = db.getBadWords();
  const found = words.find(w => text.includes(w));
  if (!found) return false;

  try { await sock.sendMessage(from, { delete: msg.key }); } catch {}

  const warns = db.addWarn(sender, from, `Used a banned word: "${found}"`);
  const max   = gs.warn_limit || 3;
  await sock.sendMessage(from, {
    text: `⚠️ @${sender.split('@')[0]}, that word is *not allowed* here! (warn ${warns.length}/${max})`,
    mentions: [sender],
  });

  if (warns.length >= max) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sock.sendMessage(from, {
      text: `🚫 @${sender.split('@')[0]} removed for bad language.`,
      mentions: [sender],
    });
    db.clearWarns(sender, from);
  }
  return true;
}

/**
 * Auto-react to messages
 */
async function autoReact(sock, msg) {
  if (!config.autoReact) return;
  if (!msg.key?.id) return;
  try {
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch {}
}

/**
 * Auto-read status updates
 */
async function autoReadStatus(sock, msg) {
  if (!config.autoReadStatus) return;
  try {
    await sock.readMessages([msg.key]);
    if (config.autoLikeStatus) {
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: '❤️', key: msg.key },
      });
    }
  } catch {}
}

/**
 * Group join/leave welcome messages
 */
async function handleGroupUpdate(sock, update) {
  const { id, participants, action } = update;
  const gs = db.getGroup(id);

  try {
    const meta = await sock.groupMetadata(id);
    for (const jid of participants) {
      const num = jid.split('@')[0];
      if (action === 'add' && gs?.welcome) {
        await sock.sendMessage(id, {
          text: `🎉 *Welcome to ${meta.subject}!*\n\n👋 Hey @${num}, glad to have you here!\n\n📌 Please read the group rules and enjoy your stay.\n\n> Henry Agent19v™ | Henrydev.ke`,
          mentions: [jid],
        });
      } else if (action === 'remove' && gs?.goodbye) {
        await sock.sendMessage(id, {
          text: `👋 *Goodbye @${num}*\nWe'll miss you in *${meta.subject}*.\n\n> Henry Agent19v™`,
          mentions: [jid],
        });
      }
    }
  } catch {}
}

module.exports = { handleAntiLink, handleAntiBadWord, autoReact, autoReadStatus, handleGroupUpdate };
