import { Client, Interaction, ChatInputCommandInteraction, ButtonInteraction, TextChannel } from "discord.js";
import { helpCommand } from "./help";
import { pointsCommand } from "./points";
import { addtracerCommand } from "./addtracer";
import { removetracerCommand } from "./removetracer";
import { listtracedCommand } from "./listtraced";
import { pbnotifyCommand } from "./pbnotify";
import { resourcesCommand } from "./resources";
import { syncclanCommand } from "./syncclan";
import { resettleaversCommand } from "./resettleavers";
import { teststatsCommand } from "./teststats";
import { statsCommand } from "./stats";
import { checktrackedCommand } from "./checktracked";
import { simpleTestCommand } from "./simple-test";
import { lichstatCommand } from "./lichstat";
import { runtestsCommand } from "./runtests";
<<<<<<< HEAD
import { execute as flightAcademyCommand, handleButtonInteraction as flightAcademyButton, handleModalSubmit as flightAcademyModal, handleAircraftSelect as flightAcademyAircraftSelect } from "./flight-academy";
import { aircraftListCommand, aircraftAddCommand, aircraftRemoveCommand, aircraftUpdateCommand, handleAircraftTypeSelect, handleAircraftListBack } from "./aircraft";
=======
import { autotestCommand } from "./autotest";
import { teststatsfixCommand } from "./teststatsfix";
import { execute as flightAcademyCommand, handleButtonInteraction as flightAcademyButton, handleModalSubmit as flightAcademyModal, handleAircraftSelect as flightAcademyAircraftSelect } from "./flight-academy";
import { absenceformCommand, handleAbsenceFormButton, handleAbsenceFormModal, handleAbsenceTicketButton, absencelistCommand } from "./absenceform";
import { 
  aircraftListCommand, 
  aircraftAddCommand, 
  aircraftRemoveCommand, 
  aircraftUpdateCommand, 
  handleAircraftTypeSelect, 
  handleAircraftListBack,
  handleAircraftAddTypeSelect,
  handleAircraftAddModal,
  handleAircraftRemoveTypeSelect,
  handleAircraftRemoveAircraftSelect,
  handleAircraftUpdateTypeSelect,
  handleAircraftUpdateAircraftSelect,
  handleAircraftUpdateModal
} from "./aircraft";
>>>>>>> feature/absence-thread-integration
import { setPbAnnounced } from "../utils/pbNotify";
import { logCommand, logInteraction, error, info } from "../utils/logger";
import { checkPermission } from "../utils/permissions";

export {
  helpCommand,
  pointsCommand,
  addtracerCommand,
  removetracerCommand,
  listtracedCommand,
  pbnotifyCommand,
  resourcesCommand,
  syncclanCommand,
  resettleaversCommand,
  teststatsCommand,
  statsCommand,
  checktrackedCommand,
  lichstatCommand,
  runtestsCommand,
<<<<<<< HEAD
=======
  teststatsfixCommand,
  absenceformCommand,
  absencelistCommand,
>>>>>>> feature/absence-thread-integration
};

export function setupCommands(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    try {
      // --- обработка кнопок ---
      if (interaction.isButton()) {
        // Обработка кнопок лётной академии
        if (interaction.customId.startsWith("type_") || 
            interaction.customId.startsWith("license_") || 
            interaction.customId.startsWith("training_") || 
<<<<<<< HEAD
            interaction.customId.startsWith("close_ticket_")) {
=======
            interaction.customId.startsWith("close_ticket_") ||
            interaction.customId === "close_training_ticket") {
>>>>>>> feature/absence-thread-integration
          await flightAcademyButton(interaction);
          return;
        }

        // Обработка кнопок управления самолётами
        if (interaction.customId === "aircraft_list_back") {
          await handleAircraftListBack(interaction);
          return;
        }
<<<<<<< HEAD
=======

        // Обработка кнопки формы отсутствия
        if (interaction.customId === "absence_form_button") {
          await handleAbsenceFormButton(interaction);
          return;
        }

        // Обработка кнопок заявок отсутствия
        if (interaction.customId.startsWith("approve_absence_") || 
            interaction.customId.startsWith("reject_absence_") || 
            interaction.customId.startsWith("view_details_")) {
          await handleAbsenceTicketButton(interaction);
          return;
        }
>>>>>>> feature/absence-thread-integration
        
        if (interaction.customId === "pb_yes") {
          logInteraction("Нажата кнопка 'Собираю' для ПБ", { userId: interaction.user.id, username: interaction.user.tag });
          
          const guild = interaction.guild || client.guilds.cache.first();
          const channelIds = [
            "763085196118851608",
            "885928590720524328",
            "821082995188170783"
          ];
          
          // Проверяем количество людей в каждом канале отдельно
          let totalCount = 0;
          let mainChannelCount = 0; // Количество людей в канале 763085196118851608
          
          for (const id of channelIds) {
            const channel = await guild?.channels.fetch(id);
            if (channel?.isVoiceBased()) {
              const channelCount = Array.from(channel.members.values()).filter(m => !m.user.bot).length;
              totalCount += channelCount;
              
              // Отдельно считаем людей в основном канале
              if (id === "763085196118851608") {
                mainChannelCount = channelCount;
              }
            }
          }
          
          const plus = Math.max(0, 8 - totalCount);
          
          // Проверяем, есть ли люди в основном канале
          if (mainChannelCount === 0) {
            await interaction.reply({ 
              content: "❌ В основном канале нет людей! Сначала зайдите в канал для ПБ.", 
              ephemeral: true 
            });
            return;
          }
          
          const announceChannel = await client.channels.fetch("763085196118851607");
          if (announceChannel && announceChannel.isTextBased()) {
            const now = new Date();
            const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
            const embed = {
              color: 0x2ecc71,
              title: `🚩 Сбор на ПБ!` ,
              description:
                `@everyone\n\n` +
                `**+${plus}** игроков нужно для ПБ\n` +
                `\n` +
                `👤 **Собирает:** ${interaction.user} \n` +
                `🕒 **Время:** ${time}`,
              footer: {
                text: "Желаем удачи в бою!"
              }
            };
            await (announceChannel as TextChannel).send({ embeds: [embed] });

            // Отмечаем, что ПБ объявлен сегодня
            const today = new Date().toISOString().slice(0, 10);
            setPbAnnounced(true, interaction.user.id, today);
            
            logInteraction("Отправлено объявление о ПБ в канал", { 
              channelId: "763085196118851607", 
              plus, 
              collector: interaction.user.tag 
            });
          }
          await interaction.reply({ content: "Оповещение о сборе ПБ отправлено в канал!", ephemeral: true });
          return;
        }
        
        // Обработка кнопок лётной академии
        if (interaction.customId.startsWith("license_")) {
          await flightAcademyButton(interaction);
          return;
        }
      }

      // --- обработка команд ---
      if (interaction.isChatInputCommand()) {
        const commandName = interaction.commandName;
        info(`[COMMAND] === НАЧАЛО ОБРАБОТКИ КОМАНДЫ ===`);
        info(`[COMMAND] Название команды: ${commandName}`);
        info(`[COMMAND] Пользователь: ${interaction.user.tag} (${interaction.user.id})`);
        info(`[COMMAND] Сервер: ${interaction.guildId}`);
        logCommand(`Выполняется команда: ${commandName}`, { 
          userId: interaction.user.id, 
          username: interaction.user.tag,
          guildId: interaction.guildId 
        });

        // Проверяем разрешения пользователя
        info(`[COMMAND] Проверяем разрешения для пользователя ${interaction.user.tag}`);
        const hasAccess = await checkPermission(interaction);
        info(`[COMMAND] Результат проверки разрешений: ${hasAccess}`);
        if (!hasAccess) {
          info(`[COMMAND] Доступ запрещён, выходим`);
          return;
        }

        info(`[COMMAND] Переходим к switch statement для команды: ${commandName}`);
        switch (commandName) {
          case "help":
            await helpCommand(interaction);
            break;
          case "points":
            await pointsCommand(interaction);
            break;
          case "addtracer":
            await addtracerCommand(interaction);
            break;
          case "removetracer":
            await removetracerCommand(interaction);
            break;
          case "listtraced":
            await listtracedCommand(interaction);
            break;
          case "pbnotify":
            await pbnotifyCommand(interaction, client);
            break;
          case "resources":
            await resourcesCommand(interaction);
            break;
          case "syncclan":
            await syncclanCommand(interaction);
            break;
          case "resettleavers":
            await resettleaversCommand(interaction);
            break;
          case "teststats":
            await teststatsCommand(interaction);
            break;
          case "stats":
            await statsCommand(interaction);
            break;
          case "checktracked":
            await checktrackedCommand(interaction);
            break;
          case "lichstat":
            await lichstatCommand(interaction);
            break;
          case "runtests":
            await runtestsCommand(interaction);
            break;
<<<<<<< HEAD
          case "flight-academy":
            await flightAcademyCommand(interaction);
            break;
=======
          case "teststatsfix":
            await teststatsfixCommand(interaction);
            break;
          case "autotest":
            await autotestCommand(interaction);
            break;
          case "flight-academy":
            await flightAcademyCommand(interaction);
            break;
          case "absenceform":
            await absenceformCommand(interaction);
            break;
          case "absencelist":
            await absencelistCommand(interaction);
            break;
>>>>>>> feature/absence-thread-integration
        case "aircraft-list":
          info(`[COMMAND] 🎯 ПОПАЛИ В CASE aircraft-list для пользователя ${interaction.user.tag}`);
          info(`[COMMAND] Выполняется команда aircraft-list для пользователя ${interaction.user.tag}`);
          await aircraftListCommand(interaction);
          info(`[COMMAND] Команда aircraft-list завершена для пользователя ${interaction.user.tag}`);
          break;
          case "aircraft-add":
            await aircraftAddCommand(interaction);
            break;
          case "aircraft-remove":
            await aircraftRemoveCommand(interaction);
            break;
          case "aircraft-update":
            await aircraftUpdateCommand(interaction);
            break;
          case "ping":
            await interaction.reply({ content: "🏓 Понг! Бот работает.", ephemeral: true });
            break;
          case "simpletest":
            await simpleTestCommand(interaction);
            break;
        default:
          info(`[COMMAND] 🚫 ПОПАЛИ В DEFAULT CASE для команды: ${commandName}`);
          info(`[COMMAND] Команда ${commandName} не найдена в обработчике`);
          logCommand(`Неизвестная команда: ${commandName}`, { 
            userId: interaction.user.id, 
            username: interaction.user.tag 
          });
          await interaction.reply({ content: "❌ Неизвестная команда!", ephemeral: true });
        }
        info(`[COMMAND] Switch statement завершён для команды: ${commandName}`);
      }
      
      // --- обработка модальных окон ---
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("academy_form_") || interaction.customId.startsWith("training_form_")) {
          await flightAcademyModal(interaction);
          return;
        }
<<<<<<< HEAD
=======
        
        // Обработка модальных окон управления самолётами
        if (interaction.customId.startsWith("aircraft_add_modal:")) {
          await handleAircraftAddModal(interaction);
          return;
        }
        
        if (interaction.customId.startsWith("aircraft_update_modal:")) {
          await handleAircraftUpdateModal(interaction);
          return;
        }

        // Обработка модального окна формы отсутствия
        if (interaction.customId === "absence_form_modal") {
          await handleAbsenceFormModal(interaction);
          return;
        }
>>>>>>> feature/absence-thread-integration
      }

      // --- обработка селекторов ---
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith("aircraft_select_")) {
          await flightAcademyAircraftSelect(interaction);
          return;
        }
        if (interaction.customId === "aircraft_type_select") {
          await handleAircraftTypeSelect(interaction);
          return;
        }
<<<<<<< HEAD
=======
        
        // Обработка селекторов управления самолётами
        if (interaction.customId === "aircraft_add_type_select") {
          await handleAircraftAddTypeSelect(interaction);
          return;
        }
        if (interaction.customId === "aircraft_remove_type_select") {
          await handleAircraftRemoveTypeSelect(interaction);
          return;
        }
        
        if (interaction.customId === "aircraft_remove_aircraft_select") {
          await handleAircraftRemoveAircraftSelect(interaction);
          return;
        }
        
        if (interaction.customId === "aircraft_update_type_select") {
          await handleAircraftUpdateTypeSelect(interaction);
          return;
        }
        
        if (interaction.customId === "aircraft_update_aircraft_select") {
          await handleAircraftUpdateAircraftSelect(interaction);
          return;
        }
>>>>>>> feature/absence-thread-integration
      }
    } catch (err: any) {
      error("Ошибка при обработке взаимодействия", err);
      
      try {
        const reply = {
          content: "Произошла ошибка при выполнении команды!",
          ephemeral: true,
        };
        
        if (interaction.isChatInputCommand()) {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        } else if (interaction.isButton()) {
          await interaction.reply(reply);
        }
      } catch (replyError) {
        error("Не удалось отправить сообщение об ошибке", replyError);
      }
    }
  });
}
