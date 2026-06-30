# 🔥 Henry Ochibots v19™

> **WhatsApp automation bot built by [@henrytech254](https://github.com/henrytech254)**  
> Baileys (Node.js) + Python backend | Deployed on Render / Railway

---

## 🩹 Recent fixes

- **Faster replies** — every command used to wait through stacked "human-like typing" delays (1–3s+ of pure artificial wait) plus a blocking backend call with a 45s timeout on the hot path. Delays are now minimal and backend logging calls no longer block replies.
- **First-message welcome was silent** — the backend always computed a welcome message for brand-new DMers, but nothing ever sent it. New contacts now actually receive it on their first message.
- **SQLite WAL mode enabled** — reduces lock-contention stalls when multiple sessions write to the DB at the same time.
- **`.register` command added** — DM the bot `.register` to get the web panel link directly in chat, no need to know the URL.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI DM Chat | Auto-replies in Swahili, Sheng & English via Groq LLaMA3 |
| 👥 Group AI Replies | Replies in groups when mentioned or name is called |
| 📸 Status AI Comments | Leaves human-like comments on WhatsApp statuses |
| 📷 View-Once Save | Saves & forwards view-once photos/videos (owner-only to view) |
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
| 🔑 Owner Recovery | Emergency passphrase to change owner number at runtime |
| 👥 Bulk Group Add | Create a group or add to one from a plain list of numbers |
| ⏳ Subscription Expiry | Set a paid-access expiry date per session from the admin panel |
| 🔑 Keyword Auto-Replies | Set custom trigger words/phrases in the admin panel — bot auto-replies instantly, no AI call needed |
| ⚙️ Feature Toggles | Turn AI chat, downloads, keywords, or welcome message on/off for the whole bot from the admin panel |
| 💾 Auto-Save Statuses | Saves contacts' status images/videos to disk before they expire in 24h |
| 🚫 Anti-Link | Deletes links posted by non-admins in groups, warns, kicks after 3 strikes |
| 🔘 Tappable Menu | `.menu` includes quick-reply buttons (Ping/Runtime/My Perms) alongside the full text menu — buttons fall back silently if WhatsApp doesn't render them for that client |
| 🌟 Web Panel Registration | Self-serve `/register` page — email OTP verification unlocks starter credits + a trust badge, manageable from the admin panel |

---

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
| `/ask [query]` | Ask AI anything |

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
| `.getpp [@user]` | Get someone's profile picture (works even unsaved) |
| `.about [@user]` | Get someone's WhatsApp About status text (works even unsaved) |
| `.download [url]` | Download video (YT/TikTok/IG) |
| `.song [url]` | Extract MP3 audio from video URL |
| `.dl [url] (audio)` | 🌐 Universal downloader — YouTube, TikTok, Instagram, Facebook, Twitter/X, SoundCloud & most yt-dlp-supported sites. Add `audio` to grab MP3 instead of video |
| `.convertmedia [format]` | 🔄 Universal media converter — reply to an image/video/audio file to convert it (mp3, mp4, wav, ogg, opus, m4a, png, jpg, webp, gif, webm) |
| `.convert [amt] [from] [to]` | Currency converter e.g `.convert 100 USD KES` |

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
| `.settier [number] [subadmin\|coowner]` | Assign any number to any permission tier; auto-DMs them an access notification | Remove a co-owner |
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
| `/recover [number]` | Recover deleted messages (owner only) |
| `/viewonce [number]` | View saved view-once media (owner only) |
| `/download_video [url]` | Download & send video |
| `/download_song [url]` | Download & send MP3 |

---

## 🤖 Human-like AI Behaviour

The bot behaves like a real person across three contexts:

### DM Chat
Replies to every plain message in DMs — detects language automatically and responds in the same language (Sheng, Swahili, English, or mix).

### Group Replies
Replies in groups when someone:
- **Mentions** the bot (`@bot`)
- **Calls its name** — says "henry", "ochibots", or "bot" in the message

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

1. User enters their **WhatsApp number, name, and email** at `/register`.
2. A 6-digit OTP is generated and **emailed** to them (free, via SMTP — no WhatsApp message or paid SMS gateway needed).
3. User enters the OTP on the same page to verify.
4. On success, the number is awarded a **🛡️ Trusted badge** and **80 kesh free credit** automatically.

**Setup:** set `SMTP_EMAIL` and `SMTP_PASSWORD` in your `.env` (a Gmail account + [app password](https://myaccount.google.com/apppasswords) works out of the box). Adjust the starter credit with `REG_STARTER_CREDITS`.

**Admin side:** the **🛡️ Registrations** tab in `/admin` lists every registered user (verified status, badge, credit balance) and lets you **manually top up credit** for any number — just enter their phone + name (no OTP required, since the main bot already has their contact saved). This is also how you'd add credit for a number that hasn't self-registered yet.

This system is intentionally lightweight (SQLite-backed, same DB as the rest of the bot) so it's ready to plug into a future paid top-up flow without restructuring.

---

## ⏳ Subscription Expiry (Admin Panel)

For paid/client sessions, set an expiry date and time per session directly from `/admin`:

1. Open `/admin` and find the session card for the client's number
2. Pick a date & time in the **Set Expiry** field and click **Set Expiry**
3. Once that time passes, the bot auto-replies with a "subscription expired, contact owner" message to anyone who messages that session — the owner number is always exempt, so you're never locked out
4. Click **Clear** on a session to remove its expiry and restore full access

Expiry status (active/expired countdown) is checked automatically every 30 seconds and survives the bot reconnecting/restarting since it lives in the admin server, not the bot session itself.

---

## 🚀 Deploy on Render

1. Fork this repo
2. Create a **Render Web Service** → Docker
3. Set these env vars in Render dashboard:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `OWNER_NUMBER` | Your WhatsApp number e.g. `254141915668` |
| `OWNER_NAME` | `Henry Ochibots` |
| `BOT_NAME` | `Henry Ochibots v19™` |
| `BOT_LOGIN_USER` | Login username (default: `Henry`) |
| `BOT_LOGIN_PASS` | Login password (default: `7lq4mv00`) |
| `ADMIN_PASSWORD` | Password to protect the `/admin` panel |
| `OWNER_RECOVERY_SECRET` | Your secret recovery passphrase |
| `CO_OWNERS` | Comma-separated numbers for co-owners (optional) |
| `SUB_ADMINS` | Comma-separated numbers for sub-admins (optional) |

4. Visit `your-app.onrender.com/pair` to link your WhatsApp number

---

## 🔒 Security Notes

- `/recover` and `/viewonce` are **owner-only**
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
- `.getpp` and `.about` work even for numbers not saved in contacts (verified via WhatsApp lookup)

---

**Made with ❤️ by Henry Ochibots | @henrytech254**
