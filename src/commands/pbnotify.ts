import { ChatInputCommandInteraction } from "discord.js";
import { askOfficersForPb } from "../utils/pbNotify";
import { Client } from "discord.js";

export async function pbnotifyCommand(
  interaction: ChatInputCommandInteraction,
  client: Client
) {
  await interaction.deferReply({ ephemeral: true });
  await askOfficersForPb(client);
  await interaction.editReply(
    "PB notification sent to all officers (manual test)."
  );
}
