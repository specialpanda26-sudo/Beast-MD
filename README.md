# 🔥 Henry V19™ Beast Bot

> **WhatsApp automation bot built by [@henrytech254](https://github.com/henrytech254)**  
> Powered by Baileys + Python backend | Deployed on Render

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Chat | Auto-replies in Swahili, Sheng & English via Groq LLaMA3 |
| 📷 View-Once Save | Saves & forwards view-once photos/videos |
| ⏰ Message Scheduler | Schedule messages to any number at any time |
| 🛡️ Permissions System | Control what commands each member can use |
| 📥 Media Downloader | Download YouTube, TikTok, Instagram videos & MP3 |
| 🖼️ Sticker Maker | Convert images/videos to WhatsApp stickers |
| 🔇 Anti-Call | Auto-rejects all incoming calls |
| 📢 Broadcast | Send messages to all groups at once |
| 👑 Multi-Admin | Owner + Sub-admin permission levels |
| 🌐 Web Pairing | Pair via QR code or pairing code on browser |

---

## 📋 Commands

### Public (everyone)
| Command | Description |
|---|---|
| `.menu` | Show full command menu with photo |
| `.ping` | Check bot response speed |
| `.runtime` | Uptime & system stats |
| `.weather [city]` | Live weather info |
| `.dict [word]` | Dictionary definition |
| `.roll [sides]` | Roll a dice 🎲 |
| `.myperm` | Check your permission level |
| `/ask [query]` | Ask AI anything |

### Media
| Command | Description |
|---|---|
| `.sticker` | Convert image/video to sticker |
| `.vv` | View saved view-once media |
| `.save` | Save view-once as file |
| `.getpp [@user]` | Get profile picture |
| `.download [url]` | Download video |
| `.song [url]` | Extract MP3 audio |

### Group Admin
| Command | Description |
|---|---|
| `.tagall [msg]` | Tag all members |
| `.kick [@user]` | Remove a member |
| `.add [number]` | Add a member |
| `.promote [@user]` | Make someone admin |
| `.demote [@user]` | Remove admin status |
| `.mute` | Mute group |
| `.unmute` | Unmute group |
| `.revoke` | Reset invite link |
| `.antispam on/off` | Toggle antispam |
| `.setperm @user [level]` | Set member permissions |
| `.resetperm @user` | Reset permissions |
| `.listperms` | List all custom permissions |

### Owner Only
| Command | Description |
|---|---|
| `.schedule add [time] [to] [msg]` | Schedule a message |
| `.schedule list` | View all scheduled messages |
| `.schedule del [ID]` | Cancel a scheduled message |
| `.schedule repeat [ID] daily/weekly` | Repeat a schedule |
| `.addadmin [number]` | Add a sub-admin |
| `.removeadmin [number]` | Remove a sub-admin |
| `.listadmins` | List all sub-admins |
| `.bcgc [msg]` | Broadcast to all groups |
| `.bio [text]` | Update bot bio |
| `.pp` | Update profile picture |
| `.public` | Set bot to public mode |
| `.private` | Set bot to private mode |

---

## ⏰ Message Scheduler

Schedule messages to fire automatically even when you're offline:

```
.schedule add 14:30 here Reminder: meeting!
.schedule add 08:00am 254712345678 Good morning! ☀️
.schedule add 30m here Call me back
.schedule add 2h 254700000000 I'll be there soon
.schedule repeat ABC12 daily
```

---

## 🛡️ Permission Levels

| Level | Access |
|---|---|
| `superadmin` 👑 | All commands |
| `trusted` ⭐ | All except blocked |
| `member` 👤 | Default |
| `restricted` 🔒 | Only explicitly allowed commands |

```
.setperm @henry trusted
.setperm @henry restricted +help,ping
.setperm @henry trusted -adult,nsfw
```

---

## 🚀 Deploy

1. Fork this repo
2. Create a Render web service (Docker)
3. Set env vars: `GROQ_API_KEY`, `OWNER_NUMBER`
4. Visit `your-app.onrender.com/pair` to link WhatsApp

---

**Made with ❤️ by Henry | @henrytech254**
