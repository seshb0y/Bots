import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction
} from "discord.js";
import { info, error } from "../utils/logger.js";
import { 
  loadAircraftData, 
  addAircraft, 
  removeAircraft, 
  updateAircraft, 
  getAircraftByType,
  getAircraftTypeName,
  getAircraftTypeShort,
  AircraftType,
  Aircraft,
  createAircraftOptions
} from "../utils/aircraft.js";

// ID роли администратора самолётов
const AIRCRAFT_ADMIN_ROLE_ID = "832294803706085396";

// Проверка прав администратора самолётов
function hasAircraftAdminRole(interaction: ChatInputCommandInteraction | ModalSubmitInteraction): boolean {
  if (!interaction.member || !interaction.guild) return false;
  
  const member = interaction.member;
  
  // Проверяем права администратора
  if (member.permissions && typeof member.permissions === 'object' && 'has' in member.permissions) {
    try {
      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }
    } catch (err) {
      // Игнорируем ошибки проверки прав
    }
  }
  
  // Проверяем роль администратора самолётов
  if ('roles' in member && member.roles && typeof member.roles === 'object' && 'cache' in member.roles) {
    try {
      return member.roles.cache.has(AIRCRAFT_ADMIN_ROLE_ID);
    } catch (err) {
      // Игнорируем ошибки проверки ролей
    }
  }
  
  return false;
}

// Команда для просмотра списка самолётов
export async function aircraftListCommand(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) запрашивает список самолётов`);
    
    const data = loadAircraftData();
    
    const embed = new EmbedBuilder()
      .setTitle("✈️ Список самолётов")
      .setDescription("Все самолёты по категориям:")
      .setColor(0x00ff00)
      .setTimestamp();
    
    // Добавляем информацию по каждой категории
    Object.entries(data).forEach(([type, aircraft]) => {
      const typeName = getAircraftTypeName(type as AircraftType);
      const aircraftList = aircraft.length > 0 
        ? aircraft.map((a: Aircraft) => `• ${a.name}`).join('\n')
        : 'Нет самолётов';
      
      embed.addFields({
        name: `${typeName} (${aircraft.length})`,
        value: aircraftList,
        inline: false
      });
    });
    
    await interaction.reply({ embeds: [embed] });
    info(`[AIRCRAFT] Список самолётов показан для ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при показе списка самолётов для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при загрузке списка самолётов"
    });
  }
}

// Команда для добавления самолёта
export async function aircraftAddCommand(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) пытается добавить самолёт`);
    
    if (!hasAircraftAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления списком самолётов",
        ephemeral: true
      });
      return;
    }
    
    // Создаём модальное окно для добавления самолёта
    const modal = new ModalBuilder()
      .setCustomId('aircraft_add_modal')
      .setTitle('Добавить самолёт');
    
    // Селектор типа самолёта
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId('aircraft_type_select')
      .setPlaceholder('Выберите тип самолёта')
      .addOptions([
        { label: 'Поршневая авиация', value: 'piston', description: 'Поршневые самолёты' },
        { label: 'Ранние реактивы', value: 'early_jet', description: 'Ранние реактивные самолёты' },
        { label: 'Современные реактивы', value: 'modern_jet', description: 'Современные реактивные самолёты' }
      ]);
    
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    
    // Поле для названия самолёта
    const nameInput = new TextInputBuilder()
      .setCustomId('aircraft_name')
      .setLabel('Название самолёта')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Например: F-16C Fighting Falcon')
      .setRequired(true)
      .setMaxLength(100);
    
    const nameRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    
    // Создаём embed с инструкциями
    const embed = new EmbedBuilder()
      .setTitle('✈️ Добавление самолёта')
      .setDescription('Выберите тип самолёта и введите его название:')
      .setColor(0x00ff00);
    
    await interaction.reply({ 
      embeds: [embed], 
      components: [typeRow],
      ephemeral: true 
    });
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при создании модального окна добавления самолёта:`, err);
    await interaction.reply({
      content: `❌ Ошибка при создании формы: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для удаления самолёта
export async function aircraftRemoveCommand(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) пытается удалить самолёт`);
    
    if (!hasAircraftAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления списком самолётов",
        ephemeral: true
      });
      return;
    }
    
    // Создаём селектор типа самолёта
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId('aircraft_remove_type_select')
      .setPlaceholder('Выберите тип самолёта')
      .addOptions([
        { label: 'Поршневая авиация', value: 'piston', description: 'Поршневые самолёты' },
        { label: 'Ранние реактивы', value: 'early_jet', description: 'Ранние реактивные самолёты' },
        { label: 'Современные реактивы', value: 'modern_jet', description: 'Современные реактивные самолёты' }
      ]);
    
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Удаление самолёта')
      .setDescription('Выберите тип самолёта для удаления:')
      .setColor(0xff0000);
    
    await interaction.reply({ 
      embeds: [embed], 
      components: [typeRow],
      ephemeral: true 
    });
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при создании формы удаления самолёта:`, err);
    await interaction.reply({
      content: `❌ Ошибка при создании формы: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для обновления самолёта
export async function aircraftUpdateCommand(interaction: ChatInputCommandInteraction) {
  try {
    info(`[AIRCRAFT] Пользователь ${interaction.user.tag} (${interaction.user.id}) пытается обновить самолёт`);
    
    if (!hasAircraftAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления списком самолётов",
        ephemeral: true
      });
      return;
    }
    
    // Создаём селектор типа самолёта
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId('aircraft_update_type_select')
      .setPlaceholder('Выберите тип самолёта')
      .addOptions([
        { label: 'Поршневая авиация', value: 'piston', description: 'Поршневые самолёты' },
        { label: 'Ранние реактивы', value: 'early_jet', description: 'Ранние реактивные самолёты' },
        { label: 'Современные реактивы', value: 'modern_jet', description: 'Современные реактивные самолёты' }
      ]);
    
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    
    const embed = new EmbedBuilder()
      .setTitle('✏️ Изменение самолёта')
      .setDescription('Выберите тип самолёта для изменения:')
      .setColor(0xffff00);
    
    await interaction.reply({ 
      embeds: [embed], 
      components: [typeRow],
      ephemeral: true 
    });
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при создании формы изменения самолёта:`, err);
    await interaction.reply({
      content: `❌ Ошибка при создании формы: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора типа для добавления самолёта
export async function handleAircraftTypeSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_type_select") {
      const type = interaction.values[0] as AircraftType;
      
      // Создаём модальное окно с полем для названия
      const modal = new ModalBuilder()
        .setCustomId(`aircraft_add_modal_${type}`)
        .setTitle(`Добавить ${getAircraftTypeName(type)}`);
      
      const nameInput = new TextInputBuilder()
        .setCustomId('aircraft_name')
        .setLabel('Название самолёта')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Например: F-16C Fighting Falcon')
        .setRequired(true)
        .setMaxLength(100);
      
      const nameRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
      modal.addComponents(nameRow);
      
      await interaction.showModal(modal);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа самолётов:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при обработке выбора",
      ephemeral: true
    });
  }
}

// Обработчик модального окна добавления самолёта
export async function handleAircraftAddModal(interaction: ModalSubmitInteraction) {
  try {
    if (!interaction.isModalSubmit()) return;
    
    if (!interaction.customId.startsWith('aircraft_add_modal_')) return;
    
    if (!hasAircraftAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления списком самолётов",
        ephemeral: true
      });
      return;
    }
    
    const type = interaction.customId.replace('aircraft_add_modal_', '') as AircraftType;
    const name = interaction.fields.getTextInputValue('aircraft_name');
    
    const aircraft: Aircraft = {
      name: name.trim(),
      type
    };
    
    addAircraft(aircraft);
    
    const embed = new EmbedBuilder()
      .setTitle("✅ Самолёт добавлен")
      .setDescription(`Самолёт **${name}** успешно добавлен в категорию **${getAircraftTypeName(type)}**`)
      .setColor(0x00ff00)
      .addFields(
        { name: "Название", value: name, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${name}" добавлен пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при добавлении самолёта:`, err);
    await interaction.reply({
      content: `❌ Ошибка при добавлении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора типа для удаления самолёта
export async function handleAircraftRemoveTypeSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_remove_type_select") {
      const type = interaction.values[0] as AircraftType;
      const data = loadAircraftData();
      const aircraft = data[type] || [];
      
      if (aircraft.length === 0) {
        await interaction.update({
          content: `❌ В категории **${getAircraftTypeName(type)}** нет самолётов для удаления`,
          embeds: [],
          components: []
        });
        return;
      }
      
      // Создаём селектор самолётов
      const aircraftSelect = new StringSelectMenuBuilder()
        .setCustomId('aircraft_remove_select')
        .setPlaceholder('Выберите самолёт для удаления')
        .addOptions(createAircraftOptions(aircraft));
      
      const aircraftRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(aircraftSelect);
      
      const embed = new EmbedBuilder()
        .setTitle(`🗑️ Удаление самолёта - ${getAircraftTypeName(type)}`)
        .setDescription('Выберите самолёт для удаления:')
        .setColor(0xff0000);
      
      await interaction.update({ 
        embeds: [embed], 
        components: [aircraftRow]
      });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа для удаления:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при обработке выбора",
      ephemeral: true
    });
  }
}

// Обработчик селектора самолёта для удаления
export async function handleAircraftRemoveSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_remove_select") {
      const aircraftName = interaction.values[0];
      
      // Находим самолёт по названию
      const data = loadAircraftData();
      let aircraftToRemove: Aircraft | null = null;
      let aircraftType: AircraftType | null = null;
      
      for (const [type, aircraft] of Object.entries(data)) {
        const found = aircraft.find((a: Aircraft) => a.name === aircraftName);
        if (found) {
          aircraftToRemove = found;
          aircraftType = type as AircraftType;
          break;
        }
      }
      
      if (!aircraftToRemove || !aircraftType) {
        await interaction.update({
          content: `❌ Самолёт "${aircraftName}" не найден`,
          embeds: [],
          components: []
        });
        return;
      }
      
      removeAircraft(aircraftType, aircraftName);
      
      const embed = new EmbedBuilder()
        .setTitle("🗑️ Самолёт удалён")
        .setDescription(`Самолёт **${aircraftToRemove.name}** успешно удалён из категории **${getAircraftTypeName(aircraftType)}**`)
        .setColor(0xff0000)
        .addFields(
          { name: "Название", value: aircraftToRemove.name, inline: true },
          { name: "Тип", value: getAircraftTypeName(aircraftType), inline: true }
        )
        .setTimestamp();
      
      await interaction.update({ 
        embeds: [embed], 
        components: []
      });
      
      info(`[AIRCRAFT] Самолёт "${aircraftToRemove.name}" удалён пользователем ${interaction.user.tag}`);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при удалении самолёта:`, err);
    await interaction.update({
      content: `❌ Ошибка при удалении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      embeds: [],
      components: []
    });
  }
}

// Обработчик селектора типа для изменения самолёта
export async function handleAircraftUpdateTypeSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_update_type_select") {
      const type = interaction.values[0] as AircraftType;
      const data = loadAircraftData();
      const aircraft = data[type] || [];
      
      info(`[AIRCRAFT] Обработка селектора типа для изменения: ${type}, найдено самолётов: ${aircraft.length}`);
      
      if (aircraft.length === 0) {
        await interaction.update({
          content: `❌ В категории **${getAircraftTypeName(type)}** нет самолётов для изменения`,
          embeds: [],
          components: []
        });
        return;
      }
      
      // Создаём селектор самолётов
      const aircraftSelect = new StringSelectMenuBuilder()
        .setCustomId('aircraft_update_select')
        .setPlaceholder('Выберите самолёт для изменения')
        .addOptions(createAircraftOptions(aircraft));
      
      const aircraftRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(aircraftSelect);
      
      const embed = new EmbedBuilder()
        .setTitle(`✏️ Изменение самолёта - ${getAircraftTypeName(type)}`)
        .setDescription('Выберите самолёт для изменения:')
        .setColor(0xffff00);
      
      await interaction.update({ 
        embeds: [embed], 
        components: [aircraftRow]
      });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа для изменения:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при обработке выбора",
      ephemeral: true
    });
  }
}

// Обработчик селектора самолёта для изменения
export async function handleAircraftUpdateSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_update_select") {
      const aircraftName = interaction.values[0];
      
      // Находим самолёт по названию
      const data = loadAircraftData();
      let aircraftToUpdate: Aircraft | null = null;
      let aircraftType: AircraftType | null = null;
      
      for (const [type, aircraft] of Object.entries(data)) {
        const found = aircraft.find((a: Aircraft) => a.name === aircraftName);
        if (found) {
          aircraftToUpdate = found;
          aircraftType = type as AircraftType;
          break;
        }
      }
      
      if (!aircraftToUpdate || !aircraftType) {
        await interaction.update({
          content: `❌ Самолёт "${aircraftName}" не найден`,
          embeds: [],
          components: []
        });
        return;
      }
      
      // Создаём модальное окно с полем для нового названия
      const modal = new ModalBuilder()
        .setCustomId(`aircraft_update_modal_${aircraftType}_${aircraftName}`)
        .setTitle(`Изменить самолёт: ${aircraftName}`);
      
      const nameInput = new TextInputBuilder()
        .setCustomId('aircraft_new_name')
        .setLabel('Новое название самолёта')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(aircraftName)
        .setValue(aircraftName)
        .setRequired(true)
        .setMaxLength(100);
      
      const nameRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
      modal.addComponents(nameRow);
      
      await interaction.showModal(modal);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора самолёта для изменения:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при обработке выбора",
      ephemeral: true
    });
  }
}

// Обработчик модального окна изменения самолёта
export async function handleAircraftUpdateModal(interaction: ModalSubmitInteraction) {
  try {
    if (!interaction.isModalSubmit()) return;
    
    if (!interaction.customId.startsWith('aircraft_update_modal_')) return;
    
    if (!hasAircraftAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления списком самолётов",
        ephemeral: true
      });
      return;
    }
    
    // Парсим customId: aircraft_update_modal_{type}_{oldName}
    const customId = interaction.customId.replace('aircraft_update_modal_', '');
    info(`[AIRCRAFT] Парсинг customId: ${interaction.customId} -> ${customId}`);
    
    // Находим первое подчеркивание после типа самолёта
    let type: AircraftType;
    let oldName: string;
    
    if (customId.startsWith('piston_')) {
      type = 'piston';
      oldName = customId.replace('piston_', '');
    } else if (customId.startsWith('early_jet_')) {
      type = 'early_jet';
      oldName = customId.replace('early_jet_', '');
    } else if (customId.startsWith('modern_jet_')) {
      type = 'modern_jet';
      oldName = customId.replace('modern_jet_', '');
    } else {
      await interaction.reply({
        content: "❌ Ошибка при определении типа самолёта",
        ephemeral: true
      });
      return;
    }
    const newName = interaction.fields.getTextInputValue('aircraft_new_name').trim();
    
    if (newName === oldName) {
      await interaction.reply({
        content: "❌ Новое название должно отличаться от текущего",
        ephemeral: true
      });
      return;
    }
    
    // Получаем текущий самолёт
    const data = loadAircraftData();
    const aircraftList = data[type] || [];
    const currentAircraft = aircraftList.find(a => a.name === oldName);
    
    if (!currentAircraft) {
      await interaction.reply({
        content: `❌ Самолёт "${oldName}" не найден в категории ${getAircraftTypeName(type)}`,
        ephemeral: true
      });
      return;
    }
    
    // Создаём обновлённый самолёт
    const updatedAircraft: Aircraft = {
      name: newName,
      type: currentAircraft.type
    };
    
    // Удаляем старый и добавляем новый
    removeAircraft(type, oldName);
    addAircraft(updatedAircraft);
    
    const embed = new EmbedBuilder()
      .setTitle("✏️ Самолёт обновлён")
      .setDescription(`Самолёт **${oldName}** переименован в **${newName}**`)
      .setColor(0x00ff00)
      .addFields(
        { name: "Старое название", value: oldName, inline: true },
        { name: "Новое название", value: newName, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${oldName}" переименован в "${newName}" пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обновлении самолёта:`, err);
    await interaction.reply({
      content: `❌ Ошибка при обновлении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}