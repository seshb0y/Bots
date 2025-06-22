// index.ts
import {
  Client,
  GatewayIntentBits,
  GuildMember,
  Interaction,
  Message,
  User,
} from "discord.js";
import * as cheerio from "cheerio";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import pidusage from "pidusage";

config();

interface UserData {
  joinDate: string;
  points: number;
  wasWarned: boolean;
  nick: string;
}

interface TrackedPlayer {
  trackedSince: string;
  assignedBy: string;
  warnedAfter7d: boolean;
  warnedAfter14d: boolean;
  lastPoints: number;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const usersPath = path.join(__dirname, "..", "data", "users.json");
const trackedPath = path.join(__dirname, "..", "data", "tracked.json");

const OFFICER_ROLE_IDS = process.env
  .OFFICER_ROLE_ID!.split(",")
  .map((id) => id.trim());
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID!;

const VOICE_CHANNEL_IDS = ["763085196118851608", "885928590720524328"];

let pbAnnounced = false;
let pbOfficer = "";
let pbAnnounceDate = "";
let maxCpu = 0;
let maxMem = 0;

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) return {} as T;
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function saveJson(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "");
}

async function fetchClanPoints(
  clanTag: string
): Promise<{ nick: string; points: number }[]> {
  const url = `https://warthunder.com/ru/community/claninfo/${encodeURIComponent(
    clanTag
  )}`;
  console.log(`🌐 Загружаем страницу клана: ${clanTag}`);
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36",
    },
  });
  console.log(`📄 Длина HTML: ${html.length}`);

  const $ = cheerio.load(html);
  const members: { nick: string; points: number }[] = [];
  const items = $(".squadrons-members__grid-item");

  for (let i = 0; i < items.length; i += 6) {
    const nick = $(items[i + 1])
      .text()
      .trim();
    const pointsText = $(items[i + 2])
      .text()
      .trim()
      .replace(/\s/g, "");
    const points = parseInt(pointsText, 10);

    if (nick && !isNaN(points)) {
      console.log(`🔍 Найден игрок: ${nick} — ${points} очков`);
      members.push({ nick, points });
    }
  }

  return members;
}

client.once("ready", () => {
  console.log(`🤖 Bot is online as ${client.user?.tag}`);
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

client.on("interactionCreate", async (interaction: Interaction) => {
  // Кнопки для сбора ПБ
  if (interaction.isButton()) {
    const today = new Date().toISOString().slice(0, 10);
    if (interaction.customId === "pb_yes") {
      if (!pbAnnounced || pbAnnounceDate !== today) {
        pbAnnounced = true;
        pbAnnounceDate = today;
        pbOfficer = interaction.user.username;
        const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
          await (channel as any).send(
            `@everyone\n🔔 Сбор на полковые бои объявлен!\n🛡️ Ответственный офицер: <@${interaction.user.id}>`
          );
        }
        await interaction.reply({
          content: "Ты назначен ответственным за сбор ПБ!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Сбор уже объявлен другим офицером.",
          ephemeral: true,
        });
      }
    } else if (interaction.customId === "pb_no") {
      await interaction.reply({
        content: "Спасибо за ответ!",
        ephemeral: true,
      });
    }
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "ping") {
    return interaction.reply("🏓 Pong!");
  }

  if (commandName === "help") {
    const helpText = `📋 **Список доступных команд:**

• \`/help\` - Показать этот список
• \`/addtracer <nickname>\` - Добавить игрока в отслеживание
• \`/removetracer <nickname>\` - Удалить игрока из отслеживания
• \`/listtraced\` - Список отслеживаемых игроков
• \`/syncclan <clan>\` - Синхронизировать очки участников по клану`;

    return interaction.reply(helpText);
  }

  if (commandName === "points") {
    const users = loadJson<Record<string, UserData>>(usersPath);
    const userId = interaction.user.id;
    const points = users[userId]?.points ?? 0;
    return interaction.reply(`У тебя ${points} полковых очков.`);
  }

  if (commandName === "addtracer") {
    const nick = interaction.options.getString("nickname", true);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);

    if (tracked[nick]) {
      return interaction.reply(`⚠️ Игрок ${nick} уже отслеживается.`);
    }

    tracked[nick] = {
      trackedSince: new Date().toISOString(),
      assignedBy: interaction.user.id,
      warnedAfter7d: false,
      warnedAfter14d: false,
      lastPoints: 0,
    };

    saveJson(trackedPath, tracked);
    return interaction.reply(`🔍 Начато отслеживание игрока ${nick}`);
  }

  if (commandName === "removetracer") {
    const nick = interaction.options.getString("nickname", true);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);

    const trackedKey = Object.keys(tracked).find(
      (t) => normalize(t) === normalize(nick)
    );
    if (!trackedKey) {
      return interaction.reply(
        `❌ Игрок ${nick} не найден в списке отслеживаемых.`
      );
    }

    delete tracked[trackedKey];
    saveJson(trackedPath, tracked);
    return interaction.reply(`✅ Игрок ${trackedKey} удалён из отслеживания.`);
  }

  if (commandName === "listtraced") {
    // Сначала синхронизируем очки по клану ALLIANCE
    const users = loadJson<Record<string, UserData>>(usersPath);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
    const members = await fetchClanPoints("ALLIANCE");
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
    // Далее — стандартный вывод списка
    if (Object.keys(tracked).length === 0) {
      return interaction.reply("📭 Сейчас никто не отслеживается.");
    }

    let reply = `📋 **Список отслеживаемых игроков:**\n`;
    for (const [nick, data] of Object.entries(tracked)) {
      const days = Math.floor(
        (Date.now() - new Date(data.trackedSince).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      reply += `• **${nick}** — ${data.lastPoints} очков, отслеживается ${days} дн.\n`;
    }

    return interaction.reply(reply);
  }

  if (commandName === "syncclan") {
    const clanTag = interaction.options.getString("clan", true);
    const users = loadJson<Record<string, UserData>>(usersPath);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
    const members = await fetchClanPoints(clanTag);

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

    return interaction.reply(
      `✅ Синхронизировано ${count} участников по клану ${clanTag}.`
    );
  }

  if (commandName === "pbnotify") {
    await interaction.deferReply({ ephemeral: true });
    await askOfficersForPb();
    await interaction.editReply(
      "PB notification sent to all officers (manual test)."
    );
    return;
  }

  if (commandName === "resources") {
    await interaction.deferReply({ ephemeral: true });
    pidusage(process.pid, (err: Error | null, stats: any) => {
      if (err) {
        interaction.editReply("Failed to get resource usage.");
      } else {
        // Обновляем максимальные значения
        if (stats.cpu > maxCpu) maxCpu = stats.cpu;
        if (stats.memory > maxMem) maxMem = stats.memory;
        interaction.editReply(
          `Resource usage:\n` +
            `CPU: ${stats.cpu.toFixed(2)}% (max: ${maxCpu.toFixed(2)}%)\n` +
            `Memory: ${(stats.memory / 1024 / 1024).toFixed(2)} MB (max: ${(
              maxMem /
              1024 /
              1024
            ).toFixed(2)} MB)`
        );
      }
    });
    return;
  }
});

setInterval(async () => {
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
  const members = await fetchClanPoints("ALLIANCE");
  const now = Date.now();
  let updated = false;

  for (const [nick, data] of Object.entries(tracked)) {
    const found = members.find((m) => normalize(m.nick) === normalize(nick));
    const added = new Date(data.trackedSince).getTime();
    const days = Math.floor((now - added) / (1000 * 60 * 60 * 24));

    if (found) {
      const points = found.points;
      const user = await client.users.fetch(data.assignedBy);
      data.lastPoints = points;

      if (points >= 700) {
        // Игрок набрал 700 очков, удаляем его из отслеживания
        if (data.warnedAfter7d || data.warnedAfter14d) {
          await user.send(
            `🎉 Игrok ${nick} набрал ${points} очков и удалён из отслеживания.`
          );
        }
        delete tracked[nick];
        updated = true;
      } else {
        // Логика для игроков с менее чем 700 очками
        if (days >= 7 && points < 700 && !data.warnedAfter7d) {
          await user.send(
            `⚠️ Игрок ${nick} имеет менее 700 очков спустя 7 дней.`
          );
          data.warnedAfter7d = true;
        }

        if (days >= 14 && points < 700 && !data.warnedAfter14d) {
          await user.send(
            `⛔ 14 дней прошло, игрок ${nick} всё ещё не набрал 700 очков. Пора кикать.`
          );
          data.warnedAfter14d = true;
        }
      }
    }

    if (days >= 21) {
      const user = await client.users.fetch(data.assignedBy);
      await user.send(
        `🗑️ Игрок ${nick} удалён из отслеживания — прошло более 3 недель.`
      );
      delete tracked[nick];
      updated = true;
    }
  }

  if (updated) {
    saveJson(trackedPath, tracked);
  }
}, 1000 * 60 * 60 * 24);

function isPbTime() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 17 && hour <= 22;
}

async function askOfficersForPb() {
  // Проверяем, был ли уже объявлен сбор сегодня
  const today = new Date().toISOString().slice(0, 10);
  if (pbAnnounced && pbAnnounceDate === today) return;
  if (!isPbTime()) return;

  const guild = client.guilds.cache.first();
  if (!guild) return;

  // Собираем всех участников с любой из офицерских ролей
  const officerMembers = guild.members.cache.filter((member) =>
    member.roles.cache.some((role) => OFFICER_ROLE_IDS.includes(role.id))
  );

  for (const member of officerMembers.values()) {
    try {
      await member.send({
        content: "Собираешь ПБ сегодня?\n",
        components: [
          {
            type: 1,
            components: [
              { type: 2, label: "Собираю", style: 3, custom_id: "pb_yes" },
            ],
          },
        ],
      });
    } catch (e) {
      console.log(`Не удалось отправить ЛС ${member.user.tag}`);
    }
  }
}

// Запускать каждый час с 17:00 до 22:00
setInterval(() => {
  askOfficersForPb();
}, 1000 * 60 * 60);

// Проверка голосовых каналов каждые 2 минуты
setInterval(async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  for (const channelId of VOICE_CHANNEL_IDS) {
    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.isVoiceBased()) {
      const count = channel.members.size;
      if (count > 0 && count < 8) {
        const need = 8 - count;
        const announceChannel = await client.channels.fetch(
          ANNOUNCE_CHANNEL_ID
        );
        if (announceChannel && announceChannel.isTextBased()) {
          await (announceChannel as any).send(`@everyone +${need}`);
        }
      }
    }
  }
}, 2 * 60 * 1000);

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing in .env");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
