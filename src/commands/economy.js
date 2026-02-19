const { Database } = require('../database/firebase');
const config = require('../../config');
const { getRandomInt, formatBalance, ROASTS, BEG_RESPONSES } = require('../utils/helpers');

module.exports = {
  async register(ctx) {
    const { sender, msg } = ctx;
    const existing = await Database.getUser(sender);
    if (existing && existing.registered) return ctx.reply('✅ You are already registered!');
    const name = ctx.body || msg.pushName || sender.split('@')[0];
    await Database.setUser(sender, {
      registered: true,
      name,
      balance: config.STARTING_BALANCE,
      gems: 0,
      stardust: 0,
      bio: 'No bio set',
      age: null,
      inventory: [],
      joinedAt: Date.now(),
    });
    await ctx.reply(`🎉 *Welcome to Shadow Garden!*\n\n👤 Name: ${name}\n💵 Starting Balance: ${config.STARTING_BALANCE} coins\n\nType *.profile* to view your profile!`);
  },

  async moneybalance(ctx) {
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first with *.register*!');
    await ctx.reply(`💰 *Balance*\n\n👤 ${user.name}\n💵 Coins: ${user.balance?.toLocaleString() || 0}\n💎 Gems: ${user.gems || 0}\n⭐ Stardust: ${user.stardust || 0}`);
  },

  async gems(ctx) {
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    await ctx.reply(`💎 *Gems Balance*\n\n${user.gems || 0} gems`);
  },

  async premiumbal(ctx) {
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    await ctx.reply(`⭐ *Premium Balance*\n\nGems: ${user.gems || 0}\nStardust: ${user.stardust || 0}`);
  },

  async daily(ctx) {
    const { sender } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first with *.register*!');
    
    const lastClaim = await Database.getDailyCooldown(sender);
    const cooldown = config.DAILY_COOLDOWN_HOURS * 3600 * 1000;
    const now = Date.now();
    
    if (lastClaim && (now - lastClaim) < cooldown) {
      const remaining = cooldown - (now - lastClaim);
      const hrs = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      return ctx.reply(`⏳ Daily already claimed!\nCome back in *${hrs}h ${mins}m*`);
    }
    
    const bonus = getRandomInt(50, 200);
    const total = config.DAILY_AMOUNT + bonus;
    await Database.addBalance(sender, total);
    await Database.setDailyCooldown(sender);
    await ctx.reply(`🎁 *Daily Reward!*\n\n💵 Base: ${config.DAILY_AMOUNT} coins\n✨ Bonus: ${bonus} coins\n📦 Total: ${total} coins\n\nBalance: ${(user.balance || 0) + total} coins`);
  },

  async withdraw(ctx) {
    const { sender, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    const amount = parseInt(body);
    if (!amount || amount <= 0) return ctx.reply('Usage: .withdraw [amount]');
    if ((user.balance || 0) < amount) return ctx.reply(`❌ Insufficient balance! You have ${user.balance || 0} coins.`);
    await Database.removeBalance(sender, amount);
    await ctx.reply(`✅ Withdrew *${amount} coins*\nRemaining: ${(user.balance || 0) - amount} coins`);
  },

  async deposit(ctx) {
    const { sender, body } = ctx;
    const amount = parseInt(body);
    if (!amount || amount <= 0) return ctx.reply('Usage: .deposit [amount]');
    await Database.addBalance(sender, amount);
    const user = await Database.getUser(sender);
    await ctx.reply(`✅ Deposited *${amount} coins*\nNew balance: ${(user?.balance || 0)} coins`);
  },

  async donate(ctx) {
    const { sender, msg, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const amount = parseInt(body);
    if (!mentioned?.length || !amount || amount <= 0) return ctx.reply('Usage: .donate [amount] @user');
    if ((user.balance || 0) < amount) return ctx.reply('❌ Insufficient balance!');
    const target = mentioned[0];
    const targetUser = await Database.getUser(target);
    if (!targetUser?.registered) return ctx.reply('❌ Target is not registered!');
    await Database.removeBalance(sender, amount);
    await Database.addBalance(target, amount);
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `💸 *Donation!*\n\n@${sender.split('@')[0]} donated *${amount} coins* to @${target.split('@')[0]}!\n\n💝 How generous!`,
      mentions: [sender, target]
    }, { quoted: ctx.msg });
  },

  async lottery(ctx) {
    const { sender } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    const ticket = config.SHOP_ITEMS.find(i => i.id === 'lottery_ticket');
    if (!user.inventory?.includes('lottery_ticket')) return ctx.reply(`❌ You need a lottery ticket! Buy one from *.shop* for ${ticket.price} coins.`);
    
    const winner = Math.random() < 0.1;
    const inv = user.inventory.filter(i => i !== 'lottery_ticket');
    await Database.setUser(sender, { inventory: inv });
    
    if (winner) {
      await Database.addBalance(sender, config.LOTTERY_JACKPOT);
      await ctx.reply(`🎰 *JACKPOT!* 🎰\n\n🎊 You WON the lottery!\n💵 Prize: ${config.LOTTERY_JACKPOT} coins!`);
    } else {
      await ctx.reply(`🎰 *Lottery Result*\n\n❌ Better luck next time!\nBuy another ticket from *.shop*`);
    }
  },

  async richlist(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const data = await Database.getRichlist(ctx.groupId);
    if (!data.length) return ctx.reply('📊 No data yet!');
    const medals = ['🥇', '🥈', '🥉'];
    const list = data.map((u, i) => `${medals[i] || `${i+1}.`} @${u.jid?.split('@')[0]} - ${(u.balance || 0).toLocaleString()} coins`).join('\n');
    await ctx.sock.sendMessage(ctx.groupId, { text: `💰 *Rich List (Group)*\n\n${list}`, mentions: data.map(u => u.jid) }, { quoted: ctx.msg });
  },

  async richlistglobal(ctx) {
    const data = await Database.getGlobalRichlist();
    if (!data.length) return ctx.reply('📊 No data yet!');
    const medals = ['🥇', '🥈', '🥉'];
    const list = data.map((u, i) => `${medals[i] || `${i+1}.`} ${u.name || u.jid?.split('@')[0]} - ${(u.balance || 0).toLocaleString()} coins`).join('\n');
    await ctx.reply(`💰 *Global Rich List*\n\n${list}`);
  },

  async setname(ctx) {
    const { sender, body } = ctx;
    if (!body) return ctx.reply('Usage: .setname [your name]');
    await Database.setUser(sender, { name: body });
    await ctx.reply(`✅ Name updated to: *${body}*`);
  },

  async profile(ctx) {
    const { sender, msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const target = mentioned?.[0] || sender;
    const user = await Database.getUser(target);
    if (!user?.registered) return ctx.reply('❌ This user is not registered!');
    
    await ctx.reply(
      `👤 *Profile*\n\n` +
      `┌─────────────────\n` +
      `│ 🏷️ Name: ${user.name}\n` +
      `│ 📱 Number: @${target.split('@')[0]}\n` +
      `│ 📝 Bio: ${user.bio || 'No bio'}\n` +
      `│ 🎂 Age: ${user.age || 'Not set'}\n` +
      `│ 💵 Coins: ${(user.balance || 0).toLocaleString()}\n` +
      `│ 💎 Gems: ${user.gems || 0}\n` +
      `│ ⭐ Stardust: ${user.stardust || 0}\n` +
      `│ 📦 Items: ${user.inventory?.length || 0}\n` +
      `│ 📅 Joined: ${new Date(user.joinedAt).toLocaleDateString()}\n` +
      `└─────────────────`
    );
  },

  async edit(ctx) {
    await ctx.reply(`✏️ *Edit Profile*\n\nAvailable commands:\n• .setname [name] - Change name\n• .bio [bio] - Set bio\n• .setage [age] - Set age`);
  },

  async bio(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .bio [your bio]');
    await Database.setUser(ctx.sender, { bio: ctx.body });
    await ctx.reply(`✅ Bio updated!`);
  },

  async setage(ctx) {
    const age = parseInt(ctx.body);
    if (!age || age < 1 || age > 150) return ctx.reply('Usage: .setage [age]');
    await Database.setUser(ctx.sender, { age });
    await ctx.reply(`✅ Age set to: *${age}*`);
  },

  async inventory(ctx) {
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    if (!user.inventory?.length) return ctx.reply('📦 Inventory is empty!\nVisit *.shop* to buy items.');
    const itemCounts = {};
    user.inventory.forEach(i => { itemCounts[i] = (itemCounts[i] || 0) + 1; });
    const list = Object.entries(itemCounts).map(([id, count]) => {
      const item = config.SHOP_ITEMS.find(s => s.id === id) || { name: id };
      return `• ${item.name} x${count}`;
    }).join('\n');
    await ctx.reply(`📦 *Your Inventory*\n\n${list}`);
  },

  async use(ctx) {
    const { sender, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    if (!body) return ctx.reply('Usage: .use [item name]');
    const item = config.SHOP_ITEMS.find(i => i.name.toLowerCase().includes(body.toLowerCase()) || i.id.includes(body.toLowerCase()));
    if (!item) return ctx.reply('❌ Item not found!');
    if (!user.inventory?.includes(item.id)) return ctx.reply(`❌ You don't have ${item.name}!`);
    const newInv = [...user.inventory];
    newInv.splice(newInv.indexOf(item.id), 1);
    await Database.setUser(sender, { inventory: newInv });
    if (item.id === 'elixir') {
      await Database.setUser(sender, { elixir_active: true });
      await ctx.reply(`⚗️ *Elixir used!*\nYour next reward will be doubled! 🎊`);
    } else {
      await ctx.reply(`✅ Used *${item.name}*!`);
    }
  },

  async sell(ctx) {
    const { sender, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    if (!body) return ctx.reply('Usage: .sell [item name]');
    const item = config.SHOP_ITEMS.find(i => i.name.toLowerCase().includes(body.toLowerCase()) || i.id.includes(body.toLowerCase()));
    if (!item) return ctx.reply('❌ Item not found!');
    if (!user.inventory?.includes(item.id)) return ctx.reply(`❌ You don't have ${item.name}!`);
    const newInv = [...user.inventory];
    newInv.splice(newInv.indexOf(item.id), 1);
    const sellPrice = Math.floor(item.price * 0.7);
    await Database.setUser(sender, { inventory: newInv });
    await Database.addBalance(sender, sellPrice);
    await ctx.reply(`✅ Sold *${item.name}* for *${sellPrice} coins*!`);
  },

  async shop(ctx) {
    const items = config.SHOP_ITEMS.map(i => `• ${i.name} - ${i.price} coins\n  ${i.description}`).join('\n\n');
    await ctx.reply(`🛒 *Shadow Garden Shop*\n\n${items}\n\nBuy with *.buy [item name]*\nSell with *.sell [item name]*`);
  },

  async buy(ctx) {
    const { sender, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    if (!body) return ctx.reply('Usage: .buy [item name]');
    const item = config.SHOP_ITEMS.find(i => i.name.toLowerCase().includes(body.toLowerCase()) || i.id.includes(body.toLowerCase()));
    if (!item) return ctx.reply('❌ Item not found! Check *.shop*');
    if ((user.balance || 0) < item.price) return ctx.reply(`❌ Not enough coins! Need ${item.price}, have ${user.balance || 0}`);
    await Database.removeBalance(sender, item.price);
    const inv = [...(user.inventory || []), item.id];
    await Database.setUser(sender, { inventory: inv });
    await ctx.reply(`✅ Bought *${item.name}* for *${item.price} coins*!\nCheck *.inv* to see your items.`);
  },

  async leaderboard(ctx) {
    const data = await Database.getGlobalRichlist();
    if (!data.length) return ctx.reply('📊 No data yet!');
    const medals = ['🥇', '🥈', '🥉'];
    const list = data.map((u, i) => `${medals[i] || `${i+1}.`} ${u.name || 'Unknown'} - ${(u.balance || 0).toLocaleString()} coins`).join('\n');
    await ctx.reply(`🏆 *Leaderboard*\n\n${list}`);
  },

  async dig(ctx) {
    const { sender } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    if (!user.inventory?.includes('shovel')) return ctx.reply('❌ You need a ⛏️ Shovel! Buy from *.shop*');
    const finds = ['💰 gold coins', '💎 a gem', '🦴 bones', '🪨 just rocks', '🏺 an ancient artifact', '💍 a ring', '🔑 a mysterious key'];
    const amounts = [50, 200, 0, 5, 500, 150, 100];
    const idx = getRandomInt(0, finds.length - 1);
    const amount = amounts[idx];
    if (amount > 0) await Database.addBalance(sender, amount);
    await ctx.reply(`⛏️ *Digging...*\n\n🌍 You found ${finds[idx]}!\n${amount > 0 ? `💵 +${amount} coins!` : '😞 Nothing valuable...'}`);
  },

  async fish(ctx) {
    const { sender } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    if (!user.inventory?.includes('fishingrod')) return ctx.reply('❌ You need a 🎣 Fishing Rod! Buy from *.shop*');
    const catches = ['🐟 a small fish', '🐠 a tropical fish', '🐡 a pufferfish', '🦈 a shark!', '🦑 a squid', '🦞 a lobster', '🗑️ old trash', '💰 a treasure chest'];
    const amounts = [20, 50, 30, 300, 80, 150, 0, 500];
    const idx = getRandomInt(0, catches.length - 1);
    const amount = amounts[idx];
    if (amount > 0) await Database.addBalance(sender, amount);
    await ctx.reply(`🎣 *Fishing...*\n\n🌊 You caught ${catches[idx]}!\n${amount > 0 ? `💵 +${amount} coins!` : '😞 Nothing valuable...'}`);
  },

  async beg(ctx) {
    const { sender } = ctx;
    const response = BEG_RESPONSES[getRandomInt(0, BEG_RESPONSES.length - 1)];
    const amount = getRandomInt(response.amount[0], response.amount[1]);
    if (amount > 0) await Database.addBalance(sender, amount);
    await ctx.reply(`🙏 *Begging...*\n\n${response.text}\n${amount > 0 ? `💵 +${amount} coins!` : '😢 No luck today!'}`);
  },

  async roast(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const roast = ROASTS[getRandomInt(0, ROASTS.length - 1)];
    if (mentioned?.length) {
      await ctx.sock.sendMessage(ctx.groupId, {
        text: `🔥 *Roasting @${mentioned[0].split('@')[0]}*\n\n${roast}`,
        mentions: mentioned
      }, { quoted: ctx.msg });
    } else {
      await ctx.reply(`🔥 *Roast of the day:*\n\n${roast}`);
    }
  },

  async gamble(ctx) {
    const { sender, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    const amount = parseInt(body);
    if (!amount || amount < config.GAME_BET_MIN) return ctx.reply(`Usage: .gamble [amount]\nMinimum bet: ${config.GAME_BET_MIN} coins`);
    if ((user.balance || 0) < amount) return ctx.reply('❌ Insufficient balance!');
    const won = Math.random() > 0.5;
    if (won) {
      await Database.addBalance(sender, amount);
      await ctx.reply(`🎰 *You WON!* +${amount} coins\n💰 New balance: ${(user.balance || 0) + amount} coins`);
    } else {
      await Database.removeBalance(sender, amount);
      await ctx.reply(`🎰 *You LOST!* -${amount} coins\n💰 New balance: ${Math.max(0, (user.balance || 0) - amount)} coins`);
    }
  },
};
