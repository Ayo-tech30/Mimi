#!/bin/bash
# ============================================================
# yt-dlp INSTALLER FOR SHADOW GARDEN BOT
# Run this ONCE before starting the bot for the first time
# ============================================================

echo ""
echo "🌸 Shadow Garden Bot - yt-dlp Installer"
echo "========================================"
echo ""

OS="$(uname -s 2>/dev/null || echo Windows)"

if [[ "$OS" == "Linux" ]] || [[ "$OS" == "Darwin" ]]; then
  echo "📦 Installing yt-dlp..."
  
  # Try pip first
  if command -v pip3 &>/dev/null; then
    pip3 install yt-dlp --break-system-packages 2>/dev/null || pip3 install yt-dlp
    echo "✅ yt-dlp installed via pip!"
  elif command -v pip &>/dev/null; then
    pip install yt-dlp
    echo "✅ yt-dlp installed via pip!"
  else
    # Download binary directly
    if [[ "$OS" == "Linux" ]]; then
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
      chmod a+rx /usr/local/bin/yt-dlp
      echo "✅ yt-dlp binary installed!"
    elif [[ "$OS" == "Darwin" ]]; then
      brew install yt-dlp 2>/dev/null || {
        curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o /usr/local/bin/yt-dlp
        chmod a+rx /usr/local/bin/yt-dlp
      }
      echo "✅ yt-dlp installed!"
    fi
  fi

  # Check ffmpeg
  if ! command -v ffmpeg &>/dev/null; then
    echo ""
    echo "⚠️  ffmpeg not found! Installing..."
    if [[ "$OS" == "Linux" ]]; then
      apt-get install -y ffmpeg 2>/dev/null || yum install -y ffmpeg 2>/dev/null
    elif [[ "$OS" == "Darwin" ]]; then
      brew install ffmpeg
    fi
  else
    echo "✅ ffmpeg already installed!"
  fi

else
  echo "Windows detected!"
  echo ""
  echo "📥 Download yt-dlp for Windows:"
  echo "   https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
  echo ""
  echo "   Save it to: C:\\Windows\\System32\\yt-dlp.exe"
  echo "   (or any folder in your PATH)"
  echo ""
fi

echo ""
echo "🎵 Testing yt-dlp..."
if command -v yt-dlp &>/dev/null; then
  yt-dlp --version
  echo "✅ yt-dlp is working!"
else
  echo "⚠️  yt-dlp not found in PATH. The bot will use fallback methods."
fi

echo ""
echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "✅ All done! Run 'node index.js' to start the bot."
echo ""
