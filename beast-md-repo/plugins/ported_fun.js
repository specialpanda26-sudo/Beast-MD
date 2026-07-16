// Beast MD ported module (category: fun)
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


  return {

    // ── .8ball ─── Ask the magic 8-ball a question | usage: .8ball Will I be rich?
    "8ball": async (h) => {
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
        rawText: (h.config.prefix + '8ball ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const question = args.join(' ');
            if (!question) {
                await sock.sendMessage(chatId, {
                    text: '🎱 Please ask a question!'
                }, { quoted: message });
                return;
            }
            const eightBallResponses = [
                "Yes, definitely!",
                "No way!",
                "Ask again later.",
                "It is certain.",
                "Very doubtful.",
                "Without a doubt.",
                "My reply is no.",
                "Signs point to yes."
            ];
            const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
            await sock.sendMessage(chatId, {
                text: `🎱 *Question:* ${question}\n\n*Answer:* ${randomResponse}`
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in 8ball command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Something went wrong with the magic 8-ball!'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:8ball] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .8ball: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "eightball": async (h) => module.exports["8ball"](h),
    "magic8ball": async (h) => module.exports["8ball"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .flirt ─── Get a random flirt message | usage: .flirt
    "flirt": async (h) => {
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
        rawText: (h.config.prefix + 'flirt ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const shizokeys = 'shizo';
            const res = await fetch(`https://shizoapi.onrender.com/api/texts/flirt?apikey=${shizokeys}`);
            if (!res.ok)
                throw await res.text();
            const r = await res.json();
            await sock.sendMessage(chatId, { text: r.result }, { quoted: message });
        }
        catch (e) {
            console.error('Error in flirt command:', e);
            await sock.sendMessage(chatId, { text: '❌ Failed to get flirt message. Please try again later!' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:flirt] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .flirt: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "flirty": async (h) => module.exports["flirt"](h),
    "pickuplines": async (h) => module.exports["flirt"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .hack ─── Simulate a hack sequence (fun prank) | usage: .hack <target>
    "hack": async (h) => {
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
        rawText: (h.config.prefix + 'hack ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const target = args?.[0] || 'target';
        try {
            await sock.sendMessage(chatId, { text: '*💻 Initializing hack sequence...*' }, { quoted: message });
            await delay(1500);
            await sock.sendMessage(chatId, { text: '*🔌 Establishing secure connection to the server...*' }, { quoted: message });
            await delay(1500);
            await sock.sendMessage(chatId, { text: '*🛡 Bypassing firewalls and security protocols...*' }, { quoted: message });
            await displayProgressBar(sock, message, 'Bypassing firewalls', 4, chatId);
            await sock.sendMessage(chatId, { text: '*🔐 Gaining access to encrypted database...*' }, { quoted: message });
            await delay(2000);
            await sock.sendMessage(chatId, { text: '*🔑 Cracking encryption keys...*' }, { quoted: message });
            await displayProgressBar(sock, message, 'Cracking encryption', 6, chatId);
            await sock.sendMessage(chatId, { text: '*📥 Downloading sensitive data from server...*' }, { quoted: message });
            await displayProgressBar(sock, message, 'Downloading files', 5, chatId);
            await sock.sendMessage(chatId, { text: '*🔒 Planting a backdoor for future access...*' }, { quoted: message });
            await delay(2500);
            await sock.sendMessage(chatId, { text: `*💥 Hack complete! 🎯 Target "${target}" successfully compromised.*` }, { quoted: message });
            await delay(1000);
            await sock.sendMessage(chatId, { text: '*🤖 Mission accomplished. Logging off...*' }, { quoted: message });
        }
        catch (error) {
            console.error('Error in hack sequence:', error);
            await sock.sendMessage(chatId, { text: '*⚠️ An error occurred during the hack sequence. Please try again later.*' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:hack] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .hack: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "fakehack": async (h) => module.exports["hack"](h),
    "prankhack": async (h) => module.exports["hack"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');

  return {

    // ── .joke ─── Get a random dad joke | usage: .joke
    "joke": async (h) => {
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
        rawText: (h.config.prefix + 'joke ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const response = await axios.get('https://icanhazdadjoke.com/', {
                headers: { Accept: 'application/json' }
            });
            const joke = response.data.joke;
            await sock.sendMessage(chatId, { text: `😂 ${joke}` }, { quoted: message });
        }
        catch (error) {
            console.error('Error fetching dad joke:', error);
            await sock.sendMessage(chatId, {
                text: 'Sorry, I could not fetch a joke right now. Please try again later.',
                quoted: message
            });
        }
    
      } catch (portErr) {
        console.error('[ported:joke] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .joke: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "jokes": async (h) => module.exports["joke"](h),
    "funny": async (h) => module.exports["joke"](h),
  };
})());


Object.assign(module.exports, (() => {
  const { pickRandom } = require('../lib_ported/localData');

  return {

    // ── .joke2 ─── Get a random general joke | usage: .joke2
    "joke2": async (h) => {
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
        rawText: (h.config.prefix + 'joke2 ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const randomJoke = pickRandom('text/random_jokes.json');
            if (!randomJoke) {
                return await sock.sendMessage(chatId, { text: '❌ No jokes available.' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { text: `😂 *Joke*\n\n${randomJoke}` }, { quoted: message });
        }
        catch (err) {
            console.error('Joke plugin error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error while fetching joke.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:joke2] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .joke2: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "funny2": async (h) => module.exports["joke2"](h),
    "jokes2": async (h) => module.exports["joke2"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .meme ─── Get a random cheems meme with buttons for another meme or joke | usage: .meme
    "meme": async (h) => {
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
        rawText: (h.config.prefix + 'meme ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const res = await fetch('https://shizoapi.onrender.com/api/memes/cheems?apikey=shizo');
            if (!res.ok)
                throw new Error(`API request failed with status ${res.status}`);
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('image')) {
                const imageBuffer = Buffer.from(await res.arrayBuffer());
                const buttons = [
                    { buttonId: '.meme', buttonText: { displayText: '🎭 Another Meme' }, type: 1 },
                    { buttonId: '.joke', buttonText: { displayText: '😄 Joke' }, type: 1 }
                ];
                await sock.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: "🐕 > Here's your cheems meme!",
                    buttons,
                    headerType: 1
                }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, {
                    text: '❌ The API did not return a valid image.',
                    quoted: message
                });
            }
        }
        catch (error) {
            console.error('Meme Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch meme. Please try again later.',
                quoted: message
            });
        }
    
      } catch (portErr) {
        console.error('[ported:meme] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .meme: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "cheems": async (h) => module.exports["meme"](h),
    "memes": async (h) => module.exports["meme"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from teddy.js ---
  const teddyUsers = {};
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  return {

    // ── .teddy ─── Send an animated teddy with cute emojis | usage: .teddy
    "teddy": async (h) => {
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
        rawText: (h.config.prefix + 'teddy ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;
        if (teddyUsers[sender])
            return;
        teddyUsers[sender] = true;
        const teddyEmojis = [
            '❤', '💕', '😻', '🧡', '💛', '💚', '💙', '💜', '🖤', '❣',
            '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥', '💌', '🙂',
            '🤗', '😌', '😉', '🤗', '😊', '🎊', '🎉', '🎁', '🎈'
        ];
        try {
            const pingMsg = await sock.sendMessage(chatId, { text: `(\\_/)\n( •.•)\n/>🤍` }, { quoted: message });
            for (let i = 0; i < teddyEmojis.length; i++) {
                await sleep(500);
                await sock.relayMessage(chatId, {
                    protocolMessage: {
                        key: pingMsg.key,
                        type: 14,
                        editedMessage: {
                            conversation: `(\\_/)\n( •.•)\n/>${teddyEmojis[i]}`
                        }
                    }
                }, {});
            }
        }
        catch (err) {
            console.error('Error in teddy command:', err);
            try {
                await sock.sendMessage(chatId, { text: '❌ Something went wrong while sending teddy emojis.' }, { quoted: message });
            }
            catch { }
        }
        finally {
            delete teddyUsers[sender];
        }
    
      } catch (portErr) {
        console.error('[ported:teddy] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .teddy: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },

  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  // --- helper code from why.js ---
  async function fetchWithRetries(url, retries = 3, delay = 2000) {
      let attempt = 0;
      while (attempt < retries) {
          try {
              const { data } = await axios.get(url);
              return data;
          }
          catch (err) {
              attempt++;
              console.error(`[WHY] Attempt ${attempt} failed:`, err.message);
              if (attempt >= retries)
                  throw new Error('Max retries reached');
              await new Promise(r => setTimeout(r, delay));
          }
      }
  }
  return {

    // ── .why ─── Get a random “why” question from the API | usage: .why
    "why": async (h) => {
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
        rawText: (h.config.prefix + 'why ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const data = await fetchWithRetries('https://nekos.life/api/v2/why');
            if (!data?.why?.trim()) {
                return await sock.sendMessage(chatId, { text: '❌ Invalid response from API. Try again.' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { text: `🤔 *Why?*\n\n${data.why}` }, { quoted: message });
        }
        catch (error) {
            console.error('Why plugin error:', error);
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch question. Try again later.' }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:why] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .why: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "whyme": async (h) => module.exports["why"](h),
    "question": async (h) => module.exports["why"](h),
  };
})());

