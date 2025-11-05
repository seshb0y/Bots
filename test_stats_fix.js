const { loadLeaderboardData } = require('./dist/utils/leaderboard');

console.log('🧪 Тестирование исправлений статистики...');

// Проверяем, что данные лидерборда загружаются
console.log('\n1. Проверка загрузки данных лидерборда:');
const leaderboardData = loadLeaderboardData();
if (leaderboardData) {
  console.log('✅ Данные лидерборда загружены:');
  console.log(`   Дата: ${leaderboardData.date}`);
  console.log(`   Место: ${leaderboardData.position}`);
  console.log(`   Очки: ${leaderboardData.points.toLocaleString()}`);
} else {
  console.log('❌ Данные лидерборда не найдены');
}

// Симулируем различные сценарии
console.log('\n2. Тестирование fallback логики:');

// Сценарий 1: Есть и текущие, и предыдущие данные
console.log('\n📊 Сценарий 1: Полные данные');
const currentInfo1 = { position: 60, points: 25200 };
const previousData1 = { date: "2025-09-11", position: 61, points: 24800 };

if (currentInfo1 && previousData1) {
  console.log('✅ Показываем полную статистику с сравнением');
  console.log(`   Место: ${currentInfo1.position} (было ${previousData1.position})`);
  console.log(`   Очки: ${currentInfo1.points.toLocaleString()} (было ${previousData1.points.toLocaleString()})`);
}

// Сценарий 2: Только текущие данные
console.log('\n📊 Сценарий 2: Только текущие данные');
const currentInfo2 = { position: 60, points: 25200 };
const previousData2 = null;

if (currentInfo2 && previousData2) {
  console.log('✅ Показываем полную статистику с сравнением');
} else if (currentInfo2) {
  console.log('✅ Показываем только текущие данные');
  console.log(`   Место: ${currentInfo2.position}`);
  console.log(`   Очки: ${currentInfo2.points.toLocaleString()}`);
}

// Сценарий 3: Только предыдущие данные (fallback)
console.log('\n📊 Сценарий 3: Только предыдущие данные (fallback)');
const currentInfo3 = null;
const previousData3 = { date: "2025-09-11", position: 61, points: 24800 };

if (currentInfo3 && previousData3) {
  console.log('✅ Показываем полную статистику с сравнением');
} else if (currentInfo3) {
  console.log('✅ Показываем только текущие данные');
} else if (previousData3) {
  console.log('✅ Fallback: показываем предыдущие данные');
  console.log(`   Место: ${previousData3.position} (данные за ${previousData3.date})`);
  console.log(`   Очки: ${previousData3.points.toLocaleString()}`);
  console.log('   ⚠️ *Текущие данные лидерборда недоступны*');
}

// Сценарий 4: Нет данных вообще
console.log('\n📊 Сценарий 4: Нет данных');
const currentInfo4 = null;
const previousData4 = null;

if (currentInfo4 && previousData4) {
  console.log('✅ Показываем полную статистику с сравнением');
} else if (currentInfo4) {
  console.log('✅ Показываем только текущие данные');
} else if (previousData4) {
  console.log('✅ Fallback: показываем предыдущие данные');
} else {
  console.log('❌ Информация о лидерборде недоступна');
}

console.log('\n🎉 Тестирование завершено!');
