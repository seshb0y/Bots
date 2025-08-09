// index.ts
import { config } from "dotenv";
import { client } from "./bot";
import { setupCommands } from "./commands";
import { info, error } from "./utils/logger";
import { runPreStartTests } from "./tests";

config();

async function startBot() {
  info("🚀 Запуск Discord бота...");
  
  // Запускаем предстартовое тестирование
  const testsPass = await runPreStartTests();
  
  if (!testsPass) {
    error("❌ Предстартовые тесты не пройдены! Остановка запуска бота.");
    // В production режиме можно запустить бот с предупреждениями
    if (process.env.NODE_ENV === 'production') {
      error("⚠️ ВНИМАНИЕ: Запуск в production режиме с непройденными тестами!");
    } else {
      process.exit(1);
    }
  }
  
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
  try {
    await client.login(process.env.DISCORD_TOKEN);
    info("✅ Бот успешно подключился к Discord и готов к работе!");
  } catch (err) {
    error("❌ Ошибка при подключении к Discord", err);
    process.exit(1);
  }
}

// Запускаем бота
startBot().catch((err) => {
  error("❌ Критическая ошибка при запуске бота", err);
  process.exit(1);
});
