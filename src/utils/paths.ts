import * as path from "path";
import * as fs from "fs";

/**
 * Определяет правильный путь к директории данных
 * В разработке: /opt/discord-bot/data/
 * В продакшене: /opt/discord-bot/dist/data/
 */
export function getDataPath(): string {
  // Проверяем, находимся ли мы в скомпилированной версии
  const isCompiled = __dirname.includes('dist');
  
  if (isCompiled) {
    // В скомпилированной версии: dist/utils -> dist/data
    return path.join(__dirname, "..", "data");
  } else {
    // В исходной версии: src/utils -> data
    return path.join(__dirname, "..", "..", "data");
  }
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
