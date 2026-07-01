// ── Wallet / Profile Panel ───────────────────────────────────────────────────
// Commands for verified users: .profile (view balance/badge), .addfunds
// (submit an M-Pesa top-up for admin review), and an owner/admin tool,
// .checkblocked, to test whether a number appears to have blocked the bot.
//
// IMPORTANT — what this can and can't do:
// We have NO Safaricom Daraja/M-Pesa API integration here, so there is no
// way to confirm in real time that a transaction code or screenshot is
// genuine. .addfunds only *submits* the claim (code + optional screenshot)
// to the backend, which queues it as "pending". A human admin reviews it
// in /admin → Payments and approves or rejects it — only approval adds
// kesh to the wallet. Treat any "auto-verified" payment bot claim as a
// scam; this project deliberately keeps a human in the loop instead.

const axios = require('axios');

const BACKEND_PORT = process.env.PORT || 5000;
const api = axios.create({ baseURL: `http://127.0.0.1:${BACKEND_PORT}`, timeout: 8000 });

function cleanNumber(jidOrText) {
  return (jidOrText || '').replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '');
}

module.exports = {

  // ── .profile ─────────────────────────────────────────────────────────────
  profile: async ({ sock, from, msg, sender }) => {
    const phone = cleanNumber(sender || from);
    try {
      const { data } = await api.get('/api/profile', { params: { phone } });
      if (!data.success) {
        return sock.sendMessage(from, {
          text: `📋 *Profile*\n\n${data.error || 'Not registered yet.'}\n\n👉 Send *.register* to get verified and unlock a wallet.`
        }, { quoted: msg });
      }
      const pending = (data.recent_payments || []).filter(p => p.status === 'pending').length;
      const lines = [
        `👤 *Your Profile*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `Name: ${data.name || 'Not set'}`,
        `Phone: ${data.phone}`,
        `Status: ${data.verified ? `🛡️ Verified (${data.badge})` : '⏳ Unverified'}`,
        `💰 Wallet: *${data.credits} kesh*`,
      ];
      if (pending) lines.push(`⏳ ${pending} top-up request(s) awaiting admin review`);
      if (data.recent_payments && data.recent_payments.length) {
        lines.push('', '📜 *Recent top-ups*');
        for (const p of data.recent_payments.slice(0, 5)) {
          const icon = p.status === 'approved' ? '✅' : p.status === 'rejected' ? '❌' : '⏳';
          lines.push(`${icon} ${p.amount} kesh — ${p.mpesa_code} (${p.status})`);
        }
      }
      lines.push('', 'Type *.addfunds <amount> <mpesa_code>* to top up your wallet.');
      await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Couldn't load your profile right now (${e.message}). Try again shortly.` }, { quoted: msg });
    }
  },

  // ── .addfunds <amount> <mpesa_code> ─────────────────────────────────────
  // Reply to (or send with) an M-Pesa confirmation screenshot to attach it
  // as supporting evidence. Plain text alone is accepted too.
  addfunds: async ({ sock, from, msg, sender, args }) => {
    const phone = cleanNumber(sender || from);
    const amount = parseInt(args[0], 10);
    const code = (args[1] || '').trim().toUpperCase();

    if (!amount || amount <= 0 || !code) {
      return sock.sendMessage(from, {
        text:
          `📋 *Usage:* .addfunds <amount> <mpesa_code>\n` +
          `e.g. *.addfunds 200 QFG7H8J9K0*\n\n` +
          `Send the M-Pesa money to the admin's number first, then submit the *transaction code* from the confirmation SMS here. ` +
          `Attach the screenshot too (reply to it, or send it with this as the caption) — it helps the admin review faster, but isn't required.\n\n` +
          `⚠️ This is reviewed by a human admin, not auto-approved. Submitting a fake code will just get the request rejected.`
      }, { quoted: msg });
    }

    let screenshot_base64 = null;
    try {
      // Image sent directly with this command as the caption, OR a quoted/replied image
      const directImg = msg.message?.imageMessage;
      const quotedImg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (directImg || quotedImg) {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const targetMsg = directImg
          ? msg
          : { key: msg.message.extendedTextMessage.contextInfo, message: { imageMessage: quotedImg } };
        const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
        screenshot_base64 = buffer.toString('base64');
      }
    } catch (e) {
      console.warn('⚠️ Could not attach .addfunds screenshot:', e.message);
    }

    try {
      const { data } = await api.post('/api/payment/submit', {
        phone, amount, mpesa_code: code, screenshot_base64
      });
      if (!data.success) {
        return sock.sendMessage(from, { text: `❌ ${data.error}` }, { quoted: msg });
      }
      await sock.sendMessage(from, {
        text: `✅ Request #${data.id} submitted!\n💰 ${amount} kesh · Code: ${code}\n\n${data.message}`
      }, { quoted: msg });
    } catch (e) {
      const apiErr = e.response?.data?.error;
      await sock.sendMessage(from, { text: `❌ ${apiErr || 'Could not submit your request right now. Try again shortly.'}` }, { quoted: msg });
    }
  },

  // ── .checkblocked <number> (owner/sub-admin) ────────────────────────────
  // Best-effort heuristic only — WhatsApp gives no official "they blocked
  // you" signal. We check: (1) is the number even on WhatsApp, (2) can we
  // fetch their profile picture. A picture-fetch failure can ALSO just mean
  // they have no profile photo or tight privacy settings, so this is a clue,
  // not a guarantee.
  checkblocked: async ({ sock, from, msg, args, isOwner, isSubAdmin }) => {
    if (!isOwner && !isSubAdmin) {
      return sock.sendMessage(from, { text: '🔒 Only the owner/sub-admins can use *.checkblocked*.' }, { quoted: msg });
    }
    const num = cleanNumber(args[0]);
    if (!num) {
      return sock.sendMessage(from, { text: '📋 Usage: .checkblocked 254712345678' }, { quoted: msg });
    }
    const jid = `${num}@s.whatsapp.net`;
    try {
      const onWa = await sock.onWhatsApp(jid);
      if (!onWa || !onWa.length) {
        return sock.sendMessage(from, { text: `❓ *${num}* doesn't appear to be on WhatsApp at all (or the lookup failed).` }, { quoted: msg });
      }
      let ppStatus = 'unknown';
      try {
        await sock.profilePictureUrl(jid, 'image');
        ppStatus = 'visible';
      } catch (err) {
        const code = err?.output?.statusCode || err?.status;
        ppStatus = code === 401 ? 'forbidden' : 'none_or_private';
      }

      const verdict = ppStatus === 'forbidden'
        ? `🚫 Likely *blocked you* — their profile photo returned "not authorized," which usually happens when you've been blocked.`
        : ppStatus === 'visible'
          ? `✅ Probably *not* blocked — their profile photo loaded fine.`
          : `🤷 Inconclusive — they may have no profile photo or have privacy settings hiding it from you, even if not blocked.`;

      await sock.sendMessage(from, {
        text: `🔍 *Block check: ${num}*\n\n${verdict}\n\n_This is a heuristic — WhatsApp doesn't expose a real "blocked" status, so treat this as a clue, not certainty._`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Check failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .referral — show your referral code/link + earnings ────────────────
  // Referral code is just your own verified phone number. Anyone who
  // registers via {publicUrl}/register?ref=<your number> and completes OTP
  // verification automatically earns you REFERRAL_REFERRER_BONUS kesh, and
  // they get REFERRAL_REFERRED_BONUS kesh themselves — both paid instantly,
  // no admin review needed (unlike .addfunds top-ups).
  referral: async ({ sock, from, msg, sender }) => {
    const phone = cleanNumber(sender || from);
    const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.WEB_PORT || 3000}`;
    try {
      const { data } = await api.get('/api/referrals', { params: { phone } });
      if (!data.success) {
        return sock.sendMessage(from, {
          text: `📋 *Referrals*\n\n${data.error || 'Not registered yet.'}\n\n👉 Send *.register* first to unlock your referral link.`
        }, { quoted: msg });
      }
      const link = `${publicUrl}/register?ref=${data.referral_code}`;
      const lines = [
        `🤝 *Your Referral Link*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        link,
        '',
        `💰 You earn *${data.referrer_bonus} kesh* per friend who verifies via your link.`,
        `🎁 They get a *${data.referred_bonus} kesh* bonus too (on top of the normal starter credit).`,
        '',
        `📊 Total referrals: ${data.total_referrals}`,
        `💵 Total earned: ${data.total_earned} kesh`
      ];
      if (data.referrals && data.referrals.length) {
        lines.push('', '📜 *Recent referrals*');
        for (const r of data.referrals.slice(0, 5)) {
          lines.push(`✅ ${r.phone} — +${r.bonus} kesh`);
        }
      }
      await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Couldn't load your referrals right now (${e.message}). Try again shortly.` }, { quoted: msg });
    }
  },

};
