const axios = require('axios');
const config = require('../../config');

// ============================================================
// ANIME GIF FETCHER - Gets GIFs from tenor/nekos for interactions
// ============================================================
const INTERACTION_GIFS = {
  hug: ['https://media.tenor.com/jTgCL0JHbtsAAAAC/anime-hug.gif', 'https://media.tenor.com/XHZ5t1FDAtEAAAAC/hug-anime.gif'],
  kiss: ['https://media.tenor.com/DdqaiqhiVH8AAAAC/kiss-anime.gif', 'https://media.tenor.com/DVSANEYbS_QAAAAC/anime-kiss.gif'],
  slap: ['https://media.tenor.com/Ro5pvbUFiS4AAAAC/anime-slap.gif', 'https://media.tenor.com/RvXJbERMbcYAAAAC/slap-anime.gif'],
  wave: ['https://media.tenor.com/diqz1n5XKvgAAAAC/anime-wave.gif', 'https://media.tenor.com/2rUXBVZUhocAAAAC/anime-wave-goodbye.gif'],
  pat: ['https://media.tenor.com/4n9H3nDDRLgAAAAC/pat-head-pat.gif', 'https://media.tenor.com/B1hc5TaMMasAAAAC/anime-head-pat.gif'],
  dance: ['https://media.tenor.com/WoYDL2OEHIIAAAAC/anime-dance.gif', 'https://media.tenor.com/UxcU8bXXFPkAAAAC/anime-dancing.gif'],
  sad: ['https://media.tenor.com/fJerxL4iS4MAAAAC/anime-cry.gif', 'https://media.tenor.com/iXH2LzBiSW4AAAAC/anime-sad.gif'],
  smile: ['https://media.tenor.com/mCr3GaOhFa0AAAAC/anime-smile.gif', 'https://media.tenor.com/dSMC3to0ATIAAAAC/smile-anime.gif'],
  laugh: ['https://media.tenor.com/DGrP35n6rUIAAAAC/anime-laugh.gif', 'https://media.tenor.com/V-EM6h6y97QAAAAC/anime-laugh.gif'],
  punch: ['https://media.tenor.com/aJBDq5SZeXAAAAAC/anime-punch.gif', 'https://media.tenor.com/jQ3y0TzlZMoAAAAC/punch-anime.gif'],
  kill: ['https://media.tenor.com/G3HOoiIPIw0AAAAC/kill-anime.gif', 'https://media.tenor.com/xOqb-1xJXvYAAAAC/anime-kill.gif'],
  hit: ['https://media.tenor.com/XEmunbexHbkAAAAC/hit-anime.gif', 'https://media.tenor.com/Bxx5mnYGmisAAAAC/anime-hit.gif'],
  kidnap: ['https://media.tenor.com/Bp-HJbcBW9cAAAAC/anime-kidnap.gif', 'https://media.tenor.com/ryMFHhMGdyEAAAAC/anime-drag.gif'],
  lick: ['https://media.tenor.com/NLh8N7-rCxwAAAAC/anime-lick.gif', 'https://media.tenor.com/z_FmGEj63GIAAAAC/anime-lick.gif'],
  bonk: ['https://media.tenor.com/0FpAcVZ0JGgAAAAC/bonk-anime.gif', 'https://media.tenor.com/sFCfHrPGNikAAAAC/bonk-dog.gif'],
  tickle: ['https://media.tenor.com/Gc7bE1qdZNcAAAAC/anime-tickle.gif', 'https://media.tenor.com/xmNXiJIWsEcAAAAC/tickle-anime.gif'],
  shrug: ['https://media.tenor.com/Y7iw0u4V7f4AAAAC/shrug-anime.gif', 'https://media.tenor.com/j56Fh1DcTkgAAAAC/anime-shrug.gif'],
  wank: ['https://media.tenor.com/P-bMqbShRYUAAAAC/anime-facepalm.gif', 'https://media.tenor.com/8m6hECPnxuoAAAAC/anime-no.gif'],
  jihad: ['https://media.tenor.com/tbqQp6pj6DEAAAAC/anime-explosion.gif', 'https://media.tenor.com/6b1RHMDRmisAAAAC/explosion-anime.gif'],
  crusade: ['https://media.tenor.com/dquFCxDj5WQAAAAC/anime-sword.gif', 'https://media.tenor.com/EVj-0lWLFWAAAAAC/anime-charge.gif'],
  fuck: ['https://media.tenor.com/Ul_aGDjWEQsAAAAC/anime-blush.gif', 'https://media.tenor.com/pWPe3R0mVW8AAAAC/anime-embarrassed.gif'],
};

async function getAnimeGif(action) {
  try {
    if (config.TENOR_API_KEY && config.TENOR_API_KEY !== 'YOUR_TENOR_API_KEY_HERE') {
      const res = await axios.get(`https://tenor.googleapis.com/v2/search?q=anime+${action}&key=${config.TENOR_API_KEY}&limit=5&contentfilter=medium`);
      const gifs = res.data.results;
      if (gifs && gifs.length > 0) {
        const random = gifs[Math.floor(Math.random() * gifs.length)];
        return random.media_formats.gif.url;
      }
    }
  } catch (e) {}
  // Fallback to hardcoded GIFs
  const gifs = INTERACTION_GIFS[action] || INTERACTION_GIFS.smile;
  return gifs[Math.floor(Math.random() * gifs.length)];
}

async function downloadGif(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(res.data);
  } catch (e) {
    return null;
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatBalance(amount) {
  return `💵 ${Number(amount).toLocaleString()} coins`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

function isOwner(jid) {
  const num = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  return config.SUDO_NUMBERS.includes(num);
}

function getTag(jid) {
  return `@${jid.split('@')[0]}`;
}

const JOKES = [
  "Why did the anime character fail math? Because they always went 'Plus Ultra' instead of doing calculus!",
  "What do you call a lazy Naruto? A Naru-snooze!",
  "Why does Goku never lose his phone? Because he has Dragon Ball Z signal!",
  "What did Sasuke say when he lost his keys? 'Sharingan them!'",
  "Why don't pirates watch anime? Because they're afraid of One Piece at a time!",
  "What's a vampire's favorite anime? Hellsing! 🧛",
  "Why did the Titan cross the road? To eat the chicken on the other side!",
  "How does L from Death Note take his coffee? Without sugar — he already has enough mysteries.",
  "Why is Vegeta always angry? Because he's always in second SAIYAN!",
  "What do you call Pikachu on a bus? An electric ride!",
];

const TRUTHS = [
  "What's the most embarrassing thing you've ever done?",
  "Who is your crush?",
  "Have you ever lied to your best friend?",
  "What's your biggest secret?",
  "Have you ever cheated on a test?",
  "What's your biggest fear?",
  "Have you ever stolen anything?",
  "Who was your first kiss?",
  "What's the worst thing you've ever said about someone?",
  "Have you ever pretended to be sick to skip school/work?",
];

const DARES = [
  "Send a voice note singing your favorite song!",
  "Change your profile picture to something silly for 1 hour!",
  "Write a love letter to someone in the group!",
  "Do 20 push-ups and send proof!",
  "Text your crush right now!",
  "Post a cringe selfie in the group!",
  "Speak in rhymes for the next 10 minutes!",
  "Call someone and tell them you love them!",
  "Change your WhatsApp status to 'I am a potato' for 1 hour!",
  "Send the most embarrassing photo on your phone!",
];

const WYR_QUESTIONS = [
  "Would you rather fly or be invisible?",
  "Would you rather have unlimited money or unlimited time?",
  "Would you rather fight 100 duck-sized horses or 1 horse-sized duck?",
  "Would you rather live in anime world or video game world?",
  "Would you rather be the smartest person alive or the most attractive?",
  "Would you rather have no internet for a year or no music?",
  "Would you rather eat only spicy food or only bland food forever?",
  "Would you rather be stuck in the past or the future?",
];

const ROASTS = [
  "You're the reason shampoo has instructions.",
  "I'd agree with you but then we'd both be wrong.",
  "You're proof that even Darwin makes mistakes.",
  "If laughter is the best medicine, your face must be curing diseases.",
  "I've seen better looks on a potato.",
  "You're like a light at the end of a tunnel — the train kind.",
  "Some people bring joy wherever they go. You bring it when you leave.",
  "I'd insult you, but my mom said I shouldn't burn garbage.",
];

const BEG_RESPONSES = [
  { text: "A kind stranger tossed you some coins!", amount: [10, 100] },
  { text: "You found some money on the ground!", amount: [5, 50] },
  { text: "Someone felt sorry for you and gave you cash!", amount: [20, 150] },
  { text: "You performed on the street and earned tips!", amount: [15, 80] },
  { text: "Nobody gave you anything... try again later.", amount: [0, 0] },
];

module.exports = {
  getAnimeGif, downloadGif, formatBalance, getRandomInt, sleep,
  formatTime, formatUptime, isOwner, getTag,
  JOKES, TRUTHS, DARES, WYR_QUESTIONS, ROASTS, BEG_RESPONSES
};
