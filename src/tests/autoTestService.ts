import * as fs from 'fs';
import * as path from 'path';
import { runAllTests, TestSuiteResult } from './testRunner';
import { info, error, warn } from '../utils/logger';

export interface FileChangeEvent {
  file: string;
  type: 'add' | 'change' | 'unlink';
  timestamp: Date;
}

export interface AutoTestConfig {
  watchPaths: string[];
  excludePatterns: string[];
  testOnStart: boolean;
  testOnChange: boolean;
  debounceMs: number;
  maxTestFrequency: number; // максимальная частота тестов в минуту
}

export class AutoTestService {
  private config: AutoTestConfig;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private lastTestTime: number = 0;
  private testCount: number = 0;
  private testStartTime: number = Date.now();
  private isRunning: boolean = false;
  private pendingTest: NodeJS.Timeout | null = null;

  constructor(config: Partial<AutoTestConfig> = {}) {
    this.config = {
      watchPaths: [
        'src/commands',
        'src/utils',
        'src/tests',
        'src/bot.ts',
        'src/index.ts',
        'src/constants.ts',
        'src/types.ts'
      ],
      excludePatterns: [
        'node_modules',
        '.git',
        'dist',
        'logs',
        '*.log',
        '*.tmp'
      ],
      testOnStart: true,
      testOnChange: true,
      debounceMs: 2000,
      maxTestFrequency: 10
    };

    // Применяем пользовательскую конфигурацию
    Object.assign(this.config, config);
  }

  /**
   * Запускает сервис автоматического тестирования
   */
  async start(): Promise<void> {
    info('🔍 Запуск сервиса автоматического тестирования...');
    
    if (this.config.testOnStart) {
      await this.runTests('startup');
    }

    if (this.config.testOnChange) {
      this.setupFileWatchers();
    }

    info('✅ Сервис автоматического тестирования запущен');
  }

  /**
   * Останавливает сервис
   */
  stop(): void {
    info('🛑 Остановка сервиса автоматического тестирования...');
    
    this.watchers.forEach((watcher, path) => {
      watcher.close();
      info(`📁 Остановлен мониторинг: ${path}`);
    });
    
    this.watchers.clear();
    
    if (this.pendingTest) {
      clearTimeout(this.pendingTest);
      this.pendingTest = null;
    }

    info('✅ Сервис автоматического тестирования остановлен');
  }

  /**
   * Настраивает мониторинг файлов
   */
  private setupFileWatchers(): void {
    for (const watchPath of this.config.watchPaths) {
      const fullPath = path.resolve(watchPath);
      
      if (!fs.existsSync(fullPath)) {
        warn(`⚠️ Путь для мониторинга не существует: ${fullPath}`);
        continue;
      }

      try {
        const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
          if (filename && this.shouldTestFile(filename)) {
            this.handleFileChange({
              file: path.join(fullPath, filename),
              type: eventType as 'add' | 'change' | 'unlink',
              timestamp: new Date()
            });
          }
        });

        this.watchers.set(fullPath, watcher);
        info(`📁 Настроен мониторинг: ${fullPath}`);
      } catch (err) {
        error(`❌ Ошибка при настройке мониторинга ${fullPath}:`, err);
      }
    }
  }

  /**
   * Проверяет, нужно ли тестировать файл
   */
  private shouldTestFile(filename: string): boolean {
    // Проверяем исключения
    for (const pattern of this.config.excludePatterns) {
      if (filename.includes(pattern) || filename.match(pattern)) {
        return false;
      }
    }

    // Тестируем только TypeScript файлы и конфигурационные файлы
    const testableExtensions = ['.ts', '.js', '.json', '.env'];
    const ext = path.extname(filename);
    
    return testableExtensions.includes(ext);
  }

  /**
   * Обрабатывает изменение файла
   */
  private handleFileChange(event: FileChangeEvent): void {
    info(`📝 Изменение файла: ${event.file} (${event.type})`);
    
    // Проверяем частоту тестирования
    if (!this.canRunTest()) {
      warn('⚠️ Слишком частые тесты, пропускаем...');
      return;
    }

    // Отменяем предыдущий отложенный тест
    if (this.pendingTest) {
      clearTimeout(this.pendingTest);
    }

    // Запускаем тест с задержкой
    this.pendingTest = setTimeout(() => {
      this.runTests('file-change', event.file);
    }, this.config.debounceMs);
  }

  /**
   * Проверяет, можно ли запустить тест
   */
  private canRunTest(): boolean {
    const now = Date.now();
    const timeSinceLastTest = now - this.lastTestTime;
    const timeSinceStart = now - this.testStartTime;
    
    // Проверяем максимальную частоту (тестов в минуту)
    const maxInterval = (60 * 1000) / this.config.maxTestFrequency;
    
    return timeSinceLastTest >= maxInterval;
  }

  /**
   * Запускает тесты
   */
  private async runTests(reason: string, changedFile?: string): Promise<void> {
    if (this.isRunning) {
      warn('⚠️ Тесты уже выполняются, пропускаем...');
      return;
    }

    this.isRunning = true;
    this.lastTestTime = Date.now();
    this.testCount++;

    try {
      info(`🧪 Запуск тестов (${reason}${changedFile ? `: ${changedFile}` : ''}) - #${this.testCount}`);
      
      const startTime = Date.now();
      const results = await runAllTests();
      const duration = Date.now() - startTime;

      this.logTestResults(results, duration, reason, changedFile);
      
    } catch (err) {
      error('❌ Критическая ошибка при выполнении тестов:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Логирует результаты тестов
   */
  private logTestResults(results: TestSuiteResult, duration: number, reason: string, changedFile?: string): void {
    const status = results.success ? '✅' : '❌';
    const summary = `${status} Тесты ${results.success ? 'пройдены' : 'провалены'}: ${results.passed}/${results.total} (${duration}ms)`;
    
    info(`📊 ${summary}`);
    
    if (!results.success) {
      error('❌ Ошибки в тестах:');
      results.errors.forEach((errorMsg, index) => {
        error(`  ${index + 1}. ${errorMsg}`);
      });
    }

    // Детальная статистика по наборам тестов
    for (const [suiteName, suiteResult] of Object.entries(results.suiteResults)) {
      const suiteStatus = suiteResult.passed === suiteResult.total ? '✅' : '❌';
      info(`  ${suiteStatus} ${suiteName}: ${suiteResult.passed}/${suiteResult.total}`);
    }

    // Сохраняем результаты в файл для истории
    this.saveTestHistory(results, duration, reason, changedFile);
  }

  /**
   * Сохраняет историю тестов
   */
  private saveTestHistory(results: TestSuiteResult, duration: number, reason: string, changedFile?: string): void {
    const historyFile = path.join(__dirname, '..', '..', '..', 'data', 'test_history.json');
    const historyDir = path.dirname(historyFile);
    
    // Создаем директорию если её нет
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    let history: any[] = [];
    
    // Загружаем существующую историю
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      } catch (err) {
        warn('⚠️ Не удалось загрузить историю тестов, создаем новую');
        history = [];
      }
    }

    // Добавляем новую запись
    const entry = {
      timestamp: new Date().toISOString(),
      reason,
      changedFile,
      success: results.success,
      passed: results.passed,
      total: results.total,
      duration,
      errors: results.errors,
      suiteResults: results.suiteResults
    };

    history.push(entry);

    // Ограничиваем историю последними 100 записями
    if (history.length > 100) {
      history = history.slice(-100);
    }

    // Сохраняем историю
    try {
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (err) {
      error('❌ Не удалось сохранить историю тестов:', err);
    }
  }

  /**
   * Получает статистику тестирования
   */
  getStats(): {
    testCount: number;
    isRunning: boolean;
    lastTestTime: Date | null;
    uptime: number;
  } {
    return {
      testCount: this.testCount,
      isRunning: this.isRunning,
      lastTestTime: this.lastTestTime ? new Date(this.lastTestTime) : null,
      uptime: Date.now() - this.testStartTime
    };
  }

  /**
   * Принудительно запускает тесты
   */
  async forceRunTests(reason: string = 'manual'): Promise<TestSuiteResult> {
    info(`🧪 Принудительный запуск тестов (${reason})`);
    
    this.isRunning = true;
    this.lastTestTime = Date.now();
    this.testCount++;

    try {
      const startTime = Date.now();
      const results = await runAllTests();
      const duration = Date.now() - startTime;

      this.logTestResults(results, duration, reason);
      return results;
      
    } finally {
      this.isRunning = false;
    }
  }
}

// Экспортируем глобальный экземпляр
export const autoTestService = new AutoTestService();
