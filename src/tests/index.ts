import { runAllTests } from './testRunner';
import { info, error } from '../utils/logger';

export async function runPreStartTests(): Promise<boolean> {
  info("🧪 Запуск предстартового тестирования бота...");
  
  try {
    const testResults = await runAllTests();
    
    if (testResults.success) {
      info(`✅ Все тесты пройдены! (${testResults.passed}/${testResults.total})`);
      return true;
    } else {
      error(`❌ Тесты провалены! (${testResults.passed}/${testResults.total})`);
      error("Детали ошибок:", testResults.errors);
      return false;
    }
  } catch (err) {
    error("❌ Критическая ошибка при выполнении тестов", err);
    return false;
  }
} 