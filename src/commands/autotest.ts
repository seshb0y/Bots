import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { autoTestService } from "../tests/autoTestService";
import { logCommand, info } from "../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("autotest")
  .setDescription("Управление автоматическим тестированием бота")
  .addSubcommand(subcommand =>
    subcommand
      .setName("status")
      .setDescription("Показать статус автоматического тестирования")
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName("run")
      .setDescription("Принудительно запустить тесты")
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName("start")
      .setDescription("Запустить сервис автоматического тестирования")
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName("stop")
      .setDescription("Остановить сервис автоматического тестирования")
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName("history")
      .setDescription("Показать историю тестов")
      .addIntegerOption(option =>
        option
          .setName("limit")
          .setDescription("Количество последних записей (по умолчанию 10)")
          .setMinValue(1)
          .setMaxValue(50)
      )
  );

export async function autotestCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const subcommand = interaction.options.getSubcommand();
  
  logCommand(`autotest ${subcommand}`, {
    userId: interaction.user.id,
    username: interaction.user.tag
  });

  try {
    switch (subcommand) {
      case "status":
        await handleStatus(interaction);
        break;
      case "run":
        await handleRun(interaction);
        break;
      case "start":
        await handleStart(interaction);
        break;
      case "stop":
        await handleStop(interaction);
        break;
      case "history":
        await handleHistory(interaction);
        break;
      default:
        await interaction.editReply("❌ Неизвестная подкоманда");
    }
  } catch (error) {
    info(`❌ Ошибка в команде autotest: ${error}`);
    await interaction.editReply("❌ Произошла ошибка при выполнении команды");
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  const stats = autoTestService.getStats();
  
  const embed = new EmbedBuilder()
    .setTitle("🔍 Статус автоматического тестирования")
    .setColor(0x0099ff)
    .addFields(
      {
        name: "📊 Статистика",
        value: `**Запущено тестов:** ${stats.testCount}\n**Статус:** ${stats.isRunning ? '🔄 Выполняется' : '⏸️ Ожидает'}\n**Время работы:** ${formatUptime(stats.uptime)}`,
        inline: false
      },
      {
        name: "⏰ Последний тест",
        value: stats.lastTestTime ? `<t:${Math.floor(stats.lastTestTime.getTime() / 1000)}:R>` : "Никогда",
        inline: false
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleRun(interaction: ChatInputCommandInteraction) {
  await interaction.editReply("🧪 Запуск тестов...");
  
  try {
    const results = await autoTestService.forceRunTests('manual-command');
    
    const embed = new EmbedBuilder()
      .setTitle("🧪 Результаты тестирования")
      .setColor(results.success ? 0x00ff00 : 0xff0000)
      .addFields(
        {
          name: "📊 Общая статистика",
          value: `**Пройдено:** ${results.passed}/${results.total}\n**Статус:** ${results.success ? '✅ Успешно' : '❌ Ошибки'}`,
          inline: false
        }
      )
      .setTimestamp();

    // Добавляем результаты по каждому набору тестов
    for (const [suiteName, suiteResult] of Object.entries(results.suiteResults)) {
      const status = suiteResult.passed === suiteResult.total ? '✅' : '❌';
      embed.addFields({
        name: `${status} ${suiteName}`,
        value: `${suiteResult.passed}/${suiteResult.total} тестов`,
        inline: true
      });
    }

    // Если есть ошибки, добавляем их (ограничиваем количество)
    if (results.errors.length > 0) {
      const errorText = results.errors.slice(0, 5).join('\n');
      const moreErrors = results.errors.length > 5 ? `\n... и еще ${results.errors.length - 5} ошибок` : '';
      
      embed.addFields({
        name: "❌ Ошибки",
        value: `\`\`\`${errorText}${moreErrors}\`\`\``,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    await interaction.editReply(`❌ Ошибка при выполнении тестов: ${error}`);
  }
}

async function handleStart(interaction: ChatInputCommandInteraction) {
  try {
    await autoTestService.start();
    await interaction.editReply("✅ Сервис автоматического тестирования запущен");
  } catch (error) {
    await interaction.editReply(`❌ Ошибка при запуске сервиса: ${error}`);
  }
}

async function handleStop(interaction: ChatInputCommandInteraction) {
  try {
    autoTestService.stop();
    await interaction.editReply("🛑 Сервис автоматического тестирования остановлен");
  } catch (error) {
    await interaction.editReply(`❌ Ошибка при остановке сервиса: ${error}`);
  }
}

async function handleHistory(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 10;
  
  try {
    const historyFile = require('path').join(__dirname, '..', '..', '..', 'data', 'test_history.json');
    const fs = require('fs');
    
    if (!fs.existsSync(historyFile)) {
      await interaction.editReply("📝 История тестов пуста");
      return;
    }

    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    const recentHistory = history.slice(-limit).reverse();

    if (recentHistory.length === 0) {
      await interaction.editReply("📝 История тестов пуста");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📝 История тестов (последние ${recentHistory.length})`)
      .setColor(0x0099ff)
      .setTimestamp();

    for (const entry of recentHistory) {
      const status = entry.success ? '✅' : '❌';
      const reason = entry.reason || 'unknown';
      const changedFile = entry.changedFile ? `\n📁 ${entry.changedFile}` : '';
      
      embed.addFields({
        name: `${status} ${new Date(entry.timestamp).toLocaleString('ru-RU')}`,
        value: `**Причина:** ${reason}${changedFile}\n**Результат:** ${entry.passed}/${entry.total} (${entry.duration}ms)`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    await interaction.editReply(`❌ Ошибка при загрузке истории: ${error}`);
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}д ${hours % 24}ч ${minutes % 60}м`;
  } else if (hours > 0) {
    return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
  } else if (minutes > 0) {
    return `${minutes}м ${seconds % 60}с`;
  } else {
    return `${seconds}с`;
  }
}
