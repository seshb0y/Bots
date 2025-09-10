<<<<<<< HEAD
import * as path from "path";

export const usersPath = path.join(__dirname, "..", "data", "users.json");
export const trackedPath = path.join(__dirname, "..", "data", "tracked.json");
=======
import { getDataFilePath } from "./utils/paths";

export const usersPath = getDataFilePath("users.json");
export const trackedPath = getDataFilePath("tracked.json");
>>>>>>> feature/absence-thread-integration

export const OFFICER_ROLE_IDS = ["820326884071047219", "820326884071047220"];
export const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID!;
export const VOICE_CHANNEL_IDS = ["763085196118851608", "885928590720524328"];
export const STATS_CHANNEL_ID = "763085196118851607";
<<<<<<< HEAD
=======
export const ABSENCE_THREAD_ID = "1415220285904257075"; // Ветка для заявок об отсутствии
>>>>>>> feature/absence-thread-integration

// Лётная академия
export const FLIGHT_ACADEMY_CHANNEL_ID = "1411622997147521095";
export const FLIGHT_ACADEMY_NOTIFY_USER_ID = "1011550567266533447";

// Система тикетов лётной академии
// export const FLIGHT_ACADEMY_TICKET_CATEGORY_ID = "FLIGHT_ACADEMY_TICKETS"; // ID категории для тикетов (временно отключено)
export const FLIGHT_ACADEMY_OFFICER_ROLE_IDS = [
<<<<<<< HEAD
  "831612187767603271"
=======
  "832294803706085396"
>>>>>>> feature/absence-thread-integration
];

// Роли для ограничений команд
export const ADMIN_ROLE_IDS = ["820326884071047219", "820326884071047220", "1103669499573567498", "820720829926080552", "832340940395118594", "1030892555908431935", "820326884071047219"]; // Офицеры
<<<<<<< HEAD
export const MODERATOR_ROLE_IDS = ["820326884071047219", "820326884071047220", "1239606290959826944"]; // Офицеры + модераторы
=======
export const MODERATOR_ROLE_IDS = ["820326884071047219", "820326884071047220", "1239606290959826944", "820056309918466048"]; // Офицеры + модераторы
export const PILOT_INSTRUCTOR_ROLE_IDS = ["832294803706085396"]; // Пилоты-инструкторы лётной академии
>>>>>>> feature/absence-thread-integration

// Ограничения по командам
export const COMMAND_PERMISSIONS = {
  // Команды доступные всем
<<<<<<< HEAD
  public: ["help", "ping", "lichstat"],
  
  // Команды доступные модераторам и выше
  moderator: ["points", "addtracer", "removetracer", "listtraced", "stats", "simpletest", "flight-academy", "aircraft-list"],
  
  // Команды доступные только офицерам
  officer: ["syncclan", "resettleavers", "pbnotify", "resources", "checktracked", "teststats", "aircraft-add", "aircraft-remove", "aircraft-update"],
=======
  public: ["help", "ping", "lichstat", "absenceform"],
  
  // Команды доступные пилотам-инструкторам и выше
  pilot_instructor: ["flight-academy", "aircraft-list", "aircraft-add", "aircraft-remove", "aircraft-update"],
  
  // Команды доступные модераторам и выше
  moderator: ["points", "addtracer", "removetracer", "listtraced", "stats", "simpletest", "absencelist"],
  
  // Команды доступные только офицерам
  officer: ["syncclan", "resettleavers", "pbnotify", "resources", "checktracked", "teststats"],
>>>>>>> feature/absence-thread-integration
  
  // Команды доступные только администраторам
  admin: ["runtests"]
};
