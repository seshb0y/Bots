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

client.on("voiceStateUpdate", async (oldState, newState) => {
  const updatedChannels = new Set<string>();
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (oldChannelId) updatedChannels.add(oldChannelId);
  if (newChannelId) updatedChannels.add(newChannelId);

  const guild = oldState.guild || newState.guild;

  for (const channelId of updatedChannels) {
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
  // МСК = UTC+3
  const now = new Date();
  const mskNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const hour = mskNow.getHours();
  const minute = mskNow.getMinutes();
  // Целевые времена: 16:50 и 01:20
  const targets = [
    { h: 16, m: 50 },
    { h: 1, m: 20 },
  ];
  let minDiff = Infinity;
  let next = null;
  for (const t of targets) {
    let target = new Date(mskNow);
    target.setHours(t.h, t.m, 0, 0);
    if (target <= mskNow) target.setDate(target.getDate() + 1);
    const diff = target.getTime() - mskNow.getTime();
    if (diff < minDiff) {
      minDiff = diff;
      next = target;
    }
  }
  console.log(
    `[STATS] Сейчас (МСК): ${mskNow.toLocaleTimeString(
      "ru-RU"
    )}, следующий запуск через ${Math.round(
      minDiff / 1000
    )} сек (${next?.toLocaleTimeString("ru-RU")})`
  );
  return minDiff;
}

async function statsScheduler(client: Client) {
  // МСК = UTC+3
  const now = new Date();
  const mskNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const hour = mskNow.getHours();
  const minute = mskNow.getMinutes();
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
