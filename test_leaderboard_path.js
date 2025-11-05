const path = require('path');
const fs = require('fs');

console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());

const leaderboardDataPath = path.join(__dirname, "..", "data", "leaderboard_data.json");
console.log('leaderboardDataPath:', leaderboardDataPath);
console.log('Absolute path:', path.resolve(leaderboardDataPath));

// Проверяем, существует ли файл
console.log('File exists:', fs.existsSync(leaderboardDataPath));

// Пробуем записать тестовые данные
const testData = {
  date: "2025-09-11",
  position: 61,
  points: 24800
};

try {
  fs.writeFileSync(leaderboardDataPath, JSON.stringify(testData, null, 2));
  console.log('✅ Данные успешно записаны');
  
  // Проверяем, что данные записались
  const savedData = JSON.parse(fs.readFileSync(leaderboardDataPath, 'utf-8'));
  console.log('Сохраненные данные:', savedData);
} catch (error) {
  console.error('❌ Ошибка при записи:', error);
}
