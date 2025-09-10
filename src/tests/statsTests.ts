import { TestResult } from './testRunner';
import { loadMembersAtTime, saveMembersAtTime, loadCurrentMembers, saveCurrentMembers, compareMembersData } from '../utils/clan';
import * as fs from 'fs';
import * as path from 'path';

async function testStatsDataFiles(): Promise<TestResult> {
  const start = Date.now();
  const name = "Файлы данных статистики";
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Создаем тестовые данные
    const testMembers = [
      { nick: "TestPlayer1", points: 1000 },
      { nick: "TestPlayer2", points: 1500 },
      { nick: "TestPlayer3", points: 2000 }
    ];

    // Тестируем сохранение и загрузку данных по времени
    saveMembersAtTime(testMembers, "1650");
    saveMembersAtTime(testMembers, "0120");
    
    // Проверяем, что файлы созданы
    const file1650 = path.join(dataDir, 'members_1650.json');
    const file0120 = path.join(dataDir, 'members_0120.json');
    
    if (!fs.existsSync(file1650)) {
      return {
        name,
        success: false,
        error: "Файл members_1650.json не был создан",
        duration: Date.now() - start
      };
    }
    
    if (!fs.existsSync(file0120)) {
      return {
        name,
        success: false,
        error: "Файл members_0120.json не был создан",
        duration: Date.now() - start
      };
    }

    // Проверяем загрузку данных
    const loaded1650 = loadMembersAtTime("1650");
    const loaded0120 = loadMembersAtTime("0120");
    
    if (loaded1650.length !== testMembers.length) {
      return {
        name,
        success: false,
        error: `Неверное количество участников в 1650: ${loaded1650.length}, ожидалось ${testMembers.length}`,
        duration: Date.now() - start
      };
    }
    
    if (loaded0120.length !== testMembers.length) {
      return {
        name,
        success: false,
        error: `Неверное количество участников в 0120: ${loaded0120.length}, ожидалось ${testMembers.length}`,
        duration: Date.now() - start
      };
    }

    // Очистка тестовых файлов
    fs.unlinkSync(file1650);
    fs.unlinkSync(file0120);
    
    return {
      name,
      success: true,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка в тесте файлов данных статистики: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testStatsComparison(): Promise<TestResult> {
  const start = Date.now();
  const name = "Сравнение данных статистики";
  
  try {
    // Создаем тестовые данные для сравнения
    const prevMembers = [
      { nick: "Player1", points: 1000 },
      { nick: "Player2", points: 1500 },
      { nick: "Player3", points: 2000 }
    ];

    const currMembers = [
      { nick: "Player1", points: 1100 }, // +100
      { nick: "Player2", points: 1400 }, // -100
      { nick: "Player3", points: 2000 }, // без изменений
      { nick: "Player4", points: 500 }   // новый игрок
    ];

    // Тестируем сравнение данных
    const { totalDelta, changes } = compareMembersData(prevMembers, currMembers);
    
    // Проверяем общий дельта
    if (totalDelta !== 0) { // 100 - 100 + 0 + 500 = 500
      return {
        name,
        success: false,
        error: `Неверный общий дельта: ${totalDelta}, ожидалось 500`,
        duration: Date.now() - start
      };
    }

    // Проверяем количество изменений
    if (changes.length !== 2) { // Player1 и Player2
      return {
        name,
        success: false,
        error: `Неверное количество изменений: ${changes.length}, ожидалось 2`,
        duration: Date.now() - start
      };
    }

    // Проверяем конкретные изменения
    const player1Change = changes.find(c => c.nick === "Player1");
    const player2Change = changes.find(c => c.nick === "Player2");
    
    if (!player1Change || player1Change.delta !== 100) {
      return {
        name,
        success: false,
        error: `Неверное изменение для Player1: ${player1Change?.delta}, ожидалось 100`,
        duration: Date.now() - start
      };
    }
    
    if (!player2Change || player2Change.delta !== -100) {
      return {
        name,
        success: false,
        error: `Неверное изменение для Player2: ${player2Change?.delta}, ожидалось -100`,
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
      error: `Ошибка в тесте сравнения статистики: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testStatsDataConsistency(): Promise<TestResult> {
  const start = Date.now();
  const name = "Согласованность данных статистики";
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Создаем тестовые данные
    const testMembers = [
      { nick: "ConsistencyTest1", points: 1000 },
      { nick: "ConsistencyTest2", points: 1500 }
    ];

    // Сохраняем в разные файлы
    saveMembersAtTime(testMembers, "1650");
    saveCurrentMembers(testMembers);
    
    // Загружаем и сравниваем
    const members1650 = loadMembersAtTime("1650");
    const currentMembers = loadCurrentMembers();
    
    if (JSON.stringify(members1650) !== JSON.stringify(currentMembers)) {
      return {
        name,
        success: false,
        error: "Данные в members_1650.json и members_current.json не совпадают",
        duration: Date.now() - start
      };
    }

    // Проверяем, что данные корректно сохранились
    if (members1650.length !== testMembers.length) {
      return {
        name,
        success: false,
        error: `Неверное количество участников: ${members1650.length}, ожидалось ${testMembers.length}`,
        duration: Date.now() - start
      };
    }

    // Проверяем структуру данных
    for (const member of members1650) {
      if (!member.nick || typeof member.points !== 'number') {
        return {
          name,
          success: false,
          error: `Неверная структура данных участника: ${JSON.stringify(member)}`,
          duration: Date.now() - start
        };
      }
    }
    
    // Очистка
    const file1650 = path.join(dataDir, 'members_1650.json');
    if (fs.existsSync(file1650)) {
      fs.unlinkSync(file1650);
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
      error: `Ошибка в тесте согласованности данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testStatsEmptyDataHandling(): Promise<TestResult> {
  const start = Date.now();
  const name = "Обработка пустых данных статистики";
  
  try {
    // Тестируем загрузку несуществующих файлов
    const empty1650 = loadMembersAtTime("nonexistent");
    const empty0120 = loadMembersAtTime("nonexistent2");
    
    if (empty1650.length !== 0) {
      return {
        name,
        success: false,
        error: `Загрузка несуществующего файла должна возвращать пустой массив, получено: ${empty1650.length}`,
        duration: Date.now() - start
      };
    }
    
    if (empty0120.length !== 0) {
      return {
        name,
        success: false,
        error: `Загрузка несуществующего файла должна возвращать пустой массив, получено: ${empty0120.length}`,
        duration: Date.now() - start
      };
    }

    // Тестируем сравнение пустых данных
    const { totalDelta, changes } = compareMembersData([], []);
    
    if (totalDelta !== 0) {
      return {
        name,
        success: false,
        error: `Сравнение пустых данных должно давать дельта 0, получено: ${totalDelta}`,
        duration: Date.now() - start
      };
    }
    
    if (changes.length !== 0) {
      return {
        name,
        success: false,
        error: `Сравнение пустых данных должно давать 0 изменений, получено: ${changes.length}`,
        duration: Date.now() - start
      };
    }

    // Тестируем сравнение пустых и непустых данных
    const testMembers = [{ nick: "TestPlayer", points: 1000 }];
    const { totalDelta: delta2, changes: changes2 } = compareMembersData([], testMembers);
    
    if (delta2 !== 0) { // Новые игроки не должны влиять на дельта
      return {
        name,
        success: false,
        error: `Сравнение пустых и непустых данных должно давать дельта 0, получено: ${delta2}`,
        duration: Date.now() - start
      };
    }
    
    if (changes2.length !== 0) { // Новые игроки не должны показываться в изменениях
      return {
        name,
        success: false,
        error: `Сравнение пустых и непустых данных должно давать 0 изменений, получено: ${changes2.length}`,
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
      error: `Ошибка в тесте обработки пустых данных: ${error}`,
      duration: Date.now() - start
    };
  }
}

export const statsTests = [
  testStatsDataFiles,
  testStatsComparison,
  testStatsDataConsistency,
  testStatsEmptyDataHandling
];
