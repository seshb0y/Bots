const fs = require('fs');
const path = require('path');

// Загружаем данные из файлов
const membersCurrentPath = path.join(__dirname, 'data', 'members_current.json');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function normalize(nick) {
  return nick.toLowerCase().replace(/\s+/g, "").trim();
}

function compareMembersData(prev, curr) {
  const prevMap = new Map(prev.map(p => [normalize(p.nick), p]));
  const currMap = new Map(curr.map(c => [normalize(c.nick), c]));
  
  let totalDelta = 0;
  const changes = [];
  
  for (const [nickNorm, currPlayer] of currMap.entries()) {
    const prevPlayer = prevMap.get(nickNorm);
    if (prevPlayer) {
      const delta = currPlayer.points - prevPlayer.points;
      if (delta !== 0) {
        changes.push({ nick: currPlayer.nick, delta });
        totalDelta += delta;
      }
    }
  }
  
  return { totalDelta, changes };
}

// Симулируем данные, полученные через API (используем данные из 01:20 как пример)
const apiData = loadJson(path.join(__dirname, 'data', 'members_0120.json'));
const currentData = loadJson(membersCurrentPath);

console.log('=== ТЕСТ КОМАНДЫ /STATS ===');
console.log(`Текущие данные: ${currentData.length} участников`);
console.log(`API данные: ${apiData.length} участников`);

// Сравниваем данные
const { totalDelta, changes } = compareMembersData(currentData, apiData);

console.log(`\nОбщее изменение: ${totalDelta >= 0 ? '+' : ''}${totalDelta} очков`);
console.log(`Количество изменений: ${changes.length}`);

if (changes.length > 0) {
  console.log('\nИзменения по игрокам:');
  changes.sort((a, b) => b.delta - a.delta).forEach(change => {
    console.log(`• ${change.nick}: ${change.delta >= 0 ? '+' : ''}${change.delta}`);
  });
} else {
  console.log('\nЗа сутки не было изменений очков ни у одного игрока.');
}

// Формируем сообщение как в команде stats
let msg = `📊 **Статистика за сутки:**\n`;
msg += `Полк всего: ${totalDelta >= 0 ? "+" : ""}${totalDelta} очков\n`;

if (changes.length > 0) {
  msg += `\nИзменения по игрокам:\n`;
  for (const { nick, delta } of changes.sort((a, b) => b.delta - a.delta)) {
    msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
  }
} else {
  msg += `\nЗа сутки не было изменений очков ни у одного игрока.\n`;
}

console.log('\n=== СООБЩЕНИЕ ДЛЯ ОТПРАВКИ ===');
console.log(msg);
