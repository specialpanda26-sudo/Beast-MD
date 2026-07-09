#!/usr/bin/env node
// ── build-command-db.js ──────────────────────────────────────────────────
// Scans every plugins/*.js file and builds assets/commands-db.json — a flat
// {command, args, description, category, source, quality} list. Used by the
// Command Finder on the website/admin panel AND by .menu to render the full
// command list on WhatsApp.
//
// v2: keyed off the REAL dispatch entries ("cmdname": async (h) => ...),
// not just comment headers — so every live command gets an entry, never
// just the ones someone remembered to document a specific way. Falls
// through several description sources, in order of trust:
//   1. Box header directly above:   // ── .cmd ─── desc | usage: .cmd x
//   2. Plain dot-comment above:     // .cmd [args] — desc  (1-3 lines)
//   3. Alias detection:             "x": async (h) => module.exports.y(h)
//   4. Any plain comment directly above (non-decorative)
//   5. "Usage:"/title text sniffed from inside the handler body
//   6. Humanized command name (last resort, flagged low quality)
//
// Re-run any time plugins are added/edited:  node scripts/build-command-db.js

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const OUT_FILE = path.join(__dirname, '..', 'assets', 'commands-db.json');
const OVERRIDES_FILE = path.join(__dirname, 'command-overrides.json');

const BOX_HEADER_RE = /\/\/\s*──\s*\.([a-zA-Z0-9_]+)([^─\n]*)─+\s*(.*)$/;
const PLAIN_DOT_RE = /^\s*\/\/\s*\.([a-zA-Z0-9_]+)\b(.*)$/;
const USAGE_TAIL_RE = /\|\s*usage:\s*(.+)$/i;
const INLINE_USAGE_RE = /usage:\s*\*?\.?([a-zA-Z0-9_ \[\]<>'"|.,-]{3,80})/i;
const TITLE_TEXT_RE = /text:\s*[`'"]\s*[^a-zA-Z0-9]{0,4}\*?([A-Z][A-Z0-9 _/-]{4,40})\*?/;
const CMD_KEY_RE = /^\s*["']?([a-zA-Z0-9_]+)["']?\s*:\s*async\s*\(/;
const ALIAS_RE = /^\s*["']?([a-zA-Z0-9_]+)["']?\s*:\s*async\s*\([^)]*\)\s*=>\s*module\.exports(?:\[["']([a-zA-Z0-9_]+)["']\]|\.([a-zA-Z0-9_]+))\s*\(/;
const DECORATIVE_RE = /^[=─━╌╍\-—_\s]*$/;

function categoryFromFilename(file) {
  return file
    .replace(/^ported_/, '')
    .replace(/\.js$/, '')
    .replace(/[_-]/g, ' ')
    .trim() || 'general';
}

function humanize(cmd) {
  const words = cmd
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim()
    .split(/\s+/);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function cleanCommentLine(line) {
  return line.replace(/^\s*\/\/\s?/, '').trim();
}

function cleanDescription(text) {
  if (!text) return text;
  return text
    .replace(/['"`]+\s*$/, '') // strip stray trailing quote(s) bled in from a JS string literal
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractFromFile(file) {
  const full = path.join(PLUGINS_DIR, file);
  const lines = fs.readFileSync(full, 'utf-8').split('\n');
  const category = categoryFromFilename(file);
  const commands = [];
  const claimedNames = new Set();

  // ── Tier 1: box header style ──────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(BOX_HEADER_RE);
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
    if (!description) {
      const bodySlice = lines.slice(i + 1, i + 16).join(' ');
      const inlineUsage = bodySlice.match(INLINE_USAGE_RE);
      description = inlineUsage ? inlineUsage[1].trim() : '';
    }
    description = cleanDescription(description);
    commands.push({ command: cmd, usage, description: description || `${humanize(cmd)} command`, category, source: file, quality: description ? 'source' : 'weak' });
    claimedNames.add(cmd);
  }

  // ── Tier 2-6: every real dispatch entry ─────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const keyM = lines[i].match(CMD_KEY_RE);
    if (!keyM) continue;
    if (keyM[1].startsWith('_')) continue; // internal helper, not a real slash command
    const cmd = keyM[1].toLowerCase();
    if (claimedNames.has(cmd)) continue; // already got a tier-1 header
    claimedNames.add(cmd);

    let description = null;
    let usage = `.${cmd}`;
    let quality = 'weak';

    // Alias?
    const aliasM = lines[i].match(ALIAS_RE);
    if (aliasM) {
      const target = (aliasM[2] || aliasM[3] || '').toLowerCase();
      if (target && target !== cmd) {
        description = `Alias for .${target}`;
        quality = 'alias';
      }
    }

    // Tier 2: plain dot-comment(s) directly above
    if (!description) {
      const collected = [];
      let j = i - 1;
      while (j >= 0 && /^\s*\/\//.test(lines[j]) && collected.length < 3) {
        collected.unshift(lines[j]);
        j--;
      }
      const firstDot = collected.find(l => PLAIN_DOT_RE.test(l));
      if (firstDot) {
        const dm = firstDot.match(PLAIN_DOT_RE);
        if (dm[1].toLowerCase() === cmd) {
          const dashSplit = dm[2].split(/—|(?:\s-\s)/);
          if (dashSplit.length > 1) {
            description = dashSplit.slice(1).join(' ').trim();
            usage = `.${cmd} ${dashSplit[0].trim()}`.trim();
          } else if (dm[2].trim()) {
            description = dm[2].trim().replace(/^[-—:]\s*/, '');
          }
          quality = description ? 'source' : quality;
        }
      }
      // No usable dot-comment — fall back to any plain comment block above
      if (!description && collected.length) {
        const text = collected.map(cleanCommentLine).filter(l => l && !DECORATIVE_RE.test(l)).join(' ').trim();
        if (text) {
          description = text.length > 140 ? text.slice(0, 137) + '...' : text;
          quality = 'source';
        }
      }
    }

    // Tier 5: sniff inside the handler body (next ~20 lines) for Usage: or a title-case reply header
    if (!description) {
      const bodySlice = lines.slice(i + 1, i + 21).join(' ');
      const inlineUsage = bodySlice.match(INLINE_USAGE_RE);
      if (inlineUsage) {
        description = inlineUsage[1].trim();
        quality = 'sniffed';
      } else {
        const titleM = bodySlice.match(TITLE_TEXT_RE);
        if (titleM) {
          description = humanize(titleM[1].replace(/\s+/g, ' ').trim().toLowerCase().replace(/\s/g, '_'));
          quality = 'sniffed';
        }
      }
    }

    // Tier 6: humanized command name — last resort
    if (!description) {
      description = `${humanize(cmd)} command`;
      quality = 'weak';
    }

    description = cleanDescription(description);
    commands.push({ command: cmd, usage, description, category, source: file, quality });
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

  // De-dupe by command name, preferring better-quality entries.
  const rank = { source: 0, alias: 1, sniffed: 2, weak: 3 };
  const byName = new Map();
  for (const c of all) {
    const existing = byName.get(c.command);
    if (!existing || rank[c.quality] < rank[existing.quality]) {
      byName.set(c.command, c);
    }
  }
  let deduped = Array.from(byName.values()).sort((a, b) => a.command.localeCompare(b.command));

  // Apply hand-written overrides for commands the scanner couldn't describe well.
  if (fs.existsSync(OVERRIDES_FILE)) {
    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    deduped = deduped.map(c => overrides[c.command]
      ? { ...c, description: overrides[c.command], quality: 'manual' }
      : c);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(deduped, null, 2));

  const counts = { source: 0, alias: 0, sniffed: 0, weak: 0, manual: 0 };
  deduped.forEach(c => counts[c.quality]++);
  console.log(`✅ Wrote ${deduped.length} commands (from ${all.length} raw matches, ${all.length - deduped.length} duplicates dropped) to ${OUT_FILE}`);
  console.log(`   quality: ${counts.source} from source comments, ${counts.alias} aliases, ${counts.sniffed} sniffed from body, ${counts.weak} weak/name-only`);
}

main();
