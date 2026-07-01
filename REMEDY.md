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
