// Beast MD ported module (category: utility)
// Mechanically converted from ESM handler(sock,message,args,context) shape
// into Henry's CommonJS module.exports = { cmdName: async (h) => {...} } shape.
// h = { sock, from, msg, isOwner, isPrimaryOwner, isCoOwner, isSubAdmin, isBotAdmin,
//       isGroup, sender, senderJid, sessionId, senderNumber, args, config, apiClient, logActivity }
// NOTE: review each command before relying on it in production — mechanical port,
// not manually re-verified line by line. Some referenced npm packages must be
// installed (see NEW_DEPENDENCIES.txt) and some external API keys/endpoints are
// the friend's own third-party services (discardapi.onrender.com etc.) which may
// be rate-limited, unreliable, or disappear without notice.

module.exports = {};


Object.assign(module.exports, (() => {

  // --- helper code from calc.js ---
  // Safe math evaluator using pure Node.js - no Python needed
  function safeMath(expr) {
      // Replace math function names to JS equivalents
      const sanitized = expr
          .replace(/\^/g, '**')
          .replace(/sqrt\(/g, 'Math.sqrt(')
          .replace(/cbrt\(/g, 'Math.cbrt(')
          .replace(/abs\(/g, 'Math.abs(')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/floor\(/g, 'Math.floor(')
          .replace(/ceil\(/g, 'Math.ceil(')
          .replace(/round\(/g, 'Math.round(')
          .replace(/pow\(/g, 'Math.pow(')
          .replace(/min\(/g, 'Math.min(')
          .replace(/max\(/g, 'Math.max(')
          .replace(/\bpi\b/gi, String(Math.PI))
          .replace(/\be\b/g, String(Math.E));
      // Block anything dangerous
      const blocked = /[a-zA-Z_$](?!ath\.)(?![0-9])/;
      const mathFunctions = /Math\.[a-z]+/g;
      const cleaned = sanitized.replace(mathFunctions, '');
      if (blocked.test(cleaned)) {
          throw new Error('Invalid expression — only math operators and functions allowed');
      }
      // Only allow safe characters
      if (!/^[\d\s+\-*/%.(),Math.a-zA-Z]+$/.test(sanitized)) {
          throw new Error('Invalid characters in expression');
      }
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result !== 'number')
          throw new Error('Result is not a number');
      if (!isFinite(result))
          throw new Error('Result is Infinity or NaN');
      return Number.isInteger(result) ? String(result) : result.toPrecision(10).replace(/\.?0+$/, '');
  }
  return {

    // ── .calc ─── Advanced calculator | usage: .calc <expression>
    "calc": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'calc ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const expr = args.join(' ').trim();
        if (!expr) {
            return await sock.sendMessage(chatId, {
                text: `🧮 *CALCULATOR*\n\n` +
                    `*Usage:* \`.calc <expression>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.calc 2 ** 10\` → 1024\n` +
                    `• \`.calc sqrt(144)\` → 12\n` +
                    `• \`.calc sin(pi / 2)\` → 1\n` +
                    `• \`.calc log(1000)\` → 3\n` +
                    `• \`.calc (3 + 4) * 2\` → 14\n` +
                    `• \`.calc pow(2, 8)\` → 256\n\n` +
                    `*Functions:* sqrt, cbrt, abs, sin, cos, tan, log, ln, floor, ceil, round, pow, min, max\n` +
                    `*Constants:* pi, e`,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            const result = safeMath(expr);
            await sock.sendMessage(chatId, {
                text: `🧮 *Calculator*\n\n📥 *Input:* \`${expr}\`\n📤 *Result:* \`${result}\``,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ *Error:* ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:calc] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .calc: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "calculate": async (h) => module.exports["calc"](h),
    "solve": async (h) => module.exports["calc"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { getBin } = require('../lib_ported/compile.js');
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  // --- helper code from cipher.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  return {

    // ── .cipher ─── Encrypt or decrypt text using Caesar, Vigenere, or XOR cipher | usage: .cipher <type> <encode|decode> <key> <text>
    "cipher": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'cipher ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        if (args.length < 4) {
            return await sock.sendMessage(chatId, {
                text: `🔐 *Text Cipher*\n\n` +
                    `*Usage:* \`.cipher <type> <encode|decode> <key> <text>\`\n\n` +
                    `*Cipher types:*\n\n` +
                    `*caesar* — shift letters by a number (key = number)\n` +
                    `• \`.cipher caesar encode 13 Hello World\`\n` +
                    `• \`.cipher caesar decode 13 Uryyb Jbeyq\`\n\n` +
                    `*vigenere* — polyalphabetic cipher (key = word)\n` +
                    `• \`.cipher vigenere encode SECRET Hello World\`\n` +
                    `• \`.cipher vigenere decode SECRET Zincs Pgvnu\`\n\n` +
                    `*xor* — XOR byte cipher, output is hex (key = any text)\n` +
                    `• \`.cipher xor encode mykey Hello\`\n` +
                    `• \`.cipher xor decode mykey 25090a0e06\``,
                ...channelInfo
            }, { quoted: message });
        }
        const cipherType = args[0].toLowerCase();
        const mode = args[1].toLowerCase();
        const key = args[2];
        const text = args.slice(3).join(' ').trim();
        if (!['caesar', 'vigenere', 'xor'].includes(cipherType)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Unknown cipher: *${cipherType}*\nUse: \`caesar\`, \`vigenere\`, or \`xor\``,
                ...channelInfo
            }, { quoted: message });
        }
        if (!['encode', 'decode', 'encrypt', 'decrypt'].includes(mode)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Unknown mode: *${mode}*\nUse: \`encode\` or \`decode\``,
                ...channelInfo
            }, { quoted: message });
        }
        if (!text) {
            return await sock.sendMessage(chatId, {
                text: `❌ No text provided.`,
                ...channelInfo
            }, { quoted: message });
        }
        if (cipherType === 'caesar' && isNaN(parseInt(key, 10))) {
            return await sock.sendMessage(chatId, {
                text: `❌ Caesar cipher key must be a number (e.g. 13)`,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            const bin = getBin('cipher');
            const { stdout, stderr } = await execFileAsync(bin, [cipherType, mode, key, text], { timeout: 10000 });
            if (stderr && !stdout) {
                return await sock.sendMessage(chatId, {
                    text: `❌ ${stderr.trim()}`,
                    ...channelInfo
                }, { quoted: message });
            }
            const result = stdout.trim();
            const cipherNames = {
                caesar: 'Caesar', vigenere: 'Vigenère', xor: 'XOR'
            };
            const modeLabel = (mode === 'encode' || mode === 'encrypt') ? '🔒 Encrypted' : '🔓 Decrypted';
            await sock.sendMessage(chatId, {
                text: `🔐 *${cipherNames[cipherType]} Cipher*\n\n` +
                    `📥 *Input:* \`${text}\`\n` +
                    `🔑 *Key:* \`${key}\`\n` +
                    `${modeLabel}: \`${result}\``,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:cipher] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .cipher: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "encrypt": async (h) => module.exports["cipher"](h),
    "decrypt": async (h) => module.exports["cipher"](h),
    "crypt": async (h) => module.exports["cipher"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const fs = require('fs');
  const path = require('path');
  const { TEMP_DIR } = require('../lib_ported/paths.js');
  // --- helper code from crun.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  return {

    // ── .crun ─── Compile and run C++ code | usage: .crun <c++ code>
    "crun": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'crun ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        if (!(h.isOwner || h.isSubAdmin || h.isCoOwner)) {
          return await sock.sendMessage(chatId, { text: '🔒 *.crun is restricted to the bot owner/admins.*\n\nRunning arbitrary compiled code on the server is a security risk, so this is limited to trusted users.' }, { quoted: message });
        }

        // Get code from: args, quoted message, or document
        const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const hasDoc = !!quoted?.documentMessage;
        let code = '';
        if (hasDoc) {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const msgObj = { message: { documentMessage: quoted.documentMessage } };
            const buf = await downloadMediaMessage(msgObj, 'buffer', {});
            code = buf.toString('utf8');
        }
        else {
            // Preserve newlines from raw message text
            const rawText = message?.message?.conversation ||
                message?.message?.extendedTextMessage?.text || '';
            // Strip the command prefix and command name from raw text
            const cmdMatch = rawText.match(/^[.!/]\w+\s*/);
            code = cmdMatch ? rawText.slice(cmdMatch[0].length) : args.join(' ');
            if (!code.trim())
                code = quotedText;
        }
        code = code.trim();
        if (!code) {
            return await sock.sendMessage(chatId, {
                text: `⚡ *C++ Runner*\n\n` +
                    `*Usage:* \`.crun <code>\`\n\n` +
                    `*Example:*\n` +
                    `\`.crun #include<iostream>\nusing namespace std;\nint main(){cout<<"Hello World!"<<endl;return 0;}\`\n\n` +
                    `• Max execution time: 10 seconds\n` +
                    `• No file/network access\n` +
                    `• Auto-wraps in main() if not present`,
                ...channelInfo
            }, { quoted: message });
        }
        // Auto-wrap if no main() found
        if (!code.includes('main(') && !code.includes('main (')) {
            code = `#include<iostream>\n#include<cmath>\n#include<string>\n#include<vector>\nusing namespace std;\nint main(){\n${code}\nreturn 0;\n}`;
        }
        const id = Date.now();
        const srcFile = path.join(TEMP_DIR, `crun_${id}.cpp`);
        const binFile = path.join(TEMP_DIR, `crun_${id}`);
        try {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
            fs.writeFileSync(srcFile, code);
            await sock.sendMessage(chatId, {
                text: '⚙️ *Compiling...*',
                ...channelInfo
            }, { quoted: message });
            // Compile
            try {
                await execAsync(`g++ -o ${binFile} ${srcFile} -std=c++17 -O2`, { timeout: 15000 });
            }
            catch (compileErr) {
                return await sock.sendMessage(chatId, {
                    text: `❌ *Compilation Error:*\n\n\`\`\`\n${compileErr.stderr || compileErr.message}\n\`\`\``,
                    ...channelInfo
                }, { quoted: message });
            }
            // Run with timeout
            let output = '';
            try {
                const { stdout, stderr } = await execAsync(`timeout 10 ${binFile}`, { timeout: 12000 });
                output = (stdout || stderr || '').trim();
            }
            catch (runErr) {
                output = runErr.stdout?.trim() || runErr.message || 'Runtime error';
            }
            if (!output)
                output = '(no output)';
            if (output.length > 3000)
                output = `${output.substring(0, 3000) }\n...(truncated)`;
            await sock.sendMessage(chatId, {
                text: `⚡ *C++ Output:*\n\n\`\`\`\n${output}\n\`\`\``,
                ...channelInfo
            }, { quoted: message });
        }
        finally {
            // Cleanup
            try {
                fs.unlinkSync(srcFile);
            }
            catch { }
            try {
                fs.unlinkSync(binFile);
            }
            catch { }
        }
    
      } catch (portErr) {
        console.error('[ported:crun] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .crun: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "cpp": async (h) => module.exports["crun"](h),
    "runcpp": async (h) => module.exports["crun"](h),
    "c++": async (h) => module.exports["crun"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from distance.js ---
  const CITIES = {
      // Pakistan
      karachi: { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lon: 67.0011, flag: '🇵🇰' },
      lahore: { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lon: 74.3587, flag: '🇵🇰' },
      islamabad: { name: 'Islamabad', country: 'Pakistan', lat: 33.6844, lon: 73.0479, flag: '🇵🇰' },
      rawalpindi: { name: 'Rawalpindi', country: 'Pakistan', lat: 33.5651, lon: 73.0169, flag: '🇵🇰' },
      faisalabad: { name: 'Faisalabad', country: 'Pakistan', lat: 31.4504, lon: 73.1350, flag: '🇵🇰' },
      peshawar: { name: 'Peshawar', country: 'Pakistan', lat: 34.0151, lon: 71.5249, flag: '🇵🇰' },
      quetta: { name: 'Quetta', country: 'Pakistan', lat: 30.1798, lon: 66.9750, flag: '🇵🇰' },
      multan: { name: 'Multan', country: 'Pakistan', lat: 30.1575, lon: 71.5249, flag: '🇵🇰' },
      hyderabad: { name: 'Hyderabad', country: 'Pakistan', lat: 25.3960, lon: 68.3578, flag: '🇵🇰' },
      gujranwala: { name: 'Gujranwala', country: 'Pakistan', lat: 32.1877, lon: 74.1945, flag: '🇵🇰' },
      // India
      mumbai: { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777, flag: '🇮🇳' },
      delhi: { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.2090, flag: '🇮🇳' },
      bangalore: { name: 'Bangalore', country: 'India', lat: 12.9716, lon: 77.5946, flag: '🇮🇳' },
      chennai: { name: 'Chennai', country: 'India', lat: 13.0827, lon: 80.2707, flag: '🇮🇳' },
      kolkata: { name: 'Kolkata', country: 'India', lat: 22.5726, lon: 88.3639, flag: '🇮🇳' },
      hyderabadin: { name: 'Hyderabad (IN)', country: 'India', lat: 17.3850, lon: 78.4867, flag: '🇮🇳' },
      // Middle East
      dubai: { name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, flag: '🇦🇪' },
      abudhabi: { name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lon: 54.3773, flag: '🇦🇪' },
      riyadh: { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753, flag: '🇸🇦' },
      jeddah: { name: 'Jeddah', country: 'Saudi Arabia', lat: 21.3891, lon: 39.8579, flag: '🇸🇦' },
      mecca: { name: 'Mecca', country: 'Saudi Arabia', lat: 21.3891, lon: 39.8579, flag: '🇸🇦' },
      medina: { name: 'Medina', country: 'Saudi Arabia', lat: 24.5247, lon: 39.5692, flag: '🇸🇦' },
      kuwait: { name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lon: 47.9774, flag: '🇰🇼' },
      doha: { name: 'Doha', country: 'Qatar', lat: 25.2854, lon: 51.5310, flag: '🇶🇦' },
      muscat: { name: 'Muscat', country: 'Oman', lat: 23.5880, lon: 58.3829, flag: '🇴🇲' },
      manama: { name: 'Manama', country: 'Bahrain', lat: 26.2235, lon: 50.5876, flag: '🇧🇭' },
      tehran: { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890, flag: '🇮🇷' },
      // Asia
      beijing: { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074, flag: '🇨🇳' },
      shanghai: { name: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737, flag: '🇨🇳' },
      tokyo: { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, flag: '🇯🇵' },
      seoul: { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780, flag: '🇰🇷' },
      bangkok: { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018, flag: '🇹🇭' },
      singapore: { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, flag: '🇸🇬' },
      kualalumpur: { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lon: 101.6869, flag: '🇲🇾' },
      jakarta: { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456, flag: '🇮🇩' },
      manila: { name: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842, flag: '🇵🇭' },
      dhaka: { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lon: 90.4125, flag: '🇧🇩' },
      colombo: { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lon: 79.8612, flag: '🇱🇰' },
      kathmandu: { name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lon: 85.3240, flag: '🇳🇵' },
      kabul: { name: 'Kabul', country: 'Afghanistan', lat: 34.5553, lon: 69.2075, flag: '🇦🇫' },
      // Europe
      london: { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278, flag: '🇬🇧' },
      paris: { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, flag: '🇫🇷' },
      berlin: { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, flag: '🇩🇪' },
      madrid: { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038, flag: '🇪🇸' },
      rome: { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, flag: '🇮🇹' },
      amsterdam: { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, flag: '🇳🇱' },
      moscow: { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173, flag: '🇷🇺' },
      istanbul: { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784, flag: '🇹🇷' },
      // Americas
      newyork: { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060, flag: '🇺🇸' },
      losangeles: { name: 'Los Angeles', country: 'USA', lat: 34.0522, lon: -118.2437, flag: '🇺🇸' },
      chicago: { name: 'Chicago', country: 'USA', lat: 41.8781, lon: -87.6298, flag: '🇺🇸' },
      toronto: { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, flag: '🇨🇦' },
      saopaulo: { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, flag: '🇧🇷' },
      buenosaires: { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, flag: '🇦🇷' },
      // Africa
      cairo: { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, flag: '🇪🇬' },
      lagos: { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, flag: '🇳🇬' },
      nairobi: { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219, flag: '🇰🇪' },
      johannesburg: { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473, flag: '🇿🇦' },
      // Oceania
      sydney: { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, flag: '🇦🇺' },
      melbourne: { name: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631, flag: '🇦🇺' },
  };
  function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
  }
  function findCity(input) {
      const key = input.toLowerCase().replace(/[\s\-_]/g, '');
      if (CITIES[key])
          return CITIES[key];
      // Fuzzy: find first city whose key includes input
      for (const [k, city] of Object.entries(CITIES)) {
          if (k.includes(key) || key.includes(k))
              return city;
          if (city.name.toLowerCase().replace(/\s/g, '').includes(key))
              return city;
      }
      return null;
  }
  function flightTime(km) {
      const hours = km / 900; // avg commercial flight speed
      if (hours < 1)
          return `~${Math.round(hours * 60)} min`;
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
  }
  function drivingTime(km) {
      const hours = km / 80; // avg driving speed
      if (hours < 1)
          return `~${Math.round(hours * 60)} min`;
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
  }
  return {

    // ── .distance ─── Calculate distance between two cities with flight and driving time estimates | usage: .distance <city1> to <city2>\nExample: .distance karachi to dubai
    "distance": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'distance ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const input = args.join(' ').trim().toLowerCase();
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `🌍 *Distance Calculator*\n\n` +
                    `*Usage:* \`.distance <city1> to <city2>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.distance karachi to dubai\`\n` +
                    `• \`.distance lahore to islamabad\`\n` +
                    `• \`.distance london to newyork\`\n` +
                    `• \`.distance tokyo to singapore\`\n\n` +
                    `*Supported cities include:*\n` +
                    `🇵🇰 PK · 🇮🇳 IN · 🇦🇪 UAE · 🇸🇦 SA · 🇬🇧 UK\n` +
                    `🇺🇸 USA · 🇨🇳 CN · 🇯🇵 JP · 🇫🇷 FR · 🇩🇪 DE\n` +
                    `🇧🇩 BD · 🇦🇫 AF · 🇮🇷 IR · 🇹🇷 TR · + many more`,
                ...channelInfo
            }, { quoted: message });
        }
        const toIndex = args.findIndex((a) => a.toLowerCase() === 'to');
        if (toIndex === -1 || toIndex === 0 || toIndex === args.length - 1) {
            return await sock.sendMessage(chatId, {
                text: `❌ Use: \`.distance <city1> to <city2>\``,
                ...channelInfo
            }, { quoted: message });
        }
        const city1Input = args.slice(0, toIndex).join('').toLowerCase();
        const city2Input = args.slice(toIndex + 1).join('').toLowerCase();
        const city1 = findCity(city1Input);
        const city2 = findCity(city2Input);
        if (!city1) {
            return await sock.sendMessage(chatId, {
                text: `❌ City not found: *${args.slice(0, toIndex).join(' ')}*\n\nTry common city names like: karachi, dubai, london, newyork`,
                ...channelInfo
            }, { quoted: message });
        }
        if (!city2) {
            return await sock.sendMessage(chatId, {
                text: `❌ City not found: *${args.slice(toIndex + 1).join(' ')}*\n\nTry common city names like: karachi, dubai, london, newyork`,
                ...channelInfo
            }, { quoted: message });
        }
        if (city1.name === city2.name) {
            return await sock.sendMessage(chatId, {
                text: `😄 Both cities are the same! Distance is 0 km.`,
                ...channelInfo
            }, { quoted: message });
        }
        const km = haversine(city1.lat, city1.lon, city2.lat, city2.lon);
        const miles = km * 0.621371;
        const nm = km * 0.539957;
        await sock.sendMessage(chatId, {
            text: `🌍 *Distance Calculator*\n\n` +
                `${city1.flag} *From:* ${city1.name}, ${city1.country}\n` +
                `${city2.flag} *To:* ${city2.name}, ${city2.country}\n\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `📏 *Distance:*\n` +
                `   • ${Math.round(km).toLocaleString()} km\n` +
                `   • ${Math.round(miles).toLocaleString()} miles\n` +
                `   • ${Math.round(nm).toLocaleString()} nautical miles\n\n` +
                `✈️ *Flight time:* ${flightTime(km)}\n` +
                `🚗 *Drive time:* ${drivingTime(km)}\n\n` +
                `📍 *Coordinates:*\n` +
                `   ${city1.name}: ${city1.lat.toFixed(4)}, ${city1.lon.toFixed(4)}\n` +
                `   ${city2.name}: ${city2.lat.toFixed(4)}, ${city2.lon.toFixed(4)}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:distance] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .distance: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "dist": async (h) => module.exports["distance"](h),
    "distancecalc": async (h) => module.exports["distance"](h),
    "citydist": async (h) => module.exports["distance"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  const fs = require('fs');
  // --- helper code from dna.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  function getQuoted(message) {
      return message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  }
  function getMediaType(quoted) {
      if (quoted?.imageMessage)
          return 'image';
      if (quoted?.videoMessage)
          return 'video';
      if (quoted?.audioMessage)
          return 'audio';
      if (quoted?.documentMessage)
          return 'document';
      if (quoted?.stickerMessage)
          return 'sticker';
      return null;
  }
  return {

    // ── .dna ─── Encode any text or media to DNA sequence (ATCG) or decode it back | usage: .dna encode <text or reply to media>\n.dna decode <DNA or reply to DNA file>
    "dna": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'dna ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const quoted = getQuoted(message);
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const mediaType = getMediaType(quoted);
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: `🧬 *DNA Encoder / Decoder*\n\n` +
                    `*Text:*\n` +
                    `\`.dna encode Hello World\`\n` +
                    `\`.dna decode ATCGATCG...\`\n\n` +
                    `*Media/File (reply to any media):*\n` +
                    `\`.dna encode\` — reply to image/video/audio/doc\n` +
                    `\`.dna decode\` — reply to a .txt file with DNA\n\n` +
                    `ℹ️ Each byte becomes 4 DNA bases (A, T, C, G)`,
                ...channelInfo
            }, { quoted: message });
        }
        const mode = args[0]?.toLowerCase();
        if (mode !== 'encode' && mode !== 'decode') {
            return await sock.sendMessage(chatId, {
                text: `❌ Use \`encode\` or \`decode\``,
                ...channelInfo
            }, { quoted: message });
        }
        // Check binary exists
        const binPath = path.join(process.cwd(), 'lib', 'bin', 'dna');
        if (!fs.existsSync(binPath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ DNA binary not available on this server (g++ not installed).`,
                ...channelInfo
            }, { quoted: message });
        }
        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const id = Date.now();
        try {
            if (mode === 'encode') {
                let inputBuffer;
                let sourceLabel;
                if (mediaType && quoted) {
                    // Download media
                    await sock.sendMessage(chatId, { text: '⏳ Downloading media...', ...channelInfo }, { quoted: message });
                    const msgObj = { message: { [`${mediaType}Message`]: quoted[`${mediaType}Message`] } };
                    inputBuffer = await downloadMediaMessage(msgObj, 'buffer', {});
                    sourceLabel = `${mediaType} file (${inputBuffer.length} bytes)`;
                }
                else {
                    // Text input
                    const textInput = args.slice(1).join(' ').trim() || quotedText;
                    if (!textInput) {
                        return await sock.sendMessage(chatId, {
                            text: `❌ No input. Provide text or reply to a media message.`,
                            ...channelInfo
                        }, { quoted: message });
                    }
                    inputBuffer = Buffer.from(textInput, 'utf8');
                    sourceLabel = `text (${inputBuffer.length} bytes)`;
                }
                // Write input to temp file
                const inFile = path.join(tempDir, `dna_in_${id}.bin`);
                const outFile = path.join(tempDir, `dna_out_${id}.txt`);
                fs.writeFileSync(inFile, inputBuffer);
                await sock.sendMessage(chatId, { text: '🧬 Encoding to DNA...', ...channelInfo }, { quoted: message });
                // Encode the base64 of the file
                const b64 = inputBuffer.toString('base64');
                const b64File = path.join(tempDir, `dna_b64_${id}.txt`);
                fs.writeFileSync(b64File, b64);
                const result = await execAsync(`"${binPath}" encode "${b64}"`, { timeout: 30000, maxBuffer: 50 * 1024 * 1024 });
                const dnaResult = result.stdout.trim();
                fs.writeFileSync(outFile, dnaResult);
                await sock.sendMessage(chatId, {
                    document: fs.readFileSync(outFile),
                    mimetype: 'text/plain',
                    fileName: `dna_encoded_${id}.txt`,
                    caption: `🧬 *DNA Encoded*\n\n` +
                        `📥 *Source:* ${sourceLabel}\n` +
                        `📤 *DNA bases:* ${dnaResult.length.toLocaleString()}\n\n` +
                        `_Reply to this file with \`.dna decode\` to restore_`,
                    ...channelInfo
                }, { quoted: message });
                // Cleanup
                for (const f of [inFile, outFile, b64File])
                    try {
                        fs.unlinkSync(f);
                    }
                    catch { }
            }
            else {
                // DECODE
                let dnaInput;
                if (quoted?.documentMessage) {
                    // Download DNA file
                    await sock.sendMessage(chatId, { text: '⏳ Reading DNA file...', ...channelInfo }, { quoted: message });
                    const msgObj = { message: { documentMessage: quoted.documentMessage } };
                    const buf = await downloadMediaMessage(msgObj, 'buffer', {});
                    dnaInput = buf.toString('utf8').trim();
                }
                else {
                    dnaInput = args.slice(1).join(' ').trim() || quotedText;
                }
                if (!dnaInput) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No DNA input. Provide DNA text or reply to a DNA .txt file.`,
                        ...channelInfo
                    }, { quoted: message });
                }
                if (!/^[ATCGatcg\s]+$/.test(dnaInput)) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ Invalid DNA sequence. Only A, T, C, G allowed.`,
                        ...channelInfo
                    }, { quoted: message });
                }
                const cleanDna = dnaInput.replace(/\s/g, '');
                await sock.sendMessage(chatId, { text: '🔬 Decoding DNA...', ...channelInfo }, { quoted: message });
                const { stdout, stderr } = await execFileAsync(binPath, ['decode', cleanDna], { timeout: 30000, maxBuffer: 50 * 1024 * 1024 });
                if (stderr && !stdout) {
                    return await sock.sendMessage(chatId, { text: `❌ ${stderr.trim()}`, ...channelInfo }, { quoted: message });
                }
                const decoded = stdout.trim();
                // Try to detect if it was originally base64 encoded media
                const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(decoded) && decoded.length % 4 === 0;
                if (isBase64 && decoded.length > 100) {
                    // It was a file — restore it
                    const fileBuffer = Buffer.from(decoded, 'base64');
                    const outFile = path.join(tempDir, `dna_decoded_${id}.bin`);
                    fs.writeFileSync(outFile, fileBuffer);
                    await sock.sendMessage(chatId, {
                        document: fileBuffer,
                        mimetype: 'application/octet-stream',
                        fileName: `dna_decoded_${id}`,
                        caption: `🧬 *DNA Decoded*\n\n` +
                            `📦 *Restored file:* ${fileBuffer.length.toLocaleString()} bytes`,
                        ...channelInfo
                    }, { quoted: message });
                    try {
                        fs.unlinkSync(outFile);
                    }
                    catch { }
                }
                else {
                    // Plain text result
                    if (decoded.length > 800) {
                        const outFile = path.join(tempDir, `dna_decoded_${id}.txt`);
                        fs.writeFileSync(outFile, decoded);
                        await sock.sendMessage(chatId, {
                            document: fs.readFileSync(outFile),
                            mimetype: 'text/plain',
                            fileName: `dna_decoded_${id}.txt`,
                            caption: `🧬 *DNA Decoded* — ${decoded.length} chars`,
                            ...channelInfo
                        }, { quoted: message });
                        try {
                            fs.unlinkSync(outFile);
                        }
                        catch { }
                    }
                    else {
                        await sock.sendMessage(chatId, {
                            text: `🧬 *DNA Decoded*\n\n` +
                                `📤 *Result:*\n\`\`\`\n${decoded}\n\`\`\``,
                            ...channelInfo
                        }, { quoted: message });
                    }
                }
            }
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:dna] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .dna: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "dnaencode": async (h) => module.exports["dna"](h),
    "dnadecode": async (h) => module.exports["dna"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  const fs = require('fs');
  // --- helper code from rle.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  function getQuoted(message) {
      return message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  }
  function getMediaType(quoted) {
      if (quoted?.imageMessage)
          return 'image';
      if (quoted?.videoMessage)
          return 'video';
      if (quoted?.audioMessage)
          return 'audio';
      if (quoted?.documentMessage)
          return 'document';
      if (quoted?.stickerMessage)
          return 'sticker';
      return null;
  }
  return {

    // ── .rle ─── Compress or decompress text/files using Run-Length Encoding (C++ powered) | usage: .rle compress <text or reply to media>\n.rle decompress <encoded or reply to compressed file>
    "rle": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'rle ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const quoted = getQuoted(message);
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const mediaType = getMediaType(quoted);
        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: `🗜️ *RLE Compressor*\n\n` +
                    `*Text:*\n` +
                    `\`.rle compress AAABBBCCDDDD\`\n` +
                    `\`.rle decompress <encoded>\`\n\n` +
                    `*File/Media (reply to any file or media):*\n` +
                    `\`.rle compress\` — reply to image/video/audio/doc\n` +
                    `\`.rle decompress\` — reply to .rle compressed file\n\n` +
                    `⚠️ RLE works best on data with repeated bytes.\n` +
                    `For photos/videos, compression may increase size.`,
                ...channelInfo
            }, { quoted: message });
        }
        const mode = args[0]?.toLowerCase();
        if (mode !== 'compress' && mode !== 'decompress') {
            return await sock.sendMessage(chatId, {
                text: `❌ Use \`compress\` or \`decompress\``,
                ...channelInfo
            }, { quoted: message });
        }
        const binPath = path.join(process.cwd(), 'lib', 'bin', 'rle');
        if (!fs.existsSync(binPath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ RLE binary not available on this server (g++ not installed).`,
                ...channelInfo
            }, { quoted: message });
        }
        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const id = Date.now();
        try {
            if (mode === 'compress') {
                let inputBuffer;
                let sourceLabel;
                let originalName = `file_${id}`;
                if (mediaType && quoted) {
                    await sock.sendMessage(chatId, { text: '⏳ Downloading media...', ...channelInfo }, { quoted: message });
                    const msgObj = { message: { [`${mediaType}Message`]: quoted[`${mediaType}Message`] } };
                    inputBuffer = await downloadMediaMessage(msgObj, 'buffer', {});
                    sourceLabel = `${mediaType} (${inputBuffer.length.toLocaleString()} bytes)`;
                    originalName = `${mediaType}_${id}`;
                }
                else {
                    const textInput = args.slice(1).join(' ').trim() || quotedText;
                    if (!textInput) {
                        return await sock.sendMessage(chatId, {
                            text: `❌ No input. Provide text or reply to a media message.`,
                            ...channelInfo
                        }, { quoted: message });
                    }
                    inputBuffer = Buffer.from(textInput, 'utf8');
                    sourceLabel = `text (${inputBuffer.length} bytes)`;
                }
                const inFile = path.join(tempDir, `rle_in_${id}`);
                const outFile = path.join(tempDir, `rle_out_${id}.rle`);
                fs.writeFileSync(inFile, inputBuffer);
                await sock.sendMessage(chatId, { text: '🗜️ Compressing...', ...channelInfo }, { quoted: message });
                const { stdout, stderr } = await execAsync(`"${binPath}" compress file "${inFile}"`, { timeout: 60000, maxBuffer: 100 * 1024 * 1024 });
                const result = stdout.trim();
                fs.writeFileSync(outFile, result);
                // Parse stats
                let statsLine = '';
                if (stderr) {
                    const match = stderr.match(/STATS\|original=(\d+)\|compressed=(\d+)\|ratio=(-?\d+)%/);
                    if (match) {
                        const orig = parseInt(match[1], 10);
                        const comp = result.length;
                        const saved = orig - comp;
                        const pct = ((1 - comp / orig) * 100).toFixed(1);
                        statsLine = saved > 0
                            ? `\n💾 Saved: ${Math.abs(saved).toLocaleString()} bytes (${pct}%)`
                            : `\n⚠️ File grew by ${Math.abs(saved).toLocaleString()} bytes (RLE not ideal for this data)`;
                    }
                }
                await sock.sendMessage(chatId, {
                    document: fs.readFileSync(outFile),
                    mimetype: 'application/octet-stream',
                    fileName: `${originalName}.rle`,
                    caption: `🗜️ *RLE Compressed*\n\n` +
                        `📥 *Source:* ${sourceLabel}${statsLine}\n\n` +
                        `_Reply with \`.rle decompress\` to restore_`,
                    ...channelInfo
                }, { quoted: message });
                for (const f of [inFile, outFile])
                    try {
                        fs.unlinkSync(f);
                    }
                    catch { }
            }
            else {
                // DECOMPRESS
                let encodedData;
                if (quoted?.documentMessage) {
                    await sock.sendMessage(chatId, { text: '⏳ Reading compressed file...', ...channelInfo }, { quoted: message });
                    const msgObj = { message: { documentMessage: quoted.documentMessage } };
                    const buf = await downloadMediaMessage(msgObj, 'buffer', {});
                    encodedData = buf.toString('utf8').trim();
                }
                else {
                    encodedData = args.slice(1).join(' ').trim() || quotedText;
                }
                if (!encodedData) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No compressed input. Reply to an .rle file or provide encoded text.`,
                        ...channelInfo
                    }, { quoted: message });
                }
                await sock.sendMessage(chatId, { text: '📦 Decompressing...', ...channelInfo }, { quoted: message });
                const inFile = path.join(tempDir, `rle_dec_in_${id}.txt`);
                fs.writeFileSync(inFile, encodedData);
                const { stdout, stderr } = await execFileAsync(binPath, ['decompress', 'text', encodedData], { timeout: 60000, maxBuffer: 100 * 1024 * 1024 });
                if (stderr && !stdout) {
                    return await sock.sendMessage(chatId, { text: `❌ ${stderr.trim()}`, ...channelInfo }, { quoted: message });
                }
                const result = stdout;
                const resultBuf = Buffer.from(result);
                const outFile = path.join(tempDir, `rle_decompressed_${id}`);
                fs.writeFileSync(outFile, resultBuf);
                if (result.length > 800 || resultBuf.some((b) => b < 9 || (b > 13 && b < 32))) {
                    // Binary or long — send as file
                    await sock.sendMessage(chatId, {
                        document: resultBuf,
                        mimetype: 'application/octet-stream',
                        fileName: `rle_decompressed_${id}`,
                        caption: `📦 *RLE Decompressed*\n\n📤 *Size:* ${resultBuf.length.toLocaleString()} bytes`,
                        ...channelInfo
                    }, { quoted: message });
                }
                else {
                    await sock.sendMessage(chatId, {
                        text: `📦 *RLE Decompressed*\n\n\`\`\`\n${result.trim()}\n\`\`\``,
                        ...channelInfo
                    }, { quoted: message });
                }
                for (const f of [inFile, outFile])
                    try {
                        fs.unlinkSync(f);
                    }
                    catch { }
            }
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:rle] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .rle: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "compress": async (h) => module.exports["rle"](h),
    "decompress": async (h) => module.exports["rle"](h),
    "rlecompress": async (h) => module.exports["rle"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { loadSchedules, saveSchedules } = require('../lib_ported/schedule.js');

  return {

    // ── .schedulecancel ─── Cancel a scheduled message by its ID | usage: .schedulecancel <ID>
    "schedulecancel": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'schedulecancel ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        if (!args || args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide the schedule ID.\n\nUsage: `.schedulecancel <ID>`\nGet IDs: `.schedulelist`',
                ...channelInfo
            }, { quoted: message });
        }
        const targetId = args[0].toUpperCase();
        const schedules = await loadSchedules();
        const index = schedules.findIndex(s => s.id === targetId && (s.chatId === chatId || s.senderId === senderId));
        if (index === -1) {
            return await sock.sendMessage(chatId, {
                text: `❌ No scheduled message found with ID *${targetId}*\n\nUse \`.schedulelist\` to see your scheduled messages.`,
                ...channelInfo
            }, { quoted: message });
        }
        const cancelled = schedules.splice(index, 1)[0];
        await saveSchedules(schedules);
        await sock.sendMessage(chatId, {
            text: `🗑️ *Schedule Cancelled!*\n\n📌 *ID:* ${cancelled.id}\n💬 *Message:* ${cancelled.message}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:schedulecancel] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .schedulecancel: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "schedcancel": async (h) => module.exports["schedulecancel"](h),
    "cancelschedule": async (h) => module.exports["schedulecancel"](h),
    "unschedule": async (h) => module.exports["schedulecancel"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { loadSchedules, formatTimeLeft } = require('../lib_ported/schedule.js');

  return {

    // ── .schedulelist ─── View all scheduled messages for this chat | usage: .schedulelist
    "schedulelist": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'schedulelist ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const schedules = await loadSchedules();
        // Show schedules for this chat
        const mine = schedules.filter(s => s.chatId === chatId || s.senderId === senderId);
        if (mine.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '📭 *No scheduled messages found*\n\nUse `.schedule <time> <message>` to schedule one!',
                ...channelInfo
            }, { quoted: message });
        }
        const now = Date.now();
        const lines = mine.map((s, i) => {
            const timeLeft = formatTimeLeft(s.sendAt - now);
            const preview = s.message.length > 40
                ? `${s.message.substring(0, 40) }...`
                : s.message;
            return `${i + 1}. 📌 *ID:* ${s.id} | ⏳ ${timeLeft}\n    💬 ${preview}`;
        }).join('\n\n');
        await sock.sendMessage(chatId, {
            text: `*⏰ SCHEDULED MESSAGES (${mine.length})*\n\n${lines}\n\n_Use .schedulecancel <ID> to cancel_`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:schedulelist] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .schedulelist: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "schedlist": async (h) => module.exports["schedulelist"](h),
    "schedules": async (h) => module.exports["schedulelist"](h),
    "reminders": async (h) => module.exports["schedulelist"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  // --- helper code from siminfo.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  return {

    // ── .siminfo ─── Lookup phone number country, carrier and type | usage: .siminfo <phone number with country code>\nExample: .siminfo +923001234567
    "siminfo": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'siminfo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const input = args.join('').trim().replace(/\s+/g, '');
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `📱 *SIM / Phone Info*\n\n` +
                    `*Usage:* \`.siminfo <number>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.siminfo +923001234567\` — Pakistan\n` +
                    `• \`.siminfo +14155552671\` — USA\n` +
                    `• \`.siminfo +447911123456\` — UK\n` +
                    `• \`.siminfo +971501234567\` — UAE\n\n` +
                    `ℹ️ Include country code with or without +`,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            const scriptPath = path.join(process.cwd(), 'lib', 'siminfo.py');
            const { stdout } = await execFileAsync('python3', [scriptPath, input], { timeout: 10000 });
            const data = JSON.parse(stdout.trim());
            if (data.error) {
                return await sock.sendMessage(chatId, {
                    text: `❌ ${data.error}`,
                    ...channelInfo
                }, { quoted: message });
            }
            const validIcon = data.valid ? '✅' : '⚠️';
            const carrierLine = data.carrier !== 'Unknown' ? `\n📶 *Carrier:* ${data.carrier}` : '';
            await sock.sendMessage(chatId, {
                text: `📱 *Phone Number Info*\n\n` +
                    `🔢 *Number:* ${data.number}\n` +
                    `${data.flag} *Country:* ${data.country}\n` +
                    `🌍 *Region:* ${data.region}\n` +
                    `🏷️ *Country Code:* ${data.country_code}\n` +
                    `📞 *National Number:* ${data.national_number}\n` +
                    `📡 *Line Type:* ${data.line_type}` +
                    `${carrierLine}\n` +
                    `${validIcon} *Valid:* ${data.valid ? 'Yes' : 'Possibly invalid (check length)'}`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Lookup failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:siminfo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .siminfo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "phoneinfo": async (h) => module.exports["siminfo"](h),
    "numinfo": async (h) => module.exports["siminfo"](h),
    "carrier": async (h) => module.exports["siminfo"](h),
    "phinfo": async (h) => module.exports["siminfo"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  // --- helper code from speedtest.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  return {

    // ── .speedtest ─── Test internet speed of the server | usage: .speedtest
    "speedtest": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'speedtest ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        await sock.sendMessage(chatId, {
            text: '🔄 *Testing internet speed...*\n\nPlease wait, this may take a moment.',
            ...channelInfo
        }, { quoted: message });
        try {
            const { stdout, stderr } = await execAsync('python3 lib/speed.py', { timeout: 120000 });
            const result = (stdout || stderr || '').trim();
            if (!result) {
                return await sock.sendMessage(chatId, {
                    text: '❌ No output from speed test.',
                    ...channelInfo
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                text: result,
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Speed test failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:speedtest] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .speedtest: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "speed": async (h) => module.exports["speedtest"](h),
    "netspeed": async (h) => module.exports["speedtest"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  // --- helper code from sudoku.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  return {

    // ── .sudoku ─── Generate Sudoku puzzles or solve them | usage: .sudoku generate [easy|medium|hard]\n.sudoku solve <81 digits, 0 for empty>
    "sudoku": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'sudoku ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const scriptPath = path.join(process.cwd(), 'lib', 'sudoku.py');
        if (!args.length || args[0] === 'help') {
            return await sock.sendMessage(chatId, {
                text: `🧩 *Sudoku*\n\n` +
                    `*Generate a puzzle:*\n` +
                    `\`.sudoku generate easy\`\n` +
                    `\`.sudoku generate medium\`\n` +
                    `\`.sudoku generate hard\`\n\n` +
                    `*Solve a puzzle:*\n` +
                    `\`.sudoku solve 530070000600195000098000060800060003400803001700020006060000280000419005000080079\`\n\n` +
                    `ℹ️ For solve: send 81 digits, use 0 for empty cells`,
                ...channelInfo
            }, { quoted: message });
        }
        const subCmd = args[0].toLowerCase();
        if (subCmd === 'generate') {
            const difficulty = (args[1] || 'medium').toLowerCase();
            if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Invalid difficulty. Use: \`easy\`, \`medium\`, or \`hard\``,
                    ...channelInfo
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                text: `🧩 Generating ${difficulty} puzzle...`,
                ...channelInfo
            }, { quoted: message });
            try {
                const { stdout } = await execAsync(`python3 "${scriptPath}" generate ${difficulty}`, { timeout: 30000 });
                const data = JSON.parse(stdout.trim());
                if (data.error) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ ${data.error}`,
                        ...channelInfo
                    }, { quoted: message });
                }
                const diffEmoji = { easy: '🟢', medium: '🟡', hard: '🔴' };
                await sock.sendMessage(chatId, {
                    text: `🧩 *Sudoku — ${diffEmoji[difficulty]} ${difficulty.toUpperCase()}*\n` +
                        `📊 *Clues:* ${data.clues}/81\n\n` +
                        `*Puzzle:*\n\`\`\`\n${data.formatted_puzzle}\n\`\`\`\n\n` +
                        `*Puzzle code (to solve later):*\n\`${data.puzzle}\`\n\n` +
                        `_Use \`.sudoku solve ${data.puzzle}\` to reveal solution_`,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (error) {
                await sock.sendMessage(chatId, {
                    text: `❌ Failed to generate: ${error.message}`,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        else if (subCmd === 'solve') {
            const grid = args[1]?.trim();
            if (!grid) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Provide a puzzle code (81 digits, 0 = empty)\n\nExample:\n\`.sudoku solve 530070000600195000...\``,
                    ...channelInfo
                }, { quoted: message });
            }
            if (!/^[0-9]{81}$/.test(grid)) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Puzzle must be exactly 81 digits (0-9). Got ${grid.length} characters.`,
                    ...channelInfo
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, {
                text: `🔍 Solving puzzle...`,
                ...channelInfo
            }, { quoted: message });
            try {
                const { stdout } = await execAsync(`python3 "${scriptPath}" solve ${grid}`, { timeout: 30000 });
                const data = JSON.parse(stdout.trim());
                if (data.error) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ ${data.error}`,
                        ...channelInfo
                    }, { quoted: message });
                }
                await sock.sendMessage(chatId, {
                    text: `🧩 *Sudoku Solved!*\n` +
                        `✅ *Filled:* ${data.filled} empty cells\n\n` +
                        `*Puzzle:*\n\`\`\`\n${data.formatted_puzzle}\n\`\`\`\n\n` +
                        `*Solution:*\n\`\`\`\n${data.formatted_solution}\n\`\`\``,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (error) {
                await sock.sendMessage(chatId, {
                    text: `❌ Failed to solve: ${error.message}`,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        else {
            await sock.sendMessage(chatId, {
                text: `❌ Unknown subcommand: *${subCmd}*\nUse \`generate\` or \`solve\``,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:sudoku] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .sudoku: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "sudokugen": async (h) => module.exports["sudoku"](h),
    "sudokusolve": async (h) => module.exports["sudoku"](h),
    "sdk": async (h) => module.exports["sudoku"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from units.js ---
  const UNITS = {
      length: {
          mm: { factor: 0.001, base: 'm', name: 'Millimeter' },
          cm: { factor: 0.01, base: 'm', name: 'Centimeter' },
          m: { factor: 1, base: 'm', name: 'Meter' },
          km: { factor: 1000, base: 'm', name: 'Kilometer' },
          in: { factor: 0.0254, base: 'm', name: 'Inch' },
          ft: { factor: 0.3048, base: 'm', name: 'Foot' },
          yd: { factor: 0.9144, base: 'm', name: 'Yard' },
          mi: { factor: 1609.344, base: 'm', name: 'Mile' },
          nmi: { factor: 1852, base: 'm', name: 'Nautical Mile' },
          ly: { factor: 9.461e15, base: 'm', name: 'Light Year' },
      },
      weight: {
          mg: { factor: 0.000001, base: 'kg', name: 'Milligram' },
          g: { factor: 0.001, base: 'kg', name: 'Gram' },
          kg: { factor: 1, base: 'kg', name: 'Kilogram' },
          t: { factor: 1000, base: 'kg', name: 'Metric Ton' },
          oz: { factor: 0.0283495, base: 'kg', name: 'Ounce' },
          lb: { factor: 0.453592, base: 'kg', name: 'Pound' },
          st: { factor: 6.35029, base: 'kg', name: 'Stone' },
      },
      temperature: {
          c: { factor: 1, offset: 0, base: 'c', name: 'Celsius' },
          f: { factor: 1, offset: 0, base: 'c', name: 'Fahrenheit' },
          k: { factor: 1, offset: 0, base: 'c', name: 'Kelvin' },
      },
      speed: {
          mps: { factor: 1, base: 'mps', name: 'Meters/sec' },
          kph: { factor: 0.277778, base: 'mps', name: 'Km/hour' },
          mph: { factor: 0.44704, base: 'mps', name: 'Miles/hour' },
          knot: { factor: 0.514444, base: 'mps', name: 'Knot' },
          fps: { factor: 0.3048, base: 'mps', name: 'Feet/sec' },
          mach: { factor: 343, base: 'mps', name: 'Mach' },
      },
      data: {
          bit: { factor: 1, base: 'bit', name: 'Bit' },
          byte: { factor: 8, base: 'bit', name: 'Byte' },
          kb: { factor: 8000, base: 'bit', name: 'Kilobyte' },
          mb: { factor: 8e6, base: 'bit', name: 'Megabyte' },
          gb: { factor: 8e9, base: 'bit', name: 'Gigabyte' },
          tb: { factor: 8e12, base: 'bit', name: 'Terabyte' },
          pb: { factor: 8e15, base: 'bit', name: 'Petabyte' },
          kib: { factor: 8192, base: 'bit', name: 'Kibibyte' },
          mib: { factor: 8388608, base: 'bit', name: 'Mebibyte' },
          gib: { factor: 8589934592, base: 'bit', name: 'Gibibyte' },
      },
      area: {
          mm2: { factor: 1e-6, base: 'm2', name: 'mm²' },
          cm2: { factor: 1e-4, base: 'm2', name: 'cm²' },
          m2: { factor: 1, base: 'm2', name: 'm²' },
          km2: { factor: 1e6, base: 'm2', name: 'km²' },
          in2: { factor: 0.00064516, base: 'm2', name: 'in²' },
          ft2: { factor: 0.092903, base: 'm2', name: 'ft²' },
          ac: { factor: 4046.86, base: 'm2', name: 'Acre' },
          ha: { factor: 10000, base: 'm2', name: 'Hectare' },
      },
      volume: {
          ml: { factor: 0.001, base: 'l', name: 'Milliliter' },
          l: { factor: 1, base: 'l', name: 'Liter' },
          m3: { factor: 1000, base: 'l', name: 'm³' },
          tsp: { factor: 0.00492892, base: 'l', name: 'Teaspoon' },
          tbsp: { factor: 0.0147868, base: 'l', name: 'Tablespoon' },
          floz: { factor: 0.0295735, base: 'l', name: 'Fl Ounce' },
          cup: { factor: 0.236588, base: 'l', name: 'Cup' },
          pt: { factor: 0.473176, base: 'l', name: 'Pint' },
          qt: { factor: 0.946353, base: 'l', name: 'Quart' },
          gal: { factor: 3.78541, base: 'l', name: 'Gallon (US)' },
      },
      time: {
          ms: { factor: 0.001, base: 's', name: 'Millisecond' },
          s: { factor: 1, base: 's', name: 'Second' },
          min: { factor: 60, base: 's', name: 'Minute' },
          hr: { factor: 3600, base: 's', name: 'Hour' },
          day: { factor: 86400, base: 's', name: 'Day' },
          wk: { factor: 604800, base: 's', name: 'Week' },
          mo: { factor: 2629800, base: 's', name: 'Month (avg)' },
          yr: { factor: 31557600, base: 's', name: 'Year' },
      },
      pressure: {
          pa: { factor: 1, base: 'pa', name: 'Pascal' },
          kpa: { factor: 1000, base: 'pa', name: 'Kilopascal' },
          mpa: { factor: 1e6, base: 'pa', name: 'Megapascal' },
          bar: { factor: 100000, base: 'pa', name: 'Bar' },
          atm: { factor: 101325, base: 'pa', name: 'Atmosphere' },
          psi: { factor: 6894.76, base: 'pa', name: 'PSI' },
          mmhg: { factor: 133.322, base: 'pa', name: 'mmHg / Torr' },
      },
      energy: {
          j: { factor: 1, base: 'j', name: 'Joule' },
          kj: { factor: 1000, base: 'j', name: 'Kilojoule' },
          cal: { factor: 4.184, base: 'j', name: 'Calorie' },
          kcal: { factor: 4184, base: 'j', name: 'Kilocalorie' },
          wh: { factor: 3600, base: 'j', name: 'Watt-hour' },
          kwh: { factor: 3.6e6, base: 'j', name: 'Kilowatt-hour' },
          btu: { factor: 1055.06, base: 'j', name: 'BTU' },
          ev: { factor: 1.602e-19, base: 'j', name: 'Electron Volt' },
      },
  };
  // Build reverse lookup: unit symbol → category
  const UNIT_TO_CATEGORY = {};
  for (const [cat, units] of Object.entries(UNITS)) {
      for (const sym of Object.keys(units)) {
          UNIT_TO_CATEGORY[sym] = cat;
      }
  }
  function convertTemperature(value, from, to) {
      // Convert to Celsius first
      let celsius;
      if (from === 'c')
          celsius = value;
      else if (from === 'f')
          celsius = (value - 32) * 5 / 9;
      else
          celsius = value - 273.15; // kelvin
      // Convert from Celsius to target
      if (to === 'c')
          return celsius;
      if (to === 'f')
          return celsius * 9 / 5 + 32;
      return celsius + 273.15; // kelvin
  }
  function convert(value, from, to) {
      from = from.toLowerCase();
      to = to.toLowerCase();
      const cat = UNIT_TO_CATEGORY[from];
      if (!cat || UNIT_TO_CATEGORY[to] !== cat)
          return null;
      if (cat === 'temperature') {
          return { result: convertTemperature(value, from, to), category: cat };
      }
      const fromUnit = UNITS[cat][from];
      const toUnit = UNITS[cat][to];
      const base = value * fromUnit.factor;
      const result = base / toUnit.factor;
      return { result, category: cat };
  }
  function formatNumber(n) {
      if (Math.abs(n) < 0.0001 || Math.abs(n) >= 1e12)
          return n.toExponential(4);
      const str = n.toPrecision(8).replace(/\.?0+$/, '');
      return str;
  }
  return {

    // ── .units ─── Convert between 100+ units — length, weight, speed, data, temperature and more | usage: .units <value> <from> to <to>\nExample: .units 100 km to miles
    "units": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'units ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const input = args.join(' ').trim().toLowerCase();
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `📏 *Unit Converter*\n\n` +
                    `*Usage:* \`.units <value> <from> to <to>\`\n\n` +
                    `*Examples:*\n` +
                    `• \`.units 100 km to mi\`\n` +
                    `• \`.units 70 kg to lb\`\n` +
                    `• \`.units 37 c to f\`\n` +
                    `• \`.units 1 gb to mb\`\n` +
                    `• \`.units 60 mph to kph\`\n` +
                    `• \`.units 1 yr to day\`\n` +
                    `• \`.units 1 atm to psi\`\n` +
                    `• \`.units 500 kcal to kj\`\n\n` +
                    `*Categories:*\n` +
                    `📐 length · ⚖️ weight · 🌡️ temperature\n` +
                    `💨 speed · 💾 data · 📦 volume\n` +
                    `🗺️ area · ⏱️ time · 🔋 energy · 🌬️ pressure`,
                ...channelInfo
            }, { quoted: message });
        }
        // Parse: <value> <from> to <to>   OR   <value> <from> <to>
        const toIndex = args.findIndex((a) => a.toLowerCase() === 'to');
        let value, fromUnit, toUnit;
        if (toIndex === 2 && args.length === 4) {
            value = parseFloat(args[0]);
            fromUnit = args[1].toLowerCase();
            toUnit = args[3].toLowerCase();
        }
        else if (args.length === 3 && toIndex === -1) {
            value = parseFloat(args[0]);
            fromUnit = args[1].toLowerCase();
            toUnit = args[2].toLowerCase();
        }
        else {
            return await sock.sendMessage(chatId, {
                text: `❌ Wrong format.\n\nUse: \`.units 100 km to mi\``,
                ...channelInfo
            }, { quoted: message });
        }
        if (isNaN(value)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Invalid number: \`${args[0]}\``,
                ...channelInfo
            }, { quoted: message });
        }
        const res = convert(value, fromUnit, toUnit);
        if (!res) {
            const fromCat = UNIT_TO_CATEGORY[fromUnit];
            const toCat = UNIT_TO_CATEGORY[toUnit];
            if (!fromCat) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Unknown unit: \`${fromUnit}\`\n\nUse \`.units\` to see all supported units.`,
                    ...channelInfo
                }, { quoted: message });
            }
            if (!toCat) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Unknown unit: \`${toUnit}\``,
                    ...channelInfo
                }, { quoted: message });
            }
            return await sock.sendMessage(chatId, {
                text: `❌ Cannot convert *${fromUnit}* (${fromCat}) to *${toUnit}* (${toCat}) — different categories.`,
                ...channelInfo
            }, { quoted: message });
        }
        const fromName = UNITS[res.category][fromUnit].name;
        const toName = UNITS[res.category][toUnit].name;
        const catEmojis = {
            length: '📐', weight: '⚖️', temperature: '🌡️', speed: '💨',
            data: '💾', area: '🗺️', volume: '📦', time: '⏱️',
            pressure: '🌬️', energy: '🔋'
        };
        const emoji = catEmojis[res.category] || '📏';
        await sock.sendMessage(chatId, {
            text: `${emoji} *Unit Converter*\n\n` +
                `📥 *Input:* ${value} ${fromName} (${fromUnit})\n` +
                `📤 *Result:* ${formatNumber(res.result)} ${toName} (${toUnit})\n\n` +
                `📂 *Category:* ${res.category.charAt(0).toUpperCase() + res.category.slice(1)}`,
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:units] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .units: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "conv": async (h) => module.exports["units"](h),
    "unit": async (h) => module.exports["units"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  const fs = require('fs');
  // --- helper code from urldecode.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  const WA_LIMIT = 60000;
  function getQuoted(message) {
      return message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  }
  async function sendResult(sock, chatId, channelInfo, message, text, filename) {
      if (text.length > WA_LIMIT) {
          const tmpFile = path.join(process.cwd(), 'temp', filename);
          fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
          fs.writeFileSync(tmpFile, text);
          await sock.sendMessage(chatId, {
              document: fs.readFileSync(tmpFile),
              mimetype: 'text/plain',
              fileName: filename,
              caption: '🌐 Result too large for WhatsApp, sent as file.',
              ...channelInfo
          }, { quoted: message });
          try {
              fs.unlinkSync(tmpFile);
          }
          catch { }
      }
      else {
          await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
      }
  }
  return {

    // ── .urldecode ─── Encode/decode URLs or extract all links from text/files | usage: .urldecode <url>\n.urlencode <text>\n.extractlinks <text or reply to file>
    "urldecode": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'urldecode ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo, userMessage } = context;
        const scriptPath = path.join(process.cwd(), 'lib', 'urltool.py');
        if (!fs.existsSync(scriptPath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ urltool.py not found in lib/.`,
                ...channelInfo
            }, { quoted: message });
        }
        const quoted = getQuoted(message);
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const hasDoc = !!quoted?.documentMessage;
        // Detect mode from command used
        let mode = 'decode';
        if (userMessage.startsWith('urlencode') || userMessage.startsWith('/urlencode') ||
            userMessage.startsWith('.urlencode') || userMessage.startsWith('!urlencode')) {
            mode = 'encode';
        }
        else if (userMessage.startsWith('extractlinks') || userMessage.startsWith('/extractlinks') ||
            userMessage.startsWith('.extractlinks') || userMessage.startsWith('!extractlinks') ||
            userMessage.startsWith('links')) {
            mode = 'extract';
        }
        else if (args[0]?.toLowerCase() === 'encode') {
            mode = 'encode';
            args = args.slice(1);
        }
        else if (args[0]?.toLowerCase() === 'extract' || args[0]?.toLowerCase() === 'links') {
            mode = 'extract';
            args = args.slice(1);
        }
        else if (args[0]?.toLowerCase() === 'decode') {
            mode = 'decode';
            args = args.slice(1);
        }
        const textInput = args.join(' ').trim() || quotedText;
        if (!textInput && !hasDoc) {
            return await sock.sendMessage(chatId, {
                text: `🌐 *URL Tools*\n\n` +
                    `*Decode a URL:*\n` +
                    `\`.urldecode https://example.com/path%20with%20spaces\`\n\n` +
                    `*Encode text to URL:*\n` +
                    `\`.urlencode hello world & more\`\n\n` +
                    `*Extract all links from text:*\n` +
                    `\`.extractlinks <paste text>\`\n` +
                    `Or reply to any text message or file with \`.extractlinks\`\n\n` +
                    `*Shortcut modes:*\n` +
                    `\`.urldecode encode <text>\`\n` +
                    `\`.urldecode extract <text>\``,
                ...channelInfo
            }, { quoted: message });
        }
        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const id = Date.now();
        try {
            let stdout;
            if (hasDoc && quoted && mode === 'extract') {
                // Download and extract from file
                await sock.sendMessage(chatId, { text: '⏳ Reading file...', ...channelInfo }, { quoted: message });
                const msgObj = { message: { documentMessage: quoted.documentMessage } };
                const buf = await downloadMediaMessage(msgObj, 'buffer', {});
                const tmpFile = path.join(tempDir, `url_in_${id}.txt`);
                fs.writeFileSync(tmpFile, buf);
                const result = await execAsync(`python3 "${scriptPath}" extract --file "${tmpFile}"`, { timeout: 30000 });
                stdout = result.stdout;
                try {
                    fs.unlinkSync(tmpFile);
                }
                catch { }
            }
            else {
                const safeText = textInput.replace(/'/g, "'\"'\"'");
                const result = await execAsync(`python3 "${scriptPath}" ${mode} '${safeText}'`, { timeout: 30000 });
                stdout = result.stdout;
            }
            const data = JSON.parse(stdout.trim());
            if (data.error) {
                return await sock.sendMessage(chatId, { text: `❌ ${data.error}`, ...channelInfo }, { quoted: message });
            }
            let resultText = '';
            if (mode === 'decode') {
                resultText = `🌐 *URL Decoder*\n\n` +
                    `📥 *Original:*\n\`${data.original}\`\n\n` +
                    `📤 *Decoded:*\n\`${data.decoded}\``;
                if (data.scheme)
                    resultText += `\n\n🔍 *Breakdown:*\n• Scheme: ${data.scheme}\n• Host: ${data.host}\n• Path: ${data.path}`;
                if (data.query_params) {
                    const params = Object.entries(data.query_params).map(([k, v]) => `  • ${k}: ${v}`).join('\n');
                    resultText += `\n• Params:\n${params}`;
                }
                if (data.fragment)
                    resultText += `\n• Fragment: ${data.fragment}`;
            }
            else if (mode === 'encode') {
                resultText = `🌐 *URL Encoder*\n\n` +
                    `📥 *Original:*\n\`${data.original}\`\n\n` +
                    `🔒 *Fully Encoded:*\n\`${data.fully_encoded}\`\n\n` +
                    `🔓 *Safe Encoded:*\n\`${data.safe_encoded}\``;
            }
            else {
                // Extract
                if (data.total === 0) {
                    resultText = `🌐 *Link Extractor*\n\n❌ No links found in the text.`;
                }
                else {
                    const lines = [`🌐 *Link Extractor — ${data.total} links found*\n`];
                    if (data.social?.length) {
                        lines.push(`📱 *Social Media (${data.social.length}):*`);
                        data.social.forEach((u) => lines.push(`• ${u}`));
                        lines.push('');
                    }
                    if (data.media?.length) {
                        lines.push(`🖼️ *Media Files (${data.media.length}):*`);
                        data.media.forEach((u) => lines.push(`• ${u}`));
                        lines.push('');
                    }
                    if (data.documents?.length) {
                        lines.push(`📄 *Documents (${data.documents.length}):*`);
                        data.documents.forEach((u) => lines.push(`• ${u}`));
                        lines.push('');
                    }
                    if (data.other?.length) {
                        lines.push(`🔗 *Other Links (${data.other.length}):*`);
                        data.other.forEach((u) => lines.push(`• ${u}`));
                    }
                    resultText = lines.join('\n');
                }
            }
            await sendResult(sock, chatId, channelInfo, message, resultText, `urls_${id}.txt`);
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:urldecode] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .urldecode: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "urlencode": async (h) => module.exports["urldecode"](h),
    "urlextract": async (h) => module.exports["urldecode"](h),
    "links": async (h) => module.exports["urldecode"](h),
    "extractlinks": async (h) => module.exports["urldecode"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { exec, execFile } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  const fs = require('fs');
  // --- helper code from wordcloud.js ---
  const execAsync = promisify(exec);
  const execFileAsync = promisify(execFile);
  const WA_LIMIT = 60000;
  function getQuoted(message) {
      return message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  }
  async function sendResult(sock, chatId, channelInfo, message, text, filename) {
      if (text.length > WA_LIMIT) {
          const tmpFile = path.join(process.cwd(), 'temp', filename);
          fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
          fs.writeFileSync(tmpFile, text);
          await sock.sendMessage(chatId, {
              document: fs.readFileSync(tmpFile),
              mimetype: 'text/plain',
              fileName: filename,
              caption: '📝 Result too large for WhatsApp, sent as file.',
              ...channelInfo
          }, { quoted: message });
          try {
              fs.unlinkSync(tmpFile);
          }
          catch { }
      }
      else {
          await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
      }
  }
  return {

    // ── .wordcloud ─── Analyze text and show top 20 most used words with stats | usage: .wordcloud <text or reply to any message/file>
    "wordcloud": async (h) => {
      const sock = h.sock;
      const message = h.msg;
      const args = h.args;
      const context = {
        chatId: h.from,
        senderId: h.senderJid,
        isGroup: h.isGroup,
        isBotAdmin: h.isBotAdmin,
        senderIsOwnerOrSudo: h.isOwner || h.isSubAdmin || h.isCoOwner,
        isSenderAdmin: h.isBotAdmin,
        isOwnerOrSudoCheck: h.isOwner || h.isSubAdmin || h.isCoOwner,
        config: h.config,
        rawText: (h.config.prefix + 'wordcloud ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const scriptPath = path.join(process.cwd(), 'lib', 'wordcloud.py');
        if (!fs.existsSync(scriptPath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ wordcloud.py not found in lib/. Please check installation.`,
                ...channelInfo
            }, { quoted: message });
        }
        const quoted = getQuoted(message);
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const hasDoc = !!quoted?.documentMessage;
        const textInput = args.join(' ').trim() || quotedText;
        if (!textInput && !hasDoc) {
            return await sock.sendMessage(chatId, {
                text: `📝 *Word Cloud Analyzer*\n\n` +
                    `*Usage:*\n` +
                    `\`.wordcloud <paste any text here>\`\n\n` +
                    `*Or reply to:*\n` +
                    `• Any text message\n` +
                    `• A .txt or document file\n\n` +
                    `*Output includes:*\n` +
                    `📊 Word count, unique words, sentences\n` +
                    `🏆 Top 20 most used words\n` +
                    `⏱️ Reading time estimate\n` +
                    `📖 Lexical diversity score`,
                ...channelInfo
            }, { quoted: message });
        }
        await sock.sendMessage(chatId, { text: '🔍 Analyzing text...', ...channelInfo }, { quoted: message });
        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const id = Date.now();
        try {
            let cmd;
            if (hasDoc && quoted) {
                // Download document
                const msgObj = { message: { documentMessage: quoted.documentMessage } };
                const buf = await downloadMediaMessage(msgObj, 'buffer', {});
                const tmpFile = path.join(tempDir, `wc_in_${id}.txt`);
                fs.writeFileSync(tmpFile, buf);
                cmd = `python3 "${scriptPath}" --file "${tmpFile}"`;
                const { stdout } = await execAsync(cmd, { timeout: 30000 });
                try {
                    fs.unlinkSync(tmpFile);
                }
                catch { }
                const data = JSON.parse(stdout.trim());
                if (data.error) {
                    return await sock.sendMessage(chatId, { text: `❌ ${data.error}`, ...channelInfo }, { quoted: message });
                }
                await sendResult(sock, chatId, channelInfo, message, formatResult(data), `wordcloud_${id}.txt`);
            }
            else {
                const tmpFile = path.join(tempDir, `wc_in_${id}.txt`);
                fs.writeFileSync(tmpFile, textInput);
                cmd = `python3 "${scriptPath}" --file "${tmpFile}"`;
                const { stdout } = await execAsync(cmd, { timeout: 30000 });
                try {
                    fs.unlinkSync(tmpFile);
                }
                catch { }
                const data = JSON.parse(stdout.trim());
                if (data.error) {
                    return await sock.sendMessage(chatId, { text: `❌ ${data.error}`, ...channelInfo }, { quoted: message });
                }
                await sendResult(sock, chatId, channelInfo, message, formatResult(data), `wordcloud_${id}.txt`);
            }
        }
        catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ Analysis failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:wordcloud] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .wordcloud: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "wordfreq": async (h) => module.exports["wordcloud"](h),
    "topwords": async (h) => module.exports["wordcloud"](h),
    "wordcount": async (h) => module.exports["wordcloud"](h),
  };
})());

