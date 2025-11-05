import * as path from "path";
import * as fs from "fs";

/**
 * Определяет правильный путь к директории данных
 * Всегда использует /opt/data/ независимо от окружения
 */
export function getDataPath(): string {
  return "/opt/data";
}

/**
 * Создает путь к файлу данных
 */
export function getDataFilePath(filename: string): string {
  return path.join(getDataPath(), filename);
}

/**
 * Проверяет существование директории данных и создает её при необходимости
 */
export function ensureDataDirectory(): void {
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
}
