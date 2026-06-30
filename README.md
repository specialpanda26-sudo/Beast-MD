# 🔥 Henry Ochibots v19™

> **WhatsApp automation bot built by [@henrytech254](https://github.com/henrytech254)**  
> Baileys (Node.js) + Python backend | Deployed on Render / Railway

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
| 📥 Media Downloader | YouTube, TikTok, Instagram videos & MP3 |
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
| `.myperm` | Check your permission level |
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
- Admin panel (`/admin`) is password-protected via `ADMIN_PASSWORD` — supports blacklist management, message search, and broadcast
- `.song` and `.download` use `execFile` (no shell injection risk)
- Mode changes persist across messages (stored in global state)
- `.login` is rate-limited to 3 failed attempts per number per 10 minutes
- `.login` usage hint never reveals the real username/password — change credentials via `BOT_LOGIN_USER` / `BOT_LOGIN_PASS` env vars
- `.getpp` and `.about` work even for numbers not saved in contacts (verified via WhatsApp lookup)

---

**Made with ❤️ by Henry Ochibots | @henrytech254**
