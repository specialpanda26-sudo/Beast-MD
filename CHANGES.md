# Changes

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
  the Update 16 pass) now consistently read "Henry Ochibots v19™"; the "Developed By Qasim Ali /
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
read for a non-technical bot owner. Added `assets/BeastBot-Whats-Fixed.pdf` — a short, plain-English
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

## Update 16 — Dead rentbot subsystem removed, live branding fixed to Henry Ochibots v19

**Removed (per your call in Update 15's audit — never actually wired, imported a file that
doesn't exist anywhere in the repo):**
- `.listrent`/`.listclone`/`.botclones`
- `.rentbot`/`.botclone`/`.clonebot`
- `.stoprent`/`.stopclone`/`.delrent`

All three were self-contained blocks in `ported_owner.js`; removed cleanly with no other file
referencing them (confirmed by grep across the whole repo). If you ever want real bot-cloning/
rental, that's new code to write (a message router for cloned sessions), not a restore of this.

**Branding — the bot was correctly named "Henry Ochibots v19" almost everywhere, but several
user-facing messages had "MEGA-MD" hardcoded regardless of that** (sticker pack names, bio/quote
captions, `.pair` success text, `.status`, download/image-tool captions, `.clone` usage examples,
`.script`'s GitHub-repo lookup). All of those now say **Henry Ochibots v19** — either dynamically
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

## Update 3 — Correctly merged into main (this package)

The previous "update" zip was generated against an outdated copy of `main` and would have
silently dropped features `main` already had (e.g. the `/api/subscription/buy` wallet route).
This package instead takes the real, current `main` as the base and adds only what was
genuinely new, in full — nothing removed, nothing overwritten.

### Update 1 — Sub-admin activation
- `.pair key` approval broadened from primary-owner-only to any bot admin (owner, co-owner,
  sub-admin). All of them are now notified of new requests, not just the primary owner.
- New `.extend <days>` command — upgrade a customer's subscription from inside their own chat.
  Owner/co-owners can extend anyone; sub-admins only customers they personally handle.
- `session_subscriptions.handled_by` tracks which admin owns a customer (set on first approval
  or first `.extend`, never overwritten after that).
- `session_subscriptions.is_owner_session` and `.antiban_enabled` columns added (default off /
  on respectively) — reserved for the admin panel's "🔑 Owner Session" badge and per-number
  anti-ban toggle.
- Global `antiban_enabled` feature flag added (default ON).
- Admin-panel "forgot password" OTP now forced through the dedicated Owner Session only.

### Update 2 — Extended commands (`plugins/extended.js`, new file)
~30 new commands across AI/Content, Group Intelligence, Polls, Moderation, Reports, and Media
extras. Full list in README.md. Backed by 7 new tables and ~30 new routes in `app.py`, and 3
new passive hooks in `client_bridge.js` (group-activity logging, `.autoview` repost,
`.antidelete` listener) — all additive, none of them touch existing logic paths.

### Honest gap
`/admin/reports` and `/admin/group-bans` backend routes exist and work, but `admin.html` has no
matching UI tab for them yet. Say the word if you want those added.

## Update 4 — Bot name recognition in groups

Added a third, narrow trigger to the existing group AI-reply logic (`@mention` / reply-to-bot):
the bot now also replies when addressed by name — e.g. "ochibots can you help" — matched on full
word boundaries against a configurable alias list (`BOT_NAME_ALIASES` env var, comma-separated;
defaults to `ochibots,henry ochibots,beast bot,beastbot`).

This intentionally does NOT reuse the old bare "bot"/"henry" substring match that was removed
earlier for firing on unrelated messages ("I saw a robot", "chatbot", any group member named
Henry). Word-boundary matching on full aliases avoids that — "robot"/"chatbot" still won't
trigger it.

## Update 5 — Community chat panel, owner-number personal auto-reply, media search, antiban toggle actually wired

**Community chat panel (`/chat`, new page):**
- Public room + DMs, anonymous by default (client-generated `anon_id`, no login), optional
  nickname. Click a name in the public room to start a DM.
- Backend: `chat_users`, `chat_messages`, `chat_dm_index` tables; `/chat/identify`,
  `/chat/nickname`, `/chat/send`, `/chat/messages`, `/chat/dm/threads`; admin moderation via
  `/admin/chat/recent`, `/admin/chat/delete`, `/admin/chat/ban`.
- Visible disclaimer in the UI: messages may be reviewed by admins for safety/moderation.

**Henry's own number — personal auto-reply (scoped to the Owner Session only, customer sessions
unchanged):**
- Replies in heavy Sheng, standing in for Henry rather than sounding like a generic bot.
- Only replies in a chat once that chat has been explicitly turned on from the Admin Panel
  (`/admin/owner-chats`, `/admin/owner-chats/toggle`) — no blanket auto-reply.
- Even in an allowed chat, stays quiet for 5 minutes after Henry personally replies there, so it
  never talks over an active conversation.
- First-ever message from a new chat gets a one-time caution to save the number, regardless of
  the toggle above.
- Admin password-reset OTP and this whole feature rely on `is_owner_session`, which is now
  actually kept in sync on every connect (previously just an unused column).
- Henry's own number is now blocked from the public `/api/register` customer flow — it's managed
  from the Admin Panel only.

**Media search additions:**
- `.song` now accepts a plain search term (not just a URL) via yt-dlp's `ytsearch1:`.
- New `.audiomack [query]` — best-effort Audiomack search+download (yt-dlp's Audiomack search
  support varies by version; falls back to suggesting `.song` on failure).
- New `.videosearch [query]` — YouTube search+download for video, same pattern as `.song`.
- `.dl`/`.download` already covered pasted links across YouTube/TikTok/Instagram/Facebook/
  X/SoundCloud/etc. via yt-dlp — unchanged, still works.

**Antiban toggle — now actually enforced:**
- The global `antiban_enabled` feature flag and per-session `antiban_enabled` column (added in
  Update 1) were sitting unused — `wrapSocket()` ran unconditionally regardless of either.
  Fixed: both are now checked before wrapping, defaulting ON so nothing changes unless an admin
  deliberately flips one off.
- New `/admin/session-antiban` (read) + `/admin/session-antiban/toggle` (admin panel) for the
  per-session switch. The global switch already had `/admin/features/toggle`.

## Update 6 — Recovery features audited, one real bug fixed in restricted groups

Checked all three recovery paths (image view-once, video view-once, antidelete) and the 🌝
reaction recovery:

- **View-once (image + video), default path**: already correct — always privately forwarded to
  the session's own number, never posted back into the chat. No bug.
- **🌝 Reaction-triggered recovery**: already correct — always privately forwarded to the
  session's own number, bot-admin only. Reactions aren't blocked by a group's admins-only
  setting on WhatsApp's side, so this already worked fine in restricted groups too. No bug.
- **`.antidelete` — bug found and fixed**: it was reposting recovered deleted messages/media
  straight back into the *same* chat, with no check for announcement-only (admins-post-only)
  groups. In a restricted group that either silently failed (bot isn't an admin) or broke the
  group's own "no chatter" norm even when it did work. Fixed: in a restricted group, the
  recovery is now sent privately to that session's own number instead, tagged with which group
  it came from — same "private to the number running it" rule the view-once recovery already
  followed.
- **`.autoview` — same class of issue, same fix**: its optional repost-into-the-chat now skips
  entirely in restricted groups (the private self-forward that always happens first already
  covers it, so nothing is lost).

## Update 7 — Real antiban bug: self-forwards were being treated as risky sends

**What you saw:** the Admin Panel activity log spamming `.antiban-recovery` entries — "Sent
despite ban recovery pause" — every time a view-once/antidelete recovery self-forwarded on a
session other than your primary OWNER_NUMBER one.

**Root cause:** `libs/baileys-antiban` has always exempted the ONE global admin number
(`ownerJid`) from every ban-risk check — correct for "the owner sent a `.command`," but every
antiban check compared the recipient against that single global number. A session self-
forwarding view-once/antidelete recovery to **its own** number — safe by definition, you cannot
be banned by WhatsApp for messaging yourself — only matched that exemption if the session
happened to be the one paired to your primary OWNER_NUMBER. On any other session (like your
secondary number, 254775351698), self-forwards fell through to the non-owner path: hard-blocked
during a ban-recovery pause in strict mode, or spamming that "sent despite pause" warning on
every single one in notify-only mode — which is what the screenshot showed.

**Fix:** `libs/baileys-antiban/antiban.js` now has a separate `selfJid` concept alongside
`ownerJid` — resolved live per-session (client_bridge.js passes `() => socket.user?.id...`,
same lazy pattern already used for `notifyOnlyMode`) — and all three ban-risk checks
(`_gate`, the ban-recovery-pause gate, and the rate-limiter/daily-cap check) now exempt a
self-send exactly like they already exempted the owner. Nothing about real ban protection for
messages to OTHER people changed — this only fixes the bot sending to itself.

**Net effect:** view-once/antidelete recovery no longer counts against your own account's risk
budget or a ban-recovery pause, on any session, not just your primary number. The antiban system
is meant to shield you from real risk to *other* contacts — it was never supposed to flag a
message you send to yourself.

## Update 8 — Connection watchdog (new bug fix) + admin UI audit

**New bug found and fixed — "comes back after a long idle period, shows stale 'last active',
just doesn't respond, forced to re-pair":** Baileys' own internal keep-alive can leave a socket
in a "zombie" state — technically still connected, but not actually processing anything — after
a long idle stretch. This is especially likely on Render's free tier, where the whole process
(and every timer in it) freezes solid while the service sleeps; when a request wakes it back up,
Baileys' internal keep-alive bookkeeping can be left inconsistent, and the disconnect event that
would normally trigger the existing reconnect logic never fires. Fixed with a new watchdog: every
3 minutes, if there's been no genuine inbound message for 6+ minutes, it actively probes the
connection with a lightweight presence update; if that doesn't complete within 10s, the socket is
force-closed so the existing (unchanged) reconnect logic takes over automatically. No more manual
re-pairing needed for this specific failure mode.

**Admin Panel UI audit — found two real gaps, both closed:**
- The per-chat "which chats should the bot auto-reply on your own number" toggle (Update 5) had a
  working backend but genuinely no UI — you'd have had no way to actually use it. Added a new
  **💬 Owner Chats** tab.
- The per-session antiban on/off toggle (Update 7 area) had a working backend but no UI either.
  Added a toggle button directly on each session card in the **📱 Sessions** tab.
- The global `antiban_enabled` feature flag was togglable but showed with its raw DB name instead
  of a readable label in the **⚙️ Features** tab — given a proper label.

**Still an open gap, unchanged from before:** `/admin/reports` and `/admin/group-bans` still have
working backend routes with no matching Admin Panel tab. Flagging again since it's been a few
rounds now — say the word and it's next.

## Update 9 — Reports & Group Bans tabs (last known gap closed)

Two new Admin Panel tabs, matching the existing look/pattern of every other tab:

- **🛡️ Reports** — every `.report [@user] [reason]` submission, who filed it and where, with a
  "Mark Resolved" button. Resolving only updates this list — it never takes any action in the
  group itself.
- **⛔ Group Bans** — the audit trail `.ban` writes to, with a "Lift Ban" button. Also added the
  missing `/admin/group-bans/remove` endpoint — this trail could be viewed before but never
  edited from the panel.

No other known gaps remain from anything discussed so far.

## Update 10 — .dl/YouTube resilience, silent-logout notification, browser label

- **`.dl`/`.download`/`.song`/`.audiomack`/`.videosearch`**: YouTube increasingly blocks
  cloud/datacenter IPs (Render, Railway, etc.) with a "Sign in to confirm you're not a bot"
  challenge — this affects any yt-dlp-based bot hosted this way, not a bug specific to this
  codebase. Now automatically tries alternate YouTube API clients (`--extractor-args
  youtube:player_client=android,web,tv`, retrying once on `ios` specifically if that error
  signature is hit) before failing. Optional `YTDLP_COOKIES_FILE` env var for the more reliable
  (but higher-maintenance) cookies-based fix, if the automatic mitigation isn't enough.
- **Session logout was silent — fixed:** when WhatsApp force-unlinks a session (this happens
  automatically after ~14 days of the paired phone itself being offline — standard WhatsApp
  behavior, not bot-specific), nothing told anyone it happened beyond a server console log. Now
  logs to the Admin Panel Activity Log and pings the owner on WhatsApp (via any other still-alive
  session) so a session needing re-pair is never a silent mystery.
- **Linked-device label changed from "Chrome" to "Safari"** on Ubuntu, per request — purely
  cosmetic (what WhatsApp's own Settings → Linked Devices shows), no functional effect. Note:
  this is the fallback default only — `ANTIBAN_DEVICE_FINGERPRINT` (default on) randomizes the
  browser/OS/version per session for anti-fleet-detection, so most sessions will show a varied
  label unless that's turned off.

**Confirmed, not a bug:** the bot's connection to WhatsApp runs independently of the paired phone
— being offline for hours/days doesn't stop it from replying. Only ~14 days of continuous phone
inactivity triggers a real WhatsApp-side unlink (see the logout notification above).

## Update 11 — Recovery labels dropped (cosmetic), new `.claude` command

**View-once/antidelete recovery — cosmetic change, boundary unchanged:** dropped the "🌝
Recovered via reaction" / "🗑️ Antidelete" / "👁️ View Once intercepted!" branding on all three
recovery paths — they now read like a normal forwarded message with light attribution (who/which
chat) instead of an announced "recovery." Still goes ONLY to your own private chat, exactly as
before — this does not change where recovered content goes or make it shareable/forwardable to
third parties in a way the original sender wouldn't expect. That distinction was intentional and
still holds.

**New: `.claude [request]`** — bot-admin only, lets you ask Claude directly from WhatsApp.
- Plain questions get a normal text reply (long ones auto-convert to a `.md` file instead of a
  wall of WhatsApp text).
- Requests that clearly want generated files ("write me a script", "make me a zip of...") come
  back as an actual `.zip` document, built server-side and sent as a WhatsApp document attachment.
- Needs `ANTHROPIC_API_KEY` set (optional — replies with a clear "not configured" message
  otherwise, doesn't crash). Each call costs real money on your Anthropic account.
- New backend: `/claude/generate` in `app.py`.

**Render crash investigation:** couldn't reproduce it — ran the actual `client_bridge.js`
startup path directly (not just a syntax check) with stubbed dependencies, and it starts clean
through to "waiting for pairing," all 112+ commands load, no exception anywhere in the code
changed recently. Both new code paths from Update 8 (the antiban-toggle check and the connection
watchdog) are wrapped in try/catch and can't throw uncaught. If it happens again, the "Debug"
button on the failed-instance entry in Render's event log has the real stack trace — that's
needed to actually diagnose it further, "exited with status 1" alone doesn't say what threw.

## Update 12 — `.antibanstats` display bug fixed

Followed up on checking whether every session's bot/ban health is shown consistently —
`.antibanstats` (owner-only, run in any session's own chat) already correctly reads that
session's own independent antiban instance, so it works per-session as expected. One real bug
found in the display itself: `notifyOnlyMode` is stored as a **live function** (re-checked
against the Admin Panel's toggle on every send, not a frozen boolean) — but the status text was
truthy-checking the function reference directly, which is always `true` in JS regardless of what
calling it would actually return. So `.antibanstats` always showed "Notify-only mode: ON" even
when an admin had genuinely turned it OFF (strict mode). Fixed to resolve it the same way the
library itself does before displaying it. Also updated the exemption note to mention self-sends
(Update 7), not just the owner number.

## Update 13 — .tts corrupted-audio bug, yt-dlp's new JS runtime requirement, two clarifications

- **`.tts` was sending corrupted audio ("something is wrong with the audio file")** — Google's
  `translate_tts` endpoint is unofficial/undocumented and silently returns an HTML error page
  instead of audio when it blocks a request (same root cause family as the YouTube issue below —
  cloud/datacenter IPs get treated with more suspicion). The old code sent whatever bytes it got
  straight to WhatsApp with no validation. Fixed: added a real browser Referer header, and the
  response is now checked to actually look like audio (content-type + MP3 magic bytes) before
  sending — a bad response now gives a clear error instead of a broken voice note.
- **`.dl`/`.download`/`.song`/`.audiomack`/`.videosearch` — new yt-dlp requirement, not a bug
  here:** yt-dlp started requiring a JS runtime (Deno by default) to solve YouTube's signature
  challenges as of late 2025/2026 — every YouTube link was failing with "No supported JavaScript
  runtime could be found," completely unrelated to the earlier bot-detection fix. Verified the
  fix via yt-dlp's own GitHub issue tracker before changing anything. Installed Deno in the
  Dockerfile (yt-dlp finds it automatically, zero config) with a Node.js fallback in the code
  itself that only activates if Deno genuinely isn't present.
- **Live typing / draft preview — not possible, not a missing feature:** the TikTok clip showing
  a WhatsApp "setting" that reveals someone's message as they type it isn't real. WhatsApp's
  protocol only ever exposes a "typing…" presence indicator, never draft text before send — no
  app or mod can legitimately show that, it doesn't reach any device until the sender actually
  sends it.
- **View-once/deleted-message recovery already appears as normal media** on the recovered copy
  (not re-tagged view-once, fully forwardable) — confirmed this was already correct. Drew a line
  at going further to make the interception undetectable to the original sender — view-once
  exists so people can share something expecting it to disappear, and defeating that invisibly at
  commercial/resold scale is a real non-consensual-exposure risk, not something to build.

## Update 14 — Delta feature pack + Henry v20 ported commands merged

**Two new command packs merged in:**
- **Delta feature pack** (12 plugin files): notes, group-guard (auto link/badword
  enforcement + `everyone` tag), tic-tac-toe & word-chain games, text effects,
  URL tools (tinyurl/define/etc.), temp mail, sudo management, extra settings,
  a second AI chat backend, live sports scores/standings, MEGA cloud backup,
  and drop-in `.vv`/`.pp` upgrades layered onto the existing media/general
  plugins.
- **Henry v20 ported commands** (19 plugin files, 236 commands ported from a
  friend's MEGA-MD bot): admin, AI, download, fun, games, general, group,
  images, info, menu, music, owner, quotes, search, stalk, stickers, tools,
  upload, utility.

**Collision resolution:** cross-checked all three command sources (base,
Delta, Henry) key-by-key. Two intentional overrides (`.vv`/`.pp`, Delta's
`overlap-rewrites.js` upgrading the existing media commands — by design,
loaded last). Thirteen real collisions found between Henry's 236 commands
and the existing base/Delta commands (`maintenance`, `reload`, `schedule`,
`tts`, `gpt`, `define`, `tinyurl`, `catbox` as primary names; `status`,
`announce`, `bio`, `dice`, `groupname` as aliases only) — the already-wired
base/Delta version was kept in every case, and only the colliding Henry
command/alias was removed, not the whole file. Verified zero collisions
remain and zero stray internal helper exports leak into the live command
table.

**New `.commands` command:** flat, alphabetical, searchable list of every
currently-loaded command (`.commands`, or `.commands <keyword>` to filter) —
separate from the curated `.menu`, so newly-added commands are always
discoverable immediately without hand-editing a menu string.

**Bug found during integration (unrelated to the merge itself):** `.reload`
had a stale, hardcoded plugin list missing `extended` and, obviously, every
Delta/Henry plugin — so reloading silently skipped them. Fixed to match the
full plugin list.

**New dependency found during load-testing, not listed in Henry's own
dependency doc:** `acrcloud` (used by the ported `.shazam`-style song
recognition command). Added to `package.json` alongside the rest of
Henry's and Delta's required packages.

**Verification performed:** every modified/new file syntax-checked with
`node -c`; every one of the 41 new/changed plugin files `require()`-load
tested with stubbed third-party dependencies (and real `pino`/`axios`
where already installed) to catch load-time errors, not just parse errors;
full command table simulated end-to-end exactly as `client_bridge.js`
builds it at boot, confirming a clean merge with no runtime collisions.
