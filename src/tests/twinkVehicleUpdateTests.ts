import { TestResult } from './testRunner';
import {
  createTwink,
  findTwinkById,
  addVehicleToTwink,
  updateVehicleInTwink,
  removeVehicleFromTwink,
  getAllTwinks
} from '../utils/twinks';
import { Vehicle, NationCode, VehicleType } from '../types/twinks';
import * as fs from 'fs';
import { getDataFilePath } from '../utils/paths';

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
  if (originalFileBackup !== null) {
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

function cleanupTestDataAfterTest() {
  // Создаем пустой файл для следующего теста
  const testHistory = { twinks: [], lastUpdated: new Date().toISOString() };
  fs.writeFileSync(REAL_FILE_PATH, JSON.stringify(testHistory, null, 2), 'utf-8');
}

export async function testTwinkVehicleUpdate(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Сохраняем оригинальный файл перед всеми тестами
  if (originalFileBackup === null) {
    saveOriginalFile();
  }
  
  results.push(await testVehicleUpdateNameAndBr());
  results.push(await testVehicleUpdateNation());
  results.push(await testVehicleUpdateType());
  results.push(await testVehicleUpdateAllFields());
  results.push(await testVehicleUpdateInvalidIndex());
  results.push(await testVehicleUpdateIndexStability());
  results.push(await testVehicleUpdateWithDuplicateNames());
  
  return results;
}

/**
 * Тест: обновление названия и BR техники
 */
async function testVehicleUpdateNameAndBr(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление названия и BR техники";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    const vehicle: Vehicle = {
      name: "Leopard 1",
      br: 8.0,
      nation: 'de',
      type: 'ground'
    };
    
    addVehicleToTwink(twink.id, vehicle, "test-user-id");
    
    const updatedTwink = findTwinkById(twink.id);
    if (!updatedTwink || updatedTwink.vehicles.length === 0) {
      return {
        name,
        success: false,
        error: "Техника не добавлена",
        duration: Date.now() - start
      };
    }
    
    const vehicleIndex = 0;
    const newName = "Leopard 1A1";
    const newBr = 8.3;
    
    const success = updateVehicleInTwink(twink.id, vehicleIndex, { name: newName, br: newBr }, "test-user-id");
    
    if (!success) {
      return {
        name,
        success: false,
        error: "Функция обновления вернула false",
        duration: Date.now() - start
      };
    }
    
    const afterUpdate = findTwinkById(twink.id);
    if (!afterUpdate || afterUpdate.vehicles.length === 0) {
      return {
        name,
        success: false,
        error: "Техника исчезла после обновления",
        duration: Date.now() - start
      };
    }
    
    const updatedVehicle = afterUpdate.vehicles[vehicleIndex];
    if (updatedVehicle.name !== newName || updatedVehicle.br !== newBr) {
      return {
        name,
        success: false,
        error: `Техника не обновлена корректно. Ожидалось: "${newName}" (BR ${newBr}), получено: "${updatedVehicle.name}" (BR ${updatedVehicle.br})`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что индекс остался прежним
    if (afterUpdate.vehicles.length !== 1) {
      return {
        name,
        success: false,
        error: `Количество техники изменилось: ожидалось 1, получено ${afterUpdate.vehicles.length}`,
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

/**
 * Тест: обновление нации техники
 */
async function testVehicleUpdateNation(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление нации техники";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    const vehicle: Vehicle = {
      name: "T-34",
      br: 4.0,
      nation: 'ru',
      type: 'ground'
    };
    
    addVehicleToTwink(twink.id, vehicle, "test-user-id");
    
    const vehicleIndex = 0;
    const newNation: NationCode = 'us';
    
    const success = updateVehicleInTwink(twink.id, vehicleIndex, { nation: newNation }, "test-user-id");
    
    if (!success) {
      return {
        name,
        success: false,
        error: "Функция обновления вернула false",
        duration: Date.now() - start
      };
    }
    
    const afterUpdate = findTwinkById(twink.id);
    if (!afterUpdate || afterUpdate.vehicles.length === 0) {
      return {
        name,
        success: false,
        error: "Техника исчезла после обновления",
        duration: Date.now() - start
      };
    }
    
    const updatedVehicle = afterUpdate.vehicles[vehicleIndex];
    if (updatedVehicle.nation !== newNation) {
      return {
        name,
        success: false,
        error: `Нация не обновлена. Ожидалось: ${newNation}, получено: ${updatedVehicle.nation}`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что другие поля не изменились
    if (updatedVehicle.name !== vehicle.name || updatedVehicle.br !== vehicle.br || updatedVehicle.type !== vehicle.type) {
      return {
        name,
        success: false,
        error: "Другие поля техники изменились при обновлении нации",
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

/**
 * Тест: обновление типа техники
 */
async function testVehicleUpdateType(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление типа техники";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    const vehicle: Vehicle = {
      name: "Spitfire",
      br: 5.7,
      nation: 'gb',
      type: 'airplane'
    };
    
    addVehicleToTwink(twink.id, vehicle, "test-user-id");
    
    const vehicleIndex = 0;
    const newType: VehicleType = 'ground';
    
    const success = updateVehicleInTwink(twink.id, vehicleIndex, { type: newType }, "test-user-id");
    
    if (!success) {
      return {
        name,
        success: false,
        error: "Функция обновления вернула false",
        duration: Date.now() - start
      };
    }
    
    const afterUpdate = findTwinkById(twink.id);
    if (!afterUpdate || afterUpdate.vehicles.length === 0) {
      return {
        name,
        success: false,
        error: "Техника исчезла после обновления",
        duration: Date.now() - start
      };
    }
    
    const updatedVehicle = afterUpdate.vehicles[vehicleIndex];
    if (updatedVehicle.type !== newType) {
      return {
        name,
        success: false,
        error: `Тип не обновлён. Ожидалось: ${newType}, получено: ${updatedVehicle.type}`,
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

/**
 * Тест: обновление всех полей техники одновременно
 */
async function testVehicleUpdateAllFields(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление всех полей техники";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    const vehicle: Vehicle = {
      name: "Tiger H1",
      br: 5.7,
      nation: 'de',
      type: 'ground'
    };
    
    addVehicleToTwink(twink.id, vehicle, "test-user-id");
    
    const vehicleIndex = 0;
    const updates = {
      name: "Tiger E",
      br: 6.0,
      nation: 'ru' as NationCode,
      type: 'airplane' as VehicleType
    };
    
    const success = updateVehicleInTwink(twink.id, vehicleIndex, updates, "test-user-id");
    
    if (!success) {
      return {
        name,
        success: false,
        error: "Функция обновления вернула false",
        duration: Date.now() - start
      };
    }
    
    const afterUpdate = findTwinkById(twink.id);
    if (!afterUpdate || afterUpdate.vehicles.length === 0) {
      return {
        name,
        success: false,
        error: "Техника исчезла после обновления",
        duration: Date.now() - start
      };
    }
    
    const updatedVehicle = afterUpdate.vehicles[vehicleIndex];
    if (
      updatedVehicle.name !== updates.name ||
      updatedVehicle.br !== updates.br ||
      updatedVehicle.nation !== updates.nation ||
      updatedVehicle.type !== updates.type
    ) {
      return {
        name,
        success: false,
        error: `Не все поля обновлены. Ожидалось: ${JSON.stringify(updates)}, получено: ${JSON.stringify(updatedVehicle)}`,
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

/**
 * Тест: проверка на некорректный индекс техники
 */
async function testVehicleUpdateInvalidIndex(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление с некорректным индексом";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    const vehicle: Vehicle = {
      name: "T-34",
      br: 4.0,
      nation: 'ru',
      type: 'ground'
    };
    
    addVehicleToTwink(twink.id, vehicle, "test-user-id");
    
    // Пытаемся обновить с отрицательным индексом
    const success1 = updateVehicleInTwink(twink.id, -1, { name: "Test" }, "test-user-id");
    if (success1) {
      return {
        name,
        success: false,
        error: "Функция обновления приняла отрицательный индекс",
        duration: Date.now() - start
      };
    }
    
    // Пытаемся обновить с индексом больше длины массива
    const success2 = updateVehicleInTwink(twink.id, 100, { name: "Test" }, "test-user-id");
    if (success2) {
      return {
        name,
        success: false,
        error: "Функция обновления приняла индекс больше длины массива",
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

/**
 * Тест: стабильность индексов после обновления
 * Критический тест - индексы не должны меняться после обновления
 */
async function testVehicleUpdateIndexStability(): Promise<TestResult> {
  const start = Date.now();
  const name = "Стабильность индексов после обновления";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    
    // Добавляем несколько техник
    const vehicles: Vehicle[] = [
      { name: "Vehicle 1", br: 5.0, nation: 'de', type: 'ground' },
      { name: "Vehicle 2", br: 6.0, nation: 'ru', type: 'ground' },
      { name: "Vehicle 3", br: 7.0, nation: 'us', type: 'airplane' }
    ];
    
    vehicles.forEach(v => addVehicleToTwink(twink.id, v, "test-user-id"));
    
    const beforeUpdate = findTwinkById(twink.id);
    if (!beforeUpdate) {
      return {
        name,
        success: false,
        error: "Твинк не найден после добавления техники",
        duration: Date.now() - start
      };
    }
    
    // Сохраняем оригинальные индексы
    const originalIndices = new Map<string, number>();
    beforeUpdate.vehicles.forEach((v: Vehicle, idx: number) => {
      const key = `${v.name}|${v.br}|${v.nation}|${v.type}`;
      originalIndices.set(key, idx);
    });
    
    // Обновляем технику в середине (индекс 1)
    const vehicleIndex = 1;
    const success = updateVehicleInTwink(twink.id, vehicleIndex, { br: 6.5 }, "test-user-id");
    
    if (!success) {
      return {
        name,
        success: false,
        error: "Функция обновления вернула false",
        duration: Date.now() - start
      };
    }
    
    const afterUpdate = findTwinkById(twink.id);
    if (!afterUpdate) {
      return {
        name,
        success: false,
        error: "Твинк не найден после обновления",
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что количество техники не изменилось
    if (afterUpdate.vehicles.length !== beforeUpdate.vehicles.length) {
      return {
        name,
        success: false,
        error: `Количество техники изменилось: было ${beforeUpdate.vehicles.length}, стало ${afterUpdate.vehicles.length}`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что техника по индексу 1 обновилась
    const updatedVehicle = afterUpdate.vehicles[vehicleIndex];
    if (updatedVehicle.br !== 6.5) {
      return {
        name,
        success: false,
        error: `BR техники по индексу ${vehicleIndex} не обновился: ожидалось 6.5, получено ${updatedVehicle.br}`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что другие техники остались на своих местах
    // Vehicle 1 должна быть по индексу 0
    if (afterUpdate.vehicles[0].name !== "Vehicle 1") {
      return {
        name,
        success: false,
        error: `Техника по индексу 0 изменилась: ожидалось "Vehicle 1", получено "${afterUpdate.vehicles[0].name}"`,
        duration: Date.now() - start
      };
    }
    
    // Vehicle 3 должна быть по индексу 2
    if (afterUpdate.vehicles[2].name !== "Vehicle 3") {
      return {
        name,
        success: false,
        error: `Техника по индексу 2 изменилась: ожидалось "Vehicle 3", получено "${afterUpdate.vehicles[2].name}"`,
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

/**
 * Тест: обновление техники с одинаковыми названиями
 */
async function testVehicleUpdateWithDuplicateNames(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обновление техники с одинаковыми названиями";
  
  try {
    cleanupTestDataAfterTest();
    
    const twink = createTwink("TestTwink", "test-user-id");
    
    // Добавляем две техники с одинаковым названием, но разными BR
    // ВАЖНО: добавляем в порядке убывания BR, так как addVehicleToTwink сортирует по BR
    const vehicle1: Vehicle = { name: "Tiger", br: 6.0, nation: 'de', type: 'ground' };
    const vehicle2: Vehicle = { name: "Tiger", br: 5.7, nation: 'de', type: 'ground' };
    
    addVehicleToTwink(twink.id, vehicle1, "test-user-id");
    addVehicleToTwink(twink.id, vehicle2, "test-user-id");
    
    const beforeUpdate = findTwinkById(twink.id);
    if (!beforeUpdate || beforeUpdate.vehicles.length !== 2) {
      return {
        name,
        success: false,
        error: "Не удалось добавить две техники с одинаковым названием",
        duration: Date.now() - start
      };
    }
    
    // Находим индекс техники с BR 6.0 (должна быть первой после сортировки)
    const vehicle6Index = beforeUpdate.vehicles.findIndex((v: Vehicle) => v.br === 6.0);
    if (vehicle6Index === -1) {
      return {
        name,
        success: false,
        error: "Не найдена техника с BR 6.0 перед обновлением",
        duration: Date.now() - start
      };
    }
    
    // Обновляем технику с BR 6.0 на BR 5.8
    const success = updateVehicleInTwink(twink.id, vehicle6Index, { br: 5.8 }, "test-user-id");
    
    if (!success) {
      return {
        name,
        success: false,
        error: "Функция обновления вернула false",
        duration: Date.now() - start
      };
    }
    
    const afterUpdate = findTwinkById(twink.id);
    if (!afterUpdate || afterUpdate.vehicles.length !== 2) {
      return {
        name,
        success: false,
        error: "Количество техники изменилось после обновления",
        duration: Date.now() - start
      };
    }
    
    // Находим технику с обновлённым BR
    const updatedVehicle = afterUpdate.vehicles.find((v: Vehicle) => v.br === 5.8);
    if (!updatedVehicle) {
      return {
        name,
        success: false,
        error: "Техника с обновлённым BR 5.8 не найдена",
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что техника с BR 5.7 не изменилась
    const unchangedVehicle = afterUpdate.vehicles.find((v: Vehicle) => v.br === 5.7);
    if (!unchangedVehicle) {
      return {
        name,
        success: false,
        error: "Техника с BR 5.7 исчезла после обновления",
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что техника с BR 5.7 имеет правильные параметры
    if (unchangedVehicle.name !== "Tiger" || unchangedVehicle.nation !== 'de' || unchangedVehicle.type !== 'ground') {
      return {
        name,
        success: false,
        error: "Параметры техники с BR 5.7 изменились",
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

// Глобальная функция для восстановления файла после всех тестов
(global as any).restoreTwinkHistoryFileAfterVehicleUpdateTests = function() {
  // Восстанавливаем оригинальный файл из .backup (приоритет) или из бэкапа
  // Это последняя функция восстановления, поэтому удаляем .backup здесь
  if (fs.existsSync(REAL_FILE_PATH + '.backup')) {
    fs.copyFileSync(REAL_FILE_PATH + '.backup', REAL_FILE_PATH);
    fs.unlinkSync(REAL_FILE_PATH + '.backup');
  } else if (originalFileBackup !== null && originalFileBackup.trim() !== '') {
    fs.writeFileSync(REAL_FILE_PATH, originalFileBackup, 'utf-8');
  }
  
  // Удаляем тестовый файл, если он остался
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
  }
};

