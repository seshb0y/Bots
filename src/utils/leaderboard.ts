import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import puppeteer from "puppeteer";

const leaderboardDataPath = path.join(__dirname, "..", "data", "leaderboard_data.json");

interface LeaderboardData {
  date: string;
  position: number;
  points: number;
}

export interface ClanLeaderboardInfo {
  position: number;
  points: number;
}

export async function fetchClanLeaderboardInfo(clanName: string): Promise<ClanLeaderboardInfo | null> {
  console.log(`🌐 Поиск полка ${clanName} в лидерборде...`);
  
  let page = 3; // Начинаем с 3 страницы
  const maxPages = 8; // Максимальное количество страниц для поиска
  
  // Запускаем браузер
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const browserPage = await browser.newPage();
    
    // Устанавливаем User-Agent
    await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    while (page <= maxPages) {
      try {
        const url = `https://warthunder.com/ru/community/clansleaderboard/page/${page}/?type=hist`;
        console.log(`📄 Проверяем страницу ${page}: ${url}`);
        
        // Переходим на страницу и ждем загрузки
        await browserPage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Ждем появления таблицы
        await browserPage.waitForSelector('table', { timeout: 10000 });
        
        // Получаем HTML после рендеринга JavaScript
        const html = await browserPage.content();
        
        const $ = cheerio.load(html);
        
        // Отладочная информация о структуре HTML
        console.log(`📄 Длина HTML: ${html.length}`);
        console.log(`🔍 Количество таблиц: ${$("table").length}`);
        console.log(`🔍 Количество строк tr: ${$("tr").length}`);
        
        // Сохраняем HTML для отладки (только для первой страницы)
        if (page === 3) {
          fs.writeFileSync('debug_page.html', html);
          console.log('💾 HTML сохранен в debug_page.html');
        }
        
        // Ищем строки в таблице лидерборда
        const rows = $("table tbody tr");
        
        console.log(`🔍 Найдено ${rows.length} строк в таблице на странице ${page}`);
        
        for (let i = 0; i < rows.length; i++) {
          const row = $(rows[i]);
          const cells = row.find("td");
          
          if (cells.length >= 3) {
            // Извлекаем данные из ячеек
            const positionCell = $(cells[0]).text().trim();
            const clanLink = $(cells[1]).find("a").text().trim(); // Ищем ссылку с названием клана
            const pointsCell = $(cells[2]).text().trim();
            
            console.log(`📋 Строка ${i + 1}: позиция="${positionCell}", клан="${clanLink}", очки="${pointsCell}"`);
            
            // Проверяем, содержит ли название полка искомый клан (разные варианты написания)
            const normalizedClanLink = clanLink.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedClanName = clanName.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            if (clanLink.includes(clanName) || normalizedClanLink.includes(normalizedClanName)) {
              // Извлекаем позицию из текста
              const positionMatch = positionCell.match(/(\d+)/);
              const position = positionMatch ? parseInt(positionMatch[1], 10) : 0;
              
                          // Извлекаем очки из текста (поддерживаем формат "29.9K", "1.2M" и т.д.)
            const pointsText = pointsCell.replace(/\s/g, "");
            let points = 0;
            
            if (pointsText.includes('K')) {
              const match = pointsText.match(/(\d+(?:\.\d+)?)K/);
              if (match) {
                points = Math.round(parseFloat(match[1]) * 1000);
              }
            } else if (pointsText.includes('M')) {
              const match = pointsText.match(/(\d+(?:\.\d+)?)M/);
              if (match) {
                points = Math.round(parseFloat(match[1]) * 1000000);
              }
            } else {
              const pointsMatch = pointsText.match(/(\d+)/);
              points = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;
            }
              
              if (position > 0 && points >= 0) {
                console.log(`✅ Найден полк ${clanName} на странице ${page}: место ${position}, очки ${points}`);
                return { position, points };
              }
            }
          }
        }
        
        // Если полк не найден на текущей странице, переходим к следующей
        page++;
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Ошибка при загрузке страницы ${page}:`, error);
        page++;
      }
    }
    
    console.log(`❌ Полк ${clanName} не найден в лидерборде (проверено ${maxPages} страниц)`);
    return null;
    
  } finally {
    await browser.close();
  }
}

export function saveLeaderboardData(data: LeaderboardData) {
  fs.writeFileSync(leaderboardDataPath, JSON.stringify(data, null, 2));
}

export function loadLeaderboardData(): LeaderboardData | null {
  if (!fs.existsSync(leaderboardDataPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(leaderboardDataPath, "utf-8"));
  } catch {
    return null;
  }
}

export function compareLeaderboardData(
  current: ClanLeaderboardInfo,
  previous: LeaderboardData
): {
  positionChange: number;
  pointsChange: number;
  positionDirection: "up" | "down" | "same";
  pointsDirection: "up" | "down" | "same";
} {
  const positionChange = previous.position - current.position; // Положительное = поднялись
  const pointsChange = current.points - previous.points; // Положительное = получили очки
  
  return {
    positionChange: Math.abs(positionChange),
    pointsChange: Math.abs(pointsChange),
    positionDirection: positionChange > 0 ? "up" : positionChange < 0 ? "down" : "same",
    pointsDirection: pointsChange > 0 ? "up" : pointsChange < 0 ? "down" : "same"
  };
} 