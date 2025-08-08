import { ChatInputCommandInteraction } from "discord.js";
import { loadJson } from "../utils/json";
import { usersPath } from "../constants";
import { UserData } from "../types";

export async function pointsCommand(interaction: ChatInputCommandInteraction) {
  const users = loadJson<Record<string, UserData>>(usersPath);
  const userId = interaction.user.id;
  const points = users[userId]?.points ?? 0;
  await interaction.reply(`У тебя ${points} полковых очков.`);
}
