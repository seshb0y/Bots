import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder 
} from 'discord.js';
import { WTVehiclesAPI } from '../services/wtvehicles';
import { VehicleFormatter } from '../utils/vehicleFormatter';
import { logCommand, error } from '../utils/logger';

export const wtcompareCommand = {
  data: new SlashCommandBuilder()
    .setName('wtcompare')
    .setDescription('Сравнить две единицы техники War Thunder')
    .addStringOption(option =>
      option.setName('техника1')
        .setDescription('Название первой техники')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('техника2')
        .setDescription('Название второй техники')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      logCommand('wtcompare', { 
        userId: interaction.user.id, 
        username: interaction.user.tag,
        vehicle1: interaction.options.getString('техника1'),
        vehicle2: interaction.options.getString('техника2')
      });

      const vehicle1Name = interaction.options.getString('техника1', true);
      const vehicle2Name = interaction.options.getString('техника2', true);

      await interaction.deferReply();

      // Поиск первой техники
      const search1Results = await WTVehiclesAPI.searchVehicles(vehicle1Name);
      if (search1Results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Первая техника не найдена')
          .setDescription(`Не удалось найти технику с названием "${vehicle1Name}"`)
          .setColor('#ff0000');
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Поиск второй техники
      const search2Results = await WTVehiclesAPI.searchVehicles(vehicle2Name);
      if (search2Results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Вторая техника не найдена')
          .setDescription(`Не удалось найти технику с названием "${vehicle2Name}"`)
          .setColor('#ff0000');
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Если найдено несколько результатов, берем первый (наиболее подходящий)
      const vehicle1Id = search1Results[0].identifier;
      const vehicle2Id = search2Results[0].identifier;

      // Проверяем, что это не одна и та же техника
      if (vehicle1Id === vehicle2Id) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Одинаковая техника')
          .setDescription('Вы указали одну и ту же технику для сравнения.')
          .setColor('#ff0000');
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Получаем сравнение
      const comparison = await WTVehiclesAPI.compareVehicles(vehicle1Id, vehicle2Id);

      // Создаем embed для сравнения
      const embed = VehicleFormatter.createComparisonEmbed(
        comparison.vehicle1,
        comparison.vehicle2,
        comparison.comparison
      );

      // Добавляем дополнительную информацию о найденных техниках
      if (search1Results.length > 1 || search2Results.length > 1) {
        let footer = '';
        if (search1Results.length > 1) {
          footer += `Для "${vehicle1Name}" найдено ${search1Results.length} результатов, выбрана: ${VehicleFormatter.formatVehicleName(vehicle1Id)}. `;
        }
        if (search2Results.length > 1) {
          footer += `Для "${vehicle2Name}" найдено ${search2Results.length} результатов, выбрана: ${VehicleFormatter.formatVehicleName(vehicle2Id)}.`;
        }
        embed.setFooter({ text: footer });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      error('Ошибка в команде wtcompare:', err);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Ошибка')
        .setDescription('Произошла ошибка при сравнении техники. Попробуйте позже.')
        .setColor('#ff0000');

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed] });
      }
    }
  },
}; 