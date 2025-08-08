import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { WTVehiclesAPI } from '../services/wtvehicles';
import { VehicleFormatter } from '../utils/vehicleFormatter';
import { logCommand, error } from '../utils/logger';

export const wtvehicleCommand = {
  data: new SlashCommandBuilder()
    .setName('wtvehicle')
    .setDescription('Получить информацию о технике War Thunder')
    .addStringOption(option =>
      option.setName('название')
        .setDescription('Название техники для поиска')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('оружие')
        .setDescription('Показать информацию о вооружении')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      logCommand('wtvehicle', { 
        userId: interaction.user.id, 
        username: interaction.user.tag,
        query: interaction.options.getString('название'),
        weapons: interaction.options.getBoolean('оружие')
      });

      const vehicleName = interaction.options.getString('название', true);
      const showWeapons = interaction.options.getBoolean('оружие') || false;

      await interaction.deferReply();

      // Поиск техники
      const searchResults = await WTVehiclesAPI.searchVehicles(vehicleName);

      if (searchResults.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Техника не найдена')
          .setDescription(`Не удалось найти технику с названием "${vehicleName}"`)
          .setColor('#ff0000');
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Если найдена одна техника, показываем её детали
      if (searchResults.length === 1) {
        const vehicle = await WTVehiclesAPI.getVehicle(searchResults[0].identifier);
        
        if (showWeapons) {
          const weaponsEmbed = VehicleFormatter.createWeaponsEmbed(vehicle);
          await interaction.editReply({ embeds: [weaponsEmbed] });
        } else {
          const embed = VehicleFormatter.createVehicleEmbed(vehicle);
          
          // Добавляем кнопки для дополнительной информации
          const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`wt_weapons_${vehicle.identifier}`)
                .setLabel('🔫 Вооружение')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`wt_modifications_${vehicle.identifier}`)
                .setLabel('🔧 Модификации')
                .setStyle(ButtonStyle.Secondary)
            );

          await interaction.editReply({ embeds: [embed], components: [row] });
        }
        return;
      }

      // Если найдено несколько техник, показываем список для выбора
      const listEmbed = VehicleFormatter.createVehicleListEmbed(
        searchResults, 
        `🔍 Результаты поиска: "${vehicleName}"`
      );

      // Создаем кнопки для выбора техники (максимум 5)
      const buttons: ButtonBuilder[] = [];
      searchResults.slice(0, 5).forEach((vehicle, index) => {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`wt_select_${vehicle.identifier}`)
            .setLabel(`${index + 1}. ${VehicleFormatter.formatVehicleName(vehicle.identifier)}`)
            .setStyle(ButtonStyle.Primary)
        );
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      const response = await interaction.editReply({ 
        embeds: [listEmbed], 
        components: [row] 
      });

      // Обработчик кнопок
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 минута
      });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({ 
            content: 'Только пользователь, запустивший команду, может использовать эти кнопки.', 
            ephemeral: true 
          });
          return;
        }

        await buttonInteraction.deferUpdate();

        const customId = buttonInteraction.customId;
        
        if (customId.startsWith('wt_select_')) {
          const vehicleId = customId.replace('wt_select_', '');
          const vehicle = await WTVehiclesAPI.getVehicle(vehicleId);
          const embed = VehicleFormatter.createVehicleEmbed(vehicle);
          
          const newRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`wt_weapons_${vehicle.identifier}`)
                .setLabel('🔫 Вооружение')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`wt_modifications_${vehicle.identifier}`)
                .setLabel('🔧 Модификации')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('wt_back')
                .setLabel('⬅️ Назад')
                .setStyle(ButtonStyle.Secondary)
            );

          await buttonInteraction.editReply({ embeds: [embed], components: [newRow] });
        }
        else if (customId.startsWith('wt_weapons_')) {
          const vehicleId = customId.replace('wt_weapons_', '');
          const vehicle = await WTVehiclesAPI.getVehicle(vehicleId);
          const weaponsEmbed = VehicleFormatter.createWeaponsEmbed(vehicle);
          
          const backButton = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`wt_back_to_${vehicleId}`)
                .setLabel('⬅️ Назад к технике')
                .setStyle(ButtonStyle.Secondary)
            );

          await buttonInteraction.editReply({ embeds: [weaponsEmbed], components: [backButton] });
        }
        else if (customId.startsWith('wt_modifications_')) {
          const vehicleId = customId.replace('wt_modifications_', '');
          const vehicle = await WTVehiclesAPI.getVehicle(vehicleId);
          const modificationsEmbed = createModificationsEmbed(vehicle);
          
          const backButton = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`wt_back_to_${vehicleId}`)
                .setLabel('⬅️ Назад к технике')
                .setStyle(ButtonStyle.Secondary)
            );

          await buttonInteraction.editReply({ embeds: [modificationsEmbed], components: [backButton] });
        }
        else if (customId.startsWith('wt_back_to_')) {
          const vehicleId = customId.replace('wt_back_to_', '');
          const vehicle = await WTVehiclesAPI.getVehicle(vehicleId);
          const embed = VehicleFormatter.createVehicleEmbed(vehicle);
          
          const newRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`wt_weapons_${vehicle.identifier}`)
                .setLabel('🔫 Вооружение')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`wt_modifications_${vehicle.identifier}`)
                .setLabel('🔧 Модификации')
                .setStyle(ButtonStyle.Secondary)
            );

          await buttonInteraction.editReply({ embeds: [embed], components: [newRow] });
        }
        else if (customId === 'wt_back') {
          await buttonInteraction.editReply({ embeds: [listEmbed], components: [row] });
        }
      });

      collector.on('end', async () => {
        try {
          // Удаляем кнопки после истечения времени
          await interaction.editReply({ components: [] });
        } catch (err) {
          // Игнорируем ошибки, если сообщение уже удалено
        }
      });

    } catch (err) {
      error('Ошибка в команде wtvehicle:', err);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Ошибка')
        .setDescription('Произошла ошибка при получении информации о технике. Попробуйте позже.')
        .setColor('#ff0000');

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed] });
      }
    }
  },
};

function createModificationsEmbed(vehicle: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🔧 Модификации: ${VehicleFormatter.formatVehicleName(vehicle.identifier)}`)
    .setColor('#9b59b6')
    .setThumbnail(vehicle.images.image);

  if (!vehicle.modifications || vehicle.modifications.length === 0) {
    embed.setDescription('Информация о модификациях недоступна.');
    return embed;
  }

  // Группируем модификации по уровням
  const modsByTier: { [key: number]: any[] } = {};
  vehicle.modifications.forEach((mod: any) => {
    if (!modsByTier[mod.tier]) {
      modsByTier[mod.tier] = [];
    }
    modsByTier[mod.tier].push(mod);
  });

  // Показываем модификации по уровням
  Object.keys(modsByTier).sort((a, b) => parseInt(a) - parseInt(b)).forEach(tier => {
    const tierMods = modsByTier[parseInt(tier)];
    const modsList = tierMods.slice(0, 5).map(mod => {
      const classEmoji = getModificationClassEmoji(mod.mod_class);
      return `${classEmoji} **${mod.name.replace(/_/g, ' ')}** (${formatNumber(mod.value)} 🦁, ${formatNumber(mod.req_exp)} ⭐)`;
    }).join('\n');

    embed.addFields({
      name: `📊 Уровень ${tier} (${tierMods.length} модификаций)`,
      value: modsList || 'Нет модификаций',
      inline: false
    });
  });

  if (vehicle.modifications.length > 20) {
    embed.setFooter({ text: `Показано основные модификации из ${vehicle.modifications.length} доступных` });
  }

  return embed;
}

function getModificationClassEmoji(modClass: string): string {
  const emojis: { [key: string]: string } = {
    'weapon': '🔫',
    'armor': '🛡️',
    'lth': '⚡',
    'seakeeping': '🌊'
  };
  return emojis[modClass] || '🔧';
}

function formatNumber(num: number): string {
  return num.toLocaleString('ru-RU');
} 