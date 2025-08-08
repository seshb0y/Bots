import { ChatInputCommandInteraction } from "discord.js";
import pidusage from "pidusage";
import * as fs from "fs";
import * as path from "path";

let maxCpu = 0;
let maxMem = 0;

// Переменные для минутного мониторинга
let monitoringActive = false;
let monitoringStartTime = 0;
let minuteStats = {
  maxCpu: 0,
  maxMemory: 0,
  maxHeapUsed: 0,
  maxHeapTotal: 0,
  maxExternal: 0,
  functionStats: {} as Record<string, {
    calls: number,
    totalTime: number,
    maxTime: number,
    avgTime: number
  }>
};

// Функция для отслеживания производительности функций
function trackFunctionPerformance(functionName: string, startTime: number) {
  if (!monitoringActive) return;
  
  const duration = Date.now() - startTime;
  
  if (!minuteStats.functionStats[functionName]) {
    minuteStats.functionStats[functionName] = {
      calls: 0,
      totalTime: 0,
      maxTime: 0,
      avgTime: 0
    };
  }
  
  const stats = minuteStats.functionStats[functionName];
  stats.calls++;
  stats.totalTime += duration;
  stats.maxTime = Math.max(stats.maxTime, duration);
  stats.avgTime = stats.totalTime / stats.calls;
}

// Функция для мониторинга ресурсов
async function monitorResources() {
  if (!monitoringActive) return;
  
  try {
    const stats = await pidusage(process.pid);
    const memoryMB = stats.memory / 1024 / 1024;
    const nodeMemoryUsage = process.memoryUsage();
    const heapUsedMB = nodeMemoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = nodeMemoryUsage.heapTotal / 1024 / 1024;
    const externalMB = nodeMemoryUsage.external / 1024 / 1024;
    
    // Обновляем пиковые нагрузки
    minuteStats.maxCpu = Math.max(minuteStats.maxCpu, stats.cpu);
    minuteStats.maxMemory = Math.max(minuteStats.maxMemory, memoryMB);
    minuteStats.maxHeapUsed = Math.max(minuteStats.maxHeapUsed, heapUsedMB);
    minuteStats.maxHeapTotal = Math.max(minuteStats.maxHeapTotal, heapTotalMB);
    minuteStats.maxExternal = Math.max(minuteStats.maxExternal, externalMB);
    
  } catch (err) {
    console.log('Ошибка мониторинга ресурсов:', err);
  }
}

export async function resourcesCommand(
  interaction: ChatInputCommandInteraction
) {
  const option = interaction.options.getString("option", true);
  
  if (option === "start") {
    if (monitoringActive) {
      await interaction.reply({ content: "⚠️ Мониторинг ресурсов уже запущен!", ephemeral: true });
      return;
    }
    
    // Запускаем мониторинг
    monitoringActive = true;
    monitoringStartTime = Date.now();
    minuteStats = {
      maxCpu: 0,
      maxMemory: 0,
      maxHeapUsed: 0,
      maxHeapTotal: 0,
      maxExternal: 0,
      functionStats: {}
    };
    
    await interaction.reply({ content: "🔍 **Мониторинг ресурсов запущен!**\nЧерез минуту вы получите детальный отчет о производительности бота.", ephemeral: true });
    
    // Запускаем мониторинг каждую секунду
    const monitorInterval = setInterval(monitorResources, 1000);
    
    // Через минуту отправляем отчет
    setTimeout(async () => {
      monitoringActive = false;
      clearInterval(monitorInterval);
      
      const endTime = Date.now();
      const duration = endTime - monitoringStartTime;
      
      let report = `📊 **ОТЧЕТ О РЕСУРСАХ БОТА** (${new Date(monitoringStartTime).toLocaleTimeString("ru-RU")} - ${new Date(endTime).toLocaleTimeString("ru-RU")})\n\n`;
      report += `🔥 **ПИКОВЫЕ НАГРУЗКИ:**\n`;
      report += `• CPU: ${minuteStats.maxCpu.toFixed(2)}%\n`;
      report += `• RAM: ${minuteStats.maxMemory.toFixed(2)} MB\n`;
      report += `• Heap Used: ${minuteStats.maxHeapUsed.toFixed(2)} MB\n`;
      report += `• Heap Total: ${minuteStats.maxHeapTotal.toFixed(2)} MB\n`;
      report += `• External: ${minuteStats.maxExternal.toFixed(2)} MB\n\n`;
      
      if (Object.keys(minuteStats.functionStats).length > 0) {
        report += `⚡ **СТАТИСТИКА ФУНКЦИЙ:**\n`;
        for (const [funcName, funcStats] of Object.entries(minuteStats.functionStats)) {
          if (funcStats.calls > 0) {
            const percentOfTotal = ((funcStats.totalTime / duration) * 100).toFixed(2);
            report += `• **${funcName}:**\n`;
            report += `  - Вызовов: ${funcStats.calls}\n`;
            report += `  - Общее время: ${funcStats.totalTime.toFixed(2)}ms\n`;
            report += `  - Среднее время: ${funcStats.avgTime.toFixed(2)}ms\n`;
            report += `  - Максимальное время: ${funcStats.maxTime.toFixed(2)}ms\n`;
            report += `  - % от общего времени: ${percentOfTotal}%\n\n`;
          }
        }
      } else {
        report += `ℹ️ За время мониторинга не было зафиксировано активности функций.\n`;
      }
      
      try {
        await interaction.followUp({ content: report, ephemeral: true });
      } catch (err) {
        console.log('Ошибка отправки отчета:', err);
      }
      
    }, 60000); // 60 секунд
    
  } else if (option === "current") {
    await interaction.deferReply({ ephemeral: true });
    pidusage(process.pid, (err: Error | null, stats: any) => {
      if (err) {
        interaction.editReply("Failed to get resource usage.");
      } else {
        if (stats.cpu > maxCpu) maxCpu = stats.cpu;
        if (stats.memory > maxMem) maxMem = stats.memory;
        interaction.editReply(
          `Resource usage:\n` +
            `CPU: ${stats.cpu.toFixed(2)}% (max: ${maxCpu.toFixed(2)}%)\n` +
            `Memory: ${(stats.memory / 1024 / 1024).toFixed(2)} MB (max: ${(
              maxMem /
              1024 /
              1024
            ).toFixed(2)} MB)`
        );
      }
    });
  } else {
    await interaction.reply({ content: "❌ Неизвестная опция. Используйте 'start' для запуска мониторинга или 'current' для текущих ресурсов.", ephemeral: true });
  }
}

// Экспортируем функцию для использования в других модулях
export { trackFunctionPerformance };
