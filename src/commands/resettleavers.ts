import { ChatInputCommandInteraction } from "discord.js";
import * as fs from "fs";
import * as path from "path";

const leaversTrackingPath = path.join(__dirname, "..", "data", "leavers_tracking.json");

export async function resettleaversCommand(
  interaction: ChatInputCommandInteraction
) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Удаляем файл отслеживания
    if (fs.existsSync(leaversTrackingPath)) {
      fs.unlinkSync(leaversTrackingPath);
      console.log('[RESET] Файл отслеживания покинувших игроков удален');
    }
    
    await interaction.editReply(
      "✅ Файл отслеживания покинувших игроков сброшен. При следующем выполнении команды `/syncclan` файл будет инициализирован заново."
    );
  } catch (error) {
    console.error('[RESET] Ошибка при сбросе файла отслеживания:', error);
    await interaction.editReply(
      "❌ Произошла ошибка при сбросе файла отслеживания."
    );
  }
} 