// index.ts
import { client } from "./bot";
import {
  helpCommand,
  pointsCommand,
  addtracerCommand,
  removetracerCommand,
  listtracedCommand,
  syncclanCommand,
  pbnotifyCommand,
  resourcesCommand,
  statsCommand,
} from "./commands";

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === "ping") {
      return interaction.reply("🏓 Pong!");
    }
    if (commandName === "help") {
      return helpCommand(interaction);
    }
    if (commandName === "points") {
      return pointsCommand(interaction);
    }
    if (commandName === "addtracer") {
      return addtracerCommand(interaction);
    }
    if (commandName === "removetracer") {
      return removetracerCommand(interaction);
    }
    if (commandName === "listtraced") {
      return listtracedCommand(interaction);
    }
    if (commandName === "syncclan") {
      return syncclanCommand(interaction);
    }
    if (commandName === "pbnotify") {
      return pbnotifyCommand(interaction, client);
    }
    if (commandName === "resources") {
      return resourcesCommand(interaction);
    }
    if (commandName === "stats") {
      return statsCommand(interaction);
    }
  } catch (err) {
    console.error("Ошибка при обработке interactionCreate:", err);
    try {
      if (interaction.isRepliable && interaction.isRepliable()) {
        await interaction.reply({
          content: "Произошла ошибка при выполнении команды. Попробуйте позже.",
          ephemeral: true,
        });
      }
    } catch (e) {
      // Игнорируем ошибку, если не удалось отправить ответ
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing in .env");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
