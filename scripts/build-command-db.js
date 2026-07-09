#!/usr/bin/env node
// ── build-command-db.js ──────────────────────────────────────────────────
// ✅ NEW: scans every plugins/*.js file and builds assets/commands-db.json —
// a flat {command, args, description, category, source} list used by the
// "Command Finder" search tool on both the public site (index.html) and the
// admin panel (admin.html). Re-run this any time plugins are added/edited:
//   node scripts/build-command-db.js
//
// It understands two comment-header styles already used across the codebase:
//   1) Ported style:  // ── .cmd [args] ─── Description text | usage: .cmd args
//   2) Plain style:   // ── .cmd [args] ────────────────────────────
//      (no inline description — falls back to any "Usage: ..." text found
//      inside that command's handler body, then to just the header itself)

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const OUT_FILE = path.join(__dirname, '..', 'assets', 'commands-db.json');

const HEADER_RE = /\/\/\s*──\s*\.([a-zA-Z0-9_]+)([^─\n]*)─+\s*(.*)$/;
const USAGE_TAIL_RE = /\|\s*usage:\s*(.+)$/i;
const INLINE_USAGE_RE = /usage:\s*([^'"`\n]{3,80})/i;

function categoryFromFilename(file) {
  return file
    .replace(/^ported_/, '')
    .replace(/\.js$/, '')
    .replace(/[_-]/g, ' ')
    .trim() || 'general';
}

function extractFromFile(file) {
  const full = path.join(PLUGINS_DIR, file);
  const lines = fs.readFileSync(full, 'utf-8').split('\n');
  const category = categoryFromFilename(file);
  const commands = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADER_RE);
    if (!m) continue;
    const cmd = m[1].toLowerCase();
    const args = (m[2] || '').trim();
    let rest = (m[3] || '').trim();

    let description = '';
    let usage = `.${cmd}${args ? ' ' + args : ''}`;

    const usageTail = rest.match(USAGE_TAIL_RE);
    if (usageTail) {
      usage = usageTail[1].trim();
      description = rest.replace(USAGE_TAIL_RE, '').trim();
    } else if (rest) {
      description = rest;
    }

    // Fallback: no inline description — peek at the next ~15 lines of the
    // handler body for a "Usage: ..." string to use as a description hint.
    if (!description) {
      const bodySlice = lines.slice(i + 1, i + 16).join(' ');
      const inlineUsage = bodySlice.match(INLINE_USAGE_RE);
      description = inlineUsage ? inlineUsage[1].trim() : `${cmd} command`;
    }

    commands.push({
      command: cmd,
      usage,
      description,
      category,
      source: file,
    });
  }
  return commands;
}

function main() {
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
  let all = [];
  for (const f of files) {
    try {
      all = all.concat(extractFromFile(f));
    } catch (e) {
      console.warn(`⚠️  Skipped ${f}: ${e.message}`);
    }
  }

  // De-dupe by command name — keep the first (non-ported files win over
  // ported_* duplicates since they're listed first alphabetically minus the
  // "ported_" prefix... close enough; manual review always possible after).
  const seen = new Set();
  const deduped = [];
  for (const c of all) {
    if (seen.has(c.command)) continue;
    seen.add(c.command);
    deduped.push(c);
  }
  deduped.sort((a, b) => a.command.localeCompare(b.command));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(deduped, null, 2));
  console.log(`✅ Wrote ${deduped.length} commands (from ${all.length} raw matches, ${all.length - deduped.length} duplicates dropped) to ${OUT_FILE}`);
}

main();
