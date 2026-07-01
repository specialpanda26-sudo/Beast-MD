'use strict';
const axios   = require('axios');
const math    = require('mathjs');
const config  = require('../config');
const db      = require('../lib/database');
const { toSticker }    = require('../lib/sticker');
const { askAI, clearAIHistory } = require('../lib/ai');
const games   = require('../lib/games');
const dl      = require('../lib/downloader');
const { mention, downloadMsg, sleep, buildMenu } = require('../lib/utils');

// ── Command map ───────────────────────────────────────────────────────────────
// Each key = command name (without prefix)
// Value = async function({ sock, msg, from, sender, args, isGroup, isAdmin, isOwner, isSudo, config, db, quoted })

const commands = {};

// ═══════════════════════════════════════════════════════════════════════════════
//  GENERAL
// ═══════════════════════════════════════════════════════════════════════════════

commands.menu = async ({ sock, from, msg, config, prefix }) => {
  await sock.sendMessage(from, { text: buildMenu(prefix) }, { quoted: msg });
};

commands.ping = async ({ sock, from, msg }) => {
  const t = Date.now();
  await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
  const ms = Date.now() - t;
  await sock.sendMessage(from, { text: `⚡ Response time: *${ms}ms*` });
};

commands.runtime = async ({ sock, from, msg }) => {
  const up = process.uptime();
  const h  = Math.floor(up / 3600);
  const m  = Math.floor((up % 3600) / 60);
  const s  = Math.floor(up % 60);
  const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  await sock.sendMessage(from, {
    text: `⏱️ *Henry Agent19v™ Runtime*\n\n🕒 Uptime: *${h}h ${m}m ${s}s*\n💾 RAM: *${ram} MB*\n🌍 Timezone: *${config.timezone}*`,
  }, { quoted: msg });
};

commands.botinfo = async ({ sock, from, msg, config }) => {
  const text = `🤖 *Henry Agent19v™*
━━━━━━━━━━━━━━━━━
👑 Owner: *${config.ownerName}*
📞 Number: *+${config.ownerNumber}*
🔖 Version: *v${config.version}*
⚙️ Mode: *${config.botMode}*
🔰 Prefix: *${config.prefix}*
🤝 Built with: *Baileys + Node.js*
━━━━━━━━━━━━━━━━━
> Henry Agent19v™ — Ultimate WhatsApp Bot`;
  await sock.sendMessage(from, { text }, { quoted: msg });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  AI COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

commands.ask = async ({ sock, from, msg, args, sender }) => {
  const question = args.join(' ').trim();
  if (!question) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}ask [your question]` }, { quoted: msg });
  await sock.sendPresenceUpdate('composing', from);
  const reply = await askAI(sender, question);
  await sock.sendMessage(from, { text: reply }, { quoted: msg });
};

commands.clearchat = async ({ sock, from, msg, sender }) => {
  clearAIHistory(sender);
  await sock.sendMessage(from, { text: '🧹 AI conversation memory cleared!' }, { quoted: msg });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STICKER
// ═══════════════════════════════════════════════════════════════════════════════

async function handleSticker(sock, from, msg, quoted, animated = false) {
  if (!quoted) return sock.sendMessage(from, { text: '📌 Reply to an image/video with this command to create a sticker.' }, { quoted: msg });
  const mime = quoted.message?.imageMessage || quoted.message?.videoMessage || quoted.message?.stickerMessage;
  if (!mime) return sock.sendMessage(from, { text: '❌ Please reply to an image or video.' }, { quoted: msg });
  await sock.sendPresenceUpdate('composing', from);
  try {
    const buf = await downloadMsg(quoted, sock);
    const sticker = await toSticker(buf, {
      packname: config.packname,
      author: config.author,
      isAnimated: animated,
    });
    await sock.sendMessage(from, { sticker }, { quoted: msg });
  } catch (e) {
    console.error('[Sticker]', e.message);
    await sock.sendMessage(from, { text: `❌ Sticker creation failed: ${e.message}` }, { quoted: msg });
  }
}

commands.sticker = commands.s = async ({ sock, from, msg, quoted }) => {
  await handleSticker(sock, from, msg, quoted, false);
};

commands.assticker = commands.as = async ({ sock, from, msg, quoted }) => {
  await handleSticker(sock, from, msg, quoted, true);
};

commands.toimage = commands.ti = async ({ sock, from, msg, quoted }) => {
  if (!quoted?.message?.stickerMessage)
    return sock.sendMessage(from, { text: '📌 Reply to a sticker.' }, { quoted: msg });
  try {
    const buf = await downloadMsg(quoted, sock);
    await sock.sendMessage(from, { image: buf, caption: '🖼️ *Sticker → Image*\n> Henry Agent19v™' }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Conversion failed: ${e.message}` }, { quoted: msg });
  }
};

commands.getpp = async ({ sock, from, msg, args, quoted }) => {
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  try {
    const url = await sock.profilePictureUrl(target, 'image');
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const buf = Buffer.from(res.data);
    await sock.sendMessage(from, { image: buf, caption: `🖼️ Profile photo of @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: '❌ No profile photo found or user has hidden it.' }, { quoted: msg });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DOWNLOADER
// ═══════════════════════════════════════════════════════════════════════════════

commands.ytmp3 = async ({ sock, from, msg, args }) => {
  const url = args[0];
  if (!url) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}ytmp3 [YouTube URL]` }, { quoted: msg });
  await sock.sendMessage(from, { text: '⏳ Downloading audio...' }, { quoted: msg });
  try {
    const buf = await dl.downloadYTAudio(url);
    await sock.sendMessage(from, {
      audio: buf, mimetype: 'audio/mpeg', ptt: false,
      caption: '🎵 Downloaded by *Henry Agent19v™*',
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed: ${e.message}\n\n_Tip: Make sure yt-dlp is installed._` }, { quoted: msg });
  }
};

commands.ytmp4 = async ({ sock, from, msg, args }) => {
  const url = args[0];
  if (!url) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}ytmp4 [YouTube URL]` }, { quoted: msg });
  await sock.sendMessage(from, { text: '⏳ Downloading video...' }, { quoted: msg });
  try {
    const buf = await dl.downloadYTVideo(url);
    await sock.sendMessage(from, {
      video: buf, mimetype: 'video/mp4',
      caption: '🎬 Downloaded by *Henry Agent19v™*',
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
  }
};

commands.tiktok = commands.tt = async ({ sock, from, msg, args }) => {
  const url = args[0];
  if (!url) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}tiktok [TikTok URL]` }, { quoted: msg });
  await sock.sendMessage(from, { text: '⏳ Downloading TikTok...' }, { quoted: msg });
  try {
    const buf = await dl.downloadTikTok(url);
    await sock.sendMessage(from, {
      video: buf, mimetype: 'video/mp4',
      caption: '🎵 TikTok — downloaded by *Henry Agent19v™*',
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
  }
};

commands.ytinfo = async ({ sock, from, msg, args }) => {
  const url = args[0];
  if (!url) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}ytinfo [YouTube URL]` }, { quoted: msg });
  try {
    const info = await dl.getYTInfo(url);
    await sock.sendMessage(from, {
      text: `🎬 *YouTube Info*\n━━━━━━━━━━━━━\n🎵 *Title:* ${info.title}\n⏱️ *Duration:* ${info.duration}\n👤 *Uploader:* ${info.uploader}\n👀 *Views:* ${info.views}`,
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: `❌ Failed to fetch info.` }, { quoted: msg });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GROUP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

commands.tagall = async ({ sock, from, msg, args, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only command!' }, { quoted: msg });
  const meta    = await sock.groupMetadata(from);
  const members = meta.participants;
  const text    = args.join(' ') || '📢 Attention everyone!';
  let out = `╔══════════════════════════╗\n║    📢 *TAG ALL*          ║\n╚══════════════════════════╝\n\n💬 ${text}\n\n`;
  const mentions = [];
  for (const m of members) {
    out += `👤 @${m.id.split('@')[0]}\n`;
    mentions.push(m.id);
  }
  await sock.sendMessage(from, { text: out, mentions }, { quoted: msg });
};

commands.kick = async ({ sock, from, msg, args, isGroup, isAdmin, quoted }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag or mention someone to kick.' }, { quoted: msg });
  await sock.groupParticipantsUpdate(from, [target], 'remove');
  await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} has been removed.`, mentions: [target] }, { quoted: msg });
};

commands.add = async ({ sock, from, msg, args, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  const number = args[0]?.replace(/[^0-9]/g, '');
  if (!number) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}add [number]` }, { quoted: msg });
  const jid = number + '@s.whatsapp.net';
  await sock.groupParticipantsUpdate(from, [jid], 'add');
  await sock.sendMessage(from, { text: `✅ @${number} has been added!`, mentions: [jid] }, { quoted: msg });
};

commands.promote = async ({ sock, from, msg, args, isGroup, isAdmin, quoted }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to promote.' }, { quoted: msg });
  await sock.groupParticipantsUpdate(from, [target], 'promote');
  await sock.sendMessage(from, { text: `⬆️ @${target.split('@')[0]} has been promoted to admin! 🎖️`, mentions: [target] }, { quoted: msg });
};

commands.demote = async ({ sock, from, msg, args, isGroup, isAdmin, quoted }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to demote.' }, { quoted: msg });
  await sock.groupParticipantsUpdate(from, [target], 'demote');
  await sock.sendMessage(from, { text: `⬇️ @${target.split('@')[0]} has been demoted.`, mentions: [target] }, { quoted: msg });
};

commands.mute = async ({ sock, from, msg, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  await sock.groupSettingUpdate(from, 'announcement');
  await sock.sendMessage(from, { text: '🔇 Group has been muted. Only admins can send messages.' }, { quoted: msg });
};

commands.unmute = async ({ sock, from, msg, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  await sock.groupSettingUpdate(from, 'not_announcement');
  await sock.sendMessage(from, { text: '🔊 Group has been unmuted. Everyone can now send messages.' }, { quoted: msg });
};

commands.groupname = async ({ sock, from, msg, args, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  const name = args.join(' ').trim();
  if (!name) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}groupname [new name]` }, { quoted: msg });
  await sock.groupUpdateSubject(from, name);
  await sock.sendMessage(from, { text: `✅ Group name changed to: *${name}*` }, { quoted: msg });
};

commands.grouplink = async ({ sock, from, msg, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ Bot must be admin!' }, { quoted: msg });
  const { inviteCode } = await sock.groupInviteCode(from);
  await sock.sendMessage(from, { text: `🔗 *Group Invite Link*\nhttps://chat.whatsapp.com/${inviteCode}` }, { quoted: msg });
};

commands.antilink = async ({ sock, from, msg, args, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' }, { quoted: msg });
  const val = args[0] === 'on' ? 1 : 0;
  db.setGroup(from, 'antilink', val);
  await sock.sendMessage(from, { text: `🔗 Anti-link: *${val ? 'ON ✅' : 'OFF ❌'}*` }, { quoted: msg });
};

commands.antibadword = async ({ sock, from, msg, args, isGroup, isAdmin }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' }, { quoted: msg });
  const val = args[0] === 'on' ? 1 : 0;
  db.setGroup(from, 'antibadword', val);
  await sock.sendMessage(from, { text: `🤬 Anti-bad-word: *${val ? 'ON ✅' : 'OFF ❌'}*` }, { quoted: msg });
};

commands.warn = async ({ sock, from, msg, args, isGroup, isAdmin, quoted }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to warn.' }, { quoted: msg });
  const reason = args.slice(1).join(' ') || 'No reason given';
  const warns  = db.addWarn(target, from, reason);
  const gs     = db.getGroup(from);
  const max    = gs.warn_limit || 3;
  await sock.sendMessage(from, {
    text: `⚠️ *Warning Issued*\n👤 @${target.split('@')[0]}\n📌 Reason: ${reason}\n📊 Warns: ${warns.length}/${max}`,
    mentions: [target],
  }, { quoted: msg });
  if (warns.length >= max) {
    await sock.groupParticipantsUpdate(from, [target], 'remove');
    await sock.sendMessage(from, { text: `🚫 @${target.split('@')[0]} was removed after ${max} warnings.`, mentions: [target] });
    db.clearWarns(target, from);
  }
};

commands.warns = async ({ sock, from, msg, args, isGroup, quoted }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone to check warns.' }, { quoted: msg });
  const warns = db.getWarns(target, from);
  await sock.sendMessage(from, {
    text: `📋 @${target.split('@')[0]} has *${warns.length}* warn(s).`,
    mentions: [target],
  }, { quoted: msg });
};

commands.clearwarn = async ({ sock, from, msg, args, isGroup, isAdmin, quoted }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only!' }, { quoted: msg });
  if (!isAdmin) return sock.sendMessage(from, { text: '❌ You must be admin!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone.' }, { quoted: msg });
  db.clearWarns(target, from);
  await sock.sendMessage(from, { text: `✅ Cleared warns for @${target.split('@')[0]}.`, mentions: [target] }, { quoted: msg });
};

commands.bcgc = async ({ sock, from, msg, args, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const text = args.join(' ');
  if (!text) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}bcgc [message]` }, { quoted: msg });
  const chats = await sock.groupFetchAllParticipating();
  let sent = 0;
  for (const jid of Object.keys(chats)) {
    try {
      await sock.sendMessage(jid, { text: `📢 *Broadcast from ${config.botName}*\n\n${text}` });
      sent++;
      await sleep(500);
    } catch {}
  }
  await sock.sendMessage(from, { text: `✅ Broadcast sent to *${sent}* groups.` }, { quoted: msg });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GAMES
// ═══════════════════════════════════════════════════════════════════════════════

commands.trivia = async ({ sock, from, msg }) => {
  const question = games.startTrivia(from);
  await sock.sendMessage(from, { text: `🧠 *Trivia Time!*\n\n❓ ${question}\n\n⏱️ You have 60 seconds! Reply with your answer.` }, { quoted: msg });
};

// trivia answer is caught in the message handler

commands.tictactoe = async ({ sock, from, msg, args, sender, quoted, isGroup }) => {
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only game!' }, { quoted: msg });
  const p2 = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!p2 || p2 === sender) return sock.sendMessage(from, { text: '❌ Tag another player to challenge!' }, { quoted: msg });
  const session = games.startTTT(from, sender, p2);
  await sock.sendMessage(from, {
    text: `🎮 *TicTacToe Started!*\n❌ @${sender.split('@')[0]} vs ⭕ @${p2.split('@')[0]}\n\n${games.renderBoard(session.board)}\n\n▶️ @${sender.split('@')[0]}'s turn — type *!play [1-9]*`,
    mentions: [sender, p2],
  }, { quoted: msg });
};

commands.play = async ({ sock, from, msg, args, sender, isGroup }) => {
  if (!isGroup) return;
  const result = games.playTTT(from, sender, args[0]);
  if (!result) return;
  if (result.error) return sock.sendMessage(from, { text: `❌ ${result.error}` }, { quoted: msg });
  if (result.draw) return sock.sendMessage(from, { text: `🏳️ *It's a draw!*\n\n${result.board}` }, { quoted: msg });
  if (result.winner) {
    return sock.sendMessage(from, {
      text: `🏆 *@${result.winner.split('@')[0]} wins!*\n\n${result.board}`,
      mentions: [result.winner],
    }, { quoted: msg });
  }
  await sock.sendMessage(from, {
    text: `${result.board}\n\n▶️ @${result.next.split('@')[0]}'s turn`,
    mentions: [result.next],
  }, { quoted: msg });
};

commands.rps = async ({ sock, from, msg, args }) => {
  const result = games.playRPS(args[0] || '');
  if (!result) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}rps [rock/paper/scissors]` }, { quoted: msg });
  const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
  const status = { win: '🏆 You win!', lose: '😔 You lose!', draw: '🤝 Draw!' };
  await sock.sendMessage(from, {
    text: `${emojis[result.user]} You: *${result.user}*\n${emojis[result.bot]} Bot: *${result.bot}*\n\n${status[result.result]}`,
  }, { quoted: msg });
};

commands.roll = async ({ sock, from, msg, args }) => {
  const result = games.rollDice(args[0] || '1d6');
  if (!result) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}roll [NdS] e.g. 2d6+3` }, { quoted: msg });
  await sock.sendMessage(from, {
    text: `🎲 *Dice Roll: ${result.notation}*\nRolls: [${result.rolls.join(', ')}]\n🏆 Total: *${result.total}*`,
  }, { quoted: msg });
};

commands.guess = async ({ sock, from, msg, args }) => {
  const max = parseInt(args[0]) || 100;
  games.startGuess(from, max);
  await sock.sendMessage(from, { text: `🎯 I'm thinking of a number between *1* and *${max}*.\nType your guess!` }, { quoted: msg });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

commands.calc = async ({ sock, from, msg, args }) => {
  const expr = args.join(' ');
  if (!expr) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}calc [expression]` }, { quoted: msg });
  try {
    const result = math.evaluate(expr);
    await sock.sendMessage(from, { text: `🧮 *Calculator*\n📌 ${expr}\n= *${result}*` }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: '❌ Invalid expression.' }, { quoted: msg });
  }
};

commands.weather = async ({ sock, from, msg, args }) => {
  const city = args.join(' ');
  if (!city) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}weather [city]` }, { quoted: msg });
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 10000 });
    const data = res.data.current_condition?.[0];
    if (!data) throw new Error('No data');
    await sock.sendMessage(from, {
      text: `🌤️ *Weather in ${city}*\n━━━━━━━━━━━━\n🌡️ Temp: *${data.temp_C}°C / ${data.temp_F}°F*\n💧 Humidity: *${data.humidity}%*\n💨 Wind: *${data.windspeedKmph} km/h*\n☁️ Condition: *${data.weatherDesc?.[0]?.value}*`,
    }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: '❌ Could not fetch weather. Check the city name.' }, { quoted: msg });
  }
};

commands.define = async ({ sock, from, msg, args }) => {
  const word = args[0];
  if (!word) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}define [word]` }, { quoted: msg });
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, { timeout: 10000 });
    const entry = res.data[0];
    const meaning = entry.meanings[0];
    const def = meaning.definitions[0];
    await sock.sendMessage(from, {
      text: `📖 *${entry.word}*\n🔤 Part of speech: _${meaning.partOfSpeech}_\n\n📝 ${def.definition}${def.example ? `\n💬 Example: _${def.example}_` : ''}`,
    }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: `❌ Could not find definition for *${word}*.` }, { quoted: msg });
  }
};

commands.joke = async ({ sock, from, msg }) => {
  try {
    const res = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 10000 });
    await sock.sendMessage(from, { text: `😂 *Joke Time!*\n\n${res.data.setup}\n\n_${res.data.punchline}_` }, { quoted: msg });
  } catch {
    const jokes = [
      'Why do programmers hate nature? It has too many bugs! 🐛',
      'Why did the bot go to school? To improve its language model! 🤖',
      'How do you comfort a JavaScript developer? You Promise it will be okay! 😄',
    ];
    await sock.sendMessage(from, { text: `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}` }, { quoted: msg });
  }
};

commands.quote = async ({ sock, from, msg }) => {
  try {
    const res = await axios.get('https://api.quotable.io/random', { timeout: 10000 });
    await sock.sendMessage(from, { text: `💭 *"${res.data.content}"*\n— _${res.data.author}_` }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: `💭 *"Success is not final, failure is not fatal: It is the courage to continue that counts."*\n— _Winston Churchill_` }, { quoted: msg });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  OWNER COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

commands.broadcast = async ({ sock, from, msg, args, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const text = args.join(' ');
  if (!text) return sock.sendMessage(from, { text: `❓ Usage: ${config.prefix}broadcast [message]` }, { quoted: msg });
  const chats = await sock.groupFetchAllParticipating().catch(() => ({}));
  let sent = 0;
  for (const jid of Object.keys(chats)) {
    try {
      await sock.sendMessage(jid, { text: `📢 *${config.botName}*\n\n${text}` });
      sent++;
      await sleep(600);
    } catch {}
  }
  await sock.sendMessage(from, { text: `✅ Broadcast sent to *${sent}* groups.` }, { quoted: msg });
};

commands.addsudo = async ({ sock, from, msg, args, isOwner, quoted }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag or mention someone.' }, { quoted: msg });
  db.addSudo(target);
  await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} added as sudo admin.`, mentions: [target] }, { quoted: msg });
};

commands.delsudo = async ({ sock, from, msg, args, isOwner, quoted }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag or mention someone.' }, { quoted: msg });
  db.removeSudo(target);
  await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} removed from sudo.`, mentions: [target] }, { quoted: msg });
};

commands.setmode = async ({ sock, from, msg, args, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const mode = args[0];
  if (!['public', 'private', 'groups'].includes(mode))
    return sock.sendMessage(from, { text: '❓ Usage: !setmode [public/private/groups]' }, { quoted: msg });
  db.setSetting('botMode', mode);
  config.botMode = mode;
  await sock.sendMessage(from, { text: `✅ Bot mode set to *${mode}*.` }, { quoted: msg });
};

commands.block = async ({ sock, from, msg, args, isOwner, quoted }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone.' }, { quoted: msg });
  await sock.updateBlockStatus(target, 'block');
  await sock.sendMessage(from, { text: `🚫 Blocked @${target.split('@')[0]}.`, mentions: [target] }, { quoted: msg });
};

commands.unblock = async ({ sock, from, msg, args, isOwner, quoted }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  const target = quoted?.key?.participant || (args[0]?.replace('@', '') + '@s.whatsapp.net');
  if (!target) return sock.sendMessage(from, { text: '❌ Tag someone.' }, { quoted: msg });
  await sock.updateBlockStatus(target, 'unblock');
  await sock.sendMessage(from, { text: `✅ Unblocked @${target.split('@')[0]}.`, mentions: [target] }, { quoted: msg });
};

commands.restart = async ({ sock, from, msg, isOwner }) => {
  if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
  await sock.sendMessage(from, { text: '🔄 Restarting *Henry Agent19v™*...' }, { quoted: msg });
  setTimeout(() => process.exit(0), 1000);
};

// ═══════════════════════════════════════════════════════════════════════════════

module.exports = { commands };
