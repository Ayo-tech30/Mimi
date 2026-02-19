@echo off
echo.
echo ==========================================
echo   Shadow Garden Bot - Windows Installer
echo ==========================================
echo.

echo [1/3] Installing Node.js dependencies...
call npm install
echo.

echo [2/3] Checking for yt-dlp...
where yt-dlp >nul 2>&1
if %errorlevel% == 0 (
    echo yt-dlp found!
    yt-dlp --version
) else (
    echo yt-dlp NOT found!
    echo.
    echo Please download yt-dlp.exe from:
    echo https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
    echo.
    echo Save it to this folder: %~dp0
    echo Then rename it to: yt-dlp.exe
    echo.
    echo The bot will still work without it but .play may be limited.
    echo.
    pause
)

echo [3/3] Checking for ffmpeg...
where ffmpeg >nul 2>&1
if %errorlevel% == 0 (
    echo ffmpeg found!
) else (
    echo ffmpeg NOT found!
    echo.
    echo Download from: https://www.gyan.dev/ffmpeg/builds/
    echo Extract and add to PATH for full sticker/audio support.
    echo.
)

echo.
echo ==========================================
echo   Installation Complete!
echo   Run: node index.js  to start the bot
echo ==========================================
echo.
pause
