import { TestResult } from './testRunner';
import {
  createTwink,
  findTwinkById,
  findTwinkByUsername,
  updateTwink,
  deleteTwink,
  updateTwinkCredentials,
  updateTwinkUsername,
  addVehicleToTwink,
  removeVehicleFromTwink,
  getAllTwinks,
  formatVehicleForDisplay,
  groupVehiclesByNation
} from '../utils/twinks';
import { Vehicle, NationCode, VehicleType } from '../types/twinks';
import * as fs from 'fs';
import { getDataFilePath } from '../utils/paths';

// Импортируем тесты обновления техники динамически, чтобы избежать проблем с циклическими зависимостями
let testTwinkVehicleUpdate: (() => Promise<TestResult[]>) | null = null;

// Путь к реальному файлу и тестовому
const REAL_FILE_PATH = getDataFilePath("twink_history.json");
const TEST_FILE_PATH = getDataFilePath("twink_history_test.json");

// Сохраняем оригинальный файл перед тестами (один раз при загрузке модуля)
let originalFileBackup: string | null = null;

function saveOriginalFile() {
  if (fs.existsSync(REAL_FILE_PATH)) {
    originalFileBackup = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
  }
}

function restoreOriginalFile() {
  if (originalFileBackup !== null && originalFileBackup.trim() !== '') {
    fs.writeFileSync(REAL_FILE_PATH, originalFileBackup, 'utf-8');
  }
}

// Переключаемся на тестовый файл: копируем оригинальный файл в тестовый
function useTestFile() {
  // КРИТИЧНО: Сохраняем оригинальный файл в .backup ПЕРЕД ПЕРВЫМ ТЕСТОМ
  // Это гарантирует, что мы не потеряем данные
  if (!fs.existsSync(REAL_FILE_PATH + '.backup')) {
    if (fs.existsSync(REAL_FILE_PATH)) {
      fs.copyFileSync(REAL_FILE_PATH, REAL_FILE_PATH + '.backup');
      // Сохраняем также в память для восстановления
      originalFileBackup = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    } else {
      // Если файла нет, создаём пустой бэкап
      const emptyHistory = { twinks: [], lastUpdated: new Date().toISOString() };
      fs.writeFileSync(REAL_FILE_PATH + '.backup', JSON.stringify(emptyHistory, null, 2), 'utf-8');
      originalFileBackup = JSON.stringify(emptyHistory, null, 2);
    }
  }
  
  // Если оригинальный файл ещё не сохранён в память, читаем его
  if (originalFileBackup === null) {
    if (fs.existsSync(REAL_FILE_PATH + '.backup')) {
      originalFileBackup = fs.readFileSync(REAL_FILE_PATH + '.backup', 'utf-8');
    } else {
      const emptyHistory = { twinks: [], lastUpdated: new Date().toISOString() };
      originalFileBackup = JSON.stringify(emptyHistory, null, 2);
    }
  }
  
  // Копируем оригинальный файл в тестовый
  if (originalFileBackup !== null && originalFileBackup.trim() !== '') {
    fs.writeFileSync(TEST_FILE_PATH, originalFileBackup, 'utf-8');
  } else {
    // Если оригинального файла нет, создаём пустой тестовый
    const testHistory = { twinks: [], lastUpdated: new Date().toISOString() };
    fs.writeFileSync(TEST_FILE_PATH, JSON.stringify(testHistory, null, 2), 'utf-8');
  }
  
  // Копируем тестовый файл на место реального (функции используют REAL_FILE_PATH)
  fs.copyFileSync(TEST_FILE_PATH, REAL_FILE_PATH);
}

// Очищаем только тестовые данные (не восстанавливаем оригинал)
function cleanupTestDataAfterTest() {
  // Создаем пустой файл для следующего теста
  const testHistory = { twinks: [], lastUpdated: new Date().toISOString() };
  fs.writeFileSync(REAL_FILE_PATH, JSON.stringify(testHistory, null, 2), 'utf-8');
}

// Восстанавливаем оригинальный файл после ВСЕХ тестов
function restoreOriginalFileAfterAllTests() {
  // Восстанавливаем оригинальный файл из .backup (приоритет) или из бэкапа
  // НЕ удаляем .backup здесь - он может понадобиться для других тестов
  if (fs.existsSync(REAL_FILE_PATH + '.backup')) {
    fs.copyFileSync(REAL_FILE_PATH + '.backup', REAL_FILE_PATH);
    // НЕ удаляем .backup здесь - это сделает restoreTwinkHistoryFileAfterVehicleUpdateTests
  } else if (originalFileBackup !== null && originalFileBackup.trim() !== '') {
    fs.writeFileSync(REAL_FILE_PATH, originalFileBackup, 'utf-8');
  }
  
  // Удаляем тестовый файл, если он остался
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
  }
}

// НЕ сохраняем оригинальный файл при загрузке модуля
// Это делается в useTestFile() перед каждым набором тестов
// originalFileBackup будет установлен только когда действительно нужно

async function testTwinkCreation(): Promise<TestResult> {
  const start = Date.now();
  const name = "Создание твинка";
  
  try {
    useTestFile();
    
    const twink = createTwink("TestUser", "test-user-id", "testlogin", "testpass", false);
    
    if (!twink.id) {
      return {
        name,
        success: false,
        error: "ID твинка не был сгенерирован",
        duration: Date.now() - start
      };
    }
    
    if (twink.username !== "TestUser") {
      return {
        name,
        success: false,
        error: `Неверное имя пользователя: ${twink.username}`,
        duration: Date.now() - start
      };
    }
    
    if (twink.login !== "testlogin") {
      return {
        name,
        success: false,
        error: `Неверный логин: ${twink.login}`,
        duration: Date.now() - start
      };
    }
    
    if (twink.has2FA !== false) {
      return {
        name,
        success: false,
        error: `Неверный статус 2FA: ${twink.has2FA}`,
        duration: Date.now() - start
      };
    }
    
    if (twink.vehicles.length !== 0) {
      return {
        name,
        success: false,
        error: `Техника должна быть пустой при создании`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что твинк сохранился
    const allTwinks = getAllTwinks();
    const found = allTwinks.find(t => t.id === twink.id);
    
    if (!found) {
      return {
        name,
        success: false,
        error: "Твинк не был сохранен",
        duration: Date.now() - start
      };
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при создании твинка: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testTwinkDuplicates(): Promise<TestResult> {
  const start = Date.now();
  const name = "Проверка дубликатов твинков";
  
  try {
    cleanupTestDataAfterTest();
    
    createTwink("UniqueUser", "test-user-id");
    
    // Попытка создать твинк с тем же именем должна вызвать ошибку
    try {
      createTwink("UniqueUser", "test-user-id");
      return {
        name,
        success: false,
        error: "Должна быть ошибка при создании дубликата",
        duration: Date.now() - start
      };
    } catch (error: any) {
      if (!error.message.includes("уже существует")) {
        return {
          name,
          success: false,
          error: `Неверное сообщение об ошибке: ${error.message}`,
          duration: Date.now() - start
        };
      }
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при проверке дубликатов: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testFindTwink(): Promise<TestResult> {
  const start = Date.now();
  const name = "Поиск твинков";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("FindMe", "test-user-id");
    const id = twink.id;
    
    // Поиск по ID
    const foundById = findTwinkById(id);
    if (!foundById || foundById.id !== id) {
      return {
        name,
        success: false,
        error: "Поиск по ID не работает",
        duration: Date.now() - start
      };
    }
    
    // Поиск по username (регистронезависимо)
    const foundByUsername1 = findTwinkByUsername("FindMe");
    if (!foundByUsername1 || foundByUsername1.id !== id) {
      return {
        name,
        success: false,
        error: "Поиск по username (точное совпадение) не работает",
        duration: Date.now() - start
      };
    }
    
    const foundByUsername2 = findTwinkByUsername("findme");
    if (!foundByUsername2 || foundByUsername2.id !== id) {
      return {
        name,
        success: false,
        error: "Поиск по username (регистронезависимо) не работает",
        duration: Date.now() - start
      };
    }
    
    // Поиск несуществующего
    const notFound = findTwinkById("non-existent-id");
    if (notFound !== null) {
      return {
        name,
        success: false,
        error: "Поиск несуществующего твинка должен возвращать null",
        duration: Date.now() - start
      };
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при поиске твинка: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testUpdateTwink(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление твинка";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("UpdateMe", "test-user-id", "oldlogin", "oldpass", false);
    const id = twink.id;
    
    // Обновление никнейма
    const success1 = updateTwinkUsername(id, "UpdatedName", "test-user-id");
    if (!success1) {
      return {
        name,
        success: false,
        error: "Обновление никнейма не удалось",
        duration: Date.now() - start
      };
    }
    
    const updated = findTwinkById(id);
    if (!updated || updated.username !== "UpdatedName") {
      return {
        name,
        success: false,
        error: "Никнейм не был обновлен",
        duration: Date.now() - start
      };
    }
    
    // Обновление учетных данных
    const success2 = updateTwinkCredentials(id, "newlogin", "newpass", true, "test-user-id");
    if (!success2) {
      return {
        name,
        success: false,
        error: "Обновление учетных данных не удалось",
        duration: Date.now() - start
      };
    }
    
    const updated2 = findTwinkById(id);
    if (!updated2 || updated2.login !== "newlogin" || updated2.has2FA !== true) {
      return {
        name,
        success: false,
        error: "Учетные данные не были обновлены",
        duration: Date.now() - start
      };
    }
    
    // Обновление несуществующего твинка
    const success3 = updateTwink("non-existent", { username: "test" });
    if (success3) {
      return {
        name,
        success: false,
        error: "Обновление несуществующего твинка не должно возвращать true",
        duration: Date.now() - start
      };
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при обновлении твинка: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testDeleteTwink(): Promise<TestResult> {
  const start = Date.now();
  const name = "Удаление твинка";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("DeleteMe", "test-user-id");
    const id = twink.id;
    
    // Проверяем, что твинк существует
    if (!findTwinkById(id)) {
      return {
        name,
        success: false,
        error: "Твинк не был создан",
        duration: Date.now() - start
      };
    }
    
    // Удаляем
    const success = deleteTwink(id);
    if (!success) {
      return {
        name,
        success: false,
        error: "Удаление твинка не удалось",
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что твинк удален
    const deleted = findTwinkById(id);
    if (deleted !== null) {
      return {
        name,
        success: false,
        error: "Твинк не был удален",
        duration: Date.now() - start
      };
    }
    
    // Удаление несуществующего твинка
    const success2 = deleteTwink("non-existent-id");
    if (success2) {
      return {
        name,
        success: false,
        error: "Удаление несуществующего твинка не должно возвращать true",
        duration: Date.now() - start
      };
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при удалении твинка: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testVehicleOperations(): Promise<TestResult> {
  const start = Date.now();
  const name = "Операции с техникой";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("VehicleTest", "test-user-id");
    const id = twink.id;
    
    // Добавляем технику
    const vehicle1: Vehicle = {
      name: "Leopard A7",
      br: 12.0,
      nation: "de" as NationCode,
      type: "ground" as VehicleType
    };
    
    const success1 = addVehicleToTwink(id, vehicle1, "test-user-id");
    if (!success1) {
      return {
        name,
        success: false,
        error: "Добавление техники не удалось",
        duration: Date.now() - start
      };
    }
    
    const updated = findTwinkById(id);
    if (!updated || updated.vehicles.length !== 1) {
      return {
        name,
        success: false,
        error: "Техника не была добавлена",
        duration: Date.now() - start
      };
    }
    
    if (updated.vehicles[0].name !== "Leopard A7") {
      return {
        name,
        success: false,
        error: "Название техники не совпадает",
        duration: Date.now() - start
      };
    }
    
    // Добавляем еще технику
    const vehicle2: Vehicle = {
      name: "Tiger H1",
      br: 5.7,
      nation: "de" as NationCode,
      type: "ground" as VehicleType
    };
    
    addVehicleToTwink(id, vehicle2, "test-user-id");
    const updated2 = findTwinkById(id);
    
    if (!updated2 || updated2.vehicles.length !== 2) {
      return {
        name,
        success: false,
        error: "Вторая техника не была добавлена",
        duration: Date.now() - start
      };
    }
    
    // Проверяем сортировку (по BR убывание)
    if (updated2.vehicles[0].br < updated2.vehicles[1].br) {
      return {
        name,
        success: false,
        error: "Техника не отсортирована по BR",
        duration: Date.now() - start
      };
    }
    
    // Удаляем технику
    const success2 = removeVehicleFromTwink(id, 0, "test-user-id");
    if (!success2) {
      return {
        name,
        success: false,
        error: "Удаление техники не удалось",
        duration: Date.now() - start
      };
    }
    
    const updated3 = findTwinkById(id);
    if (!updated3 || updated3.vehicles.length !== 1) {
      return {
        name,
        success: false,
        error: "Техника не была удалена",
        duration: Date.now() - start
      };
    }
    
    // Попытка добавить дубликат должна вызвать ошибку
    try {
      addVehicleToTwink(id, vehicle2, "test-user-id");
      addVehicleToTwink(id, vehicle2, "test-user-id");
      return {
        name,
        success: false,
        error: "Должна быть ошибка при добавлении дубликата техники",
        duration: Date.now() - start
      };
    } catch (error: any) {
      if (!error.message.includes("уже есть")) {
        return {
          name,
          success: false,
          error: `Неверное сообщение об ошибке: ${error.message}`,
          duration: Date.now() - start
        };
      }
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при операциях с техникой: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testVehicleFormatting(): Promise<TestResult> {
  const start = Date.now();
  const name = "Форматирование техники";
  
  try {
    const vehicle: Vehicle = {
      name: "Leopard A7",
      br: 12.0,
      nation: "de" as NationCode,
      type: "ground" as VehicleType
    };
    
    const formatted = formatVehicleForDisplay(vehicle);
    
    if (!formatted.includes("Leopard A7") || !formatted.includes("12") || !formatted.includes("DE")) {
      return {
        name,
        success: false,
        error: `Неверное форматирование: ${formatted}`,
        duration: Date.now() - start
      };
    }
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    return {
      name,
      success: false,
      error: `Ошибка при форматировании: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testVehicleGrouping(): Promise<TestResult> {
  const start = Date.now();
  const name = "Группировка техники";
  
  try {
    const vehicles: Vehicle[] = [
      { name: "Tiger H1", br: 5.7, nation: "de" as NationCode, type: "ground" as VehicleType },
      { name: "T-34-85", br: 5.7, nation: "ru" as NationCode, type: "ground" as VehicleType },
      { name: "Spitfire", br: 5.7, nation: "gb" as NationCode, type: "airplane" as VehicleType }
    ];
    
    const grouped = groupVehiclesByNation(vehicles);
    
    if (!grouped["de_ground"] || grouped["de_ground"].length !== 1) {
      return {
        name,
        success: false,
        error: "Группировка по нации de не работает",
        duration: Date.now() - start
      };
    }
    
    if (!grouped["ru_ground"] || grouped["ru_ground"].length !== 1) {
      return {
        name,
        success: false,
        error: "Группировка по нации ru не работает",
        duration: Date.now() - start
      };
    }
    
    if (!grouped["gb_airplane"] || grouped["gb_airplane"].length !== 1) {
      return {
        name,
        success: false,
        error: "Группировка по типу airplane не работает",
        duration: Date.now() - start
      };
    }
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    return {
      name,
      success: false,
      error: `Ошибка при группировке: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

async function testGetAllTwinks(): Promise<TestResult> {
  const start = Date.now();
  const name = "Получение всех твинков";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink1 = createTwink("User1", "test-user-id");
    const twink2 = createTwink("User2", "test-user-id");
    const twink3 = createTwink("User3", "test-user-id");
    
    const all = getAllTwinks();
    
    if (all.length !== 3) {
      return {
        name,
        success: false,
        error: `Ожидалось 3 твинка, получено ${all.length}`,
        duration: Date.now() - start
      };
    }
    
    const ids = all.map(t => t.id);
    if (!ids.includes(twink1.id) || !ids.includes(twink2.id) || !ids.includes(twink3.id)) {
      return {
        name,
        success: false,
        error: "Не все твинки были возвращены",
        duration: Date.now() - start
      };
    }
    
    cleanupTestDataAfterTest();
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error: any) {
    cleanupTestDataAfterTest();
    return {
      name,
      success: false,
      error: `Ошибка при получении всех твинков: ${error?.message || error}`,
      duration: Date.now() - start
    };
  }
}

// Восстанавливаем оригинальный файл после всех тестов
// Это будет вызвано после завершения всех тестов через testRunner
// Добавляем глобальную функцию восстановления
(global as any).restoreTwinkHistoryFile = restoreOriginalFileAfterAllTests;

// Обёртка для тестов обновления техники
async function testTwinkVehicleUpdateWrapper(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление техники твинков";
  
  try {
    // Динамически импортируем тесты обновления техники
    if (!testTwinkVehicleUpdate) {
      const module = await import('./twinkVehicleUpdateTests');
      testTwinkVehicleUpdate = module.testTwinkVehicleUpdate;
    }
    
    if (!testTwinkVehicleUpdate) {
      return {
        name,
        success: false,
        error: "Не удалось загрузить тесты обновления техники",
        duration: Date.now() - start
      };
    }
    
    const results = await testTwinkVehicleUpdate();
    const failed = results.filter(r => !r.success);
    
    if (failed.length > 0) {
      const errors = failed.map(r => `${r.name}: ${r.error}`).join('; ');
      return {
        name,
        success: false,
        error: `Не прошло ${failed.length} из ${results.length} тестов: ${errors}`,
        duration: Date.now() - start
      };
    }
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (err: any) {
    return {
      name,
      success: false,
      error: err.message || "Неизвестная ошибка",
      duration: Date.now() - start
    };
  }
}

export const twinksTests = [
  testTwinkCreation,
  testTwinkDuplicates,
  testFindTwink,
  testUpdateTwink,
  testDeleteTwink,
  testVehicleOperations,
  testVehicleFormatting,
  testVehicleGrouping,
  testGetAllTwinks,
  testTwinkVehicleUpdateWrapper
];

