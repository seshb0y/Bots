import * as path from "path";

export const usersPath = path.join(__dirname, "..", "data", "users.json");
export const trackedPath = path.join(__dirname, "..", "data", "tracked.json");

export const OFFICER_ROLE_IDS = ["820326884071047219", "820326884071047220"];
export const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID!;
export const VOICE_CHANNEL_IDS = ["763085196118851608", "885928590720524328"];
export const STATS_CHANNEL_ID = "763085196118851607";

// Роли для ограничений команд
export const ADMIN_ROLE_IDS = ["820326884071047219", "820326884071047220", "1103669499573567498", "820720829926080552", "832340940395118594", "1030892555908431935", "820326884071047219"]; // Офицеры
export const MODERATOR_ROLE_IDS = ["820326884071047219", "820326884071047220", "1239606290959826944"]; // Офицеры + модераторы

// Ограничения по командам
export const COMMAND_PERMISSIONS = {
  // Команды доступные всем
  public: ["help", "ping", "lichstat"],
  
  // Команды доступные модераторам и выше
  moderator: ["points", "addtracer", "removetracer", "listtraced", "stats", "simpletest"],
  
  // Команды доступные только офицерам
  officer: ["syncclan", "resettleavers", "pbnotify", "resources", "checktracked", "teststats"],
  
  // Команды доступные только администраторам
  admin: ["runtests"]
};
