// ── Games Expansion (ported/rebuilt from atassa) ────────────────────────────
// Adds: .dice (roll, betting-free), .tictactoe (.tttjoin/.tttboard/.tttend),
// .wordchain (.wcgbegin/.wcgjoin/.wcgend/.wcgscores), .gamehistory, .games.
// Follows the exact per-chat in-memory Map pattern your games.js already
// uses for hangman/trivia, so it plugs into the same style/lifecycle.

if (!global.ticTacToeGames) global.ticTacToeGames = new Map();
if (!global.wordChainGames) global.wordChainGames = new Map();
if (!global.gameHistory) global.gameHistory = [];

function recordHistory(chat, game, winner) {
  global.gameHistory.push({ chat, game, winner, at: Date.now() });
  if (global.gameHistory.length > 200) global.gameHistory.shift();
}

// ── Tic-Tac-Toe helpers ──────────────────────────────────────────────────
function renderBoard(board) {
  const cell = (v, i) => v || `${i + 1}️⃣`;
  return [0, 3, 6].map(r => [0, 1, 2].map(c => cell(board[r + c], r + c)).join(' | ')).join('\n---------\n');
}
function checkWin(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? 'draw' : null;
}

// ── Word chain: each word must start with the last letter of the previous one
const WORDCHAIN_SEED = ['apple', 'elephant', 'tiger', 'rabbit', 'turtle', 'eagle'];

module.exports = {

  dice: async ({ sock, from, msg }) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    await sock.sendMessage(from, { text: `🎲 You rolled: ${faces[roll - 1]} (${roll})` }, { quoted: msg });
  },

  games: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, {
      text: `🎮 *Available Games*\n\n` +
        `.hangman / .trivia / .guess / .truth / .dare / .wyr — (existing)\n` +
        `.dice — quick dice roll\n` +
        `.tttjoin — start/join tic-tac-toe (reply a number 1-9 to play)\n` +
        `.tttboard — show current board\n` +
        `.tttend — end the current game\n` +
        `.wcgbegin — start word-chain\n` +
        `.wcgjoin — join word-chain\n` +
        `.wcgend — end word-chain\n` +
        `.wcgscores — show word-chain scores\n` +
        `.gamehistory — recent game results in this chat`
    }, { quoted: msg });
  },

  gamehistory: async ({ sock, from, msg }) => {
    const recent = global.gameHistory.filter(g => g.chat === from).slice(-10).reverse();
    if (!recent.length) return sock.sendMessage(from, { text: '📭 No games finished here yet.' }, { quoted: msg });
    const text = recent.map(g => `• ${g.game} — winner: ${g.winner} (${new Date(g.at).toLocaleTimeString()})`).join('\n');
    await sock.sendMessage(from, { text: `📜 *Recent games*\n\n${text}` }, { quoted: msg });
  },

  // ── Tic-Tac-Toe ──────────────────────────────────────────────────────────
  tttjoin: async ({ sock, from, msg, senderJid }) => {
    let game = global.ticTacToeGames.get(from);
    if (!game) {
      game = { players: [senderJid], board: Array(9).fill(null), turn: 0, started: false };
      global.ticTacToeGames.set(from, game);
      return sock.sendMessage(from, { text: `⭕ @${senderJid.split('@')[0]} started Tic-Tac-Toe! Send .tttjoin to be player 2.`, mentions: [senderJid] }, { quoted: msg });
    }
    if (game.players.includes(senderJid)) return sock.sendMessage(from, { text: '⚠️ You already joined this game.' }, { quoted: msg });
    if (game.players.length >= 2) return sock.sendMessage(from, { text: '⚠️ Game already has 2 players.' }, { quoted: msg });
    game.players.push(senderJid);
    game.started = true;
    await sock.sendMessage(from, {
      text: `❌⭕ *Tic-Tac-Toe started!*\n\n${renderBoard(game.board)}\n\n@${game.players[0].split('@')[0]} is ❌, @${game.players[1].split('@')[0]} is ⭕\nReply with a number 1-9 to play. @${game.players[0].split('@')[0]} goes first.`,
      mentions: game.players
    }, { quoted: msg });
  },

  tttboard: async ({ sock, from, msg }) => {
    const game = global.ticTacToeGames.get(from);
    if (!game) return sock.sendMessage(from, { text: '📭 No active game. Start one with .tttjoin' }, { quoted: msg });
    await sock.sendMessage(from, { text: renderBoard(game.board) }, { quoted: msg });
  },

  tttend: async ({ sock, from, msg, isBotAdmin }) => {
    const game = global.ticTacToeGames.get(from);
    if (!game) return sock.sendMessage(from, { text: '📭 No active game.' }, { quoted: msg });
    global.ticTacToeGames.delete(from);
    await sock.sendMessage(from, { text: '🛑 Tic-Tac-Toe ended.' }, { quoted: msg });
  },

  // internal: called from message handler for plain-number replies during
  // an active ttt game, same wiring pattern as games.js's _handleGameReply.
  _handleTTTReply: async ({ sock, from, msg, body, senderJid }) => {
    const game = global.ticTacToeGames.get(from);
    if (!game || !game.started) return false;
    if (!game.players.includes(senderJid)) return false;
    const myIdx = game.players.indexOf(senderJid);
    if (myIdx !== game.turn) return false;
    const pos = parseInt(body.trim(), 10) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8 || game.board[pos]) return false;
    game.board[pos] = myIdx === 0 ? '❌' : '⭕';
    const result = checkWin(game.board);
    if (result) {
      const winnerText = result === 'draw' ? "🤝 It's a draw!" : `🎉 @${game.players[myIdx].split('@')[0]} wins!`;
      await sock.sendMessage(from, { text: `${renderBoard(game.board)}\n\n${winnerText}`, mentions: game.players }, { quoted: msg });
      recordHistory(from, 'tictactoe', result === 'draw' ? 'draw' : game.players[myIdx]);
      global.ticTacToeGames.delete(from);
      return true;
    }
    game.turn = 1 - game.turn;
    await sock.sendMessage(from, {
      text: `${renderBoard(game.board)}\n\n@${game.players[game.turn].split('@')[0]}'s turn (${game.turn === 0 ? '❌' : '⭕'})`,
      mentions: game.players
    }, { quoted: msg });
    return true;
  },

  // ── Word Chain ───────────────────────────────────────────────────────────
  wcgbegin: async ({ sock, from, msg, senderJid }) => {
    if (global.wordChainGames.has(from)) return sock.sendMessage(from, { text: '⚠️ A word-chain game is already running here.' }, { quoted: msg });
    const start = WORDCHAIN_SEED[Math.floor(Math.random() * WORDCHAIN_SEED.length)];
    global.wordChainGames.set(from, { players: new Set([senderJid]), used: new Set([start]), lastWord: start, scores: {}, turnOrder: [senderJid], turn: 0 });
    await sock.sendMessage(from, { text: `🔤 *Word Chain started!*\n\nFirst word: *${start}*\nNext word must start with *${start.slice(-1).toUpperCase()}*.\nSend .wcgjoin to play. Reply with a word to take your turn.` }, { quoted: msg });
  },

  wcgjoin: async ({ sock, from, msg, senderJid }) => {
    const game = global.wordChainGames.get(from);
    if (!game) return sock.sendMessage(from, { text: '📭 No word-chain game running. Start one with .wcgbegin' }, { quoted: msg });
    if (game.players.has(senderJid)) return sock.sendMessage(from, { text: '⚠️ You already joined.' }, { quoted: msg });
    game.players.add(senderJid);
    game.turnOrder.push(senderJid);
    game.scores[senderJid] = game.scores[senderJid] || 0;
    await sock.sendMessage(from, { text: `✅ @${senderJid.split('@')[0]} joined word-chain! (${game.players.size} players)`, mentions: [senderJid] }, { quoted: msg });
  },

  wcgscores: async ({ sock, from, msg }) => {
    const game = global.wordChainGames.get(from);
    if (!game || !Object.keys(game.scores).length) return sock.sendMessage(from, { text: '📭 No scores yet.' }, { quoted: msg });
    const ranked = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    const text = ranked.map(([jid, score], i) => `${i + 1}. @${jid.split('@')[0]} — ${score}`).join('\n');
    await sock.sendMessage(from, { text: `🏆 *Word Chain Scores*\n\n${text}`, mentions: ranked.map(r => r[0]) }, { quoted: msg });
  },

  wcgend: async ({ sock, from, msg }) => {
    if (!global.wordChainGames.has(from)) return sock.sendMessage(from, { text: '📭 No active game.' }, { quoted: msg });
    global.wordChainGames.delete(from);
    await sock.sendMessage(from, { text: '🛑 Word-chain ended.' }, { quoted: msg });
  },

  // internal: plain-text reply handler for word-chain turns
  _handleWCGReply: async ({ sock, from, msg, body, senderJid }) => {
    const game = global.wordChainGames.get(from);
    if (!game || !game.players.has(senderJid)) return false;
    const word = (body || '').trim().toLowerCase();
    if (!/^[a-z]+$/.test(word)) return false;
    const requiredStart = game.lastWord.slice(-1);
    if (word[0] !== requiredStart) return false; // not a valid move, let it fall through
    if (game.used.has(word)) {
      await sock.sendMessage(from, { text: `⚠️ *${word}* was already used.` }, { quoted: msg });
      return true;
    }
    game.used.add(word);
    game.lastWord = word;
    game.scores[senderJid] = (game.scores[senderJid] || 0) + 1;
    await sock.sendMessage(from, { text: `✅ *${word}* accepted! Next word starts with *${word.slice(-1).toUpperCase()}*.` }, { quoted: msg });
    return true;
  },
};
