# Инструкция по деплою Discord бота

## Локальная подготовка

1. **Сборка проекта:**
   ```bash
   npm run build:prod
   ```
   Или запустите `deploy.bat` для автоматической сборки и создания архива.

2. **Проверьте, что в папке `dist/` есть:**
   - Все скомпилированные `.js` файлы
   - `package.json`
   - `.env` (с правильными токенами)
   - Папка `data/` с файлами

## Загрузка на сервер

### Вариант 1: Через SCP
```bash
scp discord-bot-deploy.zip user@server:/path/to/bot/
```

### Вариант 2: Через SFTP
```bash
# Подключитесь к серверу через SFTP клиент
# Загрузите файл discord-bot-deploy.zip
```

### Вариант 3: Через веб-интерфейс
- Загрузите файл через веб-интерфейс хостинга

## Настройка на сервере

1. **Распакуйте архив:**
   ```bash
   cd /path/to/bot/
   unzip discord-bot-deploy.zip
   ```

2. **Установите зависимости:**
   ```bash
   npm install --production
   ```

3. **Настройте переменные окружения:**
   ```bash
   nano .env
   ```
   Убедитесь, что в `.env` правильные токены:
   ```
   DISCORD_TOKEN=ваш_токен_бота
   ANNOUNCE_CHANNEL_ID=ваш_id_канала
   ```

4. **Запустите бота:**

   **Через PM2 (рекомендуется):**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "discord-bot"
   pm2 startup
   pm2 save
   ```

   **Через systemd:**
   ```bash
   sudo nano /etc/systemd/system/discord-bot.service
   ```
   
   Содержимое файла:
   ```ini
   [Unit]
   Description=Discord Bot
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/bot
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

   Затем:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable discord-bot
   sudo systemctl start discord-bot
   ```

## Обновление бота

1. **Локально:** Соберите новую версию
2. **На сервере:** Замените файлы и перезапустите
   ```bash
   # Остановите бота
   pm2 stop discord-bot
   # или
   sudo systemctl stop discord-bot

   # Замените файлы
   rm -rf dist/
   unzip new-discord-bot-deploy.zip

   # Перезапустите
   pm2 start discord-bot
   # или
   sudo systemctl start discord-bot
   ```

## Мониторинг

```bash
# PM2
pm2 logs discord-bot
pm2 status

# systemd
sudo journalctl -u discord-bot -f
sudo systemctl status discord-bot
``` 