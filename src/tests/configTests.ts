import { TestResult } from './testRunner';
import * as fs from 'fs';
import * as path from 'path';

async function testEnvironmentVariables(): Promise<TestResult> {
  const start = Date.now();
  const name = "Переменные окружения";
  
  try {
    const requiredVars = [
      'DISCORD_TOKEN',
      'CLIENT_ID',
      'GUILD_ID'
    ];
    
    const missing: string[] = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
    
    if (missing.length > 0) {
      return {
        name,
        success: false,
        error: `Отсутствуют переменные окружения: ${missing.join(', ')}`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем валидность токена (базовая проверка формата)
    const token = process.env.DISCORD_TOKEN!;
    if (!token.includes('.')) {
      return {
        name,
        success: false,
        error: "DISCORD_TOKEN имеет неверный формат",
        duration: Date.now() - start
      };
    }
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка при проверке переменных окружения: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testDataDirectories(): Promise<TestResult> {
  const start = Date.now();
  const name = "Директории данных";
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Создаем директорию данных если её нет
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Проверяем права на запись
    const testFile = path.join(dataDir, 'test_write.json');
    fs.writeFileSync(testFile, '{"test": true}');
    fs.unlinkSync(testFile);
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка с директориями данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testLogDirectories(): Promise<TestResult> {
  const start = Date.now();
  const name = "Директории логов";
  
  try {
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    
    // Создаем директорию логов если её нет
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Проверяем права на запись
    const testFile = path.join(logsDir, 'test_write.log');
    fs.writeFileSync(testFile, 'test log entry');
    fs.unlinkSync(testFile);
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка с директориями логов: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testNodeVersion(): Promise<TestResult> {
  const start = Date.now();
  const name = "Версия Node.js";
  
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      return {
        name,
        success: false,
        error: `Требуется Node.js 18+, текущая версия: ${nodeVersion}`,
        duration: Date.now() - start
      };
    }
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка при проверке версии Node.js: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testPackageJson(): Promise<TestResult> {
  const start = Date.now();
  const name = "package.json";
  
  try {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return {
        name,
        success: false,
        error: "Файл package.json не найден",
        duration: Date.now() - start
      };
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const requiredDeps = [
      'discord.js',
      'dotenv',
      'axios',
      'cheerio',
      'puppeteer',
      'typescript'
    ];
    
    const missing: string[] = [];
    
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        missing.push(dep);
      }
    }
    
    if (missing.length > 0) {
      return {
        name,
        success: false,
        error: `Отсутствуют зависимости: ${missing.join(', ')}`,
        duration: Date.now() - start
      };
    }
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка при проверке package.json: ${error}`,
      duration: Date.now() - start
    };
  }
}

export const configTests = [
  testEnvironmentVariables,
  testDataDirectories,
  testLogDirectories,
  testNodeVersion,
  testPackageJson
]; 