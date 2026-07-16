// ── menuStyle.js ─────────────────────────────────────────────────────────
// Single shared source for how every menu surface renders: the small-caps
// section headers, the ┏▣/┗▣ boxes, the │➽ bullets, and the category→emoji
// map. Both the hand-curated quick `.menu` view (plugins/general.js) and
// the auto-generated full catalog (lib_ported/menuCatalog.js) import this
// instead of each keeping their own copy of the styling.
//
// Before this file existed, general.js defined smallCaps()/menuBox() as
// private, unexported local functions — menuCatalog.js had no way to reach
// them even if someone had thought to try, so the full catalog was written
// as plain text instead. That's the actual reason the two menus drifted
// visually apart, not an oversight in either file individually. Moving the
// styling here means there's now exactly one place that decides what a
// menu section looks like — change it once, both surfaces update together.
//
// The two menus still show DIFFERENT content on purpose: the quick view is
// a deliberately curated, hand-written subset with its own custom wording
// (confirmed intentional in Update 18's audit), while the full catalog is
// exhaustively auto-generated from assets/commands-db.json. Merging the
// CONTENT into one would either blow past WhatsApp's single-message
// character ceiling or force the curated view to lose its hand-picked
// framing — this file only unifies how they're drawn, not what they list.

const SMALL_CAPS_MAP = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ',
  i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
  q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
  y: 'ʏ', z: 'ᴢ'
};

function smallCaps(str) {
  return String(str).split('').map(ch => SMALL_CAPS_MAP[ch.toLowerCase()] || ch).join('');
}

function menuBox(emoji, label, trail = '') {
  return `┏▣ ◈ ${emoji} *${smallCaps(label)}*${trail ? ' ' + trail : ''} ◈`;
}

const boxClose = '┗▣';

// Category emoji for the auto-generated full catalog, keyed by the raw
// category slug from assets/commands-db.json (see
// scripts/build-command-db.js's categoryFromFilename()) — NOT the
// human-readable label, since a few labels (e.g. "Lookup / OSINT-lite")
// are remapped from their raw key elsewhere. Falls back to a plain folder
// icon for any category not listed here, so a newly-added plugin file
// never renders with a missing/blank icon.
const CATEGORY_EMOJI = {
  admin: '🛡️', ai: '🧠', aichat2: '🧠', atassa: '🧩', cypher: '🧩',
  download: '📥', extended: '📈', fun: '😂', games: '🎮', games2: '🎮',
  general: '⚙️', group: '🛡️', groupguard: '🛡️', images: '🖼️', info: 'ℹ️',
  media: '📸', megabackup: '💾', menu: '📚', music: '🎵', notes: '📝',
  osint: '🔎', owner: '👑', quotes: '💬', scheduler: '⏰', search: '🔍',
  setcookies: '🍪', 'settings ext': '🛠️', sports: '⚽', stalk: '🕵️',
  stickers: '🎨', sudo: '👑', tempmail: '📧', tools: '🧰', upload: '☁️',
  urltools: '🔗', utility: '🧮',
};

function categoryEmoji(cat) {
  return CATEGORY_EMOJI[cat] || '📁';
}

module.exports = { smallCaps, menuBox, boxClose, categoryEmoji, CATEGORY_EMOJI };
