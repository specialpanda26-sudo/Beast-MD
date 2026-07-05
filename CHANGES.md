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
