import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  TextChannel
} from "discord.js";
import { 
  loadTicketHistory, 
  updateTicket,
  getClosedTickets 
} from "../utils/ticketHistory.js";
import { info, error } from "../utils/logger.js";

// ID канала истории тикетов
const HISTORY_CHANNEL_ID = "1423965263908438126";

export const data = new SlashCommandBuilder()
  .setName("publish-tickets")
  .setDescription("Публикация тикетов в канал истории лётной академии")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option
      .setName("тип")
      .setDescription("Тип публикации")
      .setRequired(true)
      .addChoices(
        { name: "Все неопубликованные", value: "unpublished" },
        { name: "Только закрытые", value: "closed" },
        { name: "Конкретный тикет", value: "specific" }
      )
  )
  .addStringOption(option =>
    option
      .setName("тикет-id")
      .setDescription("ID конкретного тикета (только для типа 'specific')")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    info(`[PUBLISH-TICKETS] Команда /publish-tickets вызвана пользователем ${interaction.user.tag} (${interaction.user.id})`);
    
    // Отвечаем на взаимодействие, чтобы избежать timeout
    await interaction.deferReply({ ephemeral: true });
    
    const publishType = interaction.options.getString("тип", true);
    const specificTicketId = interaction.options.getString("тикет-id");
    
    // Получаем канал истории
    const historyChannel = await interaction.client.channels.fetch(HISTORY_CHANNEL_ID) as TextChannel;
    if (!historyChannel) {
      await interaction.editReply({
        content: "❌ Канал истории тикетов не найден!"
      });
      return;
    }
    
    let ticketsToPublish: any[] = [];
    
    // Определяем какие тикеты публиковать
    switch (publishType) {
      case "unpublished":
        const allTickets = loadTicketHistory().tickets;
        ticketsToPublish = allTickets.filter(ticket => !ticket.published);
        break;
      case "closed":
        ticketsToPublish = getClosedTickets().filter(ticket => !ticket.published);
        break;
      case "specific":
        if (!specificTicketId) {
          await interaction.editReply({
            content: "❌ Для типа 'specific' необходимо указать ID тикета!"
          });
          return;
        }
        const specificTicket = loadTicketHistory().tickets.find(t => t.id === specificTicketId);
        if (!specificTicket) {
          await interaction.editReply({
            content: "❌ Тикет с указанным ID не найден!"
          });
          return;
        }
        ticketsToPublish = [specificTicket];
        break;
    }
    
    if (ticketsToPublish.length === 0) {
      await interaction.editReply({
        content: "✅ Нет тикетов для публикации!"
      });
      return;
    }
    
    // Сортируем тикеты по дате создания (старые сначала)
    ticketsToPublish.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    let publishedCount = 0;
    const errors = [];
    
    // Публикуем каждый тикет
    for (const ticket of ticketsToPublish) {
      try {
        const embed = createTicketEmbed(ticket);
        const components = createTicketComponents(ticket);
        
        await historyChannel.send({
          embeds: [embed],
          components: components
        });
        
        // Отмечаем тикет как опубликованный
        updateTicket(ticket.id, { published: true });
        publishedCount++;
        
        info(`[PUBLISH-TICKETS] Опубликован тикет ${ticket.id} (${ticket.title})`);
        
        // Небольшая задержка между публикациями
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err: any) {
        error(`[PUBLISH-TICKETS] Ошибка при публикации тикета ${ticket.id}:`, err);
        errors.push(`${ticket.id}: ${err.message}`);
      }
    }
    
    // Отправляем результат
    let resultMessage = `✅ Публикация завершена!\n\n`;
    resultMessage += `📊 **Статистика:**\n`;
    resultMessage += `• Опубликовано: ${publishedCount}\n`;
    resultMessage += `• Ошибок: ${errors.length}\n`;
    resultMessage += `• Всего обработано: ${ticketsToPublish.length}\n`;
    
    if (errors.length > 0) {
      resultMessage += `\n❌ **Ошибки:**\n`;
      resultMessage += errors.slice(0, 5).join('\n');
      if (errors.length > 5) {
        resultMessage += `\n... и ещё ${errors.length - 5} ошибок`;
      }
    }
    
    await interaction.editReply({
      content: resultMessage
    });
    
  } catch (err) {
    error(`[PUBLISH-TICKETS] Ошибка при выполнении команды публикации тикетов:`, err);
    
    try {
      await interaction.editReply({
        content: "❌ Произошла ошибка при публикации тикетов!"
      });
    } catch (editErr) {
      // Если не можем отредактировать, пытаемся ответить
      try {
        await interaction.followUp({
          content: "❌ Произошла ошибка при публикации тикетов!",
          ephemeral: true
        });
      } catch (followUpErr) {
        error(`[PUBLISH-TICKETS] Не удалось отправить сообщение об ошибке:`, followUpErr);
      }
    }
  }
}

// Создает embed для тикета
function createTicketEmbed(ticket: any): EmbedBuilder {
  const status = ticket.status === 'open' ? '🟢 Открыт' : '🔴 Закрыт';
  const type = ticket.type === 'license' ? '📜 Лицензия' : '🎯 Обучение';
  const createdAt = new Date(ticket.createdAt).toLocaleDateString('ru-RU');
  const closedAt = ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString('ru-RU') : 'Не закрыт';
  
  const embed = new EmbedBuilder()
    .setTitle(`${type} ${ticket.title}`)
    .setDescription(`**Статус:** ${status}\n**Пользователь:** ${ticket.displayName}\n**Создан:** ${createdAt}\n**Закрыт:** ${closedAt}`)
    .setColor(ticket.status === 'open' ? 0x00ff00 : 0xff0000)
    .setTimestamp();
  
  // Добавляем информацию о причине закрытия
  if (ticket.status === 'closed' && ticket.closeReason) {
    const reasonText: { [key: string]: string } = {
      'completed': '✅ Лицензия сдана',
      'failed': '❌ Лицензия не сдана',
      'cancelled': '🚫 Отменён',
      'other': '📝 Другая причина'
    };
    const reason = reasonText[ticket.closeReason] || '❓ Неизвестно';
    
    embed.addFields({
      name: "Причина закрытия",
      value: reason,
      inline: true
    });
    
    if (ticket.closeDetails) {
      const details = ticket.closeDetails.length > 100 
        ? ticket.closeDetails.substring(0, 100) + '...' 
        : ticket.closeDetails;
      embed.addFields({
        name: "Детали",
        value: details,
        inline: true
      });
    }
  }
  
  // Добавляем информацию о заявке
  if (ticket.type === 'license' && ticket.applicationData.licenseType) {
    embed.addFields({
      name: "Лицензия",
      value: ticket.applicationData.licenseType,
      inline: true
    });
    if (ticket.applicationData.aircraftName) {
      embed.addFields({
        name: "Самолёт",
        value: ticket.applicationData.aircraftName,
        inline: true
      });
    }
  } else if (ticket.type === 'training' && ticket.applicationData.skillType) {
    embed.addFields({
      name: "Навык",
      value: ticket.applicationData.skillType,
      inline: true
    });
  }
  
  // Добавляем информацию о сообщениях
  if (ticket.messages.length > 0) {
    embed.addFields({
      name: "Сообщений",
      value: ticket.messages.length.toString(),
      inline: true
    });
  }
  
  return embed;
}

// Создает компоненты (кнопки) для тикета
function createTicketComponents(ticket: any): ActionRowBuilder<ButtonBuilder>[] {
  const components = [];
  
  // Кнопка "Подробнее"
  const detailsButton = new ButtonBuilder()
    .setCustomId(`ticket_history_details_${ticket.id}`)
    .setLabel("📋 Подробнее")
    .setStyle(ButtonStyle.Primary);
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(detailsButton);
  
  components.push(row);
  
  return components;
}

// Обработчик кнопок для опубликованных тикетов
export async function handlePublishedTicketButton(interaction: any) {
  try {
    info(`[PUBLISH-TICKETS] Обработка кнопки: ${interaction.customId}`);
    
    if (interaction.customId.startsWith("ticket_history_details_")) {
      const ticketId = interaction.customId.replace("ticket_history_details_", "");
      const history = loadTicketHistory();
      const ticket = history.tickets.find(t => t.id === ticketId);
      
      if (!ticket) {
        await interaction.reply({
          content: "❌ Тикет не найден",
          ephemeral: true
        });
        return;
      }
      
      // Создаем модальное окно с детальной информацией
      const modal = new ModalBuilder()
        .setCustomId(`ticket_details_modal_${ticket.id}`)
        .setTitle(`Детали тикета`);
      
      // Поле с основной информацией
      const mainInfo = new TextInputBuilder()
        .setCustomId("main_info")
        .setLabel("Основная информация")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(formatTicketMainInfo(ticket))
        .setRequired(false);
      
      // Поле с данными заявки
      const applicationData = new TextInputBuilder()
        .setCustomId("application_data")
        .setLabel("Данные заявки")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(formatTicketApplicationData(ticket))
        .setRequired(false);
      
      // Поле с сообщениями
      const messagesText = formatTicketMessages(ticket);
      const messages = new TextInputBuilder()
        .setCustomId("messages")
        .setLabel("История сообщений")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(messagesText.length > 4000 ? messagesText.substring(0, 3997) + "..." : messagesText)
        .setRequired(false);
      
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(mainInfo),
        new ActionRowBuilder<TextInputBuilder>().addComponents(applicationData),
        new ActionRowBuilder<TextInputBuilder>().addComponents(messages)
      );
      
      await interaction.showModal(modal);
      return;
    }
    
  } catch (err) {
    error(`[PUBLISH-TICKETS] Ошибка при обработке кнопки опубликованного тикета:`, err);
    
    await interaction.reply({
      content: "❌ Произошла ошибка при обработке запроса",
      ephemeral: true
    });
  }
}

// Форматирует основную информацию о тикете
function formatTicketMainInfo(ticket: any): string {
  const status = ticket.status === 'open' ? '🟢 Открыт' : '🔴 Закрыт';
  const type = ticket.type === 'license' ? '📜 Лицензия' : '🎯 Обучение';
  const createdAt = new Date(ticket.createdAt).toLocaleString('ru-RU');
  const closedAt = ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('ru-RU') : 'Не закрыт';
  
  let info = `=== ОСНОВНАЯ ИНФОРМАЦИЯ ===\n`;
  info += `🆔 ID: ${ticket.id}\n`;
  info += `📋 Название: ${ticket.title}\n`;
  info += `👤 Пользователь: ${ticket.displayName} (${ticket.username})\n`;
  info += `📅 Создан: ${createdAt}\n`;
  info += `📅 Закрыт: ${closedAt}\n`;
  info += `📊 Статус: ${status}\n`;
  info += `🎯 Тип: ${type}\n`;
  
  if (ticket.status === 'closed' && ticket.closeReason) {
    // Проверяем, является ли это старой фиксированной причиной
    const oldReasons: { [key: string]: string } = {
      'completed': '✅ Лицензия сдана',
      'failed': '❌ Лицензия не сдана',
      'cancelled': '🚫 Отменён',
      'other': '📝 Другая причина'
    };
    
    // Если это старая причина, используем маппинг, иначе показываем как есть
    const reason = oldReasons[ticket.closeReason] || ticket.closeReason;
    
    info += `🔒 Причина закрытия: ${reason}\n`;
    
    if (ticket.closeDetails) {
      info += `📝 Детали: ${ticket.closeDetails}\n`;
    }
  }
  
  return info;
}

// Форматирует данные заявки
function formatTicketApplicationData(ticket: any): string {
  let data = `=== ДАННЫЕ ЗАЯВКИ ===\n`;
  
  if (ticket.type === 'license' && ticket.applicationData.licenseType) {
    data += `✈️ Тип лицензии: ${ticket.applicationData.licenseType}\n`;
    if (ticket.applicationData.aircraftName) {
      data += `🛩️ Самолёт: ${ticket.applicationData.aircraftName}\n`;
    }
    if (ticket.applicationData.experience) {
      data += `📚 Опыт: ${ticket.applicationData.experience}\n`;
    }
    if (ticket.applicationData.motivation) {
      data += `💭 Мотивация: ${ticket.applicationData.motivation}\n`;
    }
  } else if (ticket.type === 'training' && ticket.applicationData.skillType) {
    data += `🎯 Навык: ${ticket.applicationData.skillType}\n`;
    if (ticket.applicationData.currentSkill) {
      data += `📊 Текущий уровень: ${ticket.applicationData.currentSkill}\n`;
    }
    if (ticket.applicationData.goals) {
      data += `🎯 Цели: ${ticket.applicationData.goals}\n`;
    }
  }
  
  return data;
}

// Форматирует сообщения тикета
function formatTicketMessages(ticket: any): string {
  if (!ticket.messages || ticket.messages.length === 0) {
    return "💬 Сообщений нет";
  }
  
  let messages = `=== ИСТОРИЯ СООБЩЕНИЙ (${ticket.messages.length}) ===\n`;
  
  for (let i = 0; i < ticket.messages.length; i++) {
    const message = ticket.messages[i];
    const messageTime = new Date(message.timestamp).toLocaleString('ru-RU');
    const isSystem = message.isSystem ? '[СИСТЕМА]' : '';
    
    messages += `\n--- Сообщение ${i + 1} ---\n`;
    messages += `👤 Автор: ${message.authorName} ${isSystem}\n`;
    messages += `🕒 Время: ${messageTime}\n`;
    messages += `💬 Текст: ${message.content}\n`;
    
    if (message.attachments && message.attachments.length > 0) {
      messages += `📎 Вложения: ${message.attachments.join(', ')}\n`;
    }
  }
  
  return messages;
}
