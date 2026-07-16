// ── Owner/Admin Utility ───────────────────────────────────────────────────
// This project has NO payment/wallet integration by design — no M-Pesa,
// no PayPal, no credits, no referral bonuses. The only thing that used to
// live in this file besides that is kept: a heuristic "has this number
// blocked the bot" check for the owner/sub-admins.

function cleanNumber(jidOrText) {
  return (jidOrText || '').replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '');
}

module.exports = {

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

};
