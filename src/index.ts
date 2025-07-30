// index.ts
import { config } from "dotenv";
import { client } from "./bot";
import { setupCommands } from "./commands";
import { info, error } from "./utils/logger";

config();

// Настройка команд
setupCommands(client);

// Обработка ошибок процесса
process.on("unhandledRejection", (reason, promise) => {
  error("Необработанное отклонение промиса", { reason, promise });
});

process.on("uncaughtException", (err) => {
  error("Необработанное исключение", err);
});

// Запуск бота
client.login(process.env.DISCORD_TOKEN).then(() => {
  info("Бот успешно подключился к Discord");
}).catch((err) => {
  error("Ошибка при подключении к Discord", err);
});
