require('dotenv').config();
const _prefixes = process.env.PREFIXES ? process.env.PREFIXES.split(',') : ['.', '!', '/', '#'];
const config = {
    // Bot Identity
    botName: process.env.BOT_NAME || 'Halloween MD',
    botOwner: process.env.BOT_OWNER || 'Henry',
    ownerNumber: process.env.OWNER_NUMBER || '254775351698',
    author: process.env.AUTHOR || 'henrytech254',
    packname: process.env.PACKNAME || 'Halloween MD',
    description: process.env.DESCRIPTION || 'High performance multi-device WhatsApp bot',
    version: '6.0.0',
    // Bot Config
    prefixes: _prefixes,
    prefix: _prefixes[0],
    commandMode: process.env.COMMAND_MODE || 'public',
    timeZone: process.env.TIMEZONE || 'Asia/Karachi',
    // Links
    channelLink: process.env.CHANNEL_LINK || '', // set CHANNEL_LINK to Henry Bots' own WhatsApp channel, if any
    updateZipUrl: process.env.UPDATE_URL || 'https://github.com/specialpanda26-sudo/Halloween-MD/archive/refs/heads/main.zip',
    ytChannel: process.env.YT_CHANNEL || '',
    // Session
    sessionId: process.env.SESSION_ID || '',
    pairingNumber: process.env.PAIRING_NUMBER || '',
    // Performance
    port: Number(process.env.PORT) || 5000,
    maxStoreMessages: Number(process.env.MAX_STORE_MESSAGES) || 20,
    tempCleanupInterval: Number(process.env.CLEANUP_INTERVAL) || 1 * 60 * 60 * 1000,
    storeWriteInterval: Number(process.env.STORE_WRITE_INTERVAL) || 10000,
    // API Keys
    giphyApiKey: process.env.GIPHY_API_KEY || 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq', // public Giphy beta key (rate-limited, shared across many apps) — set your own in .env for production
    removeBgKey: process.env.REMOVEBG_KEY || '',
    // Warn system
    warnCount: 3,
    // External APIs
    APIs: {
        xteam: 'https://api.xteam.xyz',
        dzx: 'https://api.dhamzxploit.my.id',
        lol: 'https://api.lolhuman.xyz',
        violetics: 'https://violetics.pw',
        neoxr: 'https://api.neoxr.my.id',
        zenzapis: 'https://zenzapis.xyz',
        akuari: 'https://api.akuari.my.id',
        akuari2: 'https://apimu.my.id',
        nrtm: 'https://fg-nrtm.ddns.net',
        fgmods: 'https://api-fgmods.ddns.net'
    },
    APIKeys: {
        'https://api.xteam.xyz': process.env.XTEAM_KEY || 'd90a9e986e18778b',
        'https://api.lolhuman.xyz': process.env.LOLHUMAN_KEY || '85faf717d0545d14074659ad',
        'https://api.neoxr.my.id': process.env.NEOXR_KEY || 'yourkey',
        'https://violetics.pw': process.env.VIOLETICS_KEY || 'beta',
        'https://zenzapis.xyz': process.env.ZENZAPIS_KEY || 'yourkey',
        'https://api-fgmods.ddns.net': process.env.FGMODS_KEY || 'fg-dylux'
    }
};
module.exports = config;
