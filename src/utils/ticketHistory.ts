import { getDataFilePath } from "./paths";
import { loadJson, saveJson } from "./json";
import { TicketData, TicketHistory, TicketMessage } from "../types/tickets";
import { info, error } from "./logger";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const TICKET_HISTORY_PATH = getDataFilePath("ticket_history.json");

/**
 * Загружает историю тикетов из файла
 */
export function loadTicketHistory(): TicketHistory {
  try {
    const history = loadJson<TicketHistory>(TICKET_HISTORY_PATH);
    if (!history) {
      // Если файл не существует, создаем пустую историю
      const emptyHistory = { tickets: [], lastUpdated: new Date().toISOString() };
      saveJson(TICKET_HISTORY_PATH, emptyHistory);
      return emptyHistory;
    }
    return history;
  } catch (err: any) {
    error("Ошибка при загрузке истории тикетов", err);
    // Создаем пустую историю при ошибке
    const emptyHistory = { tickets: [], lastUpdated: new Date().toISOString() };
    try {
      saveJson(TICKET_HISTORY_PATH, emptyHistory);
    } catch (saveErr) {
      error("Ошибка при создании пустой истории тикетов", saveErr);
    }
    return emptyHistory;
  }
}

/**
 * Сохраняет историю тикетов в файл
 */
export function saveTicketHistory(history: TicketHistory): void {
  try {
    history.lastUpdated = new Date().toISOString();
    saveJson(TICKET_HISTORY_PATH, history);
    info(`История тикетов сохранена: ${history.tickets.length} тикетов`);
  } catch (err: any) {
    error("Ошибка при сохранении истории тикетов", err);
  }
}

/**
 * Создает новый тикет
 */
export function createTicket(ticketData: Omit<TicketData, 'messages'>): TicketData {
  try {
    info(`[TICKET-HISTORY] Создание нового тикета: ${ticketData.id} (${ticketData.type})`);
    
    const ticket: TicketData = {
      ...ticketData,
      messages: []
    };
    
    info(`[TICKET-HISTORY] Загружаем историю тикетов...`);
    const history = loadTicketHistory();
    info(`[TICKET-HISTORY] История загружена: ${history.tickets.length} тикетов`);
    
    history.tickets.push(ticket);
    info(`[TICKET-HISTORY] Тикет добавлен в историю, сохраняем...`);
    
    saveTicketHistory(history);
    info(`[TICKET-HISTORY] История сохранена успешно`);
    
    info(`Создан новый тикет: ${ticket.id} (${ticket.type})`);
    return ticket;
  } catch (err: any) {
    error(`[TICKET-HISTORY] Ошибка при создании тикета ${ticketData.id}:`, err);
    console.error(`[TICKET-HISTORY] Детали ошибки:`, err);
    throw err;
  }
}

/**
 * Находит тикет по ID канала
 */
export function findTicketByChannelId(channelId: string): TicketData | null {
  const history = loadTicketHistory();
  return history.tickets.find(ticket => ticket.channelId === channelId) || null;
}

/**
 * Находит тикет по ID тикета
 */
export function findTicketById(ticketId: string): TicketData | null {
  const history = loadTicketHistory();
  return history.tickets.find(ticket => ticket.id === ticketId) || null;
}

/**
 * Обновляет тикет
 */
export function updateTicket(ticketId: string, updates: Partial<TicketData>): boolean {
  const history = loadTicketHistory();
  const ticketIndex = history.tickets.findIndex(ticket => ticket.id === ticketId);
  
  if (ticketIndex === -1) {
    error(`Тикет с ID ${ticketId} не найден`);
    return false;
  }
  
  history.tickets[ticketIndex] = { ...history.tickets[ticketIndex], ...updates };
  saveTicketHistory(history);
  
  info(`Тикет ${ticketId} обновлен`);
  return true;
}

/**
 * Добавляет сообщение в тикет
 */
export function addMessageToTicket(channelId: string, message: TicketMessage): boolean {
  const ticket = findTicketByChannelId(channelId);
  if (!ticket) {
    error(`Тикет для канала ${channelId} не найден`);
    return false;
  }
  
  ticket.messages.push(message);
  return updateTicket(ticket.id, { messages: ticket.messages });
}

/**
 * Закрывает тикет
 */
export function closeTicket(channelId: string, closedBy: string, reason?: string, details?: string): boolean {
  const ticket = findTicketByChannelId(channelId);
  if (!ticket) {
    error(`Тикет для канала ${channelId} не найден`);
    return false;
  }
  
  return updateTicket(ticket.id, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    closedBy,
    closeReason: reason || 'other',
    closeDetails: details
  });
}

/**
 * Получает все тикеты пользователя
 */
export function getUserTickets(userId: string): TicketData[] {
  const history = loadTicketHistory();
  return history.tickets.filter(ticket => ticket.userId === userId);
}

/**
 * Получает все открытые тикеты
 */
export function getOpenTickets(): TicketData[] {
  const history = loadTicketHistory();
  return history.tickets.filter(ticket => ticket.status === 'open');
}

/**
 * Получает все закрытые тикеты
 */
export function getClosedTickets(): TicketData[] {
  const history = loadTicketHistory();
  return history.tickets.filter(ticket => ticket.status === 'closed');
}

/**
 * Получает статистику тикетов
 */
export function getTicketStats() {
  const history = loadTicketHistory();
  const tickets = history.tickets;
  
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    licenses: tickets.filter(t => t.type === 'license').length,
    training: tickets.filter(t => t.type === 'training').length,
    lastUpdated: history.lastUpdated
  };
  
  return stats;
}

/**
 * Публикует тикет в канал истории
 */
export async function publishTicketToHistory(client: any, ticketId: string): Promise<boolean> {
  try {
    const HISTORY_CHANNEL_ID = "1423965263908438126";
    
    // Получаем тикет
    const ticket = findTicketById(ticketId);
    if (!ticket) {
      error(`[PUBLISH-TICKET] Тикет ${ticketId} не найден`);
      return false;
    }
    
    // Проверяем, не опубликован ли уже
    if (ticket.published) {
      info(`[PUBLISH-TICKET] Тикет ${ticketId} уже опубликован`);
      return true;
    }
    
    // Получаем канал истории
    const historyChannel = await client.channels.fetch(HISTORY_CHANNEL_ID);
    if (!historyChannel) {
      error(`[PUBLISH-TICKET] Канал истории ${HISTORY_CHANNEL_ID} не найден`);
      return false;
    }
    
    // Создаем embed для тикета
    const embed = createTicketEmbedForHistory(ticket);
    const components = createTicketComponentsForHistory(ticket);
    
    // Публикуем в канал
    await historyChannel.send({
      embeds: [embed],
      components: components
    });
    
    // Отмечаем как опубликованный
    updateTicket(ticketId, { published: true });
    
    info(`[PUBLISH-TICKET] Тикет ${ticketId} успешно опубликован в канал истории`);
    return true;
    
  } catch (err) {
    error(`[PUBLISH-TICKET] Ошибка при публикации тикета ${ticketId}:`, err);
    return false;
  }
}

/**
 * Создает embed для публикации в канал истории
 */
function createTicketEmbedForHistory(ticket: any): any {
  const status = ticket.status === 'open' ? '🟢 Открыт' : '🔴 Закрыт';
  const type = ticket.type === 'license' ? '📜 Лицензия' : '🎯 Обучение';
  const createdAt = new Date(ticket.createdAt).toLocaleDateString('ru-RU');
  const closedAt = ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString('ru-RU') : 'Не закрыт';
  
  const embed: any = {
    title: `${type} ${ticket.title}`,
    description: `**Статус:** ${status}\n**Пользователь:** ${ticket.displayName}\n**Создан:** ${createdAt}\n**Закрыт:** ${closedAt}`,
    color: ticket.status === 'open' ? 0x00ff00 : 0xff0000,
    timestamp: new Date().toISOString(),
    fields: []
  };
  
  // Добавляем информацию о причине закрытия
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
    
    embed.fields.push({
      name: "Причина закрытия",
      value: reason,
      inline: true
    });
    
    if (ticket.closeDetails) {
      const details = ticket.closeDetails.length > 100 
        ? ticket.closeDetails.substring(0, 100) + '...' 
        : ticket.closeDetails;
      embed.fields.push({
        name: "Детали",
        value: details,
        inline: true
      });
    }
  }
  
  // Добавляем информацию о заявке
  if (ticket.type === 'license' && ticket.applicationData.licenseType) {
    embed.fields.push({
      name: "Лицензия",
      value: ticket.applicationData.licenseType,
      inline: true
    });
    if (ticket.applicationData.aircraftName) {
      embed.fields.push({
        name: "Самолёт",
        value: ticket.applicationData.aircraftName,
        inline: true
      });
    }
  } else if (ticket.type === 'training' && ticket.applicationData.skillType) {
    embed.fields.push({
      name: "Навык",
      value: ticket.applicationData.skillType,
      inline: true
    });
  }
  
  // Добавляем информацию о сообщениях
  if (ticket.messages.length > 0) {
    embed.fields.push({
      name: "Сообщений",
      value: ticket.messages.length.toString(),
      inline: true
    });
  }
  
  return embed;
}

/**
 * Создает компоненты для публикации в канал истории
 */
function createTicketComponentsForHistory(ticket: any): ActionRowBuilder<ButtonBuilder>[] {
  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  
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
