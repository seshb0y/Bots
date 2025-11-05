import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { getDataFilePath } from "./paths";

const membersAPath = getDataFilePath("members_a.json");
const membersBPath = getDataFilePath("members_b.json");
const statePath = getDataFilePath("members_state.json");
const leaversTrackingPath = getDataFilePath("leavers_tracking.json");

export async function fetchClanPoints(
  clanTag: string,
  retryCount: number = 0
): Promise<{ nick: string; points: number }[]> {
  const maxRetries = 3;
  
  try {
    console.log(`🌐 Загружаем участников клана ${clanTag}${retryCount > 0 ? ` (попытка ${retryCount + 1})` : ''}`);
    
    // Правильный URL для получения информации о клане
    const url = `https://warthunder.com/ru/community/claninfo/${clanTag}`;
    
    // Более реалистичные браузерные заголовки
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"'
      },
      timeout: 30000, // 30 секунд таймаут
      maxRedirects: 5
    });
    
    console.log(`📄 Длина HTML: ${html.length}`);

    const $ = cheerio.load(html);
    const members: { nick: string; points: number }[] = [];
    
    // Получаем все ссылки на профили игроков
    const playerLinks = $('a[href*="/community/userinfo/"]');
    
    playerLinks.each((index, element) => {
      const $link = $(element);
      let nick = $link.text().trim();
      
      // Декодируем HTML entities и нормализуем пробелы
      nick = nick.replace(/\s+/g, " ").trim();
      
      if (nick && nick.length > 1 && !nick.match(/^\d+$/)) {
        // Ищем очки для этого игрока
        // Очки находятся в следующей строке после никнейма
        const $parent = $link.parent();
        const $row = $parent.parent();
        const $cells = $row.find('td');
        
        if ($cells.length >= 3) {
          // Третий столбец содержит очки
          const pointsText = $cells.eq(2).text().trim();
          const points = parseInt(pointsText, 10);
          
          if (!isNaN(points)) {
            members.push({ nick, points });
          }
        }
      }
    });
    
    // Если не удалось получить данные через таблицу, используем текстовый парсинг
    if (members.length === 0) {
      console.log(`🔍 Альтернативный поиск участников...`);
      
      const allText = $.text();
      const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Ищем паттерн: дата, номер, никнейм, очки, активность
      for (let i = 0; i < lines.length - 4; i++) {
        const dateLine = lines[i];
        const numberLine = lines[i + 1];
        const nickLine = lines[i + 2];
        const pointsLine = lines[i + 3];
        const activityLine = lines[i + 4];
        
        // Проверяем, что это правильный паттерн
        if (dateLine.match(/^\d{2}\.\d{2}\.\d{4}$/) && // дата
            numberLine.match(/^\d+$/) && // номер
            nickLine.length > 0 && nickLine.length < 50 && // никнейм (любые символы, включая русские)
            pointsLine.match(/^\d+$/) && // очки
            activityLine.match(/^\d+$/)) { // активность
          
          const nick = nickLine;
          const points = parseInt(pointsLine, 10);
          
          if (points >= 0 && points < 10000) {
            members.push({ nick, points });
          }
        }
      }
    }
    
    // Удаляем дубликаты
    const uniqueMembers = members.filter((member, index, self) => 
      index === self.findIndex(m => m.nick === member.nick)
    );
    
    console.log(`✅ Получено ${uniqueMembers.length} уникальных участников клана ${clanTag}`);
    
    // Сортируем по очкам (убывание)
    uniqueMembers.sort((a, b) => b.points - a.points);
    
    return uniqueMembers;
    
  } catch (error: any) {
    console.error(`❌ Ошибка при загрузке участников клана ${clanTag}:`, error.message);
    
    // Если это ошибка 403 и есть еще попытки, пробуем снова
    if (error.response?.status === 403 && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // Экспоненциальная задержка: 1с, 2с, 4с
      console.log(`⏳ Повторная попытка через ${delay}мс...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchClanPoints(clanTag, retryCount + 1);
    }
    
    // Если все попытки исчерпаны или другая ошибка, возвращаем пустой массив
    console.log(`❌ Не удалось загрузить участников клана ${clanTag} после ${retryCount + 1} попыток`);
    return [];
  }
}

function getActiveFile(): "a" | "b" {
  if (!fs.existsSync(statePath)) return "a";
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    return state.active === "b" ? "b" : "a";
  } catch {
    return "a";
  }
}

function setActiveFile(active: "a" | "b") {
  fs.writeFileSync(statePath, JSON.stringify({ active }, null, 2));
}

export function saveMembersAlternating(
  members: { nick: string; points: number }[]
) {
  const active = getActiveFile();
  if (active === "a") {
    fs.writeFileSync(membersAPath, JSON.stringify(members, null, 2));
    setActiveFile("b");
  } else {
    fs.writeFileSync(membersBPath, JSON.stringify(members, null, 2));
    setActiveFile("a");
  }
}

export function loadPrevAndCurrMembers(): [
  { nick: string; points: number }[],
  { nick: string; points: number }[]
] {
  const active = getActiveFile();
  let prev: { nick: string; points: number }[] = [];
  let curr: { nick: string; points: number }[] = [];
  try {
    if (active === "a") {
      prev = fs.existsSync(membersBPath)
        ? JSON.parse(fs.readFileSync(membersBPath, "utf-8"))
        : [];
      curr = fs.existsSync(membersAPath)
        ? JSON.parse(fs.readFileSync(membersAPath, "utf-8"))
        : [];
    } else {
      prev = fs.existsSync(membersAPath)
        ? JSON.parse(fs.readFileSync(membersAPath, "utf-8"))
        : [];
      curr = fs.existsSync(membersBPath)
        ? JSON.parse(fs.readFileSync(membersBPath, "utf-8"))
        : [];
    }
  } catch {
    prev = [];
    curr = [];
  }
  return [prev, curr];
}

// Сохраняет участников в файл по времени (например, members_1630.json)
export function saveMembersAtTime(
  members: { nick: string; points: number }[],
  timeLabel: string
) {
  const filePath = path.join(
    __dirname,
    "..",
    "data",
    `members_${timeLabel}.json`
  );
  fs.writeFileSync(filePath, JSON.stringify(members, null, 2));
}

// Загружает участников из файла по времени
export function loadMembersAtTime(
  timeLabel: string
): { nick: string; points: number }[] {
  const filePath = path.join(
    __dirname,
    "..",
    "data",
    `members_${timeLabel}.json`
  );
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function normalizeNick(nick: string) {
  // Нормализуем никнейм: приводим к нижнему регистру, убираем все виды пробелов и спецсимволов
  // Важно: toLowerCase() корректно работает с русскими символами в Unicode
  // Обрабатываем различные типы пробелов (обычные, неразрывные, табы и т.д.)
  if (!nick || typeof nick !== 'string') {
    return '';
  }
  
  return nick
    .toLowerCase()
    .normalize('NFKC') // Нормализуем Unicode (объединяем похожие символы)
    .replace(/[\s\u00A0\u2000-\u200B\u2028\u2029\uFEFF]+/g, "") // Убираем все виды пробелов
    .replace(/[\u200C\u200D\u034F\u180E]/g, "") // Убираем невидимые символы
    .replace(/[\u202A-\u202E\u2060-\u2064]/g, "") // Убираем directional formatting и word joiner
    .trim();
}

export function findLeavers(
  prev: { nick: string; points: number }[],
  curr: { nick: string; points: number }[]
): { nick: string; points: number }[] {
  const currNicks = new Set(curr.map((m) => normalizeNick(m.nick)));
  return prev.filter((m) => !currNicks.has(normalizeNick(m.nick)));
}

// Новые функции для отслеживания покинувших игроков
export function loadLeaversTracking(): { nick: string; points: number }[] {
  if (!fs.existsSync(leaversTrackingPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(leaversTrackingPath, "utf-8"));
  } catch {
    return [];
  }
}

export function saveLeaversTracking(members: { nick: string; points: number }[]) {
  fs.writeFileSync(leaversTrackingPath, JSON.stringify(members, null, 2));
}

export function findLeaversFromTracking(
  currentMembers: { nick: string; points: number }[]
): { nick: string; points: number }[] {
  const trackedMembers = loadLeaversTracking();
  const currNicks = new Set(currentMembers.map((m) => normalizeNick(m.nick)));
  return trackedMembers.filter((m) => !currNicks.has(normalizeNick(m.nick)));
}

// Новые функции для работы с одним файлом участников
const membersCurrentPath = getDataFilePath("members_current.json");

// Сохраняет текущих участников в основной файл
export function saveCurrentMembers(
  members: { nick: string; points: number }[]
) {
  fs.writeFileSync(membersCurrentPath, JSON.stringify(members, null, 2));
}

// Загружает текущих участников из основного файла
export function loadCurrentMembers(): { nick: string; points: number }[] {
  if (!fs.existsSync(membersCurrentPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(membersCurrentPath, "utf-8"));
  } catch {
    return [];
  }
}

// Сравнивает предыдущие и текущие данные участников
export function compareMembersData(
  prev: { nick: string; points: number }[],
  curr: { nick: string; points: number }[]
): { totalDelta: number; changes: { nick: string; delta: number }[] } {
  const prevMap = new Map(prev.map((p) => [normalizeNick(p.nick), p]));
  const currMap = new Map(curr.map((c) => [normalizeNick(c.nick), c]));
  
  let totalDelta = 0;
  const changes: { nick: string; delta: number }[] = [];
  
  for (const [nickNorm, currPlayer] of currMap.entries()) {
    const prevPlayer = prevMap.get(nickNorm);
    if (prevPlayer) {
      const delta = currPlayer.points - prevPlayer.points;
      if (delta !== 0) {
        changes.push({ nick: currPlayer.nick, delta });
        totalDelta += delta;
      }
    }
  }
  
  return { totalDelta, changes };
}
