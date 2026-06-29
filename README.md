# 🔥 Henry V19™ Beast Bot

> **WhatsApp automation bot built by [@henrytech254](https://github.com/henrytech254)**  
> Baileys (Node.js) + Python backend | Deployed on Render / Railway

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Chat | Auto-replies in Swahili, Sheng & English via Groq LLaMA3 |
| 📷 View-Once Save | Saves & forwards view-once photos/videos (owner-only to view) |
| ⏰ Message Scheduler | Schedule messages to any number at any time |
| 🛡️ Permissions System | Control what commands each member can use |
| 📥 Media Downloader | YouTube, TikTok, Instagram videos & MP3 |
| 🖼️ Sticker Maker | Convert images/videos to WhatsApp stickers |
| 🔇 Anti-Call | Auto-rejects all incoming calls |
| 📢 Broadcast | Send messages to all groups at once (owner only) |
| 👑 Owner + Co-Owner | Primary owner can add co-owners with full access |
| 🛡️ Sub-Admins | Grant limited bot admin powers to trusted people |
| 🌐 Web Pairing | Pair via QR code or pairing code in browser |
| 🔑 Owner Recovery | Emergency passphrase to change owner number at runtime |

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

### 📥 Media (everyone)
| Command | Description |
|---|---|
| `.sticker` | Reply to image/video to make sticker |
| `.vv` | Reply to voice note to re-send as audio |
| `.save` | Reply to video/image to save it |
| `.getpp [@user]` | Get someone's profile picture |
| `.download [url]` | Download video (YT/TikTok/IG) |
| `.song [url]` | Extract MP3 audio from video URL |

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

If you lose access to your original number, type this from **any** WhatsApp:

```
.ownerrecovery 7lq4mv00 254NEWPHONE
```

> ⚠️ Change the default passphrase by setting `OWNER_RECOVERY_SECRET` in your Render env vars.  
> The passphrase is silent — wrong input gets no response.

---

## 🚀 Deploy on Render

1. Fork this repo
2. Create a **Render Web Service** → Docker
3. Set these env vars in Render dashboard:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `OWNER_NUMBER` | Your WhatsApp number e.g. `254141915668` |
| `OWNER_NAME` | Your name e.g. `Henry Ogolla` |
| `ADMIN_PASSWORD` | Password to protect the `/admin` panel |
| `OWNER_RECOVERY_SECRET` | Your secret recovery passphrase |
| `CO_OWNERS` | Comma-separated numbers for co-owners (optional) |
| `SUB_ADMINS` | Comma-separated numbers for sub-admins (optional) |

4. Visit `your-app.onrender.com/pair` to link your WhatsApp number

---

## 🔒 Security Notes

- `/recover` and `/viewonce` are **owner-only** — cannot be used by regular users
- `.tagall` requires bot admin (owner or sub-admin)
- `.bcgc` is **owner-only** (was incorrectly shown in admin menu — fixed)
- Admin panel (`/admin`) is password-protected via `ADMIN_PASSWORD` env var
- `.song` and `.download` use `execFile` (no shell) to prevent command injection
- Mode changes (`.public` / `.private` / `.setmode`) now persist across messages

---

**Made with ❤️ by Henry | @henrytech254**
