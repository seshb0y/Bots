import { Client, TextChannel } from "discord.js";
import {
  OFFICER_ROLE_IDS,
  ANNOUNCE_CHANNEL_ID,
  VOICE_CHANNEL_IDS,
} from "../constants";
import { logPbNotify, info } from "./logger";

let pbAnnounced = false;
let pbOfficer = "";
let pbAnnounceDate = "";

function getNextPbNotifyDelayMs() {
  const now = new Date();
  const mskHour = now.getUTCHours() + 3;
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  // Целевое время: 17:00 (московское время)
  const targetHour = 17;
  const targetMinute = 0;
  
  let target = new Date(now);
  // Устанавливаем московское время
  target.setUTCHours(targetHour - 3, targetMinute, 0, 0);
  
  // Если сегодня 17:00 уже прошло, ждем до завтра
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  const diff = target.getTime() - now.getTime();
  logPbNotify(`Сейчас (МСК): ${mskHour}:${minute < 10 ? "0" + minute : minute}, следующий запуск через ${Math.round(diff / 1000)} сек (${target.toLocaleTimeString("ru-RU", {timeZone: "Europe/Moscow"})})`);
  return diff;
}

export async function askOfficersForPb(client: Client) {
  const now = new Date();
  const mskHour = now.getUTCHours() + 3;
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  logPbNotify(`Проверка времени: ${mskHour}:${minute < 10 ? "0" + minute : minute}:${second < 10 ? "0" + second : second}`);
  
  if (mskHour === 17 && minute === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { pbAnnounced: isPbAnnouncedToday, pbAnnounceDate: announcedDate } = getPbAnnounced();
    if (isPbAnnouncedToday && announcedDate === today) return;

    logPbNotify("Отправка уведомлений офицерам о ПБ");
    
    const guild = client.guilds.cache.first();
    if (!guild) {
      logPbNotify("Не удалось найти гильдию");
      return;
    }

    const officers = guild.members.cache.filter((member) =>
      member.roles.cache.some((role) => OFFICER_ROLE_IDS.includes(role.id))
    );

    logPbNotify(`Найдено офицеров: ${officers.size}`);

    for (const [userId, member] of officers) {
      try {
        const embed = {
          color: 0x2ecc71,
          title: "🚩 Сбор на Полковые Бои",
          description:
            "Привет! Пора собирать команду на Полковые Бои.\n\n" +
            "Нажми кнопку ниже, чтобы объявить сбор в канале.",
          footer: {
            text: "Время: 17:00 МСК",
          },
        };

        const row = {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "Собираю",
              custom_id: "pb_yes",
            },
          ],
        };

        await member.send({
          embeds: [embed],
          components: [row],
        });
        
        logPbNotify(`Уведомление отправлено офицеру: ${member.user.tag}`);
      } catch (error) {
        logPbNotify(`Не удалось отправить уведомление офицеру ${member.user.tag}`, error);
      }
    }
    
    logPbNotify("Уведомления офицерам отправлены");
  } else {
    logPbNotify("Сейчас не время отправки уведомлений офицерам");
  }
}

export async function pbNotifyScheduler(client: Client) {
  const now = new Date();
  const mskHour = now.getUTCHours() + 3;
  if (
    mskHour >= 17 &&
    mskHour < 22
  ) {
    await askOfficersForPb(client);
  }
  
  setTimeout(() => pbNotifyScheduler(client), getNextPbNotifyDelayMs());
}

export async function autoPbAnnounceScheduler(client: Client) {
  const now = new Date();
  const mskHour = now.getUTCHours() + 3;
  if (mskHour >= 17 && mskHour < 22) {
    const guild = client.guilds.cache.first();
    const channelIds = [
      "763085196118851608",
      "885928590720524328",
      "821082995188170783"
    ];
    
    // Проверяем количество людей в каждом канале отдельно
    let totalCount = 0;
    let mainChannelCount = 0; // Количество людей в канале 763085196118851608
    
    for (const id of channelIds) {
      const channel = await guild?.channels.fetch(id);
      if (channel?.isVoiceBased()) {
        const channelCount = Array.from(channel.members.values()).filter(m => !m.user.bot).length;
        totalCount += channelCount;
        
        // Отдельно считаем людей в основном канале
        if (id === "763085196118851608") {
          mainChannelCount = channelCount;
        }
      }
    }
    
    const plus = Math.max(0, 8 - totalCount);
    
    // Отправляем объявление только если в основном канале есть люди И общее количество меньше 8
    if (mainChannelCount > 0 && totalCount < 8) {
      const announceChannel = await client.channels.fetch("763085196118851607");
      if (announceChannel && announceChannel.isTextBased()) {
        await (announceChannel as TextChannel).send(`@everyone +${plus}`);
        logPbNotify(`Автоматическое объявление ПБ: +${plus} (всего в каналах: ${totalCount}, в основном канале: ${mainChannelCount})`);
      }
    } else {
      if (mainChannelCount === 0) {
        logPbNotify(`Автоматическое объявление ПБ пропущено (в основном канале нет людей: ${mainChannelCount})`);
      } else {
        logPbNotify(`Автоматическое объявление ПБ пропущено (достаточно людей: ${totalCount})`);
      }
    }
  }
  setTimeout(() => autoPbAnnounceScheduler(client), 20 * 60 * 1000);
}

export function setPbAnnounced(value: boolean, officer: string, date: string) {
  pbAnnounced = value;
  pbOfficer = officer;
  pbAnnounceDate = date;
  logPbNotify(`ПБ объявлен: ${value}, офицер: ${officer}, дата: ${date}`);
}

export function getPbAnnounced() {
  return { pbAnnounced, pbOfficer, pbAnnounceDate };
}
