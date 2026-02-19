const axios = require('axios');
const config = require('../../config');

async function callGemini(prompt) {
  if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return '⚠️ Gemini API key not configured! Please set GEMINI_API_KEY in config.js';
  }
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 30000 }
    );
    return res.data.candidates[0].content.parts[0].text;
  } catch (e) {
    return `❌ AI Error: ${e.response?.data?.error?.message || e.message}`;
  }
}

module.exports = {
  async ai(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .ai [your question]');
    await ctx.react('🤔');
    const response = await callGemini(ctx.body);
    await ctx.reply(`🤖 *AI Response*\n\n${response}`);
    await ctx.react('✅');
  },

  async generate(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .generate [prompt]');
    await ctx.reply(
      `🎨 *Image Generation*\n\n🚧 Image generation requires a Stable Diffusion API key.\n\n` +
      `To enable:\n1. Get API key from https://stability.ai\n2. Add STABILITY_API_KEY in config.js\n\n` +
      `Your prompt: "${ctx.body}"`
    );
  },

  async enhance(ctx) {
    await ctx.reply('🔍 *Image Enhancement*\n\n🚧 Please reply to an image with .enhance\n\nThis feature uses Real-ESRGAN upscaling. Coming soon!');
  },

  async translate(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .translate [language] [text]\nExample: .translate spanish Hello world');
    const parts = ctx.body.split(' ');
    const lang = parts[0];
    const text = parts.slice(1).join(' ');
    if (!text) return ctx.reply('Usage: .translate [language] [text]');
    await ctx.react('🌐');
    const response = await callGemini(`Translate this text to ${lang}. Only respond with the translation, nothing else: "${text}"`);
    await ctx.reply(`🌐 *Translation (${lang})*\n\n${response}`);
  },

  async transcribe(ctx) {
    await ctx.reply('🎤 *Transcription*\n\n🚧 Reply to a voice note with .transcribe\n\nThis feature uses Whisper AI. Coming soon!');
  },
};
