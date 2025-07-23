import { Client, TextChannel } from "discord.js";
import {
  OFFICER_ROLE_IDS,
  ANNOUNCE_CHANNEL_ID,
  VOICE_CHANNEL_IDS,
} from "../constants";

let pbAnnounced = false;
let pbOfficer = "";
let pbAnnounceDate = "";

export function getNextPbNotifyDelayMs() {
  const now = new Date();
  // МСК = UTC+3
  const mskNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const hour = mskNow.getHours();
  const minute = mskNow.getMinutes();
  const second = mskNow.getSeconds();
  if (hour < 17) {
    // До 17:00 — ждем до 17:00
    const next17 = new Date(mskNow);
    next17.setHours(17, 0, 0, 0);
    return next17.getTime() - mskNow.getTime();
  } else if (hour >= 17 && hour < 22) {
    // После 17:00 и до 22:00 — ждем до следующего часа
    return ((60 - minute) * 60 - second) * 1000;
  } else {
    // После 22:00 — ждем до 17:00 следующего дня
    const next17 = new Date(mskNow);
    next17.setDate(next17.getDate() + 1);
    next17.setHours(17, 0, 0, 0);
    return next17.getTime() - mskNow.getTime();
  }
}

export async function pbNotifyScheduler(client: Client) {
  const now = new Date();
  const mskNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const hour = mskNow.getHours();
  if (
    hour >= 17 &&
    hour <= 22 &&
    (!pbAnnounced || pbAnnounceDate !== mskNow.toISOString().slice(0, 10))
  ) {
    await askOfficersForPb(client);
  }
  setTimeout(() => pbNotifyScheduler(client), getNextPbNotifyDelayMs());
}

export async function askOfficersForPb(client: Client) {
  // Проверяем, был ли уже объявлен сбор сегодня
  const today = new Date().toISOString().slice(0, 10);
  // Проверка времени по Москве (UTC+3)
  const now = new Date();
  const mskHour = now.getUTCHours() + 3;
  if (mskHour < 17 || mskHour > 22) return;
  if (pbAnnounced && pbAnnounceDate === today) return;

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

export function setPbAnnounced(value: boolean, officer: string, date: string) {
  pbAnnounced = value;
  pbOfficer = officer;
  pbAnnounceDate = date;
}

export function getPbAnnounced() {
  return { pbAnnounced, pbOfficer, pbAnnounceDate };
}
