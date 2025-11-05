// Типы для системы управления твинками (полковыми аккаунтами War Thunder)

/**
 * Нации в War Thunder
 */
export type NationCode = 
  | 'de'  // Германия
  | 'ru'  // СССР/Россия
  | 'us'  // США
  | 'jp'  // Япония
  | 'gb'  // Великобритания
  | 'fr'  // Франция
  | 'it'  // Италия
  | 'ch'  // Китай
  | 'is'  // Израиль
  | 'sw'; // Швеция

/**
 * Тип техники
 */
export type VehicleType = 
  | 'ground'     // Наземная техника
  | 'airplane'   // Самолёты
  | 'helicopter'; // Вертолёты

/**
 * Техника (единица)
 */
export interface Vehicle {
  name: string;      // Название техники (например, "Leopard A7", "Tiger H1")
  br: number;        // Battle Rating (например, 5.7, 6.0, 10.3)
  nation: NationCode; // Нация техники
  type: VehicleType;  // Тип техники
}

/**
 * Данные твинка
 */
export interface TwinkData {
  id: string;              // Уникальный ID твинка (генерируется при создании)
  username: string;         // Имя пользователя в игре
  login?: string;           // Логин аккаунта (опционально)
  password?: string;        // Пароль аккаунта (опционально)
  has2FA: boolean;         // Есть ли двухфакторная авторизация
  twoFactorContact?: string; // Контакт (Discord пользователь) для доступа по 2FA
  vehicles: Vehicle[];      // Список техники
  createdAt: string;        // Дата создания записи
  updatedAt: string;        // Дата последнего обновления
  createdBy?: string;       // ID пользователя Discord, создавшего запись
  updatedBy?: string;       // ID пользователя Discord, обновившего запись
}

/**
 * История твинков
 */
export interface TwinkHistory {
  twinks: TwinkData[];
  lastUpdated: string;
}

/**
 * Маппинг кодов наций на их названия
 */
export const NATION_NAMES: Record<NationCode, string> = {
  de: 'Германия',
  ru: 'СССР/Россия',
  us: 'США',
  jp: 'Япония',
  gb: 'Великобритания',
  fr: 'Франция',
  it: 'Италия',
  ch: 'Китай',
  is: 'Израиль',
  sw: 'Швеция'
};

/**
 * Маппинг типов техники на их названия
 */
export const VEHICLE_TYPE_NAMES: Record<VehicleType, string> = {
  ground: 'Наземная техника',
  airplane: 'Самолёты',
  helicopter: 'Вертолёты'
};
