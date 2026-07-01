'use strict';
require('dotenv').config();

const config = {
  // ── Identity ──────────────────────────────────────────
  botName:     process.env.BOT_NAME        || 'Henry Agent19v',
  ownerName:   process.env.BOT_OWNER_NAME  || 'Henrydev.ke',
  ownerNumber: process.env.OWNER_NUMBER    || '254775351698',
  prefix:      process.env.PREFIX          || '!',
  version:     '19.0.0',

  // ── Mode ──────────────────────────────────────────────
  // 'public' | 'private' | 'groups'
  botMode: process.env.BOT_MODE || 'public',

  // ── Session ───────────────────────────────────────────
  sessionId: process.env.SESSION_ID || '',

  // ── Database ──────────────────────────────────────────
  databaseUrl: process.env.DATABASE_URL || '',

  // ── API Keys ──────────────────────────────────────────
  groqApiKey:   process.env.GROQ_API_KEY   || '',
  giphyApiKey:  process.env.GIPHY_API_KEY  || '',
  removeBgKey:  process.env.REMOVE_BG_KEY  || '',

  // ── Sticker ───────────────────────────────────────────
  packname: 'Henry Agent19v',
  author:   'Henrydev.ke | +254775351698',

  // ── Timezone / Locale ─────────────────────────────────
  timezone: process.env.TZ || 'Africa/Nairobi',

  // ── Deployment ────────────────────────────────────────
  port: Number(process.env.PORT) || 3000,

  // ── Auto-features ─────────────────────────────────────
  antiLink:       process.env.ANTI_LINK       === 'true',
  antiBadWord:    process.env.ANTI_BAD_WORD   === 'true',
  autoReadStatus: process.env.AUTO_READ_STATUS !== 'false',
  autoLikeStatus: process.env.AUTO_LIKE_STATUS === 'true',
  autoReact:      process.env.AUTO_REACT       !== 'false',

  // ── Warn System ───────────────────────────────────────
  maxWarns: 3,

  // ── Channels / Links ──────────────────────────────────
  channelLink: 'https://whatsapp.com/channel/HenryAgent19v',

  // ── External API pool ─────────────────────────────────
  apis: {
    xteam:    'https://api.xteam.xyz',
    violetics:'https://violetics.pw',
    nrtm:     'https://fg-nrtm.ddns.net',
  },
};

// Helper — owner JID
config.ownerJid = config.ownerNumber + '@s.whatsapp.net';

module.exports = config;
