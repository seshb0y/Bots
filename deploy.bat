@echo off
echo Сборка проекта...
npm run build:prod

echo Создание архива для деплоя...
powershell Compress-Archive -Path dist\* -DestinationPath discord-bot-deploy.zip -Force

echo Архив создан: discord-bot-deploy.zip
echo Теперь можно загрузить этот файл на сервер и распаковать в папку бота
pause 