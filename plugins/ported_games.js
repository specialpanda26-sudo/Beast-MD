// AUTO-PORTED from friend's MEGA-MD bot (category: games)
// Mechanically converted from ESM handler(sock,message,args,context) shape
// into Henry's CommonJS module.exports = { cmdName: async (h) => {...} } shape.
// h = { sock, from, msg, isOwner, isPrimaryOwner, isCoOwner, isSubAdmin, isBotAdmin,
//       isGroup, sender, senderJid, sessionId, senderNumber, args, config, apiClient, logActivity }
// NOTE: review each command before relying on it in production — mechanical port,
// not manually re-verified line by line. Some referenced npm packages must be
// installed (see NEW_DEPENDENCIES.txt) and some external API keys/endpoints are
// the friend's own third-party services (discardapi.onrender.com etc.) which may
// be rate-limited, unreliable, or disappear without notice.

module.exports = {};


Object.assign(module.exports, (() => {


  return {

    // ── .dado ─── Roll a random dice sticker | usage: .dado
    "dado": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const _args = h.args;
      const _context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'dado ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = message.key.remoteJid;
        const diceLinks = [
            'https://tinyurl.com/gdd01',
            'https://tinyurl.com/gdd02',
            'https://tinyurl.com/gdd003',
            'https://tinyurl.com/gdd004',
            'https://tinyurl.com/gdd05',
            'https://tinyurl.com/gdd006'
        ];
        const randomDice = diceLinks[Math.floor(Math.random() * diceLinks.length)];
        try {
            await sock.sendMessage(chatId, {
                sticker: { url: randomDice }
            }, { quoted: message });
        }
        catch (e) {
            console.error('Dice Plugin Error:', e);
            await sock.sendMessage(chatId, {
                image: { url: randomDice },
                caption: '🎲 The dice rolled!'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:dado] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .dado: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "dados": async (h) => module.exports["dado"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from math.js ---
  const mathGames = {};
  const modes = {
      noob: [-3, 3, -3, 3, '+-', 15000],
      easy: [-10, 10, -10, 10, '*/+-', 20000],
      normal: [-40, 40, -20, 20, '*/+-', 40000],
      hard: [-100, 100, -70, 70, '*/+-', 60000],
      extreme: [-999999, 999999, -999999, 999999, '*/', 99999],
      impossible: [-99999999999, 99999999999, -99999999999, 999999999999, '*/', 30000],
      impossible2: [-999999999999999, 999999999999999, -999, 999, '/', 30000],
  };
  const operators = {
      '+': '+',
      '-': '-',
      '*': '×',
      '/': '÷',
  };
  return {

    // ── .math ─── Solve math problems | usage: .math
    "math": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const _context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'math ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, config } = _context;
        const prefix = config.prefix;
        if (mathGames[chatId]) {
            return sock.sendMessage(chatId, { text: '⚠️ Solve the current problem first!' }, { quoted: mathGames[chatId].msg });
        }
        const mode = args[0]?.toLowerCase();
        if (!mode || !(mode in modes)) {
            return sock.sendMessage(chatId, {
                text: `🧮 *Available Difficulties:*\n\n${Object.keys(modes).join(' | ')}\n\n_Example: ${prefix}math normal_`
            }, { quoted: message });
        }
        const math = genMath(mode);
        const text = `▢ HOW MUCH IS IT *${math.str}*=\n\n_Time:_ ${(math.time / 1000).toFixed(2)} seconds`;
        const sentMsg = await sock.sendMessage(chatId, { text }, { quoted: message });
        mathGames[chatId] = {
            msg: sentMsg,
            math,
            attempts: 4,
            timeout: setTimeout(() => {
                if (mathGames[chatId]) {
                    sock.sendMessage(chatId, { text: `⏳ *Time is up!*\nThe answer was: *${math.result}*` }, { quoted: mathGames[chatId].msg });
                    delete mathGames[chatId];
                }
            }, math.time)
        };
        if (!this.initialized) {
            this.initialized = true;
            sock.ev.on('messages.upsert', async (upsert) => {
                const m = upsert.messages[0];
                if (!m.message || m.key.fromMe)
                    return;
                const chat = m.key.remoteJid;
                if (!mathGames[chat])
                    return;
                const body = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
                if (!/^-?[0-9]+(\.[0-9]+)?$/.test(body))
                    return;
                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
                if (!/^▢ HOW MUCH IS IT/i.test(quotedText))
                    return;
                const game = mathGames[chat];
                if (body === game.math.result) {
                    clearTimeout(game.timeout);
                    delete mathGames[chat];
                    await sock.sendMessage(chat, { text: `✅ *Correct answer!*\n\nYou won the game.` }, { quoted: m });
                }
                else {
                    game.attempts--;
                    if (game.attempts <= 0) {
                        clearTimeout(game.timeout);
                        delete mathGames[chat];
                        await sock.sendMessage(chat, { text: `❌ *Game Over!*\n\nThe correct answer was: *${game.math.result}*` }, { quoted: m });
                    }
                    else {
                        await sock.sendMessage(chat, { text: `❎ *Wrong answer!*\n\nYou have ${game.attempts} attempts left.` }, { quoted: m });
                    }
                }
            });
        }
    
      } catch (portErr) {
        console.error('[ported:math] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .math: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "maths": async (h) => module.exports["math"](h),
    "ganit": async (h) => module.exports["math"](h),
  };
})());


Object.assign(module.exports, (() => {
  const TicTacToe = require('../lib_ported/tictactoe.js');
  // --- helper code from tictactoe.js ---
  const games = {};
  async function handleTicTacToeMove(sock, chatId, senderId, text) {
      try {
          const room = Object.values(games).find((room) => room.id.startsWith('tictactoe') &&
              [room.game.playerX, room.game.playerO].includes(senderId) &&
              room.state === 'PLAYING');
          if (!room)
              return;
          const isSurrender = /^(surrender|give up)$/i.test(text);
          if (!isSurrender && !/^[1-9]$/.test(text))
              return;
          if (senderId !== room.game.currentTurn && !isSurrender) {
              await sock.sendMessage(chatId, {
                  text: '❌ Not your turn!'
              });
              return;
          }
          const ok = isSurrender ? true : room.game.turn(senderId === room.game.playerO, parseInt(text, 10) - 1);
          if (!ok) {
              await sock.sendMessage(chatId, {
                  text: '❌ Invalid move! That position is already taken.'
              });
              return;
          }
          let winner = room.game.winner;
          const isTie = room.game.turns === 9;
          const arr = room.game.render().map((v) => ({
              'X': '❎',
              'O': '⭕',
              '1': '1️⃣',
              '2': '2️⃣',
              '3': '3️⃣',
              '4': '4️⃣',
              '5': '5️⃣',
              '6': '6️⃣',
              '7': '7️⃣',
              '8': '8️⃣',
              '9': '9️⃣',
          }[v] || v));
          if (isSurrender) {
              winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX;
              await sock.sendMessage(chatId, {
                  text: `🏳️ @${senderId.split('@')[0]} has surrendered! @${winner.split('@')[0]} wins the game!`,
                  mentions: [senderId, winner]
              });
              delete games[room.id];
              return;
          }
          let gameStatus;
          if (winner) {
              gameStatus = `🎉 @${winner.split('@')[0]} wins the game!`;
          }
          else if (isTie) {
              gameStatus = `🤝 Game ended in a draw!`;
          }
          else {
              gameStatus = `🎲 Turn: @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '❎' : '⭕'})`;
          }
          const str = `
  🎮 *TicTacToe Game*
  
  ${gameStatus}
  
  ${arr.slice(0, 3).join('')}
  ${arr.slice(3, 6).join('')}
  ${arr.slice(6).join('')}
  
  ▢ Player ❎: @${room.game.playerX.split('@')[0]}
  ▢ Player ⭕: @${room.game.playerO.split('@')[0]}
  
  ${!winner && !isTie ? '• Type a number (1-9) to make your move\n• Type *surrender* to give up' : ''}
  `;
          const mentions = [
              room.game.playerX,
              room.game.playerO,
              ...(winner ? [winner] : [room.game.currentTurn])
          ];
          await sock.sendMessage(room.x, {
              text: str,
              mentions
          });
          if (room.x !== room.o) {
              await sock.sendMessage(room.o, {
                  text: str,
                  mentions
              });
          }
          if (winner || isTie) {
              delete games[room.id];
          }
      }
      catch (error) {
          console.error('Error in tictactoe move:', error);
      }
  }
  return {

    // ── .tictactoe ─── Play TicTacToe game with another user | usage: .tictactoe [room name]
    "tictactoe": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'tictactoe ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.participant || message.key.remoteJid;
        const text = args.join(' ').trim();
        try {
            if (Object.values(games).find((room) => room.id.startsWith('tictactoe') &&
                [room.game.playerX, room.game.playerO].includes(senderId))) {
                await sock.sendMessage(chatId, {
                    text: '*You are already in a game*\n\nType *surrender* to quit the current game first.'
                }, { quoted: message });
                return;
            }
            let room = Object.values(games).find((room) => room.state === 'WAITING' &&
                (text ? room.name === text : true));
            if (room) {
                room.o = chatId;
                room.game.playerO = senderId;
                room.state = 'PLAYING';
                const arr = room.game.render().map((v) => ({
                    'X': '❎',
                    'O': '⭕',
                    '1': '1️⃣',
                    '2': '2️⃣',
                    '3': '3️⃣',
                    '4': '4️⃣',
                    '5': '5️⃣',
                    '6': '6️⃣',
                    '7': '7️⃣',
                    '8': '8️⃣',
                    '9': '9️⃣',
                }[v] || v));
                const str = `
🎮 *TicTacToe Game Started!*

Waiting for @${room.game.currentTurn.split('@')[0]} to play...

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ *Room ID:* ${room.id}
▢ *Rules:*
• Make 3 rows of symbols vertically, horizontally or diagonally to win
• Type a number (1-9) to place your symbol
• Type *surrender* to give up
`;
                await sock.sendMessage(chatId, {
                    text: str,
                    mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
                }, { quoted: message });
            }
            else {
                room = {
                    id: `tictactoe-${ +new Date}`,
                    x: chatId,
                    o: '',
                    game: new TicTacToe(senderId, 'o'),
                    state: 'WAITING'
                };
                if (text)
                    room.name = text;
                await sock.sendMessage(chatId, {
                    text: `*Waiting for opponent*\n\nType \`.tictactoe ${text || ''}\` to join this game!\n\nPlayer ❎: @${senderId.split('@')[0]}`,
                    mentions: [senderId]
                }, { quoted: message });
                games[room.id] = room;
            }
        }
        catch (error) {
            console.error('Error in tictactoe command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error starting game*\n\nPlease try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:tictactoe] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .tictactoe: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ttt": async (h) => module.exports["tictactoe"](h),
    "xo": async (h) => module.exports["tictactoe"](h),
  };
})());

