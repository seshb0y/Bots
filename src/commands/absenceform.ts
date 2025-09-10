import { 
  ChatInputCommandInteraction, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction
} from "discord.js";
import { logCommand, logInteraction, error, info } from "../utils/logger";
import { loadJson, saveJson } from "../utils/json";
import { getDataFilePath } from "../utils/paths";
import { ADMIN_ROLE_IDS, MODERATOR_ROLE_IDS, ABSENCE_THREAD_ID } from "../constants";

// Путь к файлу с одобренными заявками об отсутствии
const approvedAbsencesPath = getDataFilePath("approved_absences.json");

// Интерфейс для заявки об отсутствии
interface AbsenceRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string; // Никнейм пользователя на сервере
  absenceType: string;
  startDate: string;
  endDate?: string;
  reason: string;
  additionalInfo?: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Команда для создания формы отписки отсутствия
 * Создает кнопку, которая открывает модальное окно для заполнения формы
 */
export async function absenceformCommand(interaction: ChatInputCommandInteraction) {
  try {
    logCommand("Выполняется команда absenceform", { 
      userId: interaction.user.id, 
      username: interaction.user.tag 
    });

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📝 Форма отписки отсутствия")
      .setDescription(
        "Нажмите кнопку ниже, чтобы заполнить форму отписки отсутствия.\n\n" +
        "**Правила:**\n" +
        "• Отписки принимаются при отсутствии более 10 дней\n" +
        "• Исключение: отсутствие на собрании полка\n" +
        "• Причина обязательна при отсутствии от 30 дней\n" +
        "• Сообщения не по форме будут удаляться"
      )
      .addFields(
        {
          name: "📋 Форма для длительного отсутствия",
          value: "```\n-\nОтсутствую с 00.00.2024 по 00.00.2024\nПричина: (Обязательна при отсутствии от 30 дней и больше)\n-```",
          inline: false
        },
        {
          name: "📋 Форма для отсутствия на собрании",
          value: "```\n-\nБуду отсутствовать на собрании: 00.00.2024\n(Дата собрания будет указана в разделе 📻-новости📻)\n-```",
          inline: false
        }
      )
      .setFooter({ text: "⚠️ Отписки сделанные не по форме образца будут удаляться" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("absence_form_button")
          .setLabel("📝 Заполнить форму отсутствия")
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({ 
      embeds: [embed], 
      components: [row],
      ephemeral: false 
    });

    logCommand("Форма отсутствия создана", { 
      userId: interaction.user.id, 
      username: interaction.user.tag 
    });

  } catch (err: any) {
    error("Ошибка при выполнении команды absenceform", err);
    await interaction.reply({ 
      content: "❌ Произошла ошибка при создании формы отсутствия!", 
      ephemeral: true 
    });
  }
}

/**
 * Обработчик нажатия кнопки формы отсутствия
 * Открывает модальное окно для заполнения данных
 */
export async function handleAbsenceFormButton(interaction: any) {
  try {
    if (interaction.customId !== "absence_form_button") return;

    logInteraction("Нажата кнопка формы отсутствия", { 
      userId: interaction.user.id, 
      username: interaction.user.tag 
    });

    const modal = new ModalBuilder()
      .setCustomId("absence_form_modal")
      .setTitle("📝 Форма отписки отсутствия");

    // Тип отсутствия
    const absenceTypeInput = new TextInputBuilder()
      .setCustomId("absence_type")
      .setLabel("Тип отсутствия")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Введите: 'длительное' или 'собрание'")
      .setValue("длительное")
      .setRequired(true)
      .setMaxLength(20);

    // Дата начала отсутствия
    const startDateInput = new TextInputBuilder()
      .setCustomId("start_date")
      .setLabel("Дата начала отсутствия (ДД.ММ.ГГГГ)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Например: 15.01.2024")
      .setRequired(true)
      .setMaxLength(10);

    // Дата окончания отсутствия
    const endDateInput = new TextInputBuilder()
      .setCustomId("end_date")
      .setLabel("Дата окончания отсутствия (ДД.ММ.ГГГГ)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Например: 25.01.2024")
      .setRequired(false)
      .setMaxLength(10);

    // Причина отсутствия
    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Причина отсутствия (обязательна от 30 дней)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Укажите причину отсутствия...")
      .setRequired(false)
      .setMaxLength(500);

    // Дополнительная информация
    const additionalInfoInput = new TextInputBuilder()
      .setCustomId("additional_info")
      .setLabel("Дополнительная информация")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Любая дополнительная информация...")
      .setRequired(false)
      .setMaxLength(500);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(absenceTypeInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(startDateInput);
    const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(endDateInput);
    const fourthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
    const fifthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(additionalInfoInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

    await interaction.showModal(modal);

  } catch (err: any) {
    error("Ошибка при показе модального окна формы отсутствия", err);
    await interaction.reply({ 
      content: "❌ Произошла ошибка при открытии формы!", 
      ephemeral: true 
    });
  }
}

/**
 * Обработчик отправки модальной формы отсутствия
 * Форматирует и отправляет сообщение в канал отсутствий
 */
export async function handleAbsenceFormModal(interaction: ModalSubmitInteraction) {
  try {
    if (interaction.customId !== "absence_form_modal") return;

    logInteraction("Отправлена форма отсутствия", { 
      userId: interaction.user.id, 
      username: interaction.user.tag,
      userType: typeof interaction.user,
      userKeys: Object.keys(interaction.user)
    });

    const absenceType = interaction.fields.getTextInputValue("absence_type").toLowerCase();
    const startDate = interaction.fields.getTextInputValue("start_date");
    const endDate = interaction.fields.getTextInputValue("end_date");
    const reason = interaction.fields.getTextInputValue("reason");
    const additionalInfo = interaction.fields.getTextInputValue("additional_info");

    // Валидация типа отсутствия
    if (!["длительное", "собрание"].includes(absenceType)) {
      await interaction.reply({ 
        content: "❌ Неверный тип отсутствия! Введите 'длительное' или 'собрание'.", 
        ephemeral: true 
      });
      return;
    }

    // Валидация даты начала
    if (!isValidDate(startDate)) {
      await interaction.reply({ 
        content: "❌ Неверный формат даты начала! Используйте формат ДД.ММ.ГГГГ", 
        ephemeral: true 
      });
      return;
    }

    // Валидация даты окончания (если указана)
    if (endDate && !isValidDate(endDate)) {
      await interaction.reply({ 
        content: "❌ Неверный формат даты окончания! Используйте формат ДД.ММ.ГГГГ", 
        ephemeral: true 
      });
      return;
    }

    // Проверка на длительность отсутствия
    if (absenceType === "длительное" && endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 чтобы включить оба дня
      
      if (daysDiff < 10) {
        await interaction.reply({ 
          content: `❌ Отписки принимаются только при отсутствии более 10 дней!\n\nВаш период: ${daysDiff} дней (с ${startDate} по ${endDate})`, 
          ephemeral: true 
        });
        return;
      }

      // Проверка на обязательность причины при отсутствии от 30 дней
      if (daysDiff >= 30 && !reason.trim()) {
        await interaction.reply({ 
          content: "❌ Причина обязательна при отсутствии от 30 дней и больше!", 
          ephemeral: true 
        });
        return;
      }
    }

    // Формирование сообщения
    let message = "-\n";
    
    if (absenceType === "длительное") {
      if (endDate) {
        message += `Отсутствую с ${startDate} по ${endDate}`;
      } else {
        message += `Отсутствую с ${startDate}`;
      }
      
      if (reason.trim()) {
        message += `\nПричина: ${reason}`;
      }
    } else if (absenceType === "собрание") {
      message += `Буду отсутствовать на собрании: ${startDate}`;
    }
    
    if (additionalInfo.trim()) {
      message += `\n\nДополнительная информация: ${additionalInfo}`;
    }
    
    message += "\n-";

    // Отправка красивого сообщения в ветку отсутствий
    const absenceThread = interaction.guild?.channels.cache.get(ABSENCE_THREAD_ID);
    
    if (absenceThread?.isThread()) {
      try {
        const { embeds, components } = await createAbsenceEmbed(interaction.user, interaction.member, {
          absenceType,
          startDate,
          endDate,
          reason,
          additionalInfo
        });

        // Отправляем сообщение в ветку
        await absenceThread.send({ 
          content: `**Заявка об отсутствии от ${interaction.user.username}:**`,
          embeds,
          components,
          allowedMentions: { users: [] }
        });

        // Добавляем пользователя в ветку, если он еще не участник
        try {
          await absenceThread.members.add(interaction.user.id);
          logCommand("Пользователь добавлен в ветку отсутствий", { 
            userId: interaction.user.id, 
            username: interaction.user.tag,
            threadId: ABSENCE_THREAD_ID
          });
        } catch (addError: any) {
          // Игнорируем ошибки добавления в ветку (пользователь уже участник или нет прав)
          logCommand("Не удалось добавить пользователя в ветку", { 
            userId: interaction.user.id, 
            error: addError.message 
          });
        }

        await interaction.reply({ 
          content: "✅ Форма отсутствия успешно отправлена в ветку отсутствий! Вы автоматически добавлены в ветку.", 
          ephemeral: true 
        });

        logCommand("Заявка отсутствия отправлена в ветку", { 
          userId: interaction.user.id, 
          username: interaction.user.tag,
          threadId: ABSENCE_THREAD_ID,
          absenceType,
          startDate,
          endDate
        });
      } catch (err: any) {
        error("Ошибка при создании embed заявки отсутствия", err);
        await interaction.reply({ 
          content: "❌ Произошла ошибка при создании заявки об отсутствии!", 
          ephemeral: true 
        });
        return;
      }
    } else {
      await interaction.reply({ 
        content: "❌ Не удалось найти ветку для заявки об отсутствии!", 
        ephemeral: true 
      });
    }

  } catch (err: any) {
    error("Ошибка при обработке модальной формы отсутствия", err);
    await interaction.reply({ 
      content: "❌ Произошла ошибка при обработке формы!", 
      ephemeral: true 
    });
  }
}

/**
 * Проверяет валидность даты в формате ДД.ММ.ГГГГ
 */
function isValidDate(dateString: string): boolean {
  const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match = dateString.match(regex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 2020 || year > 2030) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
}

/**
 * Парсит дату из строки формата ДД.ММ.ГГГГ
 */
function parseDate(dateString: string): Date {
  const [day, month, year] = dateString.split('.').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Загружает одобренные заявки об отсутствии
 */
function loadApprovedAbsences(): AbsenceRequest[] {
  try {
    return loadJson<AbsenceRequest[]>(approvedAbsencesPath) || [];
  } catch (err: any) {
    error("Ошибка при загрузке одобренных заявок", err);
    return [];
  }
}

/**
 * Сохраняет одобренные заявки об отсутствии
 */
function saveApprovedAbsences(absences: AbsenceRequest[]): void {
  try {
    saveJson(approvedAbsencesPath, absences);
    logCommand(`Сохранено ${absences.length} заявок об отсутствии`, {});
  } catch (err: any) {
    error("Ошибка при сохранении одобренных заявок", err);
  }
}

/**
 * Добавляет новую одобренную заявку
 */
function addApprovedAbsence(absence: AbsenceRequest): void {
  const absences = loadApprovedAbsences();
  absences.push(absence);
  saveApprovedAbsences(absences);
}

/**
 * Генерирует уникальный ID для заявки
 */
function generateAbsenceId(): string {
  return `absence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Загружает ожидающие заявки об отсутствии
 */
function loadPendingAbsences(): AbsenceRequest[] {
  try {
    return loadJson<AbsenceRequest[]>(getDataFilePath("pending_absences.json")) || [];
  } catch (err: any) {
    error("Ошибка при загрузке ожидающих заявок", err);
    return [];
  }
}

/**
 * Сохраняет ожидающие заявки об отсутствии
 */
function savePendingAbsences(absences: AbsenceRequest[]): void {
  try {
    saveJson(getDataFilePath("pending_absences.json"), absences);
    logCommand(`Сохранено ${absences.length} ожидающих заявок об отсутствии`, {});
  } catch (err: any) {
    error("Ошибка при сохранении ожидающих заявок", err);
  }
}

/**
 * Находит заявку по ID
 */
function findAbsenceById(absenceId: string): AbsenceRequest | null {
  const pendingAbsences = loadPendingAbsences();
  const approvedAbsences = loadApprovedAbsences();
  
  // Ищем в ожидающих заявках
  let absence = pendingAbsences.find(a => a.id === absenceId);
  if (absence) return absence;
  
  // Ищем в одобренных заявках
  absence = approvedAbsences.find(a => a.id === absenceId);
  return absence || null;
}

/**
 * Удаляет заявку из ожидающих
 */
function removePendingAbsence(absenceId: string): void {
  const pendingAbsences = loadPendingAbsences();
  const filteredAbsences = pendingAbsences.filter(a => a.id !== absenceId);
  savePendingAbsences(filteredAbsences);
}


/**
 * Создает красивый embed для заявки об отсутствии
 */
async function createAbsenceEmbed(user: any, member: any, data: {
  absenceType: string;
  startDate: string;
  endDate: string;
  reason: string;
  additionalInfo: string;
}) {
  const embed = new EmbedBuilder()
    .setColor(data.absenceType === "длительное" ? 0xe74c3c : 0xf39c12)
    .setTitle(`📝 Заявка об отсутствии`)
    .setDescription(`**Пользователь:** ${user}\n**Статус:** ⏳ Ожидает рассмотрения`)
    .addFields(
      {
        name: "📅 Период отсутствия",
        value: data.endDate ? `**С:** ${data.startDate}\n**По:** ${data.endDate}` : `**С:** ${data.startDate}`,
        inline: true
      },
      {
        name: "📋 Тип отсутствия",
        value: data.absenceType === "длительное" ? "🕐 Длительное отсутствие" : "🏛️ Отсутствие на собрании",
        inline: true
      },
      {
        name: "⏰ Дата подачи",
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true
      }
    );

  // Всегда показываем причину, даже если она пустая
  embed.addFields({
    name: "📝 Причина отсутствия",
    value: data.reason.trim() || "Не указана",
    inline: false
  });

  if (data.additionalInfo.trim()) {
    embed.addFields({
      name: "ℹ️ Дополнительная информация",
      value: data.additionalInfo,
      inline: false
    });
  }

  // Добавляем кнопки для модераторов с попапами Discord
  // Создаем уникальный ID для заявки
  const absenceId = generateAbsenceId();
  
  // Валидация ID пользователя
  if (!user.id || typeof user.id !== 'string' || !/^\d{17,19}$/.test(user.id)) {
    error("Неверный ID пользователя", { userId: user.id, user: user });
    throw new Error("Неверный ID пользователя");
  }

  // Получаем display name пользователя на сервере
  const displayName = member?.displayName || member?.nickname || user.username;

  // Сохраняем данные заявки в JSON файл
  const absenceData = {
    id: absenceId,
    userId: user.id,
    username: user.username,
    displayName: displayName,
    absenceType: data.absenceType,
    startDate: data.startDate,
    endDate: data.endDate || "",
    reason: data.reason || "",
    additionalInfo: data.additionalInfo || "",
    submittedAt: new Date().toISOString(),
    status: 'pending' as const
  };
  
  // Сохраняем заявку в файл
  const pendingAbsences = loadJson<AbsenceRequest[]>(getDataFilePath("pending_absences.json")) || [];
  pendingAbsences.push(absenceData);
  saveJson(getDataFilePath("pending_absences.json"), pendingAbsences);
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_absence_${absenceId}`)
        .setLabel("✅ Одобрить")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_absence_${absenceId}`)
        .setLabel("❌ Отклонить")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`view_details_${absenceId}`)
        .setLabel("👁️ Подробности")
        .setStyle(ButtonStyle.Secondary)
    );

  embed.setFooter({ 
    text: `ID пользователя: ${user.id} • Заявка создана автоматически` 
  }).setTimestamp();

  return { embeds: [embed], components: [row] };
}

/**
 * Обработчик кнопок заявок отсутствия
 */
export async function handleAbsenceTicketButton(interaction: any) {
  try {
    const customId = interaction.customId;
    
    // Извлекаем ID заявки из customId
    let absenceId;
    if (customId.startsWith("approve_absence_")) {
      absenceId = customId.replace("approve_absence_", "");
    } else if (customId.startsWith("reject_absence_")) {
      absenceId = customId.replace("reject_absence_", "");
    } else if (customId.startsWith("view_details_")) {
      absenceId = customId.replace("view_details_", "");
    } else {
      await interaction.reply({ 
        content: "❌ Ошибка: неверный формат кнопки!", 
        ephemeral: true 
      });
      return;
    }
    
    // Находим заявку по ID
    const absenceData = findAbsenceById(absenceId);
    if (!absenceData) {
      await interaction.reply({ 
        content: "❌ Заявка не найдена!", 
        ephemeral: true 
      });
      return;
    }
    
    const userId = absenceData.userId;

    // Валидация ID пользователя
    if (!userId || typeof userId !== 'string' || !/^\d{17,19}$/.test(userId)) {
      error("Неверный ID пользователя в заявке", { userId, absenceId });
      await interaction.reply({ 
        content: "❌ Ошибка: неверный ID пользователя в заявке!", 
        ephemeral: true 
      });
      return;
    }

    // Проверяем права пользователя (модераторы, офицеры и администраторы)
    const hasPermission = interaction.member?.roles.cache.some((role: any) => 
      [...ADMIN_ROLE_IDS, ...MODERATOR_ROLE_IDS].includes(role.id)
    );

    if (!hasPermission) {
      await interaction.reply({ 
        content: "❌ У вас нет прав для управления заявками отсутствия!", 
        ephemeral: true 
      });
      return;
    }

    const user = await interaction.client.users.fetch(userId);
    if (!user) {
      await interaction.reply({ 
        content: "❌ Пользователь не найден!", 
        ephemeral: true 
      });
      return;
    }

    if (customId.startsWith("approve_absence_")) {
      // Извлекаем ID заявки из customId
      const absenceId = customId.replace("approve_absence_", "");
      const absenceData = findAbsenceById(absenceId);
      
      if (!absenceData) {
        await interaction.reply({ 
          content: "❌ Заявка не найдена!", 
          ephemeral: true 
        });
        return;
      }

      const { userId, username, displayName, absenceType, startDate, endDate, reason, additionalInfo } = absenceData;

      // Создаем запись о заявке
      const absenceRequest: AbsenceRequest = {
        id: absenceId,
        userId: userId,
        username: user.username,
        displayName: absenceData.displayName || user.username,
        absenceType: absenceType,
        startDate: startDate,
        endDate: endDate || undefined,
        reason: reason === "Не указана" ? "" : reason,
        additionalInfo: additionalInfo || undefined,
        submittedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: interaction.user.username,
        status: 'approved'
      };

      // Сохраняем заявку в JSON
      addApprovedAbsence(absenceRequest);
      
      // Удаляем из ожидающих заявок
      removePendingAbsence(absenceId);

      // Обновляем embed с информацией об одобрении, но оставляем форму
      const updatedEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Заявка об отсутствии одобрена")
        .setDescription(`**Пользователь:** ${user}\n**Статус:** ✅ Одобрено\n**Одобрил:** ${interaction.user}`)
        .addFields(
          {
            name: "📅 Период отсутствия",
            value: endDate ? `**С:** ${startDate}\n**По:** ${endDate}` : `**С:** ${startDate}`,
            inline: true
          },
          {
            name: "📋 Тип отсутствия",
            value: absenceType === "длительное" ? "🕐 Длительное отсутствие" : "🏛️ Отсутствие на собрании",
            inline: true
          },
          {
            name: "⏰ Дата одобрения",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true
          }
        );

      if (reason && reason !== "Не указана") {
        updatedEmbed.addFields({
          name: "📝 Причина отсутствия",
          value: reason,
          inline: false
        });
      }

      if (additionalInfo) {
        updatedEmbed.addFields({
          name: "ℹ️ Дополнительная информация",
          value: additionalInfo,
          inline: false
        });
      }

      updatedEmbed.setFooter({ 
        text: `ID заявки: ${absenceRequest.id} • Одобрено автоматически` 
      }).setTimestamp();

      // Убираем кнопки модерации, оставляем только кнопку просмотра
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`view_details_${absenceId}`)
            .setLabel("👁️ Подробности")
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.update({ 
        embeds: [updatedEmbed], 
        components: [row]
      });

      // Уведомляем пользователя
      try {
        await user.send({
          content: "✅ Ваша заявка об отсутствии была одобрена!",
          embeds: [updatedEmbed]
        });
      } catch (error) {
        // Игнорируем ошибки отправки ЛС
      }

      logCommand("Заявка об отсутствии одобрена и сохранена", { 
        moderatorId: interaction.user.id, 
        userId: userId,
        moderator: interaction.user.tag,
        absenceId: absenceRequest.id
      });

    } else if (customId.startsWith("reject_absence_")) {
      // Извлекаем ID заявки из customId
      const absenceId = customId.replace("reject_absence_", "");
      const absenceData = findAbsenceById(absenceId);
      
      if (!absenceData) {
        await interaction.reply({ 
          content: "❌ Заявка не найдена!", 
          ephemeral: true 
        });
        return;
      }

      const { userId, username, displayName, absenceType, startDate, endDate, reason, additionalInfo } = absenceData;

      // Создаем запись о заявке
      const absenceRequest: AbsenceRequest = {
        id: absenceId,
        userId: userId,
        username: user.username,
        displayName: absenceData.displayName || user.username,
        absenceType: absenceType,
        startDate: startDate,
        endDate: endDate || undefined,
        reason: reason === "Не указана" ? "" : reason,
        additionalInfo: additionalInfo || undefined,
        submittedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: interaction.user.username,
        status: 'rejected'
      };

      // Сохраняем заявку в JSON
      addApprovedAbsence(absenceRequest);
      
      // Удаляем из ожидающих заявок
      removePendingAbsence(absenceId);

      // Обновляем embed с информацией об отклонении, но оставляем форму
      const updatedEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("❌ Заявка об отсутствии отклонена")
        .setDescription(`**Пользователь:** ${user}\n**Статус:** ❌ Отклонено\n**Отклонил:** ${interaction.user}`)
        .addFields(
          {
            name: "📅 Период отсутствия",
            value: endDate ? `**С:** ${startDate}\n**По:** ${endDate}` : `**С:** ${startDate}`,
            inline: true
          },
          {
            name: "📋 Тип отсутствия",
            value: absenceType === "длительное" ? "🕐 Длительное отсутствие" : "🏛️ Отсутствие на собрании",
            inline: true
          },
          {
            name: "⏰ Дата отклонения",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true
          }
        );

      if (reason && reason !== "Не указана") {
        updatedEmbed.addFields({
          name: "📝 Причина отсутствия",
          value: reason,
          inline: false
        });
      }

      if (additionalInfo) {
        updatedEmbed.addFields({
          name: "ℹ️ Дополнительная информация",
          value: additionalInfo,
          inline: false
        });
      }

      updatedEmbed.setFooter({ 
        text: `ID заявки: ${absenceRequest.id} • Отклонено автоматически` 
      }).setTimestamp();

      // Убираем кнопки модерации, оставляем только кнопку просмотра
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`view_details_${absenceId}`)
            .setLabel("👁️ Подробности")
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.update({ 
        embeds: [updatedEmbed], 
        components: [row]
      });

      // Уведомляем пользователя
      try {
        await user.send({
          content: "❌ Ваша заявка об отсутствии была отклонена. Обратитесь к офицерам для уточнения деталей.",
          embeds: [updatedEmbed]
        });
      } catch (error) {
        // Игнорируем ошибки отправки ЛС
      }

      logCommand("Заявка об отсутствии отклонена и сохранена", { 
        moderatorId: interaction.user.id, 
        userId: userId,
        moderator: interaction.user.tag,
        absenceId: absenceRequest.id
      });

    } else if (customId.startsWith("view_details_")) {
      // Извлекаем ID заявки из customId
      const absenceId = customId.replace("view_details_", "");
      const absenceData = findAbsenceById(absenceId);
      
      if (!absenceData) {
        await interaction.reply({ 
          content: "❌ Заявка не найдена!", 
          ephemeral: true 
        });
        return;
      }

      const { userId, username, displayName, absenceType, startDate, endDate, reason, additionalInfo } = absenceData;
      
      // Показываем подробную информацию
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Подробности заявки")
        .setDescription("Детальная информация о заявке об отсутствии")
        .addFields(
          {
            name: "👤 Пользователь",
            value: `<@${userId}> (${displayName || username})`,
            inline: true
          },
          {
            name: "📋 Тип отсутствия",
            value: absenceType === "длительное" ? "🕐 Длительное отсутствие" : "🏛️ Отсутствие на собрании",
            inline: true
          },
          {
            name: "📅 Период",
            value: endDate ? `**С:** ${startDate}\n**По:** ${endDate}` : `**С:** ${startDate}`,
            inline: true
          },
          {
            name: "📝 Причина",
            value: reason || "Не указана",
            inline: false
          }
        );

      if (additionalInfo) {
        embed.addFields({
          name: "ℹ️ Дополнительная информация",
          value: additionalInfo,
          inline: false
        });
      }

      embed.setTimestamp();

      await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
      });
    }

  } catch (err: any) {
    error("Ошибка при обработке кнопки заявки отсутствия", err);
    await interaction.reply({ 
      content: "❌ Произошла ошибка при обработке заявки!", 
      ephemeral: true 
    });
  }
}

/**
 * Команда для просмотра списка одобренных заявок об отсутствии
 */
export async function absencelistCommand(interaction: ChatInputCommandInteraction) {
  try {
    logCommand("Выполняется команда absencelist", { 
      userId: interaction.user.id, 
      username: interaction.user.tag 
    });

    const absences = loadApprovedAbsences();
    
    if (absences.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Список заявок об отсутствии")
        .setDescription("Нет одобренных заявок об отсутствии")
        .setTimestamp();

      await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
      });
      return;
    }

    // Группируем заявки по статусу
    const approvedAbsences = absences.filter(a => a.status === 'approved');
    const rejectedAbsences = absences.filter(a => a.status === 'rejected');

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📋 Список заявок об отсутствии")
      .setDescription(`Всего заявок: ${absences.length}\nОдобрено: ${approvedAbsences.length}\nОтклонено: ${rejectedAbsences.length}`)
      .setTimestamp();

    // Показываем последние 10 заявок
    const recentAbsences = absences
      .filter(a => a.approvedAt) // Только заявки с датой одобрения
      .sort((a, b) => new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime())
      .slice(0, 10);

    if (recentAbsences.length > 0) {
      let description = "**Последние заявки:**\n\n";
      
      for (const absence of recentAbsences) {
        const status = absence.status === 'approved' ? '✅' : '❌';
        const period = absence.endDate ? `${absence.startDate} - ${absence.endDate}` : `с ${absence.startDate}`;
        const approvedDate = absence.approvedAt ? new Date(absence.approvedAt).toLocaleDateString('ru-RU') : 'Не указана';
        
        description += `${status} **${absence.displayName || absence.username}** - ${period} (${approvedDate})\n`;
        description += `   Тип: ${absence.absenceType === 'длительное' ? 'Длительное' : 'Собрание'}\n`;
        if (absence.reason) {
          description += `   Причина: ${absence.reason}\n`;
        }
        description += `   Одобрил: ${absence.approvedBy}\n\n`;
      }

      embed.addFields({
        name: "📝 Детали",
        value: description.length > 1024 ? description.substring(0, 1020) + "..." : description,
        inline: false
      });
    }

    await interaction.reply({ 
      embeds: [embed], 
      ephemeral: true 
    });

    logCommand("Список заявок показан", { 
      userId: interaction.user.id, 
      username: interaction.user.tag,
      totalAbsences: absences.length
    });

  } catch (err: any) {
    error("Ошибка при выполнении команды absencelist", err);
    await interaction.reply({ 
      content: "❌ Произошла ошибка при получении списка заявок!", 
      ephemeral: true 
    });
  }
}
