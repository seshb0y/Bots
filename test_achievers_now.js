// Тест системы достижений прямо сейчас
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Импортируем функции из бота
const { loadJson, saveJson } = require('./dist/utils/json');
const { normalize } = require('./dist/utils/normalize');

// Пути к файлам
const usersPath = path.join(__dirname, 'data', 'users.json');
const membersPath = path.join(__dirname, 'data', 'members_current.json');
const trackedPath = path.join(__dirname, 'data', 'tracked.json');
const achieversPath = path.join(__dirname, 'data', 'season_achievers.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

async function testAchieversNow() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Бот подключен к Discord');
    
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.log('Сервер не найден');
      return;
    }
    
    console.log(`Сервер: ${guild.name}`);
    
    // Загружаем данные
    const users = loadJson(usersPath);
    const members = loadJson(membersPath);
    const tracked = loadJson(trackedPath);
    
    console.log('\n=== ТЕСТ СИСТЕМЫ ДОСТИЖЕНИЙ ===\n');
    
    // Находим игроков с 1600+ ЛПР
    const highScorers = members.filter(m => m.points >= 1600);
    console.log(`Игроков с 1600+ ЛПР: ${highScorers.length}`);
    highScorers.forEach(player => {
      console.log(`- ${player.nick}: ${player.points} ЛПР`);
    });
    
    // Создаем карту никнеймов из users.json
    const nickToUserId = new Map();
    for (const [uid, data] of Object.entries(users)) {
      if (data.nick) {
        nickToUserId.set(normalize(data.nick), uid);
      }
    }
    
    console.log(`\nПользователей в users.json: ${Object.keys(users).length}`);
    
    // Ищем игроков в tracked.json и Discord сервере
    for (const [nick, data] of Object.entries(tracked)) {
      if (!nickToUserId.has(normalize(nick))) {
        console.log(`\nПоиск Discord ID для ${nick}...`);
        
        try {
          // Поиск по точному никнейму
          let member = await guild.members.search({ query: nick, limit: 1 });
          
          // Если не найден, ищем по формату "DeDky4er (Никита)"
          if (member.size === 0) {
            const searchQuery = `${nick} (`;
            const searchResults = await guild.members.search({ query: searchQuery, limit: 10 });
            
            // Ищем среди результатов тот, который начинается с нашего никнейма
            for (const [memberId, memberData] of searchResults) {
              const displayName = memberData.displayName || memberData.user.username;
              if (displayName.startsWith(nick + ' (')) {
                member = searchResults;
                break;
              }
            }
          }
          
          if (member.size > 0) {
            const userId = member.first()?.id;
            if (userId) {
              nickToUserId.set(normalize(nick), userId);
              console.log(`✓ Найден Discord ID для ${nick}: ${userId}`);
            }
          } else {
            console.log(`✗ Не найден Discord ID для ${nick}`);
          }
        } catch (error) {
          console.log(`Ошибка поиска для ${nick}: ${error.message}`);
        }
      }
    }
    
    // Загружаем текущие достижения
    let currentAchievers = [];
    try {
      currentAchievers = JSON.parse(fs.readFileSync(achieversPath, 'utf-8'));
    } catch {
      currentAchievers = [];
    }
    
    console.log(`\nТекущих достижений: ${currentAchievers.length}`);
    
    // Обновляем достижения
    const achievers = new Set(currentAchievers);
    let addedCount = 0;
    
    for (const player of highScorers) {
      const normalizedNick = normalize(player.nick);
      const userId = nickToUserId.get(normalizedNick);
      
      if (userId) {
        const wasAdded = achievers.has(userId);
        achievers.add(userId);
        if (!wasAdded) {
          addedCount++;
          console.log(`✓ Добавлено достижение для ${player.nick} (ID: ${userId})`);
        } else {
          console.log(`- Уже есть достижение для ${player.nick} (ID: ${userId})`);
        }
      } else {
        console.log(`✗ Не удалось найти userId для ${player.nick} (${player.points} ЛПР)`);
      }
    }
    
    // Сохраняем достижения
    fs.writeFileSync(achieversPath, JSON.stringify(Array.from(achievers), null, 2), 'utf-8');
    
    console.log(`\n=== РЕЗУЛЬТАТ ===`);
    console.log(`Итого достижений: ${achievers.size} (добавлено новых: ${addedCount})`);
    
    if (achievers.size > 0) {
      console.log('\nСписок достижений:');
      for (const userId of achievers) {
        const userData = users[userId];
        if (userData) {
          console.log(`- ${userData.nick} (ID: ${userId})`);
        } else {
          console.log(`- Неизвестный пользователь (ID: ${userId})`);
        }
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await client.destroy();
  }
}

testAchieversNow();

