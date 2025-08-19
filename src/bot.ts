import {
  Client,
  GatewayIntentBits,
  GuildMember,
  Interaction,
  Message,
  User,
  TextChannel,
  Guild,
} from "discord.js";
import { config } from "dotenv";
import {
  usersPath,
  trackedPath,
  OFFICER_ROLE_IDS,
  ANNOUNCE_CHANNEL_ID,
  VOICE_CHANNEL_IDS,
  STATS_CHANNEL_ID,
} from "./constants";
import { loadJson, saveJson } from "./utils/json";
import { UserData, TrackedPlayer } from "./types";
import { pbNotifyScheduler, autoPbAnnounceScheduler } from "./utils/pbNotify";
import {
  saveMembersAtTime,
  loadMembersAtTime,
  fetchClanPoints,
  saveMembersAlternating,
  saveCurrentMembers,
  loadCurrentMembers,
  compareMembersData,
} from "./utils/clan";
import { markStatsCollectionCompleted, wasStatsCollectionCompleted, getLastCollectionTime } from "./utils/stats-tracking";
import {
  fetchClanLeaderboardInfo,
  saveLeaderboardData,
  loadLeaderboardData,
  compareLeaderboardData,
} from "./utils/leaderboard";
import { normalize } from "./utils/normalize";
import { trackFunctionPerformance } from "./commands/resources";
import { 
  info, 
  warn, 
  error, 
  logVoiceState, 
  logStats, 
  logSyncclan, 
  logQueue, 
  logReward,
  cleanupOldLogs 
} from "./utils/logger";
import * as fs from "fs";
import * as path from "path";

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const voiceCounts = new Map<string, number>();

const QUEUE_NICKNAME_EXCLUDE_IDS = [
  '642764542266310658', // ID владельца сервера
];
// --- Очередь для канала "замена на полковые бои" ---
const QUEUE_CHANNEL_ID = "821082995188170783";
// В памяти: userId -> оригинальный ник
const originalNicknames: Record<string, string> = {};
// Очередь: userId[] — порядок участников
let queueOrder: string[] = [];
const emojiNumbers = [
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
  "🔟",
];

function stripEmojiNumber(nick: string): string {
  return nick.replace(/^(1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣|🔟)\s*/, "").trim();
}

async function updateQueueNicknames(guild: any, members: GuildMember[]) {
  const startTime = Date.now();
  
  for (let i = 0; i < queueOrder.length; i++) {
    const userId = queueOrder[i];
    const member = members.find(m => m.id === userId);
    if (!member) continue;
    const orig = originalNicknames[userId] || stripEmojiNumber(member.nickname || member.user.username);
    originalNicknames[userId] = orig;
    const num = i < emojiNumbers.length ? emojiNumbers[i] : (i+1).toString();
    const newNick = `${num} ${orig}`;
    if (QUEUE_NICKNAME_EXCLUDE_IDS.includes(userId)) {
      // Не меняем ник, но логируем
      logQueue(`(Исключение) Не меняем ник для ${orig} (ID: ${userId}), но учитываем в очереди как номер ${num}`);
      continue;
    }
    if (member.nickname !== newNick) {
      try {
        await member.setNickname(newNick, "Обновление очереди на полковые бои");
      } catch (e) {
        logQueue(`Не удалось изменить ник ${orig}`, e);
      }
    }
    logQueue(`${num} ${orig} (ID: ${member.id})`);
  }
  // Итоговый порядок очереди
  logQueue("Итоговый порядок очереди:");
  for (let i = 0; i < queueOrder.length; i++) {
    const userId = queueOrder[i];
    const member = members.find((m) => m.id === userId);
    if (!member) continue;
    const orig = originalNicknames[userId];
    const num = i < emojiNumbers.length ? emojiNumbers[i] : (i + 1).toString();
    logQueue(`${num} ${orig} (ID: ${member.id})`);
  }
  
  trackFunctionPerformance('updateQueueNicknames', startTime);
}

async function removeQueueNumber(member: GuildMember | null) {
  if (!member) return;
  const orig =
    originalNicknames[member.id] ||
    stripEmojiNumber(member.nickname || member.user.username);
  if (member.nickname !== orig) {
    try {
      await member.setNickname(orig, "Выход из очереди на полковые бои");
    } catch (e) {
      logQueue(`Не удалось вернуть ник ${orig}`, e);
    }
  }
  delete originalNicknames[member.id];
}

let lastQueueIds: string[] = [];

client.on("voiceStateUpdate", async (oldState, newState) => {
  const startTime = Date.now();
  
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;
  const guild = oldState.guild || newState.guild;
  // Работаем только с очередным каналом
  if (oldChannelId === QUEUE_CHANNEL_ID || newChannelId === QUEUE_CHANNEL_ID) {
    // Получаем актуальных участников канала
    const channel = await guild.channels.fetch(QUEUE_CHANNEL_ID);
    const members =
      channel && channel.isVoiceBased()
        ? Array.from(channel.members.values())
            .map((m) => m as GuildMember)
            .filter((m) => !m.user.bot)
        : [];
    const currentIds = members.map((m) => m.id);

    // Проверяем, изменился ли состав очереди
    const changed =
      currentIds.length !== lastQueueIds.length ||
      currentIds.some((id, i) => id !== lastQueueIds[i]);

    if (!changed) {
      // Состав не изменился — не обновляем никнеймы
      trackFunctionPerformance('voiceStateUpdate_skipped', startTime);
      return;
    }

    // Если канал пуст — сбрасываем очередь
    if (members.length === 0) {
      // Если кто-то только что вышел — вернуть ему ник
      if (
        oldChannelId === QUEUE_CHANNEL_ID &&
        newChannelId !== QUEUE_CHANNEL_ID &&
        oldState.member
      ) {
        await removeQueueNumber(oldState.member);
      }
      queueOrder = [];
      for (const id of Object.keys(originalNicknames))
        delete originalNicknames[id];
      logQueue("Очередь сброшена (канал пуст)");
      trackFunctionPerformance('voiceStateUpdate_empty', startTime);
      return;
    }
    // Удаляем из очереди тех, кого нет в канале
    queueOrder = queueOrder.filter((id) => currentIds.includes(id));
    // Добавляем новых в конец очереди
    for (const m of members) {
      if (!queueOrder.includes(m.id)) {
        queueOrder.push(m.id);
        // Сохраняем оригинальный ник без emoji-номера
        originalNicknames[m.id] = stripEmojiNumber(
          m.nickname || m.user.username
        );
      }
    }
    // Если кто-то вышел — снимаем номер
    if (
      oldChannelId === QUEUE_CHANNEL_ID &&
      newChannelId !== QUEUE_CHANNEL_ID &&
      oldState.member
    ) {
      await removeQueueNumber(oldState.member);
    }
    await updateQueueNicknames(guild, members);
    lastQueueIds = [...currentIds];
  }
  // ... существующая логика обновления voiceCounts ...
  for (const channelId of [oldChannelId, newChannelId]) {
    if (!channelId) continue;
    try {
      const channel = await guild.channels.fetch(channelId);
      if (channel?.isVoiceBased()) {
        const realCount = Array.from(channel.members.values()).filter(
          (m) => !m.user.bot
        ).length;
        const prev = voiceCounts.get(channelId);
        voiceCounts.set(channelId, realCount);
        if (prev !== realCount) {
          logVoiceState(`Канал "${channel.name}" обновлён: было ${prev ?? "?"}, стало ${realCount}`);
        }
      }
    } catch (err) {
      error(`Не удалось обновить канал ${channelId}`, err);
    }
  }
  
  trackFunctionPerformance('voiceStateUpdate', startTime);
});

function getNextStatsDelayMs() {
  // Используем московское время (UTC+3)
  const now = new Date();
  const mskHour = (now.getUTCHours() + 3) % 24;
  const minute = now.getMinutes();
  
  // Целевые времена: 16:50 и 01:20 (московское время)
  const targets = [
    { h: 16, m: 50 },
    { h: 1, m: 20 },
  ];
  
  let minDiff = Infinity;
  let next = null;
  
  for (const t of targets) {
    // Создаем целевое время для сегодня в московском времени
    const today = new Date();
    today.setUTCHours(t.h - 3, t.m, 0, 0);
    
    let target = today;
    
    // Если время уже прошло сегодня, переносим на завтра
    if (today <= now) {
      target = new Date(today);
      target.setDate(target.getDate() + 1);
    }
    
    const diff = target.getTime() - now.getTime();
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      next = target;
    }
  }
  
  // Если не нашли подходящее время, ждем минимум 30 секунд
  if (minDiff === Infinity || minDiff <= 0) {
    minDiff = 30000; // Минимум 30 секунд
  }
  
  logStats(`Сейчас (МСК): ${mskHour}:${minute < 10 ? "0" + minute : minute}, следующий запуск через ${Math.round(minDiff / 1000)} сек (${next?.toLocaleTimeString("ru-RU", {timeZone: "Europe/Moscow"})})`);
  return minDiff;
}

const SERVICE_ROLES = [
  "949669576935874570",
  "949669770377179196",
  "949669851440496761",
];
const HONOR_ROLE = "1217444648591687700";

const ACHIEVERS_PATH = path.join(__dirname, "..", "data", "season_achievers.json");

function loadAchievers(): Set<string> {
  if (!fs.existsSync(ACHIEVERS_PATH)) return new Set();
  try {
    const arr = JSON.parse(fs.readFileSync(ACHIEVERS_PATH, "utf-8"));
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveAchievers(set: Set<string>) {
  fs.writeFileSync(ACHIEVERS_PATH, JSON.stringify(Array.from(set), null, 2), "utf-8");
}

function clearAchievers() {
  fs.writeFileSync(ACHIEVERS_PATH, "[]", "utf-8");
}

async function updateAchievers(client: Client, users: Record<string, UserData>, members: { nick: string; points: number }[]) {
  const achievers = loadAchievers();
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
  
  // Сопоставим ник -> userId из users.json
  const nickToUserId = new Map<string, string>();
  for (const [uid, data] of Object.entries(users)) {
    if (data.nick) {
      nickToUserId.set(normalize(data.nick), uid);
    }
  }
  
  // Сопоставим ник -> userId из tracked.json (если нет в users.json)
  for (const [nick, data] of Object.entries(tracked)) {
    if (!nickToUserId.has(normalize(nick))) {
      // Ищем пользователя в Discord сервере по никнейму
      const guild = client.guilds.cache.first();
      if (guild) {
        try {
          // Ищем по точному никнейму
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
              logStats(`Найден Discord ID для ${nick}: ${userId}`);
            }
          }
        } catch (e) {
          // Игнорируем ошибки поиска
        }
      }
    }
  }
  
  let addedCount = 0;
  for (const m of members) {
    if (m.points >= 1600) {
      const userId = nickToUserId.get(normalize(m.nick));
      if (userId) {
        const wasAdded = achievers.has(userId);
        achievers.add(userId);
        if (!wasAdded) {
          addedCount++;
          logStats(`Добавлено достижение для ${m.nick} (${m.points} ЛПР)`);
        }
      } else {
        logStats(`Не удалось найти userId для ${m.nick} (${m.points} ЛПР) - игрок не в Discord сервере`);
      }
    }
  }
  
  saveAchievers(achievers);
  logStats(`Обновлены достижения: ${achievers.size} игроков с 1600+ ЛПР (добавлено новых: ${addedCount})`);
}

async function handleSeasonEndRewards(guild: Guild, users: Record<string, UserData>) {
  const achievers = loadAchievers();
  logReward(`Начало выдачи наград за сезон. Достигших 1600+ ЛПР: ${achievers.size}`);
  
  for (const userId of achievers) {
    try {
      const member = await guild.members.fetch(userId);
      if (!member) continue;
      // Сколько уже ролей "За безупречную службу"
      const hasRoles = SERVICE_ROLES.filter(rid => member.roles.cache.has(rid));
      // Если есть все 3 — снять их и выдать Орден
      if (hasRoles.length === 3) {
        await member.roles.remove(SERVICE_ROLES, "Замена на Орден Почётного Воина");
        await member.roles.add(HONOR_ROLE, "Выдан Орден Почётного Воина за 3 службы");
        logReward(`${member.user.tag}: сняты все службы, выдан Орден Почётного Воина`);
      } else if (hasRoles.length < 3) {
        // Выдать одну из недостающих ролей
        const toGive = SERVICE_ROLES.find(rid => !member.roles.cache.has(rid));
        if (toGive) {
          await member.roles.add(toGive, "Выдана роль За безупречную службу за 1600+ ЛПР");
          logReward(`${member.user.tag}: выдана служба (${toGive})`);
        }
      }
    } catch (e) {
      logReward(`Не удалось обработать ${userId}`, e);
    }
  }
  clearAchievers();
  logReward("Награды за сезон выданы, файл достижений очищен");
}

// Функция для полной синхронизации клана
async function performFullClanSync(client: Client) {
  logSyncclan("Начало полной синхронизации клана ALLIANCE");
  
  try {
    const users = loadJson<Record<string, UserData>>(usersPath);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
    const members = await fetchClanPoints("ALLIANCE");

    // 1. Загрузить предыдущие данные участников и найти покинувших
    const previousMembers = loadCurrentMembers();
    
    // Если файл пустой, это первая синхронизация
    if (previousMembers.length === 0) {
      logSyncclan("Первая синхронизация клана - инициализация данных");
    } else {
      // Находим покинувших игроков
      const currentNicks = new Set(members.map(m => normalize(m.nick)));
      const leavers = previousMembers.filter(m => !currentNicks.has(normalize(m.nick)));
      
      logSyncclan(`Предыдущих участников: ${previousMembers.length}`);
      logSyncclan(`Текущих участников: ${members.length}`);
      logSyncclan(`Покинувших игроков: ${leavers.length}`);
      
      if (leavers.length > 0) {
        const channel = await client.channels.fetch("882263905009807390");
        const date = new Date().toLocaleDateString("ru-RU");
        for (const leaver of leavers) {
          const msg = `${leaver.nick} покинул полк ${date} с ${leaver.points} лпр`;
          if (channel && channel.isTextBased()) {
            await (channel as TextChannel).send(msg);
          }
        }
        logSyncclan(`Отправлено уведомлений о покинувших: ${leavers.length}`);
      }
    }

    // 3. Синхронизация ролей и данных
    const guild = client.guilds.cache.first();
    if (guild) {
      let syncCount = 0;
      
      for (const member of members) {
        const normalizedNick = normalize(member.nick);
        
        // Найти пользователя в базе данных
        let userId = null;
        for (const [id, userData] of Object.entries(users)) {
          if (userData.nick && normalize(userData.nick) === normalizedNick) {
            userId = id;
            break;
          }
        }
        
        if (userId) {
          // Обновить данные пользователя
          users[userId].points = member.points;
         
          // Обновить роли
          try {
            const guildMember = await guild.members.fetch(userId);
            if (guildMember) {
              const hasServiceRole = SERVICE_ROLES.some(roleId => 
                guildMember.roles.cache.has(roleId)
              );
              
              if (member.points >= 1600 && !guildMember.roles.cache.has(HONOR_ROLE)) {
                await guildMember.roles.add(HONOR_ROLE);
                logSyncclan(`Добавлена роль почета для ${member.nick} (${member.points} очков)`);
              } else if (member.points < 1600 && guildMember.roles.cache.has(HONOR_ROLE) && !hasServiceRole) {
                await guildMember.roles.remove(HONOR_ROLE);
                logSyncclan(`Убрана роль почета у ${member.nick} (${member.points} очков)`);
              }
            }
          } catch (error) {
            logSyncclan(`Ошибка при обновлении ролей для ${member.nick}: ${error}`);
          }
          
          syncCount++;
        } else {
          // Добавить в отслеживаемых
          if (!tracked[normalizedNick]) {
            tracked[normalizedNick] = {
              trackedSince: new Date().toISOString(),
              assignedBy: "system",
              warnedAfter7d: false,
              warnedAfter14d: false,
              lastPoints: member.points
            };
            logSyncclan(`Добавлен в отслеживание: ${member.nick} (${member.points} очков)`);
          } else {
            tracked[normalizedNick].lastPoints = member.points;
          }
        }
      }
      
      // Сохранить обновленные данные
      saveJson(usersPath, users);
      saveJson(trackedPath, tracked);
      
      logSyncclan(`Синхронизация завершена: обновлено ${syncCount} участников, отслеживается ${Object.keys(tracked).length} игроков`);
    }

    // 4. Сохранить новые данные в основной файл
    saveCurrentMembers(members);
    logSyncclan("Данные сохранены в основной файл участников");

  } catch (error: any) {
    logSyncclan(`Ошибка при полной синхронизации клана: ${error.message}`);
  }
}

async function statsScheduler(client: Client) {
  const startTime = Date.now();
  
  // Используем московское время (UTC+3)
  const now = new Date();
  const mskHour = (now.getUTCHours() + 3) % 24;
  const minute = now.getMinutes();
  logStats(`Проверка времени: ${mskHour}:${minute < 10 ? "0" + minute : minute}`);
  
  // Проверяем, не пропустили ли мы время сбора статистики 01:20
  const shouldCollectMissedStats = (mskHour > 1 || (mskHour === 1 && minute > 20)) && 
                                   (mskHour < 16 || (mskHour === 16 && minute < 50));
  
  if (shouldCollectMissedStats) {
    // Проверяем, был ли уже сбор статистики 01:20 сегодня
    const today = new Date().toISOString().slice(0, 10);
    const wasAlreadyCollected = wasStatsCollectionCompleted(today, "01:20", "stats");
    
    if (!wasAlreadyCollected) {
      logStats("Обнаружено пропущенное время сбора статистики 01:20, выполняем сбор сейчас");
      
      try {
        const members = await fetchClanPoints("ALLIANCE");
        
        // Получаем предыдущие данные из основного файла
        const prev = loadCurrentMembers();
        
        // Получаем текущую информацию о лидерборде
        logStats("Получение текущей информации о лидерборде...");
        let currentLeaderboardInfo = null;
        try {
          currentLeaderboardInfo = await fetchClanLeaderboardInfo("ALLIANCE");
          if (currentLeaderboardInfo) {
            logStats(`Получена информация о лидерборде: место ${currentLeaderboardInfo.position}, очки ${currentLeaderboardInfo.points}`);
          } else {
            logStats("Полк ALLIANCE не найден в лидерборде");
          }
        } catch (error) {
          logStats(`Ошибка при получении информации о лидерборде: ${error}`);
        }
        const previousLeaderboardData = loadLeaderboardData();
        
        // Сравнить и отправить статистику
        const { totalDelta, changes } = compareMembersData(prev, members);
        
        let msg = `📊 **Статистика за сутки (пропущенный сбор):**\n`;
        
        // Добавляем информацию о лидерборде
        if (currentLeaderboardInfo && previousLeaderboardData) {
          const comparison = compareLeaderboardData(currentLeaderboardInfo, previousLeaderboardData);
          
          msg += `🏆 **Место в лидерборде:** ${currentLeaderboardInfo.position}\n`;
          
          if (comparison.positionDirection === "up") {
            msg += `📈 Поднялись на ${comparison.positionChange} мест\n`;
          } else if (comparison.positionDirection === "down") {
            msg += `📉 Опустились на ${comparison.positionChange} мест\n`;
          } else {
            msg += `➡️ Место не изменилось\n`;
          }
          
          msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points.toLocaleString()}\n`;
          
          if (comparison.pointsDirection === "up") {
            msg += `📈 Получили ${comparison.pointsChange.toLocaleString()} очков\n`;
          } else if (comparison.pointsDirection === "down") {
            msg += `📉 Потеряли ${comparison.pointsChange.toLocaleString()} очков\n`;
          } else {
            msg += `➡️ Очки не изменились\n`;
          }
          
          msg += `\n`;
        } else if (currentLeaderboardInfo) {
          msg += `🏆 **Место в лидерборде:** ${currentLeaderboardInfo.position}\n`;
          msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points.toLocaleString()}\n\n`;
        }
        
        if (changes.length > 0) {
          msg += `\nИзменения по игрокам:\n`;
          for (const { nick, delta } of changes.sort((a, b) => b.delta - a.delta)) {
            msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
          }
        } else {
          msg += `\nЗа сутки не было изменений очков ни у одного игрока.\n`;
        }
        
        const channel = await client.channels.fetch(STATS_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
          await (channel as TextChannel).send(msg);
          logStats("Статистика отправлена в канал (пропущенный сбор)");
        }
        
        // Сохраняем новые данные в основной файл
        saveCurrentMembers(members);
        logStats("Обновлен основной файл участников новыми данными (пропущенный сбор)");
        
        // Проверка конца сезона: все points = 0
        if (members.every(p => p.points === 0)) {
          logStats("Обнаружен конец сезона (все очки = 0), запуск выдачи наград");
          const users = loadJson<Record<string, UserData>>(usersPath);
          const guild = client.guilds.cache.first();
          if (guild) {
            await handleSeasonEndRewards(guild, users);
          }
        }
        
        // Отмечаем, что сбор статистики 01:20 выполнен
        markStatsCollectionCompleted("01:20", "stats");
        logStats("Сбор статистики 01:20 отмечен как выполненный");
        
      } catch (error: any) {
        logStats(`❌ Ошибка при пропущенном сборе статистики: ${error.message}`);
        
        // Отправляем уведомление об ошибке в канал статистики
        try {
          const channel = await client.channels.fetch(STATS_CHANNEL_ID);
          if (channel && channel.isTextBased()) {
            await (channel as TextChannel).send(`⚠️ **Ошибка пропущенного сбора статистики:** ${error.message}\n\nПопробуйте запустить команду /syncclan вручную.`);
          }
        } catch (channelError) {
          logStats(`Не удалось отправить уведомление об ошибке: ${channelError}`);
        }
      }
    }
  } else if (mskHour === 16 && minute === 50) {
    logStats("Полная синхронизация клана и сбор статистики (16:50)");
    
    // Выполняем полную синхронизацию клана
    await performFullClanSync(client);
    
    // Получаем информацию о месте полка в лидерборде
    logStats("Получение информации о месте полка в лидерборде...");
    const leaderboardInfo = await fetchClanLeaderboardInfo("ALLIANCE");
    if (leaderboardInfo) {
      const today = new Date().toISOString().slice(0, 10);
      saveLeaderboardData({
        date: today,
        position: leaderboardInfo.position,
        points: leaderboardInfo.points
      });
      logStats(`Сохранена информация о лидерборде: место ${leaderboardInfo.position}, очки ${leaderboardInfo.points}`);
    } else {
      logStats("Не удалось получить информацию о лидерборде");
    }
    
    // Обновляем достижения
    const members = loadCurrentMembers();
    const users = loadJson<Record<string, UserData>>(usersPath);
    await updateAchievers(client, users, members);
    
    // Отмечаем, что синхронизация 16:50 выполнена
    markStatsCollectionCompleted("16:50", "sync");
    logStats("Синхронизация 16:50 отмечена как выполненная");
  } else if (mskHour === 1 && minute === 20) {
    logStats("Сбор состояния участников и отправка статистики (01:20)");
    
    try {
      const members = await fetchClanPoints("ALLIANCE");
      
      // Получаем предыдущие данные из основного файла
      const prev = loadCurrentMembers();
      
      // Получаем текущую информацию о лидерборде
      logStats("Получение текущей информации о лидерборде...");
      let currentLeaderboardInfo = null;
      try {
        currentLeaderboardInfo = await fetchClanLeaderboardInfo("ALLIANCE");
        if (currentLeaderboardInfo) {
          logStats(`Получена информация о лидерборде: место ${currentLeaderboardInfo.position}, очки ${currentLeaderboardInfo.points}`);
        } else {
          logStats("Полк ALLIANCE не найден в лидерборде");
        }
      } catch (error) {
        logStats(`Ошибка при получении информации о лидерборде: ${error}`);
      }
      const previousLeaderboardData = loadLeaderboardData();
      
      // Сравнить и отправить статистику
      const { totalDelta, changes } = compareMembersData(prev, members);
      
      let msg = `\uD83D\uDCCA **Статистика за сутки:**\n`;
      
      // Добавляем информацию о лидерборде
      if (currentLeaderboardInfo && previousLeaderboardData) {
        const comparison = compareLeaderboardData(currentLeaderboardInfo, previousLeaderboardData);
        
        msg += `🏆 **Место в лидерборде:** ${currentLeaderboardInfo.position}\n`;
        
        if (comparison.positionDirection === "up") {
          msg += `📈 Поднялись на ${comparison.positionChange} мест\n`;
        } else if (comparison.positionDirection === "down") {
          msg += `📉 Опустились на ${comparison.positionChange} мест\n`;
        } else {
          msg += `➡️ Место не изменилось\n`;
        }
        
        msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points.toLocaleString()}\n`;
        
        if (comparison.pointsDirection === "up") {
          msg += `📈 Получили ${comparison.pointsChange.toLocaleString()} очков\n`;
        } else if (comparison.pointsDirection === "down") {
          msg += `📉 Потеряли ${comparison.pointsChange.toLocaleString()} очков\n`;
        } else {
          msg += `➡️ Очки не изменились\n`;
        }
        
        msg += `\n`;
      } else if (currentLeaderboardInfo) {
        msg += `🏆 **Место в лидерборде:** ${currentLeaderboardInfo.position}\n`;
        msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points.toLocaleString()}\n\n`;
      }
      
      msg += `Полк всего: ${totalDelta >= 0 ? "+" : ""}${totalDelta} очков\n`;
      
      if (changes.length > 0) {
        msg += `\nИзменения по игрокам:\n`;
        for (const { nick, delta } of changes.sort((a, b) => b.delta - a.delta)) {
          msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
        }
      } else {
        msg += `\nЗа сутки не было изменений очков ни у одного игрока.\n`;
      }
      
      const channel = await client.channels.fetch(STATS_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(msg);
        logStats("Статистика отправлена в канал");
      }
      
      // Сохраняем новые данные в основной файл
      saveCurrentMembers(members);
      logStats("Обновлен основной файл участников новыми данными");
      
      // Проверка конца сезона: все points = 0
      if (members.every(p => p.points === 0)) {
        logStats("Обнаружен конец сезона (все очки = 0), запуск выдачи наград");
        const users = loadJson<Record<string, UserData>>(usersPath);
        const guild = client.guilds.cache.first();
        if (guild) {
          await handleSeasonEndRewards(guild, users);
        }
      }
      
      // Отмечаем, что сбор статистики 01:20 выполнен
      markStatsCollectionCompleted("01:20", "stats");
      logStats("Сбор статистики 01:20 отмечен как выполненный");
    } catch (error: any) {
      logStats(`❌ Ошибка при сборе статистики: ${error.message}`);
      
      // Отправляем уведомление об ошибке в канал статистики
      try {
        const channel = await client.channels.fetch(STATS_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
          await (channel as TextChannel).send(`⚠️ **Ошибка сбора статистики:** ${error.message}\n\nПопробуйте запустить команду /syncclan вручную.`);
        }
      } catch (channelError) {
        logStats(`Не удалось отправить уведомление об ошибке: ${channelError}`);
      }
    }
  } else {
    logStats("Сейчас не время сбора статистики");
  }
  
  trackFunctionPerformance('statsScheduler', startTime);
  const delay = Math.max(getNextStatsDelayMs(), 30000); // Минимум 30 секунд между проверками
  setTimeout(() => statsScheduler(client), delay);
}

function getNextSyncclanDelayMs() {
  const now = new Date();
  const mskHour = (now.getUTCHours() + 3) % 24;
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  // Целевое время: 16:50 (московское время)
  const targetHour = 16;
  const targetMinute = 50;
  
  // Создаем целевое время для сегодня в московском времени
  const today = new Date();
  today.setUTCHours(targetHour - 3, targetMinute, 0, 0);
  
  // Создаем целевое время для завтра в московском времени
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Выбираем ближайшее время (сегодня или завтра)
  let target = today;
  if (today <= now) {
    target = tomorrow;
  }
  
  const diff = target.getTime() - now.getTime();
  
  // Убеждаемся, что задержка не отрицательная
  const finalDiff = Math.max(diff, 30000); // Минимум 30 секунд
  
  logSyncclan(`Сейчас (МСК): ${mskHour}:${minute < 10 ? "0" + minute : minute}, следующий запуск через ${Math.round(finalDiff / 1000)} сек (${target.toLocaleTimeString("ru-RU", {timeZone: "Europe/Moscow"})})`);
  return finalDiff;
}

async function syncclanScheduler(client: Client) {
  const startTime = Date.now();
  
  const now = new Date();
  const mskHour = (now.getUTCHours() + 3) % 24;
  const minute = now.getMinutes();
  
  logSyncclan(`Проверка времени: ${mskHour}:${minute < 10 ? "0" + minute : minute}`);
  
  // Проверяем, не пропустили ли мы время синхронизации 16:50
  const shouldSyncMissed = (mskHour > 16 || (mskHour === 16 && minute > 50));
  
  if (shouldSyncMissed) {
    // Проверяем, была ли уже синхронизация 16:50 сегодня
    const today = new Date().toISOString().slice(0, 10);
    const wasAlreadySynced = wasStatsCollectionCompleted(today, "16:50", "sync");
    
    if (!wasAlreadySynced) {
      logSyncclan("Обнаружено пропущенное время синхронизации 16:50, выполняем синхронизацию сейчас");
      
      try {
        // Выполняем полную синхронизацию используя ту же функцию
        await performFullClanSync(client);
        
        // Отмечаем, что синхронизация 16:50 выполнена
        markStatsCollectionCompleted("16:50", "sync");
        logSyncclan("Синхронизация 16:50 отмечена как выполненная");
      } catch (error) {
        logSyncclan(`Ошибка при проверке пропущенной синхронизации: ${error}`);
      }
    }
  } else {
    logSyncclan("Сейчас не время синхронизации клана");
  }
  
  trackFunctionPerformance('syncclanScheduler', startTime);
  const delay = Math.max(getNextSyncclanDelayMs(), 30000); // Минимум 30 секунд между проверками
  setTimeout(() => syncclanScheduler(client), delay);
}

client.once("ready", async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  info(`Бот запущен. Пользователь: ${client.user?.tag}`);

  for (const channelId of VOICE_CHANNEL_IDS) {
    const channel = await guild.channels.fetch(channelId);
    if (channel?.isVoiceBased()) {
      const realCount = Array.from(channel.members.values()).filter(
        (m) => !m.user.bot
      ).length;
      voiceCounts.set(channelId, realCount);

      logVoiceState(`Канал "${channel.name}" загружен: ${realCount} человек(а)`);
    }
  }

  info("Бот готов, голосовые каналы загружены");
  
  // Очистка старых логов при запуске
  cleanupOldLogs();
  
  pbNotifyScheduler(client);
  autoPbAnnounceScheduler(client);
  statsScheduler(client);
  syncclanScheduler(client);
});

client.on("guildMemberAdd", (member: GuildMember) => {
  const users = loadJson<Record<string, UserData>>(usersPath);

  if (!users[member.id]) {
    users[member.id] = {
      joinDate: new Date().toISOString(),
      points: 0,
      wasWarned: false,
      nick: member.user.username,
    };
    saveJson(usersPath, users);
    info(`Зарегистрирован новый участник: ${member.user.tag}`);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  error("Необработанное отклонение промиса", { reason, promise });
});

process.on("uncaughtException", (err) => {
  error("Необработанное исключение", err);
});

export { client, voiceCounts };
