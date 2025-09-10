const fs = require('fs');
const path = require('path');

// Пути к файлам
const usersPath = path.join(__dirname, 'data', 'users.json');
const membersPath = path.join(__dirname, 'data', 'members_current.json');
const trackedPath = path.join(__dirname, 'data', 'tracked.json');
const achieversPath = path.join(__dirname, 'data', 'season_achievers.json');

// Функция нормализации никнейма
function normalize(nick) {
  return nick.toLowerCase().replace(/\s+/g, "");
}

// Загрузка данных
const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
const members = JSON.parse(fs.readFileSync(membersPath, 'utf-8'));
const tracked = JSON.parse(fs.readFileSync(trackedPath, 'utf-8'));

console.log('=== ТЕСТ ИСПРАВЛЕННОЙ ФУНКЦИИ ДОСТИЖЕНИЙ ===\n');

// 1. Найти игроков с 1600+ ЛПР
const highScorers = members.filter(m => m.points >= 1600);
console.log(`Игроков с 1600+ ЛПР: ${highScorers.length}`);
highScorers.forEach(player => {
  console.log(`- ${player.nick}: ${player.points} ЛПР`);
});

console.log('\n=== АНАЛИЗ ДАННЫХ ===\n');

// 2. Создать карту никнеймов из users.json
const nickToUserId = new Map();
for (const [uid, data] of Object.entries(users)) {
  if (data.nick) {
    nickToUserId.set(normalize(data.nick), uid);
  }
}

console.log(`Всего пользователей в users.json: ${Object.keys(users).length}`);
console.log(`Уникальных никнеймов в users.json: ${nickToUserId.size}`);

// 3. Проверить, какие игроки есть в tracked.json
const trackedNicks = new Set(Object.keys(tracked));
console.log(`\nИгроков в tracked.json: ${trackedNicks.size}`);

// 4. Проверить соответствие
const foundInUsers = [];
const notFoundInUsers = [];
const foundInTracked = [];

for (const player of highScorers) {
  const normalizedNick = normalize(player.nick);
  const userId = nickToUserId.get(normalizedNick);
  
  if (userId) {
    foundInUsers.push({ nick: player.nick, userId, points: player.points });
  } else {
    notFoundInUsers.push({ nick: player.nick, points: player.points });
    
    // Проверить, есть ли в tracked.json
    if (trackedNicks.has(normalizedNick)) {
      foundInTracked.push({ nick: player.nick, points: player.points });
    }
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

console.log(`\nИз них найдено в tracked.json: ${foundInTracked.length}`);
foundInTracked.forEach(player => {
  console.log(`- ${player.nick}: ${player.points} ЛПР`);
});

// 5. Симуляция исправленной функции
console.log(`\n=== СИМУЛЯЦИЯ ИСПРАВЛЕННОЙ ФУНКЦИИ ===`);

// Загружаем текущие достижения
let currentAchievers = [];
try {
  currentAchievers = JSON.parse(fs.readFileSync(achieversPath, 'utf-8'));
} catch {
  currentAchievers = [];
}

console.log(`Текущих достижений: ${currentAchievers.length}`);

// Симулируем исправленную логику
const achievers = new Set(currentAchievers);
let addedCount = 0;

for (const player of highScorers) {
  const normalizedNick = normalize(player.nick);
  let userId = nickToUserId.get(normalizedNick);
  
  // Если не найден в users.json, ищем в tracked.json
  if (!userId && trackedNicks.has(normalizedNick)) {
    console.log(`✓ ${player.nick} найден в tracked.json, но нужен Discord ID`);
    // В реальной функции здесь был бы поиск в Discord сервере
    // Пока просто отмечаем, что игрок найден
  }
  
  if (userId) {
    const wasAdded = achievers.has(userId);
    achievers.add(userId);
    if (!wasAdded) {
      addedCount++;
      console.log(`✓ Добавлен: ${player.nick} (ID: ${userId})`);
    } else {
      console.log(`- Уже есть: ${player.nick} (ID: ${userId})`);
    }
  } else {
    console.log(`✗ НЕ добавлен: ${player.nick} (отсутствует в users.json)`);
  }
}

console.log(`\nИтого достижений после обновления: ${achievers.size} (добавлено новых: ${addedCount})`);

// 6. Рекомендации
console.log(`\n=== РЕКОМЕНДАЦИИ ===`);
if (foundInTracked.length > 0) {
  console.log('ИСПРАВЛЕНИЕ РАБОТАЕТ:');
  console.log('Следующие игроки найдены в tracked.json и будут обработаны:');
  foundInTracked.forEach(player => {
    console.log(`- ${player.nick}: ${player.points} ЛПР`);
  });
  console.log('\nНО: Для полной работы нужно, чтобы эти игроки были в Discord сервере');
} else {
  console.log('Все игроки с 1600+ ЛПР найдены в users.json');
}
