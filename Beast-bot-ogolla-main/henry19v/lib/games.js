'use strict';

// ── Active game sessions ───────────────────────────────────────────────────────
const activeSessions = new Map(); // chatId → session

// ── Trivia ────────────────────────────────────────────────────────────────────
const TRIVIA_BANK = [
  { q: 'What is the capital of Kenya?',         a: 'nairobi' },
  { q: 'How many continents are there?',         a: '7' },
  { q: 'What is 7 × 8?',                        a: '56' },
  { q: 'What planet is closest to the sun?',    a: 'mercury' },
  { q: 'What is the largest ocean on Earth?',   a: 'pacific' },
  { q: 'Who invented the telephone?',           a: 'alexander graham bell' },
  { q: 'What is the chemical symbol for water?',a: 'h2o' },
  { q: 'How many sides does a hexagon have?',   a: '6' },
  { q: 'What is the fastest land animal?',      a: 'cheetah' },
  { q: 'In what year did World War II end?',    a: '1945' },
  { q: 'What language has the most native speakers?', a: 'mandarin' },
  { q: 'How many bones in the adult human body?', a: '206' },
  { q: 'What is the longest river in the world?', a: 'nile' },
  { q: 'What is the square root of 144?',       a: '12' },
  { q: 'Which country invented football (soccer)?', a: 'england' },
];

function startTrivia(chatId) {
  const q = TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)];
  activeSessions.set(`trivia:${chatId}`, { answer: q.a, created: Date.now() });
  return q.q;
}

function checkTrivia(chatId, guess) {
  const key = `trivia:${chatId}`;
  const session = activeSessions.get(key);
  if (!session) return null;
  const correct = guess.toLowerCase().trim() === session.answer;
  if (correct || Date.now() - session.created > 60000) activeSessions.delete(key);
  return { correct, answer: session.answer };
}

// ── TicTacToe ─────────────────────────────────────────────────────────────────
function renderBoard(board) {
  const sym = v => v === 1 ? '❌' : v === 2 ? '⭕' : '⬜';
  return `
${sym(board[0])}${sym(board[1])}${sym(board[2])}
${sym(board[3])}${sym(board[4])}${sym(board[5])}
${sym(board[6])}${sym(board[7])}${sym(board[8])}`.trim();
}

function checkWin(board, p) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.some(combo => combo.every(i => board[i] === p));
}

function startTTT(chatId, p1, p2) {
  const session = { board: Array(9).fill(0), p1, p2, turn: 1, created: Date.now() };
  activeSessions.set(`ttt:${chatId}`, session);
  return session;
}

function playTTT(chatId, playerJid, cell) {
  const key = `ttt:${chatId}`;
  const s = activeSessions.get(key);
  if (!s) return { error: 'No active game. Start with !tictactoe @player' };

  const playerNum = playerJid === s.p1 ? 1 : playerJid === s.p2 ? 2 : 0;
  if (!playerNum)    return { error: "You're not in this game." };
  if (playerNum !== s.turn) return { error: "It's not your turn!" };

  const idx = parseInt(cell) - 1;
  if (isNaN(idx) || idx < 0 || idx > 8) return { error: 'Choose a cell 1-9.' };
  if (s.board[idx] !== 0) return { error: 'That cell is taken!' };

  s.board[idx] = playerNum;
  const board = renderBoard(s.board);

  if (checkWin(s.board, playerNum)) {
    activeSessions.delete(key);
    return { board, winner: playerNum === 1 ? s.p1 : s.p2 };
  }
  if (s.board.every(v => v !== 0)) {
    activeSessions.delete(key);
    return { board, draw: true };
  }
  s.turn = playerNum === 1 ? 2 : 1;
  return { board, next: s.turn === 1 ? s.p1 : s.p2 };
}

// ── Dice ──────────────────────────────────────────────────────────────────────
function rollDice(notation = '1d6') {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;
  const [, count, sides, mod] = match;
  const n = Math.min(parseInt(count), 20);
  const s = Math.min(parseInt(sides), 100);
  const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * s) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + (parseInt(mod) || 0);
  return { rolls, total, notation };
}

// ── Rock Paper Scissors ───────────────────────────────────────────────────────
function playRPS(userChoice) {
  const choices = ['rock', 'paper', 'scissors'];
  const bot = choices[Math.floor(Math.random() * 3)];
  const u = userChoice.toLowerCase();
  if (!choices.includes(u)) return null;
  const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  const result = beats[u] === bot ? 'win' : beats[bot] === u ? 'lose' : 'draw';
  return { user: u, bot, result };
}

// ── Number Guess ──────────────────────────────────────────────────────────────
function startGuess(chatId, max = 100) {
  const num = Math.floor(Math.random() * max) + 1;
  activeSessions.set(`guess:${chatId}`, { num, max, tries: 0, created: Date.now() });
  return max;
}

function checkGuess(chatId, guess) {
  const key = `guess:${chatId}`;
  const s = activeSessions.get(key);
  if (!s) return null;
  const n = parseInt(guess);
  s.tries++;
  if (n === s.num) { activeSessions.delete(key); return { correct: true, num: s.num, tries: s.tries }; }
  const hint = n < s.num ? 'higher 📈' : 'lower 📉';
  return { correct: false, hint, tries: s.tries };
}

module.exports = {
  startTrivia, checkTrivia,
  startTTT, playTTT, renderBoard,
  rollDice,
  playRPS,
  startGuess, checkGuess,
};
