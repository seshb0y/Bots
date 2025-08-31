import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  ButtonInteraction,
  ChannelType,
  StringSelectMenuBuilder,
} from "discord.js";
import { info, error } from "../utils/logger.js";
import { FLIGHT_ACADEMY_CHANNEL_ID, FLIGHT_ACADEMY_NOTIFY_USER_ID, FLIGHT_ACADEMY_OFFICER_ROLE_IDS } from "../constants.js";
import { getAircraftByType, getAircraftTypeByLicenseId, getAircraftTypeBySkillId, createAircraftOptions } from "../utils/aircraft.js";

// Функция для получения отображаемого имени пользователя на сервере
function getUserDisplayName(interaction: any): string {
  if (interaction.member && 'displayName' in interaction.member) {
    return interaction.member.displayName;
  }
  return interaction.user.username;
}

// Типы для лётной академии
interface LicenseType {
  id: string;
  name: string;
  brRange: string;
  tests: string[];
  description: string;
}

interface TrainingSkill {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  brRange: string;
  requirements: string[];
}

const LICENSE_TYPES: LicenseType[] = [
  {
    id: "piston",
    name: "Поршневой пилот",
    brRange: "4.3-6.7",
    tests: [
      "Дуэльный бой",
      "Бой против зениток в команде", 
      "Бомбометание"
    ],
    description: "Лицензия на управление поршневыми самолётами"
  },
  {
    id: "early_jet",
    name: "Ранние реактивы",
    brRange: "6.7-9.7", 
    tests: [
      "Дуэльный бой",
      "Бой против зениток в команде",
      "Бомбометание"
    ],
    description: "Лицензия на управление ранними реактивными самолётами"
  },
  {
    id: "modern_jet",
    name: "Современные реактивы",
    brRange: "9.7-14.3",
    tests: [
      "Уход от ИК ракет",
      "Дуэльный бой", 
      "Проверка умения уходить от ракет Панцирь и ИРИС-Т"
    ],
    description: "Лицензия на управление современными реактивными самолётами"
  }
];

const TRAINING_SKILLS: TrainingSkill[] = [
  {
    id: "duel",
    name: "Дуэльный бой",
    description: "Обучение тактике и приёмам воздушного боя один на один",
    difficulty: "Средняя",
    brRange: "Любой",
    requirements: ["Базовые навыки пилотирования", "Понимание механик игры"]
  },
  {
    id: "anti_aa",
    name: "Работа против зениток",
    description: "Обучение эффективной борьбе с наземными зенитными установками",
    difficulty: "Средняя",
    brRange: "Любой",
    requirements: ["Базовые навыки пилотирования", "Понимание механик игры"]
  },
  {
    id: "bombing",
    name: "Бомбометание",
    description: "Обучение точному бомбометанию по наземным целям",
    difficulty: "Низкая",
    brRange: "Любой",
    requirements: ["Базовые навыки пилотирования"]
  },
  {
    id: "ir_missile_evasion",
    name: "Уход от ИК ракет",
    description: "Обучение приёмам уклонения от инфракрасных ракет",
    difficulty: "Высокая",
    brRange: "9.7+",
    requirements: ["Опыт на реактивных самолётах", "Понимание систем предупреждения"]
  },
  {
    id: "sam_evasion",
    name: "Уход от ракет зениток",
    description: "Обучение тактике уклонения от ракет Панцирь, ИРИС-Т и других ЗРК",
    difficulty: "Высокая",
    brRange: "9.7+",
    requirements: ["Опыт на реактивных самолётах", "Понимание систем предупреждения"]
  },
  {
    id: "formation_flying",
    name: "Групповые полёты",
    description: "Обучение полётам в строю и координации действий в группе",
    difficulty: "Средняя",
    brRange: "Любой",
    requirements: ["Базовые навыки пилотирования", "Командная работа"]
  },
  {
    id: "energy_management",
    name: "Управление энергией",
    description: "Обучение эффективному управлению кинетической и потенциальной энергией самолёта",
    difficulty: "Высокая",
    brRange: "Любой",
    requirements: ["Понимание физики полёта", "Опыт пилотирования"]
  },
  {
    id: "ground_attack",
    name: "Штурмовые действия",
    description: "Обучение эффективной атаке наземных целей с использованием пушек и ракет",
    difficulty: "Средняя",
    brRange: "Любой",
    requirements: ["Базовые навыки пилотирования", "Понимание вооружения"]
  }
];

export const data = new SlashCommandBuilder()
  .setName("flight-academy")
  .setDescription("Создать тикет для лётной академии War Thunder")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    info(`[FLIGHT-ACADEMY] Команда /flight-academy вызвана пользователем ${interaction.user.tag} (${interaction.user.id}) в канале ${interaction.channelId}`);
    
    // Проверяем, что команда вызвана в нужном канале
    if (interaction.channelId !== FLIGHT_ACADEMY_CHANNEL_ID) {
      info(`[FLIGHT-ACADEMY] Неправильный канал: ${interaction.channelId}, ожидается: ${FLIGHT_ACADEMY_CHANNEL_ID}`);
      await interaction.reply({
        content: "❌ Эта команда доступна только в канале лётной академии!",
        ephemeral: true
      });
      return;
    }
    
    info(`[FLIGHT-ACADEMY] Канал проверен успешно, создаём главное меню`);

    info(`[FLIGHT-ACADEMY] Создаём embed для главного меню`);
    
    const embed = new EmbedBuilder()
      .setTitle("🎓 Лётная Академия War Thunder")
      .setDescription("Выберите, что хотите сделать:")
      .setColor(0x0099ff)
      .setTimestamp();

    // Добавляем информацию о типах обучения
    embed.addFields({
      name: "📜 Получение лицензии",
      value: "Полная программа обучения для получения лицензии пилота",
      inline: false
    });

    embed.addFields({
      name: "🎯 Обучение навыкам",
      value: "Индивидуальное обучение конкретным навыкам и приёмам",
      inline: false
    });

    info(`[FLIGHT-ACADEMY] Embed создан, создаём кнопки`);
    
    // Создаём кнопки для выбора типа
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("type_license")
          .setLabel("Получить лицензию")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📜"),
        new ButtonBuilder()
          .setCustomId("type_training")
          .setLabel("Обучение навыкам")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🎯")
      );

    info(`[FLIGHT-ACADEMY] Кнопки созданы, отправляем ответ`);
    
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false // Главное меню видно всем
    });

    info(`[FLIGHT-ACADEMY] Главное меню успешно отправлено пользователю ${interaction.user.tag}`);

  } catch (err) {
    error(`[FLIGHT-ACADEMY] Ошибка при создании меню лётной академии для пользователя ${interaction.user.tag}:`, err);
    try {
      await interaction.reply({
        content: "❌ Произошла ошибка при создании меню лётной академии",
        ephemeral: true
      });
      info(`[FLIGHT-ACADEMY] Сообщение об ошибке отправлено пользователю ${interaction.user.tag}`);
    } catch (replyErr) {
      error(`[FLIGHT-ACADEMY] Не удалось отправить сообщение об ошибке пользователю ${interaction.user.tag}:`, replyErr);
    }
  }
}

// Функция для показа меню лицензий
async function showLicenseMenu(interaction: ButtonInteraction) {
  try {
    info(`[FLIGHT-ACADEMY] Пользователь ${interaction.user.tag} (${interaction.user.id}) открывает меню лицензий`);
    info(`[FLIGHT-ACADEMY] Создаём embed для меню лицензий`);
    
    const embed = new EmbedBuilder()
      .setTitle("📜 Получение лицензии пилота")
      .setDescription("Выберите тип лицензии, которую хотите получить:")
      .setColor(0x0099ff)
      .setTimestamp();

    // Добавляем информацию о каждой лицензии
    info(`[FLIGHT-ACADEMY] Добавляем информацию о ${LICENSE_TYPES.length} лицензиях`);
    LICENSE_TYPES.forEach((license, index) => {
      embed.addFields({
        name: `${index + 1}. ${license.name} (БР ${license.brRange})`,
        value: `**Тесты:** ${license.tests.join(", ")}\n**Описание:** ${license.description}`,
        inline: false
      });
    });

    // Создаём кнопки для каждой лицензии
    info(`[FLIGHT-ACADEMY] Создаём кнопки для лицензий`);
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    
    for (let i = 0; i < LICENSE_TYPES.length; i += 2) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      
      // Первая кнопка в ряду
      const license1 = LICENSE_TYPES[i];
      info(`[FLIGHT-ACADEMY] Создаём кнопку для лицензии: ${license1.name} (${license1.id})`);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`license_${license1.id}`)
          .setLabel(`${license1.name}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✈️")
      );

      // Вторая кнопка в ряду (если есть)
      if (i + 1 < LICENSE_TYPES.length) {
        const license2 = LICENSE_TYPES[i + 1];
        info(`[FLIGHT-ACADEMY] Создаём кнопку для лицензии: ${license2.name} (${license2.id})`);
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`license_${license2.id}`)
            .setLabel(`${license2.name}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🚀")
        );
      }

      rows.push(row);
    }

    // Кнопка "Назад" убрана для упрощения навигации

    info(`[FLIGHT-ACADEMY] Всего создано ${rows.length} рядов кнопок`);
    info(`[FLIGHT-ACADEMY] Создаём новое приватное сообщение для пользователя ${interaction.user.tag}`);

    // Создаём новое приватное сообщение для пользователя
    await interaction.reply({
      embeds: [embed],
      components: rows,
      ephemeral: true // Меню лицензий видно только пользователю
    });

    info(`[FLIGHT-ACADEMY] Меню лицензий успешно показано для ${interaction.user.tag}`);

  } catch (err) {
    error(`[FLIGHT-ACADEMY] Ошибка при показе меню лицензий для пользователя ${interaction.user.tag}:`, err);
    try {
      info(`[FLIGHT-ACADEMY] Пытаемся отправить сообщение об ошибке пользователю ${interaction.user.tag}`);
      await interaction.reply({
        content: "❌ Произошла ошибка при загрузке меню лицензий",
        ephemeral: true
      });
      info(`[FLIGHT-ACADEMY] Сообщение об ошибке отправлено пользователю ${interaction.user.tag}`);
    } catch (replyErr) {
      error(`[FLIGHT-ACADEMY] Не удалось отправить сообщение об ошибке пользователю ${interaction.user.tag}:`, replyErr);
    }
  }
}

// Функция для показа меню навыков
async function showTrainingMenu(interaction: ButtonInteraction) {
  try {
    info(`[FLIGHT-ACADEMY] Пользователь ${interaction.user.tag} (${interaction.user.id}) открывает меню навыков`);
    info(`[FLIGHT-ACADEMY] Создаём embed для меню навыков`);
    
    const embed = new EmbedBuilder()
      .setTitle("🎯 Обучение навыкам")
      .setDescription("Выберите навык, которому хотите обучиться:")
      .setColor(0x00ff00)
      .setTimestamp();

    // Добавляем информацию о навыках
    info(`[FLIGHT-ACADEMY] Добавляем информацию о ${TRAINING_SKILLS.length} навыках`);
    TRAINING_SKILLS.forEach((skill, index) => {
      const difficultyColor = skill.difficulty === "Высокая" ? "🔴" : skill.difficulty === "Средняя" ? "🟡" : "🟢";
      embed.addFields({
        name: `${index + 1}. ${skill.name} ${difficultyColor}`,
        value: `**Сложность:** ${skill.difficulty}\n**БР:** ${skill.brRange}\n**Описание:** ${skill.description}\n**Требования:** ${skill.requirements.join(", ")}`,
        inline: false
      });
    });

    // Создаём кнопки для навыков (по 2 в ряду)
    info(`[FLIGHT-ACADEMY] Создаём кнопки для навыков`);
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    
    for (let i = 0; i < TRAINING_SKILLS.length; i += 2) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      
      // Первая кнопка в ряду
      const skill1 = TRAINING_SKILLS[i];
      info(`[FLIGHT-ACADEMY] Создаём кнопку для навыка: ${skill1.name} (${skill1.id})`);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`training_${skill1.id}`)
          .setLabel(`${skill1.name}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji("🎯")
        );

      // Вторая кнопка в ряду (если есть)
      if (i + 1 < TRAINING_SKILLS.length) {
        const skill2 = TRAINING_SKILLS[i + 1];
        info(`[FLIGHT-ACADEMY] Создаём кнопку для навыка: ${skill2.name} (${skill2.id})`);
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`training_${skill2.id}`)
            .setLabel(`${skill2.name}`)
            .setStyle(ButtonStyle.Success)
            .setEmoji("🎯")
        );
      }

      rows.push(row);
    }

    // Кнопка "Назад" убрана для упрощения навигации

    info(`[FLIGHT-ACADEMY] Всего создано ${rows.length} рядов кнопок`);
    info(`[FLIGHT-ACADEMY] Создаём новое приватное сообщение для пользователя ${interaction.user.tag}`);

    // Создаём новое приватное сообщение для пользователя
    await interaction.reply({
      embeds: [embed],
      components: rows,
      ephemeral: true // Меню навыков видно только пользователю
    });

    info(`[FLIGHT-ACADEMY] Меню навыков успешно показано для ${interaction.user.tag}`);

  } catch (err) {
    error(`[FLIGHT-ACADEMY] Ошибка при показе меню навыков для пользователя ${interaction.user.tag}:`, err);
    try {
      info(`[FLIGHT-ACADEMY] Пытаемся отправить сообщение об ошибке пользователю ${interaction.user.tag}`);
      await interaction.reply({
        content: "❌ Произошла ошибка при загрузке меню навыков",
        ephemeral: true
      });
      info(`[FLIGHT-ACADEMY] Сообщение об ошибке отправлено пользователю ${interaction.user.tag}`);
    } catch (replyErr) {
      error(`[FLIGHT-ACADEMY] Не удалось отправить сообщение об ошибке пользователю ${interaction.user.tag}:`, replyErr);
    }
  }
}

// Обработчик нажатий на кнопки
export async function handleButtonInteraction(interaction: ButtonInteraction) {
  try {
    info(`[FLIGHT-ACADEMY] === НАЧАЛО ОБРАБОТКИ КНОПКИ ===`);
    info(`[FLIGHT-ACADEMY] Тип взаимодействия: ${interaction.type}`);
    info(`[FLIGHT-ACADEMY] Пользователь: ${interaction.user.tag} (${interaction.user.id})`);
    info(`[FLIGHT-ACADEMY] ID кнопки: ${interaction.customId}`);
    info(`[FLIGHT-ACADEMY] Канал: ${interaction.channelId}`);
    info(`[FLIGHT-ACADEMY] Сервер: ${interaction.guildId}`);
    
    if (!interaction.isButton()) {
      info(`[FLIGHT-ACADEMY] Взаимодействие не является кнопкой, выходим`);
      return;
    }

    info(`[FLIGHT-ACADEMY] Взаимодействие подтверждено как кнопка`);

    // Обработка выбора типа обучения
    if (interaction.customId === "type_license") {
      info(`[FLIGHT-ACADEMY] Обрабатываем кнопку 'Получить лицензию'`);
      await showLicenseMenu(interaction);
      info(`[FLIGHT-ACADEMY] Кнопка 'Получить лицензию' обработана`);
      return;
    }

    if (interaction.customId === "type_training") {
      info(`[FLIGHT-ACADEMY] Обрабатываем кнопку 'Обучение навыкам'`);
      await showTrainingMenu(interaction);
      info(`[FLIGHT-ACADEMY] Кнопка 'Обучение навыкам' обработана`);
      return;
    }

    // Кнопка "Назад" убрана для упрощения навигации

    // Обработка выбора лицензии
    if (interaction.customId.startsWith("license_")) {
      info(`[FLIGHT-ACADEMY] Обрабатываем выбор лицензии: ${interaction.customId}`);
      const licenseId = interaction.customId.replace("license_", "");
      const license = LICENSE_TYPES.find(l => l.id === licenseId);

      if (!license) {
        await interaction.reply({
          content: "❌ Неизвестный тип лицензии",
          ephemeral: true
        });
        return;
      }

      // Получаем список самолётов для выбранной лицензии
      const aircraftType = getAircraftTypeByLicenseId(licenseId);
      const aircraft = getAircraftByType(aircraftType);

      if (aircraft.length === 0) {
        await interaction.reply({
          content: `❌ В категории **${license.name}** пока нет доступных самолётов. Обратитесь к администратору.`,
          ephemeral: true
        });
        return;
      }

      // Создаём embed с информацией о лицензии и селектором самолётов
      const embed = new EmbedBuilder()
        .setTitle(`✈️ Выбор самолёта для лицензии: ${license.name}`)
        .setDescription(`Выберите самолёт, на котором хотите проходить лицензирование.\n\n**Описание:** ${license.description}\n**БР:** ${license.brRange}\n**Тесты:** ${license.tests.join(', ')}`)
        .setColor(0x00ff00)
        .setTimestamp();

      // Создаём селектор самолётов
      const aircraftSelect = new StringSelectMenuBuilder()
        .setCustomId(`aircraft_select_${licenseId}`)
        .setPlaceholder('Выберите самолёт для лицензирования')
        .addOptions(createAircraftOptions(aircraft));

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(aircraftSelect);

      // Показываем экран выбора самолёта
      await interaction.reply({
        embeds: [embed],
        components: [selectRow],
        ephemeral: true
      });

      info(`[FLIGHT-ACADEMY] Экран выбора самолёта показан для ${interaction.user.tag}`);
      return;
    }

    // Обработка закрытия тикета
    if (interaction.customId.startsWith("close_ticket_")) {
      try {
        info(`[FLIGHT-ACADEMY] Пользователь ${interaction.user.tag} закрывает тикет`);
        
        const channelId = interaction.customId.replace("close_ticket_", "");
        const channel = interaction.guild?.channels.cache.get(channelId);
        
        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: "❌ Тикет не найден или недоступен",
            ephemeral: true
          });
          return;
        }

        // Проверяем права на закрытие тикета
        const member = interaction.member;
        if (!member || !('displayName' in member)) {
          await interaction.reply({
            content: "❌ Не удалось проверить ваши права",
            ephemeral: true
          });
          return;
        }

        const hasPermission = FLIGHT_ACADEMY_OFFICER_ROLE_IDS.some(roleId => 
          member.roles.cache.has(roleId)
        ) || channel.name.includes(interaction.user.username); // Создатель тикета

        if (!hasPermission) {
          await interaction.reply({
            content: "❌ У вас нет прав на закрытие этого тикета",
            ephemeral: true
          });
          return;
        }

        // Закрываем тикет
        await channel.delete();
        
        await interaction.reply({
          content: "✅ Тикет успешно закрыт",
          ephemeral: true
        });

        info(`[FLIGHT-ACADEMY] Тикет ${channel.name} закрыт пользователем ${interaction.user.tag}`);

      } catch (err) {
        error(`[FLIGHT-ACADEMY] Ошибка при закрытии тикета:`, err);
        await interaction.reply({
          content: "❌ Произошла ошибка при закрытии тикета",
          ephemeral: true
        });
      }
      return;
    }

    // Обработка выбора навыка для обучения
    if (interaction.customId.startsWith("training_")) {
      info(`[FLIGHT-ACADEMY] Обрабатываем выбор навыка: ${interaction.customId}`);
      const skillId = interaction.customId.replace("training_", "");
      const skill = TRAINING_SKILLS.find(s => s.id === skillId);

      if (!skill) {
        info(`[FLIGHT-ACADEMY] Навык не найден: ${skillId}`);
        await interaction.reply({
          content: "❌ Неизвестный навык",
          ephemeral: true
        });
        return;
      }

      info(`[FLIGHT-ACADEMY] Создаём модальное окно для навыка: ${skill.name}`);
      
      // Создаём модальное окно для заявки на обучение
      const modal = new ModalBuilder()
        .setCustomId(`training_form_${skillId}`)
        .setTitle(`Заявка на обучение: ${skill.name}`);

      const experienceInput = new TextInputBuilder()
        .setCustomId("experience")
        .setLabel("Ваш текущий опыт")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Опишите ваш опыт в War Thunder, уровень, любимые самолёты")
        .setRequired(true)
        .setMaxLength(1000);

      const currentSkillInput = new TextInputBuilder()
        .setCustomId("current_skill")
        .setLabel("Текущий уровень в этом навыке")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Опишите, что уже умеете и с чем возникают трудности")
        .setRequired(true)
        .setMaxLength(1000);

      const goalsInput = new TextInputBuilder()
        .setCustomId("goals")
        .setLabel("Цели обучения")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Что конкретно хотите улучшить в этом навыке?")
        .setRequired(true)
        .setMaxLength(1000);

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput);
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(currentSkillInput);
      const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(goalsInput);

      modal.addComponents(firstRow, secondRow, thirdRow);

      info(`[FLIGHT-ACADEMY] Модальное окно создано, показываем пользователю ${interaction.user.tag}`);
      await interaction.showModal(modal);
      info(`[FLIGHT-ACADEMY] Модальное окно показано пользователю ${interaction.user.tag}`);
      return;
    }

    info(`[FLIGHT-ACADEMY] Кнопка ${interaction.customId} не распознана`);
    await interaction.reply({
      content: "❌ Неизвестная кнопка",
      ephemeral: true
    });

  } catch (err) {
    error(`[FLIGHT-ACADEMY] Ошибка при обработке нажатия кнопки ${interaction.customId} для пользователя ${interaction.user.tag}:`, err);
    try {
      await interaction.reply({
        content: "❌ Произошла ошибка при создании формы",
        ephemeral: true
      });
      info(`[FLIGHT-ACADEMY] Сообщение об ошибке отправлено пользователю ${interaction.user.tag}`);
    } catch (replyErr) {
      error(`[FLIGHT-ACADEMY] Не удалось отправить сообщение об ошибке пользователю ${interaction.user.tag}:`, replyErr);
    }
  }
  
  info(`[FLIGHT-ACADEMY] === КОНЕЦ ОБРАБОТКИ КНОПКИ ===`);
}

// Обработчик отправки модального окна
export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  try {
    info(`[FLIGHT-ACADEMY] === НАЧАЛО ОБРАБОТКИ МОДАЛЬНОГО ОКНА ===`);
    info(`[FLIGHT-ACADEMY] Тип взаимодействия: ${interaction.type}`);
    info(`[FLIGHT-ACADEMY] Пользователь: ${interaction.user.tag} (${interaction.user.id})`);
    info(`[FLIGHT-ACADEMY] ID модального окна: ${interaction.customId}`);
    info(`[FLIGHT-ACADEMY] Канал: ${interaction.channelId}`);
    info(`[FLIGHT-ACADEMY] Сервер: ${interaction.guildId}`);
    
    if (!interaction.isModalSubmit()) {
      info(`[FLIGHT-ACADEMY] Взаимодействие не является модальным окном, выходим`);
      return;
    }

    info(`[FLIGHT-ACADEMY] Взаимодействие подтверждено как модальное окно`);

    // Обработка заявки на лицензию
    if (interaction.customId.startsWith("academy_form_")) {
      info(`[FLIGHT-ACADEMY] Обрабатываем заявку на лицензию: ${interaction.customId}`);
      
      // Проверяем, есть ли информация о выбранном самолёте
      const formData = interaction.customId.replace("academy_form_", "");
      const parts = formData.split("_");
      const licenseId = parts[0];
      const aircraftId = parts.length > 1 ? parts[1] : null;
      
      info(`[FLIGHT-ACADEMY] ID лицензии: ${licenseId}, ID самолёта: ${aircraftId}`);
      const license = LICENSE_TYPES.find(l => l.id === licenseId);

      if (!license) {
        info(`[FLIGHT-ACADEMY] Лицензия не найдена: ${licenseId}`);
        await interaction.reply({
          content: "❌ Неизвестный тип лицензии",
          ephemeral: true
        });
        return;
      }

      info(`[FLIGHT-ACADEMY] Лицензия найдена: ${license.name}`);

      const experience = interaction.fields.getTextInputValue("experience");
      const motivation = interaction.fields.getTextInputValue("motivation");

      // Получаем информацию о выбранном самолёте
      let selectedAircraft = null;
      if (aircraftId) {
        const aircraftType = getAircraftTypeByLicenseId(licenseId);
        const aircraft = getAircraftByType(aircraftType);
        selectedAircraft = aircraft.find(a => a.id === aircraftId);
      }

      // Создаём embed с заявкой на лицензию
      const applicationEmbed = new EmbedBuilder()
        .setTitle("🎓 Новая заявка на лицензию")
        .setColor(0x00ff00)
        .addFields(
          { name: "👤 Пользователь Discord", value: `${getUserDisplayName(interaction)} (${interaction.user.id})`, inline: true },
          { name: "✈️ Лицензия", value: `${license.name} (БР ${license.brRange})`, inline: true },
          { name: "📚 Опыт", value: experience, inline: false },
          { name: "🎯 Мотивация", value: motivation, inline: false }
        )
        .setFooter({ text: "Лётная академия War Thunder - Лицензия" });

      // Добавляем информацию о выбранном самолёте, если есть
      if (selectedAircraft) {
        applicationEmbed.addFields(
          { name: "🛩️ Выбранный самолёт", value: `${selectedAircraft.name} (${selectedAircraft.nation}, БР ${selectedAircraft.br})`, inline: false }
        );
      }

      applicationEmbed.addFields({ name: "🧪 Тесты", value: license.tests.join(", "), inline: false });

      // Создаём канал-тикет для заявки
      try {
        info(`[FLIGHT-ACADEMY] Создаём канал-тикет для заявки на лицензию ${license.name}`);
        
        const guild = interaction.guild;
        if (!guild) {
          throw new Error("Не удалось получить информацию о сервере");
        }

        // Создаём название канала
        const channelName = `🎓-лицензия-${interaction.user.username}-${Date.now().toString().slice(-4)}`;
        
        // Создаём канал
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          // parent: FLIGHT_ACADEMY_TICKET_CATEGORY_ID, // Временно убираем категорию
          permissionOverwrites: [
            {
              id: guild.id, // @everyone
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id, // Создатель тикета
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            },
            // Добавляем права для офицеров
            ...FLIGHT_ACADEMY_OFFICER_ROLE_IDS.map((roleId: string) => ({
              id: roleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
            }))
          ]
        });

        info(`[FLIGHT-ACADEMY] Канал-тикет создан: ${ticketChannel.name}`);

        // Отправляем embed с заявкой в тикет
        const ticketEmbed = new EmbedBuilder()
          .setTitle("🎓 Заявка на лицензию")
          .setColor(0x00ff00)
          .addFields(
            { name: "👤 Пользователь Discord", value: `${getUserDisplayName(interaction)} (${interaction.user.id})`, inline: true },
            { name: "✈️ Лицензия", value: `${license.name} (БР ${license.brRange})`, inline: true },
            { name: "📚 Опыт", value: experience, inline: false },
            { name: "🎯 Мотивация", value: motivation, inline: false }
          )
          .setFooter({ text: "Лётная академия War Thunder - Лицензия" });

        // Добавляем информацию о выбранном самолёте, если есть
        if (selectedAircraft) {
          ticketEmbed.addFields(
            { name: "🛩️ Выбранный самолёт", value: `${selectedAircraft.name} (${selectedAircraft.nation}, БР ${selectedAircraft.br})`, inline: false }
          );
        }

        ticketEmbed.addFields({ name: "🧪 Тесты", value: license.tests.join(", "), inline: false });

        // Создаём кнопку для закрытия тикета
        const closeButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`close_ticket_${ticketChannel.id}`)
              .setLabel("🔒 Закрыть тикет")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("🔒")
          );

        // Отправляем заявку в тикет
        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });
        
        // Подтверждаем пользователю
        info(`[FLIGHT-ACADEMY] Отправляем подтверждение пользователю ${interaction.user.tag}`);
        await interaction.reply({
          content: `✅ Ваша заявка на лицензию **${license.name}** успешно создана! Тикет: ${ticketChannel}`,
          ephemeral: true
        });

        info(`[FLIGHT-ACADEMY] Заявка на лицензию ${license.name} от ${interaction.user.tag} успешно обработана, тикет создан`);

      } catch (ticketError) {
        error(`[FLIGHT-ACADEMY] Ошибка при создании тикета для заявки на лицензию ${license.name}:`, ticketError);
        await interaction.reply({
          content: "❌ Произошла ошибка при создании тикета. Попробуйте позже или обратитесь к администратору.",
          ephemeral: true
        });
      }
      return;
    }

    // Обработка заявки на обучение навыкам
    if (interaction.customId.startsWith("training_form_")) {
      info(`[FLIGHT-ACADEMY] Обрабатываем заявку на обучение навыку: ${interaction.customId}`);
      const skillId = interaction.customId.replace("training_form_", "");
      info(`[FLIGHT-ACADEMY] ID навыка: ${skillId}`);
      const skill = TRAINING_SKILLS.find(s => s.id === skillId);

      if (!skill) {
        info(`[FLIGHT-ACADEMY] Навык не найден: ${skillId}`);
        await interaction.reply({
          content: "❌ Неизвестный навык",
          ephemeral: true
        });
        return;
      }

      info(`[FLIGHT-ACADEMY] Навык найден: ${skill.name}`);

      const experience = interaction.fields.getTextInputValue("experience");
      const currentSkill = interaction.fields.getTextInputValue("current_skill");
      const goals = interaction.fields.getTextInputValue("goals");

      // Создаём embed с заявкой на обучение
      const trainingEmbed = new EmbedBuilder()
        .setTitle("🎯 Новая заявка на обучение навыку")
        .setColor(0x0099ff)
        .addFields(
          { name: "👤 Пользователь Discord", value: `${getUserDisplayName(interaction)} (${interaction.user.id})`, inline: true },
          { name: "🎯 Навык", value: `${skill.name}`, inline: true },
          { name: "📚 Опыт", value: experience, inline: false },
          { name: "🔍 Текущий уровень", value: currentSkill, inline: false },
          { name: "🎯 Цели обучения", value: goals, inline: false },
          { name: "📊 Информация о навыке", value: `**Сложность:** ${skill.difficulty}\n**БР:** ${skill.brRange}\n**Требования:** ${skill.requirements.join(", ")}`, inline: false }
        )
        .setFooter({ text: "Лётная академия War Thunder - Обучение навыкам" });

      // Отправляем уведомление в личные сообщения
      try {
        info(`[FLIGHT-ACADEMY] Отправляем уведомление пользователю ${FLIGHT_ACADEMY_NOTIFY_USER_ID}`);
        const user = await interaction.client.users.fetch(FLIGHT_ACADEMY_NOTIFY_USER_ID);
        info(`[FLIGHT-ACADEMY] Пользователь найден: ${user.tag}`);
        await user.send({ embeds: [trainingEmbed] });
        info(`[FLIGHT-ACADEMY] DM отправлен пользователю ${user.tag}`);
        
        // Подтверждаем пользователю
        info(`[FLIGHT-ACADEMY] Отправляем подтверждение пользователю ${interaction.user.tag}`);
        await interaction.reply({
          content: `✅ Ваша заявка на обучение навыку **${skill.name}** успешно отправлена! Ожидайте ответа в личных сообщениях.`,
          ephemeral: true
        });

        info(`[FLIGHT-ACADEMY] Заявка на обучение навыку ${skill.name} от ${interaction.user.tag} успешно обработана`);

      } catch (dmError) {
        error(`[FLIGHT-ACADEMY] Ошибка при отправке DM для заявки на обучение навыку ${skill.name}:`, dmError);
        await interaction.reply({
          content: "❌ Произошла ошибка при отправке заявки. Попробуйте позже или обратитесь к администратору.",
          ephemeral: true
        });
      }
      return;
    }

  } catch (err) {
    error(`[FLIGHT-ACADEMY] Ошибка при обработке модального окна для пользователя ${interaction.user.tag}:`, err);
    try {
      await interaction.reply({
        content: "❌ Произошла ошибка при обработке формы",
        ephemeral: true
      });
      info(`[FLIGHT-ACADEMY] Сообщение об ошибке отправлено пользователю ${interaction.user.tag}`);
    } catch (replyErr) {
      error(`[FLIGHT-ACADEMY] Не удалось отправить сообщение об ошибке пользователю ${interaction.user.tag}:`, replyErr);
    }
  }
  
  info(`[FLIGHT-ACADEMY] === КОНЕЦ ОБРАБОТКИ МОДАЛЬНОГО ОКНА ===`);
}

// Обработчик селекторов самолётов
export async function handleAircraftSelect(interaction: any) {
  try {
    info(`[FLIGHT-ACADEMY] === НАЧАЛО ОБРАБОТКИ СЕЛЕКТОРА САМОЛЁТОВ ===`);
    info(`[FLIGHT-ACADEMY] Тип взаимодействия: ${interaction.type}`);
    info(`[FLIGHT-ACADEMY] Пользователь: ${interaction.user.tag} (${interaction.user.id})`);
    info(`[FLIGHT-ACADEMY] ID селектора: ${interaction.customId}`);
    
    if (!interaction.isStringSelectMenu()) {
      info(`[FLIGHT-ACADEMY] Взаимодействие не является селектором, выходим`);
      return;
    }

    info(`[FLIGHT-ACADEMY] Взаимодействие подтверждено как селектор`);

    // Обработка выбора самолёта для лицензии
    if (interaction.customId.startsWith("aircraft_select_")) {
      info(`[FLIGHT-ACADEMY] Обрабатываем выбор самолёта: ${interaction.customId}`);
      const licenseId = interaction.customId.replace("aircraft_select_", "");
      const license = LICENSE_TYPES.find(l => l.id === licenseId);

      if (!license) {
        await interaction.reply({
          content: "❌ Неизвестный тип лицензии",
          ephemeral: true
        });
        return;
      }

      const selectedAircraftId = interaction.values[0];
      const aircraftType = getAircraftTypeByLicenseId(licenseId);
      const aircraft = getAircraftByType(aircraftType);
      const selectedAircraft = aircraft.find(a => a.id === selectedAircraftId);

      if (!selectedAircraft) {
        await interaction.reply({
          content: "❌ Выбранный самолёт не найден",
          ephemeral: true
        });
        return;
      }

      info(`[FLIGHT-ACADEMY] Пользователь ${interaction.user.tag} выбрал самолёт: ${selectedAircraft.name}`);

      // Создаём модальное окно для заполнения формы
      const modal = new ModalBuilder()
        .setCustomId(`academy_form_${licenseId}_${selectedAircraftId}`)
        .setTitle(`${license.name} - ${selectedAircraft.name}`);

      const experienceInput = new TextInputBuilder()
        .setCustomId("experience")
        .setLabel("Опыт игры в War Thunder")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Опишите ваш опыт игры, количество часов, любимые самолёты")
        .setRequired(true)
        .setMaxLength(1000);

      const motivationInput = new TextInputBuilder()
        .setCustomId("motivation")
        .setLabel("Почему хотите получить эту лицензию?")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Расскажите о ваших целях и мотивации")
        .setRequired(true)
        .setMaxLength(1000);

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput);
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(motivationInput);

      modal.addComponents(firstRow, secondRow);

      await interaction.showModal(modal);
      info(`[FLIGHT-ACADEMY] Форма лицензии показана для ${interaction.user.tag}`);
      return;
    }

    info(`[FLIGHT-ACADEMY] Селектор ${interaction.customId} не распознан`);
    await interaction.reply({
      content: "❌ Неизвестный селектор",
      ephemeral: true
    });

  } catch (err) {
    error(`[FLIGHT-ACADEMY] Ошибка при обработке селектора самолётов для пользователя ${interaction.user.tag}:`, err);
    try {
      await interaction.reply({
        content: "❌ Произошла ошибка при выборе самолёта",
        ephemeral: true
      });
      info(`[FLIGHT-ACADEMY] Сообщение об ошибке отправлено пользователю ${interaction.user.tag}`);
    } catch (replyErr) {
      error(`[FLIGHT-ACADEMY] Не удалось отправить сообщение об ошибке пользователю ${interaction.user.tag}:`, replyErr);
    }
  }
  
  info(`[FLIGHT-ACADEMY] === КОНЕЦ ОБРАБОТКИ СЕЛЕКТОРА САМОЛЁТОВ ===`);
}
