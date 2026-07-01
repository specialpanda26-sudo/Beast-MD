# 🤖 Henry Agent19v™

> **Ultimate WhatsApp Multi-Feature Bot**  
> Built by **Henrydev.ke** | +254775351698  
> Version: **19.0.0** | Engine: **Baileys + Node.js**

---

## ✨ Features

| Category | Commands |
|---|---|
| 🤖 **AI Chat** | `!ask`, `!clearchat` |
| 🎨 **Sticker** | `!sticker`, `!assticker`, `!toimage`, `!getpp` |
| 📥 **Downloader** | `!ytmp3`, `!ytmp4`, `!tiktok`, `!ytinfo` |
| 👥 **Group Mgmt** | `!tagall`, `!kick`, `!add`, `!promote`, `!demote`, `!mute`, `!unmute`, `!groupname`, `!grouplink`, `!antilink`, `!antibadword`, `!warn`, `!warns`, `!clearwarn`, `!bcgc` |
| 🎮 **Games** | `!trivia`, `!tictactoe`, `!rps`, `!roll`, `!guess` |
| ⚙️ **Tools** | `!ping`, `!runtime`, `!menu`, `!botinfo`, `!weather`, `!calc`, `!define`, `!joke`, `!quote` |
| 👑 **Owner** | `!broadcast`, `!addsudo`, `!delsudo`, `!setmode`, `!block`, `!unblock`, `!restart` |
| 🛡️ **Auto** | Anti-link, Anti-bad-word, Welcome/Goodbye, Auto-react, Auto-read-status |

---

## 🚀 Quick Setup (Local)

### 1. Prerequisites
```bash
# Node.js v20+
node --version

# FFmpeg (for sticker/media)
# Ubuntu/Debian:
sudo apt install ffmpeg -y

# yt-dlp (for YouTube/TikTok downloads)
pip install yt-dlp
# OR
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

### 2. Install
```bash
git clone https://your-repo/henry-agent19v
cd henry-agent19v
npm install
```

### 3. Configure
```bash
cp .env.example .env
nano .env
```

Fill in at minimum:
- `OWNER_NUMBER` — your WhatsApp number (no `+`)
- `GROQ_API_KEY` — get free at [console.groq.com](https://console.groq.com)

### 4. Run
```bash
node index.js
```

Open **http://localhost:3000/pair** in your browser and enter your WhatsApp number to get a pairing code.

---

## ☁️ Deployment

### Railway (Recommended — Free tier)
1. Push to GitHub
2. New project → Deploy from GitHub
3. Add environment variables from `.env.example`
4. Deploy ✅

### Render
1. New Web Service → connect GitHub repo
2. Build: `npm install` | Start: `node index.js`
3. Add env vars
4. Deploy ✅

### Heroku
```bash
heroku create henry-agent19v
heroku config:set OWNER_NUMBER=254775351698 PREFIX=! BOT_MODE=public
git push heroku main
```

---

## 🔑 Pairing

**Method 1 — Web UI (recommended):**  
Open `http://localhost:PORT/pair` → enter your number → enter code in WhatsApp

**Method 2 — QR Code:**  
Remove session folder → restart → scan QR in terminal

---

## 📁 Project Structure

```
HenryAgent19v/
├── index.js              ← Main entry point
├── config.js             ← Bot configuration
├── package.json
├── .env.example          ← Environment template
├── Procfile              ← Heroku
├── railway.toml          ← Railway
├── render.yaml           ← Render
├── keepalive.js          ← Anti-sleep pinger
├── lib/
│   ├── database.js       ← SQLite (groups, warns, sudo, users)
│   ├── sticker.js        ← WebP sticker maker
│   ├── ai.js             ← Groq AI integration
│   ├── downloader.js     ← YT/TikTok downloader
│   ├── games.js          ← Trivia, TicTacToe, dice, RPS
│   └── utils.js          ← Helpers + menu builder
├── plugins/
│   ├── commands.js       ← All command handlers
│   └── antis.js          ← Anti-link, anti-bad-word, events
├── session/              ← Auth credentials (auto-created, gitignored)
├── data/                 ← SQLite database (auto-created, gitignored)
└── temp/                 ← Temp media files (auto-cleared)
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BOT_NAME` | `Henry Agent19v` | Bot display name |
| `BOT_OWNER_NAME` | `Henrydev.ke` | Owner name |
| `OWNER_NUMBER` | `254775351698` | Owner WhatsApp number |
| `PREFIX` | `!` | Command prefix |
| `BOT_MODE` | `public` | `public` / `private` / `groups` |
| `GROQ_API_KEY` | _(empty)_ | Groq AI key (optional) |
| `TZ` | `Africa/Nairobi` | Timezone |
| `PORT` | `3000` | Web server port |
| `ANTI_LINK` | `false` | Global anti-link toggle |
| `ANTI_BAD_WORD` | `false` | Global bad word filter |
| `AUTO_READ_STATUS` | `true` | Auto-read WhatsApp status |
| `AUTO_REACT` | `true` | Random emoji reactions |

---

## 🧠 AI Setup (Optional but Recommended)

1. Go to [console.groq.com](https://console.groq.com) → sign up (free)
2. Create an API key
3. Add to `.env`: `GROQ_API_KEY=gsk_xxxx`
4. Use `!ask [anything]` in WhatsApp

---

## 👑 Owner

**Henrydev.ke** | +254775351698

---

## 📄 License

MIT — Free to use, modify, and distribute.  
Please keep credits to *Henrydev.ke* in the menu/botinfo.

---

> *Henry Agent19v™ — Because your WhatsApp deserves the best.* 🔥
