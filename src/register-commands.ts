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
    .setDescription("Добавить самолёт в список")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("aircraft-remove")
    .setDescription("Удалить самолёт из списка")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("aircraft-update")
    .setDescription("Обновить информацию о самолёте")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("flight-academy")
    .setDescription("Создать тикет для лётной академии War Thunder")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName("absenceform")
    .setDescription("Создать форму отписки отсутствия"),
  new SlashCommandBuilder()
    .setName("absencelist")
    .setDescription("Показать список заявок об отсутствии")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName("ticket-history")
    .setDescription("Просмотр истории тикетов лётной академии")
    .setDefaultMemberPermissions(0) // Changed to 0 for custom role check
    .addStringOption(option =>
      option
        .setName("тип")
        .setDescription("Тип фильтрации тикетов")
        .setRequired(false)
        .addChoices(
          { name: "Все тикеты", value: "all" },
          { name: "Открытые", value: "open" },
          { name: "Закрытые", value: "closed" },
          { name: "Лицензии", value: "licenses" },
          { name: "Обучение", value: "training" },
          { name: "Мои тикеты", value: "my" },
          { name: "Лицензии сданы", value: "completed" },
          { name: "Лицензии не сданы", value: "failed" },
          { name: "Отменённые", value: "cancelled" }
        )
    ),
  new SlashCommandBuilder()
    .setName("publish-tickets")
    .setDescription("Публикация тикетов в канал истории лётной академии")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName("тип")
        .setDescription("Тип публикации")
        .setRequired(true)
        .addChoices(
          { name: "Все неопубликованные", value: "unpublished" },
          { name: "Только закрытые", value: "closed" },
          { name: "Конкретный тикет", value: "specific" }
        )
    )
    .addStringOption(option =>
      option
        .setName("тикет-id")
        .setDescription("ID конкретного тикета (только для типа 'specific')")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("twink-help")
    .setDescription("Показать справку по командам управления твинками"),
  new SlashCommandBuilder()
    .setName("twink-list")
    .setDescription("Показать список всех твинков (полковых аккаунтов)"),
  new SlashCommandBuilder()
    .setName("twink-show")
    .setDescription("Показать информацию о конкретном твинке")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("twink-create")
    .setDescription("Создать новый твинк"),
  new SlashCommandBuilder()
    .setName("twink-update")
    .setDescription("Обновить данные твинка")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("field")
        .setDescription("Поле для обновления")
        .setRequired(true)
        .addChoices(
          { name: "Никнейм", value: "username" },
          { name: "Логин", value: "login" },
          { name: "Пароль", value: "password" }
        )
    ),
  new SlashCommandBuilder()
    .setName("twink-toggle-2fa")
    .setDescription("Переключить статус 2FA для твинка")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("twink-delete")
    .setDescription("Удалить твинк")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("twink-vehicle-add")
    .setDescription("Добавить технику к твинку")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("twink-vehicle-remove")
    .setDescription("Удалить технику из твинка")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("twink-vehicle-update")
    .setDescription("Редактировать технику твинка")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Имя пользователя твинка")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("twink-find")
    .setDescription("Найти твинки с техникой под необходимый БР")
    .addNumberOption((option) =>
      option
        .setName("br")
        .setDescription("Целевой БР (например, 8.0 - найдет технику с БР 7.0-8.0)")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(15)
    ),
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
