// index.ts
import { Client, GatewayIntentBits, GuildMember, Interaction, Message, User } from 'discord.js';
import * as cheerio from 'cheerio';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

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

const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const trackedPath = path.join(__dirname, '..', 'data', 'tracked.json');

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) return {} as T;
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function saveJson(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '');
}

async function fetchClanPoints(clanTag: string): Promise<{ nick: string; points: number }[]> {
  const url = `https://warthunder.com/ru/community/claninfo/${encodeURIComponent(clanTag)}`;
  console.log(`🌐 Загружаем страницу клана: ${clanTag}`);
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
    }
  });
  console.log(`📄 Длина HTML: ${html.length}`);

  const $ = cheerio.load(html);
  const members: { nick: string; points: number }[] = [];
  const items = $('.squadrons-members__grid-item');

  for (let i = 0; i < items.length; i += 6) {
    const nick = $(items[i + 1]).text().trim();
    const pointsText = $(items[i + 2]).text().trim().replace(/\s/g, '');
    const points = parseInt(pointsText, 10);

    if (nick && !isNaN(points)) {
      console.log(`🔍 Найден игрок: ${nick} — ${points} очков`);
      members.push({ nick, points });
    }
  }

  return members;
}

client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user?.tag}`);
});

client.on('guildMemberAdd', (member: GuildMember) => {
  const users = loadJson<Record<string, UserData>>(usersPath);

  if (!users[member.id]) {
    users[member.id] = {
      joinDate: new Date().toISOString(),
      points: 0,
      wasWarned: false,
      nick: member.user.username
    };
    saveJson(usersPath, users);
    console.log(`✅ Зарегистрирован новый участник: ${member.user.tag}`);
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    return interaction.reply('🏓 Pong!');
  }

  if (commandName === 'help') {
    const helpText = `📋 **Список доступных команд:**

• \`/help\` - Показать этот список
• \`/addtracer <nickname>\` - Добавить игрока в отслеживание
• \`/removetracer <nickname>\` - Удалить игрока из отслеживания
• \`/listtraced\` - Список отслеживаемых игроков
• \`/syncclan <clan>\` - Синхронизировать очки участников по клану`;

    return interaction.reply(helpText);
  }

  if (commandName === 'points') {
    const users = loadJson<Record<string, UserData>>(usersPath);
    const userId = interaction.user.id;
    const points = users[userId]?.points ?? 0;
    return interaction.reply(`У тебя ${points} полковых очков.`);
  }

  if (commandName === 'addtracer') {
    const nick = interaction.options.getString('nickname', true);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);

    if (tracked[nick]) {
      return interaction.reply(`⚠️ Игрок ${nick} уже отслеживается.`);
    }

    tracked[nick] = {
      trackedSince: new Date().toISOString(),
      assignedBy: interaction.user.id,
      warnedAfter7d: false,
      warnedAfter14d: false,
      lastPoints: 0
    };

    saveJson(trackedPath, tracked);
    return interaction.reply(`🔍 Начато отслеживание игрока ${nick}`);
  }

  if (commandName === 'removetracer') {
    const nick = interaction.options.getString('nickname', true);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);

    const trackedKey = Object.keys(tracked).find(t => normalize(t) === normalize(nick));
    if (!trackedKey) {
      return interaction.reply(`❌ Игрок ${nick} не найден в списке отслеживаемых.`);
    }

    delete tracked[trackedKey];
    saveJson(trackedPath, tracked);
    return interaction.reply(`✅ Игрок ${trackedKey} удалён из отслеживания.`);
  }

  if (commandName === 'listtraced') {
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
    if (Object.keys(tracked).length === 0) {
      return interaction.reply('📭 Сейчас никто не отслеживается.');
    }

    let reply = `📋 **Список отслеживаемых игроков:**\n`;
    for (const [nick, data] of Object.entries(tracked)) {
      const days = Math.floor((Date.now() - new Date(data.trackedSince).getTime()) / (1000 * 60 * 60 * 24));
      reply += `• **${nick}** — ${data.lastPoints} очков, отслеживается ${days} дн.\n`;
    }

    return interaction.reply(reply);
  }

  if (commandName === 'syncclan') {
    const clanTag = interaction.options.getString('clan', true);
    const users = loadJson<Record<string, UserData>>(usersPath);
    const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
    const members = await fetchClanPoints(clanTag);

    let count = 0;
    for (const m of members) {
      const uid = Object.keys(users).find(id => normalize(users[id].nick ?? '') === normalize(m.nick));
      if (uid) {
        users[uid].points = m.points;
        count++;
      }
      const trackedKey = Object.keys(tracked).find(t => normalize(t) === normalize(m.nick));
      if (trackedKey) {
        tracked[trackedKey].lastPoints = m.points;
        count++;
      }
    }

    saveJson(usersPath, users);
    saveJson(trackedPath, tracked);

    return interaction.reply(`✅ Синхронизировано ${count} участников по клану ${clanTag}.`);
  }
});

setInterval(async () => {
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
  const members = await fetchClanPoints('ALLIANCE');
  const now = Date.now();
  let updated = false;

  for (const [nick, data] of Object.entries(tracked)) {
    const found = members.find(m => normalize(m.nick) === normalize(nick));
    const added = new Date(data.trackedSince).getTime();
    const days = Math.floor((now - added) / (1000 * 60 * 60 * 24));

    if (found) {
      const points = found.points;
      const user = await client.users.fetch(data.assignedBy);
      data.lastPoints = points;

      if (points >= 700) {
        // Игрок набрал 700 очков, удаляем его из отслеживания
        if (data.warnedAfter7d || data.warnedAfter14d) {
          await user.send(`🎉 Игrok ${nick} набрал ${points} очков и удалён из отслеживания.`);
        }
        delete tracked[nick];
        updated = true;
      } else {
        // Логика для игроков с менее чем 700 очками
        if (days >= 7 && points < 700 && !data.warnedAfter7d) {
          await user.send(`⚠️ Игрок ${nick} имеет менее 700 очков спустя 7 дней.`);
          data.warnedAfter7d = true;
        }

        if (days >= 14 && points < 700 && !data.warnedAfter14d) {
          await user.send(`⛔ 14 дней прошло, игрок ${nick} всё ещё не набрал 700 очков. Пора кикать.`);
          data.warnedAfter14d = true;
        }
      }
    }

    if (days >= 21) {
      const user = await client.users.fetch(data.assignedBy);
      await user.send(`🗑️ Игрок ${nick} удалён из отслеживания — прошло более 3 недель.`);
      delete tracked[nick];
      updated = true;
    }
  }

  if (updated) {
    saveJson(trackedPath, tracked);
  }
}, 1000 * 60 * 60 * 24);

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing in .env');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
