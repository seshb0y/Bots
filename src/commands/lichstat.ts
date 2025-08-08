import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logCommand, error } from "../utils/logger";

interface ThunderSkillStats {
  stats: {
    nick: string;
    rank: string;
    last_stat: string;
    r: {
      kpd: number;
      win: number;
      mission: number;
      death: number;
      winrate: number;
      kb: number;
      kb_air: number;
      kb_ground: number;
      kd: number;
      kd_air: number;
      kd_ground: number;
      lifetime: number;
    };
  };
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
          value: `${rbStats.kpd.toFixed(2)}%`, 
          inline: true 
        },
        { 
          name: "🏆 Процент побед", 
          value: `${rbStats.winrate.toFixed(2)}%`, 
          inline: true 
        },
        { 
          name: "⚔️ Боев", 
          value: `${rbStats.mission}`, 
          inline: true 
        },
        { 
          name: "💀 Смертей", 
          value: `${rbStats.death}`, 
          inline: true 
        },
        { 
          name: "🎖️ Побед", 
          value: `${rbStats.win}`, 
          inline: true 
        },
        { 
          name: "⏱️ Время жизни", 
          value: `${rbStats.lifetime} мин`, 
          inline: true 
        },
        { 
          name: "🔫 K/D (Убийства/Смерти)", 
          value: `${rbStats.kd.toFixed(2)}`, 
          inline: true 
        },
        { 
          name: "✈️ K/D воздушные", 
          value: `${rbStats.kd_air.toFixed(2)}`, 
          inline: true 
        },
        { 
          name: "🛡️ K/D наземные", 
          value: `${rbStats.kd_ground.toFixed(2)}`, 
          inline: true 
        },
        { 
          name: "💥 K/B (Убийства/Бой)", 
          value: `${rbStats.kb.toFixed(2)}`, 
          inline: true 
        },
        { 
          name: "✈️ K/B воздушные", 
          value: `${rbStats.kb_air.toFixed(2)}`, 
          inline: true 
        },
        { 
          name: "🛡️ K/B наземные", 
          value: `${rbStats.kb_ground.toFixed(2)}`, 
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