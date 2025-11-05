import { getDataFilePath } from "./utils/paths";

export const usersPath = getDataFilePath("users.json");
export const trackedPath = getDataFilePath("tracked.json");

export const OFFICER_ROLE_IDS = ["820326884071047219", "820326884071047220"];
export const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID!;
export const VOICE_CHANNEL_IDS = ["763085196118851608", "885928590720524328"];
export const STATS_CHANNEL_ID = "763085196118851607";
export const ABSENCE_THREAD_ID = "1415220285904257075"; // Ветка для заявок об отсутствии

// Лётная академия
export const FLIGHT_ACADEMY_CHANNEL_ID = "1411622997147521095";
export const FLIGHT_ACADEMY_NOTIFY_USER_ID = "1011550567266533447";

// Система тикетов лётной академии
// export const FLIGHT_ACADEMY_TICKET_CATEGORY_ID = "FLIGHT_ACADEMY_TICKETS"; // ID категории для тикетов (временно отключено)
export const FLIGHT_ACADEMY_OFFICER_ROLE_IDS = [
  "832294803706085396"
];

// Роли для ограничений команд
export const ADMIN_ROLE_IDS = ["820326884071047219", "820326884071047220", "1103669499573567498", "820720829926080552", "832340940395118594", "1030892555908431935", "820326884071047219"]; // Офицеры
export const MODERATOR_ROLE_IDS = ["820326884071047219", "820326884071047220", "1239606290959826944", "820056309918466048"]; // Офицеры + модераторы
export const PILOT_INSTRUCTOR_ROLE_IDS = ["832294803706085396"]; // Пилоты-инструкторы лётной академии

// Роли для управления твинками
export const TWINK_ADMIN_ROLE_IDS = [
  "820720829926080552",
  "820326884071047219",
  "832340940395118594",
  "831612187767603271",
  "1030892555908431935",
  "820056309918466048"
];

// Ограничения по командам
export const COMMAND_PERMISSIONS = {
  // Команды доступные всем
  public: ["help", "ping", "lichstat", "absenceform"],
  
  // Команды доступные пилотам-инструкторам и выше
  pilot_instructor: ["flight-academy", "aircraft-list", "aircraft-add", "aircraft-remove", "aircraft-update", "ticket-history", "publish-tickets"],
  
  // Команды доступные модераторам и выше
  moderator: ["points", "addtracer", "removetracer", "listtraced", "stats", "simpletest", "absencelist"],
  
  // Команды доступные только офицерам
  officer: ["syncclan", "resettleavers", "pbnotify", "resources", "checktracked", "teststats"],
  
  // Команды доступные только администраторам
  admin: ["runtests"]
};
