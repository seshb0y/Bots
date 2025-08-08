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

export const wtlistCommand = {
  data: new SlashCommandBuilder()
    .setName('wtlist')
    .setDescription('Получить список техники War Thunder с фильтрами')
    .addStringOption(option =>
      option.setName('страна')
        .setDescription('Страна техники')
        .setRequired(false)
        .addChoices(
          { name: '🇺🇸 США', value: 'usa' },
          { name: '🇩🇪 Германия', value: 'germany' },
          { name: '🇷🇺 СССР', value: 'ussr' },
          { name: '🇬🇧 Британия', value: 'britain' },
          { name: '🇯🇵 Япония', value: 'japan' },
          { name: '🇨🇳 Китай', value: 'china' },
          { name: '🇮🇹 Италия', value: 'italy' },
          { name: '🇫🇷 Франция', value: 'france' },
          { name: '🇸🇪 Швеция', value: 'sweden' },
          { name: '🇮🇱 Израиль', value: 'israel' }
        )
    )
    .addStringOption(option =>
      option.setName('тип')
        .setDescription('Тип техники')
        .setRequired(false)
        .addChoices(
          { name: '✈️ Истребитель', value: 'fighter' },
          { name: '🚀 Штурмовик', value: 'attacker' },
          { name: '💣 Бомбардировщик', value: 'bomber' },
          { name: '🚗 Танк', value: 'tank' },
          { name: '🎯 ЗСУ', value: 'spaa' },
          { name: '💥 ПТ-САУ', value: 'tank_destroyer' },
          { name: '🏃 Легкий танк', value: 'light_tank' },
          { name: '⚖️ Средний танк', value: 'medium_tank' },
          { name: '🛡️ Тяжелый танк', value: 'heavy_tank' },
          { name: '🚢 Корабль', value: 'ship' },
          { name: '⛵ Катер', value: 'boat' },
          { name: '🚁 Вертолет', value: 'helicopter' }
        )
    )
    .addIntegerOption(option =>
      option.setName('эра')
        .setDescription('Эра техники (1-8)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(8)
    )
    .addNumberOption(option =>
      option.setName('бр_мин')
        .setDescription('Минимальный боевой рейтинг')
        .setRequired(false)
        .setMinValue(1.0)
        .setMaxValue(13.7)
    )
    .addNumberOption(option =>
      option.setName('бр_макс')
        .setDescription('Максимальный боевой рейтинг')
        .setRequired(false)
        .setMinValue(1.0)
        .setMaxValue(13.7)
    )
    .addBooleanOption(option =>
      option.setName('премиум')
        .setDescription('Только премиумная техника')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('пак')
        .setDescription('Только пакетная техника')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('эскадрон')
        .setDescription('Только эскадронная техника')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      logCommand('wtlist', { 
        userId: interaction.user.id, 
        username: interaction.user.tag,
        filters: {
          country: interaction.options.getString('страна'),
          type: interaction.options.getString('тип'),
          era: interaction.options.getInteger('эра'),
          br_min: interaction.options.getNumber('бр_мин'),
          br_max: interaction.options.getNumber('бр_макс'),
          premium: interaction.options.getBoolean('премиум'),
          pack: interaction.options.getBoolean('пак'),
          squadron: interaction.options.getBoolean('эскадрон')
        }
      });

      await interaction.deferReply();

      // Собираем фильтры
      const filters: any = {};
      
      const country = interaction.options.getString('страна');
      if (country) filters.country = country;
      
      const vehicleType = interaction.options.getString('тип');
      if (vehicleType) filters.vehicle_type = vehicleType;
      
      const era = interaction.options.getInteger('эра');
      if (era) filters.era = era;
      
      const brMin = interaction.options.getNumber('бр_мин');
      if (brMin) filters.br_min = brMin;
      
      const brMax = interaction.options.getNumber('бр_макс');
      if (brMax) filters.br_max = brMax;
      
      const isPremium = interaction.options.getBoolean('премиум');
      if (isPremium !== null) filters.is_premium = isPremium;
      
      const isPack = interaction.options.getBoolean('пак');
      if (isPack !== null) filters.is_pack = isPack;
      
      const isSquadron = interaction.options.getBoolean('эскадрон');
      if (isSquadron !== null) filters.squadron_vehicle = isSquadron;

      // Проверяем валидность диапазона BR
      if (brMin && brMax && brMin > brMax) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Неверный диапазон BR')
          .setDescription('Минимальный боевой рейтинг не может быть больше максимального.')
          .setColor('#ff0000');
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Получаем список техники
      const vehicles = await WTVehiclesAPI.getVehiclesList(filters);

      if (vehicles.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Техника не найдена')
          .setDescription('По заданным фильтрам техника не найдена.')
          .setColor('#ff0000');
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Создаем заголовок с информацией о фильтрах
      let title = '📋 Список техники War Thunder';
      const filterDescriptions: string[] = [];
      
      if (country) filterDescriptions.push(`Страна: ${VehicleFormatter.getCountryFlag(country)}`);
      if (vehicleType) filterDescriptions.push(`Тип: ${VehicleFormatter.formatVehicleType(vehicleType)}`);
      if (era) filterDescriptions.push(`Эра: ${era}`);
      if (brMin || brMax) {
        const brRange = brMin && brMax ? `${brMin}-${brMax}` : 
                       brMin ? `от ${brMin}` : `до ${brMax}`;
        filterDescriptions.push(`БР: ${brRange}`);
      }
      if (isPremium) filterDescriptions.push('💎 Премиум');
      if (isPack) filterDescriptions.push('📦 Паки');
      if (isSquadron) filterDescriptions.push('👥 Эскадрон');

      if (filterDescriptions.length > 0) {
        title += ` (${filterDescriptions.join(', ')})`;
      }

      // Сортируем по BR
      vehicles.sort((a, b) => a.realistic_br - b.realistic_br);

      // Создаем пагинацию
      const itemsPerPage = 20;
      const totalPages = Math.ceil(vehicles.length / itemsPerPage);
      let currentPage = 0;

      const createPageEmbed = (page: number): EmbedBuilder => {
        const start = page * itemsPerPage;
        const end = Math.min(start + itemsPerPage, vehicles.length);
        const pageVehicles = vehicles.slice(start, end);

        const embed = VehicleFormatter.createVehicleListEmbed(pageVehicles, title);
        
        if (totalPages > 1) {
          embed.setFooter({ 
            text: `Страница ${page + 1} из ${totalPages} • Всего найдено: ${vehicles.length} техник` 
          });
        } else {
          embed.setFooter({ 
            text: `Всего найдено: ${vehicles.length} техник` 
          });
        }

        return embed;
      };

      const embed = createPageEmbed(currentPage);

      // Если только одна страница, отправляем без кнопок
      if (totalPages <= 1) {
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Создаем кнопки для навигации
      const createNavigationRow = (page: number): ActionRowBuilder<ButtonBuilder> => {
        return new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('first')
              .setLabel('⏮️ Первая')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('◀️ Назад')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Вперед ▶️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === totalPages - 1),
            new ButtonBuilder()
              .setCustomId('last')
              .setLabel('Последняя ⏭️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === totalPages - 1)
          );
      };

      const row = createNavigationRow(currentPage);

      const response = await interaction.editReply({ 
        embeds: [embed], 
        components: [row] 
      });

      // Обработчик кнопок навигации
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 минут
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

        switch (buttonInteraction.customId) {
          case 'first':
            currentPage = 0;
            break;
          case 'prev':
            currentPage = Math.max(0, currentPage - 1);
            break;
          case 'next':
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            break;
          case 'last':
            currentPage = totalPages - 1;
            break;
        }

        const newEmbed = createPageEmbed(currentPage);
        const newRow = createNavigationRow(currentPage);

        await buttonInteraction.editReply({ 
          embeds: [newEmbed], 
          components: [newRow] 
        });
      });

      collector.on('end', async () => {
        try {
          // Деактивируем кнопки после истечения времени
          const disabledRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('first')
                .setLabel('⏮️ Первая')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀️ Назад')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Вперед ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('last')
                .setLabel('Последняя ⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
          
          await interaction.editReply({ components: [disabledRow] });
        } catch (err) {
          // Игнорируем ошибки, если сообщение уже удалено
        }
      });

    } catch (err) {
      error('Ошибка в команде wtlist:', err);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Ошибка')
        .setDescription('Произошла ошибка при получении списка техники. Попробуйте позже.')
        .setColor('#ff0000');

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed] });
      }
    }
  },
}; 