const { fetchClanPoints } = require('./dist/utils/clan');

async function testParsing() {
  console.log('🧪 Тестирование парсинга клана ALLIANCE...');
  
  try {
    const members = await fetchClanPoints('ALLIANCE');
    console.log(`\n✅ Результат парсинга:`);
    console.log(`📊 Всего участников: ${members.length}`);
    console.log(`📊 Участников с очками > 0: ${members.filter(m => m.points > 0).length}`);
    console.log(`📊 Участников с 0 очками: ${members.filter(m => m.points === 0).length}`);
    
    console.log(`\n🏆 Топ-10 игроков по очкам:`);
    members.slice(0, 10).forEach((member, index) => {
      console.log(`${index + 1}. ${member.nick}: ${member.points} очков`);
    });
    
    console.log(`\n📋 Все участники:`);
    members.forEach((member, index) => {
      console.log(`${index + 1}. ${member.nick}: ${member.points} очков`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

testParsing();

