# 🔥 Henry v19™ Beast Bot — ULTIMATE Edition
> WhatsApp Automation Beast | Built by Henry Ogolla (@henrytech254) | Powered by Baileys + Groq AI + Python

---

## 🚀 Features

### 🤖 AI Chat (Swahili / Sheng / English)
- Replies to ALL DMs like a real Kenyan human
- Detects language automatically — Sheng, Swahili, English or mix (Kenglish)
- Human typing simulation before every reply
- Uses Llama-3 AI via Groq (free & fast)

### 👥 Group Features
- Auto reacts with emoji in restricted/announce-only groups (can't send = just reacts)
- Auto reacts to WhatsApp Channel posts
- Tagall, kick, promote, demote, mute, unmute
- Broadcast to all groups at once

### 📱 Status & Media
- Auto views everyone's WhatsApp status ❤️
- Saves all view-once images/videos to your DM
- Download videos from YouTube, Instagram, TikTok, Facebook
- Extract MP3 audio from any video URL
- Convert images to stickers

### 🔒 Security & Anti-Ban
- Owner-only dot commands
- Anti-call (auto rejects all incoming calls)
- Fake typing simulation (human-like delays)
- Always Online presence

### 📬 Welcome System (Opt-In)
- Welcome message is NOT sent automatically
- Owner controls it manually: `.welcome 254XXXXXXXXX`

---

## 📋 All Commands

### 🤖 AI & Chat
| Command | Description |
|---|---|
| `.ask [query]` | Ask AI anything (Swahili/Sheng/EN) |
| `.summarize [text]` | Summarize any text |
| DM bot freely | Bot replies naturally in your language |

### 📸 Status & Profile
| Command | Description |
|---|---|
| `.status` | Reply to image → post as WhatsApp status |
| `.pp` | Reply to image → update profile picture |
| `.bio [text]` | Update WhatsApp bio |

### 📥 Media & Downloads
| Command | Description |
|---|---|
| `.download [url]` | Download video (YT/IG/TikTok/FB) |
| `.song [url]` | Extract MP3 audio |
| `.sticker` | Image → Sticker (reply to image) |
| `.vv` | Save voice note |
| `.save` | Save status/video |
| `.getpp [@user]` | Get someone's profile picture |

### 👑 Group Admin
| Command | Description |
|---|---|
| `.tagall` | Tag all group members |
| `.bcgc [msg]` | Broadcast to all groups |
| `.kick @user` | Kick a member |
| `.promote @user` | Promote to admin |
| `.demote @user` | Demote from admin |
| `.mute` | Mute group |
| `.unmute` | Unmute group |

### ⚙️ Bot Control (Owner Only)
| Command | Description |
|---|---|
| `.menu` | Full command menu |
| `.welcome 254XXXXXXXXX` | Send welcome card to a contact |
| `.ping` | Bot speed test |
| `.runtime` | Uptime & RAM info |
| `.public` | Set bot to public mode |
| `.private` | Set bot to private mode |
| `.setmode on/off` | Toggle bot on/off |

### 🔧 Tools & Lookup
| Command | Description |
|---|---|
| `.weather [city]` | Live weather info |
| `.dict [word]` | Dictionary definition |
| `.convert [x to y]` | Currency converter |
| `.roll [dice]` | Roll dice e.g 3d6+2 |
| `.pbp [text]` | RPG session tracker |

### 🗃️ Message Recovery (Slash Commands)
| Command | Description |
|---|---|
| `/ask [query]` | Chat with Llama-3 AI |
| `/recover [number]` | Recover deleted messages |
| `/viewonce [number]` | View saved view-once media |
| `/download_video [url]` | Download video |
| `/download_song [url]` | Download MP3 |
| `/paint [text]` | Generate text image |

---

## ✅ Auto Features (Always Running)
- Auto-read all messages
- Anti-call protection
- Auto-view statuses
- Save view-once media → forwarded to your DM
- AI DM chat (Swahili/Sheng/English)
- Auto-react (sentiment-based emoji)
- Fake typing (anti-detect)
- Group: react-only in restricted chats
- Always online

---

## ⚙️ Environment Variables

| Variable | Example | Required |
|---|---|---|
| `OWNER_NUMBER` | `254712345678` | ✅ Yes |
| `OWNER_NAME` | `Henry Ogolla` | ✅ Yes |
| `BOT_NAME` | `Henry v19™ Beast Bot` | Optional |
| `GROQ_API_KEY` | from console.groq.com | ✅ Yes (AI) |
| `PAIRING_NUMBER` | `254712345678` | Optional |

---

## 🌐 Deploy on Render

1. Push this repo to GitHub
2. Go to render.com → New Web Service
3. Connect your GitHub repo
4. Set environment variables above
5. Deploy
6. Open `your-url.onrender.com/pair`
7. Enter your WhatsApp number → get pairing code → link

---

## 📦 Project Structure

```
beast-bot-ogolla/
├── client_bridge.js     # Main bot (Node.js + Baileys)
├── app.py               # Python backend (AI, DB, webhooks)
├── plugins/
│   ├── general.js       # menu, welcome, ping, status, pp, bio
│   ├── group.js         # tagall, kick, promote, demote, mute
│   ├── media.js         # sticker, download, getpp, vv, save
│   ├── cypher.js        # roll, pbp, summarize
│   └── atassa.js        # weather, dict, convert
├── pair.html            # Pairing web UI
├── index.html           # Landing page
├── admin.html           # Admin panel
├── package.json
├── render.yaml
└── Dockerfile
```

---

## ⚠️ Anti-Ban Tips
- Keep bot in PRIVATE mode when not in use
- Don't broadcast to 100+ groups at once
- Use a dedicated SIM (not your personal number)
- Let the number warm up for 1–2 weeks before heavy use

---

> Built with 🔥 by **Henry Ogolla** | Henry v19™ Beast Bot © 2026 | @henrytech254
# force rebuild Mon Jun 29 22:46:27 EAT 2026
