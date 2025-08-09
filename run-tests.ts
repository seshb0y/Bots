#!/usr/bin/env ts-node

import { config } from "dotenv";
import { runAllTests } from "./src/tests/testRunner";
import { info, error } from "./src/utils/logger";

// Загружаем переменные окружения
config();

async function main() {
  console.log("🧪 Запуск автономного тестирования Discord бота...\n");
  
  try {
    const testResults = await runAllTests();
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ");
    console.log("=".repeat(60));
    
    console.log(`✅ Пройдено: ${testResults.passed}`);
    console.log(`❌ Провалено: ${testResults.total - testResults.passed}`);
    console.log(`📋 Всего: ${testResults.total}`);
    console.log(`🎯 Успех: ${testResults.success ? 'ДА' : 'НЕТ'}`);
    
    console.log("\n📋 Детали по наборам тестов:");
    for (const [suiteName, suiteResult] of Object.entries(testResults.suiteResults)) {
      const status = suiteResult.passed === suiteResult.total ? '✅' : '❌';
      console.log(`  ${status} ${suiteName}: ${suiteResult.passed}/${suiteResult.total}`);
    }
    
    if (testResults.errors.length > 0) {
      console.log("\n❌ ОШИБКИ:");
      testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log("\n" + "=".repeat(60));
    
    if (testResults.success) {
      console.log("🎉 Все тесты пройдены успешно! Бот готов к запуску.");
      process.exit(0);
    } else {
      console.log("💥 Некоторые тесты провалены. Проверьте ошибки выше.");
      process.exit(1);
    }
  } catch (err) {
    error("❌ Критическая ошибка при выполнении тестов", err);
    console.log("\n💥 Критическая ошибка при выполнении тестов:");
    console.log(err);
    process.exit(1);
  }
}

// Обработка сигналов для graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Получен сигнал прерывания. Завершение тестирования...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Получен сигнал завершения. Завершение тестирования...');
  process.exit(1);
});

// Запускаем тестирование
main(); 