#!/bin/bash

echo "🚀 Загрузка изменений на GitHub..."

# Проверяем, что мы в git репозитории
if [ ! -d ".git" ]; then
    echo "❌ Ошибка: Не найден git репозиторий"
    exit 1
fi

# Проверяем статус git
echo "📊 Проверка статуса git..."
git status

# Добавляем все изменения
echo "➕ Добавление изменений..."
git add .

# Проверяем, есть ли изменения для коммита
if git diff --cached --quiet; then
    echo "ℹ️ Нет изменений для коммита"
    exit 0
fi

# Запрашиваем сообщение коммита
echo "💬 Введите сообщение коммита (или нажмите Enter для автоматического):"
read commit_message

# Если сообщение пустое, создаем автоматическое
if [ -z "$commit_message" ]; then
    commit_message="Обновление: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Создаем коммит
echo "💾 Создание коммита: $commit_message"
git commit -m "$commit_message"

# Проверяем, есть ли удаленный репозиторий
if git remote -v | grep -q origin; then
    echo "📤 Отправка изменений на GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Изменения успешно загружены на GitHub!"
    else
        echo "❌ Ошибка при отправке на GitHub"
        exit 1
    fi
else
    echo "⚠️ Удаленный репозиторий не настроен"
    echo "Для настройки выполните:"
    echo "git remote add origin <URL_ВАШЕГО_РЕПОЗИТОРИЯ>"
    echo "git push -u origin main"
fi

echo "🎉 Готово!" 