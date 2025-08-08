import { ChatInputCommandInteraction } from "discord.js";

export async function helpCommand(interaction: ChatInputCommandInteraction) {
  const helpText = `📋 **Список доступных команд:**\n\n• \`/help\` - Показать этот список\n• \`/points\` - Посмотреть свои очки\n• \`/addtracer <nickname>\` - Добавить игрока в отслеживание\n• \`/removetracer <nickname>\` - Удалить игрока из отслеживания\n• \`/listtraced\` - Список отслеживаемых игроков\n• \`/syncclan <clan>\` - Синхронизировать очки участников по клану\n• \`/stats\` - Показать статистику изменений очков за сутки\n• \`/teststats\` - Тестовая команда для проверки статистики с лидербордом`;
  await interaction.reply(helpText);
}
