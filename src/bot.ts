import {
  Client,
  GatewayIntentBits,
  GuildMember,
  Interaction,
  Message,
  User,
  TextChannel,
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
import { UserData } from "./types";
import { pbNotifyScheduler } from "./utils/pbNotify";
import {
  saveMembersAtTime,
  loadMembersAtTime,
  fetchClanPoints,
} from "./utils/clan";
import { normalize } from "./utils/normalize";

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
  for (let i = 0; i < queueOrder.length; i++) {
    const userId = queueOrder[i];
    const member = members.find((m) => m.id === userId);
    if (!member) continue;
    const orig =
      originalNicknames[userId] ||
      stripEmojiNumber(member.nickname || member.user.username);
    originalNicknames[userId] = orig;
    const num = i < emojiNumbers.length ? emojiNumbers[i] : (i + 1).toString();
    const newNick = `${num} ${orig}`;
    if (member.nickname !== newNick) {
      try {
        await member.setNickname(newNick, "Обновление очереди на полковые бои");
      } catch (e) {
        console.log(`[QUEUE] Не удалось изменить ник ${orig}:`, e);
      }
    }
    console.log(`[QUEUE] ${num} ${orig} (ID: ${member.id})`);
  }
  // Итоговый порядок очереди
  console.log("[QUEUE] Итоговый порядок очереди:");
  for (let i = 0; i < queueOrder.length; i++) {
    const userId = queueOrder[i];
    const member = members.find((m) => m.id === userId);
    if (!member) continue;
    const orig = originalNicknames[userId];
    const num = i < emojiNumbers.length ? emojiNumbers[i] : (i + 1).toString();
    console.log(`[QUEUE] ${num} ${orig} (ID: ${member.id})`);
  }
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
      console.log(`[QUEUE] Не удалось вернуть ник ${orig}:`, e);
    }
  }
  delete originalNicknames[member.id];
}

client.on("voiceStateUpdate", async (oldState, newState) => {
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
      console.log("[QUEUE] Очередь сброшена (канал пуст)");
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
          console.log(
            `🔄 Канал "${channel.name}" обновлён: было ${
              prev ?? "?"
            }, стало ${realCount}`
          );
        }
      }
    } catch (err) {
      console.error(`❌ Не удалось обновить канал ${channelId}:`, err);
    }
  }
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
  console.log(
    `[STATS] Сейчас (сервер): ${now.toLocaleTimeString(
      "ru-RU"
    )}, следующий запуск через ${Math.round(
      minDiff / 1000
    )} сек (${next?.toLocaleTimeString("ru-RU")})`
  );
  return minDiff;
}

async function statsScheduler(client: Client) {
  // Используем системное время
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  console.log(
    `[STATS] Проверка времени: ${hour}:${minute < 10 ? "0" + minute : minute}`
  );
  if (hour === 16 && minute === 50) {
    console.log("[STATS] Сбор состояния участников (16:50)");
    const members = await fetchClanPoints("ALLIANCE");
    saveMembersAtTime(members, "1650");
    console.log("[STATS] Сохранено состояние участников (1650)");
  } else if (hour === 1 && minute === 20) {
    console.log(
      "[STATS] Сбор состояния участников и отправка статистики (01:20)"
    );
    const members = await fetchClanPoints("ALLIANCE");
    saveMembersAtTime(members, "0120");
    console.log("[STATS] Сохранено состояние участников (0120)");
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
    if (changes.length > 0) {
      let msg = `\uD83D\uDCCA **Статистика за сутки:**\n`;
      msg += `Полк всего: ${totalDelta >= 0 ? "+" : ""}${totalDelta} очков\n`;
      msg += `\nИзменения по игрокам:\n`;
      for (const { nick, delta } of changes.sort((a, b) => b.delta - a.delta)) {
        msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
      }
      const channel = await client.channels.fetch(STATS_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(msg);
        console.log("[STATS] Статистика отправлена в канал");
      }
    } else {
      console.log("[STATS] Нет изменений для отправки");
    }
  } else {
    console.log("[STATS] Сейчас не время сбора статистики");
  }
  setTimeout(() => statsScheduler(client), getNextStatsDelayMs());
}

client.once("ready", async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  for (const channelId of VOICE_CHANNEL_IDS) {
    const channel = await guild.channels.fetch(channelId);
    if (channel?.isVoiceBased()) {
      const realCount = Array.from(channel.members.values()).filter(
        (m) => !m.user.bot
      ).length;
      voiceCounts.set(channelId, realCount);

      console.log(
        `🔹 Канал "${channel.name}" загружен: ${realCount} человек(а)`
      );
    }
  }

  console.log("✅ Бот готов, голосовые каналы загружены");
  pbNotifyScheduler(client);
  statsScheduler(client);
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
    console.log(`✅ Зарегистрирован новый участник: ${member.user.tag}`);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Необработанное отклонение промиса:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Необработанное исключение:", err);
});

export { client, voiceCounts };
