import { ChatInputCommandInteraction } from "discord.js";
import { checkTrackedPlayers } from "../utils/tracked";
import { OFFICER_ROLE_IDS } from "../constants";

export async function checktrackedCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const warns = await checkTrackedPlayers(interaction.client, OFFICER_ROLE_IDS);
    
    if (warns > 0) {
      await interaction.editReply(`✅ Проверка завершена. Отправлено ${warns} предупреждений офицерам.`);
    } else {
      await interaction.editReply("✅ Проверка завершена. Предупреждений не требуется.");
    }
  } catch (error) {
    console.error("Ошибка при проверке отслеживаемых игроков:", error);
    await interaction.editReply("❌ Произошла ошибка при проверке отслеживаемых игроков.");
  }
}
