# Настройка Discord бота для Linux

## Установка зависимостей

### Node.js
```bash
# Установка Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node -v
npm -v
```

### Зависимости проекта
```bash
# Установка зависимостей
npm install

# Установка TypeScript и ts-node глобально (если нужно)
npm install -g typescript ts-node
```

## Сборка проекта

```bash
# Сборка для продакшена (включает копирование файлов)
npm run build:prod

# Или обычная сборка
npm run build
```

## Запуск бота

### Способ 1: Прямой запуск
```bash
# Запуск в режиме разработки
npm run start

# Запуск продакшен версии
npm run start:prod

# Или используя скрипт
./start-bot.sh
```

### Способ 2: Через PM2 (рекомендуется для продакшена)
```bash
# Установка PM2
npm install -g pm2

# Запуск через PM2
pm2 start ecosystem.config.js

# Просмотр логов
pm2 logs alliance-bot2

# Остановка
pm2 stop alliance-bot2

# Перезапуск
pm2 restart alliance-bot2
```

## Деплой

```bash
# Создание архива для деплоя
./deploy.sh

# Или вручную
npm run build:prod
tar -czf discord-bot-deploy.tar.gz -C dist .
```

## Структура файлов

```
MainBot/
├── src/                    # Исходный код TypeScript
│   ├── data/              # JSON файлы данных
│   ├── commands/          # Команды бота
│   └── utils/             # Утилиты
├── dist/                  # Скомпилированный код
│   ├── data/              # Скопированные JSON файлы
│   ├── commands/
│   └── utils/
├── logs/                  # Логи бота
├── start-bot.sh          # Скрипт запуска для Linux
├── deploy.sh             # Скрипт деплоя для Linux
└── ecosystem.config.js    # Конфигурация PM2
```

## Важные замечания

1. **Файлы .bat** - предназначены только для Windows и не работают в Linux
2. **Пути** - используйте прямые слеши `/` вместо обратных `\`
3. **Права доступа** - убедитесь, что скрипты исполняемы: `chmod +x *.sh`
4. **Переменные окружения** - создайте файл `.env` с токеном бота

## Устранение проблем

### Ошибка "ENOENT: no such file or directory"
- Убедитесь, что выполнен `npm run build:prod` (копирует папку data)
- Проверьте, что папка `dist/data/` существует

### Ошибка "Permission denied"
```bash
chmod +x start-bot.sh deploy.sh
```

### Бот не запускается
```bash
# Проверка логов
tail -f logs/bot-$(date +%Y-%m-%d).log

# Проверка через PM2
pm2 logs alliance-bot2
``` 