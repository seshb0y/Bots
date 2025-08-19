import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logCommand, error } from "../utils/logger";

interface ThunderSkillStats {
  stats: {
    nick: string;
    rank: string;
    last_stat: string;
    r: {
      kpd: number | null;
      win: number | null;
      mission: number | null;
      death: number | null;
      winrate: number | null;
      kb: number | null;
      kb_air: number | null;
      kb_ground: number | null;
      kd: number | null;
      kd_air: number | null;
      kd_ground: number | null;
      lifetime: number | null;
    };
  };
}

// Функция для безопасного форматирования чисел
function safeToFixed(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toFixed(decimals);
}

// Функция для безопасного отображения чисел
function safeNumber(value: number | null): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toString();
}

export async function lichstatCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });

  try {
    const nickname = interaction.options.getString("nickname", true);
    
    logCommand(`Запрос статистики для игрока: ${nickname}`, {
      userId: interaction.user.id,
      username: interaction.user.tag,
      nickname
    });

    // URL-кодируем никнейм для безопасного использования в URL
    const encodedNickname = encodeURIComponent(nickname);
    const jsonUrl = `https://thunderskill.com/ru/stat/${encodedNickname}/export/json`;
    
    console.log(`Запрос JSON: ${jsonUrl}`);

    // Пытаемся получить JSON напрямую
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      await interaction.editReply(`❌ Не удалось найти игрока **${nickname}** на сайте thunderskill.com`);
      return;
    }

    const statsData: ThunderSkillStats = await response.json();
    
    if (!statsData.stats) {
      await interaction.editReply(`❌ Некорректные данные статистики для игрока **${nickname}**`);
      return;
    }

    const stats = statsData.stats;
    const rbStats = stats.r;

    // Создаем embed с статистикой
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📊 Статистика игрока ${stats.nick}`)
      .setDescription(`**${stats.rank}**`)
      .addFields(
        { 
          name: "🎯 КПД (Эффективность)", 
          value: `${safeToFixed(rbStats.kpd)}%`, 
          inline: true 
        },
        { 
          name: "🏆 Процент побед", 
          value: `${safeToFixed(rbStats.winrate)}%`, 
          inline: true 
        },
        { 
          name: "⚔️ Боев", 
          value: safeNumber(rbStats.mission), 
          inline: true 
        },
        { 
          name: "💀 Смертей", 
          value: safeNumber(rbStats.death), 
          inline: true 
        },
        { 
          name: "🎖️ Побед", 
          value: safeNumber(rbStats.win), 
          inline: true 
        },
        { 
          name: "⏱️ Время жизни", 
          value: rbStats.lifetime ? `${rbStats.lifetime} мин` : "N/A", 
          inline: true 
        },
        { 
          name: "🔫 K/D (Убийства/Смерти)", 
          value: safeToFixed(rbStats.kd), 
          inline: true 
        },
        { 
          name: "✈️ K/D воздушные", 
          value: safeToFixed(rbStats.kd_air), 
          inline: true 
        },
        { 
          name: "🛡️ K/D наземные", 
          value: safeToFixed(rbStats.kd_ground), 
          inline: true 
        },
        { 
          name: "💥 K/B (Убийства/Бой)", 
          value: safeToFixed(rbStats.kb), 
          inline: true 
        },
        { 
          name: "✈️ K/B воздушные", 
          value: safeToFixed(rbStats.kb_air), 
          inline: true 
        },
        { 
          name: "🛡️ K/B наземные", 
          value: safeToFixed(rbStats.kb_ground), 
          inline: true 
        }
      )
      .setFooter({ 
        text: `Последнее обновление: ${stats.last_stat} • Данные с thunderskill.com` 
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logCommand(`Статистика успешно отправлена для игрока: ${nickname}`, {
      userId: interaction.user.id,
      username: interaction.user.tag,
      nickname
    });

  } catch (err: any) {
    error("Ошибка при получении статистики игрока", err);
    await interaction.editReply("❌ Произошла ошибка при получении статистики. Попробуйте позже.");
  }
} 