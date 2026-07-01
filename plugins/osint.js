// ── Phase 8: OSINT-lite lookups ─────────────────────────────────────────────
// Deliberately scoped to PUBLIC INFRASTRUCTURE data only:
//   .validate <number>  - phone number FORMAT/region check (no network call,
//                          no lookup of whether a specific person/account exists)
//   .ipinfo <ip>        - public geo/ASN info for an IP address
//   .whois <domain>     - public RDAP registration data for a domain
//
// Intentionally NOT included: WhatsApp-registration checks on arbitrary
// numbers, username/person reverse-lookups, or any profile-picture/account
// data pulled without the target's consent. Those cross from "utility" into
// tracking people who never agreed to be looked up, so they're not part of
// this bot. See project notes if this scope ever needs revisiting.

const axios = require('axios');
const api = axios.create({ timeout: 8000 });

// Minimal country-code table for format validation — extend as needed.
const CC_TABLE = [
  { cc: '254', name: 'Kenya', len: 9 },
  { cc: '255', name: 'Tanzania', len: 9 },
  { cc: '256', name: 'Uganda', len: 9 },
  { cc: '250', name: 'Rwanda', len: 9 },
  { cc: '234', name: 'Nigeria', len: 10 },
  { cc: '27', name: 'South Africa', len: 9 },
  { cc: '1', name: 'US/Canada', len: 10 },
  { cc: '44', name: 'United Kingdom', len: 10 },
  { cc: '91', name: 'India', len: 10 },
];

module.exports = {

  // ── .validate <number> ────────────────────────────────────────────────
  validate: async ({ sock, from, msg, args }) => {
    const raw = (args[0] || '').replace(/[^0-9]/g, '');
    if (!raw) {
      return sock.sendMessage(from, { text: '📱 Usage: *.validate 2547XXXXXXXX*' }, { quoted: msg });
    }
    const match = CC_TABLE
      .slice()
      .sort((a, b) => b.cc.length - a.cc.length) // longest prefix first
      .find(c => raw.startsWith(c.cc));

    if (!match) {
      return sock.sendMessage(from, {
        text: `⚠️ *${raw}*\n\nCountry code not recognized in the local table. Format looks ${raw.length >= 8 && raw.length <= 15 ? 'plausible' : 'invalid'} (${raw.length} digits) but can't confirm the region.`
      }, { quoted: msg });
    }

    const nationalLen = raw.length - match.cc.length;
    const valid = nationalLen === match.len;
    return sock.sendMessage(from, {
      text: `📱 *Number Format Check*\n\n` +
        `Number: +${raw}\n` +
        `Detected region: ${match.name} (+${match.cc})\n` +
        `National digits: ${nationalLen} (expected ${match.len})\n` +
        `Format: ${valid ? '✅ Valid-looking' : '❌ Unexpected length'}\n\n` +
        `_This only checks number formatting — it does not look up whether this number has any account, on WhatsApp or elsewhere._`
    }, { quoted: msg });
  },

  // ── .ipinfo <ip> ───────────────────────────────────────────────────────
  ipinfo: async ({ sock, from, msg, args }) => {
    const ip = (args[0] || '').trim();
    if (!ip) {
      return sock.sendMessage(from, { text: '🌐 Usage: *.ipinfo 8.8.8.8*' }, { quoted: msg });
    }
    try {
      const { data } = await api.get(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
      if (data.status !== 'success') {
        return sock.sendMessage(from, { text: `❌ Couldn't look that up: ${data.message || 'unknown error'}` }, { quoted: msg });
      }
      return sock.sendMessage(from, {
        text: `🌐 *IP Info: ${ip}*\n\n` +
          `Country: ${data.country || '—'} (${data.countryCode || '—'})\n` +
          `Region: ${data.regionName || '—'}\n` +
          `City: ${data.city || '—'}\n` +
          `ISP: ${data.isp || '—'}\n` +
          `Org: ${data.org || '—'}\n` +
          `AS: ${data.as || '—'}\n` +
          `Timezone: ${data.timezone || '—'}`
      }, { quoted: msg });
    } catch (e) {
      return sock.sendMessage(from, { text: `❌ Lookup failed: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .whois <domain> ────────────────────────────────────────────────────
  whois: async ({ sock, from, msg, args }) => {
    const domain = (args[0] || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !domain.includes('.')) {
      return sock.sendMessage(from, { text: '🔍 Usage: *.whois example.com*' }, { quoted: msg });
    }
    try {
      const { data } = await api.get(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
      const registrar = (data.entities || []).find(e => (e.roles || []).includes('registrar'));
      const registrarName = registrar?.vcardArray?.[1]?.find(f => f[0] === 'fn')?.[3] || 'Unknown';
      const events = data.events || [];
      const registered = events.find(e => e.eventAction === 'registration')?.eventDate;
      const expires = events.find(e => e.eventAction === 'expiration')?.eventDate;
      const statuses = (data.status || []).join(', ') || '—';

      return sock.sendMessage(from, {
        text: `🔍 *WHOIS: ${domain}*\n\n` +
          `Registrar: ${registrarName}\n` +
          `Registered: ${registered ? new Date(registered).toDateString() : '—'}\n` +
          `Expires: ${expires ? new Date(expires).toDateString() : '—'}\n` +
          `Status: ${statuses}\n` +
          `Nameservers: ${(data.nameservers || []).map(n => n.ldhName).join(', ') || '—'}`
      }, { quoted: msg });
    } catch (e) {
      const notFound = e.response?.status === 404;
      return sock.sendMessage(from, {
        text: notFound ? `❌ *${domain}* doesn't appear to be registered.` : `❌ Lookup failed: ${e.message}`
      }, { quoted: msg });
    }
  },
};
