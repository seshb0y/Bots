import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { info, error } from '../utils/logger';
import { AIRCRAFT_ADMIN_ROLE_ID } from '../constants';
import { 
  loadAircraftData, 
  addAircraft, 
  removeAircraft, 
  updateAircraft, 
  getAllAircraft,
  Aircraft,
  AircraftData 
} from '../utils/aircraft';

// Команда для просмотра списков самолётов
export const aircraftListCommand = new SlashCommandBuilder()
  .setName('aircraft-list')
  .setDescription('Показать списки самолётов для лётной академии')
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('Тип самолётов')
      .setRequired(false)
      .addChoices(
        { name: 'Поршневые', value: 'piston' },
        { name: 'Ранние реактивные', value: 'early_jet' },
        { name: 'Современные реактивные', value: 'modern_jet' }
      )
  );

export async function handleAircraftList(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) запрашивает список самолётов`);
    
    const type = interaction.options.getString('type') as 'piston' | 'early_jet' | 'modern_jet' | null;
    const data = loadAircraftData();
    
    if (type) {
      // Показать конкретный тип
      const aircraft = data[type];
      const embed = new EmbedBuilder()
        .setTitle(`✈️ Самолёты: ${getTypeDisplayName(type)}`)
        .setColor(0x00ff00)
        .setTimestamp();
      
      if (aircraft.length === 0) {
        embed.setDescription('В этой категории пока нет самолётов.');
      } else {
        aircraft.forEach((a, index) => {
          embed.addFields({
            name: `${index + 1}. ${a.name}`,
            value: `**ID:** \`${a.id}\`\n**Нация:** ${a.nation}\n**БР:** ${a.br}\n**Тип:** ${a.type}`,
            inline: false
          });
        });
      }
      
      await interaction.reply({ embeds: [embed] });
    } else {
      // Показать все типы
      const embed = new EmbedBuilder()
        .setTitle('✈️ Списки самолётов лётной академии')
        .setColor(0x00ff00)
        .setTimestamp();
      
              Object.entries(data).forEach(([typeKey, aircraft]) => {
          const typeName = getTypeDisplayName(typeKey as keyof AircraftData);
          const count = aircraft.length;
          embed.addFields({
            name: `${typeName} (${count})`,
            value: count > 0 
              ? aircraft.slice(0, 3).map((a: Aircraft) => `• ${a.name} (БР ${a.br})`).join('\n') + (count > 3 ? `\n... и ещё ${count - 3}` : '')
              : 'Нет самолётов',
            inline: true
          });
        });
      
      await interaction.reply({ embeds: [embed] });
    }
    
    info(`[AIRCRAFT] Список самолётов показан для ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при показе списка самолётов для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: '❌ Произошла ошибка при загрузке списка самолётов',
      ephemeral: true
    });
  }
}

// Команда для добавления самолёта
export const aircraftAddCommand = new SlashCommandBuilder()
  .setName('aircraft-add')
  .setDescription('Добавить самолёт в список (только для администраторов самолётов)')
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('Тип самолёта')
      .setRequired(true)
      .addChoices(
        { name: 'Поршневой', value: 'piston' },
        { name: 'Ранний реактивный', value: 'early_jet' },
        { name: 'Современный реактивный', value: 'modern_jet' }
      )
  )
  .addStringOption(option =>
    option
      .setName('id')
      .setDescription('Уникальный ID самолёта (например: bf109f4)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Название самолёта')
      .setRequired(true)
  )
  .addNumberOption(option =>
    option
      .setName('br')
      .setDescription('Боевой рейтинг')
      .setRequired(true)
      .setMinValue(1.0)
      .setMaxValue(12.0)
  )
  .addStringOption(option =>
    option
      .setName('nation')
      .setDescription('Нация')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('aircraft_type')
      .setDescription('Тип самолёта')
      .setRequired(true)
  );

export async function handleAircraftAdd(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) пытается добавить самолёт`);
    
    // Проверяем права доступа
    if (!interaction.member || !('roles' in interaction.member)) {
      await interaction.reply({
        content: '❌ Не удалось проверить ваши роли',
        ephemeral: true
      });
      return;
    }
    
    const hasRole = 'roles' in interaction.member && 'cache' in interaction.member.roles && interaction.member.roles.cache.has(AIRCRAFT_ADMIN_ROLE_ID);
    if (!hasRole) {
      await interaction.reply({
        content: '❌ У вас нет прав для добавления самолётов. Требуется роль администратора самолётов.',
        ephemeral: true
      });
      return;
    }
    
    const type = interaction.options.getString('type', true) as 'piston' | 'early_jet' | 'modern_jet';
    const id = interaction.options.getString('id', true);
    const name = interaction.options.getString('name', true);
    const br = interaction.options.getNumber('br', true);
    const nation = interaction.options.getString('nation', true);
    const aircraftType = interaction.options.getString('aircraft_type', true);
    
    const aircraft: Aircraft = {
      id,
      name,
      br,
      nation,
      type: aircraftType
    };
    
    const success = addAircraft(type, aircraft);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setTitle('✅ Самолёт добавлен')
        .setColor(0x00ff00)
        .addFields(
          { name: 'ID', value: id, inline: true },
          { name: 'Название', value: name, inline: true },
          { name: 'Тип', value: getTypeDisplayName(type), inline: true },
          { name: 'БР', value: br.toString(), inline: true },
          { name: 'Нация', value: nation, inline: true },
          { name: 'Класс', value: aircraftType, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      info(`[AIRCRAFT] Самолёт ${id} добавлен пользователем ${interaction.user.tag}`);
    } else {
      await interaction.reply({
        content: '❌ Не удалось добавить самолёт. Возможно, самолёт с таким ID уже существует.',
        ephemeral: true
      });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при добавлении самолёта для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: '❌ Произошла ошибка при добавлении самолёта',
      ephemeral: true
    });
  }
}

// Команда для удаления самолёта
export const aircraftRemoveCommand = new SlashCommandBuilder()
  .setName('aircraft-remove')
  .setDescription('Удалить самолёт из списка (только для администраторов самолётов)')
  .addStringOption(option =>
    option
      .setName('id')
      .setDescription('ID самолёта для удаления')
      .setRequired(true)
  );

export async function handleAircraftRemove(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) пытается удалить самолёт`);
    
    // Проверяем права доступа
    if (!interaction.member || !('roles' in interaction.member)) {
      await interaction.reply({
        content: '❌ Не удалось проверить ваши роли',
        ephemeral: true
      });
      return;
    }
    
    const hasRole = 'roles' in interaction.member && 'cache' in interaction.member.roles && interaction.member.roles.cache.has(AIRCRAFT_ADMIN_ROLE_ID);
    if (!hasRole) {
      await interaction.reply({
        content: '❌ У вас нет прав для удаления самолётов. Требуется роль администратора самолётов.',
        ephemeral: true
      });
      return;
    }
    
    const id = interaction.options.getString('id', true);
    
    // Получаем информацию о самолёте перед удалением
    const data = loadAircraftData();
    let aircraftInfo: Aircraft | null = null;
    let aircraftType: string = '';
    
    for (const [type, aircraft] of Object.entries(data)) {
      const found = aircraft.find((a: Aircraft) => a.id === id);
      if (found) {
        aircraftInfo = found;
        aircraftType = type;
        break;
      }
    }
    
    if (!aircraftInfo) {
      await interaction.reply({
        content: `❌ Самолёт с ID \`${id}\` не найден`,
        ephemeral: true
      });
      return;
    }
    
    const success = removeAircraft(id);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Самолёт удалён')
        .setColor(0xff0000)
        .addFields(
          { name: 'ID', value: id, inline: true },
          { name: 'Название', value: aircraftInfo.name, inline: true },
          { name: 'Тип', value: getTypeDisplayName(aircraftType as keyof AircraftData), inline: true },
          { name: 'БР', value: aircraftInfo.br.toString(), inline: true },
          { name: 'Нация', value: aircraftInfo.nation, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      info(`[AIRCRAFT] Самолёт ${id} удалён пользователем ${interaction.user.tag}`);
    } else {
      await interaction.reply({
        content: '❌ Не удалось удалить самолёт',
        ephemeral: true
      });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при удалении самолёта для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: '❌ Произошла ошибка при удалении самолёта',
      ephemeral: true
    });
  }
}

// Вспомогательная функция для отображения названий типов
function getTypeDisplayName(type: keyof AircraftData): string {
  const names = {
    piston: 'Поршневые',
    early_jet: 'Ранние реактивные',
    modern_jet: 'Современные реактивные'
  };
  return names[type];
}
