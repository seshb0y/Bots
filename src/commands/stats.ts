import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { STATS_CHANNEL_ID } from "../constants";
import { loadPrevAndCurrMembers } from "../utils/clan";
import { normalize } from "../utils/normalize";
import { fetchClanLeaderboardInfo, loadLeaderboardData, compareLeaderboardData } from "../utils/leaderboard";

export async function statsCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  // Получаем информацию о лидерборде
  const currentLeaderboardInfo = await fetchClanLeaderboardInfo("ALLIANCE");
  const previousLeaderboardData = loadLeaderboardData();
  
  const [prev, curr] = loadPrevAndCurrMembers();

  // Сопоставим по нормализованному нику
  const prevMap = new Map<string, { nick: string; points: number }>();
  for (const p of prev) prevMap.set(normalize(p.nick), p);
  const currMap = new Map<string, { nick: string; points: number }>();
  for (const c of curr) currMap.set(normalize(c.nick), c);

  let totalDelta = 0;
  const changes: { nick: string; delta: number }[] = [];

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

  // Отправляем в канал статистики
  const channel = await interaction.client.channels.fetch(STATS_CHANNEL_ID);
  if (channel && channel.isTextBased()) {
    await (channel as TextChannel).send(msg);
    await interaction.editReply("Статистика отправлена в канал.");
  } else {
    await interaction.editReply(
      "Не удалось найти текстовый канал для статистики."
    );
  }
}
