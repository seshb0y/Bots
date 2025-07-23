import { ChatInputCommandInteraction } from "discord.js";
import pidusage from "pidusage";

let maxCpu = 0;
let maxMem = 0;

export async function resourcesCommand(
  interaction: ChatInputCommandInteraction
) {
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
}
