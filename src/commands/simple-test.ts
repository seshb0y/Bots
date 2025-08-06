import { ChatInputCommandInteraction } from "discord.js";

export async function simpleTestCommand(interaction: ChatInputCommandInteraction) {
  console.log("🔍 Простая тестовая команда вызвана");
  
  try {
    await interaction.reply({ content: "✅ Простая команда работает!", ephemeral: true });
    console.log("🔍 Простая команда выполнена успешно");
  } catch (error) {
    console.error("❌ Ошибка в простой команде:", error);
    await interaction.reply({ content: "❌ Ошибка в простой команде", ephemeral: true });
  }
} 