# 🌸 Shadow Garden Bot - Setup Guide

## ⚡ QUICK START

### Step 1: Install Node.js
Download from: https://nodejs.org (v18 or higher)

### Step 2: Install Dependencies
```bash
cd shadow-garden-bot
npm install
```

> If ffmpeg is not installed (needed for video stickers):
> - Windows: Download from https://ffmpeg.org/download.html
> - Linux: `sudo apt install ffmpeg`
> - Mac: `brew install ffmpeg`

### Step 3: Configure the Bot
Open `config.js` and fill in:

```
GEMINI_API_KEY  → Get FREE at: https://makersuite.google.com/app/apikey
TENOR_API_KEY   → Get FREE at: https://tenor.com/gifapi  
```

> Other API keys are optional. The bot works without them but some features will show links instead.

### Step 4: Add Your Bot Image
Put your bot menu image as `delta.jpg` in the main folder.

### Step 5: Start the Bot
```bash
node index.js
```

### Step 6: Enter Pairing Code
1. Enter your WhatsApp number when prompted
2. Copy the pairing code shown
3. Go to WhatsApp → Settings → Linked Devices → Link a Device
4. Choose "Link with phone number"
5. Enter the code

---

## 📋 COMMAND REFERENCE

### 👑 Owner Commands (only 2349049460676 can use)
| Command | Description |
|---------|-------------|
| `.ban @user` | Ban a user from using the bot |
| `.unban @user` | Remove ban |
| `.join [link]` | Add bot to a group |
| `.exit` | Remove bot from group |

### ⚙️ Admin Commands
All admin commands require group admin permissions.

### 💰 Economy
Users must `.register` first to use economy features.

---

## 🔑 REQUIRED API KEYS

| API | Purpose | Where to Get | Cost |
|-----|---------|--------------|------|
| Gemini AI | `.ai`, `.gpt`, `.translate` | https://makersuite.google.com/app/apikey | FREE |
| Tenor | Anime GIFs for interactions | https://tenor.com/gifapi | FREE |

## 🔑 OPTIONAL API KEYS

| API | Purpose | Where to Get |
|-----|---------|--------------|
| RapidAPI | Better downloaders | https://rapidapi.com |
| Remove.bg | Background removal | https://www.remove.bg/api |
| SauceNAO | Reverse image search | https://saucenao.com/user.php |
| Pinterest | Pinterest search | https://developers.pinterest.com |

---

## ➕ Adding More Owner Numbers

Open `config.js` and add numbers to `SUDO_NUMBERS`:
```js
SUDO_NUMBERS: [
  '2349049460676',  // Main owner
  '1234567890',     // Add more here
],
```

---

## 🛠️ Troubleshooting

**Bot shows "pairing code" error?**
- Wait 30 seconds and try again
- Make sure your phone has internet
- Try restarting the bot

**Stickers not working?**
- Install ffmpeg on your system
- Check the temp/ folder has write permissions

**Firebase errors?**
- Make sure your Firebase project has Firestore enabled
- Go to Firebase Console → Firestore Database → Create database

**Bot disconnects?**
- The bot auto-reconnects! Just wait.
- Sessions are saved in the `sessions/` folder
- Don't delete sessions/ unless you want to re-pair

---

## 📁 FILE STRUCTURE
```
shadow-garden-bot/
├── index.js           ← Main bot file
├── config.js          ← YOUR SETTINGS (edit this!)
├── delta.jpg          ← Menu image (add this!)
├── package.json
├── sessions/          ← Auto-created (auth data)
├── temp/              ← Auto-created (temp files)
└── src/
    ├── commands/      ← All bot commands
    ├── database/      ← Firebase connection
    ├── handlers/      ← Message processing
    └── utils/         ← Helper functions
```

---

🌸 *Shadow Garden Bot v2.0 — Made with ❤️ by KYNX*
