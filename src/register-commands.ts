import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import "dotenv/config";

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
    .setDescription("Показать списки самолётов для лётной академии")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Тип самолётов")
        .setRequired(false)
        .addChoices(
          { name: "Поршневые", value: "piston" },
          { name: "Ранние реактивные", value: "early_jet" },
          { name: "Современные реактивные", value: "modern_jet" }
        )
    ),
  new SlashCommandBuilder()
    .setName("aircraft-add")
    .setDescription("Добавить самолёт в список (только для администраторов самолётов)")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Тип самолёта")
        .setRequired(true)
        .addChoices(
          { name: "Поршневой", value: "piston" },
          { name: "Ранний реактивный", value: "early_jet" },
          { name: "Современный реактивный", value: "modern_jet" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("Уникальный ID самолёта (например: bf109f4)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Название самолёта")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("br")
        .setDescription("Боевой рейтинг")
        .setRequired(true)
        .setMinValue(1.0)
        .setMaxValue(12.0)
    )
    .addStringOption((option) =>
      option
        .setName("nation")
        .setDescription("Нация")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("aircraft_type")
        .setDescription("Тип самолёта")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("aircraft-remove")
    .setDescription("Удалить самолёт из списка (только для администраторов самолётов)")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("ID самолёта для удаления")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("flight-academy")
    .setDescription("Создать тикет для лётной академии War Thunder")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
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
