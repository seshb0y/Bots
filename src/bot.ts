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
  loadLeaversTracking,
  saveLeaversTracking,
  findLeaversFromTracking,
  saveMembersAlternating,
} from "./utils/clan";
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
  // Используем системное время
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  // Целевые времена: 16:50 и 01:20
  const targets = [
    { h: 16, m: 50 },
    { h: 1, m: 20 },
  ];
  let minDiff = Infinity;
  let next = null;
  for (const t of targets) {
    let target = new Date(now);
    target.setHours(t.h, t.m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const diff = target.getTime() - now.getTime();
    if (diff < minDiff) {
      minDiff = diff;
      next = target;
    }
  }
  logStats(`Сейчас (сервер): ${now.toLocaleTimeString("ru-RU")}, следующий запуск через ${Math.round(minDiff / 1000)} сек (${next?.toLocaleTimeString("ru-RU")})`);
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

async function updateAchievers(users: Record<string, UserData>, members: { nick: string; points: number }[]) {
  const achievers = loadAchievers();
  // Сопоставим ник -> userId
  const nickToUserId = new Map<string, string>();
  for (const [uid, data] of Object.entries(users)) {
    nickToUserId.set(normalize(data.nick), uid);
  }
  for (const m of members) {
    if (m.points >= 1600) {
      const userId = nickToUserId.get(normalize(m.nick));
      if (userId) achievers.add(userId);
    }
  }
  saveAchievers(achievers);
  logStats(`Обновлены достижения: ${achievers.size} игроков с 1600+ ЛПР`);
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

async function statsScheduler(client: Client) {
  const startTime = Date.now();
  
  // Используем системное время
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  logStats(`Проверка времени: ${hour}:${minute < 10 ? "0" + minute : minute}`);
  
  if (hour === 16 && minute === 50) {
    logStats("Сбор состояния участников (16:50)");
    const members = await fetchClanPoints("ALLIANCE");
    saveMembersAtTime(members, "1650");
    logStats("Сохранено состояние участников (1650)");
    
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
    
    const users = loadJson<Record<string, UserData>>(usersPath);
    await updateAchievers(users, members);
  } else if (hour === 1 && minute === 20) {
    logStats("Сбор состояния участников и отправка статистики (01:20)");
    const members = await fetchClanPoints("ALLIANCE");
    saveMembersAtTime(members, "0120");
    logStats("Сохранено состояние участников (0120)");
    
    // Получаем текущую информацию о лидерборде
    logStats("Получение текущей информации о лидерборде...");
    const currentLeaderboardInfo = await fetchClanLeaderboardInfo("ALLIANCE");
    const previousLeaderboardData = loadLeaderboardData();
    
    // Сравнить и отправить статистику
    const prev = loadMembersAtTime("1650");
    const curr = loadMembersAtTime("0120");
    const prevMap = new Map(prev.map((p) => [normalize(p.nick), p]));
    const currMap = new Map(curr.map((c) => [normalize(c.nick), c]));
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
      
      msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points}\n`;
      
      if (comparison.pointsDirection === "up") {
        msg += `📈 Получили ${comparison.pointsChange} очков\n`;
      } else if (comparison.pointsDirection === "down") {
        msg += `📉 Потеряли ${comparison.pointsChange} очков\n`;
      } else {
        msg += `➡️ Очки не изменились\n`;
      }
      
      msg += `\n`;
    } else if (currentLeaderboardInfo) {
      msg += `🏆 **Место в лидерборде:** ${currentLeaderboardInfo.position}\n`;
      msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points}\n\n`;
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
    
    // Проверка конца сезона: все points = 0
    if (curr.every(p => p.points === 0)) {
      logStats("Обнаружен конец сезона (все очки = 0), запуск выдачи наград");
      const users = loadJson<Record<string, UserData>>(usersPath);
      const guild = client.guilds.cache.first();
      if (guild) {
        await handleSeasonEndRewards(guild, users);
      }
    }
  } else {
    logStats("Сейчас не время сбора статистики");
  }
  
  trackFunctionPerformance('statsScheduler', startTime);
  setTimeout(() => statsScheduler(client), getNextStatsDelayMs());
}

function getNextSyncclanDelayMs() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  // Целевое время: 12:00
  const targetHour = 12;
  const targetMinute = 0;
  
  let target = new Date(now);
  target.setHours(targetHour, targetMinute, 0, 0);
  
  // Если сегодня 12:00 уже прошло, ждем до завтра
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  const diff = target.getTime() - now.getTime();
  logSyncclan(`Сейчас: ${now.toLocaleTimeString("ru-RU")}, следующий запуск через ${Math.round(diff / 1000)} сек (${target.toLocaleTimeString("ru-RU")})`);
  return diff;
}

async function syncclanScheduler(client: Client) {
  const startTime = Date.now();
  
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  logSyncclan(`Проверка времени: ${hour}:${minute < 10 ? "0" + minute : minute}`);
  
  if (hour === 12 && minute === 0) {
    logSyncclan("Автоматический запуск синхронизации клана ALLIANCE");
    
    try {
      // Имитируем выполнение команды syncclan ALLIANCE
      const users = loadJson<Record<string, UserData>>(usersPath);
      const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
      const members = await fetchClanPoints("ALLIANCE");

      // 1. Загрузить отслеживаемых участников и найти покинувших
      const trackedMembers = loadLeaversTracking();
      
      // Если файл отслеживания пустой, инициализируем его текущими участниками
      if (trackedMembers.length === 0) {
        logSyncclan("Инициализация файла отслеживания покинувших игроков");
        saveLeaversTracking(members);
        logSyncclan(`Файл отслеживания инициализирован с ${members.length} участниками клана ALLIANCE`);
      } else {
        const leavers = findLeaversFromTracking(members);
        logSyncclan(`trackedMembers: ${trackedMembers.map(m => m.nick)}`);
        logSyncclan(`currentMembers: ${members.map(m => m.nick)}`);
        logSyncclan(`leavers: ${leavers.map(m => m.nick)}`);
        
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

        // 2. Обновить файл отслеживания текущими участниками
        saveLeaversTracking(members);
      }

      // 3. Сохранить новые данные в следующий файл (для статистики)
      saveMembersAlternating(members);

      let count = 0;
      for (const m of members) {
        const uid = Object.keys(users).find(
          (id) => normalize(users[id].nick ?? "") === normalize(m.nick)
        );
        if (uid) {
          users[uid].points = m.points;
          count++;
        }
        const trackedKey = Object.keys(tracked).find(
          (t) => normalize(t) === normalize(m.nick)
        );
        if (trackedKey) {
          tracked[trackedKey].lastPoints = m.points;
          count++;
        }
      }

      saveJson(usersPath, users);
      saveJson(trackedPath, tracked);

      logSyncclan(`Синхронизировано ${count} участников по клану ALLIANCE`);
    } catch (error: any) {
      error("Ошибка при автоматической синхронизации", error);
    }
  } else {
    logSyncclan("Сейчас не время синхронизации клана");
  }
  
  trackFunctionPerformance('syncclanScheduler', startTime);
  setTimeout(() => syncclanScheduler(client), getNextSyncclanDelayMs());
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
