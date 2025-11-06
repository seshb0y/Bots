import { getDataFilePath } from "./paths";
import { loadJson, saveJson } from "./json";
import { info, error } from "./logger";
import { TwinkData, TwinkHistory, Vehicle, NationCode, VehicleType, NATION_NAMES, VEHICLE_TYPE_NAMES } from "../types/twinks";
import * as crypto from "crypto";

const TWINK_HISTORY_PATH = getDataFilePath("twink_history.json");

/**
 * Загружает историю твинков из файла
 */
export function loadTwinkHistory(): TwinkHistory {
  try {
    const history = loadJson<TwinkHistory>(TWINK_HISTORY_PATH);
    if (!history || !history.twinks) {
      const emptyHistory: TwinkHistory = { 
        twinks: [], 
        lastUpdated: new Date().toISOString() 
      };
      saveJson(TWINK_HISTORY_PATH, emptyHistory);
      return emptyHistory;
    }
    return history;
  } catch (err: any) {
    error("Ошибка при загрузке истории твинков", err);
    const emptyHistory: TwinkHistory = { 
      twinks: [], 
      lastUpdated: new Date().toISOString() 
    };
    try {
      saveJson(TWINK_HISTORY_PATH, emptyHistory);
    } catch (saveErr) {
      error("Ошибка при создании пустой истории твинков", saveErr);
    }
    return emptyHistory;
  }
}

/**
 * Сохраняет историю твинков в файл
 */
export function saveTwinkHistory(history: TwinkHistory): void {
  try {
    history.lastUpdated = new Date().toISOString();
    saveJson(TWINK_HISTORY_PATH, history);
    info(`История твинков сохранена: ${history.twinks.length} твинков`);
  } catch (err: any) {
    error("Ошибка при сохранении истории твинков", err);
    throw err;
  }
}

/**
 * Создает новый твинк
 */
export function createTwink(
  username: string,
  createdBy?: string,
  login?: string,
  password?: string,
  has2FA: boolean = false,
  twoFactorContact?: string
): TwinkData {
  try {
    const history = loadTwinkHistory();
    
    // Проверяем, нет ли уже твинка с таким username
    const existing = history.twinks.find((t: TwinkData) => 
      t.username.toLowerCase() === username.toLowerCase()
    );
    if (existing) {
      throw new Error(`Твинк с именем пользователя "${username}" уже существует`);
    }
    
    const twink: TwinkData = {
      id: crypto.randomUUID(),
      username,
      login,
      password,
      has2FA,
      twoFactorContact,
      vehicles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      updatedBy: createdBy
    };
    
    history.twinks.push(twink);
    saveTwinkHistory(history);
    
    info(`Создан новый твинк: ${twink.id} (${username})`);
    return twink;
  } catch (err: any) {
    error(`Ошибка при создании твинка ${username}:`, err);
    throw err;
  }
}

/**
 * Находит твинк по ID
 */
export function findTwinkById(id: string): TwinkData | null {
  const history = loadTwinkHistory();
  return history.twinks.find((twink: TwinkData) => twink.id === id) || null;
}

/**
 * Находит твинк по username (регистронезависимо)
 */
export function findTwinkByUsername(username: string): TwinkData | null {
  const history = loadTwinkHistory();
  return history.twinks.find((twink: TwinkData) => 
    twink.username.toLowerCase() === username.toLowerCase()
  ) || null;
}

/**
 * Обновляет твинк
 */
export function updateTwink(
  id: string, 
  updates: Partial<Omit<TwinkData, 'id' | 'createdAt' | 'createdBy'>>,
  updatedBy?: string
): boolean {
  const history = loadTwinkHistory();
  const twinkIndex = history.twinks.findIndex((twink: TwinkData) => twink.id === id);
  
  if (twinkIndex === -1) {
    error(`Твинк с ID ${id} не найден`);
    return false;
  }
  
  // Если обновляется username, проверяем уникальность
  if (updates.username) {
    const existing = history.twinks.find((t: TwinkData, idx: number) => 
      idx !== twinkIndex && 
      t.username.toLowerCase() === updates.username!.toLowerCase()
    );
    if (existing) {
      throw new Error(`Твинк с именем пользователя "${updates.username}" уже существует`);
    }
  }
  
  history.twinks[twinkIndex] = {
    ...history.twinks[twinkIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy
  };
  
  saveTwinkHistory(history);
  info(`Твинк ${id} обновлен`);
  return true;
}

/**
 * Удаляет твинк
 */
export function deleteTwink(id: string): boolean {
  const history = loadTwinkHistory();
  const twinkIndex = history.twinks.findIndex((twink: TwinkData) => twink.id === id);
  
  if (twinkIndex === -1) {
    error(`Твинк с ID ${id} не найден`);
    return false;
  }
  
  history.twinks.splice(twinkIndex, 1);
  saveTwinkHistory(history);
  
  info(`Твинк ${id} удален`);
  return true;
}

/**
 * Обновляет учетные данные твинка (логин, пароль, 2FA)
 */
export function updateTwinkCredentials(
  id: string,
  login?: string,
  password?: string,
  has2FA?: boolean,
  updatedBy?: string
): boolean {
  const updates: Partial<TwinkData> = {};
  
  if (login !== undefined) updates.login = login;
  if (password !== undefined) updates.password = password;
  if (has2FA !== undefined) updates.has2FA = has2FA;
  
  return updateTwink(id, updates, updatedBy);
}

/**
 * Обновляет никнейм твинка
 */
export function updateTwinkUsername(
  id: string,
  username: string,
  updatedBy?: string
): boolean {
  return updateTwink(id, { username }, updatedBy);
}

/**
 * Добавляет технику к твинку
 */
export function addVehicleToTwink(
  id: string,
  vehicle: Vehicle,
  updatedBy?: string
): boolean {
  const history = loadTwinkHistory();
  const twinkIndex = history.twinks.findIndex((twink: TwinkData) => twink.id === id);
  
  if (twinkIndex === -1) {
    error(`Твинк с ID ${id} не найден`);
    return false;
  }
  
  const twink = history.twinks[twinkIndex];
  
  // Проверяем, нет ли уже такой техники
  const existing = twink.vehicles.find((v: Vehicle) => 
    v.name.toLowerCase() === vehicle.name.toLowerCase() &&
    v.nation === vehicle.nation &&
    v.type === vehicle.type &&
    v.br === vehicle.br
  );
  
  if (existing) {
    throw new Error(`Техника "${vehicle.name}" уже есть у этого твинка`);
  }
  
  twink.vehicles.push(vehicle);
  twink.updatedAt = new Date().toISOString();
  twink.updatedBy = updatedBy;
  
  // Сортируем технику по нации и BR
  twink.vehicles.sort((a: Vehicle, b: Vehicle) => {
    if (a.nation !== b.nation) {
      return a.nation.localeCompare(b.nation);
    }
    return b.br - a.br; // По убыванию BR
  });
  
  saveTwinkHistory(history);
  info(`Техника "${vehicle.name}" добавлена к твинку ${id}`);
  return true;
}

/**
 * Удаляет технику из твинка
 */
export function removeVehicleFromTwink(
  id: string,
  vehicleIndex: number,
  updatedBy?: string
): boolean {
  const history = loadTwinkHistory();
  const twinkIndex = history.twinks.findIndex((twink: TwinkData) => twink.id === id);
  
  if (twinkIndex === -1) {
    error(`Твинк с ID ${id} не найден`);
    return false;
  }
  
  const twink = history.twinks[twinkIndex];
  
  if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
    error(`Индекс техники ${vehicleIndex} вне диапазона`);
    return false;
  }
  
  const removed = twink.vehicles.splice(vehicleIndex, 1)[0];
  twink.updatedAt = new Date().toISOString();
  twink.updatedBy = updatedBy;
  
  saveTwinkHistory(history);
  info(`Техника "${removed.name}" удалена из твинка ${id}`);
  return true;
}

/**
 * Обновляет технику у твинка
 */
export function updateVehicleInTwink(
  id: string,
  vehicleIndex: number,
  updatedVehicle: Partial<Vehicle> & { name?: string },
  updatedBy?: string
): boolean {
  info(`[UPDATE-VEHICLE] Начало обновления: twinkId=${id}, vehicleIndex=${vehicleIndex}, updatedVehicle=${JSON.stringify(updatedVehicle)}`);
  
  const history = loadTwinkHistory();
  const twinkIndex = history.twinks.findIndex((twink: TwinkData) => twink.id === id);
  
  if (twinkIndex === -1) {
    error(`[UPDATE-VEHICLE] Твинк с ID ${id} не найден`);
    return false;
  }
  
  const twink = history.twinks[twinkIndex];
  info(`[UPDATE-VEHICLE] Твинк найден: username=${twink.username}, vehicles.length=${twink.vehicles.length}`);
  
  if (vehicleIndex < 0 || vehicleIndex >= twink.vehicles.length) {
    error(`[UPDATE-VEHICLE] Индекс техники ${vehicleIndex} вне диапазона (всего техники: ${twink.vehicles.length})`);
    return false;
  }
  
  const vehicle = twink.vehicles[vehicleIndex];
  
  // Сохраняем текущие значения для логирования
  const oldName = vehicle.name;
  const oldBr = vehicle.br;
  const oldNation = vehicle.nation;
  const oldType = vehicle.type;
  
  info(`[UPDATE-VEHICLE] Старая техника: name="${oldName}", br=${oldBr}, nation=${oldNation}, type=${oldType}`);
  
  // Обновляем поля
  if (updatedVehicle.name !== undefined) {
    info(`[UPDATE-VEHICLE] Обновление name: "${oldName}" -> "${updatedVehicle.name}"`);
    vehicle.name = updatedVehicle.name;
  }
  if (updatedVehicle.br !== undefined) {
    info(`[UPDATE-VEHICLE] Обновление br: ${oldBr} -> ${updatedVehicle.br}`);
    vehicle.br = updatedVehicle.br;
  }
  if (updatedVehicle.nation !== undefined) {
    info(`[UPDATE-VEHICLE] Обновление nation: ${oldNation} -> ${updatedVehicle.nation}`);
    vehicle.nation = updatedVehicle.nation;
  }
  if (updatedVehicle.type !== undefined) {
    info(`[UPDATE-VEHICLE] Обновление type: ${oldType} -> ${updatedVehicle.type}`);
    vehicle.type = updatedVehicle.type;
  }
  
  info(`[UPDATE-VEHICLE] Техника после обновления: name="${vehicle.name}", br=${vehicle.br}, nation=${vehicle.nation}, type=${vehicle.type}`);
  
  twink.updatedAt = new Date().toISOString();
  twink.updatedBy = updatedBy;
  
  // ВАЖНО: Не сортируем после обновления, так как это меняет индексы техники
  // Сортировка должна происходить только при добавлении новой техники
  // Это критично для корректной работы индексов при редактировании
  
  info(`[UPDATE-VEHICLE] Сохранение истории твинков...`);
  saveTwinkHistory(history);
  info(`[UPDATE-VEHICLE] История сохранена успешно`);
  
  return true;
}

/**
 * Получает все твинки
 */
export function getAllTwinks(): TwinkData[] {
  const history = loadTwinkHistory();
  return history.twinks;
}

/**
 * Форматирует технику для отображения
 */
export function formatVehicleForDisplay(vehicle: Vehicle): string {
  const nation = vehicle.nation.toUpperCase();
  const br = vehicle.br;
  const name = vehicle.name;
  const type = vehicle.type === 'ground' ? '' : ` (${VEHICLE_TYPE_NAMES[vehicle.type]})`;
  return `${nation} ${br} ${name}${type}`;
}

/**
 * Группирует технику по нациям и типам для отображения
 */
export function groupVehiclesByNation(vehicles: Vehicle[]): Record<string, Vehicle[]> {
  const grouped: Record<string, Vehicle[]> = {};
  
  vehicles.forEach(vehicle => {
    const key = `${vehicle.nation}_${vehicle.type}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(vehicle);
  });
  
  return grouped;
}

/**
 * Ищет твинки с техникой в указанном диапазоне БР
 * @param targetBR Целевой БР (например, 8.0)
 * @returns Массив объектов с твинком и подходящей техникой
 */
export function findTwinksByBRRange(targetBR: number): Array<{
  twink: TwinkData;
  matchingVehicles: Vehicle[];
}> {
  const twinks = getAllTwinks();
  const minBR = targetBR - 1.0;
  const maxBR = targetBR;
  const results: Array<{
    twink: TwinkData;
    matchingVehicles: Vehicle[];
  }> = [];
  
  twinks.forEach(twink => {
    const matchingVehicles = twink.vehicles.filter((vehicle: Vehicle) => {
      return vehicle.br >= minBR && vehicle.br <= maxBR;
    });
    
    if (matchingVehicles.length > 0) {
      results.push({
        twink,
        matchingVehicles
      });
    }
  });
  
  return results;
}

