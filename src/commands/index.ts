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
import { execute as flightAcademyCommand, handleButtonInteraction as flightAcademyButton, handleModalSubmit as flightAcademyModal, handleAircraftSelect as flightAcademyAircraftSelect } from "./flight-academy";
import { 
  aircraftListCommand, 
  aircraftAddCommand, 
  aircraftRemoveCommand, 
  aircraftUpdateCommand, 
  handleAircraftTypeSelect,
  handleAircraftAddModal,
  handleAircraftRemoveTypeSelect,
  handleAircraftRemoveSelect,
  handleAircraftUpdateTypeSelect,
  handleAircraftUpdateSelect,
  handleAircraftUpdateModal
} from "./aircraft";
import { 
  absenceformCommand, 
  absencelistCommand, 
  handleAbsenceFormButton, 
  handleAbsenceFormModal, 
  handleAbsenceTicketButton 
} from "./absenceform";
import { 
  execute as ticketHistoryCommand, 
  handleTicketHistoryButton 
} from "./ticket-history";
import { 
  execute as publishTicketsCommand, 
  handlePublishedTicketButton 
} from "./publish-tickets";
import {
  twinkHelpCommand,
  twinkListCommand,
  twinkShowCommand,
  twinkCreateCommand,
  twinkUpdateCommand,
  twinkToggle2FACommand,
  twinkDeleteCommand,
  twinkVehicleAddCommand,
  twinkVehicleRemoveCommand,
  twinkVehicleUpdateCommand,
  twinkFindCommand,
  handleTwinkCreateModal,
  handleTwinkUpdateModal,
  handleTwinkVehicleAddModal,
  handleTwinkVehicleRemoveSelect,
  handleTwinkVehicleNationSelect,
  handleTwinkVehicleTypeSelect,
  handleTwinkVehicleUpdateButton,
  handleTwinkVehicleUpdateEditModalButton,
  handleTwinkVehicleUpdateNationSelect,
  handleTwinkVehicleUpdateTypeSelect,
  handleTwinkVehicleUpdateModal,
  handleTwinkVehicleDeleteFromModalButton,
  handleTwinkDeleteButton
} from "./twinks";
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
};

export function setupCommands(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    try {
      // --- обработка кнопок ---
      if (interaction.isButton()) {
        info(`[COMMAND] Обработка кнопки: ${interaction.customId}`);
        // Обработка кнопок лётной академии
        if (interaction.customId.startsWith("type_") || 
            interaction.customId.startsWith("license_") || 
            interaction.customId.startsWith("training_") || 
            interaction.customId.startsWith("close_ticket_")) {
          await flightAcademyButton(interaction);
          return;
        }

        // Обработка кнопок формы отсутствия
        if (interaction.customId === "absence_form_button") {
          await handleAbsenceFormButton(interaction);
          return;
        }

        // Обработка кнопок заявок отсутствия (одобрить/отклонить/подробности)
        if (interaction.customId.startsWith("approve_absence_") || 
            interaction.customId.startsWith("reject_absence_") || 
            interaction.customId.startsWith("view_details_")) {
          await handleAbsenceTicketButton(interaction);
          return;
        }

        // Обработка кнопок истории тикетов и деталей тикетов (но не опубликованных тикетов)
        if ((interaction.customId.startsWith("ticket_history_") && 
             !interaction.customId.startsWith("ticket_history_details_") && 
             !interaction.customId.startsWith("ticket_history_messages_")) || 
            interaction.customId.startsWith("ticket_details_")) {
          await handleTicketHistoryButton(interaction);
          return;
        }

        // Обработка кнопок опубликованных тикетов
        if (interaction.customId.startsWith("ticket_history_details_")) {
          info(`[COMMAND] Обработка кнопки опубликованного тикета: ${interaction.customId}`);
          await handlePublishedTicketButton(interaction);
          return;
        }

        // Обработка кнопок управления самолётами (удалено - больше не используется)
        
        // Обработка кнопок твинков
        if (interaction.customId.startsWith("twink_delete_")) {
          await handleTwinkDeleteButton(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_update_btn_")) {
          await handleTwinkVehicleUpdateButton(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_update_edit_modal_")) {
          await handleTwinkVehicleUpdateEditModalButton(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_delete_btn_")) {
          await handleTwinkVehicleDeleteFromModalButton(interaction);
          return;
        }
        
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
        
        // Специальная проверка для команд твинков (все команды требуют прав)
        const twinkCommands = ["twink-help", "twink-list", "twink-show", "twink-create", "twink-update", "twink-toggle-2fa", "twink-delete", "twink-vehicle-add", "twink-vehicle-remove", "twink-vehicle-update", "twink-find"];
        
        if (twinkCommands.includes(commandName)) {
          const { hasTwinkAdminRole } = await import("./twinks.js");
          if (!hasTwinkAdminRole(interaction)) {
            await interaction.reply({
              content: "❌ У вас нет прав для работы с твинками. Требуется роль офицера или выше.",
              ephemeral: true
            });
            info(`[COMMAND] Доступ запрещён для команды ${commandName}`);
            return;
          }
        } else {
          // Для остальных команд используем общую проверку
          const hasAccess = await checkPermission(interaction);
          info(`[COMMAND] Результат проверки разрешений: ${hasAccess}`);
          if (!hasAccess) {
            info(`[COMMAND] Доступ запрещён, выходим`);
            return;
          }
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
          case "flight-academy":
            await flightAcademyCommand(interaction);
            break;
          case "absenceform":
            await absenceformCommand(interaction);
            break;
          case "absencelist":
            await absencelistCommand(interaction);
            break;
          case "ticket-history":
            await ticketHistoryCommand(interaction, 0);
            break;
          case "publish-tickets":
            await publishTicketsCommand(interaction);
            break;
          case "twink-help":
            await twinkHelpCommand(interaction);
            break;
          case "twink-list":
            await twinkListCommand(interaction);
            break;
          case "twink-show":
            await twinkShowCommand(interaction);
            break;
          case "twink-create":
            await twinkCreateCommand(interaction);
            break;
          case "twink-update":
            await twinkUpdateCommand(interaction);
            break;
          case "twink-toggle-2fa":
            await twinkToggle2FACommand(interaction);
            break;
          case "twink-delete":
            await twinkDeleteCommand(interaction);
            break;
          case "twink-vehicle-add":
            await twinkVehicleAddCommand(interaction);
            break;
          case "twink-vehicle-remove":
            await twinkVehicleRemoveCommand(interaction);
            break;
          case "twink-vehicle-update":
            await twinkVehicleUpdateCommand(interaction);
            break;
          case "twink-find":
            await twinkFindCommand(interaction);
            break;
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
        
        // Обработка модальных окон формы отсутствия
        if (interaction.customId === "absence_form_modal") {
          await handleAbsenceFormModal(interaction);
          return;
        }
        
        // Обработка модальных окон закрытия тикетов
        if (interaction.customId.startsWith("close_ticket_modal_")) {
          // Передаем обработку в flight-academy.ts
          const { handleModalSubmit } = await import("./flight-academy");
          await handleModalSubmit(interaction);
          return;
        }
        
        
        // Обработка модальных окон самолётов
        if (interaction.customId.startsWith("aircraft_add_modal")) {
          await handleAircraftAddModal(interaction);
          return;
        }
        if (interaction.customId.startsWith("aircraft_update_modal")) {
          await handleAircraftUpdateModal(interaction);
          return;
        }
        
        // Обработка модальных окон твинков
        if (interaction.customId === "twink_create_modal") {
          await handleTwinkCreateModal(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_update_modal_")) {
          await handleTwinkUpdateModal(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_add_modal_")) {
          await handleTwinkVehicleAddModal(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_update_modal_")) {
          await handleTwinkVehicleUpdateModal(interaction);
          return;
        }
      }

      // --- обработка селекторов ---
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith("aircraft_select_")) {
          await flightAcademyAircraftSelect(interaction);
          return;
        }
        
        // Обработка селекторов самолётов
        if (interaction.customId === "aircraft_type_select") {
          await handleAircraftTypeSelect(interaction);
          return;
        }
        if (interaction.customId === "aircraft_remove_type_select") {
          await handleAircraftRemoveTypeSelect(interaction);
          return;
        }
        if (interaction.customId === "aircraft_remove_select") {
          await handleAircraftRemoveSelect(interaction);
          return;
        }
        if (interaction.customId === "aircraft_update_type_select") {
          await handleAircraftUpdateTypeSelect(interaction);
          return;
        }
        if (interaction.customId === "aircraft_update_select") {
          await handleAircraftUpdateSelect(interaction);
          return;
        }
        
        // Обработка селекторов твинков
        if (interaction.customId.startsWith("twink_vehicle_remove_select_")) {
          await handleTwinkVehicleRemoveSelect(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_nation_select_")) {
          await handleTwinkVehicleNationSelect(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_type_select_")) {
          await handleTwinkVehicleTypeSelect(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_update_nation_")) {
          await handleTwinkVehicleUpdateNationSelect(interaction);
          return;
        }
        if (interaction.customId.startsWith("twink_vehicle_update_type_")) {
          await handleTwinkVehicleUpdateTypeSelect(interaction);
          return;
        }
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
