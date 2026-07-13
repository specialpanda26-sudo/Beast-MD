# Changes

> 📜 Looking for older history? See [CHANGES-ARCHIVE.md](./CHANGES-ARCHIVE.md) (Updates 3–14).

## Update 23 — Full rebrand: "Halloween MD" 🎃

**What changed:** every visible mention of the old bot name (`Henry Ochibots v19`, `Beast Bot`, and all casing variants) has been renamed to **Halloween MD** across the entire codebase — page titles, `<title>` tags, console/log banners, sticker pack name, `.env.example`/`render.yaml` defaults, `package.json`, the AI chatbot's own self-description, group name-detection aliases (`BOT_NAME_ALIASES`), and all Markdown docs. Henry's own creator credit (`created by Henry`, `@henrytech254`) was deliberately left untouched everywhere — this was a name change for the bot's identity, not its owner's.

**Bug fixed along the way:** `app.py`'s AI chat persona had a line reading *"Your creator is Henry Ochibots (@henrytech254)"* — a leftover naming collision where the bot referred to itself as its own creator. Corrected to *"Your creator is Henry (@henrytech254)"* so the bot credits the right person.

**Visual theme — all 7 web panels** (`index.html`, `admin.html`, `panel.html`, `pair.html`, `console.html`, `register.html`, `chat.html`):
- Every panel's `:root` CSS variables were swapped from the old blue/teal/cyan palette to a Halloween palette — pumpkin orange (`--accent`), witch purple (`--accent2`), toxic green (kept for live/success states), blood red, near-black backgrounds, parchment-white text. No structural CSS changed — just the variable values, so the palette applies everywhere those variables are already used.
- Added the **Creepster**/**Nosifer** display fonts (Google Fonts) for headings/logos/titles, with a subtle flicker animation.
- Added a synthesized **howl sound effect** (built with the Web Audio API — no audio file needed, works offline) that plays once on the first click/tap/keypress on any panel (browsers block audio autoplay before a user gesture), plus a 🐺 button in the corner of every panel to replay it on demand.

**Left untouched — flagging, not silently changed:** the `client_bridge.js` default session ID (`"beastbot"`) was left as-is — renaming it could change where the bot looks for already-saved session files on an existing deployment. See Update 24 below for the repo/Render renames.

**Verification:** `py_compile` on `app.py` — clean. `node --check` on every renamed `.js` file — clean. `package.json` re-validated as parseable JSON. Full repo grep confirms no remaining old-brand strings outside the intentionally-preserved infra identifiers above.

## Update 24 — GitHub repo & Render service renamed to match the brand

**What changed:** `config_ported.js`'s update URL, `plugins/ported_info.js`'s repo-info API call, and `plugins/ported_download.js`'s `.clone`/`.gitclone2` example text were all switched from `specialpanda26-sudo/Beast-bot-ogolla` to `specialpanda26-sudo/Halloween-MD` — GitHub **username unchanged**, only the repo name. `render.yaml`'s service name (`beast-bot-ogolla` → `halloween-md`) and disk name (`beast-bot-data` → `halloween-md-data`) were updated to match.

**Important — this file alone does not rename anything live:** `render.yaml` is only read when Render first creates a service from a Blueprint. Editing the names in this file does **not** rename your already-deployed Render service or its disk — you still need to do that by hand in the Render dashboard (Settings → Name), or Render may treat the new names as a request for a *new* service/disk instead of renaming the existing ones, which could mean losing track of your existing saved sessions or, worse, an extra billed disk. Do the dashboard rename first, then this file will match. Same idea for GitHub: renaming the repo (Settings → repository name) is free and GitHub auto-redirects the old name, but do it in GitHub's UI — this file doesn't do that part either.

## Update 22 — Quick menu and full catalog now share one styling source

**The root cause, not just the symptom:** the quick `.menu` view's `┏▣ ◈ ᴘᴜʙʟɪᴄ ᴄᴏᴍᴍᴀɴᴅs ◈` boxes were built by `smallCaps()`/`menuBox()` helpers defined as private, unexported local functions inside `plugins/general.js`. `lib_ported/menuCatalog.js` (the full 877-command catalog) had no way to reach them even if someone had tried — so it was written as plain `*CATEGORY*` text instead, which is why the two menus looked like they came from different bots.

**Fix — new `lib_ported/menuStyle.js`:** pulls `smallCaps`, `menuBox`, `boxClose` out of `general.js` into one shared module, plus a new `categoryEmoji()` map (37 categories, one icon each, falls back to 📁 for anything new) so the auto-generated catalog gets the same per-section icon treatment the hand-curated quick menu already had.

- `plugins/general.js` now imports these from `menuStyle.js` instead of defining its own copy — **zero visible change** to the quick `.menu` view, same output as before, just one source of truth now instead of a private copy.
- `lib_ported/menuCatalog.js`'s two catalog builders (`buildFullCatalogMessages`, the chunked version, and `buildFullCatalogSingleMessage`, the one-message version) both now render each category as a `┏▣ ◈ [emoji] *SECTION* ◈ ... ┗▣` box with `│➽` bullets, matching the quick menu exactly. Both catalog headers small-caps'd too (`ғᴜʟʟ ᴄᴏᴍᴍᴀɴᴅ ᴄᴀᴛᴀʟᴏɢ`).
- The existing adaptive description-length shrinking (35 → 25 → 15 → name-only, from Update 20) needed no changes — it measures the final rendered string on every pass, so the extra box/bullet characters are automatically absorbed into that same budget. Verified: full single-message catalog at 416 commands (owner+admin view) renders at 17,381 characters — comfortably under the 20,000 safety ceiling, still at the most generous 35-char description length, no forced shrink needed.

**Deliberately NOT merged — explained, not just left alone:** the quick menu and full catalog still show different *content* on purpose. The quick view is a hand-curated subset with its own custom wording (confirmed intentional back in Update 18's audit — `.menu` deliberately isn't meant to list everything). The full catalog is exhaustively auto-generated from `assets/commands-db.json`. Actually merging the two into one command/one message would either blow past WhatsApp's single-message character ceiling or strip the quick view of its hand-picked framing — this update only unifies *how* both are drawn, which is what was actually causing them to drift apart, not what they list.

**Verification:** `node -c` on every `.js` file in the repo — clean. Rendered both catalog builders directly in Node against the real `assets/commands-db.json` to confirm actual output and length, not just syntax — box formatting renders correctly, and the character-budget math checked out as described above.

## Update 21 — PO Token provider for YouTube (second layer on top of cookies)

**Why:** cookies alone don't always survive the jump from a phone's residential IP (where `.setcookies` was exported) to Render's datacenter IP — YouTube can still challenge datacenter traffic even with fresh, valid cookies, since IP reputation is a separate signal from login state. A PO (Proof-of-Origin) Token proves the request came from a real client and is what yt-dlp's own maintainers now recommend as the durable fix, on top of (not instead of) cookies.

**What was added:**
- `Dockerfile` now clones and builds `bgutil-ytdlp-pot-provider` (pinned to release `1.3.1`) during the image build — a small local HTTP server that generates tokens on demand.
- `requirements.txt` gained the matching Python-side plugin (`bgutil-ytdlp-pot-provider`), which yt-dlp discovers automatically at runtime — no extra config needed beyond the `--extractor-args` already wired in.
- `start.sh` now starts the token server on port 4416 (before the Python backend), waits for it to answer `/ping`, and cleans it up on shutdown alongside the Python process. Entirely optional/best-effort — if it's disabled, wasn't built (e.g. local dev outside Docker), or fails to start, the bot boots normally and yt-dlp falls back to the existing client-order + cookies mitigation.
- `app.py`'s `_ytdlp_base_args()` and `plugins/media.js`'s `buildYtdlpArgs()` both now pass `youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416` — kept in sync the same way the client-order and cookies args already were, including on the automatic ios-client retry.
- New env vars, both optional: `POT_PROVIDER_ENABLED` (default on) and `POT_PROVIDER_PORT` (default `4416`), documented in `.env.example`.
- `.env.example`'s cookie-export instructions corrected to name the safe **"Get cookies.txt LOCALLY"** extension specifically — the similarly-named older **"Get cookies.txt"** extension was pulled from the Chrome Web Store for exfiltrating cookies; the code already pointed at the safe one in `.setcookies`' own help text, this just fixes the same instructions where they were duplicated in `.env.example`.
- `.dl`/`.song`/`.video` etc.'s bot-detection error message updated to reflect that both mitigations are active, and to point directly at `.setcookies` as the next step if it keeps happening (cookies have likely expired).

**Verification:** `node -c` on `plugins/media.js`, `py_compile` on `app.py`, `bash -n` on `start.sh` — all clean. The actual TypeScript build (`npm ci && npx tsc` inside the cloned provider repo) happens at Docker build time on Render, same as the existing yt-dlp/Deno binary downloads already in this Dockerfile — not something testable ahead of a real deploy.

## Update 20 — Production hardening pass: secrets, PayPal, .getfile/.inspect security bugs, cookies workflow, single-message full menu

**Secrets moved out of source (private → public repo prep):**
- 8 hardcoded third-party API keys/secrets (`MUSIC_DL_API_KEY`, `NEWSAPI_KEY`, `ACRCLOUD_ACCESS_KEY`/`ACRCLOUD_ACCESS_SECRET`, `XTEAM_KEY`, `LOLHUMAN_KEY`, `VIOLETICS_KEY`, `ZENZAPIS_KEY`, `FGMODS_KEY`) moved from `config_ported.js`/`plugins/*.js` into env vars, documented in `.env.example`. Existing values kept as fallback so nothing breaks before you set your own.

**AI chatbot secrecy guard:** all 4 personas in `app.py`'s `/natural-chat` (DM, group, status-comment, owner-Sheng-standin) now refuse to disclose secrets, config, or their own system prompt, even under "ignore previous instructions"-style prompt injection.

**Two real bugs found and fixed in `ported_owner.js`:**
- `.getfile`/`.readfile`/`.cat`/`.readcode` were completely broken — leftover duplicate code from the original port referenced a variable before its declaration, throwing an error on every single call. Dead code removed; command now works.
- `.inspect` (+ aliases `.cat`/`.readcode`/`.getplugin`) had a real path-traversal hole: `.inspect ../.env` would read the bot's actual `.env` file (all secrets included) and post it to chat. Gated to owner/sub-admin/co-owner already, but now also hard-locked to the `plugins/` directory.
- Audited all 38 owner-tier command definitions in the file for missing permission checks — all correctly gated, no others found.

**PayPal integration (manual path live, API path scaffolded):**
- `.paypal` shows the PayPal.me link; `.paypalfunds <amount> <txn_id>` submits a manual top-up for admin review, same trust model as the existing M-Pesa `.addfunds`.
- "☕ Buy Me a Coffee" button added to the public landing page hero section (`PAYPAL_ME_LINK` env var, defaults to `paypal.me/henryochieng`).
- Real PayPal REST API (auto-verified payments) documented in `.env.example` but not built — needs a Client ID/Secret from developer.paypal.com.

**yt-dlp cookies — phone-friendly workflow:** new `.setcookies` owner command accepts a `cookies.txt` sent as a WhatsApp document and saves it straight to the persistent data disk (`DATA_DIR/cookies.txt`), which `app.py` and `plugins/media.js` now both check by default — no Render shell access or env var needed. `cookies.txt` added to `.gitignore` (it's a live login session, not safe to commit).

**`.menu` full catalog is now ONE message, not several:** previously chunked into 3–4 separate follow-up messages (each ~7-8k chars) because the raw catalog didn't fit under WhatsApp's real single-message limit (~22-24k chars observed, well short of the documented 65k). New `buildFullCatalogSingleMessage()` in `menuCatalog.js` collapses aliases, adaptively shortens descriptions (35 → 25 → 15 → name-only) until everything fits in one message under a 20,000-char safety ceiling — currently ~18.5k for all 877 commands. Auto-shrinks further on its own if the catalog keeps growing, so this doesn't need revisiting later.

**Housekeeping:** internal `QasimDev` variable renamed to `sock` in `lib_ported/myfunc.js` (cosmetic — was never user-visible, but cleaner). `CHANGES.md` itself split — older entries (Updates 3–14) moved to `CHANGES-ARCHIVE.md` to keep this file readable.

## Update 19 — Merged two divergent zips back into one (main + main-fixed)

You uploaded two zips that had drifted apart from the same Update 18 base, each with real,
non-overlapping work — this merges both into one file with nothing dropped from either side.

**From `main` (kept as the base — it had the bigger feature additions):**
- The self-hosted yt-dlp download pipeline (`/internal/ytdl` in `app.py`, called first by
  `.video`/`.play`/`.plays`/`.song` before falling back to the old third-party scraper).
- `INTERNAL_SECRET`-gated internal routes and the new Command Console backend
  (`/internal/action`, SSE live events, customer OTP login) — `main-fixed` didn't have these yet.
- Message logging with `session_id`/`direction`/`read_flag` columns for the console inbox.

**From `main-fixed` (ported over on top of that base):**
- **Real security fixes** `main` was still missing: 38 owner-only commands and several group-admin
  commands in `ported_owner.js`/`ported_admin.js`/`ported_group.js` had no permission check at
  all — any user could run them. All now correctly gated.
- **`.getfile` hardened** — blocks reading `.env`/`creds.json`/session files, and blocks path
  traversal outside the project folder (both were previously wide open).
- **`.crun`/DNA-decode/decompress/python-script runners switched from `exec` (shell string
  interpolation — a command-injection risk) to `execFile` (arguments passed as an array, no shell
  involved)**, and `.crun` is now owner/admin-only (running arbitrary compiled code was open to
  anyone).
- **Forwarded-newsletter-message spoofing removed** — every bot reply was silently tagged as
  "forwarded via a newsletter channel" to look more legitimate/viral; stripped from all 9 places
  it appeared, replaced with a plain `contextInfo: {}`.
- **Full branding sweep completed** — remaining bare "Ochibots™"/"OCHIBOTS" strings (missed by
  the Update 16 pass) now consistently read "Halloween MD™"; the "Developed By Qasim Ali /
  GlobalTechInfo" block-comment headers in 8 files replaced with a Henry Bots header (per your
  explicit call to finish the sweep — this supersedes Update 16's note to leave them, since you'd
  since said you want them gone too).
- **Sticker library swapped**: `stickers-formatter` → `wa-sticker-formatter` (better maintained,
  matches what `main-fixed` had already moved to) — `package.json` updated to match; the lockfile
  will resolve it on the next `npm install` (the Dockerfile already runs `npm install`, not
  `npm ci`, so this isn't a build blocker).
- A leftover, never-wired `SaveCreds()` helper in `lib_ported/session.js` had a hardcoded
  stranger's GitHub username as the credentials-gist owner — disabled behind an env var so it
  can't silently pull from someone else's account if it's ever wired in later.
- `settings-ext.js`'s shadowed `.settings` duplicate renamed to `.mysettings` so it can't collide
  with the real one in `ported_owner.js`/`ported_stickers.js`.
- Dropped a stray default `channelLink` that pointed at what looks like someone else's WhatsApp
  channel invite, not yours.

**New fix, found while checking your download-reliability report (not in either zip):** the new
`/internal/ytdl` pipeline (`app.py`'s `get_video_url`/`get_audio_url`) was using an older, weaker
bot-detection mitigation than `plugins/media.js`'s already-hardened `.dl`/`.song` path — wrong
client order (`android,ios,web` instead of `android,web,tv`), no `YTDLP_COOKIES_FILE` support, and
no retry-on-bot-check. Since `.video`/`.play`/`.plays` try this pipeline *first*, it was actually
less resilient than the fallback scraper it was supposed to upgrade — a likely real contributor to
the "bot detection" failures you saw. Rewritten to share the exact same mitigation as `media.js`:
`android,web,tv` client order, one automatic retry against `ios` specifically on a bot-check hit,
and the same optional `YTDLP_COOKIES_FILE` support. Both download code paths are now consistent.

**Verification performed:** every `.js` file `node -c` syntax-checked, `app.py` and the two Python
scripts under `lib_ported/` `py_compile`-checked, `package.json`/`package-lock.json` both
JSON-parse cleanly. All 38 + 13 + 1 permission-check insertions and all 9 newsletter-spoof removals
applied via exact context matching (not line numbers), so nothing landed in the wrong spot even
though the two source files had already diverged.

## Update 18 — Full correctness pass: menu/command-table audit, docs, "what was fixed" PDF

**Menu/command-table audit (requested check):** traced `.menu` → `.commands` → `.smenu` end to
end. `.menu` is deliberately a curated subset (by design, with a footer pointing to the other
two) — not a bug. `.commands` and `.smenu` are both built directly off the live `allCommands`
dispatch table at boot (920 commands, post `NON_COMMAND_KEYS` strip), so they can't drift out of
sync with what's actually installed; confirmed by re-running the full boot sequence. No missing
commands found.

**Dependency audit:** cross-checked every `require()` in every plugin file against
`package.json`. One flagged name (`baileys-antiban`) is intentionally vendored locally under
`libs/` (already documented in `package.json`'s own comment) — not a real gap.

**Changelog numbering bug fixed:** this file had two different sections both labeled
`Update 4` and two both labeled `Update 12`, plus `Update 11` printed out of order — the result
of new entries being prepended at the top over time while an older block still counted upward at
the bottom. Renumbered everything below to be unique and sequential (1 → 17 by position, oldest
at the bottom); this entry is 18. No content was moved or reworded, only the numbers and their
own internal cross-references (e.g. "flagged in Update 4" → "flagged in Update 15").

**README.md:** added the missing `.goodbye`/`.welcomecfg` rows to the Group Admin commands
table, and a summary section for the welcome/goodbye automation fix.

**New: plain-language "what was fixed" PDF.** Technical changelogs (this file) aren't the easiest
read for a non-technical bot owner. Added `assets/HalloweenMD-Whats-Fixed.pdf` — a short, plain-English
walkthrough of what was broken, what's fixed, and what it means day to day, generated from this
file's content. Linked from `/pair` (next to the existing user guide) and from the bot's own
`.pair` reply in chat, so anyone going through pairing sees both documents.

**Found, not touched — flagging honestly:** `plugins/ported_general.js` has a `.pair <number>`
command (aliases `.paircode`/`.session`/`.getsession`/`.sessionid`), but `client_bridge.js`'s
message handler intercepts the literal text `.pair`/`pair` earlier and always returns before the
command dispatcher runs — so with the default `.` prefix, that plugin command and its aliases
never actually execute. It would still run if the bot's prefix is changed via `.setprefix` (the
raw-text check isn't prefix-aware), so this isn't fully dead code, just usually unreachable. Needs
a decision on which behavior should win before touching it — not changing live pairing logic
without sign-off.

## Update 17 — Settings toggles actually wired into real behavior

The ~16 `.set<thing>` toggles in `settings-ext.js` saved to `data/settings.json` and reported
"✅ enabled," but nothing anywhere read that file back — flagged in Update 15, done now.

**Wired, each checked live (no restart needed to take effect):**
- `.setautoread` — gates the existing auto-read-messages call
- `.setautoreadstatus` / `.setautolikestatus` — gate status auto-read / ❤️ auto-react
- `.setautoreplystatus` — gates the AI comment-on-status feature
- `.setautobio` — gates the 60s bio-refresh interval (checked every tick)
- `.setchatbot` — gates DM AI auto-reply (customer sessions; owner-session's own 3-gate logic
  from Update 5 is unchanged and sits inside this)
- `.setautoreply` — new, separate switch for the *group* @mention/name AI reply (distinct from
  `.setchatbot`, which is DMs only)
- `.setautoreact` — re-adds the auto-react-to-every-message feature that was previously ripped
  out entirely for feeling spammy (see the old `❌ REMOVED` comment) — now genuinely opt-in,
  default OFF, only fires if you explicitly turn it on
- `.setdmpresence` / `.setgcpresence` — set either to `unavailable` to suppress the typing-
  simulation presence indicator in DMs/groups respectively; anything else (default `available`)
  keeps the existing behavior
- `.setbotname` / `.setprefix` — now genuinely live. `config_ported.js`'s old hardcoded
  `CMD_PREFIX`/`BOT_NAME` constants are renamed `_DEFAULT` and re-read from the settings store on
  every single message via new `getPrefix()`/`getBotName()` helpers — exactly the one-line-ish
  change this file's own old comment said was needed for this to work without a restart
- `.setgoodbyemessage` — now used as the fallback default goodbye text when a group has no
  per-group custom message set via the existing `.setgoodbye` (that per-group system is untouched
  and still takes priority)
- `.setwelcomemessage` — same fallback pattern, wired in for whenever a join-event handler exists
  to use it (see the next update)

**New: PM Permit, actually functional.** `.setpmpermit on` now means something — a non-bot-admin
DMing for the first time gets a one-time "the owner requires permission" notice and nothing else
runs for them (no AI reply, no commands) until approved. New commands: `.pmpermitapprove
<number>`, `.pmpermitrevoke <number>`, `.pmpermitlist`. Bot admins (owner/co-owner/sub-admin) are
always exempt — this never gates them.

**New: Auto Block, built on top of PM Permit.** `.setautoblock on` only ever acts on senders who
are already failing the PM Permit gate above (never touches anyone PM Permit would let through)
— after 3 unapproved attempts, the 4th gets them blocked via WhatsApp's own block API and the
owner gets a one-line notice naming the number and why. `.setautoblock` alone, with `.setpmpermit`
off, does nothing — documenting that clearly rather than inventing a separate, riskier
auto-block trigger (e.g. blocking based on message content) that could catch a real customer.

**Deliberately preserved defaults, not silently changed:** `autoread`, `autoreadstatus`,
`autolikestatus`, `autoreplystatus`, `autobio`, and `autoreply` all default to the same "on"
behavior the bot already had hardcoded before this update — wiring the toggle in doesn't turn any
of these off for you unless you explicitly run `.set<thing> off`. `autoreact`, `pmpermit`, and
`autoblock` default OFF since they're new/opt-in behavior, not previously-existing behavior.

**Follow-up, completed:** `welcomemessage` had nowhere to plug into — `handleLeaveEvent`
(goodbye) existed but there was no join-side equivalent, and separately,
`group-participants.update` (the Baileys event that fires on any join/leave) wasn't listened to
*anywhere at all* — so even the existing goodbye feature had working storage and commands but
never actually fired on a real leave. Both gaps closed:

- **New `handleJoinEvent`** in `ported_admin.js`, mirroring `handleLeaveEvent` exactly: per-group
  custom message (new `.welcomecfg on|off|set <message>`) → global `.setwelcomemessage` fallback
  → hardcoded default, same image-card-with-text-fallback delivery.
- **New `.welcomecfg` command**, not `.welcome` — `general.js` already owns a working, unrelated
  `.welcome <number>` (sends a manual onboarding welcome-card DM to a customer); reusing the name
  would have collided and broken it. `.goodbye`/`.bye`/`.leave` were left as-is since they don't
  collide with anything.
- **`client_bridge.js` now listens for `group-participants.update`** and calls
  `handleJoinEvent`/`handleLeaveEvent` on `action: 'add'`/`'remove'` respectively — the actual
  wiring that was missing. Both handlers are exported from `ported_admin.js` as
  `_handleJoinEvent`/`_handleLeaveEvent` for the listener to call directly, and both are added to
  `NON_COMMAND_KEYS` so they can't be typed as commands (they show up nowhere in `.commands`).

**Verification:** every file re-passes `node -c`; `ported_admin.js` and the full `client_bridge.js`
boot path were `require()`-load tested with stubbed third-party dependencies through to session
start with no exceptions; confirmed the live 920-command table contains `welcomecfg`, `goodbye`,
`bye`, `leave`, and the untouched `welcome`, with no `_handleJoinEvent`/`_handleLeaveEvent` leaking
into it and no collisions anywhere.

## Update 16 — Dead rentbot subsystem removed, live branding fixed to Halloween MD

**Removed (per your call in Update 15's audit — never actually wired, imported a file that
doesn't exist anywhere in the repo):**
- `.listrent`/`.listclone`/`.botclones`
- `.rentbot`/`.botclone`/`.clonebot`
- `.stoprent`/`.stopclone`/`.delrent`

All three were self-contained blocks in `ported_owner.js`; removed cleanly with no other file
referencing them (confirmed by grep across the whole repo). If you ever want real bot-cloning/
rental, that's new code to write (a message router for cloned sessions), not a restore of this.

**Branding — the bot was correctly named "Halloween MD" almost everywhere, but several
user-facing messages had "MEGA-MD" hardcoded regardless of that** (sticker pack names, bio/quote
captions, `.pair` success text, `.status`, download/image-tool captions, `.clone` usage examples,
`.script`'s GitHub-repo lookup). All of those now say **Halloween MD** — either dynamically
via `config.botName` where `config` was already in scope, or as a plain literal where it wasn't
(to avoid introducing an undefined-variable crash).

**`config_ported.js` identity defaults fixed** — these only mattered as fallbacks (your real
`BOT_NAME`/`OWNER_NUMBER` env vars were already correct), but the *fallback* values were still
the original template author's: `botOwner` defaulted to `'Qasim Ali'`, `ownerNumber` to a
Pakistani number, `author`/`packname` to `'GlobalTechInfo'`/`'MEGA-MD'`, and `updateZipUrl`
pointed at `GlobalTechInfo/MEGA-MD`. Now default to your identity and
`specialpanda26-sudo/Beast-bot-ogolla`.

**Left untouched, on purpose:** the `// Developed By Qasim Ali` / `GitHub: GlobalTechInfo` block
comments at the top of the ported files, and the "AUTO-PORTED from friend's MEGA-MD bot" comments
— you said those are real contributors, not template cruft, so that attribution stays.

**Still open from Update 15, not done in this pass:** the ~16 `.set<thing>` toggles in
`settings-ext.js` are still placebo (save to `data/settings.json`, nothing reads them back).
Next up.

## Update 15 — Build fix + command-registry audit (nothing removed)

**Build fix:** `jimp@^0.22.12` (pinned, used by `texteffects.js` via the old 0.x API) conflicted
with `@whiskeysockets/baileys@7.0.0-rc13`'s optional `jimp@^1.6.1` peer dep, failing `npm install`
with ERESOLVE on Render. Added `--legacy-peer-deps` to the npm install step in `Dockerfile` and
`setup-mybot.sh`. jimp version left untouched — bumping to 1.x would have broken `texteffects.js`.

**Command audit:** counted all 923 unique live commands across the 41 plugin files and traced
every command-listing/search/stats feature end to end. Found and fixed:
- `.gitpull`/`.refresh`/`.pull` and `.uptime` imported `../lib/commandHandler.js`, which doesn't
  exist (only `../lib_ported/commandHandler.js` does) — always threw. Fixed the import path.
- `lib_ported/commandHandler.js` (ported alongside the Mega-MD command pack) expects plugins
  shaped `{command, handler, category}`, but every plugin here exports flat `{cmdName: fn, ...}`,
  so nothing ever registered a real command into it. Its `.commands`/`.categories`/`.stats` were
  permanently empty, silently breaking `.smenu`/`.shelp`/`.smart`/`.help2` (rendered "0 plugins"),
  `.find`/`.lookup`/`.searchcmd` (always "not found"), `.perf`/`.metrics`/`.diagnostics` (always
  "no performance data"), and `.manage`/`.ctrl`/`.control`'s toggle+alias features (could never
  find a command to act on). `client_bridge.js` now backfills the registry from the real dispatch
  table at startup with a category per plugin, and the dispatcher honors `.manage`-created
  disabled-flags and aliases (previously written but never read). `lib_ported/commandHandler.js`
  gained two new methods (`recordUsage`/`recordError`) so `.perf` shows real numbers.
- `.menu` now also points to `.smenu` (categorized, live-status view) alongside the existing
  `.commands` (flat, searchable list) — both now reflect all 923 commands accurately.
- Found, not yet fixed (flagging for a decision, not touching without sign-off):
  - `.rentbot`/`.botclone`/`.clonebot` imports `../lib/messageHandler.js`, which doesn't exist
    anywhere in the repo — this isn't a path typo, the module was never ported. Fixing it means
    writing new code (a message router for cloned bot sessions), not a one-line fix.
  - `.settings`/`.emojimix` are each defined twice (`settings-ext.js`/`texteffects.js` vs.
    `ported_owner.js`/`ported_stickers.js`); the later plugin wins in both cases and is the
    better implementation, but the shadowed versions are dead code.
  - `settings-ext.js`'s ~16 `.set<thing>` toggles (`.setpmpermit`, `.setautoread`, `.setbotname`,
    etc.) write to `data/settings.json`, but nothing anywhere reads that file back into actual
    bot behavior — they save successfully and report success, but don't yet do anything. Needs a
    decision on wiring each one into the real message pipeline before it's touched.

