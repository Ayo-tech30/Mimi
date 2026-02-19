// ============================================================
// ⚙️ BOT CONFIGURATION - Edit this file for your setup
// ============================================================

module.exports = {
  // Bot owner number (with country code, no + sign)
  OWNER_NUMBER: '2349049460676',

  // ============================================================
  // ADD OTHER TRUSTED NUMBERS HERE (can also use .ban command)
  // Format: 'countrycode+number' e.g. '2348012345678'
  // ============================================================
  SUDO_NUMBERS: [
    '2349049460676',
    // ADD MORE NUMBERS BELOW:
    // '1234567890',
    // '0987654321',
  ],

  // Bot prefix
  PREFIX: '.',

  // Bot name
  BOT_NAME: 'Delta',

  // Bot creator
  CREATOR: 'ꨄ︎ 𝙆𝙔𝙉𝙓 ꨄ︎',

  // Community link
  COMMUNITY_LINK: 'https://chat.whatsapp.com/C58szhJGQ3EKlvFt1Hp57n',

  // Default sticker metadata
  STICKER_NAME: 'Shadow',
  STICKER_AUTHOR: 'Sʜᴀᴅᴏᴡ  Gᴀʀᴅᴇɴ',

  // Session folder
  SESSION_FOLDER: './sessions',

  // ============================================================
  // API KEYS - Fill these in!
  // ============================================================

  // Google Gemini AI API Key (for .ai / .gpt commands)
  // Get it FREE at: https://makersuite.google.com/app/apikey
  GEMINI_API_KEY: 'AIzaSyBEP87ySx4Qw_Qu_s2U879rKxMbpoIFj_c',

  // Remove.bg API Key (for background removal - optional)
  // Get at: https://www.remove.bg/api
  REMOVEBG_API_KEY: 'YOUR_REMOVEBG_KEY_HERE',

  // Tenor GIF API Key (for anime interaction GIFs)
  // Get FREE at: https://tenor.com/gifapi
  TENOR_API_KEY: 'YOUR_TENOR_API_KEY_HERE',

  // RapidAPI Key (for downloaders - YouTube, TikTok etc)
  // Get at: https://rapidapi.com
  RAPIDAPI_KEY: 'YOUR_RAPIDAPI_KEY_HERE',

  // Nekos.fun API (for anime SFW/NSFW images - FREE)
  NEKOS_API: 'https://nekos.fun/api',

  // Pinterest API (optional, for .pinterest)
  PINTEREST_API_KEY: 'YOUR_PINTEREST_KEY',

  // Economy settings
  DAILY_AMOUNT: 500,
  DAILY_COOLDOWN_HOURS: 24,
  STARTING_BALANCE: 1000,

  // Max warnings before auto-kick
  MAX_WARNS: 3,

  // Antilink action (kick/warn/delete)
  DEFAULT_ANTILINK_ACTION: 'warn',

  // Game settings
  GAME_BET_MIN: 10,
  SLOTS_EMOJIS: ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'],

  // Card tiers
  CARD_TIERS: ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'],

  // Shop items
  SHOP_ITEMS: [
    { id: 'fishingrod', name: '🎣 Fishing Rod', price: 200, type: 'tool', description: 'Catch rare fish' },
    { id: 'shovel', name: '⛏️ Shovel', price: 150, type: 'tool', description: 'Dig for treasure' },
    { id: 'shield', name: '🛡️ Shield', price: 500, type: 'defense', description: 'Protection item' },
    { id: 'sword', name: '⚔️ Sword', price: 400, type: 'weapon', description: 'Battle weapon' },
    { id: 'gem', name: '💎 Gem', price: 1000, type: 'collectible', description: 'Rare collectible' },
    { id: 'lottery_ticket', name: '🎟️ Lottery Ticket', price: 100, type: 'gambling', description: 'Try your luck' },
    { id: 'elixir', name: '⚗️ Elixir', price: 300, type: 'consumable', description: 'Double next reward' },
    { id: 'card_pack', name: '🎴 Card Pack', price: 800, type: 'cards', description: 'Contains 3 random cards' },
  ],

  // Gambling settings
  LOTTERY_JACKPOT: 10000,
  ROULETTE_NUMBERS: 37,
};
