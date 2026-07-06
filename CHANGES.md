# Changes

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

## Update 12 — Recovery labels dropped (cosmetic), new `.claude` command

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

## Update 11 — `.antibanstats` display bug fixed

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

## Update 12 — .tts corrupted-audio bug, yt-dlp's new JS runtime requirement, two clarifications

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

## Update 13 — Delta feature pack + Henry v20 ported commands merged

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
