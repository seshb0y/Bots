import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { STATS_CHANNEL_ID } from "../constants";
import { loadMembersAtTime } from "../utils/clan";
import { normalize } from "../utils/normalize";

console.log("🔍 Загружаю модули в teststats...");
let fetchClanLeaderboardInfo: any, loadLeaderboardData: any, compareLeaderboardData: any;

try {
  const leaderboardModule = require("../utils/leaderboard");
  fetchClanLeaderboardInfo = leaderboardModule.fetchClanLeaderboardInfo;
  loadLeaderboardData = leaderboardModule.loadLeaderboardData;
  compareLeaderboardData = leaderboardModule.compareLeaderboardData;
  console.log("🔍 Модули leaderboard загружены успешно");
} catch (error) {
  console.error("❌ Ошибка при загрузке модулей leaderboard:", error);
}

export async function teststatsCommand(interaction: ChatInputCommandInteraction) {
  console.log("🔍 Команда teststats вызвана");
  await interaction.deferReply({ ephemeral: true });
  console.log("🔍 deferReply выполнен");
  
  try {
    console.log("🔍 Начинаю выполнение команды teststats");
    
    // Получаем информацию о лидерборде
    await interaction.editReply("🔍 Получаю информацию о лидерборде...");
    let currentLeaderboardInfo = null;
    try {
      console.log("🔍 Вызываю fetchClanLeaderboardInfo...");
      currentLeaderboardInfo = await fetchClanLeaderboardInfo("ALLIANCE");
      console.log("🔍 fetchClanLeaderboardInfo завершен:", currentLeaderboardInfo);
    } catch (error) {
      console.error("Ошибка при получении информации о лидерборде:", error);
      await interaction.editReply("⚠️ Ошибка при получении информации о лидерборде. Продолжаю без этих данных...");
    }
    
    console.log("🔍 Загружаю предыдущие данные лидерборда...");
    const previousLeaderboardData = loadLeaderboardData();
    console.log("🔍 Предыдущие данные:", previousLeaderboardData);
    
    await interaction.editReply("📊 Анализирую данные участников...");
    const prev = loadMembersAtTime("1650");
    const curr = loadMembersAtTime("0120");
    
    // Проверяем, есть ли данные для сравнения
    if (prev.length === 0) {
      await interaction.editReply("❌ Нет данных на 16:50 для сравнения. Дождитесь следующего сбора статистики в 16:50.");
      return;
    }
    
    if (curr.length === 0) {
      await interaction.editReply("❌ Нет данных на 01:20 для сравнения. Дождитесь следующего сбора статистики в 01:20.");
      return;
    }

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

    await interaction.editReply("📝 Формирую статистику...");
    
    let msg = `📊 **ТЕСТОВАЯ СТАТИСТИКА ПОЛКА**\n`;
    msg += `🕒 **Время:** ${new Date().toLocaleString("ru-RU")}\n\n`;
    
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
      
      msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points.toLocaleString()}\n`;
      
      if (comparison.pointsDirection === "up") {
        msg += `📈 Получили ${comparison.pointsChange.toLocaleString()} очков\n`;
      } else if (comparison.pointsDirection === "down") {
        msg += `📉 Потеряли ${comparison.pointsChange.toLocaleString()} очков\n`;
      } else {
        msg += `➡️ Очки не изменились\n`;
      }
      
      msg += `\n`;
    } else if (currentLeaderboardInfo) {
      msg += `🏆 **Место в лидерборде:** ${currentLeaderboardInfo.position}\n`;
      msg += `💎 **Очки полка:** ${currentLeaderboardInfo.points.toLocaleString()}\n\n`;
    } else {
      msg += `❌ Не удалось получить информацию о лидерборде\n\n`;
    }
    
    msg += `👥 **Статистика участников:**\n`;
    msg += `Полк всего: ${totalDelta >= 0 ? "+" : ""}${totalDelta} очков\n`;
    
    if (changes.length > 0) {
      msg += `\n📋 **Изменения по игрокам:**\n`;
      for (const { nick, delta } of changes.sort((a, b) => b.delta - a.delta)) {
        msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
      }
    } else {
      msg += `\n✅ За сутки не было изменений очков ни у одного игрока.\n`;
    }

    // Отправляем в канал статистики
    const channel = await interaction.client.channels.fetch(STATS_CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      await (channel as TextChannel).send(msg);
      await interaction.editReply("✅ Тестовая статистика отправлена в канал!");
    } else {
      await interaction.editReply("❌ Не удалось найти текстовый канал для статистики.");
    }
    
  } catch (error) {
    console.error("Ошибка при выполнении команды teststats:", error);
    await interaction.editReply("❌ Произошла ошибка при выполнении команды!");
  }
} 