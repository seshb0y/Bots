import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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
  Aircraft
} from "../utils/aircraft.js";

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
          value: `**Нация:** ${plane.nation}\n**БР:** ${plane.br}\n**ID:** \`${plane.id}\`${plane.description ? `\n**Описание:** ${plane.description}` : ''}`,
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
    
    const type = interaction.options.getString("тип", true) as AircraftType;
    const name = interaction.options.getString("название", true);
    const br = interaction.options.getString("бр", true);
    const nation = interaction.options.getString("нация", true);
    const description = interaction.options.getString("описание");
    const id = interaction.options.getString("id") || name.toLowerCase().replace(/\s+/g, "_");
    
    const aircraft: Aircraft = {
      id,
      name,
      type,
      br,
      nation,
      description: description || undefined
    };
    
    addAircraft(aircraft);
    
    const embed = new EmbedBuilder()
      .setTitle("✅ Самолёт добавлен")
      .setDescription(`Самолёт **${name}** успешно добавлен в категорию **${getAircraftTypeName(type)}**`)
      .setColor(0x00ff00)
      .addFields(
        { name: "ID", value: id, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true },
        { name: "БР", value: br, inline: true },
        { name: "Нация", value: nation, inline: true }
      )
      .setTimestamp();
    
    if (description) {
      embed.addFields({ name: "Описание", value: description, inline: false });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${name}" добавлен пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при добавлении самолёта пользователем ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при добавлении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
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
    
    const type = interaction.options.getString("тип", true) as AircraftType;
    const aircraftId = interaction.options.getString("id", true);
    
    // Получаем информацию о самолёте перед удалением
    const data = loadAircraftData();
    const aircraft = data[type].find(a => a.id === aircraftId);
    
    if (!aircraft) {
      await interaction.reply({
        content: `❌ Самолёт с ID "${aircraftId}" не найден в категории ${getAircraftTypeName(type)}`,
        ephemeral: true
      });
      return;
    }
    
    removeAircraft(type, aircraftId);
    
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Самолёт удалён")
      .setDescription(`Самолёт **${aircraft.name}** успешно удалён из категории **${getAircraftTypeName(type)}**`)
      .setColor(0xff0000)
      .addFields(
        { name: "ID", value: aircraftId, inline: true },
        { name: "Название", value: aircraft.name, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${aircraft.name}" удалён пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при удалении самолёта пользователем ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: `❌ Ошибка при удалении самолёта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
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
    
    const type = interaction.options.getString("тип", true) as AircraftType;
    const aircraftId = interaction.options.getString("id", true);
    const name = interaction.options.getString("название");
    const br = interaction.options.getString("бр");
    const nation = interaction.options.getString("нация");
    const description = interaction.options.getString("описание");
    
    // Получаем текущие данные самолёта
    const data = loadAircraftData();
    const currentAircraft = data[type].find(a => a.id === aircraftId);
    
    if (!currentAircraft) {
      await interaction.reply({
        content: `❌ Самолёт с ID "${aircraftId}" не найден в категории ${getAircraftTypeName(type)}`,
        ephemeral: true
      });
      return;
    }
    
    // Обновляем только указанные поля
    const updatedAircraft: Aircraft = {
      ...currentAircraft,
      name: name || currentAircraft.name,
      br: br || currentAircraft.br,
      nation: nation || currentAircraft.nation,
      description: description !== null ? description : currentAircraft.description
    };
    
    updateAircraft(updatedAircraft);
    
    const embed = new EmbedBuilder()
      .setTitle("✏️ Самолёт обновлён")
      .setDescription(`Самолёт **${updatedAircraft.name}** успешно обновлён`)
      .setColor(0x00ff00)
      .addFields(
        { name: "ID", value: aircraftId, inline: true },
        { name: "Название", value: updatedAircraft.name, inline: true },
        { name: "Тип", value: getAircraftTypeName(type), inline: true },
        { name: "БР", value: updatedAircraft.br, inline: true },
        { name: "Нация", value: updatedAircraft.nation, inline: true }
      )
      .setTimestamp();
    
    if (updatedAircraft.description) {
      embed.addFields({ name: "Описание", value: updatedAircraft.description, inline: false });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    info(`[AIRCRAFT] Самолёт "${updatedAircraft.name}" обновлён пользователем ${interaction.user.tag}`);
    
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обновлении самолёта пользователем ${interaction.user.tag}:`, err);
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
          value: `**Нация:** ${plane.nation}\n**БР:** ${plane.br}\n**ID:** \`${plane.id}\`${plane.description ? `\n**Описание:** ${plane.description}` : ''}`,
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
}
