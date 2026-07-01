// ── Phase 7: Games ────────────────────────────────────────────────────────
// .hangman, .trivia, .guess, .truth, .dare, .wyr (would you rather)
// State is kept in-memory per chat (Map keyed by `from`), so games are
// per-chat and reset on process restart — same durability model the rest
// of the runtime state (botMode, subAdmins, etc.) already uses.

const HANGMAN_WORDS = [
  'javascript', 'python', 'baileys', 'whatsapp', 'render', 'railway',
  'termux', 'developer', 'keyboard', 'database', 'firewall', 'algorithm',
  'function', 'variable', 'internet', 'computer', 'network', 'software'
];

const HANGMAN_STAGES = [
  '```\n  +---+\n      |\n      |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n      |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n  |   |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n /|   |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n /|\\  |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n /|\\  |\n /    |\n     ===```',
  '```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n     ===```'
];

const TRIVIA_QUESTIONS = [
  { q: 'What does "HTTP" stand for?', a: 'hypertext transfer protocol' },
  { q: 'What year was WhatsApp founded?', a: '2009' },
  { q: 'What planet is known as the Red Planet?', a: 'mars' },
  { q: 'What is the capital of Kenya?', a: 'nairobi' },
  { q: 'How many continents are there?', a: '7' },
  { q: 'What does "CPU" stand for?', a: 'central processing unit' },
  { q: 'What is the largest ocean on Earth?', a: 'pacific' },
  { q: 'What language is Node.js built on?', a: 'javascript' },
  { q: 'What does "RAM" stand for?', a: 'random access memory' },
  { q: 'What is the fastest land animal?', a: 'cheetah' },
];

const TRUTHS = [
  "What's the most embarrassing thing you've done in public?",
  "What's a secret you've never told anyone in this chat?",
  "What's the last lie you told?",
  "Who's your secret crush, or who was?",
  "What's the weirdest dream you've ever had?",
  "What's your biggest fear?",
  "What's the pettiest thing you've ever done?",
  "What app do you spend the most time on?",
];

const DARES = [
  "Send the last photo in your gallery (or describe it if it's private).",
  "Text your crush 'hi' right now and report back.",
  "Type your next 3 messages using only emojis.",
  "Do 10 push-ups and send proof.",
  "Let the group pick your WhatsApp status for the next hour.",
  "Send a voice note singing your favorite song's chorus.",
  "Change your name to whatever the group votes for 10 minutes.",
];

const WYR = [
  "Would you rather have unlimited data forever or unlimited money for one day?",
  "Would you rather be able to fly or be invisible?",
  "Would you rather lose your phone or lose your wallet?",
  "Would you rather always be 10 minutes late or 20 minutes early?",
  "Would you rather give up WhatsApp or give up TikTok?",
  "Would you rather live without music or without movies?",
  "Would you rather have super speed or super strength?",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

global.gameState = global.gameState || new Map(); // from -> { type, ...data }

function renderHangman(state) {
  const masked = state.word
    .split('')
    .map(c => (state.guessed.includes(c) ? c : '_'))
    .join(' ');
  return `${HANGMAN_STAGES[state.wrong]}\n\n🔤 *Word:* ${masked}\n❌ *Wrong guesses:* ${state.wrongLetters.join(', ') || 'none'} (${state.wrong}/6)\n\nSend a single letter to guess, or *.hangman stop* to end.`;
}

module.exports = {

  // ── .hangman ───────────────────────────────────────────────────────────
  hangman: async ({ sock, from, msg, args }) => {
    const existing = global.gameState.get(from);

    if ((args[0] || '').toLowerCase() === 'stop') {
      global.gameState.delete(from);
      return sock.sendMessage(from, { text: '🛑 Hangman stopped.' }, { quoted: msg });
    }

    if (existing && existing.type === 'hangman') {
      return sock.sendMessage(from, { text: `A hangman game is already running here!\n\n${renderHangman(existing)}` }, { quoted: msg });
    }

    const word = pick(HANGMAN_WORDS);
    const state = { type: 'hangman', word, guessed: [], wrong: 0, wrongLetters: [] };
    global.gameState.set(from, state);
    return sock.sendMessage(from, { text: `🎮 *Hangman started!*\n\n${renderHangman(state)}` }, { quoted: msg });
  },

  // ── .trivia ────────────────────────────────────────────────────────────
  trivia: async ({ sock, from, msg }) => {
    const q = pick(TRIVIA_QUESTIONS);
    global.gameState.set(from, { type: 'trivia', answer: q.a });
    return sock.sendMessage(from, { text: `🧠 *Trivia*\n\n${q.q}\n\n_Reply with your answer._` }, { quoted: msg });
  },

  // ── .guess [max] ───────────────────────────────────────────────────────
  guess: async ({ sock, from, msg, args }) => {
    const max = Math.min(Math.max(parseInt(args[0], 10) || 100, 10), 1000);
    const number = Math.floor(Math.random() * max) + 1;
    global.gameState.set(from, { type: 'guess', number, max, tries: 0 });
    return sock.sendMessage(from, {
      text: `🔢 *Number Guessing Game*\n\nI'm thinking of a number between 1 and ${max}. Reply with your guess!`
    }, { quoted: msg });
  },

  // ── .truth ─────────────────────────────────────────────────────────────
  truth: async ({ sock, from, msg }) => {
    return sock.sendMessage(from, { text: `😳 *Truth:*\n\n${pick(TRUTHS)}` }, { quoted: msg });
  },

  // ── .dare ──────────────────────────────────────────────────────────────
  dare: async ({ sock, from, msg }) => {
    return sock.sendMessage(from, { text: `🔥 *Dare:*\n\n${pick(DARES)}` }, { quoted: msg });
  },

  // ── .wyr (would you rather) ───────────────────────────────────────────
  wyr: async ({ sock, from, msg }) => {
    return sock.sendMessage(from, { text: `🤔 *Would you rather...*\n\n${pick(WYR)}` }, { quoted: msg });
  },

  // ── Internal: called from client_bridge.js on every non-command message
  // to check if there's an active game waiting on a plain-text reply.
  // Returns true if it consumed the message.
  _handleGameReply: async ({ sock, from, msg, text }) => {
    const state = global.gameState.get(from);
    if (!state) return false;
    const clean = (text || '').trim().toLowerCase();
    if (!clean) return false;

    if (state.type === 'hangman') {
      if (clean.length !== 1 || !/[a-z]/.test(clean)) return false; // not a letter guess, ignore
      if (state.guessed.includes(clean) || state.wrongLetters.includes(clean)) {
        await sock.sendMessage(from, { text: `You already tried *${clean}*.` }, { quoted: msg });
        return true;
      }
      if (state.word.includes(clean)) {
        state.guessed.push(clean);
        const won = state.word.split('').every(c => state.guessed.includes(c));
        if (won) {
          global.gameState.delete(from);
          await sock.sendMessage(from, { text: `🎉 You won! The word was *${state.word}*.` }, { quoted: msg });
          return true;
        }
      } else {
        state.wrong++;
        state.wrongLetters.push(clean);
        if (state.wrong >= 6) {
          global.gameState.delete(from);
          await sock.sendMessage(from, { text: `💀 You lost! The word was *${state.word}*.` }, { quoted: msg });
          return true;
        }
      }
      await sock.sendMessage(from, { text: renderHangman(state) }, { quoted: msg });
      return true;
    }

    if (state.type === 'trivia') {
      if (clean === state.answer.toLowerCase()) {
        global.gameState.delete(from);
        await sock.sendMessage(from, { text: '✅ Correct! 🎉' }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: '❌ Nope, try again! (*.trivia* for a new question)' }, { quoted: msg });
      }
      return true;
    }

    if (state.type === 'guess') {
      const n = parseInt(clean, 10);
      if (isNaN(n)) return false;
      state.tries++;
      if (n === state.number) {
        global.gameState.delete(from);
        await sock.sendMessage(from, { text: `🎯 Correct! It was *${state.number}*. You got it in ${state.tries} tries.` }, { quoted: msg });
      } else if (state.tries >= 15) {
        global.gameState.delete(from);
        await sock.sendMessage(from, { text: `😅 Out of tries! The number was *${state.number}*.` }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: n < state.number ? '📈 Higher!' : '📉 Lower!' }, { quoted: msg });
      }
      return true;
    }

    return false;
  },
};
