import { Client } from "discord.js";
import { loadJson, saveJson } from "./json";
import { fetchClanPoints } from "./clan";
import { normalize } from "./normalize";
import { trackedPath } from "../constants";
import { TrackedPlayer } from "../types";

export async function checkTrackedPlayers(
  client: Client,
  OFFICER_ROLE_IDS: string[]
): Promise<number> {
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
  const members = await fetchClanPoints("ALLIANCE");
  const now = Date.now();
  let updated = false;
  let warns = 0;

  for (const [nick, data] of Object.entries(tracked)) {
    const found = members.find((m) => normalize(m.nick) === normalize(nick));
    const added = new Date(data.trackedSince).getTime();
    const days = Math.floor((now - added) / (1000 * 60 * 60 * 24));

    if (found) {
      const points = found.points;
      const user = await client.users.fetch(data.assignedBy);
      data.lastPoints = points;

      if (points >= 700) {
        if (data.warnedAfter7d || data.warnedAfter14d) {
          await user.send(
            `🎉 Игрок ${nick} набрал ${points} очков и удалён из отслеживания.`
          );
        }
        delete tracked[nick];
        updated = true;
      } else {
        if (days >= 7 && points < 700 && !data.warnedAfter7d) {
          await user.send(
            `⚠️ Игрок ${nick} имеет менее 700 очков спустя 7 дней.`
          );
          data.warnedAfter7d = true;
          const guild = client.guilds.cache.first();
          if (guild) {
            const officerMembers = guild.members.cache.filter((member) =>
              member.roles.cache.some((role) =>
                OFFICER_ROLE_IDS.includes(role.id)
              )
            );
            for (const officer of officerMembers.values()) {
              try {
                await officer.send(
                  `⚠️ Участник <@${user.id}> (ник: ${nick}) имеет менее 700 очков спустя ${days} дней!`
                );
                warns++;
              } catch (e) {
                console.log(
                  `Не удалось отправить ЛС офицеру ${officer.user.tag}`
                );
              }
            }
          }
        }

        if (days >= 14 && points < 700 && !data.warnedAfter14d) {
          await user.send(
            `⛔ 14 дней прошло, игрок ${nick} всё ещё не набрал 700 очков. Пора кикать.`
          );
          data.warnedAfter14d = true;
          const guild = client.guilds.cache.first();
          if (guild) {
            const officerMembers = guild.members.cache.filter((member) =>
              member.roles.cache.some((role) =>
                OFFICER_ROLE_IDS.includes(role.id)
              )
            );
            for (const officer of officerMembers.values()) {
              try {
                await officer.send(
                  `⚠️ Участник <@${user.id}> (ник: ${nick}) имеет менее 700 очков спустя ${days} дней!`
                );
                warns++;
              } catch (e) {
                console.log(
                  `Не удалось отправить ЛС офицеру ${officer.user.tag}`
                );
              }
            }
          }
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
  return warns;
}
