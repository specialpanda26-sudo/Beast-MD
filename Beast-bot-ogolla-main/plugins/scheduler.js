/**
 * ── MESSAGE SCHEDULER ──────────────────────────────────────────────────────
 * Commands:
 *   .schedule add <time> <to> <message>
 *     time: HH:MM (24h) or in Xm/Xh (e.g. 30m, 2h from now)
 *     to:   number (e.g. 2547XXXXXXXX) or "here" for current chat
 *   .schedule list          — list all scheduled messages
 *   .schedule del <id>      — delete a scheduled message
 *   .schedule clear         — delete all your scheduled messages
 *   .schedule repeat <id> daily|weekly  — make a schedule repeat
 *
 * Storage: global.scheduledMessages (in-memory, survives command calls)
 * The scheduler loop runs in client_bridge.js via startSchedulerLoop()
 */

if (!global.scheduledMessages) global.scheduledMessages = [];
let _schedulerStarted = false;

// ── HELPERS ─────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function parseTime(str) {
  // "30m" → 30 minutes from now
  const relMin = str.match(/^(\d+)m$/i);
  if (relMin) return Date.now() + parseInt(relMin[1]) * 60_000;

  // "2h" → 2 hours from now
  const relHr = str.match(/^(\d+)h$/i);
  if (relHr) return Date.now() + parseInt(relHr[1]) * 3_600_000;

  // "14:30" or "2:30pm" → next occurrence of that clock time (local)
  const hhmm = str.match(/^(\d{1,2}):(\d{2})(am|pm)?$/i);
  if (hhmm) {
    let h = parseInt(hhmm[1]);
    const m = parseInt(hhmm[2]);
    const ampm = hhmm[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // push to tomorrow
    return target.getTime();
  }

  return null;
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-KE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: 'short',
    hour12: true
  });
}

function resolveJid(to, currentChat) {
  if (!to || to.toLowerCase() === 'here') return currentChat;
  const num = to.replace(/[^0-9]/g, '');
  if (!num) return null;
  return num + '@s.whatsapp.net';
}

// ── SCHEDULER LOOP (called once from client_bridge.js) ───────────────────────

function startSchedulerLoop(sock) {
  if (_schedulerStarted) return;
  _schedulerStarted = true;

  setInterval(async () => {
    const now = Date.now();
    const due = global.scheduledMessages.filter(s => s.nextRun <= now && !s.sent);

    for (const s of due) {
      try {
        await sock.sendMessage(s.to, { text: s.message });
        console.log(`⏰ Scheduled msg sent → ${s.to}: "${s.message.slice(0, 40)}"`);

        if (s.repeat === 'daily') {
          s.nextRun = s.nextRun + 24 * 3_600_000;
        } else if (s.repeat === 'weekly') {
          s.nextRun = s.nextRun + 7 * 24 * 3_600_000;
        } else {
          s.sent = true;
        }
      } catch (e) {
        console.error(`❌ Scheduler send error:`, e.message);
        s.sent = true; // mark done to avoid retry spam
      }
    }

    // Clean up old sent non-repeating ones (keep for 1h so .list shows ✅)
    global.scheduledMessages = global.scheduledMessages.filter(s =>
      !s.sent || (Date.now() - s.nextRun) < 3_600_000
    );
  }, 15_000); // check every 15 seconds
}

module.exports.startSchedulerLoop = startSchedulerLoop;

// ── COMMANDS ─────────────────────────────────────────────────────────────────

module.exports.schedule = async ({ sock, from, msg, isOwner, isSubAdmin, args }) => {
  if (!isOwner && !isSubAdmin) {
    return sock.sendMessage(from, { text: '❌ Owner/admin only!' });
  }

  const sub = args[0]?.toLowerCase();

  // ── .schedule add ──────────────────────────────────────────────────────────
  if (!sub || sub === 'add') {
    // .schedule add 14:30 2547XXXXXXXX Hello there!
    // .schedule add 30m here Reminder: drink water
    const timeStr = args[1];
    const toStr   = args[2];
    const message = args.slice(3).join(' ');

    if (!timeStr || !toStr || !message) {
      return sock.sendMessage(from, { text: `📅 *Message Scheduler*\n\n*Usage:*\n.schedule add <time> <to> <message>\n\n*Time formats:*\n• \`14:30\` — at 2:30 PM today (or tomorrow)\n• \`09:00am\` — 9 AM\n• \`30m\` — 30 minutes from now\n• \`2h\` — 2 hours from now\n\n*To formats:*\n• \`2547XXXXXXXX\` — send to that number\n• \`here\` — send to this chat\n\n*Examples:*\n.schedule add 14:30 here Reminder: meeting now!\n.schedule add 30m 254712345678 Hey I'll call you soon\n.schedule add 08:00am here Good morning! ☀️\n\n*Other commands:*\n.schedule list\n.schedule del <ID>\n.schedule clear\n.schedule repeat <ID> daily` });
    }

    const nextRun = parseTime(timeStr);
    if (!nextRun) {
      return sock.sendMessage(from, { text: `❌ Invalid time format: \`${timeStr}\`\n\nUse: 14:30 / 9:00am / 30m / 2h` });
    }

    const to = resolveJid(toStr, from);
    if (!to) {
      return sock.sendMessage(from, { text: `❌ Invalid number: \`${toStr}\`\n\nUse a full number like 254712345678 or "here"` });
    }

    const id = genId();
    global.scheduledMessages.push({ id, to, message, nextRun, repeat: null, sent: false, createdBy: from });

    const toDisplay = toStr.toLowerCase() === 'here' ? 'this chat' : `+${to.split('@')[0]}`;
    await sock.sendMessage(from, {
      text: `✅ *Message Scheduled!*\n\n🆔 ID: \`${id}\`\n📨 To: ${toDisplay}\n⏰ At: ${formatTime(nextRun)}\n💬 Message: "${message}"\n\nTo cancel: .schedule del ${id}`
    }, { quoted: msg });
    return;
  }

  // ── .schedule list ─────────────────────────────────────────────────────────
  if (sub === 'list') {
    const all = global.scheduledMessages.filter(s => !s.sent);
    if (all.length === 0) {
      return sock.sendMessage(from, { text: '📅 No scheduled messages.' });
    }
    let text = `📅 *Scheduled Messages* (${all.length})\n\n`;
    for (const s of all) {
      const toDisp = s.to.endsWith('@g.us') ? 'group' : '+' + s.to.split('@')[0];
      text += `🆔 \`${s.id}\` | ⏰ ${formatTime(s.nextRun)}\n`;
      text += `📨 To: ${toDisp}${s.repeat ? ` | 🔁 ${s.repeat}` : ''}\n`;
      text += `💬 "${s.message.slice(0, 50)}${s.message.length > 50 ? '...' : ''}"\n\n`;
    }
    text += `_To delete: .schedule del <ID>_`;
    return sock.sendMessage(from, { text });
  }

  // ── .schedule del ──────────────────────────────────────────────────────────
  if (sub === 'del' || sub === 'delete' || sub === 'cancel') {
    const id = args[1]?.toUpperCase();
    if (!id) return sock.sendMessage(from, { text: '❌ Usage: .schedule del <ID>' });
    const idx = global.scheduledMessages.findIndex(s => s.id === id);
    if (idx === -1) return sock.sendMessage(from, { text: `❌ No scheduled message with ID \`${id}\`` });
    global.scheduledMessages.splice(idx, 1);
    return sock.sendMessage(from, { text: `🗑️ Scheduled message \`${id}\` deleted.` }, { quoted: msg });
  }

  // ── .schedule clear ────────────────────────────────────────────────────────
  if (sub === 'clear') {
    const count = global.scheduledMessages.length;
    global.scheduledMessages = [];
    return sock.sendMessage(from, { text: `🗑️ Cleared all ${count} scheduled messages.` }, { quoted: msg });
  }

  // ── .schedule repeat ───────────────────────────────────────────────────────
  if (sub === 'repeat') {
    const id       = args[1]?.toUpperCase();
    const interval = args[2]?.toLowerCase(); // daily | weekly | none
    if (!id || !interval) {
      return sock.sendMessage(from, { text: '❌ Usage: .schedule repeat <ID> daily|weekly|none' });
    }
    if (!['daily', 'weekly', 'none'].includes(interval)) {
      return sock.sendMessage(from, { text: '❌ Repeat must be: daily | weekly | none' });
    }
    const s = global.scheduledMessages.find(s => s.id === id);
    if (!s) return sock.sendMessage(from, { text: `❌ No scheduled message with ID \`${id}\`` });
    s.repeat = interval === 'none' ? null : interval;
    const label = interval === 'none' ? 'removed (sends once)' : `set to *${interval}*`;
    return sock.sendMessage(from, { text: `🔁 Repeat for \`${id}\` ${label}` }, { quoted: msg });
  }

  // Unknown sub-command
  await sock.sendMessage(from, { text: `❓ Unknown: .schedule ${sub}\n\nTry: .schedule add | list | del | clear | repeat` });
};
