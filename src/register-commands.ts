import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import "dotenv/config";
import { data as autotestData } from "./commands/autotest";
import { data as teststatsfixData } from "./commands/teststatsfix";

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Показать список всех команд"),
  new SlashCommandBuilder().setName("ping").setDescription("Проверка бота"),
  new SlashCommandBuilder()
    .setName("points")
    .setDescription("Посмотреть свои очки")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName("addtracer")
    .setDescription("Добавить игрока в отслеживание")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("Никнейм игрока в War Thunder")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("removetracer")
    .setDescription("Удалить игрока из отслеживания")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("Никнейм игрока в War Thunder")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("listtraced")
    .setDescription("Список отслеживаемых игроков")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName("syncclan")
    .setDescription("Синхронизировать очки участников по клану")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("clan")
        .setDescription("Тег клана (например, ALLIANCE)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("resettleavers")
    .setDescription("Сбросить файл отслеживания покинувших игроков")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("pbnotify")
    .setDescription("Manually send PB notification to officers")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("resources")
    .setDescription("Show current CPU and memory usage of the bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("option")
        .setDescription("Выберите режим")
        .setRequired(false)
        .addChoices(
          { name: "current", value: "current" },
          { name: "history", value: "history" }
        )
    ),
  new SlashCommandBuilder()
    .setName("checktracked")
    .setDescription(
      "Manually check tracked players and notify officers if needed"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Показать статистику изменений очков за сутки по игрокам")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName("teststats")
    .setDescription("Тестовая команда для проверки статистики с лидербордом")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("simpletest")
    .setDescription("Простая тестовая команда")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName("lichstat")
    .setDescription("Получить статистику игрока War Thunder")
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("Никнейм игрока в War Thunder")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("runtests")
    .setDescription("Запустить тестирование бота (только для администраторов)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("aircraft-list")
    .setDescription("Показать список самолётов")
    .addStringOption((option) =>
      option
        .setName("тип")
        .setDescription("Тип самолётов")
        .setRequired(false)
        .addChoices(
          { name: "Поршневая авиация", value: "piston" },
          { name: "Ранние реактивы", value: "early_jet" },
          { name: "Современные реактивы", value: "modern_jet" }
        )
    ),
  new SlashCommandBuilder()
    .setName("aircraft-add")
    .setDescription("Добавить самолёт в список"),
  new SlashCommandBuilder()
    .setName("aircraft-remove")
    .setDescription("Удалить самолёт из списка"),
  new SlashCommandBuilder()
    .setName("aircraft-update")
    .setDescription("Обновить информацию о самолёте"),
  new SlashCommandBuilder()
    .setName("flight-academy")
    .setDescription("Создать тикет для лётной академии War Thunder"),
  new SlashCommandBuilder()
    .setName("absenceform")
    .setDescription("Создать форму для отписки отсутствия"),
  new SlashCommandBuilder()
    .setName("absencelist")
    .setDescription("Показать список одобренных заявок об отсутствии")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  autotestData,
  teststatsfixData,
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
