const fs = require('fs');
const path = require('path');

// Загружаем данные из файлов
const membersCurrentPath = path.join(__dirname, 'data', 'members_current.json');
const members1650Path = path.join(__dirname, 'data', 'members_1650.json');
const members0120Path = path.join(__dirname, 'data', 'members_0120.json');

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

// Загружаем данные
const current = loadJson(membersCurrentPath);
const data1650 = loadJson(members1650Path);
const data0120 = loadJson(members0120Path);

console.log('=== АНАЛИЗ ДАННЫХ СТАТИСТИКИ ===');
console.log(`Текущие данные: ${current.length} участников`);
console.log(`Данные 16:50: ${data1650.length} участников`);
console.log(`Данные 01:20: ${data0120.length} участников`);

// Проверяем изменения между 16:50 и 01:20
console.log('\n=== ИЗМЕНЕНИЯ МЕЖДУ 16:50 И 01:20 ===');
const changes1650to0120 = compareMembersData(data1650, data0120);
console.log(`Общее изменение: ${changes1650to0120.totalDelta >= 0 ? '+' : ''}${changes1650to0120.totalDelta}`);
console.log(`Количество изменений: ${changes1650to0120.changes.length}`);

if (changes1650to0120.changes.length > 0) {
  console.log('Изменения по игрокам:');
  changes1650to0120.changes.sort((a, b) => b.delta - a.delta).forEach(change => {
    console.log(`  ${change.nick}: ${change.delta >= 0 ? '+' : ''}${change.delta}`);
  });
}

// Проверяем изменения между текущими данными и 01:20
console.log('\n=== ИЗМЕНЕНИЯ МЕЖДУ ТЕКУЩИМИ И 01:20 ===');
const changesCurrentTo0120 = compareMembersData(current, data0120);
console.log(`Общее изменение: ${changesCurrentTo0120.totalDelta >= 0 ? '+' : ''}${changesCurrentTo0120.totalDelta}`);
console.log(`Количество изменений: ${changesCurrentTo0120.changes.length}`);

if (changesCurrentTo0120.changes.length > 0) {
  console.log('Изменения по игрокам:');
  changesCurrentTo0120.changes.sort((a, b) => b.delta - a.delta).forEach(change => {
    console.log(`  ${change.nick}: ${change.delta >= 0 ? '+' : ''}${change.delta}`);
  });
}

// Проверяем, есть ли игроки с 0 очками
console.log('\n=== АНАЛИЗ НУЛЕВЫХ ОЧКОВ ===');
const zeroPointsCurrent = current.filter(p => p.points === 0).length;
const zeroPoints1650 = data1650.filter(p => p.points === 0).length;
const zeroPoints0120 = data0120.filter(p => p.points === 0).length;

console.log(`Игроков с 0 очками в текущих данных: ${zeroPointsCurrent}/${current.length}`);
console.log(`Игроков с 0 очками в 16:50: ${zeroPoints1650}/${data1650.length}`);
console.log(`Игроков с 0 очками в 01:20: ${zeroPoints0120}/${data0120.length}`);

// Проверяем общую сумму очков
const totalPointsCurrent = current.reduce((sum, p) => sum + p.points, 0);
const totalPoints1650 = data1650.reduce((sum, p) => sum + p.points, 0);
const totalPoints0120 = data0120.reduce((sum, p) => sum + p.points, 0);

console.log('\n=== ОБЩАЯ СУММА ОЧКОВ ===');
console.log(`Текущие данные: ${totalPointsCurrent}`);
console.log(`Данные 16:50: ${totalPoints1650}`);
console.log(`Данные 01:20: ${totalPoints0120}`);
