const { fetchClanPoints, saveCurrentMembers } = require('./dist/utils/clan');

async function syncMembers() {
  console.log('🚀 Запуск синхронизации участников клана ALLIANCE...');
  
  try {
    // Получаем актуальные данные клана
    const members = await fetchClanPoints('ALLIANCE');
    
    console.log(`\n✅ Результат парсинга:`);
    console.log(`📊 Всего участников: ${members.length}`);
    console.log(`📊 Участников с очками > 0: ${members.filter(m => m.points > 0).length}`);
    console.log(`📊 Участников с 0 очками: ${members.filter(m => m.points === 0).length}`);
    
    if (members.length > 0) {
      console.log(`\n🏆 Топ-10 игроков по очкам:`);
      members.slice(0, 10).forEach((member, index) => {
        console.log(`${index + 1}. ${member.nick}: ${member.points} очков`);
      });
    }
    
    // Сохраняем данные в members_current.json
    saveCurrentMembers(members);
    console.log(`\n💾 Данные сохранены в members_current.json`);
    console.log(`✅ Синхронизация завершена успешно!`);
    
  } catch (error) {
    console.error('❌ Ошибка при синхронизации:', error.message);
    process.exit(1);
  }
}

syncMembers();
