const axios = require('axios');

async function testHeaders() {
  console.log('🧪 Тестирование различных заголовков...');
  
  const url = 'https://warthunder.com/ru/community/claninfo/ALLIANCE';
  
  // Попробуем разные варианты заголовков
  const headersVariants = [
    {
      name: 'Стандартные заголовки бота',
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
      }
    },
    {
      name: 'Минимальные заголовки',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    },
    {
      name: 'Заголовки с Referer',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://warthunder.com/ru/community/clansleaderboard/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    }
  ];
  
  for (const variant of headersVariants) {
    console.log(`\n🔍 Тестируем: ${variant.name}`);
    
    try {
      const { data, status } = await axios.get(url, {
        headers: variant.headers,
        timeout: 10000,
        maxRedirects: 5
      });
      
      console.log(`✅ Успех! Статус: ${status}, Длина HTML: ${data.length}`);
      
      // Сохраняем HTML для анализа
      const fs = require('fs');
      fs.writeFileSync(`debug_${variant.name.replace(/\s+/g, '_')}.html`, data);
      console.log(`💾 HTML сохранен в debug_${variant.name.replace(/\s+/g, '_')}.html`);
      
      return data; // Возвращаем первый успешный результат
      
    } catch (error) {
      console.log(`❌ Ошибка: ${error.response?.status || error.message}`);
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n❌ Все варианты заголовков не сработали');
  return null;
}

testHeaders();

