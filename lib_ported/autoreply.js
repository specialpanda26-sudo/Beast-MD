const fs = require('fs');
const path = require('path');
const { dataFile } = require('./paths.js');
const store = require('./lightweight_store.js');
const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
const configPath = dataFile('autoreplies.json');
async function initConfig() {
    if (HAS_DB) {
        const config = await store.getSetting('global', 'autoreplies');
        return config || { enabled: true, replies: [] };
    }
    else {
        if (!fs.existsSync(configPath)) {
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir))
                fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify({ enabled: true, replies: [] }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
}
async function saveConfig(config) {
    if (HAS_DB) {
        await store.saveSetting('global', 'autoreplies', config);
    }
    else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
}
// Named export — imported in lib/messageHandler.ts
async function handleAutoReply(sock, chatId, message, userMessage) {
    try {
        const config = await initConfig();
        if (!config.enabled || !config.replies.length)
            return false;
        const lowerMsg = userMessage.toLowerCase().trim();
        for (const reply of config.replies) {
            const trigger = reply.trigger.toLowerCase();
            const matched = reply.exactMatch
                ? lowerMsg === trigger
                : lowerMsg.includes(trigger);
            if (matched) {
                const senderName = message.pushName || 'there';
                const responseText = reply.response.replace(/\{name\}/gi, senderName);
                await sock.sendMessage(chatId, {
                    text: responseText,
                    contextInfo: {
                        }
                }, { quoted: message });
                return true;
            }
        }
    }
    catch (e) {
        console.error('[AUTOREPLY] Error:', e.message);
    }
    return false;
}


module.exports = Object.assign(module.exports || {}, { handleAutoReply, initConfig, saveConfig });
