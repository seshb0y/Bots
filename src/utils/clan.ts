import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

const membersAPath = path.join(__dirname, "..", "data", "members_a.json");
const membersBPath = path.join(__dirname, "..", "data", "members_b.json");
const statePath = path.join(__dirname, "..", "data", "members_state.json");
const leaversTrackingPath = path.join(__dirname, "..", "data", "leavers_tracking.json");

export async function fetchClanPoints(
  clanTag: string,
  retryCount: number = 0
): Promise<{ nick: string; points: number }[]> {
  const maxRetries = 3;
  const url = `https://warthunder.com/ru/community/claninfo/${encodeURIComponent(
    clanTag
  )}`;
  
  try {
    console.log(`🌐 Загружаем страницу клана: ${clanTag}${retryCount > 0 ? ` (попытка ${retryCount + 1})` : ''}`);
    
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
    const items = $(".squadrons-members__grid-item");

    for (let i = 0; i < items.length; i += 6) {
      const nick = $(items[i + 1])
        .text()
        .trim();
      const pointsText = $(items[i + 2])
        .text()
        .trim()
        .replace(/\s/g, "");
      const points = parseInt(pointsText, 10);

      if (nick && !isNaN(points)) {
        members.push({ nick, points });
      }
    }

    console.log(`✅ Успешно получено ${members.length} участников клана`);
    return members;
    
  } catch (error: any) {
    console.error(`❌ Ошибка при загрузке клана ${clanTag}:`, error.message);
    
    // Если это ошибка 403 и есть еще попытки, пробуем снова
    if (error.response?.status === 403 && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // Экспоненциальная задержка: 1с, 2с, 4с
      console.log(`⏳ Повторная попытка через ${delay}мс...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchClanPoints(clanTag, retryCount + 1);
    }
    
    // Если все попытки исчерпаны или другая ошибка, выбрасываем исключение
    throw new Error(`Не удалось загрузить данные клана ${clanTag} после ${retryCount + 1} попыток: ${error.message}`);
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
  return nick.toLowerCase().replace(/\s+/g, "").trim();
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
const membersCurrentPath = path.join(__dirname, "..", "data", "members_current.json");

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
