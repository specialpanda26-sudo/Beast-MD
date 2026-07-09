// ── menuCatalog.js ───────────────────────────────────────────────────────
// Builds the FULL command catalog (all ~874 live commands, described) for
// `.menu` to send as a series of readable follow-up messages, grouped by
// category with aliases collapsed under their base command. Reads
// assets/commands-db.json, which scripts/build-command-db.js regenerates
// from the actual plugin source — so this list never goes stale as long as
// that script is re-run after adding/removing commands
// (`node scripts/build-command-db.js`).

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'assets', 'commands-db.json');

// Categories that should only ever be shown to the relevant permission tier.
// Everything not listed here is shown to everyone.
const OWNER_ONLY_CATEGORIES = new Set(['owner', 'sudo', 'megabackup']);
const BOT_ADMIN_CATEGORIES = new Set(['admin', 'groupguard']);

// Friendlier display names for a few category keys derived from filenames.
const CATEGORY_LABELS = {
  ai: 'AI & Chat',
  aichat2: 'AI & Chat (extra models)',
  urltools: 'URL / Encode-Decode Tools',
  'settings ext': 'Settings',
  games2: 'Games (extra)',
  osint: 'Lookup / OSINT-lite',
  groupguard: 'Group Guard',
  megabackup: 'Session Backup (Mega.nz)',
};

function label(cat) {
  return CATEGORY_LABELS[cat] || cat.replace(/\b\w/g, c => c.toUpperCase());
}

function loadCatalog() {
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    return [];
  }
}

// Groups aliases under their base command: {baseCmd: {entry, aliases: [name,...]}}
function groupAliases(commands) {
  const byName = new Map(commands.map(c => [c.command, c]));
  const aliasesOf = new Map(); // base -> [alias names]
  const standalone = [];

  for (const c of commands) {
    if (c.quality === 'alias') {
      const target = c.description.replace(/^Alias for \./, '');
      if (byName.has(target)) {
        if (!aliasesOf.has(target)) aliasesOf.set(target, []);
        aliasesOf.get(target).push(c.command);
        continue;
      }
    }
    standalone.push(c);
  }

  return standalone.map(c => ({
    ...c,
    aliases: aliasesOf.get(c.command) || [],
  }));
}

// Splits an array of pre-rendered category blocks into WhatsApp-friendly
// chunks (~3500 chars each) without splitting a category block apart when
// avoidable.
function chunkBlocks(blocks, maxLen = 3500) {
  const chunks = [];
  let current = '';
  for (const block of blocks) {
    if (current && (current.length + block.length) > maxLen) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n\n' : '') + block;
    // A single oversized category block still gets flushed on its own.
    if (current.length > maxLen) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Returns an array of message strings covering every live command,
 * filtered to what `perms` allows to see.
 * @param {{isOwner: boolean, isBotAdmin: boolean}} perms
 * @param {string} prefix - command prefix, e.g. "."
 */
function buildFullCatalogMessages(perms, prefix = '.') {
  const all = loadCatalog();
  if (!all.length) return [];

  const visible = all.filter(c => {
    if (OWNER_ONLY_CATEGORIES.has(c.category)) return perms.isOwner;
    if (BOT_ADMIN_CATEGORIES.has(c.category)) return perms.isBotAdmin || perms.isOwner;
    return true;
  });

  const grouped = groupAliases(visible);
  const byCategory = new Map();
  for (const c of grouped) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category).push(c);
  }

  const categories = Array.from(byCategory.keys()).sort((a, b) => label(a).localeCompare(label(b)));
  const blocks = [];
  let totalShown = 0;

  for (const cat of categories) {
    const cmds = byCategory.get(cat).sort((a, b) => a.command.localeCompare(b.command));
    totalShown += cmds.length;
    const lines = cmds.map(c => {
      const aliasNote = c.aliases.length ? ` _(aka: ${c.aliases.map(a => prefix + a).join(', ')})_` : '';
      return `▫️ ${prefix}${c.command} — ${c.description}${aliasNote}`;
    });
    blocks.push(`*── ${label(cat).toUpperCase()} ──*\n${lines.join('\n')}`);
  }

  const chunks = chunkBlocks(blocks);
  const total = chunks.length;
  return chunks.map((chunk, i) =>
    `📚 *FULL COMMAND CATALOG* (${i + 1}/${total})\n_${totalShown} commands, every one described — this is the complete list behind ${prefix}menu._\n\n${chunk}`
  );
}

module.exports = { buildFullCatalogMessages, loadCatalog };
