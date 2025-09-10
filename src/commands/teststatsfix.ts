import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { 
  fetchClanPoints, 
  compareMembersData,
  saveCurrentMembers,
  loadCurrentMembers
} from "../utils/clan";
import { logStats } from "../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("teststatsfix")
  .setDescription("Тестирует исправленную логику статистики")
  .addStringOption(option =>
    option.setName("action")
      .setDescription("Действие для тестирования")
      .setRequired(true)
      .addChoices(
        { name: "simulate_1650", value: "simulate_1650" },
        { name: "simulate_0120", value: "simulate_0120" },
        { name: "check_current", value: "check_current" },
        { name: "clear_data", value: "clear_data" }
      )
  );

export async function teststatsfixCommand(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString("action", true);
  
  if (!interaction.memberPermissions?.has("Administrator")) {
    await interaction.reply({ content: "❌ Эта команда доступна только администраторам", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    switch (action) {
      case "simulate_1650":
        await simulate1650(interaction);
        break;
      case "simulate_0120":
        await simulate0120(interaction);
        break;
      case "check_current":
        await checkCurrent(interaction);
        break;
      case "clear_data":
        await clearData(interaction);
        break;
      default:
        await interaction.editReply("❌ Неизвестное действие");
    }
  } catch (error: any) {
    logStats(`Ошибка в teststatsfix: ${error.message}`);
    await interaction.editReply(`❌ Ошибка: ${error.message}`);
  }
}

async function simulate1650(interaction: ChatInputCommandInteraction) {
  logStats("🧪 Тестирование симуляции 16:50");
  
  // Получаем свежие данные
  const members = await fetchClanPoints("ALLIANCE");
  logStats(`Получено ${members.length} участников`);
  
  if (members.length === 0) {
    await interaction.editReply("❌ Не удалось получить данные участников");
    return;
  }
  
  // Сохраняем в members_current.json
  saveCurrentMembers(members);
  logStats("Сохранено в members_current.json");
  
  await interaction.editReply(`✅ Симуляция 16:50 завершена\n📊 Сохранено ${members.length} участников в members_current.json\n🏆 Топ-3: ${members.slice(0, 3).map(m => `${m.nick}: ${m.points}`).join(", ")}`);
}

async function simulate0120(interaction: ChatInputCommandInteraction) {
  logStats("🧪 Тестирование симуляции 01:20");
  
  // Получаем свежие данные
  const members = await fetchClanPoints("ALLIANCE");
  logStats(`Получено ${members.length} участников`);
  
  if (members.length === 0) {
    await interaction.editReply("❌ Не удалось получить данные участников");
    return;
  }
  
  // Загружаем данные из members_current.json
  const prev = loadCurrentMembers();
  logStats(`Загружено ${prev.length} участников из members_current.json`);
  
  if (prev.length === 0) {
    await interaction.editReply("❌ Нет данных в members_current.json для сравнения. Сначала выполните simulate_1650");
    return;
  }
  
  // Сравниваем данные
  const { totalDelta, changes } = compareMembersData(prev, members);
  logStats(`Общий дельта: ${totalDelta}, изменений: ${changes.length}`);
  
  // Обновляем members_current.json
  saveCurrentMembers(members);
  logStats("Обновлен members_current.json");
  
  let msg = `✅ Симуляция 01:20 завершена\n📊 Обработано ${members.length} участников\n📈 Общий дельта: ${totalDelta >= 0 ? "+" : ""}${totalDelta} очков\n\n`;
  
  if (changes.length > 0) {
    msg += `🔄 Изменения по игрокам:\n`;
    for (const { nick, delta } of changes.slice(0, 10).sort((a, b) => b.delta - a.delta)) {
      msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
    }
    if (changes.length > 10) {
      msg += `... и еще ${changes.length - 10} изменений\n`;
    }
  } else {
    msg += `ℹ️ Изменений очков не было\n`;
  }
  
  await interaction.editReply(msg);
}

async function checkCurrent(interaction: ChatInputCommandInteraction) {
  logStats("🧪 Проверка members_current.json");
  
  const membersCurrent = loadCurrentMembers();
  
  let msg = `📁 **Состояние members_current.json:**\n\n`;
  msg += `📊 Участников: ${membersCurrent.length}\n\n`;
  
  if (membersCurrent.length > 0) {
    msg += `🏆 **Топ-5 игроков:**\n`;
    membersCurrent.slice(0, 5).forEach((m, i) => {
      msg += `${i + 1}. ${m.nick}: ${m.points} очков\n`;
    });
    
    const totalPoints = membersCurrent.reduce((sum, m) => sum + m.points, 0);
    const avgPoints = Math.round(totalPoints / membersCurrent.length);
    msg += `\n📈 **Общая статистика:**\n`;
    msg += `• Всего очков: ${totalPoints.toLocaleString()}\n`;
    msg += `• Среднее на игрока: ${avgPoints.toLocaleString()}\n`;
  } else {
    msg += `ℹ️ Файл пуст. Выполните simulate_1650 для заполнения данных.`;
  }
  
  await interaction.editReply(msg);
}

async function clearData(interaction: ChatInputCommandInteraction) {
  logStats("🧪 Очистка тестовых данных");
  
  // Очищаем members_current.json
  saveCurrentMembers([]);
  
  logStats("members_current.json очищен");
  await interaction.editReply("✅ members_current.json очищен");
}
