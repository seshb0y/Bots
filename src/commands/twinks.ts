import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import { info, error } from "../utils/logger.js";
import {
  loadTwinkHistory,
  createTwink,
  findTwinkById,
  findTwinkByUsername,
  updateTwink,
  deleteTwink,
  updateTwinkCredentials,
  updateTwinkUsername,
  addVehicleToTwink,
  removeVehicleFromTwink,
  updateVehicleInTwink,
  getAllTwinks,
  formatVehicleForDisplay,
  groupVehiclesByNation,
  findTwinksByBRRange
} from "../utils/twinks.js";
import { TwinkData, Vehicle, NationCode, VehicleType, NATION_NAMES, VEHICLE_TYPE_NAMES } from "../types/twinks";
import { TWINK_ADMIN_ROLE_IDS } from "../constants.js";

// Проверка прав доступа
export function hasTwinkAdminRole(interaction: ChatInputCommandInteraction | ModalSubmitInteraction): boolean {
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
  
  // Проверяем роли из константы TWINK_ADMIN_ROLE_IDS
  if ('roles' in member && member.roles && typeof member.roles === 'object' && 'cache' in member.roles) {
    try {
      const roleCache = member.roles.cache;
      return roleCache.some(role => TWINK_ADMIN_ROLE_IDS.includes(role.id));
    } catch (err) {
      // Игнорируем ошибки проверки ролей
    }
  }
  
  return false;
}

// Команда для справки по командам твинков
export async function twinkHelpCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    const embed = new EmbedBuilder()
      .setTitle('📚 Справка по командам управления твинками')
      .setDescription('Твинки — это полковые аккаунты War Thunder, где хранится информация о технике и учётных данных.\n\n⚠️ **Все команды доступны только офицерам и администраторам.**')
      .setColor(0x00ff00)
      .setTimestamp()
      .addFields(
        {
          name: '📋 `/twink-list`',
          value: 'Показывает список всех твинков с индикаторами:\n' +
                 '🔐 — есть логин и пароль\n' +
                 '🔓 — нет логина или пароля\n' +
                 '✅ — есть 2FA\n' +
                 '❌ — нет 2FA\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '🔍 `/twink-show username:<никнейм>`',
          value: 'Показывает подробную информацию о конкретном твинке:\n' +
                 '• Учётные данные (логин, пароль, 2FA, контакт)\n' +
                 '• Список всей техники с группировкой по нациям и типам\n' +
                 '• Метаданные (ID, даты создания/обновления)\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '🔎 `/twink-find br:<БР>`',
          value: 'Находит твинки с техникой под необходимый БР:\n' +
                 '• Указываете целевой БР (например, 8.0)\n' +
                 '• Команда ищет технику с БР от (целевой БР - 1.0) до целевого БР\n' +
                 '• Пример: при БР 8.0 найдёт технику с БР 7.0 - 8.0\n' +
                 '• Показывает твинки с логином, паролем, 2FA и списком подходящей техники\n' +
                 '• Результаты сортируются по количеству подходящей техники\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '➕ `/twink-create`',
          value: 'Создаёт новый твинк. Откроется форма для ввода:\n' +
                 '• Никнейм (обязательно)\n' +
                 '• Логин (опционально)\n' +
                 '• Пароль (опционально)\n' +
                 '• Двухфакторка (да/нет)\n' +
                 '• Контакт по 2FA (опционально)\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '✏️ `/twink-update username:<никнейм> field:<поле>`',
          value: 'Обновляет данные твинка. Можно изменить:\n' +
                 '• Никнейм\n' +
                 '• Логин\n' +
                 '• Пароль\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '🔐 `/twink-toggle-2fa username:<никнейм>`',
          value: 'Переключает статус двухфакторной авторизации у твинка.\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '🗑️ `/twink-delete username:<никнейм>`',
          value: 'Удаляет твинк. Потребуется подтверждение.\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '➕ `/twink-vehicle-add username:<никнейм>`',
          value: 'Добавляет технику к твинку:\n' +
                 '1. Выберите нацию из списка\n' +
                 '2. Выберите тип техники (наземная/самолёты/вертолёты)\n' +
                 '3. Введите название техники и BR\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '✏️ `/twink-vehicle-update username:<никнейм>`',
          value: 'Редактирует технику твинка:\n' +
                 '1. Выберите технику из списка\n' +
                 '2. Измените нацию через селектор (применяется сразу)\n' +
                 '3. Измените тип техники через селектор (применяется сразу)\n' +
                 '4. Нажмите кнопку для редактирования названия и BR\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '➖ `/twink-vehicle-remove username:<никнейм>`',
          value: 'Удаляет технику из твинка. Выберите технику из списка.\n\n' +
                 '⚠️ Доступно только офицерам',
          inline: false
        },
        {
          name: '🔐 Права доступа',
          value: '**Все команды твинков** (включая просмотр) доступны только:\n' +
                 '• Пользователям с ролями офицеров\n' +
                 '• Администраторам сервера\n\n' +
                 'Проверка прав выполняется автоматически при вызове любой команды.',
          inline: false
        },
        {
          name: '📝 Примечания',
          value: '• Все техники группируются по нациям и типам\n' +
                 '• BR техники отображается в порядке убывания\n' +
                 '• Пароли хранятся в открытом виде (для быстрого доступа)\n' +
                 '• Контакт по 2FA — это Discord пользователь, к которому можно обратиться для доступа к аккаунту',
          inline: false
        }
      )
      .setFooter({ text: 'Для получения помощи по конкретной команде используйте /help' });
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (err) {
    error(`[TWINK] Ошибка при показе справки:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при загрузке справки",
      ephemeral: true
    });
  }
}

// Команда для просмотра списка всех твинков
export async function twinkListCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    const twinks = getAllTwinks();
    
    if (twinks.length === 0) {
      await interaction.reply({
        content: "📋 Список твинков пуст. Используйте `/twink-create` для создания нового твинка.",
        ephemeral: true
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle("📋 Список твинков")
      .setDescription(`Всего твинков: **${twinks.length}**`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    // Показываем первые 25 твинков (лимит Discord)
    const displayTwinks = twinks.slice(0, 25);
    const twinkList = displayTwinks.map((twink, idx) => {
      const vehicleCount = twink.vehicles.length;
      const hasCreds = twink.login && twink.password ? "🔐" : "🔓";
      const has2FA = twink.has2FA ? "✅" : "❌";
      return `${idx + 1}. ${hasCreds} ${twink.username} (${vehicleCount} техники) ${has2FA}`;
    }).join('\n');
    
    embed.addFields({
      name: "Твинки",
      value: twinkList || "Нет твинков",
      inline: false
    });
    
    if (twinks.length > 25) {
      embed.setFooter({ text: `Показано 25 из ${twinks.length} твинков` });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при показе списка твинков для ${interaction.user.tag}:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при загрузке списка твинков",
      ephemeral: true
    });
  }
}

// Команда для просмотра конкретного твинка
export async function twinkShowCommand(interaction: ChatInputCommandInteraction) {
  try {
    const username = interaction.options.getString("username", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    const embed = createTwinkEmbed(twink);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при показе твинка:`, err);
    await interaction.reply({
      content: "❌ Произошла ошибка при загрузке информации о твинке",
      ephemeral: true
    });
  }
}

// Команда для создания твинка
export async function twinkCreateCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками. Требуется роль офицера или выше.",
        ephemeral: true
      });
      return;
    }
    
    // Создаём модальное окно
    const modal = new ModalBuilder()
      .setCustomId('twink_create_modal')
      .setTitle('Создать новый твинк');
    
    const usernameInput = new TextInputBuilder()
      .setCustomId('twink_username')
      .setLabel('Имя пользователя')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Например: _MoonPhase')
      .setRequired(true)
      .setMaxLength(100);
    
    const loginInput = new TextInputBuilder()
      .setCustomId('twink_login')
      .setLabel('Логин (опционально)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Логин аккаунта')
      .setRequired(false)
      .setMaxLength(100);
    
    const passwordInput = new TextInputBuilder()
      .setCustomId('twink_password')
      .setLabel('Пароль (опционально)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Пароль аккаунта')
      .setRequired(false)
      .setMaxLength(100);
    
    const twoFactorInput = new TextInputBuilder()
      .setCustomId('twink_twofactor')
      .setLabel('Двухфакторка (да/нет)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('да или нет')
      .setRequired(false)
      .setMaxLength(10);
    
    const twoFactorContactInput = new TextInputBuilder()
      .setCustomId('twink_twofactor_contact')
      .setLabel('Контакт по 2FA (опционально)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Discord пользователь или никнейм')
      .setRequired(false)
      .setMaxLength(100);
    
    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(loginInput);
    const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(passwordInput);
    const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(twoFactorInput);
    const row5 = new ActionRowBuilder<TextInputBuilder>().addComponents(twoFactorContactInput);
    
    modal.addComponents(row1, row2, row3, row4, row5);
    
    await interaction.showModal(modal);
    
  } catch (err) {
    error(`[TWINK] Ошибка при создании модального окна:`, err);
    await interaction.reply({
      content: `❌ Ошибка при создании формы: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для обновления твинка
export async function twinkUpdateCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками. Требуется роль офицера или выше.",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.options.getString("username", true);
    const field = interaction.options.getString("field", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    // Создаём модальное окно для обновления
    const modal = new ModalBuilder()
      .setCustomId(`twink_update_modal_${twink.id}_${field}`)
      .setTitle(`Обновить ${field === 'username' ? 'никнейм' : field}`);
    
    const valueInput = new TextInputBuilder()
      .setCustomId('twink_update_value')
      .setLabel(field === 'username' ? 'Новый никнейм' : field === 'login' ? 'Новый логин' : field === 'password' ? 'Новый пароль' : 'Значение')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`Введите новое значение для ${field}`)
      .setRequired(true)
      .setMaxLength(100);
    
    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(valueInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
    
  } catch (err) {
    error(`[TWINK] Ошибка при обновлении твинка:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для переключения 2FA
export async function twinkToggle2FACommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками. Требуется роль офицера или выше.",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.options.getString("username", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    const new2FA = !twink.has2FA;
    updateTwinkCredentials(twink.id, undefined, undefined, new2FA, interaction.user.id);
    
    await interaction.reply({
      content: `✅ 2FA для твинка **${twink.username}** ${new2FA ? 'включена' : 'выключена'}`,
      ephemeral: true
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при переключении 2FA:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для удаления твинка
export async function twinkDeleteCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками. Требуется роль офицера или выше.",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.options.getString("username", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    const vehicleCount = twink.vehicles.length;
    
    // Создаём кнопки подтверждения
    const confirmButton = new ButtonBuilder()
      .setCustomId(`twink_delete_confirm_${twink.id}`)
      .setLabel("Удалить")
      .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
      .setCustomId(`twink_delete_cancel_${twink.id}`)
      .setLabel("Отмена")
      .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);
    
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Подтверждение удаления")
      .setDescription(`Вы уверены, что хотите удалить твинк **${username}**?\n\nЭто действие необратимо!\n\nТехники: ${vehicleCount}`)
      .setColor(0xff0000);
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при удалении твинка:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для добавления техники
export async function twinkVehicleAddCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками. Требуется роль офицера или выше.",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.options.getString("username", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    // Создаём селекторы для нации и типа, затем модальное окно
    const nationSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_nation_select_${twink.id}`)
      .setPlaceholder('Выберите нацию')
      .addOptions([
        { label: 'Германия', value: 'de' },
        { label: 'СССР/Россия', value: 'ru' },
        { label: 'США', value: 'us' },
        { label: 'Япония', value: 'jp' },
        { label: 'Великобритания', value: 'gb' },
        { label: 'Франция', value: 'fr' },
        { label: 'Италия', value: 'it' },
        { label: 'Китай', value: 'ch' },
        { label: 'Израиль', value: 'is' },
        { label: 'Швеция', value: 'sw' }
      ]);
    
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_type_select_${twink.id}`)
      .setPlaceholder('Выберите тип техники')
      .addOptions([
        { label: 'Наземная техника', value: 'ground' },
        { label: 'Самолёты', value: 'airplane' },
        { label: 'Вертолёты', value: 'helicopter' }
      ]);
    
    const nationRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(nationSelect);
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    
    const embed = new EmbedBuilder()
      .setTitle('➕ Добавление техники')
      .setDescription(`Выберите нацию и тип техники для твинка **${twink.username}**.\nПосле выбора откроется форма для ввода названия и BR.`)
      .setColor(0x00ff00);
    
    await interaction.reply({ embeds: [embed], components: [nationRow, typeRow], ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при добавлении техники:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для удаления техники
export async function twinkVehicleRemoveCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками. Требуется роль офицера или выше.",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.options.getString("username", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    if (twink.vehicles.length === 0) {
      await interaction.reply({
        content: `❌ У твинка **${twink.username}** нет техники для удаления`,
        ephemeral: true
      });
      return;
    }
    
    // Создаём селектор техники
    const options = twink.vehicles.map((vehicle: Vehicle, idx: number) => ({
      label: `${vehicle.name} (BR ${vehicle.br})`,
      description: `${NATION_NAMES[vehicle.nation]} - ${VEHICLE_TYPE_NAMES[vehicle.type]}`,
      value: idx.toString()
    }));
    
    // Discord ограничивает до 25 опций
    const selectOptions = options.slice(0, 25);
    
    const vehicleSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_remove_select_${twink.id}`)
      .setPlaceholder('Выберите технику для удаления')
      .addOptions(selectOptions);
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(vehicleSelect);
    
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Удаление техники')
      .setDescription(`Выберите технику для удаления из твинка **${twink.username}**:`)
      .setColor(0xff0000);
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при удалении техники:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Вспомогательная функция для создания списка техники с кнопками
function createVehicleListWithButtons(twink: TwinkData): { embed: EmbedBuilder; buttonRows: ActionRowBuilder<ButtonBuilder>[] } {
  // Группируем технику по нациям и типам
  const grouped = groupVehiclesByNation(twink.vehicles);
  const vehicleList: string[] = [];
  const buttons: ButtonBuilder[] = [];
  
  // Создаём маппинг техники по индексам для точного определения индекса
  const vehicleIndexMap = new Map<string, number>();
  twink.vehicles.forEach((vehicle: Vehicle, index: number) => {
    const key = `${vehicle.name}|${vehicle.br}|${vehicle.nation}|${vehicle.type}`;
    // Если ключ уже есть, это дубликат - используем первый индекс
    if (!vehicleIndexMap.has(key)) {
      vehicleIndexMap.set(key, index);
    }
  });
  
  // Сортируем технику и создаём список с кнопками
  Object.entries(grouped).forEach(([key, vehicles]) => {
    const [nation, type] = key.split('_');
    const nationName = NATION_NAMES[nation as NationCode];
    const typeName = VEHICLE_TYPE_NAMES[type as VehicleType];
    
    // Сортируем по BR (убывание)
    vehicles.sort((a, b) => b.br - a.br);
    
    vehicleList.push(`**${nationName} - ${typeName}:**`);
    
    vehicles.forEach((vehicle) => {
      const mapKey = `${vehicle.name}|${vehicle.br}|${vehicle.nation}|${vehicle.type}`;
      const vehicleIndex = vehicleIndexMap.get(mapKey);
      
      if (vehicleIndex !== undefined) {
        vehicleList.push(`• **${vehicle.br}** ${vehicle.name}`);
        
        // Создаём кнопку для каждой техники с корректным индексом
        const button = new ButtonBuilder()
          .setCustomId(`twink_vehicle_update_btn_${twink.id}_${vehicleIndex}`)
          .setLabel(`Изменить ${vehicle.name.substring(0, 20)}`)
          .setStyle(ButtonStyle.Secondary);
        
        buttons.push(button);
        
      } else {
        error(`[TWINK-VEHICLE-UPDATE] Не найден индекс для техники: ${vehicle.name} (BR ${vehicle.br}, ${nationName}, ${typeName})`);
      }
    });
    
    vehicleList.push(''); // Пустая строка между группами
  });
  
  // Discord ограничивает до 5 ActionRows и 5 компонентов в каждом (25 кнопок максимум)
  const maxButtons = 25;
  const displayButtons = buttons.slice(0, maxButtons);
  
  // Разбиваем кнопки на ряды (по 5 в каждом)
  const buttonRows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < displayButtons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(displayButtons.slice(i, i + 5));
    buttonRows.push(row);
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`✏️ Редактирование техники твинка: ${twink.username}`)
    .setDescription(vehicleList.join('\n'))
    .setColor(0xffaa00)
    .setFooter({ 
      text: buttons.length > maxButtons 
        ? `Показано ${maxButtons} из ${buttons.length} техники. Для редактирования остальных используйте команду повторно.`
        : `Нажмите кнопку "Изменить" у нужной техники для редактирования.`
    });
  
  return { embed, buttonRows };
}

// Команда для редактирования техники
export async function twinkVehicleUpdateCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.options.getString("username", true);
    
    // Ищем твинк по username
    const twink = findTwinkByUsername(username);
    
    if (!twink) {
      await interaction.reply({
        content: `❌ Твинк с именем пользователя "${username}" не найден`,
        ephemeral: true
      });
      return;
    }
    
    if (twink.vehicles.length === 0) {
      await interaction.reply({
        content: `❌ У твинка **${twink.username}** нет техники для редактирования`,
        ephemeral: true
      });
      return;
    }
    
    const { embed, buttonRows } = createVehicleListWithButtons(twink);
    
    await interaction.reply({ 
      embeds: [embed], 
      components: buttonRows,
      ephemeral: true 
    });
    
  } catch (err) {
    error(`[TWINK] Ошибка при редактировании техники:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Команда для поиска твинков по БР
export async function twinkFindCommand(interaction: ChatInputCommandInteraction) {
  try {
    
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const targetBR = interaction.options.getNumber("br", true);
    
    if (targetBR < 0 || targetBR > 15) {
      await interaction.reply({
        content: "❌ БР должен быть в диапазоне от 0 до 15",
        ephemeral: true
      });
      return;
    }
    
    const minBR = targetBR - 1.0;
    const maxBR = targetBR;
    
    // Ищем твинки с техникой в диапазоне БР
    const results = findTwinksByBRRange(targetBR);
    
    if (results.length === 0) {
      await interaction.reply({
        content: `❌ Не найдено твинков с техникой в диапазоне БР ${minBR.toFixed(1)} - ${maxBR.toFixed(1)}`,
        ephemeral: true
      });
      return;
    }
    
    // Сортируем по количеству подходящей техники (по убыванию)
    results.sort((a, b) => b.matchingVehicles.length - a.matchingVehicles.length);
    
    // Создаём embed с результатами
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Поиск твинков по БР ${targetBR.toFixed(1)}`)
      .setDescription(`Найдено твинков: **${results.length}**\nДиапазон БР: **${minBR.toFixed(1)} - ${maxBR.toFixed(1)}**`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    // Добавляем информацию о твинках
    const embeds: EmbedBuilder[] = [embed];
    let currentEmbedIndex = 0;
    let currentEmbedLength = (embed.data.description || '').length;
    
    results.forEach((result, index) => {
      const twink = result.twink;
      const vehicles = result.matchingVehicles;
      
      // Сортируем технику по БР (по убыванию)
      const sortedVehicles = [...vehicles].sort((a, b) => b.br - a.br);
      
      // Формируем список техники
      const vehicleList = sortedVehicles.map((vehicle: Vehicle) => {
        const nationName = NATION_NAMES[vehicle.nation];
        const typeName = VEHICLE_TYPE_NAMES[vehicle.type];
        return `• **${vehicle.name}** (BR ${vehicle.br}, ${nationName}, ${typeName})`;
      }).join('\n');
      
      // Формируем поле для твинка
      let fieldName = `${index + 1}. ${twink.username}`;
      let fieldValue = '';
      
      if (twink.login) {
        fieldValue += `Логин: ${twink.login}\n`;
      }
      if (twink.password) {
        fieldValue += `Пароль: ${twink.password}\n`;
      }
      if (twink.has2FA && twink.twoFactorContact) {
        fieldValue += `2FA: ${twink.twoFactorContact}\n`;
      }
      fieldValue += `**Подходящая техника (${vehicles.length}):**\n${vehicleList}`;
      
      // Проверяем, поместится ли поле в текущий embed
      const fieldLength = fieldName.length + fieldValue.length;
      
      // Discord ограничивает: embed до 6000 символов, field.value до 1024 символов
      if (fieldValue.length > 1024) {
        fieldValue = fieldValue.substring(0, 1021) + '...';
      }
      
      // Если текущий embed переполнится, создаём новый
      if (currentEmbedLength + fieldLength > 5500 || embeds[currentEmbedIndex].data.fields?.length === 25) {
        const newEmbed = new EmbedBuilder()
          .setTitle(`🔍 Поиск твинков по БР ${targetBR.toFixed(1)} (продолжение)`)
          .setDescription(`Найдено твинков: **${results.length}**\nДиапазон БР: **${minBR.toFixed(1)} - ${maxBR.toFixed(1)}**`)
          .setColor(0x00ff00)
          .setTimestamp();
        embeds.push(newEmbed);
        currentEmbedIndex++;
        currentEmbedLength = (newEmbed.data.description || '').length;
      }
      
      embeds[currentEmbedIndex].addFields({
        name: fieldName.length > 256 ? fieldName.substring(0, 253) + '...' : fieldName,
        value: fieldValue,
        inline: false
      });
      
      currentEmbedLength += fieldLength;
    });
    
    await interaction.reply({ embeds, ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при поиске твинков по БР:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик модального окна создания твинка
export async function handleTwinkCreateModal(interaction: ModalSubmitInteraction) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const username = interaction.fields.getTextInputValue('twink_username');
    const login = interaction.fields.getTextInputValue('twink_login') || undefined;
    const password = interaction.fields.getTextInputValue('twink_password') || undefined;
    const twoFactorStr = interaction.fields.getTextInputValue('twink_twofactor')?.toLowerCase().trim();
    const has2FA = twoFactorStr === 'да' || twoFactorStr === 'yes' || twoFactorStr === 'true' || twoFactorStr === '1';
    const twoFactorContact = interaction.fields.getTextInputValue('twink_twofactor_contact') || undefined;
    
    const twink = createTwink(username, interaction.user.id, login, password, has2FA, twoFactorContact);
    
    const embed = createTwinkEmbed(twink);
    await interaction.reply({
      content: `✅ Твинк **${twink.username}** успешно создан!`,
      embeds: [embed],
      ephemeral: true
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке модального окна создания:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик модального окна обновления твинка
export async function handleTwinkUpdateModal(interaction: ModalSubmitInteraction) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_update_modal_(.+)_(.+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат модального окна",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, field] = match;
    const value = interaction.fields.getTextInputValue('twink_update_value');
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (field === 'username') {
      updateTwinkUsername(twinkId, value, interaction.user.id);
    } else if (field === 'login') {
      updateTwinkCredentials(twinkId, value, undefined, undefined, interaction.user.id);
    } else if (field === 'password') {
      updateTwinkCredentials(twinkId, undefined, value, undefined, interaction.user.id);
    } else {
      await interaction.reply({
        content: `❌ Неизвестное поле: ${field}`,
        ephemeral: true
      });
      return;
    }
    
    const updatedTwink = findTwinkById(twinkId);
    if (!updatedTwink) {
      await interaction.reply({
        content: "❌ Ошибка при обновлении твинка",
        ephemeral: true
      });
      return;
    }
    
    const embed = createTwinkEmbed(updatedTwink);
    await interaction.reply({
      content: `✅ Поле **${field}** успешно обновлено!`,
      embeds: [embed],
      ephemeral: true
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке модального окна обновления:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора нации для добавления техники
export async function handleTwinkVehicleNationSelect(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_nation_select_(.+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат селектора",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId] = match;
    const nation = interaction.values[0] as NationCode;
    
    // Сохраняем выбранную нацию во временном состоянии (через компонент)
    const twink = findTwinkById(twinkId);
    if (!twink) {
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    // Показываем селектор типа техники
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_type_select_${twinkId}_${nation}`)
      .setPlaceholder('Выберите тип техники')
      .addOptions([
        { label: 'Наземная техника', value: 'ground' },
        { label: 'Самолёты', value: 'airplane' },
        { label: 'Вертолёты', value: 'helicopter' }
      ]);
    
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    
    const embed = new EmbedBuilder()
      .setTitle('➕ Добавление техники')
      .setDescription(`Выбрана нация: **${NATION_NAMES[nation]}**\nВыберите тип техники для твинка **${twink.username}**.`)
      .setColor(0x00ff00);
    
    await interaction.update({ embeds: [embed], components: [typeRow], ephemeral: true });
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке селектора нации:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора типа для добавления техники
export async function handleTwinkVehicleTypeSelect(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_type_select_(.+)_(.+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат селектора",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, nation] = match;
    const type = interaction.values[0] as VehicleType;
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    // Открываем модальное окно для названия и BR
    const modal = new ModalBuilder()
      .setCustomId(`twink_vehicle_add_modal_${twinkId}_${nation}_${type}`)
      .setTitle('Добавить технику');
    
    const nameInput = new TextInputBuilder()
      .setCustomId('vehicle_name')
      .setLabel('Название техники')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Например: Leopard A7')
      .setRequired(true)
      .setMaxLength(100);
    
    const brInput = new TextInputBuilder()
      .setCustomId('vehicle_br')
      .setLabel('Боевой рейтинг')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Например: 12.0 или 5.7')
      .setRequired(true)
      .setMaxLength(10);
    
    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(brInput);
    
    modal.addComponents(row1, row2);
    
    await interaction.showModal(modal);
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке селектора типа:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик модального окна добавления техники
export async function handleTwinkVehicleAddModal(interaction: ModalSubmitInteraction) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_add_modal_(.+)_(.+)_(.+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат модального окна",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, nation, type] = match;
    
    const name = interaction.fields.getTextInputValue('vehicle_name');
    const brStr = interaction.fields.getTextInputValue('vehicle_br');
    
    const br = parseFloat(brStr);
    if (isNaN(br)) {
      await interaction.reply({
        content: "❌ Неверный формат боевого рейтинга",
        ephemeral: true
      });
      return;
    }
    
    const finalNation = nation as NationCode;
    const finalType = type as VehicleType;
    
    const vehicle: Vehicle = { name, br, nation: finalNation, type: finalType };
    addVehicleToTwink(twinkId, vehicle, interaction.user.id);
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    const embed = createTwinkEmbed(twink);
    await interaction.reply({
      content: `✅ Техника **${name}** успешно добавлена!`,
      embeds: [embed],
      ephemeral: true
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке модального окна добавления техники:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик селектора удаления техники
export async function handleTwinkVehicleRemoveSelect(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_remove_select_(.+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат селектора",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId] = match;
    const vehicleIndex = parseInt(interaction.values[0]);
    
    removeVehicleFromTwink(twinkId, vehicleIndex, interaction.user.id);
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    const embed = createTwinkEmbed(twink);
    await interaction.reply({
      content: `✅ Техника успешно удалена!`,
      embeds: [embed],
      ephemeral: true
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке селектора удаления техники:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик кнопки подтверждения удаления твинка
export async function handleTwinkDeleteButton(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    
    if (customId.startsWith('twink_delete_cancel_')) {
      await interaction.update({
        content: "❌ Удаление отменено",
        embeds: [],
        components: []
      });
      return;
    }
    
    const match = customId.match(/^twink_delete_confirm_(.+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат кнопки",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId] = match;
    const twink = findTwinkById(twinkId);
    
    if (!twink) {
      await interaction.update({
        content: "❌ Твинк не найден",
        embeds: [],
        components: []
      });
      return;
    }
    
    const username = twink.username;
    deleteTwink(twinkId);
    
    await interaction.update({
      content: `✅ Твинк **${username}** успешно удалён`,
      embeds: [],
      components: []
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке кнопки удаления:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Создаёт embed для отображения твинка
function createTwinkEmbed(twink: TwinkData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`📋 Твинк: ${twink.username}`)
    .setColor(0x00ff00)
    .setTimestamp(new Date(twink.updatedAt));
  
  // Учётные данные
  const credsField = [];
  if (twink.login) credsField.push(`**Логин:** ${twink.login}`);
  if (twink.password) credsField.push(`**Пароль:** ${twink.password}`);
  credsField.push(`**Двухфакторка:** ${twink.has2FA ? '✅ Да' : '❌ Нет'}`);
  if (twink.twoFactorContact) {
    credsField.push(`**Контакт по 2FA:** ${twink.twoFactorContact}`);
  }
  
  if (credsField.length > 0) {
    embed.addFields({
      name: "🔐 Учётные данные",
      value: credsField.join('\n'),
      inline: false
    });
  }
  
  // Техника
  if (twink.vehicles.length === 0) {
    embed.addFields({
      name: "🚗 Техника",
      value: "Нет техники",
      inline: false
    });
  } else {
    const grouped = groupVehiclesByNation(twink.vehicles);
    const vehicleFields: string[] = [];
    
    Object.entries(grouped).forEach(([key, vehicles]) => {
      const [nation, type] = key.split('_');
      const nationName = NATION_NAMES[nation as NationCode];
      const typeName = VEHICLE_TYPE_NAMES[type as VehicleType];
      
      // Сортируем по BR (убывание)
      vehicles.sort((a, b) => b.br - a.br);
      
      const vehicleList = vehicles.map(v => `• **${v.br}** ${v.name}`).join('\n');
      vehicleFields.push(`**${nationName} - ${typeName}:**\n${vehicleList}`);
    });
    
    // Разбиваем на поля (лимит Discord 1024 символа)
    vehicleFields.forEach((fieldText, idx) => {
      if (fieldText.length > 1024) {
        // Разбиваем длинное поле
        const chunks = fieldText.match(/.{1,1024}/g) || [];
        chunks.forEach((chunk, chunkIdx) => {
          embed.addFields({
            name: idx === 0 && chunkIdx === 0 ? "🚗 Техника" : "\u200b",
            value: chunk,
            inline: false
          });
        });
      } else {
        embed.addFields({
          name: idx === 0 ? "🚗 Техника" : "\u200b",
          value: fieldText,
          inline: false
        });
      }
    });
  }
  
  // Метаданные
  embed.addFields({
    name: "📊 Информация",
    value: `**ID:** ${twink.id}\n**Создан:** <t:${Math.floor(new Date(twink.createdAt).getTime() / 1000)}:R>\n**Обновлён:** <t:${Math.floor(new Date(twink.updatedAt).getTime() / 1000)}:R>`,
    inline: false
  });
  
  embed.setFooter({ text: `Всего техники: ${twink.vehicles.length}` });
  
  return embed;
}

// Обработчик кнопки редактирования техники
export async function handleTwinkVehicleUpdateButton(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_update_btn_(.+)_(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат кнопки",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, vehicleIndexStr] = match;
    const vehicleIndex = parseInt(vehicleIndexStr);
    
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      error(`[TWINK-VEHICLE-UPDATE-BUTTON] Твинк с ID ${twinkId} не найден`);
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
      error(`[TWINK-VEHICLE-UPDATE-BUTTON] Некорректный индекс техники: ${vehicleIndex} (всего техники: ${twink.vehicles.length})`);
      
      // Если у твинка есть техника, отправляем обновлённый список
      if (twink.vehicles.length > 0) {
        const { embed, buttonRows } = createVehicleListWithButtons(twink);
        await interaction.reply({
          content: `⚠️ Индекс техники устарел (техника была удалена). Используйте обновлённый список ниже:`,
          embeds: [embed],
          components: buttonRows,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Некорректный индекс техники. У твинка больше нет техники.`,
          ephemeral: true
        });
      }
      return;
    }
    
    const vehicle = twink.vehicles[vehicleIndex];
    
    // Создаём селекторы для нации и типа с маппингом названий
    const nationSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_update_nation_${twinkId}_${vehicleIndex}`)
      .setPlaceholder('Выберите нацию')
      .addOptions([
        { label: 'Германия', value: 'de', default: vehicle.nation === 'de' },
        { label: 'СССР/Россия', value: 'ru', default: vehicle.nation === 'ru' },
        { label: 'США', value: 'us', default: vehicle.nation === 'us' },
        { label: 'Япония', value: 'jp', default: vehicle.nation === 'jp' },
        { label: 'Великобритания', value: 'gb', default: vehicle.nation === 'gb' },
        { label: 'Франция', value: 'fr', default: vehicle.nation === 'fr' },
        { label: 'Италия', value: 'it', default: vehicle.nation === 'it' },
        { label: 'Китай', value: 'ch', default: vehicle.nation === 'ch' },
        { label: 'Израиль', value: 'is', default: vehicle.nation === 'is' },
        { label: 'Швеция', value: 'sw', default: vehicle.nation === 'sw' }
      ]);
    
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_update_type_${twinkId}_${vehicleIndex}`)
      .setPlaceholder('Выберите тип техники')
      .addOptions([
        { label: 'Наземная техника', value: 'ground', default: vehicle.type === 'ground' },
        { label: 'Самолёты', value: 'airplane', default: vehicle.type === 'airplane' },
        { label: 'Вертолёты', value: 'helicopter', default: vehicle.type === 'helicopter' }
      ]);
    
    // Кнопки для редактирования названия/BR и удаления
    const editNameBrButton = new ButtonBuilder()
      .setCustomId(`twink_vehicle_update_edit_modal_${twinkId}_${vehicleIndex}`)
      .setLabel('✏️ Редактировать название и BR')
      .setStyle(ButtonStyle.Primary);
    
    const deleteButton = new ButtonBuilder()
      .setCustomId(`twink_vehicle_delete_btn_${twinkId}_${vehicleIndex}`)
      .setLabel('🗑️ Удалить технику')
      .setStyle(ButtonStyle.Danger);
    
    const nationRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(nationSelect);
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(editNameBrButton, deleteButton);
    
    const embed = new EmbedBuilder()
      .setTitle('✏️ Редактирование техники')
      .setDescription(`**Текущая техника:** ${vehicle.name} (BR ${vehicle.br})\n${NATION_NAMES[vehicle.nation]} - ${VEHICLE_TYPE_NAMES[vehicle.type]}\n\n• Выберите нацию и тип техники из списков ниже\n• Нажмите кнопку для редактирования названия и BR\n• Нажмите кнопку для удаления техники`)
      .setColor(0xffaa00);
    
    await interaction.reply({ 
      embeds: [embed], 
      components: [nationRow, typeRow, buttonRow],
      ephemeral: true 
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при открытии модального окна редактирования:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    }
  }
}

// Обработчик кнопки открытия модального окна для редактирования названия и BR
export async function handleTwinkVehicleUpdateEditModalButton(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_update_edit_modal_(.+)_(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат кнопки",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, vehicleIndexStr] = match;
    const vehicleIndex = parseInt(vehicleIndexStr);
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
      error(`[TWINK-VEHICLE-UPDATE-EDIT-MODAL] Некорректный индекс техники: ${vehicleIndex} (всего техники: ${twink.vehicles.length})`);
      
      // Если у твинка есть техника, отправляем обновлённый список
      if (twink.vehicles.length > 0) {
        const { embed, buttonRows } = createVehicleListWithButtons(twink);
        await interaction.reply({
          content: `⚠️ Индекс техники устарел (техника была удалена). Используйте обновлённый список ниже:`,
          embeds: [embed],
          components: buttonRows,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Некорректный индекс техники. У твинка больше нет техники.`,
          ephemeral: true
        });
      }
      return;
    }
    
    const vehicle = twink.vehicles[vehicleIndex];
    
    // Создаём модальное окно для редактирования названия и BR
    const modal = new ModalBuilder()
      .setCustomId(`twink_vehicle_update_modal_${twinkId}_${vehicleIndex}`)
      .setTitle(`Редактирование: ${vehicle.name}`);
    
    const nameInput = new TextInputBuilder()
      .setCustomId('vehicle_name')
      .setLabel('Название техники')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Введите название техники')
      .setValue(vehicle.name)
      .setRequired(true)
      .setMaxLength(100);
    
    const brInput = new TextInputBuilder()
      .setCustomId('vehicle_br')
      .setLabel('BR (Battle Rating)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Например: 5.7')
      .setValue(vehicle.br.toString())
      .setRequired(true)
      .setMaxLength(10);
    
    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(brInput);
    modal.addComponents(row1, row2);
    
    await interaction.showModal(modal);
    
  } catch (err) {
    error(`[TWINK] Ошибка при открытии модального окна:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    }
  }
}

// Обработчик селектора нации при редактировании
export async function handleTwinkVehicleUpdateNationSelect(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_update_nation_(.+)_(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат селектора",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, vehicleIndexStr] = match;
    const vehicleIndex = parseInt(vehicleIndexStr);
    const nation = interaction.values[0] as NationCode;
    
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      error(`[TWINK-VEHICLE-UPDATE-NATION] Твинк с ID ${twinkId} не найден`);
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
      error(`[TWINK-VEHICLE-UPDATE-NATION] Некорректный индекс техники: ${vehicleIndex} (всего техники: ${twink.vehicles.length})`);
      
      // Если у твинка есть техника, отправляем обновлённый список
      if (twink.vehicles.length > 0) {
        const { embed, buttonRows } = createVehicleListWithButtons(twink);
        await interaction.reply({
          content: `⚠️ Индекс техники устарел (техника была удалена). Используйте обновлённый список ниже:`,
          embeds: [embed],
          components: buttonRows,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Некорректный индекс техники. У твинка больше нет техники.`,
          ephemeral: true
        });
      }
      return;
    }
    
    const oldVehicle = { ...twink.vehicles[vehicleIndex] };
    const success = updateVehicleInTwink(twinkId, vehicleIndex, { nation }, interaction.user.id);
    
    if (!success) {
      error(`[TWINK-VEHICLE-UPDATE-NATION] Ошибка при обновлении нации техники`);
      await interaction.reply({
        content: "❌ Ошибка при обновлении нации техники",
        ephemeral: true
      });
      return;
    }
    
    
    const updatedTwink = findTwinkById(twinkId);
    const updatedVehicle = updatedTwink?.vehicles[vehicleIndex];
    
    if (!updatedVehicle) {
      await interaction.reply({
        content: "❌ Ошибка при обновлении техники",
        ephemeral: true
      });
      return;
    }
    
    // Обновляем embed с новой информацией
    const nationSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_update_nation_${twinkId}_${vehicleIndex}`)
      .setPlaceholder('Выберите нацию')
      .addOptions([
        { label: 'Германия', value: 'de', default: updatedVehicle.nation === 'de' },
        { label: 'СССР/Россия', value: 'ru', default: updatedVehicle.nation === 'ru' },
        { label: 'США', value: 'us', default: updatedVehicle.nation === 'us' },
        { label: 'Япония', value: 'jp', default: updatedVehicle.nation === 'jp' },
        { label: 'Великобритания', value: 'gb', default: updatedVehicle.nation === 'gb' },
        { label: 'Франция', value: 'fr', default: updatedVehicle.nation === 'fr' },
        { label: 'Италия', value: 'it', default: updatedVehicle.nation === 'it' },
        { label: 'Китай', value: 'ch', default: updatedVehicle.nation === 'ch' },
        { label: 'Израиль', value: 'is', default: updatedVehicle.nation === 'is' },
        { label: 'Швеция', value: 'sw', default: updatedVehicle.nation === 'sw' }
      ]);
    
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_update_type_${twinkId}_${vehicleIndex}`)
      .setPlaceholder('Выберите тип техники')
      .addOptions([
        { label: 'Наземная техника', value: 'ground', default: updatedVehicle.type === 'ground' },
        { label: 'Самолёты', value: 'airplane', default: updatedVehicle.type === 'airplane' },
        { label: 'Вертолёты', value: 'helicopter', default: updatedVehicle.type === 'helicopter' }
      ]);
    
    const editNameBrButton = new ButtonBuilder()
      .setCustomId(`twink_vehicle_update_edit_modal_${twinkId}_${vehicleIndex}`)
      .setLabel('✏️ Редактировать название и BR')
      .setStyle(ButtonStyle.Primary);
    
    const deleteButton = new ButtonBuilder()
      .setCustomId(`twink_vehicle_delete_btn_${twinkId}_${vehicleIndex}`)
      .setLabel('🗑️ Удалить технику')
      .setStyle(ButtonStyle.Danger);
    
    const nationRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(nationSelect);
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(editNameBrButton, deleteButton);
    
    const embed = new EmbedBuilder()
      .setTitle('✏️ Редактирование техники')
      .setDescription(`**Текущая техника:** ${updatedVehicle.name} (BR ${updatedVehicle.br})\n${NATION_NAMES[updatedVehicle.nation]} - ${VEHICLE_TYPE_NAMES[updatedVehicle.type]}\n\n✅ Нация обновлена!\n\n• Выберите тип техники из списка ниже\n• Нажмите кнопку для редактирования названия и BR\n• Нажмите кнопку для удаления техники`)
      .setColor(0x00ff00);
    
    await interaction.update({ 
      embeds: [embed], 
      components: [nationRow, typeRow, buttonRow],
      ephemeral: true 
    });
    
    // Отправляем обновлённый список техники после изменения
    if (updatedTwink) {
      const { embed: listEmbed, buttonRows: listButtonRows } = createVehicleListWithButtons(updatedTwink);
      await interaction.followUp({
        content: `📋 Обновлённый список техники:`,
        embeds: [listEmbed],
        components: listButtonRows,
        ephemeral: true
      });
    }
    
  } catch (err) {
    error(`[TWINK] Ошибка при обновлении нации техники:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    }
  }
}

// Обработчик селектора типа техники при редактировании
export async function handleTwinkVehicleUpdateTypeSelect(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_update_type_(.+)_(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат селектора",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, vehicleIndexStr] = match;
    const vehicleIndex = parseInt(vehicleIndexStr);
    const type = interaction.values[0] as VehicleType;
    
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      error(`[TWINK-VEHICLE-UPDATE-TYPE] Твинк с ID ${twinkId} не найден`);
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
      error(`[TWINK-VEHICLE-UPDATE-TYPE] Некорректный индекс техники: ${vehicleIndex} (всего техники: ${twink.vehicles.length})`);
      
      // Если у твинка есть техника, отправляем обновлённый список
      if (twink.vehicles.length > 0) {
        const { embed, buttonRows } = createVehicleListWithButtons(twink);
        await interaction.reply({
          content: `⚠️ Индекс техники устарел (техника была удалена). Используйте обновлённый список ниже:`,
          embeds: [embed],
          components: buttonRows,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Некорректный индекс техники. У твинка больше нет техники.`,
          ephemeral: true
        });
      }
      return;
    }
    
    const oldVehicle = { ...twink.vehicles[vehicleIndex] };
    const success = updateVehicleInTwink(twinkId, vehicleIndex, { type }, interaction.user.id);
    
    if (!success) {
      error(`[TWINK-VEHICLE-UPDATE-TYPE] Ошибка при обновлении типа техники`);
      await interaction.reply({
        content: "❌ Ошибка при обновлении типа техники",
        ephemeral: true
      });
      return;
    }
    
    
    const updatedTwink = findTwinkById(twinkId);
    const updatedVehicle = updatedTwink?.vehicles[vehicleIndex];
    
    if (!updatedVehicle) {
      await interaction.reply({
        content: "❌ Ошибка при обновлении техники",
        ephemeral: true
      });
      return;
    }
    
    // Обновляем embed с новой информацией
    const nationSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_update_nation_${twinkId}_${vehicleIndex}`)
      .setPlaceholder('Выберите нацию')
      .addOptions([
        { label: 'Германия', value: 'de', default: updatedVehicle.nation === 'de' },
        { label: 'СССР/Россия', value: 'ru', default: updatedVehicle.nation === 'ru' },
        { label: 'США', value: 'us', default: updatedVehicle.nation === 'us' },
        { label: 'Япония', value: 'jp', default: updatedVehicle.nation === 'jp' },
        { label: 'Великобритания', value: 'gb', default: updatedVehicle.nation === 'gb' },
        { label: 'Франция', value: 'fr', default: updatedVehicle.nation === 'fr' },
        { label: 'Италия', value: 'it', default: updatedVehicle.nation === 'it' },
        { label: 'Китай', value: 'ch', default: updatedVehicle.nation === 'ch' },
        { label: 'Израиль', value: 'is', default: updatedVehicle.nation === 'is' },
        { label: 'Швеция', value: 'sw', default: updatedVehicle.nation === 'sw' }
      ]);
    
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(`twink_vehicle_update_type_${twinkId}_${vehicleIndex}`)
      .setPlaceholder('Выберите тип техники')
      .addOptions([
        { label: 'Наземная техника', value: 'ground', default: updatedVehicle.type === 'ground' },
        { label: 'Самолёты', value: 'airplane', default: updatedVehicle.type === 'airplane' },
        { label: 'Вертолёты', value: 'helicopter', default: updatedVehicle.type === 'helicopter' }
      ]);
    
    const editNameBrButton = new ButtonBuilder()
      .setCustomId(`twink_vehicle_update_edit_modal_${twinkId}_${vehicleIndex}`)
      .setLabel('✏️ Редактировать название и BR')
      .setStyle(ButtonStyle.Primary);
    
    const deleteButton = new ButtonBuilder()
      .setCustomId(`twink_vehicle_delete_btn_${twinkId}_${vehicleIndex}`)
      .setLabel('🗑️ Удалить технику')
      .setStyle(ButtonStyle.Danger);
    
    const nationRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(nationSelect);
    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(editNameBrButton, deleteButton);
    
    const embed = new EmbedBuilder()
      .setTitle('✏️ Редактирование техники')
      .setDescription(`**Текущая техника:** ${updatedVehicle.name} (BR ${updatedVehicle.br})\n${NATION_NAMES[updatedVehicle.nation]} - ${VEHICLE_TYPE_NAMES[updatedVehicle.type]}\n\n✅ Тип техники обновлён!\n\n• Выберите нацию из списка выше\n• Нажмите кнопку для редактирования названия и BR\n• Нажмите кнопку для удаления техники`)
      .setColor(0x00ff00);
    
    await interaction.update({ 
      embeds: [embed], 
      components: [nationRow, typeRow, buttonRow],
      ephemeral: true 
    });
    
    // Отправляем обновлённый список техники после изменения
    if (updatedTwink) {
      const { embed: listEmbed, buttonRows: listButtonRows } = createVehicleListWithButtons(updatedTwink);
      await interaction.followUp({
        content: `📋 Обновлённый список техники:`,
        embeds: [listEmbed],
        components: listButtonRows,
        ephemeral: true
      });
    }
    
  } catch (err) {
    error(`[TWINK] Ошибка при обновлении типа техники:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    }
  }
}

// Обработчик модального окна редактирования техники (только название и BR)
export async function handleTwinkVehicleUpdateModal(interaction: ModalSubmitInteraction) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_update_modal_(.+)_(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат модального окна",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, vehicleIndexStr] = match;
    const vehicleIndex = parseInt(vehicleIndexStr);
    
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Твинк с ID ${twinkId} не найден`);
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Некорректный индекс техники: ${vehicleIndex} (всего техники: ${twink.vehicles.length})`);
      
      // Если у твинка есть техника, отправляем обновлённый список
      if (twink.vehicles.length > 0) {
        const { embed, buttonRows } = createVehicleListWithButtons(twink);
        await interaction.reply({
          content: `⚠️ Индекс техники устарел (техника была удалена). Используйте обновлённый список ниже:`,
          embeds: [embed],
          components: buttonRows,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Некорректный индекс техники. У твинка больше нет техники.`,
          ephemeral: true
        });
      }
      return;
    }
    
    const oldVehicle = { ...twink.vehicles[vehicleIndex] };
    const name = interaction.fields.getTextInputValue('vehicle_name').trim();
    const brStr = interaction.fields.getTextInputValue('vehicle_br').trim();
    const br = parseFloat(brStr);
    
    info(`[TWINK-VEHICLE-UPDATE-MODAL] Начало обновления техники: twinkId=${twinkId}, vehicleIndex=${vehicleIndex}`);
    info(`[TWINK-VEHICLE-UPDATE-MODAL] Старая техника: name="${oldVehicle.name}", br=${oldVehicle.br}, nation=${oldVehicle.nation}, type=${oldVehicle.type}`);
    info(`[TWINK-VEHICLE-UPDATE-MODAL] Новые данные: name="${name}", brStr="${brStr}", br=${br}`);
    
    if (!name) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Название техники пустое`);
      await interaction.reply({
        content: "❌ Название техники не может быть пустым",
        ephemeral: true
      });
      return;
    }
    
    if (isNaN(br) || br < 0 || br > 15) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Некорректный BR: brStr="${brStr}", parsed=${br}, isNaN=${isNaN(br)}`);
      await interaction.reply({
        content: "❌ BR должен быть числом от 0 до 15",
        ephemeral: true
      });
      return;
    }
    
    // Обновляем только название и BR (нация и тип обновляются через селекторы)
    info(`[TWINK-VEHICLE-UPDATE-MODAL] Вызов updateVehicleInTwink: twinkId=${twinkId}, vehicleIndex=${vehicleIndex}, name="${name}", br=${br}`);
    const success = updateVehicleInTwink(twinkId, vehicleIndex, { name, br }, interaction.user.id);
    
    info(`[TWINK-VEHICLE-UPDATE-MODAL] Результат updateVehicleInTwink: success=${success}`);
    
    if (!success) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Ошибка при обновлении техники: функция вернула false`);
      await interaction.reply({
        content: "❌ Ошибка при обновлении техники",
        ephemeral: true
      });
      return;
    }
    
    
    const updatedTwink = findTwinkById(twinkId);
    if (!updatedTwink) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Твинк не найден после обновления: twinkId=${twinkId}`);
      await interaction.reply({
        content: "❌ Ошибка при обновлении техники",
        ephemeral: true
      });
      return;
    }
    
    info(`[TWINK-VEHICLE-UPDATE-MODAL] Твинк найден после обновления: vehicles.length=${updatedTwink.vehicles.length}`);
    
    if (vehicleIndex >= updatedTwink.vehicles.length) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Индекс техники выходит за границы после обновления: vehicleIndex=${vehicleIndex}, vehicles.length=${updatedTwink.vehicles.length}`);
    }
    
    const updatedVehicle = updatedTwink.vehicles.find((v: Vehicle, idx: number) => 
      idx === vehicleIndex || (v.name === name && v.br === br)
    ) || updatedTwink.vehicles[vehicleIndex];
    
    if (!updatedVehicle) {
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Техника не найдена после обновления: vehicleIndex=${vehicleIndex}, vehicles.length=${updatedTwink.vehicles.length}`);
      error(`[TWINK-VEHICLE-UPDATE-MODAL] Список техники: ${updatedTwink.vehicles.map((v: Vehicle, i: number) => `${i}: ${v.name} (BR ${v.br})`).join(', ')}`);
    } else {
      info(`[TWINK-VEHICLE-UPDATE-MODAL] Техника после обновления: name="${updatedVehicle.name}", br=${updatedVehicle.br}, nation=${updatedVehicle.nation}, type=${updatedVehicle.type}`);
      info(`[TWINK-VEHICLE-UPDATE-MODAL] Сравнение: старое BR=${oldVehicle.br}, новое BR=${br}, фактическое BR=${updatedVehicle.br}`);
    }
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Техника обновлена')
      .setDescription(`**${updatedVehicle.name}** (BR ${updatedVehicle.br})\n${NATION_NAMES[updatedVehicle.nation]} - ${VEHICLE_TYPE_NAMES[updatedVehicle.type]}`)
      .setColor(0x00ff00);
    
    await interaction.reply({
      content: `✅ Название и BR техники успешно обновлены!`,
      embeds: [embed],
      ephemeral: true
    });
    
    // Отправляем обновлённый список техники после изменения
    const { embed: listEmbed, buttonRows: listButtonRows } = createVehicleListWithButtons(updatedTwink);
    await interaction.followUp({
      content: `📋 Обновлённый список техники:`,
      embeds: [listEmbed],
      components: listButtonRows,
      ephemeral: true
    });
    
    
  } catch (err) {
    error(`[TWINK] Ошибка при обработке модального окна редактирования техники:`, err);
    await interaction.reply({
      content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
      ephemeral: true
    });
  }
}

// Обработчик кнопки удаления техники из модального окна
export async function handleTwinkVehicleDeleteFromModalButton(interaction: any) {
  try {
    if (!hasTwinkAdminRole(interaction)) {
      await interaction.reply({
        content: "❌ У вас нет прав для управления твинками",
        ephemeral: true
      });
      return;
    }
    
    const customId = interaction.customId;
    const match = customId.match(/^twink_vehicle_delete_btn_(.+)_(\d+)$/);
    if (!match) {
      await interaction.reply({
        content: "❌ Неверный формат кнопки",
        ephemeral: true
      });
      return;
    }
    
    const [, twinkId, vehicleIndexStr] = match;
    const vehicleIndex = parseInt(vehicleIndexStr);
    
    
    const twink = findTwinkById(twinkId);
    if (!twink) {
      error(`[TWINK-VEHICLE-DELETE] Твинк с ID ${twinkId} не найден`);
      await interaction.reply({
        content: "❌ Твинк не найден",
        ephemeral: true
      });
      return;
    }
    
    if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
      error(`[TWINK-VEHICLE-DELETE] Некорректный индекс техники: ${vehicleIndex} (всего техники: ${twink.vehicles.length})`);
      await interaction.reply({
        content: `❌ Некорректный индекс техники (${vehicleIndex})`,
        ephemeral: true
      });
      return;
    }
    
    const vehicle = twink.vehicles[vehicleIndex];
    const vehicleName = vehicle.name;
    
    
    // Удаляем технику
    const success = removeVehicleFromTwink(twinkId, vehicleIndex, interaction.user.id);
    
    if (!success) {
      error(`[TWINK-VEHICLE-DELETE] Ошибка при удалении техники`);
      await interaction.update({
        content: "❌ Ошибка при удалении техники",
        embeds: [],
        components: []
      });
      return;
    }
    
    
    const updatedTwink = findTwinkById(twinkId);
    if (!updatedTwink) {
      await interaction.update({
        content: "❌ Ошибка при удалении техники",
        embeds: [],
        components: []
      });
      return;
    }
    
    // Обновляем модальное окно с информацией об удалении
    await interaction.update({
      content: `✅ Техника **${vehicleName}** успешно удалена!`,
      embeds: [],
      components: []
    });
    
    // Если у твинка осталась техника, отправляем обновлённый список техники
    if (updatedTwink.vehicles.length > 0) {
      const { embed, buttonRows } = createVehicleListWithButtons(updatedTwink);
      
      await interaction.followUp({
        content: `📋 Обновлённый список техники (индексы пересчитаны):`,
        embeds: [embed],
        components: buttonRows,
        ephemeral: true
      });
    } else {
      await interaction.followUp({
        content: `ℹ️ У твинка **${updatedTwink.username}** больше нет техники.`,
        ephemeral: true
      });
    }
    
  } catch (err) {
    error(`[TWINK] Ошибка при удалении техники из модального окна:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        ephemeral: true
      });
    }
  }
}

