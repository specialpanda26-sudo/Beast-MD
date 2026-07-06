// AUTO-PORTED from friend's MEGA-MD bot (category: group)
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
  const { channelInfo } = require('../lib_ported/messageConfig.js');
  // --- helper code from character.js ---
  const extractPhoneNumber = (jid) => {
      if (!jid)
          return null;
      const number = jid
          .replace('@s.whatsapp.net', '')
          .replace('@lid', '')
          .replace('@g.us', '')
          .split(':')[0];
      if (number.length < 10 && jid.includes('@lid'))
          return null;
      return number;
  };
  const _getDisplayName = async (jid, sock, pushName) => {
      try {
          if (pushName?.trim())
              return pushName.trim();
          if (sock.store?.contacts?.[jid]) {
              const contact = sock.store.contacts[jid];
              if (contact.name || contact.notify)
                  return contact.name || contact.notify;
          }
          const phone = extractPhoneNumber(jid);
          if (phone && phone.length >= 10)
              return `+${phone}`;
          return jid.split('@')[0].split(':')[0];
      }
      catch {
          return jid.split('@')[0].split(':')[0];
      }
  };
  const TRAITS = [
      'Intelligent', 'Creative', 'Determined', 'Ambitious', 'Caring',
      'Charismatic', 'Confident', 'Empathetic', 'Energetic', 'Friendly',
      'Generous', 'Honest', 'Humorous', 'Imaginative', 'Independent',
      'Intuitive', 'Kind', 'Logical', 'Loyal', 'Optimistic',
      'Passionate', 'Patient', 'Persistent', 'Reliable', 'Resourceful',
      'Sincere', 'Thoughtful', 'Understanding', 'Versatile', 'Wise'
  ];
  return {

    // ── .character ───  | usage: .character @user
    "character": async (h) => {
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
        rawText: (h.config.prefix + 'character ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        let userJid = ctx?.mentionedJid?.[0] ||
            ctx?.participant ||
            message.key.participant;
        if (!userJid) {
            return sock.sendMessage(chatId, {
                text: '❌ Please mention someone or reply to their message to analyze their character!',
                ...channelInfo
            }, { quoted: message });
        }
        if (userJid.includes('@lid') && sock.store?.contacts) {
            const resolved = Object.keys(sock.store.contacts).find(k => sock.store.contacts[k]?.lid === userJid);
            if (resolved)
                userJid = resolved;
        }
        try {
            let profilePic;
            try {
                profilePic = await sock.profilePictureUrl(userJid, 'image');
            }
            catch {
                profilePic = 'https://i.imgur.com/2wzGhpF.jpeg';
            }
            let displayName;
            if (userJid.includes('@lid')) {
                // lid JID - can't resolve to real number unless in contacts
                const fromContacts = sock.store?.contacts?.[userJid];
                displayName = fromContacts?.name || fromContacts?.notify || 'Unknown User';
            }
            else {
                displayName = await sock.getName(userJid) || `+${ userJid.replace('@s.whatsapp.net', '')}`;
            }
            // Pick random traits
            const numTraits = Math.floor(Math.random() * 3) + 3;
            const selected = [];
            while (selected.length < numTraits) {
                const t = TRAITS[Math.floor(Math.random() * TRAITS.length)];
                if (!selected.includes(t))
                    selected.push(t);
            }
            const traitLines = selected.map(t => `• ${t}: ${Math.floor(Math.random() * 41) + 60}%`);
            const analysis = `🔮 *Character Analysis* 🔮\n\n` +
                `👤 *User:* ${displayName}\n\n` +
                `✨ *Key Traits:*\n${traitLines.join('\n')}\n\n` +
                `🎯 *Overall Rating:* ${Math.floor(Math.random() * 21) + 80}%\n\n` +
                `_Note: This is a fun analysis, don't take it seriously!_`;
            await sock.sendMessage(chatId, {
                image: { url: profilePic },
                caption: analysis,
                mentions: [userJid],
                ...channelInfo
            }, { quoted: message });
        }
        catch {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to analyze character! Try again later.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:character] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .character: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "personality": async (h) => module.exports["character"](h),
    "traits": async (h) => module.exports["character"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from compliment.js ---
  const compliments = [
      "You're amazing just the way you are!",
      "You have a great sense of humor!",
      "You're incredibly thoughtful and kind.",
      "You are more powerful than you know.",
      "You light up the room!",
      "You're a true friend.",
      "You inspire me!",
      "Your creativity knows no bounds!",
      "You have a heart of gold.",
      "You make a difference in the world.",
      "Your positivity is contagious!",
      "You have an incredible work ethic.",
      "You bring out the best in people.",
      "Your smile brightens everyone's day.",
      "You're so talented in everything you do.",
      "Your kindness makes the world a better place.",
      "You have a unique and wonderful perspective.",
      "Your enthusiasm is truly inspiring!",
      "You are capable of achieving great things.",
      "You always know how to make someone feel special.",
      "Your confidence is admirable.",
      "You have a beautiful soul.",
      "Your generosity knows no limits.",
      "You have a great eye for detail.",
      "Your passion is truly motivating!",
      "You are an amazing listener.",
      "You're stronger than you think!",
      "Your laughter is infectious.",
      "You have a natural gift for making others feel valued.",
      "You make the world a better place just by being in it."
  ];
  return {

    // ── .compliment ─── Send a random compliment to a user | usage: .compliment @user
    "compliment": async (h) => {
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
        rawText: (h.config.prefix + 'compliment ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            if (!message || !chatId) {
                console.log('Invalid message or chatId:', { message, chatId });
                return;
            }
            let userToCompliment;
            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                userToCompliment =
                    message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                userToCompliment =
                    message.message.extendedTextMessage.contextInfo.participant;
            }
            if (!userToCompliment) {
                await sock.sendMessage(chatId, {
                    text: 'Please mention someone or reply to their message to compliment them!'
                }, { quoted: message });
                return;
            }
            const compliment = compliments[Math.floor(Math.random() * compliments.length)];
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendMessage(chatId, {
                text: `Hey @${userToCompliment.split('@')[0]}, ${compliment}`,
                mentions: [userToCompliment]
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in compliment command:', error);
            if (error?.data === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    await sock.sendMessage(chatId, {
                        text: 'Please try again in a few seconds.'
                    }, { quoted: message });
                }
                catch (retryError) {
                    console.error('Error sending retry message:', retryError);
                }
            }
            else {
                try {
                    await sock.sendMessage(chatId, {
                        text: 'An error occurred while sending the compliment.'
                    }, { quoted: message });
                }
                catch (sendError) {
                    console.error('Error sending error message:', sendError);
                }
            }
        }
    
      } catch (portErr) {
        console.error('[ported:compliment] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .compliment: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "praise": async (h) => module.exports["compliment"](h),
    "nice": async (h) => module.exports["compliment"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .gcmtdata ─── Get detailed info about the current group | usage: .gcinfo
    "gcmtdata": async (h) => {
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
        rawText: (h.config.prefix + 'gcmtdata ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        try {
            const meta = await sock.groupMetadata(chatId);
            const admins = meta.participants.filter((p) => p.admin).map((p) => `  • @${p.id.split('@')[0]}`).join('\n');
            const created = meta.creation
                ? new Date(meta.creation * 1000).toLocaleDateString()
                : 'Unknown';
            const memberCount = meta.participants.length;
            const adminCount = meta.participants.filter((p) => p.admin).length;
            await sock.sendMessage(chatId, {
                text: `╔═══════════════════════╗\n` +
                    `║    📊 *GROUP INFO*       ║\n` +
                    `╚═══════════════════════╝\n\n` +
                    `*📛 Name:* ${meta.subject}\n` +
                    `*📝 Description:*\n${meta.desc || '_No description_'}\n\n` +
                    `*👥 Members:* ${memberCount}\n` +
                    `*👑 Admins:* ${adminCount}\n` +
                    `*📅 Created:* ${created}\n` +
                    `*🆔 JID:* \`${meta.id}\`\n\n` +
                    `*👑 Admin List:*\n${admins || '_None_'}`,
                mentions: meta.participants.filter((p) => p.admin).map((p) => p.id),
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[GROUPMETADATA] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to fetch group info: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:gcmtdata] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .gcmtdata: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gcinfo": async (h) => module.exports["gcmtdata"](h),
    "gcmetadata": async (h) => module.exports["gcmtdata"](h),
    "groupdata": async (h) => module.exports["gcmtdata"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .groupinfo ─── Display detailed group information | usage: .groupinfo
    "groupinfo": async (h) => {
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
        rawText: (h.config.prefix + 'groupinfo ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            let pp;
            try {
                pp = await sock.profilePictureUrl(chatId, 'image');
            }
            catch {
                pp = 'https://i.imgur.com/2wzGhpF.jpeg';
            }
            const participants = groupMetadata.participants;
            const groupAdmins = participants.filter((p) => p.admin);
            const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
            const owner = groupMetadata.owner || groupAdmins.find((p) => p.admin === 'superadmin')?.id || `${chatId.split('-')[0] }@s.whatsapp.net`;
            const text = `
┌──「 *INFO GROUP* 」
▢ *♻️ID:*
   • ${groupMetadata.id}
▢ *🔖NAME* : 
• ${groupMetadata.subject}
▢ *👥Members* :
• ${participants.length}
▢ *🤿Group Owner:*
• @${owner.split('@')[0]}
▢ *🕵🏻‍♂️Admins:*
${listAdmin}

▢ *📌Description* :
   • ${groupMetadata.desc?.toString() || 'No description'}
`.trim();
            await sock.sendMessage(chatId, {
                image: { url: pp },
                caption: text,
                mentions: [...groupAdmins.map((v) => v.id), owner],
                ...channelInfo
            });
        }
        catch (error) {
            console.error('Error in groupinfo command:', error);
            await sock.sendMessage(chatId, {
                text: 'Failed to get group info!',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:groupinfo] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .groupinfo: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "ginfo": async (h) => module.exports["groupinfo"](h),
    "infogroup": async (h) => module.exports["groupinfo"](h),
  };
})());


Object.assign(module.exports, (() => {

  // --- helper code from insult.js ---
  const insults = [
      "You're like a cloud. When you disappear, it's a beautiful day!",
      "You bring everyone so much joy when you leave the room!",
      "I'd agree with you, but then we'd both be wrong.",
      "You're not stupid; you just have bad luck thinking.",
      "Your secrets are always safe with me. I never even listen to them.",
      "You're proof that even evolution takes a break sometimes.",
      "You have something on your chin... no, the third one down.",
      "You're like a software update. Whenever I see you, I think, 'Do I really need this right now?'",
      "You bring everyone happiness... you know, when you leave.",
      "You're like a penny—two-faced and not worth much.",
      "You have something on your mind... oh wait, never mind.",
      "You're the reason they put directions on shampoo bottles.",
      "You're like a cloud. Always floating around with no real purpose.",
      "Your jokes are like expired milk—sour and hard to digest.",
      "You're like a candle in the wind... useless when things get tough.",
      "You have something unique—your ability to annoy everyone equally.",
      "You're like a Wi-Fi signal—always weak when needed most.",
      "You're proof that not everyone needs a filter to be unappealing.",
      "Your energy is like a black hole—it just sucks the life out of the room.",
      "You have the perfect face for radio.",
      "You're like a traffic jam—nobody wants you, but here you are.",
      "You're like a broken pencil—pointless.",
      "Your ideas are so original, I'm sure I've heard them all before.",
      "You're living proof that even mistakes can be productive.",
      "You're not lazy; you're just highly motivated to do nothing.",
      "Your brain's running Windows 95—slow and outdated.",
      "You're like a speed bump—nobody likes you, but everyone has to deal with you.",
      "You're like a cloud of mosquitoes—just irritating.",
      "You bring people together... to talk about how annoying you are."
  ];
  return {

    // ── .insult ─── Send a playful insult to someone by mentioning them or replying to their message | usage: .insult @username or reply to their message with .insult
    "insult": async (h) => {
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
        rawText: (h.config.prefix + 'insult ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            let userToInsult;
            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                userToInsult = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                userToInsult = message.message.extendedTextMessage.contextInfo.participant;
            }
            if (!userToInsult) {
                await sock.sendMessage(chatId, {
                    text: '❌ Please mention someone or reply to their message to insult them!',
                    quoted: message
                });
                return;
            }
            const insult = insults[Math.floor(Math.random() * insults.length)];
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendMessage(chatId, {
                text: `Hey @${userToInsult.split('@')[0]}, ${insult}`,
                mentions: [userToInsult],
                quoted: message
            });
        }
        catch (error) {
            console.error('Error in insult command:', error);
            if (error.data === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ Too many requests. Please try again in a few seconds.',
                        quoted: message
                    });
                }
                catch (retryError) {
                    console.error('Error sending retry message:', retryError);
                }
            }
            else {
                try {
                    await sock.sendMessage(chatId, {
                        text: '❌ An error occurred while sending the insult.',
                        quoted: message
                    });
                }
                catch (sendError) {
                    console.error('Error sending error message:', sendError);
                }
            }
        }
    
      } catch (portErr) {
        console.error('[ported:insult] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .insult: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "roast": async (h) => module.exports["insult"](h),
    "mock": async (h) => module.exports["insult"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .invitelink ─── Get or revoke the group invite link | usage: .invitelink — get link\n.revokeinvite — reset link
    "invitelink": async (h) => {
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
        rawText: (h.config.prefix + 'invitelink ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const isBotAdmin = context.isBotAdmin || false;
        const isRevoke = rawText.startsWith('.revokeinvite') || rawText.startsWith('.resetlink') || args[0]?.toLowerCase() === 'revoke';
        if (isRevoke && !isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: `❌ Bot needs to be an admin to revoke the invite link.`,
                ...channelInfo
            }, { quoted: message });
        }
        try {
            if (isRevoke) {
                const newCode = await sock.groupRevokeInvite(chatId);
                return await sock.sendMessage(chatId, {
                    text: `🔄 *Invite link reset!*\n\n*New Link:*\nhttps://chat.whatsapp.com/${newCode}`,
                    ...channelInfo
                }, { quoted: message });
            }
            else {
                const code = await sock.groupInviteCode(chatId);
                return await sock.sendMessage(chatId, {
                    text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}\n\n_Use \`.revokeinvite\` to reset this link._`,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        catch (e) {
            console.error('[INVITELINK] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:invitelink] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .invitelink: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "invite": async (h) => module.exports["invitelink"](h),
    "grouplink": async (h) => module.exports["invitelink"](h),
    "gclink": async (h) => module.exports["invitelink"](h),
    "revokeinvite": async (h) => module.exports["invitelink"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .joinrequests ─── View, approve or reject group join requests | usage: .joinrequests — list pending\n.approvejoin <number|all>\n.rejectjoin <number|all>
    "joinrequests": async (h) => {
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
        rawText: (h.config.prefix + 'joinrequests ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const isApprove = rawText.startsWith('.approvejoin');
        const isReject = rawText.startsWith('.rejectjoin');
        // List pending requests
        if (!isApprove && !isReject) {
            try {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0) {
                    return await sock.sendMessage(chatId, {
                        text: `📋 *Join Requests*\n\n_No pending join requests._`,
                        ...channelInfo
                    }, { quoted: message });
                }
                const list = requests.map((r, i) => `${i + 1}. +${r.jid.split('@')[0]}`).join('\n');
                return await sock.sendMessage(chatId, {
                    text: `╔═══════════════════════╗\n` +
                        `║   📋 *JOIN REQUESTS*    ║\n` +
                        `╚═══════════════════════╝\n\n` +
                        `${list}\n\n` +
                        `──────────────────────────\n` +
                        `*Total:* ${requests.length} pending\n\n` +
                        `• \`.approvejoin all\` — approve all\n` +
                        `• \`.rejectjoin all\` — reject all\n` +
                        `• \`.approvejoin 923001234567\` — approve one`,
                    ...channelInfo
                }, { quoted: message });
            }
            catch (e) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Failed to fetch requests: ${e.message}`,
                    ...channelInfo
                }, { quoted: message });
            }
        }
        // Approve or reject
        const action = isApprove ? 'approve' : 'reject';
        const input = args[0]?.toLowerCase();
        try {
            let targets = [];
            if (input === 'all') {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0) {
                    return await sock.sendMessage(chatId, {
                        text: `⚠️ No pending join requests.`,
                        ...channelInfo
                    }, { quoted: message });
                }
                targets = requests.map((r) => r.jid);
            }
            else if (input) {
                const num = input.replace(/[^0-9]/g, '');
                targets = [`${num}@s.whatsapp.net`];
            }
            else {
                return await sock.sendMessage(chatId, {
                    text: `❌ Provide a number or \`all\`.\n\nExample: \`.${isApprove ? 'approvejoin' : 'rejectjoin'} all\``,
                    ...channelInfo
                }, { quoted: message });
            }
            await sock.groupRequestParticipantsUpdate(chatId, targets, action);
            const icon = isApprove ? '✅' : '❌';
            const verb = isApprove ? 'Approved' : 'Rejected';
            await sock.sendMessage(chatId, {
                text: `${icon} *${verb}* ${targets.length === 1 ? `+${targets[0].split('@')[0]}` : `${targets.length} request(s)`}`,
                ...channelInfo
            }, { quoted: message });
        }
        catch (e) {
            console.error('[JOINREQUESTS] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${action}: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:joinrequests] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .joinrequests: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "gcreqs": async (h) => module.exports["joinrequests"](h),
    "groupreqs": async (h) => module.exports["joinrequests"](h),
    "pendingjoins": async (h) => module.exports["joinrequests"](h),
    "approvejoin": async (h) => module.exports["joinrequests"](h),
    "rejectjoin": async (h) => module.exports["joinrequests"](h),
  };
})());


Object.assign(module.exports, (() => {
  const store = require('../lib_ported/lightweight_store.js');
  const fs = require('fs');
  const path = require('path');
  const { dataFile } = require('../lib_ported/paths.js');
  // --- helper code from rank.js ---
  /**
   * Increment message count for a user in a chat
   * Now uses the unified store system (backward compatible)
   */
  async function incrementMessageCount(chatId, userId) {
      try {
          await store.incrementMessageCount(chatId, userId);
      }
      catch (error) {
          console.error('Error incrementing message count:', error);
      }
  }
  /**
   * Load all message counts (backward compatible)
   * Returns same format as old JSON file
   */
  async function loadMessageCounts() {
      try {
          const data = await store.getAllMessageCounts();
          return data.messageCount || {};
      }
      catch (error) {
          console.error('Error loading message counts:', error);
          return {};
      }
  }
  /**
   * Save message counts (backward compatible, but now a no-op)
   * Data is auto-saved by the store system
   */
  function saveMessageCounts(_messageCounts) {
      console.log('[RANK] saveMessageCounts called (no-op - auto-saved by store)');
  }
  return {

    // ── .rank ─── Show top 5 most active members based on message count | usage: .rank
    "rank": async (h) => {
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
        rawText: (h.config.prefix + 'rank ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        try {
            const messageCounts = await loadMessageCounts();
            const groupCounts = messageCounts[chatId] || {};
            // Build lid -> real JID map from group participants
            const lidMap = {};
            let meta = null;
            try {
                meta = await sock.groupMetadata(chatId);
                for (const p of meta.participants) {
                    if (p.lid)
                        lidMap[p.lid] = p.id;
                    if (p.id)
                        lidMap[p.id] = p.id;
                }
            }
            catch { }
            // Resolve lid JIDs in groupCounts
            const resolvedCounts = {};
            for (const [uid, count] of Object.entries(groupCounts)) {
                const resolved = lidMap[uid] || uid;
                resolvedCounts[resolved] = (resolvedCounts[resolved] || 0) + count;
            }
            const sortedMembers = Object.entries(resolvedCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);
            if (sortedMembers.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📊 *No message activity recorded yet*\n\nStart chatting to appear on the leaderboard!'
                }, { quoted: message });
                return;
            }
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            let messageText = '🏆 *TOP MEMBERS LEADERBOARD*\n\n';
            for (let index = 0; index < sortedMembers.length; index++) {
                const [userId, count] = sortedMembers[index];
                // Try all sources for name
                const c = sock.store?.contacts?.[userId];
                const participant = meta?.participants?.find((p) => p.id === userId || p.lid === userId);
                const username = c?.name || c?.notify
                    || participant?.notify || participant?.name
                    || await sock.getName(userId)
                    || (userId.includes('@s.whatsapp.net') ? `+${ userId.replace('@s.whatsapp.net', '')}` : 'Unknown');
                messageText += `${medals[index]} @${username}\n💬 ${count} messages\n\n`;
            }
            messageText += '_Keep chatting to climb the ranks!_';
            await sock.sendMessage(chatId, {
                text: messageText,
                mentions: sortedMembers.map(([userId]) => userId)
            }, { quoted: message });
        }
        catch (error) {
            console.error('Rank Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to load leaderboard. Please try again later.'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:rank] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .rank: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "top": async (h) => module.exports["rank"](h),
    "topusers": async (h) => module.exports["rank"](h),
    "leaderboard": async (h) => module.exports["rank"](h),
    "ranks": async (h) => module.exports["rank"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .ship ─── Randomly ship two members in the group | usage: .ship
    "ship": async (h) => {
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
        rawText: (h.config.prefix + 'ship ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const participants = await sock.groupMetadata(chatId);
            const ps = participants.participants.map((v) => v.id);
            const firstUser = ps[Math.floor(Math.random() * ps.length)];
            let secondUser;
            do {
                secondUser = ps[Math.floor(Math.random() * ps.length)];
            } while (secondUser === firstUser);
            const formatMention = (id) => `@${ id.split('@')[0]}`;
            await sock.sendMessage(chatId, {
                text: `${formatMention(firstUser)} ❤️ ${formatMention(secondUser)}\nCongratulations 💖🍻`,
                mentions: [firstUser, secondUser],
                ...channelInfo
            });
        }
        catch (error) {
            console.error('Error in ship command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to ship! Make sure this is a group.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:ship] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .ship: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "couple": async (h) => module.exports["ship"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .simp ─── Generate a simp card for a user | usage: .simp (reply to user or mention someone)
    "simp": async (h) => {
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
        rawText: (h.config.prefix + 'simp ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const who = quotedMsg
            ? quotedMsg.sender
            : mentionedJid && mentionedJid[0]
                ? mentionedJid[0]
                : sender;
        try {
            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(who, 'image');
            }
            catch (error) {
                console.error('Error fetching profile picture:', error);
                avatarUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'; // Default avatar
            }
            const apiUrl = `https://some-random-api.com/canvas/misc/simpcard?avatar=${encodeURIComponent(avatarUrl)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: '*your religion is simping*',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363319098372999@newsletter',
                        newsletterName: 'MEGA MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        }
        catch (error) {
            console.error('Simp Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Sorry, I couldn\'t generate the simp card. Please try again later!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363319098372999@newsletter',
                        newsletterName: 'MEGA MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:simp] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .simp: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "simpcard": async (h) => module.exports["simp"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .staff ─── Display list of group admins | usage: .staff
    "staff": async (h) => {
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
        rawText: (h.config.prefix + 'staff ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            let pp;
            try {
                pp = await sock.profilePictureUrl(chatId, 'image');
            }
            catch {
                pp = 'https://i.imgur.com/2wzGhpF.jpeg';
            }
            const participants = groupMetadata.participants;
            const groupAdmins = participants.filter((p) => p.admin);
            const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n▢ ');
            const owner = groupMetadata.owner || groupAdmins.find((p) => p.admin === 'superadmin')?.id || `${chatId.split('-')[0] }@s.whatsapp.net`;
            const text = `
≡ *GROUP ADMINS* _${groupMetadata.subject}_

┌─⊷ *ADMINS*
▢ ${listAdmin}
└───────────
`.trim();
            await sock.sendMessage(chatId, {
                image: { url: pp },
                caption: text,
                mentions: [...groupAdmins.map((v) => v.id), owner],
                ...channelInfo
            });
        }
        catch (error) {
            console.error('Error in staff command:', error);
            await sock.sendMessage(chatId, {
                text: 'Failed to get admin list!',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:staff] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .staff: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "adminlist": async (h) => module.exports["staff"](h),
  };
})());


Object.assign(module.exports, (() => {


  return {

    // ── .stupid ─── Generate a stupid card for a user | usage: .stupid (reply to user, mention someone, or add text)
    "stupid": async (h) => {
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
        rawText: (h.config.prefix + 'stupid ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const who = quotedMsg
            ? quotedMsg.sender
            : mentionedJid && mentionedJid[0]
                ? mentionedJid[0]
                : sender;
        const text = args && args.length > 0 ? args.join(' ') : 'im+stupid';
        try {
            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(who, 'image');
            }
            catch (error) {
                console.error('Error fetching profile picture:', error);
                avatarUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'; // Default avatar
            }
            const apiUrl = `https://api.popcat.xyz/its-so-stupid?image=${encodeURIComponent(avatarUrl)}&text=${encodeURIComponent(text)}`;
            const response = await fetch(apiUrl);
            if (!response.ok)
                throw new Error(`API responded with status: ${response.status}`);
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `*@${who.split('@')[0]}*`,
                mentions: [who]
            }, { quoted: message });
        }
        catch (error) {
            console.error('Stupid Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Sorry, I couldn\'t generate the stupid card. Please try again later!'
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:stupid] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .stupid: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "stupidcard": async (h) => module.exports["stupid"](h),
    "dumb": async (h) => module.exports["stupid"](h),
  };
})());


Object.assign(module.exports, (() => {
  const fs = require('fs');
  const { dataFile } = require('../lib_ported/paths.js');
  const store = require('../lib_ported/lightweight_store.js');
  // --- helper code from warnings.js ---
  const MONGO_URL = process.env.MONGO_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const MYSQL_URL = process.env.MYSQL_URL;
  const SQLITE_URL = process.env.DB_URL;
  const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
  const warningsFilePath = dataFile('warnings.json');
  async function loadWarnings() {
      if (HAS_DB) {
          const warnings = await store.getSetting('global', 'warnings');
          return warnings || {};
      }
      else {
          if (!fs.existsSync(warningsFilePath)) {
              fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
          }
          const data = fs.readFileSync(warningsFilePath, 'utf8');
          return JSON.parse(data);
      }
  }
  return {

    // ── .warnings ─── Check warning count of a user | usage: .warnings [@user]
    "warnings": async (h) => {
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
        rawText: (h.config.prefix + 'warnings ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const { chatId, channelInfo } = context;
        const mentionedJidList = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJidList.length === 0) {
            await sock.sendMessage(chatId, {
                text: 'Please mention a user to check warnings.',
                ...channelInfo
            }, { quoted: message });
            return;
        }
        const userToCheck = mentionedJidList[0];
        const warnings = await loadWarnings();
        const warningCount = (warnings[chatId] && warnings[chatId][userToCheck]) || 0;
        await sock.sendMessage(chatId, {
            text: `@${userToCheck.split('@')[0]} has ${warningCount} warning(s).\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
            mentions: [userToCheck],
            ...channelInfo
        }, { quoted: message });
    
      } catch (portErr) {
        console.error('[ported:warnings] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .warnings: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "checkwarn": async (h) => module.exports["warnings"](h),
    "warncount": async (h) => module.exports["warnings"](h),
  };
})());


Object.assign(module.exports, (() => {
  const axios = require('axios');
  const { channelInfo } = require('../lib_ported/messageConfig.js');

  return {

    // ── .wasted ─── Waste someone in style! | usage: .wasted @user
    "wasted": async (h) => {
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
        rawText: (h.config.prefix + 'wasted ' + h.args.join(' ')).trim(),
        channelInfo: {},
      };
      try {

        const chatId = context.chatId || message.key.remoteJid;
        let userToWaste;
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToWaste = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToWaste = message.message.extendedTextMessage.contextInfo.participant;
        }
        if (!userToWaste) {
            return await sock.sendMessage(chatId, {
                text: 'Please mention someone or reply to their message to waste them!',
                ...channelInfo
            }, { quoted: message });
        }
        try {
            let profilePic;
            try {
                profilePic = await sock.profilePictureUrl(userToWaste, 'image');
            }
            catch {
                profilePic = 'https://i.imgur.com/2wzGhpF.jpeg';
            }
            const wastedResponse = await axios.get(`https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`, { responseType: 'arraybuffer' });
            await sock.sendMessage(chatId, {
                image: Buffer.from(wastedResponse.data),
                caption: `⚰️ *Wasted* : ${sock.store?.contacts?.[userToWaste]?.name || sock.store?.contacts?.[userToWaste]?.notify || (userToWaste.includes('@s.whatsapp.net') ? `+${ userToWaste.replace('@s.whatsapp.net', '')}` : 'User')} 💀\n\nRest in pieces!`,
                mentions: [userToWaste],
                ...channelInfo
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in wasted command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to create wasted image! Try again later.',
                ...channelInfo
            }, { quoted: message });
        }
    
      } catch (portErr) {
        console.error('[ported:wasted] error:', portErr.message);
        try { await h.sock.sendMessage(h.from, { text: '❌ Error in .wasted: ' + portErr.message }, { quoted: h.msg }); } catch (_) {}
      }
    },
    "waste": async (h) => module.exports["wasted"](h),
  };
})());

