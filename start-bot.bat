@echo off
title Discord Bot Starter
cd /d %~dp0

echo [INFO] Checking Node.js...

:: Check if Node.js is installed
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] Node.js not found. Installing...

    :: Download Node.js LTS (adjust version if needed)
    powershell -Command "Invoke-WebRequest -Uri https://nodejs.org/dist/v18.18.2/node-v18.18.2-x64.msi -OutFile nodejs.msi"

    :: Install silently
    msiexec /i nodejs.msi /quiet

    IF %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install Node.js.
        pause
        exit /b 1
    )

    echo [INFO] Node.js installed successfully.
    del nodejs.msi >nul 2>nul
) else (
    echo [INFO] Node.js is already installed.
)

:: Ensure Node.js is in PATH (refreshing it just in case)
setx PATH "%PATH%;C:\Program Files\nodejs" >nul

:: Display versions
node -v
npm -v

:: Check if node_modules exists
IF NOT EXIST node_modules (
    echo [INFO] Installing dependencies...
    npm install
)

:: Check if ts-node is available globally
where ts-node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] ts-node not found. Installing globally...
    npm install -g ts-node typescript
)

:: Run the bot
echo [INFO] Starting the bot...
npx ts-node src/index.ts

pause
