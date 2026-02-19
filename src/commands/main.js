const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { formatUptime } = require('../utils/helpers');

const startTime = Date.now();

const MENU_TEXT = `
👋🏻⃝⃘̉̉̉━⋆─⋆──❂
┊ ┊ ┊ ┊ ┊
┊ ┊ ✫ ˚㋛ ⋆｡ ❀
┊ ☠︎︎
✧ Hey {user}𓂃✍︎𝄞
╰────────────────❂
┏━━━━━━━━━━━━━❥❥❥
┃ ✦ Sʜᴀᴅᴏᴡ  Gᴀʀᴅᴇɴ ✦
┗━━━━━━━━━━━━━❥❥❥

┏━━━━━━━━━━━━━❥❥❥
┃ ɴᴀᴍᴇ - Delta
┃ ᴄʀᴇᴀᴛᴏʀ - ꨄ︎ 𝙆𝙔𝙉𝙓 ꨄ︎
┃ ᴘʀᴇꜰɪx - [ . ]
┗━━━━━━━━━━━━━❥❥❥

┏━「 📋 ᴍᴀɪɴ 」
┃ .menu
┃ .ping
┃ .website
┃ .community
┃ .afk
┃ .help
┃ .info
┃ .uptime
┗━━━━━━━━━━━━━❥❥❥

┏━「 ⚙️ ᴀᴅᴍɪɴ 」
┃ .kick
┃ .delete
┃ .antilink
┃ .antilink set [action]
┃ .warn @user [reason]
┃ .resetwarn
┃ .groupinfo / .gi
┃ .welcome on/off
┃ .setwelcome
┃ .leave on/off
┃ .setleave
┃ .promote
┃ .demote
┃ .mute
┃ .unmute
┃ .hidetag
┃ .tagall
┃ .activity
┃ .active
┃ .inactive
┃ .open
┃ .close
┃ .purge [code]
┃ .antism on/off
┃ .blacklist add [word]
┃ .blacklist remove [word]
┃ .blacklist list
┃ .groupstats / .gs
┗━━━━━━━━━━━━━❥❥❥

┏━「 💰 ᴇᴄᴏɴᴏᴍʏ 」
┃ .moneybalance / .mbal
┃ .gems
┃ .premiumbal / .pbal
┃ .daily
┃ .withdraw / .wid [amount]
┃ .deposit / .dep [amount]
┃ .donate [amount]
┃ .lottery
┃ .richlist
┃ .richlistglobal / .richlg
┃ .register / .reg
┃ .setname <name>
┃ .profile / .p
┃ .edit
┃ .bio [bio]
┃ .setage [age]
┃ .inventory / .inv
┃ .use [item name]
┃ .sell [item name]
┃ .buy [item name]
┃ .shop
┃ .leaderboard / .lb
┃ .dig
┃ .fish
┃ .beg
┃ .roast
┃ .gamble
┗━━━━━━━━━━━━━❥❥❥

┏━「 🎴 ᴄᴀʀᴅꜱ 」
┃ .collection / .coll
┃ .deck
┃ .card [index]
┃ .deckcard [index]
┃ .cardinfo / .ci [name]
┃ .mycollectionseries / .mycolls
┃ .cardleaderboard / .cardlb
┃ .cardshop
┃ .claim [id]
┃ .stardust
┃ .vs @user
┃ .auction [card_id] [price]
┃ .myauc
┃ .listauc
┃ .rc [index]
┗━━━━━━━━━━━━━❥❥❥

┏━「 🎮 ɢᴀᴍᴇꜱ 」
┃ .tictactoe / .ttt @user
┃ .connectfour / .c4 @user
┃ .wordchain / .wcg
┃ .startbattle @user
┃ .truthordare / .td
┃ .stopgame
┗━━━━━━━━━━━━━❥❥❥

┏━「 🃏 ᴜɴᴏ 」
┃ .uno
┃ .startuno
┃ .unoplay [number]
┃ .unodraw
┃ .unohand
┗━━━━━━━━━━━━━❥❥❥

┏━「 🎲 ɢᴀᴍʙʟᴇ 」
┃ .slots [amount]
┃ .dice [amount]
┃ .casino [amount]
┃ .coinflip / .cf [h/t] [amount]
┃ .doublebet / .db [amount]
┃ .doublepayout / .dp [amount]
┃ .roulette [color] [amount]
┃ .horse [1-4] [amount]
┃ .spin [amount]
┗━━━━━━━━━━━━━❥❥❥

┏━「 👤 ɪɴᴛᴇʀᴀᴄᴛɪᴏɴ 」
┃ .hug
┃ .kiss
┃ .slap
┃ .wave
┃ .pat
┃ .dance
┃ .sad
┃ .smile
┃ .laugh
┃ .punch
┃ .kill
┃ .hit
┃ .fuck
┃ .kidnap
┃ .lick
┃ .bonk
┃ .tickle
┃ .shrug
┃ .wank
┃ .jihad
┃ .crusade
┗━━━━━━━━━━━━━❥❥❥

┏━「 🎉 ꜰᴜɴ 」
┃ .gay
┃ .lesbian
┃ .simp
┃ .match
┃ .ship
┃ .character
┃ .psize / .pp
┃ .skill
┃ .duality
┃ .gen
┃ .pov
┃ .social
┃ .relation
┃ .wouldyourather / .wyr
┃ .joke
┃ .truth
┃ .dare
┃ .truthordare / .td
┃ .uno
┗━━━━━━━━━━━━━❥❥❥

┏━「 🎵 ᴍᴜꜱɪᴄ 」
┃ .play [song name / url]
┗━━━━━━━━━━━━━❥❥❥

┏━「 🔍 ꜱᴇᴀʀᴄʜ 」
┃ .wallpaper [query]
┃ .image [query]
┃ .lyrics [song name]
┗━━━━━━━━━━━━━❥❥❥

┏━「 🤖 ᴀɪ 」
┃ .ai / .gpt [question]
┃ .translate / .tt [lang] [text]
┗━━━━━━━━━━━━━❥❥❥

┏━「 🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ 」
┃ .sticker / .s
┃ .take <name>, <author>
┃ .toimg / .turnimg
┃ .rotate [90/180/270]
┗━━━━━━━━━━━━━❥❥❥

┏━「 🌸 ᴀɴɪᴍᴇ ꜱꜰᴡ 」
┃ .waifu
┃ .neko
┃ .maid
┃ .oppai
┃ .selfies
┃ .uniform
┃ .mori-calliope
┃ .raiden-shogun
┃ .kamisato-ayaka
┗━━━━━━━━━━━━━❥❥❥

┏━「 🔞 ᴀɴɪᴍᴇ ɴꜱꜰᴡ 」
┃ .nude on/off
┃ .milf
┃ .ass
┃ .hentai
┃ .oral
┃ .ecchi
┃ .paizuri
┃ .ero
┃ .ehentai
┃ .nhentai
┗━━━━━━━━━━━━━❥❥❥

⋆☽ ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆
`;

module.exports = {
  async menu(ctx) {
    const { sock, msg, sender, groupId } = ctx;
    const userName = msg.pushName || sender.split('@')[0];
    const menuText = MENU_TEXT.replace('{user}', userName);

    const imgPath = path.join(__dirname, '22ed309e3b7af45682d8ac0923bb4ab8.jpg');

    if (fs.existsSync(imgPath)) {
      const imgBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(groupId, {
        image: imgBuffer,
        caption: menuText,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(groupId, { text: menuText }, { quoted: msg });
    }
  },

  async ping(ctx) {
    const start = Date.now();
    await ctx.reply('🏓 Pinging...');
    const latency = Date.now() - start;
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `🏓 *Pong!*\n⚡ Speed: ${latency}ms\n🟢 Bot is alive!`
    }, { quoted: ctx.msg });
  },

  async website(ctx) {
    await ctx.reply(`🌐 *Shadow Garden Website*\n\n🚧 *Coming Soon!*\n\nWe're working hard to bring you an amazing experience. Stay tuned! 🌸`);
  },

  async community(ctx) {
    await ctx.reply(`🌟 *Join the Shadow Garden Community!*\n\n${config.COMMUNITY_LINK}\n\n✨ Connect with other members, get updates, and more!`);
  },

  async afk(ctx) {
    const { sender, body } = ctx;
    const { Database } = require('../database/firebase');
    const reason = body || 'No reason provided';
    await Database.setAFK(sender, reason);
    await ctx.reply(`😴 *AFK Mode Activated!*\n📝 Reason: ${reason}\n\nYou'll be notified when someone mentions you.`);
  },

  async help(ctx) {
    await ctx.reply(`🆘 *Shadow Garden Bot Help*\n\n📖 Use *.menu* to see all available commands\n\n💡 *Tips:*\n• All commands start with *.* (dot)\n• Use *.ping* to check if bot is online\n• Use *.register* to create your profile\n• Join our community: ${config.COMMUNITY_LINK}\n\n📞 Contact creator: *${config.CREATOR}*`);
  },

  async info(ctx) {
    const uptime = formatUptime(Date.now() - startTime);
    await ctx.reply(`🤖 *Bot Information*\n\n┌─────────────────\n│ 🏷️ Name: ${config.BOT_NAME}\n│ 👤 Creator: ${config.CREATOR}\n│ ⌨️ Prefix: ${config.PREFIX}\n│ ⏱️ Uptime: ${uptime}\n│ 🌐 Platform: WhatsApp\n│ ⚡ Version: 2.0.0\n│ 📅 Build: 2025\n└─────────────────\n\n✨ Powered by Shadow Garden`);
  },

  async uptime(ctx) {
    const uptime = formatUptime(Date.now() - startTime);
    await ctx.reply(`⏱️ *Bot Uptime*\n\n🟢 Running for: *${uptime}*\n✅ All systems operational!`);
  },
};
