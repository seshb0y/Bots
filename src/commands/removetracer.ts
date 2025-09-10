import { ChatInputCommandInteraction } from "discord.js";
import { loadJson, saveJson } from "../utils/json";
import { trackedPath } from "../constants";
import { TrackedPlayer } from "../types";
import { normalize } from "../utils/normalize";

export async function removetracerCommand(
  interaction: ChatInputCommandInteraction
) {
  const nick = interaction.options.getString("nickname", true);
  const tracked = loadJson<Record<string, TrackedPlayer>>(trackedPath);

  const trackedKey = Object.keys(tracked).find(
    (t) => normalize(t) === normalize(nick)
  );
  if (!trackedKey) {
    await interaction.reply(
      `❌ Игрок ${nick} не найден в списке отслеживаемых.`
    );
    return;
  }

  delete tracked[trackedKey];
  saveJson(trackedPath, tracked);
  await interaction.reply(`✅ Игрок ${trackedKey} удалён из отслеживания.`);
}
