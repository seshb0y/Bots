// Тест поиска Discord пользователей по никнеймам
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

async function testDiscordSearch() {
  try {
    await client.login(process.env.TOKEN);
    console.log('Бот подключен к Discord');
    
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.log('Сервер не найден');
      return;
    }
    
    console.log(`Сервер: ${guild.name}`);
    
    // Тестовые никнеймы
    const testNicks = ['DeDky4er', 'Mawiile', 'джaмбо'];
    
    for (const nick of testNicks) {
      console.log(`\n=== Поиск для ${nick} ===`);
      
      try {
        // Поиск по точному никнейму
        let members = await guild.members.search({ query: nick, limit: 5 });
        console.log(`Поиск "${nick}": найдено ${members.size} результатов`);
        
        if (members.size > 0) {
          for (const [memberId, member] of members) {
            const displayName = member.displayName || member.user.username;
            console.log(`  - ${displayName} (ID: ${memberId})`);
          }
        }
        
        // Поиск по формату "DeDky4er (Никита)"
        if (members.size === 0) {
          const searchQuery = `${nick} (`;
          console.log(`Поиск "${searchQuery}":`);
          
          members = await guild.members.search({ query: searchQuery, limit: 10 });
          console.log(`  Найдено ${members.size} результатов`);
          
          for (const [memberId, member] of members) {
            const displayName = member.displayName || member.user.username;
            console.log(`  - ${displayName} (ID: ${memberId})`);
            
            if (displayName.startsWith(nick + ' (')) {
              console.log(`    ✓ НАЙДЕН! Начинается с "${nick} ("`);
            }
          }
        }
        
      } catch (error) {
        console.log(`Ошибка поиска для ${nick}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Ошибка подключения:', error);
  } finally {
    await client.destroy();
  }
}

testDiscordSearch();
