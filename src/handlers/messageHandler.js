const config = require('../../config');
const { Database } = require('../database/firebase');
const { isOwner, sleep } = require('../utils/helpers');

// Import all command handlers
const mainCommands = require('../commands/main');
const adminCommands = require('../commands/admin');
const economyCommands = require('../commands/economy');
const gamesCommands = require('../commands/games');
const gamblingCommands = require('../commands/gambling');
const interactionCommands = require('../commands/interactions');
const funCommands = require('../commands/fun');
const aiCommands = require('../commands/ai');
const converterCommands = require('../commands/converter');
const animeCommands = require('../commands/anime');
const downloaderCommands = require('../commands/downloaders');
const cardCommands = require('../commands/cards');

// ============================================================
// ANTI-LINK HANDLER
// ============================================================
async function handleAntiLink(sock, msg, groupSettings, sender, groupId) {
  if (!groupSettings.antilink) return;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const linkPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+)/gi;
  
  if (linkPattern.test(text)) {
    const isAdmin = await isGroupAdmin(sock, groupId, sender);
    const botIsAdmin = await isBotAdmin(sock, groupId);
    if (isAdmin || !botIsAdmin) return;

    const action = groupSettings.antilink_action || 'warn';
    
    try {
      await sock.sendMessage(groupId, { delete: msg.key });
    } catch (e) {}

    if (action === 'kick') {
      await sock.groupParticipantsUpdate(groupId, [sender], 'remove').catch(() => {});
      await sock.sendMessage(groupId, { text: `❌ @${sender.split('@')[0]} was removed for sending links!`, mentions: [sender] });
    } else if (action === 'warn') {
      const warns = await Database.addWarn(sender, groupId, 'Sending links');
      await sock.sendMessage(groupId, { 
        text: `⚠️ @${sender.split('@')[0]} warned for sending links! [${warns}/${config.MAX_WARNS}]`, 
        mentions: [sender] 
      });
      if (warns >= config.MAX_WARNS) {
        await sock.groupParticipantsUpdate(groupId, [sender], 'remove').catch(() => {});
        await sock.sendMessage(groupId, { text: `🔨 @${sender.split('@')[0]} was kicked after ${config.MAX_WARNS} warnings!`, mentions: [sender] });
        await Database.resetWarns(sender, groupId);
      }
    } else {
      await sock.sendMessage(groupId, { text: `❌ Links are not allowed here @${sender.split('@')[0]}!`, mentions: [sender] });
    }
  }
}

// ============================================================
// ANTI-SPAM HANDLER
// ============================================================
const messageCount = new Map();
async function handleAntiSpam(sock, msg, groupSettings, sender, groupId) {
  if (!groupSettings.antism) return;
  const key = `${groupId}_${sender}`;
  const now = Date.now();
  const data = messageCount.get(key) || { count: 0, time: now };
  
  if (now - data.time > 10000) {
    messageCount.set(key, { count: 1, time: now });
    return;
  }
  
  data.count++;
  messageCount.set(key, data);
  
  if (data.count >= 7) {
    const isAdmin = await isGroupAdmin(sock, groupId, sender);
    if (isAdmin) return;
    await sock.groupParticipantsUpdate(groupId, [sender], 'remove').catch(() => {});
    await sock.sendMessage(groupId, { text: `🚫 @${sender.split('@')[0]} was removed for spamming!`, mentions: [sender] });
    messageCount.delete(key);
  }
}

// ============================================================
// BLACKLIST HANDLER
// ============================================================
async function handleBlacklist(sock, msg, groupId, sender) {
  const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase();
  const words = await Database.getBlacklist(groupId);
  const found = words.find(w => text.includes(w));
  if (found) {
    try { await sock.sendMessage(groupId, { delete: msg.key }); } catch (e) {}
    await sock.sendMessage(groupId, { text: `🚫 Blacklisted word detected from @${sender.split('@')[0]}!`, mentions: [sender] });
  }
}

// ============================================================
// WELCOME / LEAVE HANDLER
// ============================================================
async function handleGroupUpdate(sock, update, groupSettings) {
  const { id, participants, action } = update;
  const settings = groupSettings || await Database.getGroup(id);
  
  if (action === 'add' && settings.welcome_enabled) {
    for (const participant of participants) {
      const welcomeMsg = settings.welcome_message || 
        `🌸 Welcome to the group, @${participant.split('@')[0]}! 🎉\nWe're glad to have you here!\nType *.menu* to see what I can do!`;
      await sock.sendMessage(id, { text: welcomeMsg, mentions: [participant] });
    }
  }
  
  if (action === 'remove' && settings.leave_enabled) {
    for (const participant of participants) {
      const leaveMsg = settings.leave_message ||
        `👋 @${participant.split('@')[0]} has left the group. Farewell!`;
      await sock.sendMessage(id, { text: leaveMsg, mentions: [participant] });
    }
  }
}

// ============================================================
// HELPER: Check admin status
// ============================================================
async function isGroupAdmin(sock, groupId, jid) {
  try {
    const meta = await sock.groupMetadata(groupId);
    return meta.participants.some(p => p.id === jid && (p.admin === 'admin' || p.admin === 'superadmin'));
  } catch (e) { return false; }
}

async function isBotAdmin(sock, groupId) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const botJid = sock.user.id;
    return meta.participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
  } catch (e) { return false; }
}

// ============================================================
// MAIN MESSAGE HANDLER
// ============================================================
async function messageHandler(sock, msg) {
  try {
    if (!msg.message) return;
    if (msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const groupId = msg.key.remoteJid;
    const isGroup = groupId.endsWith('@g.us');
    const isPrivate = !isGroup;

    // Get message text
    const msgText = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      ''
    ).trim();

    // ============================================================
    // CHECK BAN
    // ============================================================
    const isBanned = await Database.isBanned(sender);
    if (isBanned && !isOwner(sender)) return;

    // ============================================================
    // AFK CHECK - If someone mentions an AFK user
    // ============================================================
    if (msgText && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid;
      for (const m of mentioned) {
        const afkData = await Database.getAFK(m);
        if (afkData) {
          const elapsed = Date.now() - afkData.since;
          const timeStr = elapsed < 60000 ? `${Math.floor(elapsed/1000)}s` : `${Math.floor(elapsed/60000)}m`;
          await sock.sendMessage(groupId, {
            text: `😴 @${m.split('@')[0]} is AFK for ${timeStr}\n📝 Reason: ${afkData.reason || 'No reason'}`,
            mentions: [m]
          });
        }
      }
    }

    // ============================================================
    // REMOVE AFK IF USER SENDS A MESSAGE
    // ============================================================
    const senderAfk = await Database.getAFK(sender);
    if (senderAfk && msgText && !msgText.startsWith(config.PREFIX)) {
      await Database.removeAFK(sender);
      await sock.sendMessage(groupId, {
        text: `✅ Welcome back @${sender.split('@')[0]}! AFK mode disabled.`,
        mentions: [sender]
      });
    }

    // ============================================================
    // ACTIVITY TRACKING
    // ============================================================
    if (isGroup) {
      await Database.logActivity(sender, groupId).catch(() => {});
    }

    // ============================================================
    // GROUP ANTI-FEATURES (only in groups)
    // ============================================================
    if (isGroup) {
      const groupSettings = await Database.getGroup(groupId);
      
      // Muted group check
      if (groupSettings.muted) {
        const isAdmin = await isGroupAdmin(sock, groupId, sender);
        const senderIsOwner = isOwner(sender);
        if (!isAdmin && !senderIsOwner) return;
      }

      // Anti-link
      await handleAntiLink(sock, msg, groupSettings, sender, groupId);
      
      // Anti-spam
      await handleAntiSpam(sock, msg, groupSettings, sender, groupId);
      
      // Blacklist
      await handleBlacklist(sock, msg, groupId, sender);
    }

    // ============================================================
    // GAME RESPONSE HANDLING (non-command messages that are game moves)
    // ============================================================
    if (isGroup && msgText && !msgText.startsWith(config.PREFIX)) {
      const gameCtx = {
        sock, msg, sender, groupId, isGroup,
        body: msgText,
        reply: (text) => sock.sendMessage(groupId, { text }, { quoted: msg }),
        react: (emoji) => sock.sendMessage(groupId, { react: { text: emoji, key: msg.key } }),
      };
      await gamesCommands.handleGameResponse(gameCtx).catch(() => {});
    }

    // ============================================================
    // COMMAND HANDLING
    // ============================================================
    if (!msgText.startsWith(config.PREFIX)) return;

    const args = msgText.slice(config.PREFIX.length).trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const body = args.slice(1).join(' ');

    const ctx = {
      sock, msg, sender, groupId, isGroup, isPrivate,
      args, command, body,
      isAdmin: isGroup ? await isGroupAdmin(sock, groupId, sender) : true,
      isBotAdmin: isGroup ? await isBotAdmin(sock, groupId) : true,
      isOwner: isOwner(sender),
      reply: (text) => sock.sendMessage(groupId, { text }, { quoted: msg }),
      react: (emoji) => sock.sendMessage(groupId, { react: { text: emoji, key: msg.key } }),
    };

    // ============================================================
    // OWNER-ONLY COMMANDS
    // ============================================================
    if (command === 'ban') {
      if (!ctx.isOwner) return ctx.reply('❌ Only the bot owner can use this command!');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) return ctx.reply('❌ Mention someone to ban!');
      await Database.banUser(mentioned[0]);
      return ctx.reply(`🔨 @${mentioned[0].split('@')[0]} has been banned from using the bot!`);
    }

    if (command === 'unban') {
      if (!ctx.isOwner) return ctx.reply('❌ Only the bot owner can use this command!');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) return ctx.reply('❌ Mention someone to unban!');
      await Database.unbanUser(mentioned[0]);
      return ctx.reply(`✅ @${mentioned[0].split('@')[0]} has been unbanned!`);
    }

    // Join group command (owner only)
    if (command === 'join') {
      if (!ctx.isOwner) return ctx.reply('❌ Only the bot owner can use this command!');
      if (!body) return ctx.reply('❌ Provide a group invite link!\nUsage: .join https://chat.whatsapp.com/xxx');
      try {
        const link = body.split('chat.whatsapp.com/')[1];
        if (!link) return ctx.reply('❌ Invalid link!');
        await sock.groupAcceptInvite(link);
        return ctx.reply('✅ Joined the group successfully!');
      } catch (e) {
        return ctx.reply(`❌ Failed to join: ${e.message}`);
      }
    }

    // Exit group command (owner only)
    if (command === 'exit') {
      if (!ctx.isOwner && !ctx.isAdmin) return ctx.reply('❌ Only admins can use this command!');
      if (!isGroup) return ctx.reply('❌ This command is only for groups!');
      try {
        await sock.sendMessage(groupId, { text: '👋 Goodbye everyone! Bot leaving the group.' });
        await sleep(1000);
        await sock.groupLeave(groupId);
      } catch (e) {
        return ctx.reply(`❌ Failed to leave: ${e.message}`);
      }
    }

    // Route to command handlers
    const commandSets = [
      mainCommands, adminCommands, economyCommands, gamesCommands,
      gamblingCommands, interactionCommands, funCommands, aiCommands,
      converterCommands, animeCommands, downloaderCommands, cardCommands
    ];

    let handled = false;
    for (const cmdSet of commandSets) {
      if (cmdSet[command]) {
        await cmdSet[command](ctx);
        handled = true;
        break;
      }
    }

    // Aliases
    if (!handled) {
      const aliases = {
        'mbal': 'moneybalance', 'pbal': 'premiumbal', 'wid': 'withdraw',
        'dep': 'deposit', 'reg': 'register', 'p': 'profile', 'inv': 'inventory',
        'lb': 'leaderboard', 'gi': 'groupinfo', 'gs': 'groupstats', 'ttt': 'tictactoe',
        'aki': 'akinator', 'gg': 'greekgod', 'c4': 'connectfour', 'wcg': 'wordchain',
        'ig': 'instagram', 'ttk': 'tiktok', 'yt': 'youtube', 'x': 'twitter',
        'fb': 'facebook', 'pint': 'pinterest', 'reverseimg': 'sauce', 's': 'sticker',
        'toimg': 'turnimg', 'tovid': 'turnvid', 'tt': 'translate', 'tb': 'transcribe',
        'coll': 'collection', 'ci': 'cardinfo', 'mycolls': 'mycollectionseries',
        'slb': 'seriesleaderboard', 'cardlb': 'cardleaderboard', 'lc': 'lendcard',
        'auc': 'auction', 'canclauc': 'cancelauc', 'wyr': 'wouldyourather',
        'td': 'truthordare', 'pp': 'psize', 'nsfw': 'nude', 'cf': 'coinflip',
        'db': 'doublebet', 'dp': 'doublepayout', 'copilot': 'ai', 'gpt': 'ai',
        'perplexity': 'ai', 'imagine': 'generate', 'upscale': 'enhance',
        'richlg': 'richlistglobal', 'sellc': 'sellccard', 'sellcpublc': 'sellccardpublic',
        'rename': 'setname',
        'startuno': 'startuno', 'unoplay': 'unoplay', 'unodraw': 'unodraw',
        'unohand': 'unohand', 'stopgame': 'stopgame',
      };
      
      const aliasCmd = aliases[command];
      if (aliasCmd) {
        const allCmds = Object.assign({}, ...commandSets);
        if (allCmds[aliasCmd]) {
          await allCmds[aliasCmd]({ ...ctx, command: aliasCmd });
        }
      }
    }

  } catch (err) {
    console.error('Message handler error:', err);
  }
}

module.exports = { messageHandler, handleGroupUpdate, isGroupAdmin, isBotAdmin };
