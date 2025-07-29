import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

const membersAPath = path.join(__dirname, "..", "data", "members_a.json");
const membersBPath = path.join(__dirname, "..", "data", "members_b.json");
const statePath = path.join(__dirname, "..", "data", "members_state.json");
const leaversTrackingPath = path.join(__dirname, "..", "data", "leavers_tracking.json");

export async function fetchClanPoints(
  clanTag: string
): Promise<{ nick: string; points: number }[]> {
  const url = `https://warthunder.com/ru/community/claninfo/${encodeURIComponent(
    clanTag
  )}`;
  console.log(`🌐 Загружаем страницу клана: ${clanTag}`);
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36",
    },
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

  return members;
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
