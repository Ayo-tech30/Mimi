const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  Browsers,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { messageHandler, handleGroupUpdate } = require('./src/handlers/messageHandler');

// Session folder
const SESSION_FOLDER = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSION_FOLDER)) fs.mkdirSync(SESSION_FOLDER, { recursive: true });

// Temp folder
const TEMP_FOLDER = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_FOLDER)) fs.mkdirSync(TEMP_FOLDER, { recursive: true });

// Silent logger - no more "reconnecting" spam
const logger = pino({ level: 'silent' });

// Store (for caching group info etc.)
const store = makeInMemoryStore({ logger });

let sock;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, // We use pairing code instead
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return { conversation: 'hello' };
    },
  });

  store?.bind(sock.ev);

  // ============================================================
  // CONNECTION EVENT
  // ============================================================
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('\n🔴 Bot was logged out! Delete the sessions folder and restart.\n');
        process.exit(1);
      }
      
      if (shouldReconnect) {
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, MAX_RECONNECT_DELAY);
        console.log(`\n⚡ Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts})`);
        setTimeout(startBot, delay);
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('\n✅ ═══════════════════════════════════');
      console.log('   Shadow Garden Bot is ONLINE! 🌸');
      console.log('   Bot number:', sock.user?.id?.split(':')[0]);
      console.log('═══════════════════════════════════\n');
    } else if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
    }
  });

  // ============================================================
  // PAIRING CODE - Request if not authenticated
  // ============================================================
  if (!state.creds.registered) {
    console.log('\n🔑 ═══════════════════════════════════════');
    console.log('   PAIRING CODE SETUP');
    console.log('   Shadow Garden Bot v2.0');
    console.log('═══════════════════════════════════════\n');
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    const phoneNumber = await new Promise(resolve => {
      rl.question('📱 Enter your WhatsApp number (with country code, no +):\n   Example: 2348012345678\n\n> ', (num) => {
        rl.close();
        resolve(num.trim().replace(/[^0-9]/g, ''));
      });
    });
    
    if (!phoneNumber) {
      console.log('❌ No phone number entered!');
      process.exit(1);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log('\n🔑 ═══════════════════════════════════════');
      console.log(`   PAIRING CODE: ${formattedCode}`);
      console.log('═══════════════════════════════════════');
      console.log('\n📲 Steps:');
      console.log('   1. Open WhatsApp on your phone');
      console.log('   2. Go to Settings > Linked Devices');
      console.log('   3. Tap "Link a Device"');
      console.log('   4. Select "Link with phone number instead"');
      console.log(`   5. Enter code: ${formattedCode}`);
      console.log('\n⏳ Waiting for you to enter the code...\n');
    } catch (e) {
      console.log('❌ Could not generate pairing code:', e.message);
      console.log('💡 Try restarting the bot!');
    }
  }

  // ============================================================
  // CREDENTIALS SAVE
  // ============================================================
  sock.ev.on('creds.update', saveCreds);

  // ============================================================
  // MESSAGE HANDLER
  // ============================================================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      try {
        await messageHandler(sock, msg);
      } catch (e) {
        // Silent error handling - no spam
      }
    }
  });

  // ============================================================
  // GROUP PARTICIPANT UPDATE (welcome/leave)
  // ============================================================
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupUpdate(sock, update, null);
    } catch (e) {}
  });

  // ============================================================
  // GROUP UPDATE (name changes etc.)
  // ============================================================
  sock.ev.on('groups.update', async (updates) => {
    // Handle group setting updates
  });

  return sock;
}

// ============================================================
// START BOT
// ============================================================
console.log('\n🌸 Starting Shadow Garden Bot...\n');
startBot().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Keep process alive
process.on('uncaughtException', (err) => {
  // Silent - prevents crashes
});
process.on('unhandledRejection', (err) => {
  // Silent - prevents crashes
});
