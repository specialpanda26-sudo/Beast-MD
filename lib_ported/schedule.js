const fs = require('fs');
const path = require('path');
const { dataFile } = require('./paths.js');
const store = require('./lightweight_store.js');
const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
const configPath = dataFile('schedules.json');
async function loadSchedules() {
    try {
        if (HAS_DB) {
            const data = await store.getSetting('global', 'schedules');
            return data || [];
        }
        else {
            if (!fs.existsSync(configPath)) {
                const dataDir = path.dirname(configPath);
                if (!fs.existsSync(dataDir))
                    fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(configPath, JSON.stringify([], null, 2));
            }
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    }
    catch {
        return [];
    }
}
async function saveSchedules(data) {
    if (HAS_DB) {
        await store.saveSetting('global', 'schedules', data);
    }
    else {
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    }
}
function generateId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}
/**
 * Parse time input to a future Date
 * Supports: 10m | 2h | 1h30m | 14:30 | 10:30am
 */
function parseTime(input) {
    const now = new Date();
    // e.g. 10m, 2h, 1h30m
    const relativeMatch = input.match(/^(?:(\d+)h)?(?:(\d+)m)?$/i);
    if (relativeMatch && (relativeMatch[1] || relativeMatch[2])) {
        const hours = parseInt(relativeMatch[1] || '0', 10);
        const minutes = parseInt(relativeMatch[2] || '0', 10);
        if (hours === 0 && minutes === 0)
            return null;
        return new Date(now.getTime() + (hours * 60 + minutes) * 60 * 1000);
    }
    // e.g. 14:30, 10:30am, 9:00pm
    const clockMatch = input.match(/^(\d{1,2}):(\d{2})(am|pm)?$/i);
    if (clockMatch) {
        let hour = parseInt(clockMatch[1], 10);
        const minute = parseInt(clockMatch[2], 10);
        const meridiem = clockMatch[3]?.toLowerCase();
        if (meridiem === 'pm' && hour < 12)
            hour += 12;
        if (meridiem === 'am' && hour === 12)
            hour = 0;
        const target = new Date(now);
        target.setHours(hour, minute, 0, 0);
        // If already passed, schedule for tomorrow
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        return target;
    }
    return null;
}
function formatTimeLeft(ms) {
    if (ms <= 0)
        return 'now';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts = [];
    if (h)
        parts.push(`${h}h`);
    if (m)
        parts.push(`${m}m`);
    if (s || parts.length === 0)
        parts.push(`${s}s`);
    return parts.join(' ');
}
// ── Scheduler Engine ───────────────────────────────────────────────────────
// Started once when bot connects — checks every 10s for due messages
let _engineStarted = false;
function startSchedulerEngine(sock) {
    if (_engineStarted)
        return;
    _engineStarted = true;
    setInterval(async () => {
        try {
            const now = Date.now();
            const schedules = await loadSchedules();
            const remaining = [];
            let changed = false;
            for (const item of schedules) {
                if (now >= item.sendAt) {
                    try {
                        await sock.sendMessage(item.chatId, {
                            text: item.message,
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363319098372999@newsletter',
                                    newsletterName: 'MEGA MD',
                                    serverMessageId: -1
                                }
                            }
                        });
                        console.log(`[SCHEDULE] ✅ Sent message ID:${item.id} to ${item.chatId}`);
                    }
                    catch (e) {
                        console.error(`[SCHEDULE] ❌ Failed to send ID:${item.id}: ${e.message}`);
                    }
                    changed = true;
                }
                else {
                    remaining.push(item);
                }
            }
            if (changed)
                await saveSchedules(remaining);
        }
        catch (e) {
            console.error('[SCHEDULE] Engine error:', e.message);
        }
    }, 10000);
}


module.exports = Object.assign(module.exports || {}, { startSchedulerEngine, loadSchedules, saveSchedules, generateId, parseTime, formatTimeLeft });
