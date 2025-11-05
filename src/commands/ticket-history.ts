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
  TextInputStyle
} from "discord.js";
import { 
  loadTicketHistory, 
  getTicketStats, 
  getUserTickets, 
  getOpenTickets, 
  getClosedTickets 
} from "../utils/ticketHistory.js";
import { info, error } from "../utils/logger.js";

export const data = new SlashCommandBuilder()
  .setName("ticket-history")
  .setDescription("Просмотр истории тикетов лётной академии")
  .setDefaultMemberPermissions(0) // Убираем ограничение по правам, будем проверять роли
  .addStringOption(option =>
    option
      .setName("тип")
      .setDescription("Тип фильтрации тикетов")
      .setRequired(false)
      .addChoices(
        { name: "Все тикеты", value: "all" },
        { name: "Открытые", value: "open" },
        { name: "Закрытые", value: "closed" },
        { name: "Лицензии", value: "licenses" },
        { name: "Обучение", value: "training" },
        { name: "Мои тикеты", value: "my" },
        { name: "Лицензии сданы", value: "completed" },
        { name: "Лицензии не сданы", value: "failed" },
        { name: "Отменённые", value: "cancelled" }
      )
  )

export async function execute(interaction: ChatInputCommandInteraction | any, page: number = 0, filterType: string = "all") {
  try {
    info(`[TICKET-HISTORY] Команда /ticket-history вызвана пользователем ${interaction.user.tag} (${interaction.user.id})`);
    
    // Получаем тип фильтра из опций команды или используем переданный параметр
    const actualFilterType = interaction.options?.getString("тип") || filterType;
    const TICKETS_PER_PAGE = 5;
    
    let tickets = [];
    let title = "📋 История тикетов";
    
    // Получаем тикеты в зависимости от фильтра
    switch (actualFilterType) {
      case "open":
        tickets = getOpenTickets();
        title = "📋 Открытые тикеты";
        break;
      case "closed":
        tickets = getClosedTickets();
        title = "📋 Закрытые тикеты";
        break;
      case "licenses":
        const allTickets = loadTicketHistory().tickets;
        tickets = allTickets.filter(t => t.type === 'license');
        title = "📋 Тикеты лицензий";
        break;
      case "training":
        const allTickets2 = loadTicketHistory().tickets;
        tickets = allTickets2.filter(t => t.type === 'training');
        title = "📋 Тикеты обучения";
        break;
      case "my":
        tickets = getUserTickets(interaction.user.id);
        title = "📋 Мои тикеты";
        break;
      case "completed":
        const allTickets3 = loadTicketHistory().tickets;
        tickets = allTickets3.filter(t => t.closeReason === 'completed');
        title = "📋 Лицензии сданы";
        break;
      case "failed":
        const allTickets4 = loadTicketHistory().tickets;
        tickets = allTickets4.filter(t => t.closeReason === 'failed');
        title = "📋 Лицензии не сданы";
        break;
      case "cancelled":
        const allTickets5 = loadTicketHistory().tickets;
        tickets = allTickets5.filter(t => t.closeReason === 'cancelled');
        title = "📋 Отменённые тикеты";
        break;
      default:
        tickets = loadTicketHistory().tickets;
        break;
    }
    
    // Сортируем по дате создания (новые сначала)
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    
    if (tickets.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription("Тикеты не найдены")
        .setColor(0x808080)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    
    // Получаем статистику
    const stats = getTicketStats();
    const totalTickets = tickets.length;
    
    // Применяем пагинацию
    const startIndex = page * TICKETS_PER_PAGE;
    const endIndex = startIndex + TICKETS_PER_PAGE;
    const paginatedTickets = tickets.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalTickets / TICKETS_PER_PAGE);
    
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`Страница ${page + 1} из ${totalPages} | Показано ${paginatedTickets.length} из ${totalTickets} тикетов`)
      .setColor(0x0099ff)
      .setTimestamp();
    
    // Добавляем статистику в embed
    if (actualFilterType === "all") {
      embed.addFields({
        name: "📊 Статистика",
        value: `**Всего:** ${stats.total}\n**Открыто:** ${stats.open}\n**Закрыто:** ${stats.closed}\n**Лицензии:** ${stats.licenses}\n**Обучение:** ${stats.training}`,
        inline: true
      });
    }
    
    // Добавляем информацию о тикетах
    for (let i = 0; i < paginatedTickets.length; i++) {
      const ticket = paginatedTickets[i];
      const status = ticket.status === 'open' ? '🟢' : '🔴';
      const type = ticket.type === 'license' ? '📜' : '🎯';
      const createdAt = new Date(ticket.createdAt).toLocaleDateString('ru-RU');
      const closedAt = ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString('ru-RU') : 'Не закрыт';
      
      let ticketInfo = `${status} ${type} **${ticket.title}**\n`;
      ticketInfo += `👤 **Пользователь:** ${ticket.displayName}\n`;
      ticketInfo += `📅 **Создан:** ${createdAt}\n`;
      ticketInfo += `📅 **Закрыт:** ${closedAt}\n`;
      
      // Добавляем информацию о причине закрытия
      if (ticket.status === 'closed' && ticket.closeReason) {
        const reasonText = {
          'completed': '✅ Лицензия сдана',
          'failed': '❌ Лицензия не сдана',
          'cancelled': '🚫 Отменён',
          'other': '📝 Другая причина'
        }[ticket.closeReason] || '❓ Неизвестно';
        
        ticketInfo += `🔒 **Причина закрытия:** ${reasonText}\n`;
        
        if (ticket.closeDetails) {
          ticketInfo += `📝 **Детали:** ${ticket.closeDetails.length > 100 ? ticket.closeDetails.substring(0, 100) + '...' : ticket.closeDetails}\n`;
        }
      }
      
      if (ticket.messages.length > 0) {
        ticketInfo += `💬 **Сообщений:** ${ticket.messages.length}\n`;
      }
      
      // Добавляем информацию о заявке
      if (ticket.type === 'license' && ticket.applicationData.licenseType) {
        ticketInfo += `✈️ **Лицензия:** ${ticket.applicationData.licenseType}\n`;
        if (ticket.applicationData.aircraftName) {
          ticketInfo += `🛩️ **Самолёт:** ${ticket.applicationData.aircraftName}\n`;
        }
      } else if (ticket.type === 'training' && ticket.applicationData.skillType) {
        ticketInfo += `🎯 **Навык:** ${ticket.applicationData.skillType}\n`;
      }
      
      embed.addFields({
        name: `Тикет #${i + 1}`,
        value: ticketInfo,
        inline: false
      });
    }
    
    // Создаём первый ряд с навигационными кнопками
    const navButtons = [
      new ButtonBuilder()
        .setCustomId("ticket_history_refresh")
        .setLabel("🔄 Обновить")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("ticket_history_stats")
        .setLabel("📊 Статистика")
        .setStyle(ButtonStyle.Secondary)
    ];

    // Добавляем кнопки пагинации в первый ряд
    if (totalPages > 1) {
      if (page > 0) {
        navButtons.push(
          new ButtonBuilder()
            .setCustomId(`ticket_history_page_${page - 1}`)
            .setLabel("⬅️ Назад")
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        navButtons.push(
          new ButtonBuilder()
            .setCustomId(`ticket_history_page_${page + 1}`)
            .setLabel("Вперёд ➡️")
            .setStyle(ButtonStyle.Secondary)
        );
      }
    }

    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(...navButtons);

    // Создаём второй ряд с кнопками "Подробнее" для тикетов
    const ticketButtons = [];
    for (let i = 0; i < paginatedTickets.length; i++) {
      ticketButtons.push(
        new ButtonBuilder()
          .setCustomId(`ticket_details_${paginatedTickets[i].id}`)
          .setLabel(`📋 #${startIndex + i + 1}`)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const ticketRow = new ActionRowBuilder<ButtonBuilder>().addComponents(...ticketButtons);
    
    // Собираем все ряды кнопок
    const components = [navRow];
    if (ticketButtons.length > 0) {
      components.push(ticketRow);
    }

    // Если это обновление существующего сообщения (кнопка), используем update
    if (interaction.isButton()) {
      await interaction.update({ 
        embeds: [embed], 
        components: components
      });
    } else {
      // Если это новая команда, используем reply
      await interaction.reply({ 
        embeds: [embed], 
        components: components,
        ephemeral: true 
      });
    }
    
    info(`[TICKET-HISTORY] История тикетов показана для ${interaction.user.tag}: ${tickets.length} тикетов`);
    
  } catch (err) {
    error(`[TICKET-HISTORY] Ошибка при показе истории тикетов для ${interaction.user.tag}:`, err);
    
    if (interaction.isButton()) {
      await interaction.update({
        content: "❌ Произошла ошибка при загрузке истории тикетов",
        embeds: [],
        components: []
      });
    } else {
      await interaction.reply({
        content: "❌ Произошла ошибка при загрузке истории тикетов",
        ephemeral: true
      });
    }
  }
}

// Функция для определения типа фильтра из сообщения
function getFilterTypeFromMessage(message: any): string {
  try {
    // Пытаемся определить тип фильтра по заголовку embed
    const embed = message.embeds?.[0];
    if (!embed) return "all";
    
    const title = embed.title;
    if (title?.includes("Открытые")) return "open";
    if (title?.includes("Закрытые")) return "closed";
    if (title?.includes("лицензий")) return "licenses";
    if (title?.includes("обучения")) return "training";
    if (title?.includes("Мои")) return "my";
    if (title?.includes("сданы")) return "completed";
    if (title?.includes("не сданы")) return "failed";
    if (title?.includes("Отменённые")) return "cancelled";
    
    return "all";
  } catch (err) {
    error(`[TICKET-HISTORY] Ошибка при определении типа фильтра:`, err);
    return "all";
  }
}

// Обработчик кнопок истории тикетов
export async function handleTicketHistoryButton(interaction: any) {
  try {
    if (interaction.customId === "ticket_history_refresh") {
      // Обновляем историю - получаем фильтр из оригинального сообщения
      const filterType = getFilterTypeFromMessage(interaction.message);
      await execute(interaction, 0, filterType);
      return;
    }
    
    // Обработка кнопок пагинации
    if (interaction.customId.startsWith("ticket_history_page_")) {
      const page = parseInt(interaction.customId.replace("ticket_history_page_", ""));
      const filterType = getFilterTypeFromMessage(interaction.message);
      await execute(interaction, page, filterType);
      return;
    }
    
    if (interaction.customId === "ticket_history_stats") {
      // Показываем детальную статистику
      const stats = getTicketStats();
      const history = loadTicketHistory();
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Детальная статистика тикетов")
        .setColor(0x00ff00)
        .addFields(
          { name: "📈 Общая статистика", value: `**Всего тикетов:** ${stats.total}\n**Открыто:** ${stats.open}\n**Закрыто:** ${stats.closed}`, inline: true },
          { name: "📋 По типам", value: `**Лицензии:** ${stats.licenses}\n**Обучение:** ${stats.training}`, inline: true },
          { name: "🕒 Время", value: `**Последнее обновление:** <t:${Math.floor(new Date(stats.lastUpdated).getTime() / 1000)}:R>`, inline: false }
        )
        .setTimestamp();
      
      // Добавляем информацию о последних тикетах
      const recentTickets = history.tickets
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      if (recentTickets.length > 0) {
        let recentInfo = "";
        for (const ticket of recentTickets) {
          const status = ticket.status === 'open' ? '🟢' : '🔴';
          const type = ticket.type === 'license' ? '📜' : '🎯';
          const createdAt = new Date(ticket.createdAt).toLocaleDateString('ru-RU');
          recentInfo += `${status} ${type} ${ticket.title} (${createdAt})\n`;
        }
        
        embed.addFields({
          name: "🕐 Последние тикеты",
          value: recentInfo,
          inline: false
        });
      }
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    
    // Обработка кнопок "Подробнее" для конкретных тикетов
    if (interaction.customId.startsWith("ticket_details_")) {
      const ticketId = interaction.customId.replace("ticket_details_", "");
      const history = loadTicketHistory();
      const ticket = history.tickets.find(t => t.id === ticketId);
      
      if (!ticket) {
        await interaction.reply({
          content: "❌ Тикет не найден",
          ephemeral: true
        });
        return;
      }
      
      // Отправляем детали тикета как обычное сообщение
      const details = formatTicketDetails(ticket);
      
      // Разбиваем на части, если сообщение слишком длинное
      const maxLength = 2000;
      if (details.length <= maxLength) {
        await interaction.reply({
          content: `📋 **Детали тикета: ${ticket.title}**\n\n${details}`,
          ephemeral: true
        });
      } else {
        // Отправляем первую часть
        await interaction.reply({
          content: `📋 **Детали тикета: ${ticket.title}**\n\n${details.substring(0, maxLength)}...`,
          ephemeral: true
        });
        
        // Отправляем остальную часть как follow-up
        const remaining = details.substring(maxLength);
        const chunks = remaining.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
        
        for (const chunk of chunks) {
          await interaction.followUp({
            content: chunk,
            ephemeral: true
          });
        }
      }
      return;
    }
    
  } catch (err) {
    error(`[TICKET-HISTORY] Ошибка при обработке кнопки истории тикетов:`, err);
    
    if (interaction.isButton()) {
      await interaction.update({
        content: "❌ Произошла ошибка при обработке запроса",
        embeds: [],
        components: []
      });
    } else {
      await interaction.reply({
        content: "❌ Произошла ошибка при обработке запроса",
        ephemeral: true
      });
    }
  }
}

// Функция для форматирования детальной информации о тикете
export function formatTicketDetails(ticket: any): string {
  const status = ticket.status === 'open' ? '🟢 Открыт' : '🔴 Закрыт';
  const type = ticket.type === 'license' ? '📜 Лицензия' : '🎯 Обучение';
  const createdAt = new Date(ticket.createdAt).toLocaleString('ru-RU');
  const closedAt = ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('ru-RU') : 'Не закрыт';
  
  let details = `=== ИНФОРМАЦИЯ О ТИКЕТЕ ===\n`;
  details += `🆔 ID: ${ticket.id}\n`;
  details += `📋 Название: ${ticket.title}\n`;
  details += `👤 Пользователь: ${ticket.displayName} (${ticket.username})\n`;
  details += `📅 Создан: ${createdAt}\n`;
  details += `📅 Закрыт: ${closedAt}\n`;
  details += `📊 Статус: ${status}\n`;
  details += `🎯 Тип: ${type}\n`;
  
  if (ticket.status === 'closed' && ticket.closeReason) {
    const reasonText: { [key: string]: string } = {
      'completed': '✅ Лицензия сдана',
      'failed': '❌ Лицензия не сдана',
      'cancelled': '🚫 Отменён',
      'other': '📝 Другая причина'
    };
    const reason = reasonText[ticket.closeReason] || '❓ Неизвестно';
    
    details += `🔒 Причина закрытия: ${reason}\n`;
    
    if (ticket.closeDetails) {
      details += `📝 Детали: ${ticket.closeDetails}\n`;
    }
  }
  
  // Информация о заявке
  if (ticket.type === 'license' && ticket.applicationData.licenseType) {
    details += `\n=== ДАННЫЕ ЗАЯВКИ НА ЛИЦЕНЗИЮ ===\n`;
    details += `✈️ Тип лицензии: ${ticket.applicationData.licenseType}\n`;
    if (ticket.applicationData.aircraftName) {
      details += `🛩️ Самолёт: ${ticket.applicationData.aircraftName}\n`;
    }
    if (ticket.applicationData.experience) {
      details += `📚 Опыт: ${ticket.applicationData.experience}\n`;
    }
    if (ticket.applicationData.motivation) {
      details += `💭 Мотивация: ${ticket.applicationData.motivation}\n`;
    }
  } else if (ticket.type === 'training' && ticket.applicationData.skillType) {
    details += `\n=== ДАННЫЕ ЗАЯВКИ НА ОБУЧЕНИЕ ===\n`;
    details += `🎯 Навык: ${ticket.applicationData.skillType}\n`;
    if (ticket.applicationData.currentSkill) {
      details += `📊 Текущий уровень: ${ticket.applicationData.currentSkill}\n`;
    }
    if (ticket.applicationData.goals) {
      details += `🎯 Цели: ${ticket.applicationData.goals}\n`;
    }
  }
  
  // История сообщений
  if (ticket.messages && ticket.messages.length > 0) {
    details += `\n=== ИСТОРИЯ СООБЩЕНИЙ (${ticket.messages.length}) ===\n`;
    
    for (let i = 0; i < ticket.messages.length; i++) {
      const message = ticket.messages[i];
      const messageTime = new Date(message.timestamp).toLocaleString('ru-RU');
      const isSystem = message.isSystem ? '[СИСТЕМА]' : '';
      
      details += `\n--- Сообщение ${i + 1} ---\n`;
      details += `👤 Автор: ${message.authorName} ${isSystem}\n`;
      details += `🕒 Время: ${messageTime}\n`;
      details += `💬 Текст: ${message.content}\n`;
      
      if (message.attachments && message.attachments.length > 0) {
        details += `📎 Вложения: ${message.attachments.join(', ')}\n`;
      }
    }
  } else {
    details += `\n=== ИСТОРИЯ СООБЩЕНИЙ ===\n`;
    details += `💬 Сообщений нет\n`;
  }
  
  return details;
}
