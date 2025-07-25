import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Показать список всех команд"),
  new SlashCommandBuilder().setName("ping").setDescription("Проверка бота"),
  new SlashCommandBuilder()
    .setName("points")
    .setDescription("Посмотреть свои очки"),
  new SlashCommandBuilder()
    .setName("addtracer")
    .setDescription("Добавить игрока в отслеживание")
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("Никнейм игрока в War Thunder")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("removetracer")
    .setDescription("Удалить игрока из отслеживания")
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("Никнейм игрока в War Thunder")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("listtraced")
    .setDescription("Список отслеживаемых игроков"),
  new SlashCommandBuilder()
    .setName("syncclan")
    .setDescription("Синхронизировать очки участников по клану")
    .addStringOption((option) =>
      option
        .setName("clan")
        .setDescription("Тег клана (например, ALLIANCE)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("pbnotify")
    .setDescription("Manually send PB notification to officers"),
  new SlashCommandBuilder()
    .setName("resources")
    .setDescription("Show current CPU and memory usage of the bot"),
  new SlashCommandBuilder()
    .setName("checktracked")
    .setDescription(
      "Manually check tracked players and notify officers if needed"
    ),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Показать статистику изменений очков за сутки по игрокам"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

async function registerCommands() {
  try {
    console.log("🔁 Регистрируем команды...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    );

    console.log("✅ Команды успешно зарегистрированы");
  } catch (err) {
    console.error("❌ Ошибка при регистрации:", err);
  }
}

registerCommands();
