import { ChatInputCommandInteraction } from "discord.js";
import { loadJson, saveJson } from "../utils/json";
import { usersPath, trackedPath } from "../constants";
import { UserData, TrackedPlayer } from "../types";
import { fetchClanPoints } from "../utils/clan";
import { normalize } from "../utils/normalize";

export async function listtracedCommand(
  interaction: ChatInputCommandInteraction
) {
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
    await interaction.reply("📭 Сейчас никто не отслеживается.");
    return;
  }

  let reply = `📋 **Список отслеживаемых игроков:**\n`;
  for (const [nick, data] of Object.entries(tracked)) {
    const days = Math.floor(
      (Date.now() - new Date(data.trackedSince).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    reply += `• **${nick}** — ${data.lastPoints} очков, отслеживается ${days} дн.\n`;
  }

  await interaction.reply(reply);
}
