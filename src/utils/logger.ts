import * as fs from "fs";
import * as path from "path";

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, `bot-${new Date().toISOString().slice(0, 10)}.log`);

// Создаем папку для логов если её нет
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO", 
  WARN = "WARN",
  ERROR = "ERROR"
}

function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

function writeToFile(message: string) {
  try {
    fs.appendFileSync(LOG_FILE, message + '\n', 'utf-8');
  } catch (error) {
    console.error('Ошибка записи в лог файл:', error);
  }
}

export function log(level: LogLevel, message: string, data?: any) {
  const formattedMessage = formatMessage(level, message, data);
  
  // Записываем в файл
  writeToFile(formattedMessage);
  
  // Выводим в консоль с цветами
  const colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';
  
  console.log(`${colors[level]}${formattedMessage}${reset}`);
}

export function debug(message: string, data?: any) {
  log(LogLevel.DEBUG, message, data);
}

export function info(message: string, data?: any) {
  log(LogLevel.INFO, message, data);
}

export function warn(message: string, data?: any) {
  log(LogLevel.WARN, message, data);
}

export function error(message: string, data?: any) {
  log(LogLevel.ERROR, message, data);
}

// Специальные функции для разных компонентов бота
export function logVoiceState(message: string, data?: any) {
  log(LogLevel.INFO, `[VOICE] ${message}`, data);
}

export function logStats(message: string, data?: any) {
  log(LogLevel.INFO, `[STATS] ${message}`, data);
}

export function logSyncclan(message: string, data?: any) {
  log(LogLevel.INFO, `[SYNCCLAN] ${message}`, data);
}

export function logPbNotify(message: string, data?: any) {
  log(LogLevel.INFO, `[PB_NOTIFY] ${message}`, data);
}

export function logQueue(message: string, data?: any) {
  log(LogLevel.INFO, `[QUEUE] ${message}`, data);
}

export function logReward(message: string, data?: any) {
  log(LogLevel.INFO, `[REWARD] ${message}`, data);
}

export function logCommand(message: string, data?: any) {
  log(LogLevel.INFO, `[COMMAND] ${message}`, data);
}

export function logInteraction(message: string, data?: any) {
  log(LogLevel.INFO, `[INTERACTION] ${message}`, data);
}

export function logError(message: string, error?: any) {
  log(LogLevel.ERROR, `[ERROR] ${message}`, error);
}

// Функция для очистки старых логов (оставляем только за последние 30 дней)
export function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const file of files) {
      if (file.startsWith('bot-') && file.endsWith('.log')) {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          info(`Удален старый лог файл: ${file}`);
        }
      }
    }
  } catch (error) {
    logError('Ошибка при очистке старых логов', error);
  }
} 