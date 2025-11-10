import { configTests } from './configTests';
import { utilsTests } from './utilsTests';
import { commandsTests } from './commandsTests';
import { dataTests } from './dataTests';
import { networkTests } from './networkTests';
import { statsTests } from './statsTests';
import { twinksTests } from './twinksTests';
import { regimentApplicationTests } from './regimentApplicationTests';
import { info, error } from '../utils/logger';

export interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: (() => Promise<TestResult>)[];
}

export interface TestSuiteResult {
  success: boolean;
  passed: number;
  total: number;
  errors: string[];
  suiteResults: {
    [suiteName: string]: {
      passed: number;
      total: number;
      tests: TestResult[];
    }
  };
}

export async function runAllTests(): Promise<TestSuiteResult> {
  const testSuites: TestSuite[] = [
    { name: "Конфигурация", tests: configTests },
    { name: "Утилиты", tests: utilsTests },
    { name: "Команды", tests: commandsTests },
    { name: "Данные", tests: dataTests },
    { name: "Сеть", tests: networkTests },
    { name: "Статистика", tests: statsTests },
    { name: "Твинки", tests: twinksTests },
    { name: "Заявки в полк", tests: regimentApplicationTests },
  ];

  const result: TestSuiteResult = {
    success: true,
    passed: 0,
    total: 0,
    errors: [],
    suiteResults: {}
  };

  for (const suite of testSuites) {
    info(`🔍 Запуск тестов: ${suite.name}`);
    
    const suiteResult = {
      passed: 0,
      total: suite.tests.length,
      tests: [] as TestResult[]
    };

    for (const test of suite.tests) {
      try {
        const testResult = await test();
        suiteResult.tests.push(testResult);
        result.total++;

        if (testResult.success) {
          suiteResult.passed++;
          result.passed++;
          info(`  ✅ ${testResult.name} (${testResult.duration}ms)`);
        } else {
          result.success = false;
          const errorMsg = `${suite.name} -> ${testResult.name}: ${testResult.error}`;
          result.errors.push(errorMsg);
          error(`  ❌ ${testResult.name}: ${testResult.error}`);
        }
      } catch (err) {
        result.success = false;
        result.total++;
        const errorMsg = `${suite.name} -> Критическая ошибка: ${err}`;
        result.errors.push(errorMsg);
        error(`  💥 Критическая ошибка в тесте: ${err}`);
      }
    }

    result.suiteResults[suite.name] = suiteResult;
    info(`📊 ${suite.name}: ${suiteResult.passed}/${suiteResult.total} тестов пройдено`);
  }

  // Восстанавливаем оригинальный файл твинков после всех тестов
  if (typeof (global as any).restoreTwinkHistoryFile === 'function') {
    try {
      (global as any).restoreTwinkHistoryFile();
      info(`📁 Восстановлен оригинальный файл истории твинков`);
    } catch (err) {
      error(`❌ Ошибка при восстановлении файла истории твинков:`, err);
    }
  }
  
  // Восстанавливаем файл после тестов обновления техники
  if (typeof (global as any).restoreTwinkHistoryFileAfterVehicleUpdateTests === 'function') {
    try {
      (global as any).restoreTwinkHistoryFileAfterVehicleUpdateTests();
      info(`📁 Восстановлен файл истории твинков после тестов обновления техники`);
    } catch (err) {
      error(`❌ Ошибка при восстановлении файла после тестов обновления техники:`, err);
    }
  }

  return result;
} 