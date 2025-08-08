#!/bin/bash
echo "Сборка проекта..."
npm run build:prod

echo "Создание архива для деплоя..."
tar -czf discord-bot-deploy.tar.gz -C dist .

echo "Архив создан: discord-bot-deploy.tar.gz"
echo "Теперь можно загрузить этот файл на сервер и распаковать в папку бота"
echo "Для распаковки используйте: tar -xzf discord-bot-deploy.tar.gz" 