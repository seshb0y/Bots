import { ChatInputCommandInteraction } from "discord.js";
import { loadJson, saveJson } from "../utils/json";
import { trackedPath } from "../constants";
import { TrackedPlayer } from "../types";

export async function addtracerCommand(
  interaction: ChatInputCommandInteraction
) {
  const nick = interaction.options.getString("nickname", true);
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);

  if (tracked[nick]) {
    await interaction.reply(`⚠️ Игрок ${nick} уже отслеживается.`);
    return;
  }

  tracked[nick] = {
    trackedSince: new Date().toISOString(),
    assignedBy: interaction.user.id,
    warnedAfter7d: false,
    warnedAfter14d: false,
    lastPoints: 0,
  };

  saveJson(trackedPath, tracked);
  await interaction.reply(`🔍 Начато отслеживание игрока ${nick}`);
}
