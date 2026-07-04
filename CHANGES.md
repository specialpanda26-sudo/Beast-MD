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
