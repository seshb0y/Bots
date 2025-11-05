#!/bin/bash

# Скрипт управления Discord ботом через PM2
# Использование: ./bot-manager.sh [start|stop|restart|status|logs|build]

BOT_NAME="alliance-bot"
PROJECT_DIR="/opt/discord-bot"

cd "$PROJECT_DIR"

case "$1" in
    start)
        echo "🚀 Запуск бота..."
        pm2 start ecosystem.config.js
        ;;
    stop)
        echo "⏹️ Остановка бота..."
        pm2 stop "$BOT_NAME"
        ;;
    restart)
        echo "🔄 Перезапуск бота..."
        pm2 restart "$BOT_NAME"
        ;;
    status)
        echo "📊 Статус бота:"
        pm2 status "$BOT_NAME"
        ;;
    logs)
        echo "📝 Логи бота (последние 20 строк):"
        pm2 logs "$BOT_NAME" --lines 20
        ;;
    build)
        echo "🔨 Сборка проекта..."
        npm run build:prod
        echo "✅ Сборка завершена"
        ;;
    build-restart)
        echo "🔨 Сборка и перезапуск..."
        npm run build:prod
        pm2 restart "$BOT_NAME"
        echo "✅ Сборка и перезапуск завершены"
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status|logs|build|build-restart}"
        echo ""
        echo "Команды:"
        echo "  start         - Запустить бота"
        echo "  stop          - Остановить бота"
        echo "  restart       - Перезапустить бота"
        echo "  status        - Показать статус"
        echo "  logs          - Показать логи"
        echo "  build         - Собрать проект"
        echo "  build-restart - Собрать и перезапустить"
        exit 1
        ;;
esac
