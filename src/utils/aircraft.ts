<<<<<<< HEAD
import { loadJson, saveJson } from "./json.js";
import { info, error } from "./logger.js";
=======
import { loadJson, saveJson } from "./json";
import { info, error } from "./logger";
import { getDataFilePath } from "./paths";
>>>>>>> feature/absence-thread-integration

// Типы самолётов
export type AircraftType = 'piston' | 'early_jet' | 'modern_jet';

// Интерфейс самолёта
export interface Aircraft {
  name: string;
  type: AircraftType;
<<<<<<< HEAD
  br: string;
  nation: string;
=======
>>>>>>> feature/absence-thread-integration
}

// Структура данных для хранения списков самолётов
interface AircraftData {
  piston: Aircraft[];
  early_jet: Aircraft[];
  modern_jet: Aircraft[];
}

// Путь к файлу с данными самолётов
<<<<<<< HEAD
const AIRCRAFT_DATA_FILE = "data/aircraft.json";
=======
const AIRCRAFT_DATA_FILE = getDataFilePath("aircraft.json");
>>>>>>> feature/absence-thread-integration

// Функция для загрузки данных о самолётах
export function loadAircraftData(): AircraftData {
  try {
    const data = loadJson<AircraftData>(AIRCRAFT_DATA_FILE);
    return data || getDefaultAircraftData();
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при загрузке данных о самолётах:`, err);
    return getDefaultAircraftData();
  }
}

// Функция для сохранения данных о самолётах
export function saveAircraftData(data: AircraftData): void {
  try {
    saveJson(AIRCRAFT_DATA_FILE, data);
    info(`[AIRCRAFT] Данные о самолётах успешно сохранены`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при сохранении данных о самолётах:`, err);
    throw err;
  }
}

// Функция для получения списка самолётов по типу
export function getAircraftByType(type: AircraftType): Aircraft[] {
  try {
    const data = loadAircraftData();
    return data[type] || [];
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при получении самолётов типа ${type}:`, err);
    return [];
  }
}

// Функция для получения всех самолётов
export function getAllAircraft(): AircraftData {
  return loadAircraftData();
}

// Функция для добавления самолёта
export function addAircraft(aircraft: Aircraft): void {
  try {
    const data = loadAircraftData();
    
    // Проверяем, не существует ли уже самолёт с таким названием
    const existingAircraft = data[aircraft.type].find(a => a.name === aircraft.name);
    if (existingAircraft) {
      throw new Error(`Самолёт "${aircraft.name}" уже существует в категории ${aircraft.type}`);
    }
    
    data[aircraft.type].push(aircraft);
    saveAircraftData(data);
    info(`[AIRCRAFT] Самолёт "${aircraft.name}" успешно добавлен в категорию ${aircraft.type}`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при добавлении самолёта:`, err);
    throw err;
  }
}

// Функция для удаления самолёта
export function removeAircraft(type: AircraftType, aircraftName: string): void {
  try {
    const data = loadAircraftData();
    const initialLength = data[type].length;
    
    data[type] = data[type].filter(a => a.name !== aircraftName);
    
    if (data[type].length === initialLength) {
      throw new Error(`Самолёт "${aircraftName}" не найден в категории ${type}`);
    }
    
    saveAircraftData(data);
    info(`[AIRCRAFT] Самолёт "${aircraftName}" успешно удалён из категории ${type}`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при удалении самолёта:`, err);
    throw err;
  }
}

// Функция для обновления самолёта
export function updateAircraft(aircraft: Aircraft): void {
  try {
    const data = loadAircraftData();
    const index = data[aircraft.type].findIndex(a => a.name === aircraft.name);
    
    if (index === -1) {
      throw new Error(`Самолёт "${aircraft.name}" не найден в категории ${aircraft.type}`);
    }
    
    data[aircraft.type][index] = aircraft;
    saveAircraftData(data);
    info(`[AIRCRAFT] Самолёт "${aircraft.name}" успешно обновлён в категории ${aircraft.type}`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обновлении самолёта:`, err);
    throw err;
  }
}

// Функция для получения самолёта по названию
export function getAircraftByName(type: AircraftType, aircraftName: string): Aircraft | null {
  try {
    const data = loadAircraftData();
    return data[type].find(a => a.name === aircraftName) || null;
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при поиске самолёта "${aircraftName}":`, err);
    return null;
  }
}

// Функция для создания опций для селектора Discord
export function createAircraftOptions(aircraft: Aircraft[]): Array<{ label: string; value: string; description?: string }> {
  return aircraft.map(a => ({
    label: a.name,
    value: a.name,
<<<<<<< HEAD
    description: `${a.nation} | БР ${a.br}`
=======
    description: `Тип: ${getAircraftTypeName(a.type)}`
>>>>>>> feature/absence-thread-integration
  }));
}

// Функция для получения названия типа самолёта на русском
export function getAircraftTypeName(type: AircraftType): string {
  switch (type) {
    case 'piston': return 'Поршневая авиация';
    case 'early_jet': return 'Ранние реактивы';
    case 'modern_jet': return 'Современные реактивы';
    default: return 'Неизвестный тип';
  }
}

// Функция для получения сокращения типа самолёта
export function getAircraftTypeShort(type: AircraftType): string {
  switch (type) {
    case 'piston': return 'Поршневой';
    case 'early_jet': return 'Ранний реактив';
    case 'modern_jet': return 'Современный реактив';
    default: return 'Неизвестный';
  }
}

// Функция для получения типа самолёта по ID лицензии
export function getAircraftTypeByLicenseId(licenseId: string): AircraftType {
  switch (licenseId) {
    case 'piston': return 'piston';
    case 'early_jet': return 'early_jet';
    case 'modern_jet': return 'modern_jet';
    default: return 'piston';
  }
}

// Функция для получения типа самолёта по ID навыка
export function getAircraftTypeBySkillId(skillId: string): AircraftType {
  // Для навыков используем все типы самолётов
  return 'piston'; // По умолчанию, но можно изменить логику
}

// Данные по умолчанию
function getDefaultAircraftData(): AircraftData {
  return {
    piston: [
      {
        name: "Bf 109 F-4",
<<<<<<< HEAD
        type: "piston",
        br: "4.3",
        nation: "Германия"
      },
      {
        name: "Spitfire Mk.Vb",
        type: "piston",
        br: "4.7",
        nation: "Великобритания"
      },
      {
        name: "P-51D-30",
        type: "piston",
        br: "5.0",
        nation: "США"
=======
        type: "piston"
      },
      {
        name: "Spitfire Mk.Vb",
        type: "piston"
      },
      {
        name: "P-51D-30",
        type: "piston"
>>>>>>> feature/absence-thread-integration
      }
    ],
    early_jet: [
      {
        name: "Me 262 A-1",
<<<<<<< HEAD
        type: "early_jet",
        br: "7.7",
        nation: "Германия"
      },
      {
        name: "MiG-15",
        type: "early_jet",
        br: "8.7",
        nation: "СССР"
      },
      {
        name: "F-86F-2",
        type: "early_jet",
        br: "8.7",
        nation: "США"
=======
        type: "early_jet"
      },
      {
        name: "MiG-15",
        type: "early_jet"
      },
      {
        name: "F-86F-2",
        type: "early_jet"
>>>>>>> feature/absence-thread-integration
      }
    ],
    modern_jet: [
      {
        name: "MiG-21bis",
<<<<<<< HEAD
        type: "modern_jet",
        br: "10.3",
        nation: "СССР"
      },
      {
        name: "F-4E Phantom II",
        type: "modern_jet",
        br: "11.0",
        nation: "США"
      },
      {
        name: "Su-27",
        type: "modern_jet",
        br: "12.0",
        nation: "СССР"
=======
        type: "modern_jet"
      },
      {
        name: "F-4E Phantom II",
        type: "modern_jet"
      },
      {
        name: "Su-27",
        type: "modern_jet"
>>>>>>> feature/absence-thread-integration
      }
    ]
  };
}
