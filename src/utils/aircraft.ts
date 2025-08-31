import { readFile, writeFile } from "./json.js";
import { info, error } from "./logger.js";

// Типы самолётов
export type AircraftType = 'piston' | 'early_jet' | 'modern_jet';

// Интерфейс самолёта
export interface Aircraft {
  id: string;
  name: string;
  type: AircraftType;
  br: string;
  nation: string;
  description?: string;
}

// Структура данных для хранения списков самолётов
interface AircraftData {
  piston: Aircraft[];
  early_jet: Aircraft[];
  modern_jet: Aircraft[];
}

// Путь к файлу с данными самолётов
const AIRCRAFT_DATA_FILE = "data/aircraft.json";

// Функция для загрузки данных о самолётах
export async function loadAircraftData(): Promise<AircraftData> {
  try {
    const data = await readFile<AircraftData>(AIRCRAFT_DATA_FILE);
    return data || getDefaultAircraftData();
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при загрузке данных о самолётах:`, err);
    return getDefaultAircraftData();
  }
}

// Функция для сохранения данных о самолётах
export async function saveAircraftData(data: AircraftData): Promise<void> {
  try {
    await writeFile(AIRCRAFT_DATA_FILE, data);
    info(`[AIRCRAFT] Данные о самолётах успешно сохранены`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при сохранении данных о самолётах:`, err);
    throw err;
  }
}

// Функция для получения списка самолётов по типу
export async function getAircraftByType(type: AircraftType): Promise<Aircraft[]> {
  try {
    const data = await loadAircraftData();
    return data[type] || [];
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при получении самолётов типа ${type}:`, err);
    return [];
  }
}

// Функция для получения всех самолётов
export async function getAllAircraft(): Promise<AircraftData> {
  return await loadAircraftData();
}

// Функция для добавления самолёта
export async function addAircraft(aircraft: Aircraft): Promise<void> {
  try {
    const data = await loadAircraftData();
    
    // Проверяем, не существует ли уже самолёт с таким ID
    const existingAircraft = data[aircraft.type].find(a => a.id === aircraft.id);
    if (existingAircraft) {
      throw new Error(`Самолёт с ID "${aircraft.id}" уже существует в категории ${aircraft.type}`);
    }
    
    data[aircraft.type].push(aircraft);
    await saveAircraftData(data);
    info(`[AIRCRAFT] Самолёт "${aircraft.name}" успешно добавлен в категорию ${aircraft.type}`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при добавлении самолёта:`, err);
    throw err;
  }
}

// Функция для удаления самолёта
export async function removeAircraft(type: AircraftType, aircraftId: string): Promise<void> {
  try {
    const data = await loadAircraftData();
    const initialLength = data[type].length;
    
    data[type] = data[type].filter(a => a.id !== aircraftId);
    
    if (data[type].length === initialLength) {
      throw new Error(`Самолёт с ID "${aircraftId}" не найден в категории ${type}`);
    }
    
    await saveAircraftData(data);
    info(`[AIRCRAFT] Самолёт с ID "${aircraftId}" успешно удалён из категории ${type}`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при удалении самолёта:`, err);
    throw err;
  }
}

// Функция для обновления самолёта
export async function updateAircraft(aircraft: Aircraft): Promise<void> {
  try {
    const data = await loadAircraftData();
    const index = data[aircraft.type].findIndex(a => a.id === aircraft.id);
    
    if (index === -1) {
      throw new Error(`Самолёт с ID "${aircraft.id}" не найден в категории ${aircraft.type}`);
    }
    
    data[aircraft.type][index] = aircraft;
    await saveAircraftData(data);
    info(`[AIRCRAFT] Самолёт "${aircraft.name}" успешно обновлён в категории ${aircraft.type}`);
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при обновлении самолёта:`, err);
    throw err;
  }
}

// Функция для получения самолёта по ID
export async function getAircraftById(type: AircraftType, aircraftId: string): Promise<Aircraft | null> {
  try {
    const data = await loadAircraftData();
    return data[type].find(a => a.id === aircraftId) || null;
  } catch (err) {
    error(`[AIRCRAFT] Ошибка при поиске самолёта с ID "${aircraftId}":`, err);
    return null;
  }
}

// Функция для создания опций для селектора Discord
export function createAircraftOptions(aircraft: Aircraft[]): Array<{ label: string; value: string; description?: string }> {
  return aircraft.map(a => ({
    label: a.name,
    value: a.id,
    description: `${a.nation} | БР ${a.br}${a.description ? ` | ${a.description}` : ''}`
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
        id: "bf109_f4",
        name: "Bf 109 F-4",
        type: "piston",
        br: "4.3",
        nation: "Германия",
        description: "Отличный истребитель для дуэлей"
      },
      {
        id: "spitfire_mk5b",
        name: "Spitfire Mk.Vb",
        type: "piston",
        br: "4.7",
        nation: "Великобритания",
        description: "Манёвренный истребитель"
      },
      {
        id: "p51d30",
        name: "P-51D-30",
        type: "piston",
        br: "5.0",
        nation: "США",
        description: "Универсальный истребитель"
      }
    ],
    early_jet: [
      {
        id: "me262_a1",
        name: "Me 262 A-1",
        type: "early_jet",
        br: "7.7",
        nation: "Германия",
        description: "Первый реактивный истребитель"
      },
      {
        id: "mig15",
        name: "MiG-15",
        type: "early_jet",
        br: "8.7",
        nation: "СССР",
        description: "Отличный реактивный истребитель"
      },
      {
        id: "f86f2",
        name: "F-86F-2",
        type: "early_jet",
        br: "8.7",
        nation: "США",
        description: "Американский реактивный истребитель"
      }
    ],
    modern_jet: [
      {
        id: "mig21bis",
        name: "MiG-21bis",
        type: "modern_jet",
        br: "10.3",
        nation: "СССР",
        description: "Современный реактивный истребитель"
      },
      {
        id: "f4e",
        name: "F-4E Phantom II",
        type: "modern_jet",
        br: "11.0",
        nation: "США",
        description: "Многоцелевой истребитель"
      },
      {
        id: "su27",
        name: "Su-27",
        type: "modern_jet",
        br: "12.0",
        nation: "СССР",
        description: "Современный тяжёлый истребитель"
      }
    ]
  };
}
