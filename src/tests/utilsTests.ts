import { TestResult } from './testRunner';
import { loadJson, saveJson } from '../utils/json';
import { normalize } from '../utils/normalize';
import * as fs from 'fs';
import * as path from 'path';

async function testJsonUtils(): Promise<TestResult> {
  const start = Date.now();
  const name = "JSON утилиты";
  
  try {
    const testData = { test: true, number: 42, array: [1, 2, 3] };
    const testFile = path.join(__dirname, '..', 'data', 'test_json.json');
    
    // Тест сохранения
    saveJson(testFile, testData);
    
    if (!fs.existsSync(testFile)) {
      return {
        name,
        success: false,
        error: "Файл не был создан",
        duration: Date.now() - start
      };
    }
    
    // Тест загрузки
    const loadedData = loadJson(testFile);
    
    if (JSON.stringify(loadedData) !== JSON.stringify(testData)) {
      return {
        name,
        success: false,
        error: "Загруженные данные не соответствуют сохраненным",
        duration: Date.now() - start
      };
    }
    
    // Тест загрузки несуществующего файла
    const nonExistentFile = path.join(__dirname, '..', 'data', 'non_existent.json');
    const emptyData = loadJson(nonExistentFile) as any;
    
    if (Object.keys(emptyData).length !== 0) {
      return {
        name,
        success: false,
        error: "Загрузка несуществующего файла должна возвращать пустой объект",
        duration: Date.now() - start
      };
    }
    
    // Очистка
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
      error: `Ошибка в JSON утилитах: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testNormalize(): Promise<TestResult> {
  const start = Date.now();
  const name = "Нормализация строк";
  
  try {
    const testCases = [
      { input: "Test User", expected: "testuser" },
      { input: "  SpAcE  ", expected: "space" },
      { input: "Multiple   Spaces", expected: "multiplespaces" },
      { input: "UPPERCASE", expected: "uppercase" },
      { input: "", expected: "" },
      { input: "123Numbers", expected: "123numbers" }
    ];
    
    for (const testCase of testCases) {
      const result = normalize(testCase.input);
      if (result !== testCase.expected) {
        return {
          name,
          success: false,
          error: `Ошибка нормализации: "${testCase.input}" -> "${result}", ожидалось "${testCase.expected}"`,
          duration: Date.now() - start
        };
      }
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
      error: `Ошибка в нормализации: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testLogger(): Promise<TestResult> {
  const start = Date.now();
  const name = "Система логирования";
  
  try {
    const { info, error, warn } = require('../utils/logger');
    
    // Тестируем, что функции логирования не выбрасывают ошибки
    info("Тестовое информационное сообщение");
    warn("Тестовое предупреждение");
    error("Тестовая ошибка");
    
    // Проверяем создание лог файла
    const logDir = path.join(__dirname, '..', '..', 'logs');
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logDir, `bot-${today}.log`);
    
    if (!fs.existsSync(logFile)) {
      return {
        name,
        success: false,
        error: "Лог файл не был создан",
        duration: Date.now() - start
      };
    }
    
    const logContent = fs.readFileSync(logFile, 'utf-8');
    if (!logContent.includes("Тестовое информационное сообщение")) {
      return {
        name,
        success: false,
        error: "Сообщение не записалось в лог файл",
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
      error: `Ошибка в системе логирования: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testConstants(): Promise<TestResult> {
  const start = Date.now();
  const name = "Константы";
  
  try {
    const constants = require('../constants');
    
    // Проверяем, что все необходимые константы определены
    const requiredConstants = [
      'usersPath',
      'trackedPath',
      'OFFICER_ROLE_IDS',
      'VOICE_CHANNEL_IDS',
      'STATS_CHANNEL_ID'
    ];
    
    for (const constant of requiredConstants) {
      if (constants[constant] === undefined) {
        return {
          name,
          success: false,
          error: `Константа ${constant} не определена`,
          duration: Date.now() - start
        };
      }
    }
    
    // Проверяем типы
    if (!Array.isArray(constants.OFFICER_ROLE_IDS)) {
      return {
        name,
        success: false,
        error: "OFFICER_ROLE_IDS должен быть массивом",
        duration: Date.now() - start
      };
    }
    
    if (!Array.isArray(constants.VOICE_CHANNEL_IDS)) {
      return {
        name,
        success: false,
        error: "VOICE_CHANNEL_IDS должен быть массивом",
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
      error: `Ошибка в константах: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testTypes(): Promise<TestResult> {
  const start = Date.now();
  const name = "TypeScript типы";
  
  try {
    const { UserData, TrackedPlayer } = require('../types');
    
    // Проверяем, что типы экспортированы (в runtime это будут undefined, но импорт не должен падать)
    // Основная проверка типов происходит на этапе компиляции TypeScript
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка в типах: ${error}`,
      duration: Date.now() - start
    };
  }
}

export const utilsTests = [
  testJsonUtils,
  testNormalize,
  testLogger,
  testConstants,
  testTypes
]; 