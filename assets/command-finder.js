// ── command-finder.js ────────────────────────────────────────────────────
// ✅ NEW: powers the "Command Finder" search box on both index.html (public
// site) and admin.html (admin panel). Type what you want in plain words —
// e.g. "save a view once" — and it returns the matching bot command(s).
//
// This is a lightweight client-side keyword/overlap search over
// /assets/commands-db.json (built by scripts/build-command-db.js). It does
// NOT call any AI API — no key needed, works offline once the JSON loads,
// and is instant. If you later want true natural-language matching, this is
// the one place to swap in a call to the bot's existing AI endpoint.

(function () {
  let COMMANDS_DB = null;

  async function loadCommandsDb() {
    if (COMMANDS_DB) return COMMANDS_DB;
    const res = await fetch('/assets/commands-db.json');
    if (!res.ok) throw new Error('Could not load command list');
    COMMANDS_DB = await res.json();
    return COMMANDS_DB;
  }

  // Very small stopword list so common filler words don't dominate scoring.
  const STOPWORDS = new Set([
    'a', 'an', 'the', 'to', 'for', 'of', 'my', 'me', 'i', 'want', 'is',
    'how', 'do', 'does', 'can', 'you', 'please', 'it', 'this', 'that',
    'and', 'or', 'in', 'on', 'with', 'be', 'am', 'im', "i'm"
  ]);

  function tokenize(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));
  }

  function scoreCommand(queryTokens, cmd) {
    const haystack = tokenize(`${cmd.command} ${cmd.description} ${cmd.category}`);
    let score = 0;
    for (const qt of queryTokens) {
      if (cmd.command === qt) score += 8; // exact command name match wins big
      if (haystack.includes(qt)) score += 2;
      else if (haystack.some(h => h.startsWith(qt) || qt.startsWith(h))) score += 1;
    }
    return score;
  }

  async function findCommands(query, limit = 5) {
    const db = await loadCommandsDb();
    const queryTokens = tokenize(query);
    if (!queryTokens.length) return [];
    const scored = db
      .map(cmd => ({ cmd, score: scoreCommand(queryTokens, cmd) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.cmd);
    return scored;
  }

  // Renders results into a container element given an array of command objects.
  function renderResults(container, results, prefix) {
    prefix = prefix || '.';
    if (!results.length) {
      container.innerHTML = `<div class="widget-out err" style="display:block">No matching command found — try different words, or send <b>${prefix}commands [keyword]</b> on WhatsApp to search the full list.</div>`;
      return;
    }
    container.innerHTML = results.map(cmd => `
      <div class="widget-out" style="display:block;margin-bottom:0.5rem;">
        <div class="cmd-tag" style="cursor:pointer" onclick="navigator.clipboard && navigator.clipboard.writeText('${prefix}${cmd.usage.replace(/^\./, '').replace(/'/g, "\\'")}')">
          ${prefix}${cmd.usage.replace(/^\./, '')}
        </div>
        <div>${cmd.description}</div>
      </div>
    `).join('');
  }

  window.CommandFinder = { findCommands, renderResults, loadCommandsDb };
})();
