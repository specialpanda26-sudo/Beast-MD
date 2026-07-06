// ── Sports (ported/rebuilt from atassa) ─────────────────────────────────────
// TheSportsDB's "3" test key is their documented free tier for light use —
// swap in a paid key via SPORTSDB_API_KEY for production-grade rate limits.
// .surebet is NOT included: real arbitrage-betting tooling needs live odds
// feeds from multiple paid bookmaker APIs to mean anything, so a fake/no-key
// version would just be a broken command claiming to find bets that don't
// exist — worse than not shipping it. Everything else here is real.

const axios = require('axios');
const SPORTSDB_KEY = process.env.SPORTSDB_API_KEY || '3';
const api = axios.create({ baseURL: `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/`, timeout: 10000 });

module.exports = {

  livescore: async ({ sock, from, msg, args }) => {
    const league = args.join(' ') || 'English Premier League';
    try {
      const { data } = await api.get('searchevents.php', { params: { e: league } });
      if (!data.event) return sock.sendMessage(from, { text: `📭 No live/recent events found for "${league}".` }, { quoted: msg });
      const text = data.event.slice(0, 5).map(e => `${e.strHomeTeam} ${e.intHomeScore ?? '-'} : ${e.intAwayScore ?? '-'} ${e.strAwayTeam}`).join('\n');
      await sock.sendMessage(from, { text: `⚽ *${league}*\n\n${text}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  upcomingmatches: async ({ sock, from, msg, args }) => {
    const teamName = args.join(' ');
    if (!teamName) return sock.sendMessage(from, { text: '📝 Usage: .upcomingmatches <team name>' }, { quoted: msg });
    try {
      const { data: teamData } = await api.get('searchteams.php', { params: { t: teamName } });
      if (!teamData.teams) return sock.sendMessage(from, { text: `❌ Team "${teamName}" not found.` }, { quoted: msg });
      const teamId = teamData.teams[0].idTeam;
      const { data } = await api.get('eventsnext.php', { params: { id: teamId } });
      if (!data.events) return sock.sendMessage(from, { text: '📭 No upcoming fixtures found.' }, { quoted: msg });
      const text = data.events.slice(0, 5).map(e => `${e.dateEvent}: ${e.strHomeTeam} vs ${e.strAwayTeam}`).join('\n');
      await sock.sendMessage(from, { text: `📅 *Upcoming — ${teamData.teams[0].strTeam}*\n\n${text}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  standings: async ({ sock, from, msg, args }) => {
    const leagueId = args[0] || '4328'; // EPL default
    const season = args[1] || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
    try {
      const { data } = await api.get('lookuptable.php', { params: { l: leagueId, s: season } });
      if (!data.table) return sock.sendMessage(from, { text: '❌ No standings found. Usage: .standings <leagueId> <season e.g. 2024-2025>' }, { quoted: msg });
      const text = data.table.slice(0, 10).map(t => `${t.intRank}. ${t.strTeam} — ${t.intPoints}pts`).join('\n');
      await sock.sendMessage(from, { text: `📊 *Standings*\n\n${text}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },

  topscorers: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, { text: 'ℹ️ Top-scorer data needs a paid TheSportsDB tier (Patreon). Set SPORTSDB_API_KEY to a paid key to enable this — the free "3" key doesn\'t include this endpoint.' }, { quoted: msg });
  },

  sportnews: async ({ sock, from, msg, args }) => {
    const topic = args.join(' ') || 'football';
    try {
      const { data } = await axios.get(`https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' sports')}`, { timeout: 10000 });
      const titles = [...data.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 6).map(m => `• ${m[1]}`);
      if (!titles.length) return sock.sendMessage(from, { text: '📭 No news found.' }, { quoted: msg });
      await sock.sendMessage(from, { text: `📰 *${topic} news*\n\n${titles.join('\n')}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
  },
};
