const { Database } = require('../database/firebase');
const config = require('../../config');

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

module.exports = {
  async kick(ctx) {
    const { sock, msg, groupId, isAdmin, isBotAdmin } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!isAdmin) return ctx.reply('❌ Admins only!');
    if (!isBotAdmin) return ctx.reply('❌ Make me admin first!');
    const mentioned = getMentioned(msg);
    if (!mentioned.length) return ctx.reply('❌ Mention someone to kick! @user');
    for (const jid of mentioned) {
      await sock.groupParticipantsUpdate(groupId, [jid], 'remove').catch(() => {});
    }
    await ctx.reply(`✅ Kicked ${mentioned.map(j => `@${j.split('@')[0]}`).join(', ')}`);
  },

  async delete(ctx) {
    const { sock, msg, isAdmin } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!isAdmin && !ctx.isOwner) return ctx.reply('❌ Admins only!');
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedKey = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted) return ctx.reply('❌ Reply to a message to delete it!');
    const key = {
      remoteJid: ctx.groupId,
      fromMe: false,
      id: quotedKey?.stanzaId,
      participant: quotedKey?.participant
    };
    await sock.sendMessage(ctx.groupId, { delete: key }).catch(() => {});
    await ctx.reply('🗑️ Message deleted!');
  },

  async antilink(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const { groupId, body } = ctx;
    const state = body.toLowerCase();
    
    if (state === 'set') {
      const action = ctx.args[2]?.toLowerCase();
      if (!['kick', 'warn', 'delete'].includes(action)) {
        return ctx.reply('❌ Valid actions: kick, warn, delete\nUsage: .antilink set kick');
      }
      await Database.setGroup(groupId, { antilink_action: action });
      return ctx.reply(`✅ Anti-link action set to: *${action}*`);
    }
    
    if (!['on', 'off'].includes(state)) return ctx.reply('Usage: .antilink on/off or .antilink set [kick/warn/delete]');
    await Database.setGroup(groupId, { antilink: state === 'on' });
    await ctx.reply(`✅ Anti-link ${state === 'on' ? '🔒 enabled' : '🔓 disabled'}!`);
  },

  async warn(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const { sock, msg, groupId, body } = ctx;
    const mentioned = getMentioned(msg);
    if (!mentioned.length) return ctx.reply('❌ Mention someone to warn!');
    const reason = body.replace(/<@\d+>/g, '').trim() || 'No reason provided';
    for (const jid of mentioned) {
      const warns = await Database.addWarn(jid, groupId, reason);
      await sock.sendMessage(groupId, {
        text: `⚠️ *Warning Issued!*\n\n👤 User: @${jid.split('@')[0]}\n📝 Reason: ${reason}\n🔢 Warnings: ${warns}/${config.MAX_WARNS}`,
        mentions: [jid]
      }, { quoted: msg });
      if (warns >= config.MAX_WARNS) {
        await sock.groupParticipantsUpdate(groupId, [jid], 'remove').catch(() => {});
        await sock.sendMessage(groupId, { text: `🔨 @${jid.split('@')[0]} was kicked after ${config.MAX_WARNS} warnings!`, mentions: [jid] });
        await Database.resetWarns(jid, groupId);
      }
    }
  },

  async resetwarn(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const { msg, groupId } = ctx;
    const mentioned = getMentioned(msg);
    if (!mentioned.length) return ctx.reply('❌ Mention someone!');
    for (const jid of mentioned) {
      await Database.resetWarns(jid, groupId);
    }
    await ctx.reply(`✅ Warnings reset for ${mentioned.map(j => `@${j.split('@')[0]}`).join(', ')}`);
  },

  async groupinfo(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    try {
      const { sock, groupId } = ctx;
      const meta = await sock.groupMetadata(groupId);
      const admins = meta.participants.filter(p => p.admin).length;
      const members = meta.participants.length;
      const createdAt = new Date(meta.creation * 1000).toLocaleDateString();
      await ctx.reply(
        `📋 *Group Information*\n\n` +
        `┌─────────────────\n` +
        `│ 🏷️ Name: ${meta.subject}\n` +
        `│ 👥 Members: ${members}\n` +
        `│ 👑 Admins: ${admins}\n` +
        `│ 📅 Created: ${createdAt}\n` +
        `│ 🆔 ID: ${groupId.split('@')[0]}\n` +
        `│ 📝 Desc: ${meta.desc || 'No description'}\n` +
        `└─────────────────`
      );
    } catch (e) { await ctx.reply('❌ Could not fetch group info!'); }
  },

  async welcome(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const state = ctx.body.toLowerCase();
    if (!['on', 'off'].includes(state)) return ctx.reply('Usage: .welcome on/off');
    await Database.setGroup(ctx.groupId, { welcome_enabled: state === 'on' });
    await ctx.reply(`✅ Welcome messages ${state === 'on' ? '🟢 enabled' : '🔴 disabled'}!`);
  },

  async setwelcome(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    if (!ctx.body) return ctx.reply('❌ Provide a welcome message! Use {user} for username.');
    await Database.setGroup(ctx.groupId, { welcome_message: ctx.body });
    await ctx.reply('✅ Welcome message set!\n\nPreview:\n' + ctx.body.replace('{user}', 'NewMember'));
  },

  async leave(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const state = ctx.body.toLowerCase();
    if (!['on', 'off'].includes(state)) return ctx.reply('Usage: .leave on/off');
    await Database.setGroup(ctx.groupId, { leave_enabled: state === 'on' });
    await ctx.reply(`✅ Leave messages ${state === 'on' ? '🟢 enabled' : '🔴 disabled'}!`);
  },

  async setleave(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    if (!ctx.body) return ctx.reply('❌ Provide a leave message! Use {user} for username.');
    await Database.setGroup(ctx.groupId, { leave_message: ctx.body });
    await ctx.reply('✅ Leave message set!');
  },

  async promote(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    if (!ctx.isBotAdmin) return ctx.reply('❌ Make me admin first!');
    const mentioned = getMentioned(ctx.msg);
    if (!mentioned.length) return ctx.reply('❌ Mention someone to promote!');
    await ctx.sock.groupParticipantsUpdate(ctx.groupId, mentioned, 'promote').catch(() => {});
    await ctx.reply(`✅ Promoted ${mentioned.map(j => `@${j.split('@')[0]}`).join(', ')} to admin!`);
  },

  async demote(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    if (!ctx.isBotAdmin) return ctx.reply('❌ Make me admin first!');
    const mentioned = getMentioned(ctx.msg);
    if (!mentioned.length) return ctx.reply('❌ Mention someone to demote!');
    await ctx.sock.groupParticipantsUpdate(ctx.groupId, mentioned, 'demote').catch(() => {});
    await ctx.reply(`✅ Demoted ${mentioned.map(j => `@${j.split('@')[0]}`).join(', ')}!`);
  },

  async mute(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    await Database.setGroup(ctx.groupId, { muted: true });
    await ctx.reply('🔇 Group muted! Only admins can send messages.');
  },

  async unmute(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    await Database.setGroup(ctx.groupId, { muted: false });
    await ctx.reply('🔊 Group unmuted! Everyone can send messages.');
  },

  async hidetag(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const { sock, groupId, body } = ctx;
    const meta = await sock.groupMetadata(groupId);
    const members = meta.participants.map(p => p.id);
    await sock.sendMessage(groupId, {
      text: body || '📢 Important announcement',
      mentions: members
    });
  },

  async tagall(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const { sock, groupId, body, msg } = ctx;
    const meta = await sock.groupMetadata(groupId);
    const members = meta.participants;
    const message = body || '📢 Hey everyone!';
    
    const tagList = members.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
    const fullText = `📢 *Tag All*\n\n${message}\n\n${tagList}`;
    
    await sock.sendMessage(groupId, {
      text: fullText,
      mentions: members.map(p => p.id)
    }, { quoted: msg });
  },

  async activity(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const data = await Database.getGroupActivity(ctx.groupId);
    if (!data.length) return ctx.reply('📊 No activity data yet!');
    const list = data.map((d, i) => `${i + 1}. @${d.jid.split('@')[0]} - ${d.count} messages`).join('\n');
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `📊 *Group Activity (Top 10)*\n\n${list}`,
      mentions: data.map(d => d.jid)
    }, { quoted: ctx.msg });
  },

  async active(ctx) { return ctx.commands?.activity(ctx); },
  async inactive(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const data = await Database.getGroupActivity(ctx.groupId);
    const { sock, groupId } = ctx;
    const meta = await sock.groupMetadata(groupId);
    const activeJids = new Set(data.map(d => d.jid));
    const inactive = meta.participants.filter(p => !activeJids.has(p.id) && !p.admin);
    if (!inactive.length) return ctx.reply('✅ Everyone is active!');
    const list = inactive.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
    await sock.sendMessage(groupId, { text: `😴 *Inactive Members*\n\n${list}`, mentions: inactive.map(p => p.id) }, { quoted: ctx.msg });
  },

  async open(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    await ctx.sock.groupSettingUpdate(ctx.groupId, 'not_announcement');
    await ctx.reply('🔓 Group is now *open*! Everyone can send messages.');
  },

  async close(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    await ctx.sock.groupSettingUpdate(ctx.groupId, 'announcement');
    await ctx.reply('🔒 Group is now *closed*! Only admins can send messages.');
  },

  async purge(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const code = ctx.args[1];
    if (code !== 'CONFIRM') return ctx.reply('⚠️ This will delete all members!\nTo confirm: .purge CONFIRM');
    const { sock, groupId } = ctx;
    const meta = await sock.groupMetadata(groupId);
    const nonAdmins = meta.participants.filter(p => !p.admin).map(p => p.id);
    if (!ctx.isBotAdmin) return ctx.reply('❌ I need admin privileges!');
    await sock.groupParticipantsUpdate(groupId, nonAdmins, 'remove').catch(() => {});
    await ctx.reply(`🧹 Purged ${nonAdmins.length} members!`);
  },

  async antism(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const state = ctx.body.toLowerCase();
    if (!['on', 'off'].includes(state)) return ctx.reply('Usage: .antism on/off');
    await Database.setGroup(ctx.groupId, { antism: state === 'on' });
    await ctx.reply(`✅ Anti-spam ${state === 'on' ? '🟢 enabled' : '🔴 disabled'}!`);
  },

  async blacklist(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const [, action, ...wordParts] = ctx.args;
    const word = wordParts.join(' ');
    
    if (action === 'add') {
      if (!word) return ctx.reply('Usage: .blacklist add [word]');
      await Database.addBlacklist(ctx.groupId, word);
      await ctx.reply(`✅ Added "*${word}*" to blacklist!`);
    } else if (action === 'remove') {
      if (!word) return ctx.reply('Usage: .blacklist remove [word]');
      await Database.removeBlacklist(ctx.groupId, word);
      await ctx.reply(`✅ Removed "*${word}*" from blacklist!`);
    } else if (action === 'list') {
      const words = await Database.getBlacklist(ctx.groupId);
      if (!words.length) return ctx.reply('📋 Blacklist is empty!');
      await ctx.reply(`🚫 *Blacklisted Words*\n\n${words.map((w, i) => `${i+1}. ${w}`).join('\n')}`);
    } else {
      await ctx.reply('Usage:\n.blacklist add [word]\n.blacklist remove [word]\n.blacklist list');
    }
  },

  async groupstats(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const { sock, groupId } = ctx;
    const meta = await sock.groupMetadata(groupId);
    const settings = await Database.getGroup(groupId);
    const admins = meta.participants.filter(p => p.admin).length;
    
    await ctx.reply(
      `📊 *Group Stats*\n\n` +
      `┌─────────────────\n` +
      `│ 👥 Members: ${meta.participants.length}\n` +
      `│ 👑 Admins: ${admins}\n` +
      `│ 🔗 Anti-link: ${settings.antilink ? '✅' : '❌'}\n` +
      `│ 🚫 Anti-spam: ${settings.antism ? '✅' : '❌'}\n` +
      `│ 👋 Welcome: ${settings.welcome_enabled ? '✅' : '❌'}\n` +
      `│ 🚪 Leave msg: ${settings.leave_enabled ? '✅' : '❌'}\n` +
      `│ 🔇 Muted: ${settings.muted ? '✅' : '❌'}\n` +
      `└─────────────────`
    );
  },
};
