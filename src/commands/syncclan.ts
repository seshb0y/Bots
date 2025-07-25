import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { loadJson, saveJson } from "../utils/json";
import { usersPath, trackedPath } from "../constants";
import { UserData, TrackedPlayer } from "../types";
import {
  fetchClanPoints,
  saveMembersAlternating,
  loadPrevAndCurrMembers,
  findLeavers,
} from "../utils/clan";
import { normalize } from "../utils/normalize";

const LEAVE_CHANNEL_ID = "882263905009807390";

export async function syncclanCommand(
  interaction: ChatInputCommandInteraction
) {
  await interaction.deferReply({ ephemeral: true });
  const clanTag = interaction.options.getString("clan", true);
  const users = loadJson<Record<string, UserData>>(usersPath);
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);
  const members = await fetchClanPoints(clanTag);

  // 1. Загрузить prev и curr до сохранения новых данных
  const [prevMembers, currMembers] = loadPrevAndCurrMembers();

  // Логирование для отладки
  console.log('[SYNC] prevMembers:', prevMembers.map(m => m.nick));
  console.log('[SYNC] currMembers:', currMembers.map(m => m.nick));

  // 2. Сравнить
  const leavers = findLeavers(prevMembers, currMembers);
  console.log('[SYNC] leavers:', leavers.map(m => m.nick));
  if (leavers.length > 0) {
    const channel = await interaction.client.channels.fetch(LEAVE_CHANNEL_ID);
    const date = new Date().toLocaleDateString("ru-RU");
    for (const leaver of leavers) {
      const msg = `${leaver.nick} покинул полк ${date} с ${leaver.points} лпр`;
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(msg);
      }
    }
  }

  // 3. Сохранить новые данные в следующий файл
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

  await interaction.editReply(
    `✅ Синхронизировано ${count} участников по клану ${clanTag}.`
  );
}
