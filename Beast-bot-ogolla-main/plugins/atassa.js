module.exports = {

  // ── .weather [city] ────────────────────────────────────────────────────────
  weather: async ({ sock, from, msg, args }) => {
    const city = args.join(' ');
    if (!city) return sock.sendMessage(from, { text: '🌤️ Usage: .weather [city name]' }, { quoted: msg });

    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      const data = await res.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      const areaName = area.areaName[0].value;
      const country = area.country[0].value;

      const text = `🌍 *Weather: ${areaName}, ${country}*\n\n` +
        `🌡️ Temp: ${current.temp_C}°C / ${current.temp_F}°F\n` +
        `💧 Humidity: ${current.humidity}%\n` +
        `💨 Wind: ${current.windspeedKmph} km/h\n` +
        `☁️ Condition: ${current.weatherDesc[0].value}\n` +
        `👁️ Visibility: ${current.visibility} km`;

      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Could not fetch weather for "${city}"` }, { quoted: msg });
    }
  },

  // ── .dict [word] ───────────────────────────────────────────────────────────
  dict: async ({ sock, from, msg, args }) => {
    const word = args[0];
    if (!word) return sock.sendMessage(from, { text: '📖 Usage: .dict [word]' }, { quoted: msg });

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await res.json();
      if (!Array.isArray(data)) return sock.sendMessage(from, { text: `❌ Word "${word}" not found.` }, { quoted: msg });

      const entry = data[0];
      const phonetic = entry.phonetic || '';
      let text = `📖 *${entry.word}* ${phonetic}\n\n`;

      entry.meanings.slice(0, 2).forEach(m => {
        text += `*${m.partOfSpeech}*\n`;
        m.definitions.slice(0, 2).forEach((d, i) => {
          text += `${i + 1}. ${d.definition}\n`;
          if (d.example) text += `   _"${d.example}"_\n`;
        });
        text += '\n';
      });

      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Dictionary error: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .convert [amount] [from] [to] ─────────────────────────────────────────
  convert: async ({ sock, from, msg, args }) => {
    const [amount, from_cur, to_cur] = args;
    if (!amount || !from_cur || !to_cur) {
      return sock.sendMessage(from, { text: '💱 Usage: .convert 100 USD KES' }, { quoted: msg });
    }

    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from_cur.toUpperCase()}`);
      const data = await res.json();
      const rate = data.rates[to_cur.toUpperCase()];
      if (!rate) return sock.sendMessage(from, { text: `❌ Currency "${to_cur}" not found!` }, { quoted: msg });

      const result = (parseFloat(amount) * rate).toFixed(2);
      await sock.sendMessage(from, {
        text: `💱 *Currency Conversion*\n\n${amount} ${from_cur.toUpperCase()} = *${result} ${to_cur.toUpperCase()}*\n\nRate: 1 ${from_cur.toUpperCase()} = ${rate} ${to_cur.toUpperCase()}`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Conversion error: ${e.message}` }, { quoted: msg });
    }
  },
};
