@echo off
title Discord Bot Starter
cd /d %~dp0

echo [INFO] Проверка Node.js...

:: Проверка установлен ли node
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] Node.js не найден. Устанавливаем...

    :: Скачиваем Node.js LTS 64-bit MSI
    powershell -Command "Invoke-WebRequest -Uri https://nodejs.org/dist/v18.18.2/node-v18.18.2-x64.msi -OutFile nodejs.msi"

    :: Установка в тихом режиме
    msiexec /i nodejs.msi /quiet

    IF %ERRORLEVEL% NEQ 0 (
        echo [ОШИБКА] Не удалось установить Node.js
        pause
        exit /b 1
    )

    echo [INFO] Node.js установлен. Продолжаем...
    del nodejs.msi >nul 2>nul
) else (
    echo [INFO] Node.js уже установлен
)

:: Обновляем PATH (на всякий случай)
setx PATH "%PATH%;C:\Program Files\nodejs" >nul

:: Проверка node версии
node -v
npm -v

:: Установка зависимостей, если нужно
IF NOT EXIST node_modules (
    echo [INFO] Устанавливаем зависимости...
    npm install
)

:: Запуск бота
echo [INFO] Запускаем бота...
npx ts-node src/index.ts

pause
