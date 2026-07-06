// ── Mega.nz Cloud Session Backup (concept ported from Knight_Bot) ──────────
// Your bot already has local creds.json backup/restore (.credssnapshot /
// .credsrestore) — solid, but local-disk-only, so it's gone if the whole
// container/volume is destroyed (not just restarted). Knight_Bot's pattern
// uploads the session to a Mega.nz account as an off-server copy. This adds
// that as a genuinely-additional safety net, not a replacement.
//
// Needs: npm install megajs, and MEGA_EMAIL/MEGA_PASSWORD env vars.
// Commands: .megabackup (owner) uploads current creds.json to your Mega
// account; .megarestore (owner) downloads it back down (needs bot restart
// after, same as your existing .credsrestore).

const fs = require('fs');
const path = require('path');
const { Storage } = require('megajs'); // add "megajs" to package.json dependencies

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

function megaClient() {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;
  if (!email || !password) return null;
  return new Storage({ email, password, userAgent: 'BeastBot/1.0' });
}

module.exports = {

  megabackup: async ({ sock, from, msg, isOwner, senderJid }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const storage = megaClient();
    if (!storage) return sock.sendMessage(from, { text: '🔑 Set MEGA_EMAIL and MEGA_PASSWORD env vars first (create a free account at mega.nz).' }, { quoted: msg });

    const credsPath = path.join(SESSIONS_DIR, 'creds.json'); // adjust if your session path differs
    if (!fs.existsSync(credsPath)) {
      return sock.sendMessage(from, { text: `❌ No creds.json found at ${credsPath}. Check SESSIONS_DIR/session path in client_bridge.js.` }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '☁️ Uploading session to Mega.nz...' }, { quoted: msg });
    try {
      await new Promise((resolve, reject) => {
        storage.on('ready', () => {
          const uploadStream = storage.upload({ name: `beastbot-creds-${Date.now()}.json`, size: fs.statSync(credsPath).size });
          fs.createReadStream(credsPath).pipe(uploadStream);
          uploadStream.on('complete', resolve);
          uploadStream.on('error', reject);
        });
        storage.on('error', reject);
      });
      await sock.sendMessage(from, { text: '✅ Session backed up to Mega.nz.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Mega upload failed: ${e.message}` }, { quoted: msg });
    }
  },

  megarestore: async ({ sock, from, msg, isOwner }) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const storage = megaClient();
    if (!storage) return sock.sendMessage(from, { text: '🔑 Set MEGA_EMAIL and MEGA_PASSWORD env vars first.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '☁️ Looking up latest backup on Mega.nz...' }, { quoted: msg });
    try {
      await new Promise((resolve, reject) => {
        storage.on('ready', async () => {
          const files = Object.values(storage.files).filter(f => f.name.startsWith('beastbot-creds-'));
          if (!files.length) return reject(new Error('No backups found on this Mega account.'));
          const latest = files.sort((a, b) => b.name.localeCompare(a.name))[0];
          const credsPath = path.join(SESSIONS_DIR, 'creds.json');
          const writeStream = fs.createWriteStream(credsPath);
          latest.download().pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        storage.on('error', reject);
      });
      await sock.sendMessage(from, { text: '✅ Session restored from Mega.nz. Restart the bot for it to take effect (same as .credsrestore).' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Mega restore failed: ${e.message}` }, { quoted: msg });
    }
  },
};
