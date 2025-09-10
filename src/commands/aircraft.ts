import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
<<<<<<< HEAD
  ButtonStyle
} from "discord.js";
import { info, error } from "../utils/logger.js";
=======
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { info, error } from "../utils/logger";
>>>>>>> feature/absence-thread-integration
import { 
  loadAircraftData, 
  addAircraft, 
  removeAircraft, 
  updateAircraft, 
  getAircraftByType,
  getAircraftTypeName,
  getAircraftTypeShort,
  AircraftType,
  Aircraft
<<<<<<< HEAD
} from "../utils/aircraft.js";
=======
} from "../utils/aircraft";
>>>>>>> feature/absence-thread-integration

// ID роли администратора самолётов
const AIRCRAFT_ADMIN_ROLE_ID = "832294803706085396";

// Проверка прав администратора самолётов
function hasAircraftAdminRole(interaction: ChatInputCommandInteraction): boolean {
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
    
    const type = interaction.options.getString("тип") as AircraftType | null;
    const data = loadAircraftData();
    
    if (type) {
      // Показываем самолёты конкретного типа
      const aircraft = data[type] || [];
      const typeName = getAircraftTypeName(type);
      
      if (aircraft.length === 0) {
        await interaction.reply({
          content: `❌ В категории **${typeName}** пока нет самолётов`,
          ephemeral: true
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`✈️ Самолёты: ${typeName}`)
        .setDescription(`Всего самолётов: **${aircraft.length}**`)
        .setColor(0x00ff00)
        .setTimestamp();
      
      aircraft.forEach((plane, index) => {
        embed.addFields({
          name: `${index + 1}. ${plane.name}`,
<<<<<<< HEAD
          value: `**Нация:** ${plane.nation}\n**БР:** ${plane.br}`,
=======
          value: `Тип: ${getAircraftTypeName(plane.type)}`,
>>>>>>> feature/absence-thread-integration
          inline: true
        });
      });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else {
      // Показываем общую статистику
      const embed = new EmbedBuilder()
        .setTitle("✈️ Список самолётов")
        .setDescription("Выберите тип самолётов для просмотра:")
        .setColor(0x00ff00)
        .setTimestamp();
      
      Object.entries(data).forEach(([type, aircraft]) => {
        const typeName = getAircraftTypeName(type as AircraftType);
        embed.addFields({
          name: typeName,
          value: `**Количество:** ${aircraft.length} самолётов`,
          inline: true
        });
      });
      
      // Создаём селектор для выбора типа
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("aircraft_type_select")
        .setPlaceholder("Выберите тип самолётов")
        .addOptions([
          { label: "Поршневая авиация", value: "piston", description: `Показать ${data.piston.length} самолётов` },
          { label: "Ранние реактивы", value: "early_jet", description: `Показать ${data.early_jet.length} самолётов` },
          { label: "Современные реактивы", value: "modern_jet", description: `Показать ${data.modern_jet.length} самолётов` }
        ]);
      
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
    
    info(`[AIRCRAFT] Список самолётов показан для ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при показе списка самолётов для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при загрузке списка самолётов",
      ephemeral: true
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
    
<<<<<<< HEAD
    const type = interaction.options.getString("тип", true) as AircraftType;
    const name = interaction.options.getString("название", true);
    const br = interaction.options.getString("бр", true);
    const nation = interaction.options.getString("нация", true);
    
    const aircraft: Aircraft = {
      name,
      type,
      br,
      nation
    };
    
    addAircraft(aircraft);
    
    const embed = new EmbedBuilder()
      .setTitle("✅ Самолёт добавлен")
      .setDescription(`Самолёт **${name}** успешно добавлен в категорию **${getAircraftTypeName(type)}**`)
      .setColor(0x00ff00)
      .addFields(
        { name: "Название", value: name, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true },
        { name: "БР", value: br, inline: true },
        { name: "Нация", value: nation, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${name}" добавлен пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при добавлении самолёта пользователем ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при добавлении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
=======
    // Создаём селектор для выбора типа самолёта
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("aircraft_add_type_select")
      .setPlaceholder("Выберите тип самолёта")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions([
        { label: "Поршневая авиация", value: "piston", description: "Поршневые самолёты" },
        { label: "Ранние реактивы", value: "early_jet", description: "Ранние реактивные самолёты" },
        { label: "Современные реактивы", value: "modern_jet", description: "Современные реактивные самолёты" }
      ]);
    
    const embed = new EmbedBuilder()
      .setTitle("✈️ Добавление самолёта")
      .setDescription("Сначала выберите тип самолёта:")
      .setColor(0x00ff00)
      .setTimestamp();
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    info(`[AIRCRAFT] Селектор типа для добавления показан для ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при показе селектора добавления для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при открытии формы добавления: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
>>>>>>> feature/absence-thread-integration
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
    
<<<<<<< HEAD
    const type = interaction.options.getString("тип", true) as AircraftType;
    const aircraftName = interaction.options.getString("название", true);
    
    // Получаем информацию о самолёте перед удалением
    const data = loadAircraftData();
    const aircraft = data[type].find(a => a.name === aircraftName);
    
    if (!aircraft) {
      await interaction.reply({
        content: `❌ Самолёт "${aircraftName}" не найден в категории ${getAircraftTypeName(type)}`,
=======
    const data = loadAircraftData();
    
    // Создаём селектор для выбора типа самолёта
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("aircraft_remove_type_select")
      .setPlaceholder("Выберите тип самолётов")
      .setMinValues(1)
      .setMaxValues(1);
    
    // Добавляем типы самолётов в селектор
    Object.entries(data).forEach(([type, aircraft]) => {
      const typeName = getAircraftTypeName(type as AircraftType);
      if (aircraft.length > 0) {
        selectMenu.addOptions({
          label: typeName,
          value: type,
          description: `${aircraft.length} самолётов`
        });
      }
    });
    
    if (selectMenu.options.length === 0) {
      await interaction.reply({
        content: "❌ В базе данных нет самолётов для удаления",
>>>>>>> feature/absence-thread-integration
        ephemeral: true
      });
      return;
    }
    
<<<<<<< HEAD
    removeAircraft(type, aircraftName);
    
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Самолёт удалён")
      .setDescription(`Самолёт **${aircraft.name}** успешно удалён из категории **${getAircraftTypeName(type)}**`)
      .setColor(0xff0000)
      .addFields(
        { name: "Название", value: aircraft.name, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true },
        { name: "БР", value: aircraft.br, inline: true },
        { name: "Нация", value: aircraft.nation, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${aircraft.name}" удалён пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при удалении самолёта пользователем ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при удалении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
=======
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Удаление самолёта")
      .setDescription("Сначала выберите тип самолётов:")
      .setColor(0xff0000)
      .setTimestamp();
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    info(`[AIRCRAFT] Селектор типа для удаления показан для ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при показе селектора удаления для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при открытии формы удаления: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
>>>>>>> feature/absence-thread-integration
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
    
<<<<<<< HEAD
    const type = interaction.options.getString("тип", true) as AircraftType;
    const aircraftName = interaction.options.getString("название", true);
    const newName = interaction.options.getString("новое_название");
    const br = interaction.options.getString("бр");
    const nation = interaction.options.getString("нация");
    
    // Получаем текущие данные самолёта
    const data = loadAircraftData();
    const currentAircraft = data[type].find(a => a.name === aircraftName);
    
    if (!currentAircraft) {
      await interaction.reply({
        content: `❌ Самолёт "${aircraftName}" не найден в категории ${getAircraftTypeName(type)}`,
=======
    const data = loadAircraftData();
    
    // Создаём селектор для выбора типа самолёта
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("aircraft_update_type_select")
      .setPlaceholder("Выберите тип самолётов")
      .setMinValues(1)
      .setMaxValues(1);
    
    // Добавляем типы самолётов в селектор
    Object.entries(data).forEach(([type, aircraft]) => {
      const typeName = getAircraftTypeName(type as AircraftType);
      if (aircraft.length > 0) {
        selectMenu.addOptions({
          label: typeName,
          value: type,
          description: `${aircraft.length} самолётов`
        });
      }
    });
    
    if (selectMenu.options.length === 0) {
      await interaction.reply({
        content: "❌ В базе данных нет самолётов для обновления",
>>>>>>> feature/absence-thread-integration
        ephemeral: true
      });
      return;
    }
    
<<<<<<< HEAD
    // Обновляем только указанные поля
    const updatedAircraft: Aircraft = {
      name: newName || currentAircraft.name,
      type: currentAircraft.type,
      br: br || currentAircraft.br,
      nation: nation || currentAircraft.nation
    };
    
    updateAircraft(updatedAircraft);
    
    const embed = new EmbedBuilder()
      .setTitle("✏️ Самолёт обновлён")
      .setDescription(`Самолёт **${updatedAircraft.name}** успешно обновлён`)
      .setColor(0x00ff00)
      .addFields(
        { name: "Название", value: updatedAircraft.name, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true },
        { name: "БР", value: updatedAircraft.br, inline: true },
        { name: "Нация", value: updatedAircraft.nation, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${updatedAircraft.name}" обновлён пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обновлении самолёта пользователем ${interaction.user.tag}:`, err);
=======
    const embed = new EmbedBuilder()
      .setTitle("✏️ Обновление самолёта")
      .setDescription("Сначала выберите тип самолётов:")
      .setColor(0x00ff00)
      .setTimestamp();
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    info(`[AIRCRAFT] Селектор типа для обновления показан для ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при показе селектора обновления для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при открытии формы обновления: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора типа для добавления самолёта
export async function handleAircraftAddTypeSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_add_type_select") {
      const type = interaction.values[0] as AircraftType;
      
      // Создаём модальное окно для ввода названия самолёта
      const modal = new ModalBuilder()
        .setCustomId(`aircraft_add_modal:${type}`)
        .setTitle("Добавить самолёт");
      
      // Поле для названия самолёта
      const nameInput = new TextInputBuilder()
        .setCustomId("aircraft_name")
        .setLabel("Название самолёта")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Например: P-51D-30 Mustang")
        .setRequired(true);
      
      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
      modal.addComponents(actionRow);
      
      await interaction.showModal(modal);
      info(`[AIRCRAFT] Модальное окно добавления показано для ${interaction.user.tag}`);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа для добавления:`, err);
    await interaction.update({
      content: `❌ Ошибка при открытии формы добавления: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      embeds: [],
      components: []
    });
  }
}

// Обработчик модального окна добавления самолёта
export async function handleAircraftAddModal(interaction: any) {
  try {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId.startsWith("aircraft_add_modal:")) {
      const [, type] = interaction.customId.split(":");
      const name = interaction.fields.getTextInputValue("aircraft_name");
      
      // Валидация названия
      if (!name || name.trim().length === 0) {
        await interaction.reply({
          content: "❌ Название самолёта не может быть пустым",
          ephemeral: true
        });
        return;
      }
      
      const aircraft: Aircraft = {
        name: name.trim(),
        type: type as AircraftType
      };
      
      addAircraft(aircraft);
      
      const embed = new EmbedBuilder()
        .setTitle("✅ Самолёт добавлен")
        .setDescription(`Самолёт **${name}** успешно добавлен в категорию **${getAircraftTypeName(type as AircraftType)}**`)
        .setColor(0x00ff00)
        .addFields(
          { name: "Название", value: name, inline: true },
          { name: "Тип", value: getAircraftTypeName(type as AircraftType), inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      info(`[AIRCRAFT] Самолёт "${name}" добавлен пользователем ${interaction.user.tag}`);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке модального окна добавления:`, err);
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
      
      // Создаём селектор для выбора конкретного самолёта
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("aircraft_remove_aircraft_select")
        .setPlaceholder("Выберите самолёт для удаления")
        .setMinValues(1)
        .setMaxValues(1);
      
      // Добавляем самолёты выбранного типа (максимум 25)
      aircraft.slice(0, 25).forEach((plane: Aircraft) => {
        selectMenu.addOptions({
          label: plane.name,
          value: `${type}:${plane.name}`,
          description: getAircraftTypeName(type)
        });
      });
      
      const embed = new EmbedBuilder()
        .setTitle(`🗑️ Удаление самолёта - ${getAircraftTypeName(type)}`)
        .setDescription("Выберите самолёт для удаления:")
        .setColor(0xff0000)
        .setTimestamp();
      
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      
      await interaction.update({ embeds: [embed], components: [row] });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа для удаления:`, err);
    await interaction.update({
      content: `❌ Ошибка при загрузке самолётов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      embeds: [],
      components: []
    });
  }
}

// Обработчик селектора самолёта для удаления
export async function handleAircraftRemoveAircraftSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_remove_aircraft_select") {
      const [type, aircraftName] = interaction.values[0].split(":");
      
      // Получаем информацию о самолёте перед удалением
      const data = loadAircraftData();
      const aircraft = data[type as AircraftType].find((a: Aircraft) => a.name === aircraftName);
      
      if (!aircraft) {
        await interaction.update({
          content: `❌ Самолёт "${aircraftName}" не найден в категории ${getAircraftTypeName(type as AircraftType)}`,
          embeds: [],
          components: []
        });
        return;
      }
      
      removeAircraft(type as AircraftType, aircraftName);
      
      const embed = new EmbedBuilder()
        .setTitle("🗑️ Самолёт удалён")
        .setDescription(`Самолёт **${aircraft.name}** успешно удалён из категории **${getAircraftTypeName(type as AircraftType)}**`)
        .setColor(0xff0000)
        .addFields(
          { name: "Название", value: aircraft.name, inline: true },
          { name: "Тип", value: getAircraftTypeName(type as AircraftType), inline: true }
        )
        .setTimestamp();
      
      await interaction.update({ embeds: [embed], components: [] });
      info(`[AIRCRAFT] Самолёт "${aircraft.name}" удалён пользователем ${interaction.user.tag}`);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора самолёта для удаления:`, err);
    await interaction.update({
      content: `❌ Ошибка при удалении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      embeds: [],
      components: []
    });
  }
}


// Обработчик селектора типа для обновления самолёта
export async function handleAircraftUpdateTypeSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_update_type_select") {
      const type = interaction.values[0] as AircraftType;
      const data = loadAircraftData();
      const aircraft = data[type] || [];
      
      if (aircraft.length === 0) {
        await interaction.update({
          content: `❌ В категории **${getAircraftTypeName(type)}** нет самолётов для обновления`,
          embeds: [],
          components: []
        });
        return;
      }
      
      // Создаём селектор для выбора конкретного самолёта
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("aircraft_update_aircraft_select")
        .setPlaceholder("Выберите самолёт для обновления")
        .setMinValues(1)
        .setMaxValues(1);
      
      // Добавляем самолёты выбранного типа (максимум 25)
      aircraft.slice(0, 25).forEach((plane: Aircraft) => {
        selectMenu.addOptions({
          label: plane.name,
          value: `${type}:${plane.name}`,
          description: getAircraftTypeName(type)
        });
      });
      
      const embed = new EmbedBuilder()
        .setTitle(`✏️ Обновление самолёта - ${getAircraftTypeName(type)}`)
        .setDescription("Выберите самолёт для обновления:")
        .setColor(0x00ff00)
        .setTimestamp();
      
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      
      await interaction.update({ embeds: [embed], components: [row] });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа для обновления:`, err);
    await interaction.update({
      content: `❌ Ошибка при загрузке самолётов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      embeds: [],
      components: []
    });
  }
}

// Обработчик селектора самолёта для обновления
export async function handleAircraftUpdateAircraftSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_update_aircraft_select") {
      const [type, aircraftName] = interaction.values[0].split(":");
      
      // Создаём модальное окно для ввода нового названия
      const modal = new ModalBuilder()
        .setCustomId(`aircraft_update_modal:${type}:${aircraftName}`)
        .setTitle("Обновить самолёт");
      
      // Поле для нового названия
      const nameInput = new TextInputBuilder()
        .setCustomId("new_aircraft_name")
        .setLabel("Новое название самолёта")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Введите новое название")
        .setValue(aircraftName)
        .setRequired(true);
      
      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
      modal.addComponents(actionRow);
      
      await interaction.showModal(modal);
      info(`[AIRCRAFT] Модальное окно обновления показано для ${interaction.user.tag}`);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора самолёта для обновления:`, err);
    await interaction.update({
      content: `❌ Ошибка при открытии формы обновления: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      embeds: [],
      components: []
    });
  }
}

// Обработчик модального окна обновления самолёта
export async function handleAircraftUpdateModal(interaction: any) {
  try {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId.startsWith("aircraft_update_modal:")) {
      const [, type, oldName] = interaction.customId.split(":");
      const newName = interaction.fields.getTextInputValue("new_aircraft_name");
      
      // Валидация названия
      if (!newName || newName.trim().length === 0) {
        await interaction.reply({
          content: "❌ Новое название самолёта не может быть пустым",
          ephemeral: true
        });
        return;
      }
      
      // Получаем текущие данные самолёта
      const data = loadAircraftData();
      const currentAircraft = data[type as AircraftType].find((a: Aircraft) => a.name === oldName);
      
      if (!currentAircraft) {
        await interaction.reply({
          content: `❌ Самолёт "${oldName}" не найден в категории ${getAircraftTypeName(type as AircraftType)}`,
          ephemeral: true
        });
        return;
      }
      
      // Обновляем самолёт - сначала удаляем старый, потом добавляем новый
      removeAircraft(type as AircraftType, oldName);
      
      const updatedAircraft: Aircraft = {
        name: newName.trim(),
        type: type as AircraftType
      };
      
      addAircraft(updatedAircraft);
      
      const embed = new EmbedBuilder()
        .setTitle("✏️ Самолёт обновлён")
        .setDescription(`Самолёт **${updatedAircraft.name}** успешно обновлён`)
        .setColor(0x00ff00)
        .addFields(
          { name: "Старое название", value: oldName, inline: true },
          { name: "Новое название", value: updatedAircraft.name, inline: true },
          { name: "Тип", value: getAircraftTypeName(type as AircraftType), inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      info(`[AIRCRAFT] Самолёт "${oldName}" обновлён на "${updatedAircraft.name}" пользователем ${interaction.user.tag}`);
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке модального окна обновления:`, err);
>>>>>>> feature/absence-thread-integration
    await interaction.reply({
      content: `❌ Ошибка при обновлении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора типа самолётов
export async function handleAircraftTypeSelect(interaction: any) {
  try {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === "aircraft_type_select") {
      const type = interaction.values[0] as AircraftType;
      const data = loadAircraftData();
      const aircraft = data[type] || [];
      const typeName = getAircraftTypeName(type);
      
      if (aircraft.length === 0) {
        await interaction.update({
          content: `❌ В категории **${typeName}** пока нет самолётов`,
          embeds: [],
          components: []
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`✈️ Самолёты: ${typeName}`)
        .setDescription(`Всего самолётов: **${aircraft.length}**`)
        .setColor(0x00ff00)
        .setTimestamp();
      
      aircraft.forEach((plane, index) => {
        embed.addFields({
          name: `${index + 1}. ${plane.name}`,
<<<<<<< HEAD
          value: `**Нация:** ${plane.nation}\n**БР:** ${plane.br}`,
=======
          value: `Тип: ${getAircraftTypeName(plane.type)}`,
>>>>>>> feature/absence-thread-integration
          inline: true
        });
      });
      
      // Кнопка "Назад"
      const backButton = new ButtonBuilder()
        .setCustomId("aircraft_list_back")
        .setLabel("← Назад к списку")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️");
      
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);
      
      await interaction.update({ embeds: [embed], components: [row] });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке селектора типа самолётов:`, err);
    await interaction.update({
      content: "❌ Произошла ошибка при загрузке списка самолётов",
      embeds: [],
      components: []
    });
  }
}

// Обработчик кнопки "Назад" для списка самолётов
export async function handleAircraftListBack(interaction: any) {
  try {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === "aircraft_list_back") {
      const data = loadAircraftData();
      
      const embed = new EmbedBuilder()
        .setTitle("✈️ Список самолётов")
        .setDescription("Выберите тип самолётов для просмотра:")
        .setColor(0x00ff00)
        .setTimestamp();
      
      Object.entries(data).forEach(([type, aircraft]) => {
        const typeName = getAircraftTypeName(type as AircraftType);
        embed.addFields({
          name: typeName,
          value: `**Количество:** ${aircraft.length} самолётов`,
          inline: true
        });
      });
      
      // Создаём селектор для выбора типа
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("aircraft_type_select")
        .setPlaceholder("Выберите тип самолётов")
        .addOptions([
          { label: "Поршневая авиация", value: "piston", description: `Показать ${data.piston.length} самолётов` },
          { label: "Ранние реактивы", value: "early_jet", description: `Показать ${data.early_jet.length} самолётов` },
          { label: "Современные реактивы", value: "modern_jet", description: `Показать ${data.modern_jet.length} самолётов` }
        ]);
      
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      
      await interaction.update({ embeds: [embed], components: [row] });
    }
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обработке кнопки "Назад":`, err);
    await interaction.update({
      content: "❌ Произошла ошибка при возврате к списку",
      embeds: [],
      components: []
    });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> feature/absence-thread-integration
