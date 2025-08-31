import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { info, error } from './logger';

// Путь к файлу с данными самолётов
const AIRCRAFT_DATA_PATH = join(__dirname, '..', '..', 'data', 'aircraft.json');

// Типы для самолётов
export interface Aircraft {
  id: string;
  name: string;
  br: number;
  nation: string;
  type: string;
}

export interface AircraftData {
  piston: Aircraft[];
  early_jet: Aircraft[];
  modern_jet: Aircraft[];
}

// Загрузка данных самолётов
export function loadAircraftData(): AircraftData {
  try {
    const data = readFileSync(AIRCRAFT_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    error('[AIRCRAFT] Ошибка при загрузке данных самолётов:', err);
    // Возвращаем пустые списки если файл не найден
    return {
      piston: [],
      early_jet: [],
      modern_jet: []
    };
  }
}

// Сохранение данных самолётов
export function saveAircraftData(data: AircraftData): boolean {
  try {
    writeFileSync(AIRCRAFT_DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    info('[AIRCRAFT] Данные самолётов успешно сохранены');
    return true;
  } catch (err) {
    error('[AIRCRAFT] Ошибка при сохранении данных самолётов:', err);
    return false;
  }
}

// Получение списка самолётов по типу
export function getAircraftByType(type: 'piston' | 'early_jet' | 'modern_jet'): Aircraft[] {
  const data = loadAircraftData();
  return data[type] || [];
}

// Получение самолёта по ID
export function getAircraftById(id: string): Aircraft | null {
  const data = loadAircraftData();
  
  for (const type of Object.values(data)) {
    const aircraft = type.find((a: Aircraft) => a.id === id);
    if (aircraft) return aircraft;
  }
  
  return null;
}

// Добавление самолёта
export function addAircraft(type: 'piston' | 'early_jet' | 'modern_jet', aircraft: Aircraft): boolean {
  try {
    const data = loadAircraftData();
    
    // Проверяем, не существует ли уже самолёт с таким ID
    if (getAircraftById(aircraft.id)) {
      error(`[AIRCRAFT] Самолёт с ID ${aircraft.id} уже существует`);
      return false;
    }
    
    data[type].push(aircraft);
    return saveAircraftData(data);
  } catch (err) {
    error('[AIRCRAFT] Ошибка при добавлении самолёта:', err);
    return false;
  }
}

// Удаление самолёта
export function removeAircraft(id: string): boolean {
  try {
    const data = loadAircraftData();
    
    for (const type of Object.keys(data) as Array<keyof AircraftData>) {
      const index = data[type].findIndex(a => a.id === id);
      if (index !== -1) {
        data[type].splice(index, 1);
        info(`[AIRCRAFT] Самолёт ${id} удалён из категории ${type}`);
        return saveAircraftData(data);
      }
    }
    
    error(`[AIRCRAFT] Самолёт с ID ${id} не найден`);
    return false;
  } catch (err) {
    error('[AIRCRAFT] Ошибка при удалении самолёта:', err);
    return false;
  }
}

// Обновление самолёта
export function updateAircraft(id: string, updates: Partial<Aircraft>): boolean {
  try {
    const data = loadAircraftData();
    
    for (const type of Object.keys(data) as Array<keyof AircraftData>) {
      const index = data[type].findIndex(a => a.id === id);
      if (index !== -1) {
        data[type][index] = { ...data[type][index], ...updates };
        info(`[AIRCRAFT] Самолёт ${id} обновлён в категории ${type}`);
        return saveAircraftData(data);
      }
    }
    
    error(`[AIRCRAFT] Самолёт с ID ${id} не найден`);
    return false;
  } catch (err) {
    error('[AIRCRAFT] Ошибка при обновлении самолёта:', err);
    return false;
  }
}

// Получение всех самолётов
export function getAllAircraft(): AircraftData {
  return loadAircraftData();
}

// Создание опций для селектора Discord
export function createAircraftOptions(type: 'piston' | 'early_jet' | 'modern_jet'): Array<{ label: string; value: string; description?: string }> {
  const aircraft = getAircraftByType(type);
  
  return aircraft.map(a => ({
    label: a.name,
    value: a.id,
    description: `${a.nation} | БР ${a.br} | ${a.type}`
  }));
}
