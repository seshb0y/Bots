import * as fs from "fs";
import * as path from "path";
import { getDataFilePath } from "./paths";

interface StatsCollectionRecord {
  date: string; // YYYY-MM-DD
  time: string; // "16:50" или "01:20"
  timestamp: number; // Unix timestamp
  type: "sync" | "stats"; // sync для 16:50, stats для 01:20
}

interface StatsTrackingData {
  collections: StatsCollectionRecord[];
}

const statsTrackingPath = getDataFilePath("stats_tracking.json");

function loadStatsTracking(): StatsTrackingData {
  if (!fs.existsSync(statsTrackingPath)) {
    return { collections: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(statsTrackingPath, "utf-8"));
  } catch {
    return { collections: [] };
  }
}

function saveStatsTracking(data: StatsTrackingData) {
  fs.writeFileSync(statsTrackingPath, JSON.stringify(data, null, 2));
}

export function markStatsCollectionCompleted(time: "16:50" | "01:20", type: "sync" | "stats") {
  const data = loadStatsTracking();
  const today = new Date().toISOString().slice(0, 10);
  
  // Удаляем старые записи (старше 7 дней)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  data.collections = data.collections.filter(record => {
    const recordDate = new Date(record.timestamp);
    return recordDate > weekAgo;
  });
  
  // Добавляем новую запись
  const record: StatsCollectionRecord = {
    date: today,
    time,
    timestamp: Date.now(),
    type
  };
  
  data.collections.push(record);
  saveStatsTracking(data);
}

export function wasStatsCollectionCompleted(date: string, time: "16:50" | "01:20", type: "sync" | "stats"): boolean {
  const data = loadStatsTracking();
  return data.collections.some(record => 
    record.date === date && 
    record.time === time && 
    record.type === type
  );
}

export function getLastCollectionTime(type: "sync" | "stats"): StatsCollectionRecord | null {
  const data = loadStatsTracking();
  const filtered = data.collections
    .filter(record => record.type === type)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  return filtered.length > 0 ? filtered[0] : null;
}

export function clearOldRecords() {
  const data = loadStatsTracking();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  data.collections = data.collections.filter(record => {
    const recordDate = new Date(record.timestamp);
    return recordDate > weekAgo;
  });
  
  saveStatsTracking(data);
}
