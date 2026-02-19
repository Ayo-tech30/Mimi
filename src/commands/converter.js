const sharp = require('sharp');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const TEMP = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

async function downloadMedia(msg, sock) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  return await downloadMediaMessage(msg, 'buffer', {}, {
    logger: require('pino')({ level: 'silent' }),
    reuploadRequest: sock.updateMediaMessage
  });
}

function getQuotedMsg(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    key: { id: ctx.stanzaId, remoteJid: msg.key.remoteJid, participant: ctx.participant }
  };
}

// ============================================================
// INJECT STICKER METADATA INTO WEBP
// WhatsApp reads sticker pack name/author from EXIF data
// ============================================================
function injectStickerMetadata(webpBuffer, packname, author) {
  try {
    const json = JSON.stringify({
      'sticker-pack-id': `com.shadowgarden.${Date.now()}`,
      'sticker-pack-name': packname,
      'sticker-pack-publisher': author,
      'emojis': ['🌸']
    });

    const jsonBuf = Buffer.from(json, 'utf8');

    // Build minimal EXIF block with JSON embedded as UserComment
    const exifIFD = Buffer.concat([
      Buffer.from([0x49, 0x49, 0x2A, 0x00]), // Little-endian TIFF
      Buffer.from([0x08, 0x00, 0x00, 0x00]), // IFD offset
      Buffer.from([0x01, 0x00]),              // 1 entry
      Buffer.from([0x09, 0x01]),              // Tag 0x0109 = UserComment
      Buffer.from([0x07, 0x00]),              // Type: UNDEFINED
      uint32LE(jsonBuf.length),
      uint32LE(0x1A),                         // Value offset
      uint32LE(0),                            // No next IFD
      jsonBuf
    ]);

    const exifWithHeader = Buffer.concat([
      Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]), // "Exif\0\0"
      exifIFD
    ]);

    // Build EXIF chunk for WebP: "EXIF" + 4-byte-size + data
    const exifChunk = Buffer.concat([
      Buffer.from('EXIF'),
      uint32LE(exifWithHeader.length),
      exifWithHeader,
      exifWithHeader.length % 2 ? Buffer.from([0x00]) : Buffer.alloc(0)
    ]);

    // Verify it's a RIFF/WEBP file
    if (webpBuffer.slice(0, 4).toString() !== 'RIFF') return webpBuffer;
    if (webpBuffer.slice(8, 12).toString() !== 'WEBP') return webpBuffer;

    const chunkFourCC = webpBuffer.slice(12, 16).toString();

    let outputBuf;

    if (chunkFourCC === 'VP8X') {
      // Already extended format — set EXIF flag bit and append chunk
      outputBuf = Buffer.from(webpBuffer);
      const flags = outputBuf.readUInt32LE(20);
      outputBuf.writeUInt32LE(flags | 0x8, 20); // Set EXIF flag
      outputBuf = Buffer.concat([outputBuf, exifChunk]);
    } else {
      // Simple format — need to add VP8X chunk first
      const vp8Data = webpBuffer.slice(12);
      // Try to read width/height from VP8 bitstream
      let canvasW = 511, canvasH = 511;
      if (chunkFourCC === 'VP8 ') {
        try {
          const w = (webpBuffer.readUInt16LE(26) & 0x3FFF);
          const h = (webpBuffer.readUInt16LE(28) & 0x3FFF);
          if (w > 0 && h > 0) { canvasW = w - 1; canvasH = h - 1; }
        } catch {}
      }

      const vp8xData = Buffer.alloc(10);
      vp8xData.writeUInt32LE(0x8, 0);       // Flags: EXIF bit
      writeUInt24LE(vp8xData, canvasW, 4);   // Canvas width - 1
      writeUInt24LE(vp8xData, canvasH, 7);   // Canvas height - 1

      const vp8xChunk = Buffer.concat([
        Buffer.from('VP8X'),
        uint32LE(10),
        vp8xData
      ]);

      const newSize = 4 + vp8xChunk.length + vp8Data.length + exifChunk.length;
      outputBuf = Buffer.concat([
        Buffer.from('RIFF'),
        uint32LE(newSize),
        Buffer.from('WEBP'),
        vp8xChunk,
        vp8Data,
        exifChunk
      ]);
    }

    // Update RIFF file size
    outputBuf.writeUInt32LE(outputBuf.length - 8, 4);
    return outputBuf;
  } catch (e) {
    return webpBuffer; // Return original on any error
  }
}

function uint32LE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function writeUInt24LE(buf, val, offset) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >> 8) & 0xff;
  buf[offset + 2] = (val >> 16) & 0xff;
}

module.exports = {
  async sticker(ctx) {
    const { sock, msg, groupId } = ctx;
    const target = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];

    if (!['imageMessage', 'videoMessage', 'stickerMessage'].includes(msgType)) {
      return ctx.reply('❌ Please send/reply to an image or video!\nUsage: .sticker (while replying to image/video)');
    }

    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);

      if (msgType === 'imageMessage') {
        let webp = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp()
          .toBuffer();

        webp = injectStickerMetadata(webp, config.STICKER_NAME, config.STICKER_AUTHOR);
        await sock.sendMessage(groupId, { sticker: webp }, { quoted: msg });
        await ctx.react('✅');

      } else if (msgType === 'videoMessage' || msgType === 'gifMessage') {
        const inPath = path.join(TEMP, `in_${Date.now()}.mp4`);
        const outPath = path.join(TEMP, `out_${Date.now()}.webp`);
        fs.writeFileSync(inPath, buffer);

        await new Promise((res, rej) => {
          exec(
            `ffmpeg -i "${inPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,fps=15" -loop 0 -t 8 -an -vsync 0 "${outPath}"`,
            (err) => err ? rej(err) : res()
          );
        });

        let webpBuf = fs.readFileSync(outPath);
        webpBuf = injectStickerMetadata(webpBuf, config.STICKER_NAME, config.STICKER_AUTHOR);
        await sock.sendMessage(groupId, { sticker: webpBuf }, { quoted: msg });
        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch {}
        await ctx.react('✅');
      }
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed to create sticker: ${e.message}\n\nMake sure ffmpeg is installed!`);
    }
  },

  async take(ctx) {
    const { msg, sock, groupId, body } = ctx;

    if (!body) return ctx.reply(
      '❌ Usage: *.take <pack name>, <author>*\n\nExample:\n.take Shadow Garden, KYNX\n\nReply to an image or sticker with this command.'
    );

    const parts = body.split(',');
    const packname = parts[0]?.trim() || config.STICKER_NAME;
    const author = parts[1]?.trim() || config.STICKER_AUTHOR;

    const target = getQuotedMsg(msg) || msg;
    if (!target) return ctx.reply('❌ Reply to an image or sticker!');

    const msgType = Object.keys(target.message || {})[0];
    if (!['imageMessage', 'stickerMessage'].includes(msgType)) {
      return ctx.reply('❌ Reply to an image or sticker!');
    }

    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);

      let webp;
      if (msgType === 'imageMessage') {
        webp = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp()
          .toBuffer();
      } else {
        webp = buffer;
      }

      // Inject custom pack name and author
      webp = injectStickerMetadata(webp, packname, author);

      await sock.sendMessage(groupId, { sticker: webp }, { quoted: msg });
      await ctx.reply(`✅ *Sticker created!*\n📦 Pack: *${packname}*\n✍️ Author: *${author}*`);
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },

  async turnimg(ctx) {
    const { msg, sock, groupId } = ctx;
    const target = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];
    if (msgType !== 'stickerMessage') return ctx.reply('❌ Reply to a sticker to convert to image!');

    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);
      const png = await sharp(buffer).png().toBuffer();
      await sock.sendMessage(groupId, { image: png, caption: '🖼️ Here you go!' }, { quoted: msg });
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },

  async rotate(ctx) {
    const { msg, sock, groupId } = ctx;
    const target = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];
    if (msgType !== 'imageMessage') return ctx.reply('❌ Reply to an image!\nUsage: .rotate [90/180/270]');
    const deg = parseInt(ctx.body) || 90;
    if (![90, 180, 270].includes(deg)) return ctx.reply('❌ Valid degrees: 90, 180, 270');

    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);
      const rotated = await sharp(buffer).rotate(deg).toBuffer();
      await sock.sendMessage(groupId, { image: rotated, caption: `🔄 Rotated ${deg}°` }, { quoted: msg });
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },

  async turnvid(ctx) {
    const { msg, sock, groupId } = ctx;
    const target = getQuotedMsg(msg) || msg;
    if (!target) return ctx.reply('❌ Reply to an animated sticker!');
    const msgType = Object.keys(target.message || {})[0];
    if (msgType !== 'stickerMessage') return ctx.reply('❌ Reply to an animated sticker!');

    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);
      const inPath = path.join(TEMP, `stk_${Date.now()}.webp`);
      const outPath = path.join(TEMP, `vid_${Date.now()}.mp4`);
      fs.writeFileSync(inPath, buffer);

      await new Promise((res, rej) => {
        exec(`ffmpeg -i "${inPath}" -movflags faststart -pix_fmt yuv420p "${outPath}"`, (err) => err ? rej(err) : res());
      });

      if (fs.existsSync(outPath)) {
        const vidBuffer = fs.readFileSync(outPath);
        await sock.sendMessage(groupId, { video: vidBuffer, caption: '🎬 Here you go!', mimetype: 'video/mp4' }, { quoted: msg });
        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch {}
        await ctx.react('✅');
      } else {
        await ctx.react('❌');
        await ctx.reply('❌ Conversion failed! Make sure ffmpeg is installed.');
      }
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },
};
