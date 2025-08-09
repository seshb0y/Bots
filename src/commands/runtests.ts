import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { runAllTests } from '../tests/testRunner';
import { logCommand, info } from '../utils/logger';

export async function runtestsCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  logCommand("Запуск ручного тестирования", {
    userId: interaction.user.id,
    username: interaction.user.tag
  });
  
  try {
    info("🧪 Запуск ручного тестирования по команде пользователя");
    
    const testResults = await runAllTests();
    
    // Создаем детальный отчет
    const embed = new EmbedBuilder()
      .setTitle("🧪 Результаты тестирования бота")
      .setColor(testResults.success ? 0x00ff00 : 0xff0000)
      .addFields(
        {
          name: "📊 Общая статистика",
          value: `**Пройдено:** ${testResults.passed}/${testResults.total}\n**Статус:** ${testResults.success ? '✅ Успешно' : '❌ Ошибки'}`,
          inline: false
        }
      )
      .setTimestamp();
    
    // Добавляем результаты по каждому набору тестов
    for (const [suiteName, suiteResult] of Object.entries(testResults.suiteResults)) {
      const status = suiteResult.passed === suiteResult.total ? '✅' : '❌';
      embed.addFields({
        name: `${status} ${suiteName}`,
        value: `${suiteResult.passed}/${suiteResult.total} тестов`,
        inline: true
      });
    }
    
    // Если есть ошибки, добавляем их
    if (testResults.errors.length > 0) {
      const errorText = testResults.errors.slice(0, 5).join('\n'); // Показываем первые 5 ошибок
      embed.addFields({
        name: "❌ Ошибки",
        value: errorText.length > 1000 ? errorText.substring(0, 1000) + '...' : errorText,
        inline: false
      });
      
      if (testResults.errors.length > 5) {
        embed.addFields({
          name: "ℹ️ Дополнительно",
          value: `И еще ${testResults.errors.length - 5} ошибок...`,
          inline: false
        });
      }
    }
    
    await interaction.editReply({ embeds: [embed] });
    
    logCommand(`Ручное тестирование завершено: ${testResults.passed}/${testResults.total} тестов пройдено`, {
      userId: interaction.user.id,
      username: interaction.user.tag,
      success: testResults.success
    });
    
  } catch (error) {
    logCommand("Ошибка при ручном тестировании", error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle("❌ Ошибка тестирования")
      .setDescription("Произошла критическая ошибка при выполнении тестов")
      .setColor(0xff0000)
      .addFields({
        name: "Детали ошибки",
        value: `\`\`\`${String(error).substring(0, 1000)}\`\`\``,
        inline: false
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [errorEmbed] });
  }
} 