# 🩹 REMEDY.md — Command & Feature Audit

This file documents a full audit of every command/feature advertised in `.menu`
and `README.md` against what was actually wired up in code, and the fixes
applied. Kept separate from README's changelog so this specific pass is easy
to find later.

## How the audit was done

1. Statically loaded every file in `/plugins` and diffed the exported command
   names against `PLUGIN_NAMES` in `client_bridge.js` (the list that actually
   gets `require()`'d into the live dispatcher).
2. Diffed every command referenced in `.menu` text (`plugins/general.js`)
   against the real exported command set.
3. Extracted every `@app.route(...)` in `app.py` and every `fetch`/`authedFetch`
   call in the HTML panels, and cross-checked both directions.
4. Traced the actual runtime path from "user sends `.command`" through to
   "message is sent back" for the highest-traffic features (AI chat, games).

## Bugs found & fixed

### 1. `games.js` and `osint.js` were never loaded (critical)
Both files existed, were fully implemented, and were listed in `.menu` — but
`client_bridge.js`'s plugin loader array only had 7 of the 9 plugin files.
Result: `.hangman`, `.trivia`, `.guess`, `.truth`, `.dare`, `.wyr`, `.validate`,
`.ipinfo`, `.whois` all returned "Unknown command" despite being fully coded.
**Fix:** added `'games'` and `'osint'` to the loader list in `client_bridge.js`.

### 2. `/natural-chat` had no route decorator (critical)
The single biggest bug in the codebase. `app.py`'s `natural_chat()` function —
which powers **all AI DM chat and all group AI replies** — was missing its
`@app.route("/natural-chat", methods=["POST"])` decorator. It sat directly
after another function's `return` with no blank-line/decorator gap. Quart
never registered it as an endpoint, so every call 404'd. `client_bridge.js`
swallows that in an empty `catch (e) {}`, so it failed completely silently —
DMs just never got AI replies, with no error anywhere.
**Fix:** added the missing decorator.

### 3. Active-game replies were never wired up
`games.js` exports `_handleGameReply({sock, from, msg, text})` specifically to
resolve plain-text replies during an active `.hangman`/`.trivia`/`.guess`
game (a letter, an answer, a number) — but nothing in `client_bridge.js` ever
called it. Starting a game worked; replying to it just triggered a normal AI
reply instead, so the games were unplayable past the first message.
**Fix:** call `_handleGameReply` on every non-command message (DM and group)
before falling through to AI chat; skip AI chat if it consumed the message.

### 4. `.reload` didn't actually reload anything
`.reload` rebuilt a fresh commands object and copied it onto
`global.allCommandsRef` — but nothing in `client_bridge.js` ever set
`global.allCommandsRef` to point at the real dispatch table (`allCommands`)
used by the message handler. So `.reload` ran, reported success, and changed
nothing live.
**Fix:** `client_bridge.js` now does `global.allCommandsRef = allCommands;`
right after building it, so `.reload`'s in-place mutation actually reaches
the live dispatcher. Also added `games`/`osint` to `.reload`'s own plugin
list (it had the same 7/9 gap as bug #1, independently).

### 5. `.imagine`, `.tts`, `.model` were documented but never implemented
All three appeared in `.menu`, in `README.md`'s command tables, and even in
README's own "Recent fixes" changelog claiming they were added — but none of
the three existed anywhere in `/plugins`. Typing any of them returned
"Unknown command", which is the exact behavior reported.
**Fix:** implemented all three for real, in `plugins/general.js`:
- **`.imagine [prompt]`** — free, keyless image generation via
  `image.pollinations.ai` (a public GET endpoint, no signup/API key).
- **`.tts [text]`** — free text-to-speech via Google Translate's public TTS
  endpoint, chunked into multiple voice notes for text over ~200 characters
  (up to a 600-char cap).
- **`.model [name]`** — per-chat Groq model switcher (`llama` / `llama8` /
  `mixtral` / `gemma`), stored in `global.chatModel` (a `Map` keyed by chat
  JID). `client_bridge.js` now forwards this preference to both `/webhook`
  (`/ask`) and `/natural-chat` (DM/group AI replies), both of which already
  had unused `model` parameters ready to accept it.

### 6. Internal helper functions were reachable as fake commands
`games.js` and `group.js` export internal-only helpers (`_handleGameReply`,
`canUseCommand`) from the same `module.exports` object as their real
commands. Since the dispatcher just checks `allCommands[cmd]` for
truthiness, a user typing `.canUseCommand` or `._handleGameReply` would have
silently invoked them with the wrong argument shape (no crash, just a
message that does nothing — confusing either way).
**Fix:** these keys are explicitly stripped from `allCommands` after loading;
the real code still imports them directly by name where they're actually
needed (`require('./plugins/group').canUseCommand`, etc.) — untouched.

## Commands verified working after this pass

All 74 exported commands across `general`, `group`, `media`, `cypher`,
`atassa`, `scheduler`, `wallet`, `games`, and `osint` now load into the live
dispatcher and match `.menu`'s advertised list. Verified by statically
requiring every plugin file and diffing keys — see the commit for the
one-liner used.

## Known limitations (not bugs, just scope notes)

- `.tts` and `.imagine` depend on free third-party public endpoints
  (Google Translate TTS, Pollinations.ai) with no SLA — if either service is
  down/rate-limiting, the command fails with a message saying so rather than
  silently hanging.
- `.model`/`global.chatModel` resets on process restart, same as `botMode`
  and `subAdmins` — it's runtime state, not persisted to the DB. Documented
  as such in the command's own help text.
- This audit covered command wiring and the highest-traffic AI paths. It did
  not re-audit every security fix already documented in README's existing
  changelog (password hashing, rate limits, XSS fixes, etc.) — those were
  spot-checked, not re-derived from scratch, and no regressions were found
  in the files touched.

---

## Pass 2 — paid pairing merge + `.login` permission audit

### 7. Admin panel session list never detected a session going offline
`SESSION_REGISTRY["online"]` was set `true` on connect and on every incoming
message, but nothing ever set it back to `false` on disconnect — only a
manual "Terminate" click in `/admin` did. A crashed, logged-out, or
mid-reconnect session sat showing as "online"/"active" in the admin panel's
Sessions list indefinitely.
**Fix:** `client_bridge.js`'s `connection.update` "close" handler now posts
`online: false` to `/admin/update-session` immediately on any disconnect,
before deciding whether to fully re-pair (logged out) or just reconnect.

### 8. `.login` didn't unlock 10 group-management commands
`.kick`, `.add`, `.promote`, `.demote`, `.mute`, `.unmute`, `.revoke`,
`.setperm`, `.resetperm`, and `.listperms` all checked *only* whether the
sender was a real WhatsApp group admin (via `groupMetadata`), ignoring
`isOwner`/`isBotAdmin` entirely — so `.login`-granted co-owner access didn't
unlock them in any group where that number wasn't already a WhatsApp admin.
**Fix:** each now accepts `isAdmin || isBotAdmin`, matching how `.tagall`
already worked.

### 9. `pair.html` didn't match the rest of the site's theme
No shared Google Fonts import (fell back to Segoe UI/Courier New) and a
5-stop rainbow `conic-gradient` logo instead of the cyan/purple two-tone used
on `index.html`/`admin.html`/`panel.html`/`register.html`.
**Fix:** added the same font import and `--accent`/--accent2`/`--bg`/`--card`
variables; normalized the logo gradients and stray purple/cyan hex codes to
the shared two-tone palette.

## Not changed — flagged for a decision, not silently fixed

`.addcoowner`, `.removecoowner`, `.listcoowners`, and `.ownerrecovery` still
require the *primary* owner even after a successful `.login`. This is
intentional: it stops a shared/leaked login password from being used to
permanently take over the bot (unlimited co-owners, or changing the owner
number outright). Left as-is pending explicit confirmation this should be
loosened.

### 10. `.reload`'s plugin list was stale (found during Delta/Henry merge)
`plugins/general.js`'s `.reload` command rebuilds the live command table from
a hardcoded plugin-name array — separate from `client_bridge.js`'s own
`PLUGIN_NAMES`. It was already missing `extended` before this merge (7/9 of
the original files), and would have silently excluded all 12 Delta and all
19 Henry plugins going forward, meaning `.reload` would look successful but
actually revert those commands to whatever was in memory at last boot.
**Fix:** replaced with the full, current plugin list matching `PLUGIN_NAMES`.

### 11. Command collisions between Henry's 236 ported commands and existing commands
Henry's own audit (`README_NEW_COMMANDS.md`) checked for collisions against
the base bot's original command set only, before Delta was merged in, and
found none. Re-checking against both base *and* Delta found 13 real
collisions: 8 on primary command names (`maintenance`, `reload`, `schedule`,
`tts`, `gpt`, `define`, `tinyurl`, `catbox`) and 5 on aliases only (`status`,
`announce`, `bio`, `dice`, `groupname`). In every case the existing,
already-wired base/Delta command was kept and only the colliding Henry
command or alias line was removed — verified with a `node -c` syntax check
after every edit and a full collision re-scan showing zero remaining.

### 12. Missing dependency not listed in Henry's own dependency doc
`ported_info.js`'s `.shazam`-style command dynamically requires `acrcloud`
via `createRequire`, which doesn't appear in `README_NEW_COMMANDS.md`'s
`npm install` list. Caught by a full `require()`-load test of every ported
file with stubbed dependencies (not just a syntax check). Added to
`package.json`.
