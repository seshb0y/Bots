const fs = require('fs');
const path = require('path');

// Пути к файлам
const usersPath = path.join(__dirname, 'data', 'users.json');
const membersPath = path.join(__dirname, 'data', 'members_current.json');
const achieversPath = path.join(__dirname, 'data', 'season_achievers.json');

// Функция нормализации никнейма
function normalize(nick) {
  return nick.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Загрузка данных
const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
const members = JSON.parse(fs.readFileSync(membersPath, 'utf-8'));

console.log('=== АНАЛИЗ СИСТЕМЫ ДОСТИЖЕНИЙ ===\n');

// 1. Найти игроков с 1600+ ЛПР
const highScorers = members.filter(m => m.points >= 1600);
console.log(`Игроков с 1600+ ЛПР: ${highScorers.length}`);
highScorers.forEach(player => {
  console.log(`- ${player.nick}: ${player.points} ЛПР`);
});

console.log('\n=== СОПОСТАВЛЕНИЕ С USERS.JSON ===\n');

// 2. Создать карту никнеймов из users.json
const nickToUserId = new Map();
for (const [uid, data] of Object.entries(users)) {
  if (data.nick) {
    nickToUserId.set(normalize(data.nick), uid);
  }
}

console.log(`Всего пользователей в users.json: ${Object.keys(users).length}`);
console.log(`Уникальных никнеймов в users.json: ${nickToUserId.size}`);

// 3. Проверить соответствие
const foundInUsers = [];
const notFoundInUsers = [];

for (const player of highScorers) {
  const normalizedNick = normalize(player.nick);
  const userId = nickToUserId.get(normalizedNick);
  
  if (userId) {
    foundInUsers.push({ nick: player.nick, userId, points: player.points });
  } else {
    notFoundInUsers.push({ nick: player.nick, points: player.points });
  }
}

console.log(`\nНайдено в users.json: ${foundInUsers.length}`);
foundInUsers.forEach(player => {
  console.log(`- ${player.nick} (ID: ${player.userId}): ${player.points} ЛПР`);
});

console.log(`\nНЕ найдено в users.json: ${notFoundInUsers.length}`);
notFoundInUsers.forEach(player => {
  console.log(`- ${player.nick}: ${player.points} ЛПР`);
});

// 4. Проверить текущие достижения
let currentAchievers = [];
try {
  currentAchievers = JSON.parse(fs.readFileSync(achieversPath, 'utf-8'));
} catch {
  currentAchievers = [];
}

console.log(`\n=== ТЕКУЩИЕ ДОСТИЖЕНИЯ ===`);
console.log(`Записанных достижений: ${currentAchievers.length}`);
if (currentAchievers.length > 0) {
  currentAchievers.forEach(userId => {
    const userData = users[userId];
    if (userData) {
      console.log(`- ${userData.nick} (ID: ${userId})`);
    } else {
      console.log(`- Неизвестный пользователь (ID: ${userId})`);
    }
  });
}

// 5. Симуляция обновления достижений
console.log(`\n=== СИМУЛЯЦИЯ ОБНОВЛЕНИЯ ===`);
const achievers = new Set(currentAchievers);

for (const player of highScorers) {
  const normalizedNick = normalize(player.nick);
  const userId = nickToUserId.get(normalizedNick);
  
  if (userId) {
    achievers.add(userId);
    console.log(`✓ Добавлен: ${player.nick} (ID: ${userId})`);
  } else {
    console.log(`✗ НЕ добавлен: ${player.nick} (отсутствует в users.json)`);
  }
}

console.log(`\nИтого достижений после обновления: ${achievers.size}`);

// 6. Рекомендации
console.log(`\n=== РЕКОМЕНДАЦИИ ===`);
if (notFoundInUsers.length > 0) {
  console.log('ПРОБЛЕМА: Следующие игроки с 1600+ ЛПР отсутствуют в users.json:');
  notFoundInUsers.forEach(player => {
    console.log(`- ${player.nick}: ${player.points} ЛПР`);
  });
  console.log('\nРЕШЕНИЕ: Нужно добавить этих игроков в users.json через команду /syncclan');
} else {
  console.log('Все игроки с 1600+ ЛПР найдены в users.json');
}

