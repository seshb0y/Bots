import { TestResult } from './testRunner';
import * as fs from 'fs';
import * as path from 'path';

async function testCommandImports(): Promise<TestResult> {
  const start = Date.now();
  const name = "Импорты команд";
  
  try {
    // В скомпилированном коде ищем .js файлы
    const commandsPath = path.join(__dirname, '..', '..', 'dist', 'commands');
    const sourceCommandsPath = path.join(__dirname, '..', 'commands');
    
    // Проверяем наличие файлов команд (сначала в исходниках)
    const requiredCommandFiles = [
      'index.ts',
      'help.ts', 
      'points.ts',
      'addtracer.ts',
      'removetracer.ts',
      'listtraced.ts',
      'syncclan.ts',
      'teststats.ts',
      'pbnotify.ts',
      'resources.ts',
      'lichstat.ts'
    ];
    
    for (const file of requiredCommandFiles) {
      const sourceFilePath = path.join(sourceCommandsPath, file);
      if (!fs.existsSync(sourceFilePath)) {
        return {
          name,
          success: false,
          error: `Файл команды не найден: ${file}`,
          duration: Date.now() - start
        };
      }
    }
    
    // Пробуем импортировать основной файл команд
    const commandsIndex = require('../commands/index');
    
    const expectedExports = [
      'helpCommand',
      'pointsCommand',
      'addtracerCommand',
      'removetracerCommand',
      'listtracedCommand',
      'syncclanCommand',
      'teststatsCommand',
      'lichstatCommand',
      'setupCommands'
    ];
    
    for (const exportName of expectedExports) {
      if (typeof commandsIndex[exportName] !== 'function') {
        return {
          name,
          success: false,
          error: `Функция ${exportName} не экспортирована или не является функцией`,
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
      error: `Ошибка при импорте команд: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testHelpCommand(): Promise<TestResult> {
  const start = Date.now();
  const name = "Команда help";
  
  try {
    const { helpCommand } = require('../commands/help');
    
    if (typeof helpCommand !== 'function') {
      return {
        name,
        success: false,
        error: "helpCommand не является функцией",
        duration: Date.now() - start
      };
    }
    
    // Создаем простой мок объект interaction для тестирования
    let replyWasCalled = false;
    const mockInteraction = {
      reply: async (content: any) => {
        replyWasCalled = true;
        return Promise.resolve();
      },
      options: {
        getString: (name: string) => null
      },
      user: {
        id: 'test-user-id',
        tag: 'TestUser#1234'
      }
    };
    
    // Тестируем выполнение команды (не должно выбрасывать ошибку)
    await helpCommand(mockInteraction as any);
    
    // Проверяем, что reply был вызван
    if (!replyWasCalled) {
      return {
        name,
        success: false,
        error: "helpCommand не вызвал interaction.reply",
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
      error: `Ошибка в команде help: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testPointsCommand(): Promise<TestResult> {
  const start = Date.now();
  const name = "Команда points";
  
  try {
    const { pointsCommand } = require('../commands/points');
    
    if (typeof pointsCommand !== 'function') {
      return {
        name,
        success: false,
        error: "pointsCommand не является функцией",
        duration: Date.now() - start
      };
    }
    
    // Создаем тестовые данные пользователей
    const testUsersPath = path.join(__dirname, '..', '..', 'src', 'data', 'users.json');
    const testUsers = {
      'test-user-id': {
        nick: 'TestUser',
        points: 500,
        joinDate: '2024-01-01',
        wasWarned: false
      }
    };
    
    const { saveJson } = require('../utils/json');
    saveJson(testUsersPath, testUsers);
    
    let replyWasCalled = false;
    let replyContent = '';
    const mockInteraction = {
      reply: async (content: any) => {
        replyWasCalled = true;
        replyContent = typeof content === 'string' ? content : JSON.stringify(content);
        return Promise.resolve();
      },
      user: {
        id: 'test-user-id',
        tag: 'TestUser#1234'
      }
    };
    
    await pointsCommand(mockInteraction as any);
    
    if (!replyWasCalled) {
      return {
        name,
        success: false,
        error: "pointsCommand не вызвал interaction.reply",
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что ответ содержит информацию об очках
    // Если пользователь не найден в файле, должен вернуться 0
    if (!replyContent.includes('полковых очков')) {
      return {
        name,
        success: false,
        error: `Ответ не содержит текст "полковых очков". Получен ответ: "${replyContent}"`,
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что возвращается число (0 или 500)
    const hasNumber = /\d+/.test(replyContent);
    if (!hasNumber) {
      return {
        name,
        success: false,
        error: `Ответ не содержит число очков. Получен ответ: "${replyContent}"`,
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
      error: `Ошибка в команде points: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testAddTracerCommand(): Promise<TestResult> {
  const start = Date.now();
  const name = "Команда addtracer";
  
  try {
    // Проверяем, что функция существует и является функцией
    const { addtracerCommand } = require('../commands/addtracer');
    
    if (typeof addtracerCommand !== 'function') {
      return {
        name,
        success: false,
        error: "addtracerCommand не является функцией",
        duration: Date.now() - start
      };
    }
    
    // Создаем пустой файл отслеживания в правильном месте
    const constants = require('../constants');
    const realTrackedPath = constants.trackedPath;
    const { saveJson, loadJson } = require('../utils/json');
    
    // Сохраняем оригинальное содержимое файла (если есть)
    let originalTracked: any = {};
    try {
      originalTracked = loadJson(realTrackedPath);
    } catch (e) {
      // Файл не существует, это нормально
    }
    
    // Создаем пустой файл для теста
    saveJson(realTrackedPath, {});
    
    let replyWasCalled = false;
    let replyContent = '';
    const mockInteraction = {
      reply: async (content: any) => {
        replyWasCalled = true;
        replyContent = typeof content === 'string' ? content : JSON.stringify(content);
        return Promise.resolve();
      },
      options: {
        getString: (name: string, required?: boolean) => {
          if (name === 'nickname') return 'TestPlayer';
          return null;
        }
      },
      user: {
        id: 'test-user-id',
        tag: 'TestUser#1234'
      }
    };
    
    try {
      await addtracerCommand(mockInteraction as any);
      
      if (!replyWasCalled) {
        return {
          name,
          success: false,
          error: "addtracerCommand не вызвал interaction.reply",
          duration: Date.now() - start
        };
      }
      
      // Проверяем, что игрок был добавлен в отслеживание
      const tracked = loadJson(realTrackedPath) as any;
      
      if (!tracked['TestPlayer']) {
        return {
          name,
          success: false,
          error: `Игрок не был добавлен в отслеживание. Содержимое файла: ${JSON.stringify(tracked)}`,
          duration: Date.now() - start
        };
      }
      
      // Проверяем структуру данных отслеживания
      const playerData = tracked['TestPlayer'];
      if (!playerData.trackedSince || !playerData.assignedBy) {
        return {
          name,
          success: false,
          error: `Неверная структура данных отслеживания: ${JSON.stringify(playerData)}`,
          duration: Date.now() - start
        };
      }
      
      // Проверяем текст ответа
      if (!replyContent.includes('TestPlayer') || !replyContent.includes('отслеживание')) {
        return {
          name,
          success: false,
          error: `Неверный текст ответа: "${replyContent}"`,
          duration: Date.now() - start
        };
      }
      
      return {
        name,
        success: true,
        duration: Date.now() - start
      };
      
    } finally {
      // Восстанавливаем оригинальное содержимое файла
      saveJson(realTrackedPath, originalTracked);
    }
    
  } catch (error) {
    return {
      name,
      success: false,
      error: `Ошибка в команде addtracer: ${error}`,
      duration: Date.now() - start
    };
  }
}

async function testCommandRegistration(): Promise<TestResult> {
  const start = Date.now();
  const name = "Регистрация команд";
  
  try {
    const registerCommandsPath = path.join(__dirname, '..', '..', 'src', 'register-commands.ts');
    
    if (!fs.existsSync(registerCommandsPath)) {
      return {
        name,
        success: false,
        error: "Файл register-commands.ts не найден",
        duration: Date.now() - start
      };
    }
    
    // Проверяем, что файл содержит основные команды
    const fileContent = fs.readFileSync(registerCommandsPath, 'utf-8');
    
    const expectedCommands = [
      'help',
      'points',
      'addtracer',
      'removetracer',
      'listtraced',
      'syncclan',
      'teststats',
      'lichstat',
      'pbnotify',
      'resources'
    ];
    
    for (const command of expectedCommands) {
      if (!fileContent.includes(`"${command}"`)) {
        return {
          name,
          success: false,
          error: `Команда ${command} не найдена в файле регистрации`,
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
      error: `Ошибка в регистрации команд: ${error}`,
      duration: Date.now() - start
    };
  }
}

// Простые моки больше не нужны, используем встроенные функции

export const commandsTests = [
  testCommandImports,
  testHelpCommand,
  testPointsCommand,
  testAddTracerCommand,
  testCommandRegistration
]; 