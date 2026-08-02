// ── Sudo Aliases (ported/rebuilt from atassa) ───────────────────────────────
// atassa's sudo model (.setsudo/.delsudo/.getsudo/.resetsudo) maps onto your
// bot's existing sub-admin system 1:1 — rather than keeping a second,
// competing permission list (which would be a real bug source — two
// systems disagreeing about who's an admin), these commands are thin
// wrappers around the SAME global.subAdmins Set your .addadmin already uses.

module.exports = {

  setsudo: async ({ sock, from, msg, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📝 Usage: .setsudo <number>' }, { quoted: msg });
    global.subAdmins = global.subAdmins || new Set();
    global.subAdmins.add(num);
    await sock.sendMessage(from, { text: `✅ +${num} added as sudo (sub-admin). Same as .addadmin.` }, { quoted: msg });
  },

  delsudo: async ({ sock, from, msg, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return sock.sendMessage(from, { text: '📝 Usage: .delsudo <number>' }, { quoted: msg });
    global.subAdmins = global.subAdmins || new Set();
    global.subAdmins.delete(num);
    await sock.sendMessage(from, { text: `✅ +${num} removed from sudo.` }, { quoted: msg });
  },

  getsudo: async ({ sock, from, msg }) => {
    const list = Array.from(global.subAdmins || []);
    await sock.sendMessage(from, { text: list.length ? `🛡️ *Sudo list*\n\n${list.map(n => `+${n}`).join('\n')}` : '📭 No sudo numbers set.' }, { quoted: msg });
  },

  resetsudo: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    global.subAdmins = new Set();
    await sock.sendMessage(from, { text: '✅ Sudo list cleared.' }, { quoted: msg });
  },
};
