import { TestResult } from './testRunner';
import { loadJson, saveJson } from '../utils/json';
import * as fs from 'fs';
import * as path from 'path';

async function testDataStructures(): Promise<TestResult> {
  const start = Date.now();
  const name = "Структуры данных";
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Создаем директорию если её нет
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Тест структуры UserData
    const testUsersPath = path.join(dataDir, 'test_users.json');
    const testUsers = {
      'user1': {
        joinDate: '2024-01-01',
        points: 500,
        wasWarned: false,
        nick: 'TestUser1'
      },
      'user2': {
        joinDate: '2024-01-02',
        points: 750,
        wasWarned: true,
        nick: 'TestUser2'
      }
    };
    
    saveJson(testUsersPath, testUsers);
    const loadedUsers = loadJson(testUsersPath) as any;
    
    // Проверяем структуру UserData
    for (const [userId, userData] of Object.entries(loadedUsers) as [string, any][]) {
      if (!userData.joinDate || !userData.nick || typeof userData.points !== 'number' || typeof userData.wasWarned !== 'boolean') {
        return {
          name,
          success: false,
          error: `Неверная структура UserData для пользователя ${userId}`,
          duration: Date.now() - start
        };
      }
    }
    
    // Тест структуры TrackedPlayer
    const testTrackedPath = path.join(dataDir, 'test_tracked.json');
    const testTracked = {
      'Player1': {
        trackedSince: '2024-01-01T10:00:00.000Z',
        assignedBy: 'user1',
        warnedAfter7d: false,
        warnedAfter14d: false,
        lastPoints: 300
      }
    };
    
    saveJson(testTrackedPath, testTracked);
    const loadedTracked = loadJson(testTrackedPath) as any;
    
    // Проверяем структуру TrackedPlayer
    for (const [playerNick, playerData] of Object.entries(loadedTracked) as [string, any][]) {
      if (!playerData.trackedSince || !playerData.assignedBy || 
          typeof playerData.warnedAfter7d !== 'boolean' ||
          typeof playerData.warnedAfter14d !== 'boolean' ||
          typeof playerData.lastPoints !== 'number') {
        return {
          name,
          success: false,
          error: `Неверная структура TrackedPlayer для игрока ${playerNick}`,
          duration: Date.now() - start
        };
      }
    }
    
    // Очистка
    fs.unlinkSync(testUsersPath);
    fs.unlinkSync(testTrackedPath);
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка в структурах данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testDataPersistence(): Promise<TestResult> {
  const start = Date.now();
  const name = "Сохранение данных";
  
  try {
    const testFile = path.join(__dirname, '..', 'data', 'test_persistence.json');
    
    // Тест большого объема данных
    const largeData: any = {};
    for (let i = 0; i < 1000; i++) {
      largeData[`user${i}`] = {
        joinDate: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
        points: Math.floor(Math.random() * 1000),
        wasWarned: Math.random() > 0.5,
        nick: `User${i}`
      };
    }
    
    saveJson(testFile, largeData);
    const loadedData = loadJson(testFile) as any;
    
    if (Object.keys(loadedData).length !== 1000) {
      return {
        name,
        success: false,
        error: "Не все данные были сохранены/загружены",
        duration: Date.now() - start
      };
    }
    
    // Проверяем целостность данных
    for (let i = 0; i < 10; i++) { // Проверяем первые 10 записей
      const key = `user${i}`;
      if (!loadedData[key] || loadedData[key].nick !== `User${i}`) {
        return {
          name,
          success: false,
          error: `Данные повреждены для ключа ${key}`,
          duration: Date.now() - start
        };
      }
    }
    
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
      error: `Ошибка в сохранении данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testDataMigration(): Promise<TestResult> {
  const start = Date.now();
  const name = "Миграция данных";
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Создаем файлы с разными версиями данных для тестирования совместимости
    const oldFormatFile = path.join(dataDir, 'test_old_format.json');
    const oldFormatData = {
      'user1': {
        joinDate: '2024-01-01',
        points: 500,
        wasWarned: false
        // Отсутствует поле nick (старый формат)
      }
    };
    
    saveJson(oldFormatFile, oldFormatData);
    
    // Проверяем, что система может обработать старые данные
    const loadedOldData = loadJson(oldFormatFile) as any;
    
    // Симулируем миграцию - добавляем отсутствующие поля
    for (const [userId, userData] of Object.entries(loadedOldData) as [string, any][]) {
      if (!userData.nick) {
        userData.nick = `User_${userId}`;
      }
    }
    
    saveJson(oldFormatFile, loadedOldData);
    const migratedData = loadJson(oldFormatFile) as any;
    
    if (!migratedData['user1'].nick) {
      return {
        name,
        success: false,
        error: "Миграция данных не работает",
        duration: Date.now() - start
      };
    }
    
    fs.unlinkSync(oldFormatFile);
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка в миграции данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testDataValidation(): Promise<TestResult> {
  const start = Date.now();
  const name = "Валидация данных";
  
  try {
    const testFile = path.join(__dirname, '..', 'data', 'test_validation.json');
    
    // Тест некорректных данных
    const invalidData = {
      'user1': {
        joinDate: 'invalid-date',
        points: 'not-a-number',
        wasWarned: 'not-a-boolean',
        nick: null
      }
    };
    
    saveJson(testFile, invalidData);
    const loadedData = loadJson(testFile) as any;
    
    // Проверяем валидацию
    function validateUserData(userData: any): string[] {
      const errors: string[] = [];
      
      if (!userData.joinDate || isNaN(Date.parse(userData.joinDate))) {
        errors.push('Неверная дата присоединения');
      }
      
      if (typeof userData.points !== 'number' || isNaN(userData.points)) {
        errors.push('Неверное количество очков');
      }
      
      if (typeof userData.wasWarned !== 'boolean') {
        errors.push('Неверный флаг предупреждения');
      }
      
      if (!userData.nick || typeof userData.nick !== 'string') {
        errors.push('Неверный никнейм');
      }
      
      return errors;
    }
    
    const validationErrors = validateUserData(loadedData['user1']);
    
    if (validationErrors.length === 0) {
      return {
        name,
        success: false,
        error: "Валидация не обнаружила некорректные данные",
        duration: Date.now() - start
      };
    }
    
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
      error: `Ошибка в валидации данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testBackupRestore(): Promise<TestResult> {
  const start = Date.now();
  const name = "Резервное копирование";
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const originalFile = path.join(dataDir, 'test_original.json');
    const backupFile = path.join(dataDir, 'test_original.json.backup');
    
    const originalData = {
      'user1': {
        joinDate: '2024-01-01',
        points: 500,
        wasWarned: false,
        nick: 'OriginalUser'
      }
    };
    
    // Сохраняем оригинальные данные
    saveJson(originalFile, originalData);
    
    // Создаем резервную копию
    fs.copyFileSync(originalFile, backupFile);
    
    // Повреждаем оригинальный файл
    fs.writeFileSync(originalFile, 'invalid json content');
    
    // Восстанавливаем из резервной копии
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, originalFile);
    }
    
    // Проверяем восстановление
    const restoredData = loadJson(originalFile) as any;
    
    if (!restoredData['user1'] || restoredData['user1'].nick !== 'OriginalUser') {
      return {
        name,
        success: false,
        error: "Восстановление из резервной копии не работает",
        duration: Date.now() - start
      };
    }
    
    // Очистка
    fs.unlinkSync(originalFile);
    fs.unlinkSync(backupFile);
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка в резервном копировании: ${error}`,
      duration: Date.now() - start
    };
  }
}

export const dataTests = [
  testDataStructures,
  testDataPersistence,
  testDataMigration,
  testDataValidation,
  testBackupRestore
]; 