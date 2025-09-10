import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { ADMIN_ROLE_IDS, MODERATOR_ROLE_IDS, PILOT_INSTRUCTOR_ROLE_IDS, COMMAND_PERMISSIONS } from "../constants";

/**
 * Проверяет, имеет ли пользователь необходимые роли для выполнения команды
 */
export function hasPermission(interaction: ChatInputCommandInteraction, requiredLevel: 'public' | 'pilot_instructor' | 'moderator' | 'officer' | 'admin'): boolean {
  const member = interaction.member as GuildMember;
  const commandName = interaction.commandName;

  // Проверяем, есть ли команда в списке разрешенных для данного уровня
  const allowedCommands = COMMAND_PERMISSIONS[requiredLevel];
  if (!allowedCommands.includes(commandName)) {
    return false;
  }

  // Публичные команды доступны всем
  if (requiredLevel === 'public') {
    return true;
  }

  // Проверяем роли пользователя
  const userRoleIds = member.roles.cache.map(role => role.id);

  switch (requiredLevel) {
    case 'pilot_instructor':
      return userRoleIds.some(roleId => PILOT_INSTRUCTOR_ROLE_IDS.includes(roleId)) ||
             userRoleIds.some(roleId => MODERATOR_ROLE_IDS.includes(roleId)) ||
             userRoleIds.some(roleId => ADMIN_ROLE_IDS.includes(roleId));
    case 'moderator':
      return userRoleIds.some(roleId => MODERATOR_ROLE_IDS.includes(roleId)) ||
             userRoleIds.some(roleId => ADMIN_ROLE_IDS.includes(roleId));
    case 'officer':
      return userRoleIds.some(roleId => ADMIN_ROLE_IDS.includes(roleId));
    case 'admin':
      return userRoleIds.some(roleId => ADMIN_ROLE_IDS.includes(roleId));
    default:
      return false;
  }
}

/**
 * Получает минимальный уровень доступа для команды
 */
export function getCommandPermissionLevel(commandName: string): 'public' | 'pilot_instructor' | 'moderator' | 'officer' | 'admin' | null {
  for (const [level, commands] of Object.entries(COMMAND_PERMISSIONS)) {
    if (commands.includes(commandName)) {
      return level as 'public' | 'pilot_instructor' | 'moderator' | 'officer' | 'admin';
    }
  }
  return null;
}

/**
 * Проверяет разрешения и отправляет сообщение об ошибке если нужно
 */
export async function checkPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const commandName = interaction.commandName;
  const permissionLevel = getCommandPermissionLevel(commandName);

  if (!permissionLevel) {
    await interaction.reply({ 
      content: "❌ Неизвестная команда!", 
      ephemeral: true 
    });
    return false;
  }

  if (!hasPermission(interaction, permissionLevel)) {
    const levelNames = {
      'public': 'всем пользователям',
      'pilot_instructor': 'пилотам-инструкторам и выше',
      'moderator': 'модераторам и выше',
      'officer': 'офицерам',
      'admin': 'администраторам'
    };

    await interaction.reply({ 
      content: `❌ Команда \`/${commandName}\` доступна только ${levelNames[permissionLevel]}!`, 
      ephemeral: true 
    });
    return false;
  }

  return true;
}
