// Типы для системы тикетов лётной академии

export interface TicketMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  isSystem: boolean; // true для системных сообщений (создание тикета, закрытие и т.д.)
  attachments?: string[]; // URLs вложений
}

export interface TicketData {
  id: string;
  channelId: string;
  type: 'license' | 'training';
  title: string;
  userId: string;
  username: string;
  displayName: string;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  status: 'open' | 'closed';
  closeReason?: string; // Причина закрытия
  closeDetails?: string; // Дополнительные детали закрытия
  published?: boolean; // Опубликован ли тикет в канал истории
  
  // Данные заявки
  applicationData: {
    // Для лицензий
    licenseType?: string;
    aircraftName?: string;
    experience?: string;
    motivation?: string;
    
    // Для обучения навыкам
    skillType?: string;
    currentSkill?: string;
    goals?: string;
  };
  
  // История сообщений
  messages: TicketMessage[];
}

export interface TicketHistory {
  tickets: TicketData[];
  lastUpdated: string;
}
