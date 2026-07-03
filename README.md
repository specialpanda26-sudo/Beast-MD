# 🔥 Henry Ochibots v19™

> **WhatsApp automation bot built by [@henrytech254](https://github.com/henrytech254)**  
> Baileys (Node.js) + Python backend | Deployed on Render / Railway

---

## 🩹 Recent fixes

- **🛡️ Anti-ban module gaps closed + surfaced everywhere** — device fingerprinting, JID/LID canonicalizer, session-decrypt health monitor, topology throttler (new-contact throttling), read-receipt jitter, and `creds.json` auto-backups (`.credssnapshot`/`.credsrestore`) were bundled in `libs/baileys-antiban` but never actually wired into `client_bridge.js` — now active by default. Proxy rotation, risk webhooks (Telegram/Discord/generic), and a "safe hours" broadcast scheduler were also dormant — now wired in but off until you set the matching env var (see `.env.example` and [Anti-Ban Protection](#-anti-ban-protection)). `.menu` and this README previously didn't mention any anti-ban commands at all — added. The admin panel's Sessions list now shows a live risk badge + warm-up day per session.
- **🔒 Paid pairing/activation flow added** — see [Paid Pairing](#-paid-pairing--activation-keys) below.
- **🐛 Follow-up audit pass — see [`REMEDY.md`](./REMEDY.md#pass-2--paid-pairing-merge--login-permission-audit) for details.** Highlights: the admin panel's session list never detected a session going offline (crashed/logged-out/reconnecting sessions showed as "online" forever) — fixed. `.login`-granted co-owner access didn't unlock `.kick`/`.add`/`.promote`/`.demote`/`.mute`/`.unmute`/`.revoke`/`.setperm`/`.resetperm`/`.listperms` unless you were also already a real WhatsApp group admin — fixed, these now respect bot-owner/sub-admin status like every other admin command does. `pair.html` didn't share the site's fonts or color theme — fixed.
- **🔗 `.pair` self-service linking restored** — an earlier menu version documented `.pair` (link your OWN number as a new bot session, right in chat) but the actual handler and menu line had gone missing from this codebase. Restored: message the bot `.pair`, choose QR or pairing code, send your number, get the code/QR back in that same chat — reuses the exact same `startSession()` path the web `/pair` UI uses. Also fixed: `deviceFingerprint`'s random-identity feature (`ANTIBAN_DEVICE_FINGERPRINT`) was overwriting both the WA protocol `version` and `browser` fields with mobile-app-shaped values instead of a real desktop browser identity, which made WhatsApp reject the connection outright (`405`) — set `ANTIBAN_DEVICE_FINGERPRINT=false` to avoid this until upstream fixes it. Also fixed: disconnects were retried identically regardless of code, even ones `baileys-antiban`'s own `classifyDisconnect()` marks fatal (e.g. `405`) — now retries fatal codes up to 3 times with backoff, then stops cleanly instead of looping forever.

- **🐛 Full command/feature audit — see [`REMEDY.md`](./REMEDY.md) for details.** Highlights: `.hangman`/`.trivia`/`.guess`/`.truth`/`.dare`/`.wyr`/`.validate`/`.ipinfo`/`.whois` were coded but never loaded (missing from the plugin loader) — fixed. `/natural-chat` (all AI DM chat + group AI replies) was missing its route decorator and silently 404'd on every call — fixed, this was the single biggest bug in the repo. Active-game replies (a letter for `.hangman`, an answer for `.trivia`, a number for `.guess`) were never wired to the message handler — fixed. `.reload` didn't actually reload the live command table — fixed. `.imagine`, `.tts`, and `.model` were documented in this very changelog but never implemented — all three now work for real (Pollinations.ai image gen, Google TTS voice notes, per-chat Groq model switching).
- **🔑 Admin panel password reset added** — if you (the owner) forget the `/admin` panel password, tap "Forgot password?" on the login screen. A one-time 6-digit code is sent via WhatsApp to your fixed `OWNER_NUMBER` (never anywhere else, so it can't be redirected). Enter it with a new password (8+ chars) to regain access — this updates a hashed password stored in the database and does **not** touch your `ADMIN_PASSWORD` env var, so it survives redeploys.
- **🔑 Bot Panel (`/panel`) password reset added** — registered users who forget their panel password can tap "Forgot password?", get a 6-digit code sent to their own registered WhatsApp number, and set a new password (6+ chars). Reuses the same OTP columns as registration verification with no collision risk (one only ever acts on unverified accounts, the other only on verified ones).
- **🔒 Brute-force lockout added to all three logins** — `/admin`, `/panel`, and the reset-code entry step for both now lock out after 5 wrong attempts (5-minute cooldown for logins, "request a new code" for expired attempt limits on resets). Previously none of these had *any* limit — a weak password was crackable by simple repeated guessing.
- **🔒 Admin password comparison hardened** — switched from a plain `==` string comparison to `secrets.compare_digest`, which can't leak timing information about how many characters of a guess were correct.
- **🔒 New security response headers on every request** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and a strict `Referrer-Policy: no-referrer`. The referrer policy matters specifically because `/admin` authenticates via a `?pass=` query string — without it, clicking any outbound link from an authenticated admin page could leak the password to a third-party site's server logs via the `Referer` header.
- **🎮 Games added** — `.hangman`, `.trivia`, `.guess`, `.truth`, `.dare`, `.wyr`. Per-chat state, hooked into the message handler so plain-text replies (a letter, an answer, a number) resolve the active game before falling through to AI chat.
- **🔎 Lookup tools added** — `.validate`, `.ipinfo`, `.whois`. Scoped to public infrastructure data only (number format, IP/ASN, domain WHOIS) — no person lookups.
- **🔒 `.getpp` gated for arbitrary-number lookups** — self-lookups and reply/@mention lookups still work for everyone; typing in someone else's raw number now requires owner/co-owner/sub-admin.
- **🔒 5 unauthenticated `/admin/*` endpoints fixed** — `session-detail`, `register-session`, `update-session`, `check-terminate`, `broadcast/pending` were missing the `ADMIN_PASSWORD` check every other admin route already has. `session-detail` additionally had its message content injected into HTML unescaped (stored XSS) — now `html.escape()`'d. The Node bridge now sends `ADMIN_PASSWORD` as a Bearer token on its own internal calls so none of this changes how the bot behaves for you.
- **🎨 `.imagine [prompt]` added** — free AI image generation via [Pollinations.ai](https://pollinations.ai) (no DALL-E/Flux API key required). Send `.imagine a lion wearing sunglasses, cyberpunk style` and the bot sends back a generated image. Available to everyone.
- **🔊 `.tts [text]` added** — free text-to-speech via Google Translate's TTS endpoint. Converts your text (up to 200 chars) into a WhatsApp voice note instantly. Available to everyone.
- **🤖 `.model [name]` added** — per-chat AI model switcher. Switch the Groq model used for `/ask` replies in any individual chat without touching global config. Choices: `llama` (llama3-70b), `llama8` (llama3-8b), `mixtral` (mixtral-8x7b), `gemma` (gemma2-9b). Send `.model` with no args to see what's active.
- **📋 `.menu` updated** — all new commands (`.imagine`, `.tts`, `.model`, `.checklink`) now appear in the public section so users can actually discover them. The old `/paint` alias in the owner section now correctly points to `.imagine`.
- **🌐 Web UI consistency** — `register.html` and `panel.html` now share the same navbar, particle canvas, grid background, and radial glow effects as the main landing page (`index.html`). Navigating between the main site, register, panel, and admin now feels like one unified product instead of jumping between mismatched screens.

- **🖼️ Personal photo removed from `.menu` and the landing page** — `assets/menu-bg.jpg` used to be a personal photo; it's now a generated neon/cyberpunk banner instead, so nothing personal ships in the public repo image.
- **🆕 `.share <number>` added** — reply to any message (text or media) with `.share <number>` to forward it to that number, without re-typing or re-uploading anything.
- **🐛 Group AI trigger tightened** — it used to fire on any message containing the plain word "bot" anywhere ("I saw a robot," "chatbot," anyone named Henry in the group, etc.), spamming AI replies into groups. Now it only replies on an `@mention` or a direct reply to one of the bot's own messages.
- **💾 Scheduler now survives restarts** — `.schedule` used to store everything in memory only, so a redeploy silently dropped every pending scheduled message. It's now backed by the SQLite DB and reloaded automatically on boot.
- **💾 Persistent data directory (`DATA_DIR`)** — the SQLite DB, WhatsApp auth sessions, saved view-once media, and payment proof screenshots now all live under one shared, configurable `DATA_DIR` instead of scattered relative paths. `render.yaml` mounts a 1GB persistent disk at `/app/data` so this actually survives redeploys, not just process restarts — see `.env.example` for the Railway equivalent (add a Volume in the dashboard).
- **🗑️ Removed the dead `henry19v/` folder** — a full second, unused bot codebase (its own `index.js`, `lib/`, `plugins/`) that nothing in `Dockerfile`/`render.yaml`/`railway.json` ever referenced. Pure leftover from an earlier merge — deleted to avoid confusion about which copy is live.
- **⏰ New admin panel tab: Scheduler** — view every pending `.schedule`d message and cancel one directly from `/admin`, no WhatsApp access needed.
- **👁️ New admin panel tab: View-Once Media** — browse recently intercepted view-once photos/videos/audio from `/admin` instead of digging through the bot's own WhatsApp DMs. Gated behind the same `ADMIN_PASSWORD` auth as everything else, since this is private content from other people's chats.
- **🏷️ Brand name unified to "Henry Ochibots v19™" everywhere** — leftover text from earlier dev iterations ("Shark Bot," "Beast Bot," "Henry Tech V5.0," "Henry Bots©") was still showing up in the bot's rotating WhatsApp bio, startup console banners/logs, and a few command replies (`.addadmin`, `.listadmins`, `.runtime`). All scrubbed to one consistent name. Also removed a dead, never-called old-branded welcome template that was sitting unused in the backend.
- **🐛 `.menu` was silently rendering dead duplicate text** — the menu builder had `publicSection` and `subAdminSection` variables that were fully written out (including `.checklink` and the `/recover`/`/viewonce` privacy notes) but never actually inserted into the message that gets sent — the live menu had its own separate, never-updated copy instead. Fixed by editing the actual live menu text directly and deleting the dead variables so this can't silently regress again.
- **📸 `.getpp` now works for any number, no exceptions** — it used to hard-reject a number if WhatsApp's `onWhatsApp()` lookup couldn't confirm it (which can false-negative on numbers with tighter privacy settings). Now it always attempts the profile picture fetch regardless of what the lookup says, and if it fails, the error message folds in the same blocked-vs-private heuristic as `.checkblocked` so you know right away whether it looks like a block or just no photo set.
- **🌝 Reaction-triggered recovery** — bot admins (owner/co-owner/sub-admin) can react with the 🌝 emoji on *any* message — including a view-once photo/video — and the bot privately forwards it to the **bot's own number**. Non-admin reactions are silently ignored. View-once content reuses the buffer already captured at interception time (re-fetching a viewed view-once usually fails on WhatsApp's side); other messages are pulled from a short-lived in-memory cache (last ~800 messages, 2h TTL), so this only works for messages the bot was online to see.
- **🔒 `/recover` and `/viewonce` now reply privately, not in-chat** — these used to echo the recovered text / view-once back into whatever chat the command was typed in, which could leak deleted messages or view-once media to other people in a group. Both commands now always deliver their result to the **bot's own WhatsApp number** instead, with just a quiet "sent to your bot's own number" notice left in the original chat. This also reduces ban risk from sensitive content surfacing in group chats.
- **📧 Email OTP error messages fixed** — failed email OTP sends used to return a raw, often cryptic SMTP exception. Now diagnoses the common causes directly: wrong/missing Gmail App Password (Gmail rejects your normal account password for SMTP — you need a 16-char App Password from Google Account → Security → 2-Step Verification → App passwords), or the host's network blocking outbound SMTP. See `.env.example` for the full SMTP setup, and `render.yaml`/Railway dashboard for where to set `SMTP_EMAIL`/`SMTP_PASSWORD` in production — they were previously undeclared there, so email OTP silently failed on a fresh deploy until someone manually added them.
- **📱 Optional dedicated OTP-sending number** — `OTP_SENDER_SESSION_ID` lets you pair a *second* WhatsApp number purely for sending verification codes, separate from your main bot's chat. **Important:** WhatsApp has no free/anonymous "push notification" sender like Instagram/Meta's own verified numbers — every message, OTP included, has to come from a real, paired WhatsApp account. This just lets that account be a different number than the one running the bot, if you have a second SIM/eSIM to pair. Without it set, OTPs keep using the bot's main number exactly as before.
- **💰 Wallet top-up system** — verified users can now send `.profile` to see their kesh balance/badge, and `.addfunds <amount> <mpesa_code>` (optionally with a screenshot attached) to request a top-up after sending money to the admin's M-Pesa number. **This does not auto-verify payments** — there's no Safaricom Daraja API hookup — every request lands in `/admin → 💰 Payments` as "pending" for a human admin to approve or reject. Approving is the only thing that actually credits the wallet. Each M-Pesa code can only be submitted once (duplicate codes are rejected outright), and the admin gets pinged on WhatsApp the moment a request comes in.
- **🔍 `.checkblocked [number]` (owner/sub-admin)** — best-effort heuristic for whether a number has blocked the bot, based on whether their profile photo can be fetched. WhatsApp doesn't expose a real "blocked" status to bots, so this is a clue, not a guarantee — a private/no-photo account can look identical to a block.
- **🔗 `.checklink [url]`** — heuristic phishing/scam link checker (no external API needed). Flags raw IP domains, risky TLDs, excessive subdomains, brand-lookalike domains, link shorteners, and missing HTTPS, with a ✅/⚠️/🚫 verdict.
- **👑 `.settier [number] [subadmin|coowner]`** — owner-only command to assign any number to any permission tier in one step (instead of separate add/remove commands per tier), and automatically DMs the target number to let them know they've been granted access.
- **📢 `.announce [message]` (owner-only)** — broadcasts a message to every number that has ever messaged the bot (the full `contacts` table, not just a 20-row preview). Queued through the same backend broadcast system the admin panel uses, and sent with a 1.2s delay between each contact to reduce spam-flag risk.
- **🤝 Referral program** — every verified user can run `.referral` to get a personal referral link (`/register?ref=<their number>`). When someone signs up through that link and completes OTP verification, the referrer automatically earns **15 kesh** and the new user gets a **30 kesh** bonus on top of the normal starter credit — both paid instantly, no admin review needed. Self-referral and fake/unverified referral codes are rejected server-side.
- **Faster replies** — every command used to wait through stacked "human-like typing" delays (1–3s+ of pure artificial wait) plus a blocking backend call with a 45s timeout on the hot path. Delays are now minimal and backend logging calls no longer block replies.
- **Auto-welcome DM removed** — brand-new DMers no longer get an automatic welcome message; the bot still saves their contact silently in the background. Use `.register` or the `/register` page if you want them directed to sign up.
- **OTP failures now respond fast & cleanly** — registering used to be able to hang and surface a raw crash (`Cannot read properties of undefined (reading 'id')`) if the bot's WhatsApp session was reconnecting when an OTP was requested. The socket is now only used once it's fully connected, stale sockets are dropped immediately on disconnect, and both the WhatsApp and email send timeouts were cut to 5–6s — so a bad session now fails fast with a clear error instead of hanging.
- **Choice of OTP delivery: WhatsApp or Email** — `/register` now lets the user pick how they want their code delivered, instead of WhatsApp-only. Useful as a fallback if the bot's WhatsApp session is down. Requires `SMTP_EMAIL`/`SMTP_PASSWORD` to be set for the email option to work.
- **New: Bot Panel login (`/panel`)** — after verifying, users get a "🔓 Open Bot Panel" button to sign in with their **name, WhatsApp number, and a password set during registration**, then see their wallet balance, trust badge, referral link, recent M-Pesa top-up requests, and a bot command reference. Passwords are hashed with PBKDF2-HMAC-SHA256 (100,000 iterations, random per-user salt) — never stored in plaintext.
- **🔧 Fixed a dead endpoint** — `api_profile()` existed in the codebase with no `@app.route` decorator, so `/api/profile` never actually worked; it's now wired up (as `POST`, requiring password) and powers the new panel.
- **🔒 Fixed an unauthenticated data-exposure gap** — the unfinished profile endpoint was designed to trust a bare phone number with no password, which would have let anyone who knew/guessed a number view that person's wallet balance and M-Pesa payment history. It now requires the registration password like the rest of the panel.
- **New: `/api/payment-info`** — small public endpoint exposing where to send M-Pesa top-ups, so the panel's top-up form isn't hardcoded.
- **🔒 Security fix — hardcoded login/recovery password removed** — `.login` and `.ownerrecovery` used to fall back to the same hardcoded default password if `BOT_LOGIN_PASS`/`OWNER_RECOVERY_SECRET` weren't set, which meant anyone reading the public source code could log in as owner or hijack bot ownership. Both commands now refuse to run at all until you explicitly set those env vars yourself — no default fallback exists anymore. **If you ever ran an earlier version of this bot, treat the old default password as compromised and set fresh values.**
- **Dead "Welcome Message" toggle removed from `/admin`** — it used to do nothing since the auto-welcome DM feature was removed; the toggle no longer appears.
- **Register button added to the landing page** — `/register` is now linked directly from the nav bar, mobile menu, and hero section, not just discoverable via `.register` in chat.
- **SQLite WAL mode enabled** — reduces lock-contention stalls when multiple sessions write to the DB at the same time.
- **`.register` command added** — DM the bot `.register` to get the web panel link directly in chat, no need to know the URL.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI DM Chat | Auto-replies in Swahili, Sheng & English via Groq LLaMA3 |
| 👥 Group AI Replies | Replies in groups when mentioned or name is called |
| 📸 Status AI Comments | Leaves human-like comments on WhatsApp statuses |
| 📷 View-Once Save | Saves & forwards view-once photos/videos to the bot's own number (owner-only to view) |
| 🌝 Reaction Recovery | Bot admins react 🌝 on any message (or view-once) to privately recover it to the bot's own number |
| ⏰ Message Scheduler | Schedule messages to any number at any time |
| 🛡️ Permissions System | Control what commands each member can use |
| 📥 Media Downloader | YouTube, TikTok, Instagram videos & MP3, plus a universal downloader (`.dl`) covering Facebook, Twitter/X, SoundCloud & more |
| 🔄 Media Converter | Universal media converter (`.convertmedia`) — convert replied images/video/audio between common formats |
| 🖼️ Sticker Maker | Convert images/videos to WhatsApp stickers |
| 🔇 Anti-Call | Auto-rejects all incoming calls |
| 📢 Broadcast | Send messages to all groups at once (owner only) |
| 🔐 Login System | Anyone with credentials gets full owner access |
| 👑 Owner + Co-Owner | Primary owner can add co-owners with full access |
| 🛡️ Sub-Admins | Grant limited bot admin powers to trusted people |
| 🌐 Web Pairing | Pair via QR code or pairing code in browser |
| 💰 Wallet & Top-Ups | `.profile` shows balance/badge; `.addfunds` submits an M-Pesa top-up for admin approval (manual review, not auto-verified) |
| 🤝 Referral Program | `.referral` gets your link; earn 15 kesh per verified signup, they get 30 kesh — paid instantly |
| 📣 Mass Announcement | `.announce [message]` — owner-only broadcast to every bot contact, rate-limited |
| 🔍 Block Checker | `.checkblocked [num]` — heuristic check, owner/sub-admin only |
| 🔗 Link Safety Checker | `.checklink [url]` — heuristic phishing/scam URL screen, no API key needed |
| 🔑 Owner Recovery | Emergency passphrase to change owner number at runtime |
| 👥 Bulk Group Add | Create a group or add to one from a plain list of numbers |
| ⏳ Subscription Expiry | Set a paid-access expiry date per session from the admin panel |
| 🔒 Paid Pairing / Activation Keys | New customer sessions come up locked until the admin approves them from WhatsApp with a plain `yes`/`no` — see [Paid Pairing](#-paid-pairing--activation-keys) below |
| 🔑 Keyword Auto-Replies | Set custom trigger words/phrases in the admin panel — bot auto-replies instantly, no AI call needed |
| ⚙️ Feature Toggles | Turn AI chat, downloads, keywords, or welcome message on/off for the whole bot from the admin panel |
| 💾 Auto-Save Statuses | Saves contacts' status images/videos to disk before they expire in 24h |
| 🚫 Anti-Link | Deletes links posted by non-admins in groups, warns, kicks after 3 strikes |
| 🔘 Tappable Menu | `.menu` includes quick-reply buttons (Ping/Runtime/My Perms) alongside the full text menu — buttons fall back silently if WhatsApp doesn't render them for that client |
| 🌟 Web Panel Registration | Self-serve `/register` page — WhatsApp OTP verification unlocks starter credits + a trust badge, manageable from the admin panel |
| 📤 Share/Forward | `.share <number>` — reply to any message to forward it (text or media) to another number |
| 🎨 AI Image Gen | `.imagine [prompt]` — free keyless image generation via Pollinations.ai, no DALL-E/Flux API key needed |
| 🔊 Text-to-Speech | `.tts [text]` — converts any text (up to 200 chars) into a WhatsApp voice note via Google TTS |
| 🤖 Per-Chat AI Model | `.model [name]` — switch the Groq AI model per-chat without changing global config (`llama`, `llama8`, `mixtral`, `gemma`) |
| ⏰ Scheduler Admin View | `/admin → Scheduler` — view & cancel any pending `.schedule`d message without WhatsApp access |
| 👁️ View-Once Admin Browser | `/admin → View-Once` — browse recently intercepted view-once media from the panel |
| 💾 Persistent Storage | DB, WhatsApp sessions, and saved media all live under a configurable `DATA_DIR`, survivable across redeploys with a mounted disk |
| 🛡️ Anti-Ban Protection | Per-session rate limiting, warm-up ramping, health monitoring, JID/LID canonicalization, session-decrypt health tracking, device fingerprinting, read-receipt jitter, and `creds.json` auto-backups — all on by default. See [Anti-Ban Protection](#-anti-ban-protection) below |

---

## 🛡️ Anti-Ban Protection

Every session's socket is wrapped with [`baileys-antiban`](libs/baileys-antiban), bundled locally in `libs/`. Most of it is **on automatically** — nothing to configure:

| Module | What it does |
|---|---|
| Rate limiter + warm-up | Caps sends/minute/hour/day and ramps a fresh number up gradually over the first few days instead of blasting from day 1 |
| Health monitor | Scores ongoing risk and auto-throttles + DMs the owner on high/critical risk (`.antibanstats` to check anytime) |
| JID/LID canonicalizer | Stops `@lid` vs `@s.whatsapp.net` variants of the same contact from double-counting against your limits |
| Session stability monitor | Tracks Bad-MAC/decrypt error rates and flags a degrading session before it fully drops |
| Topology throttler | Separate, tighter cap specifically on messaging *new* contacts |
| Legitimacy signals | Human-like typing pauses/read gaps on outgoing sends |
| Group-op guard | Rate-limits group add/remove/create actions |
| Deaf-session detector | Catches a socket that looks connected but has silently stopped delivering, and force-reconnects it |
| Device fingerprint | Randomized-but-stable (per session) browser/OS/app-version identity, instead of every session reporting the same fixed string |
| Read-receipt variance | Jittered delay before marking messages read, instead of instant every time |
| `creds.json` backups | Rolling snapshots, auto-taken ~5s after every save — `.credssnapshot` / `.credsrestore` to manage manually |

A few extras need real external resources, so they stay **off until you set an env var** for them (see `.env.example`):

| Module | Enable with |
|---|---|
| Proxy rotation | `ANTIBAN_PROXY_LIST` — comma-separated proxy URLs; rotates on disconnect |
| Risk-change webhooks | `ANTIBAN_WEBHOOK_URL` / `ANTIBAN_TELEGRAM_BOT_TOKEN`+`ANTIBAN_TELEGRAM_CHAT_ID` / `ANTIBAN_DISCORD_WEBHOOK_URL` |
| Broadcast scheduler | `ANTIBAN_SCHEDULER_ENABLED=true` — restricts `.announce`/admin bulk broadcasts to safe hours only (never affects normal command replies) |

Set the overall aggressiveness with `ANTIBAN_PRESET` — `conservative` / `moderate` (default) / `aggressive` / `high-volume`.

### Owner exemption + notify-only mode

Every per-contact risk check above (health-pause, timelock, warm-up, contact-graph, topology, reply-ratio, reconnect-throttle) used to **hard-block** the send outright — including the owner's own commands. On a brand-new session with zero conversation history, that meant `.menu` could fail against the owner's own number (0% reply ratio on self-chat, nothing to divide yet).

Fixed:
- **The owner's own number is now always exempt** from every one of these checks, no config needed.
- **Everyone else defaults to notify-only** (`ANTIBAN_NOTIFY_ONLY=true`, the default): the send still goes through, but the owner gets a WhatsApp disclaimer (`⚠️ Sent despite risk flag ...`) instead of the command just failing. Set `ANTIBAN_NOTIFY_ONLY=false` to restore the old hard-block behavior.

This trades some real ban protection for the bot never appearing "dead" — a deliberate choice made at the owner's request. Genuine spam-loop guards (identical-message detection, group rate limits, cross-instance pool limits) are unaffected and still hard-block.

The admin panel's Sessions list shows a live risk badge (🛡️ LOW/MEDIUM/HIGH/CRITICAL) and warm-up day per session.

## 📋 Commands

### 👤 Public (everyone)
| Command | Description |
|---|---|
| `.menu` | Show full command menu with photo |
| `.ping` | Check bot response speed |
| `.runtime` | Uptime & system stats |
| `.weather [city]` | Live weather info |
| `.dict [word]` | Dictionary definition |
| `.roll [XdY+Z]` | Roll dice e.g `.roll 3d6+2` 🎲 |
| `.checklink [url]` | Heuristic check for suspicious/phishing links |
| `.myperm` | Check your permission level |
| `.register` | Get the web panel registration link (free credits + trust badge) |
| `.profile` | View your wallet balance, trust badge & recent top-up requests |
| `.addfunds [amount] [mpesa_code]` | Submit an M-Pesa top-up for admin review (attach a screenshot for faster approval) |
| `.referral` | Get your referral link, track signups & kesh earned |
| `.imagine [prompt]` | 🎨 AI image generation via Pollinations.ai — free, no API key needed (e.g. `.imagine a lion in cyberpunk style`) |
| `.tts [text]` | 🔊 Text-to-speech — converts text to a WhatsApp voice note (max 200 chars) |
| `.model [name]` | 🤖 Switch AI model per-chat: `llama`, `llama8`, `mixtral`, `gemma` — uses your existing Groq key |
| `.pair` | 🔗 Link your OWN WhatsApp number as a brand new, separate bot session — right here in chat (choose QR or pairing code, no website needed) |
| `/ask [query]` | Ask AI anything |

### 🔒 Paid Pairing (unactivated sessions only)
| Command | Description |
|---|---|
| `.pair key` | Request activation — pings the admin on WhatsApp for approval |
| `.key XXXXXXXX` | Redeem the 8-character key the admin sent you (valid 10 minutes) |

### 🔐 Access / Login
| Command | Description |
|---|---|
| `.login Henry 7lq4mv00` | Unlock full owner access for this session |
| `.logout` | Remove your session access |

> Anyone with the credentials gets full access to all commands. Access resets when the bot restarts.  
> Change the password by setting `BOT_LOGIN_PASS` in your Render env vars.

### 📥 Media (everyone)
| Command | Description |
|---|---|
| `.sticker` | Reply to image/video to make sticker |
| `.vv` | Reply to voice note to re-send as audio |
| `.save` | Reply to video/image to save it |
| `.getpp [@user]` | Get a profile picture. Your own picture, or one from a reply/@mention in the current chat, works for everyone. Looking it up by typing an arbitrary phone number is owner/co-owner/sub-admin only. |
| `.share <number>` | Reply to any message (text or media) to forward it to that number |
| `.about [@user]` | Get someone's WhatsApp About status text (works even unsaved) |
| `.download [url]` | Download video (YT/TikTok/IG) |
| `.song [url]` | Extract MP3 audio from video URL |
| `.dl [url] (audio)` | 🌐 Universal downloader — YouTube, TikTok, Instagram, Facebook, Twitter/X, SoundCloud & most yt-dlp-supported sites. Add `audio` to grab MP3 instead of video |
| `.convertmedia [format]` | 🔄 Universal media converter — reply to an image/video/audio file to convert it (mp3, mp4, wav, ogg, opus, m4a, png, jpg, webp, gif, webm) |
| `.convert [amt] [from] [to]` | Currency converter e.g `.convert 100 USD KES` |

### 🎮 Games (everyone)
| Command | Description |
|---|---|
| `.hangman` | Start a hangman game — reply with single letters to guess. `.hangman stop` ends it |
| `.trivia` | Random trivia question — reply with your answer |
| `.guess [max]` | Number guessing game, default range 1–100 — reply with a number |
| `.truth` | Truth or Dare: get a Truth prompt |
| `.dare` | Truth or Dare: get a Dare prompt |
| `.wyr` | Would You Rather — random prompt |

### 🔎 Lookup Tools (everyone)
| Command | Description |
|---|---|
| `.validate [number]` | Check a phone number's format/region — parsing only, no lookup of any account |
| `.ipinfo [ip]` | Public geo/ASN info for an IP address (ip-api.com) |
| `.whois [domain]` | Public WHOIS/RDAP registration data for a domain (rdap.org) |

> Deliberately scoped to public infrastructure data. No username/person reverse-lookup, no WhatsApp-registration checking on arbitrary numbers, no profile data pulled without the target's consent.

### 🛡️ Group Admin (bot admin / sub-admin)
| Command | Description |
|---|---|
| `.tagall [msg]` | Tag all group members |
| `.kick [@user]` | Remove a member |
| `.add [number]` | Add a member |
| `.promote [@user]` | Make someone group admin |
| `.demote [@user]` | Remove admin status |
| `.mute` | Mute group (admins only can message) |
| `.unmute` | Unmute group |
| `.revoke` | Reset invite link |
| `.antispam on/off` | Toggle antispam |
| `.setperm @user [level]` | Set member permission level |
| `.resetperm @user` | Reset to default permissions |
| `.listperms` | List all custom permissions in group |

### 👑 Owner Only
| Command | Description |
|---|---|
| `.addadmin [number]` | Add a sub-admin |
| `.removeadmin [number]` | Remove a sub-admin |
| `.listadmins` | List all sub-admins |
| `.addcoowner [number]` | Add a co-owner (full owner powers) |
| `.removecoowner [number]` | Remove a co-owner |
| `.settier [number] [subadmin\|coowner]` | Assign any number to any permission tier; auto-DMs them an access notification |
| `.announce [message]` | Broadcast a message to every number that's ever messaged the bot |
| `.checkblocked [number]` | Heuristic check for whether a number has blocked the bot (not 100% reliable — WhatsApp has no official "blocked" signal) |
| `.listcoowners` | List all co-owners |
| `.bcgc [msg]` | Broadcast message to all groups |
| `.creategroup [name] \| [numbers]` | Create a new group from a plain list of numbers, e.g. `.creategroup Squad \| 254712345678,254798765432` |
| `.addtogroup [numbers]` | Run inside a group to bulk-add a plain list of numbers to it |
| `.bio [text]` | Update bot WhatsApp bio |
| `.pp` | Update bot profile picture (reply to image) |
| `.status` | Post image as WhatsApp status (reply to image) |
| `.welcome [number]` | Send welcome card to a number |
| `.public` | Set bot to public mode (everyone can use) |
| `.private` | Set bot to private mode (owner & admins only) |
| `.setmode on/off` | Toggle bot fully on or off |
| `.summarize [text]` | AI-powered text summarizer |
| `.pbp [action]` | RPG play-by-post session tracker |
| `.ownerrecovery [passphrase] [new_number]` | Emergency owner number change |
| `.schedule add [time] [to] [msg]` | Schedule a message |
| `.schedule list` | View all scheduled messages |
| `.schedule del [ID]` | Cancel a scheduled message |
| `.schedule repeat [ID] daily/weekly` | Repeat a schedule |
| `/paint [text]` | Generate a text image |
| `/recover [number]` | Recover deleted messages — sent to the bot's own number, not the chat (owner only) |
| `/viewonce [number]` | View saved view-once media — sent to the bot's own number, not the chat (owner only) |
| 🌝 *(react, not a command)* | React 🌝 on any message or view-once to forward it to the bot's own number (bot admins only) |
| `/download_video [url]` | Download & send video |
| `/download_song [url]` | Download & send MP3 |
| `.antibanstats` | Health/rate-limit/warm-up/session status for this number |
| `.credssnapshot` | Manually back up `creds.json` right now |
| `.credsrestore` | Restore `creds.json` from the latest backup (needs a bot restart to take effect) |

---

## 🤖 Human-like AI Behaviour

The bot behaves like a real person across three contexts:

### DM Chat
Replies to every plain message in DMs — detects language automatically and responds in the same language (Sheng, Swahili, English, or mix).

### Group Replies
Replies in groups when someone:
- **Mentions** the bot (`@bot`)
- **Replies directly** to one of the bot's own messages

(No longer triggers on the word "bot"/"henry" appearing anywhere in a message — that used to cause false triggers on unrelated chat.)

Replies are short and casual, like a real group member.

### Status Comments
When someone posts a WhatsApp status:
1. Bot auto-reads and reacts with ❤️
2. Bot leaves a short human-like AI comment on text statuses

---

## ⏰ Scheduler Examples

```
.schedule add 14:30 here Reminder: meeting now!
.schedule add 08:00am 254712345678 Good morning! ☀️
.schedule add 30m here Call me back in 30 mins
.schedule add 2h 254700000000 I'll be there soon
.schedule repeat ABC12 daily
.schedule list
.schedule del ABC12
```

---

## 🛡️ Permission Levels

| Level | Who sets it | Access |
|---|---|---|
| `superadmin` 👑 | group admin | All commands |
| `trusted` ⭐ | group admin | All except blocked |
| `member` 👤 | default | Standard commands |
| `restricted` 🔒 | group admin | Only explicitly allowed commands |

```
.setperm @henry trusted
.setperm @henry restricted +help,ping
.setperm @henry trusted -sticker,download
```

---

## 🔑 Owner Recovery

If you lose access to your original number:
```
.ownerrecovery 7lq4mv00 254NEWPHONE
```

> ⚠️ Set `OWNER_RECOVERY_SECRET` in Render env vars to change the default passphrase. Silent on wrong input.

---

## 🔑 Keyword Auto-Replies (Admin Panel)

Set up canned responses to trigger words from the **🔑 Keywords** tab in `/admin` — no AI call, no slash prefix needed:

1. Open `/admin` → **Keywords** tab
2. Enter a trigger word/phrase, pick a match type, and write the reply:
   - **Contains** — fires if the trigger appears anywhere in the message (e.g. trigger `price` matches "what's your price?")
   - **Exact match** — message must be exactly the trigger
   - **Starts with** — message must start with the trigger
3. Click **Save Keyword** — it's checked on every incoming message before any command, so it works even from strangers who've never messaged the bot before
4. Toggle a keyword ON/OFF or delete it any time from the same list

This whole feature can also be killed bot-wide from the **Features** tab without deleting any keywords.

---

## ⚙️ Feature Toggles (Admin Panel)

The **⚙️ Features** tab in `/admin` lets you flip entire modules on/off instantly, no redeploy:

| Toggle | Affects |
|---|---|
| AI Chat | `/ask` command |
| Downloads | `/download_video`, `/download_song` |
| Keyword Auto-Replies | The keyword system above |
| Welcome Message | New-session welcome text |

When a feature is off, the bot replies with a short "currently disabled by the admin" message instead of running the command.

---

## 🛡️ Bot Panel Registration, OTP & Trust Badges

A self-serve page at **`/register`** lets anyone register their WhatsApp number on the bot panel and get verified:

1. User enters their **WhatsApp number and name** at `/register`, and chooses how to receive their code: **📱 WhatsApp** (default — sent as a message from the bot itself, no email/SMS gateway needed) or **📧 Email** (useful if the bot's WhatsApp session is temporarily down).
2. A 6-digit OTP is generated and sent via the chosen method.
3. User enters the OTP on the same page to verify.
4. On success, the number is awarded a **🛡️ Trusted badge** and **80 kesh free credit** automatically.

**Forgot your panel password?** On the `/panel` login screen, tap **"Forgot password?"**, enter your registered WhatsApp number, and a 6-digit reset code is sent to that same number. Enter it with a new password (6+ characters) to regain access — no admin involvement needed. The reset code expires after 10 minutes and allows 5 wrong guesses before you have to request a new one.

**Setup:** the WhatsApp delivery option needs nothing extra — it reuses your already-paired WhatsApp session. Adjust the starter credit with `REG_STARTER_CREDITS`. The **email delivery option requires `SMTP_EMAIL`/`SMTP_PASSWORD`** to be set (see `.env.example`) — without them, picking "Email" on the register page returns a clear "email service not configured" error instead of failing silently. **Using Gmail:** `SMTP_PASSWORD` must be a 16-character **App Password** (Google Account → Security → 2-Step Verification → App passwords) — Gmail rejects your normal account password for SMTP logins.

**Optional — a separate number just for OTPs:** by default OTP WhatsApp messages are sent from the same number the main bot runs on. If you'd rather they came from a dedicated number (so OTPs don't sit in your main bot's chat history), pair a second WhatsApp number at `/pair` and set its session name as `OTP_SENDER_SESSION_ID`. Note there's no free/anonymous "push notification" channel like Instagram's own verified sender numbers — WhatsApp only delivers from a real, paired account, so this still needs an actual second SIM/eSIM behind it.

**Admin side:** the **🛡️ Registrations** tab in `/admin` lists every registered user (verified status, badge, credit balance) and lets you **manually top up credit** for any number — just enter their phone + name (no OTP required, since the main bot already has their contact saved). This is also how you'd add credit for a number that hasn't self-registered yet.

This system is intentionally lightweight (SQLite-backed, same DB as the rest of the bot) so it's ready to plug into a future paid top-up flow without restructuring.

---

## 💰 Wallet Top-Ups (M-Pesa, admin-reviewed)

Verified users can fund their kesh wallet by sending real money to the admin's M-Pesa number and submitting the transaction code:

1. User sends money via M-Pesa to `ADMIN_PAYTO_NUMBER` (set this env var — it's just for your own reference/communication to users, nothing automatic reads it).
2. User sends `.addfunds [amount] [mpesa_code]` to the bot — e.g. `.addfunds 200 QFG7H8J9K0`. Attaching the M-Pesa confirmation screenshot (sent with the command as a caption, or replied to) is optional but speeds up review.
3. The request is queued as **pending** — nothing is credited yet.
4. The admin gets pinged on WhatsApp immediately, and reviews it in `/admin → 💰 Payments`: each entry shows the phone, amount, code, and screenshot (if any), with **Approve**/**Reject** buttons.
5. Approving instantly adds the kesh to that user's wallet and notifies them; rejecting notifies them too, with an optional reason.

**This is intentionally NOT automatic.** There's no Safaricom Daraja API integration here, so there's no way to programmatically confirm a code or screenshot is genuine — this flow keeps a human in the loop instead of pretending to auto-verify, which is what most "fake payment bot" scams rely on. Each M-Pesa code can only be submitted once; a reused/duplicate code is rejected outright before it even reaches the admin queue.

Users can check their balance and submission history anytime with `.profile`.

---

## 🤝 Referral Program

Verified users can earn kesh by inviting people who go on to verify their own number:

1. User sends `.referral` to the bot — gets back a personal link: `{publicUrl}/register?ref=<their phone>`.
2. They share that link. Anyone who registers through it has the referral code captured automatically (no extra step for the new user).
3. When the **new user** completes OTP verification, two payouts happen instantly, with no admin review:
   - The **referrer** gets `REFERRAL_REFERRER_BONUS` kesh (default **15**).
   - The **new user** gets `REFERRAL_REFERRED_BONUS` kesh (default **30**) — on top of the normal `REG_STARTER_CREDITS`.
4. Both amounts are configurable via env vars (`REFERRAL_REFERRER_BONUS`, `REFERRAL_REFERRED_BONUS`) without code changes.

**Anti-abuse:** a referral code is just the referrer's own phone number, so the backend rejects self-referral (`ref === phone`) and any code that doesn't belong to an already-verified account — you can't invent a fake code to farm bonus credits. Each new user can only trigger one referral payout, recorded in the `referrals` table, which `.referral` also reads from to show total signups and kesh earned.

---

## 📣 Mass Announcements (Owner Only)

`.announce [message]` queues a broadcast to **every number that has ever messaged the bot** — pulled from the full `contacts` table, not just the 20 most recent shown on the admin dashboard. It reuses the same broadcast queue the admin panel's "Send to all contacts" button uses, polled by the Node bridge every 20 seconds and sent with a 1.2-second delay between each message to reduce the chance of WhatsApp flagging the account for spam-like behavior. Only the main owner can run this command.

---

## ⏳ Subscription Expiry (Admin Panel)

For paid/client sessions, set an expiry date and time per session directly from `/admin`:

1. Open `/admin` and find the session card for the client's number
2. Pick a date & time in the **Set Expiry** field and click **Set Expiry**
3. Once that time passes, the bot auto-replies with a "subscription expired, contact owner" message to anyone who messages that session — the owner number is always exempt, so you're never locked out
4. Click **Clear** on a session to remove its expiry and restore full access

Expiry status (active/expired countdown) is checked automatically every 30 seconds and survives the bot reconnecting/restarting since it lives in the admin server, not the bot session itself.

---

## 🔒 Paid Pairing / Activation Keys

Every **new customer session** that pairs (via `/pair` in the browser or scanning the QR code) comes up **locked** by default — separate from, and prior to, the manual expiry system above. It's the flow for selling access to strangers who pair their own number to your bot:

1. A freshly-paired customer sends `.pair key`
2. You (the admin, on `OWNER_NUMBER`) get a WhatsApp message with their number and session ID
3. Reply **`yes`** to approve for the default number of days, **`yes 45`** for a custom day count, or **`no`** to decline — right from the chat, no panel needed
4. On approval, the customer automatically receives an 8-character activation key, valid **10 minutes**
5. They send it back as `.key XXXXXXXX` and their session unlocks for however many days you granted
6. Your own `OWNER_NUMBER` session is **never** locked and is exempt from this whole flow

**Master bypass key:** a permanent override key is auto-generated the first time a session needs one. Any customer can send `.key <bypass key>` to activate instantly and permanently, skipping the approval step — useful for VIPs or test numbers. View or change it, plus the default day count new approvals grant, from `/admin` → **🔑 Activation** tab, which also lists every session's lock/pending/active status and lets you approve or deny requests from the browser instead of WhatsApp.

> ⚠️ Treat the bypass key like a password — anyone who has it can activate any session for free, forever.

---

## 🚀 Deploy on Render

1. Fork this repo
2. Create a **Render Web Service** → Docker
3. Set these env vars in Render dashboard:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `OWNER_NUMBER` | Your WhatsApp number e.g. `254712345678` |
| `OWNER_NAME` | `Henry Ochibots` |
| `BOT_NAME` | `Henry Ochibots v19™` |
| `BOT_LOGIN_USER` | Login username (default: `Henry`) |
| `BOT_LOGIN_PASS` | Login password (default: `7lq4mv00`) |
| `ADMIN_PASSWORD` | Password to protect the `/admin` panel |
| `OWNER_RECOVERY_SECRET` | Your secret recovery passphrase |
| `CO_OWNERS` | Comma-separated numbers for co-owners (optional) |
| `SUB_ADMINS` | Comma-separated numbers for sub-admins (optional) |
| `DATA_DIR` | Where the DB, sessions & media live — `render.yaml` already sets this to `/app/data` and mounts a persistent disk there for you |

4. Visit `your-app.onrender.com/pair` to link your WhatsApp number

> ⚠️ **Railway users:** `railway.json` doesn't declare a disk the way `render.yaml` does. Add a **Volume** in your Railway service settings, mount it at e.g. `/app/data`, and set `DATA_DIR` to that same path — otherwise every redeploy wipes your WhatsApp session, DB, and scheduled messages, and you'll have to re-pair from scratch.

---

## 🔒 Security Notes

- `/admin` password can be reset via "Forgot password?" — sends a WhatsApp OTP to `OWNER_NUMBER` only. Requires `OWNER_NUMBER` to be set; if it isn't, the reset button tells you so instead of silently failing.
- `/panel` password can be reset via "Forgot password?" — sends a WhatsApp OTP to the account's own registered number. No admin involvement needed.
- Both logins (`/admin`, `/panel`) lock out for 5 minutes after 5 wrong password attempts, tracked server-side (per client IP for `/admin`, per account for `/panel`) — the error message doesn't distinguish "wrong password" from "locked out," so an attacker can't detect when they've been rate-limited.
- Both reset-code entry steps allow at most 5 wrong-code guesses before the code is invalidated and a new one must be requested — a 6-digit code otherwise has only 1,000,000 possibilities, so an attempt limit is essential.
- Admin password comparisons use `secrets.compare_digest` (constant-time), not `==`, to avoid timing side-channels.
- Every response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and `Referrer-Policy: no-referrer` — the last one specifically protects the `?pass=` query-string token used by `/admin` from leaking via the `Referer` header on outbound links.
- `/recover` and `/viewonce` are **owner-only**, and now always reply to the **bot's own number** instead of the chat the command was typed in — keeps deleted messages/view-once media from leaking into groups
- 🌝 reaction recovery is **bot-admin only** (owner/co-owner/sub-admin) — reactions from anyone else are silently ignored, and results always go to the bot's own number
- `.tagall` requires bot admin (owner or sub-admin)
- `.bcgc` is **owner-only**
- Admin panel (`/admin`) is password-protected via `ADMIN_PASSWORD` — supports blacklist management, message search, broadcast, keyword auto-replies, and feature toggles
- ⚠️ If `ADMIN_PASSWORD` is **not** set, `/admin` is fully open to anyone with the URL — always set it before going live (the bot logs a warning on startup if it's missing)
- Keyword auto-replies are checked before commands but skip blacklisted senders
- Tappable menu buttons are best-effort: WhatsApp periodically changes how it renders Baileys-sent buttons. If they stop showing up for some users, the text/image menu (which always works) is sent first regardless — disable the toggle in Features if it ever causes errors in your logs
- `.song`, `.download`, `.dl`, and `.convertmedia` use `execFile` (no shell injection risk)
- Mode changes persist across messages (stored in global state)
- `.login` is rate-limited to 3 failed attempts per number per 10 minutes
- `.login` usage hint never reveals the real username/password — change credentials via `BOT_LOGIN_USER` / `BOT_LOGIN_PASS` env vars
- `.getpp` and `.about` work even for numbers not saved in contacts (verified via WhatsApp lookup where possible). `.getpp` no longer hard-rejects numbers WhatsApp's lookup can't confirm (privacy settings can cause false negatives) — it always attempts the fetch, and folds in the same heuristic as `.checkblocked` into the error message if it fails, so you immediately see whether it looks like a block vs. just no photo/private settings
- `/admin → View-Once` and its underlying file endpoint (`/admin/viewonce/file/<name>`) require `ADMIN_PASSWORD` just like every other `/admin/*` data route — this serves private media intercepted from other people's chats, not public assets. The filename is sanitized to its basename server-side so it can't be used for path traversal.
- `.share` only forwards content the requester can already see (something in a chat the bot is in) — it doesn't grant access to anything the requester couldn't otherwise reach
- `session-detail`, `register-session`, `update-session`, `check-terminate`, and `broadcast/pending` now all require `ADMIN_PASSWORD` too — these were previously missing it while every other `/admin/*` route had it. `session-detail` also had its message content HTML-escaped to close a stored-XSS hole. The bridge sends the password itself now, so this doesn't affect your own bot's session tracking or broadcasts.
- `.getpp` on an arbitrary typed-in number (not a reply/@mention/self-lookup) now requires owner/co-owner/sub-admin — arbitrary phone-number-to-photo lookups by any random user were previously wide open.

---

**Made with ❤️ by Henry Ochibots | @henrytech254**
