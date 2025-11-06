#!/usr/bin/env ts-node
/**
 * Git Auto-Watcher
 * 
 * Автоматически коммитит и пушит изменения в git через 1 час после последнего изменения.
 * Мониторит изменения в src/, docs/, и конфигурационных файлах.
 */

import { watch, FSWatcher } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, relative } from 'path';
import { existsSync, statSync } from 'fs';

const execAsync = promisify(exec);
const DEBOUNCE_DELAY = 60 * 60 * 1000; // 1 час в миллисекундах
const PROJECT_ROOT = __dirname;

// Файлы и директории для мониторинга
const WATCH_PATHS = [
  'src',
  'docs',
  'package.json',
  'tsconfig.json',
  'README.md',
  '.gitignore',
  '.cursorrules',
  '.cursor',
];

// Паттерны для игнорирования (из .gitignore)
const IGNORE_PATTERNS = [
  /node_modules/,
  /dist/,
  /\.log$/,
  /\.env/,
  /data\//,
  /logs\//,
  /\.DS_Store/,
  /\.swp$/,
  /\.swo$/,
  /\.vscode/,
  /\.idea/,
  /coverage/,
];

let commitTimer: NodeJS.Timeout | null = null;
let lastChangedFile: string = '';
let isCommitting = false;

/**
 * Проверяет, нужно ли игнорировать файл
 */
function shouldIgnore(filePath: string): boolean {
  const relativePath = relative(PROJECT_ROOT, filePath);
  return IGNORE_PATTERNS.some(pattern => pattern.test(relativePath));
}

/**
 * Выполняет git команду
 */
async function runGitCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_ROOT,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    throw new Error(`Git command failed: ${command}\nError: ${error.message}`);
  }
}

/**
 * Проверяет, есть ли изменения для коммита
 */
async function hasChanges(): Promise<boolean> {
  try {
    const { stdout } = await runGitCommand('git status --porcelain');
    return stdout.length > 0;
  } catch (error) {
    console.error('❌ Ошибка проверки статуса git:', error);
    return false;
  }
}

/**
 * Создает сообщение коммита на основе измененных файлов
 */
async function generateCommitMessage(): Promise<string> {
  try {
    const { stdout } = await runGitCommand('git status --short');
    const files = stdout.split('\n').filter(line => line.trim());
    
    if (files.length === 0) {
      return 'Auto-commit: изменения';
    }

    const fileNames = files
      .map(line => line.substring(3).trim())
      .filter(name => !shouldIgnore(name))
      .slice(0, 5); // Максимум 5 файлов в сообщении

    const timestamp = new Date().toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    if (fileNames.length === 1) {
      return `Auto-commit: ${fileNames[0]} (${timestamp})`;
    }

    return `Auto-commit: ${fileNames.length} файлов (${timestamp})\n\nИзменено:\n${fileNames.map(f => `- ${f}`).join('\n')}`;
  } catch (error) {
    const timestamp = new Date().toLocaleString('ru-RU');
    return `Auto-commit: изменения (${timestamp})`;
  }
}

/**
 * Выполняет коммит и пуш
 */
async function commitAndPush(): Promise<void> {
  if (isCommitting) {
    console.log('⏳ Коммит уже выполняется, пропускаем...');
    return;
  }

  if (!(await hasChanges())) {
    console.log('✅ Нет изменений для коммита');
    return;
  }

  isCommitting = true;
  console.log(`\n🔄 Начинаем автоматический коммит... (последний измененный файл: ${lastChangedFile})`);

  try {
    // Добавляем все изменения
    console.log('📦 Добавление файлов в индекс...');
    await runGitCommand('git add .');

    // Генерируем сообщение коммита
    const commitMessage = await generateCommitMessage();
    console.log('💬 Сообщение коммита:', commitMessage.split('\n')[0]);

    // Коммитим
    console.log('💾 Создание коммита...');
    await runGitCommand(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

    // Пушим
    console.log('🚀 Отправка в репозиторий...');
    await runGitCommand('git push');

    console.log('✅ Автоматический коммит и пуш успешно выполнены!\n');
    lastChangedFile = '';
  } catch (error: any) {
    console.error('❌ Ошибка при автоматическом коммите:', error.message);
    
    // Если ошибка из-за конфликта или нет изменений - это нормально
    if (error.message.includes('nothing to commit') || error.message.includes('no changes')) {
      console.log('ℹ️  Нет изменений для коммита');
    } else if (error.message.includes('conflict') || error.message.includes('rejected')) {
      console.error('⚠️  Возможен конфликт или отклонение пуша. Проверь вручную.');
    }
  } finally {
    isCommitting = false;
  }
}

/**
 * Обрабатывает изменение файла
 */
function handleFileChange(filePath: string): void {
  if (shouldIgnore(filePath)) {
    return;
  }

  const relativePath = relative(PROJECT_ROOT, filePath);
  console.log(`📝 Изменен файл: ${relativePath}`);
  lastChangedFile = relativePath;

  // Сбрасываем предыдущий таймер
  if (commitTimer) {
    clearTimeout(commitTimer);
    console.log('⏰ Таймер сброшен, ожидаем 1 час после последнего изменения...');
  }

  // Устанавливаем новый таймер на 1 час
  commitTimer = setTimeout(() => {
    console.log('\n⏰ Прошел 1 час с последнего изменения, начинаем коммит...');
    commitAndPush().catch(err => {
      console.error('❌ Критическая ошибка при коммите:', err);
    });
    commitTimer = null;
  }, DEBOUNCE_DELAY);

  const hours = DEBOUNCE_DELAY / (60 * 60 * 1000);
  console.log(`⏳ Коммит будет выполнен через ${hours} час(а) после последнего изменения`);
}

/**
 * Рекурсивно мониторит директорию
 */
function watchDirectory(dirPath: string, watchers: FSWatcher[]): void {
  if (!existsSync(dirPath)) {
    console.log(`⚠️  Директория не существует: ${dirPath}`);
    return;
  }

  if (shouldIgnore(dirPath)) {
    return;
  }

  try {
    const watcher = watch(
      dirPath,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;

        const fullPath = join(dirPath, filename);
        
        // Игнорируем директории
        try {
          if (existsSync(fullPath)) {
            const stats = statSync(fullPath);
            if (stats.isDirectory()) {
              return;
            }
          }
        } catch {
          return;
        }

        if (eventType === 'change' || eventType === 'rename') {
          handleFileChange(fullPath);
        }
      }
    );

    watchers.push(watcher);
    console.log(`👁️  Мониторинг: ${relative(PROJECT_ROOT, dirPath)}`);
  } catch (error: any) {
    console.error(`❌ Ошибка мониторинга ${dirPath}:`, error.message);
  }
}

/**
 * Мониторит отдельный файл
 */
function watchFile(filePath: string, watchers: FSWatcher[]): void {
  if (!existsSync(filePath)) {
    console.log(`⚠️  Файл не существует: ${filePath}`);
    return;
  }

  if (shouldIgnore(filePath)) {
    return;
  }

  try {
    const watcher = watch(filePath, (eventType) => {
      if (eventType === 'change') {
        handleFileChange(filePath);
      }
    });

    watchers.push(watcher);
    console.log(`👁️  Мониторинг: ${relative(PROJECT_ROOT, filePath)}`);
  } catch (error: any) {
    console.error(`❌ Ошибка мониторинга ${filePath}:`, error.message);
  }
}

/**
 * Запускает watcher
 */
async function startWatcher(): Promise<void> {
  console.log('🚀 Запуск Git Auto-Watcher...\n');
  console.log(`📁 Корневая директория: ${PROJECT_ROOT}`);
  console.log(`⏱️  Debounce: ${DEBOUNCE_DELAY / (60 * 60 * 1000)} час(а)\n`);

  const watchers: FSWatcher[] = [];

  // Проверяем, что мы в git репозитории
  if (!existsSync(join(PROJECT_ROOT, '.git'))) {
    console.error('❌ Ошибка: не найден .git директория. Убедись, что это git репозиторий.');
    process.exit(1);
  }

  // Запускаем мониторинг
  for (const path of WATCH_PATHS) {
    const fullPath = join(PROJECT_ROOT, path);
    
    if (!existsSync(fullPath)) {
      continue;
    }

    try {
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        watchDirectory(fullPath, watchers);
      } else {
        watchFile(fullPath, watchers);
      }
    } catch (error: any) {
      console.error(`❌ Ошибка при проверке ${path}:`, error.message);
    }
  }

  console.log(`\n✅ Watcher запущен! Мониторится ${watchers.length} путей.\n`);
  console.log('💡 Изменения в файлах будут автоматически закоммичены через 1 час после последнего изменения.');
  console.log('💡 Для остановки нажми Ctrl+C\n');

  // Обработка завершения
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Остановка watcher...');
    
    if (commitTimer) {
      clearTimeout(commitTimer);
      console.log('⏰ Таймер отменен');
    }

    watchers.forEach(watcher => watcher.close());
    console.log('✅ Watcher остановлен');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Остановка watcher...');
    
    if (commitTimer) {
      clearTimeout(commitTimer);
    }

    watchers.forEach(watcher => watcher.close());
    process.exit(0);
  });
}

// Запускаем
startWatcher().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});


