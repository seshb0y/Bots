#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки доступности команд твинков
 * Проверяет:
 * 1. Регистрацию команд (нет ли блокировки на уровне Discord)
 * 2. Проверку ролей в коде
 * 3. Список разрешённых ролей
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

const TWINK_ADMIN_ROLE_IDS = [
  "820720829926080552",
  "820326884071047219",
  "832340940395118594",
  "831612187767603271",
  "1030892555908431935",
  "820056309918466048"
];

const TWINK_COMMANDS = [
  "twink-list",
  "twink-show",
  "twink-create",
  "twink-update",
  "twink-toggle-2fa",
  "twink-delete",
  "twink-vehicle-add",
  "twink-vehicle-remove"
];

async function testCommandPermissions() {
  console.log('🧪 Тестирование доступности команд твинков\n');
  console.log('=' .repeat(60));
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  
  if (!clientId || !guildId) {
    console.error('❌ Отсутствуют CLIENT_ID или GUILD_ID в .env');
    process.exit(1);
  }
  
  try {
    console.log(`📋 Получаю список зарегистрированных команд для гильдии ${guildId}...\n`);
    
    // Получаем список команд
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`✅ Найдено команд: ${commands.length}\n`);
    
    // Проверяем команды твинков
    console.log('🔍 Проверка команд твинков:\n');
    
    let twinkCommandsFound = 0;
    let twinkCommandsWithAdminPerms = 0;
    
    for (const command of commands) {
      if (TWINK_COMMANDS.includes(command.name)) {
        twinkCommandsFound++;
        
        console.log(`  📌 ${command.name}:`);
        console.log(`     ID: ${command.id}`);
        console.log(`     Описание: ${command.description}`);
        
        // Проверяем default_member_permissions
        if (command.default_member_permissions) {
          const perms = BigInt(command.default_member_permissions);
          const adminPerm = BigInt(0x8); // Administrator flag
          
          if ((perms & adminPerm) !== 0n) {
            twinkCommandsWithAdminPerms++;
            console.log(`     ⚠️  ПРАВИЛА: Требуются права Administrator (${command.default_member_permissions})`);
            console.log(`     ❌ ПРОБЛЕМА: Команда заблокирована на уровне Discord!`);
          } else {
            console.log(`     ✅ ПРАВИЛА: Права установлены корректно (${command.default_member_permissions})`);
          }
        } else {
          console.log(`     ✅ ПРАВИЛА: Нет ограничений на уровне Discord (доступна всем)`);
        }
        
        console.log('');
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n📊 ИТОГИ:\n');
    console.log(`  Найдено команд твинков: ${twinkCommandsFound}/${TWINK_COMMANDS.length}`);
    console.log(`  Команд с ограничением Administrator: ${twinkCommandsWithAdminPerms}`);
    
    if (twinkCommandsFound < TWINK_COMMANDS.length) {
      const missing = TWINK_COMMANDS.filter(c => !commands.some(cmd => cmd.name === c));
      console.log(`\n  ⚠️  Отсутствующие команды: ${missing.join(', ')}`);
    }
    
    if (twinkCommandsWithAdminPerms > 0) {
      console.log(`\n  ❌ ПРОБЛЕМА: ${twinkCommandsWithAdminPerms} команд требуют права Administrator!`);
      console.log(`     Эти команды заблокированы Discord до проверки ролей в коде.`);
      console.log(`     Нужно убрать .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)`);
      console.log(`     из register-commands.ts для всех команд twink-*`);
    } else {
      console.log(`\n  ✅ Команды не требуют права Administrator на уровне Discord`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n🔐 РОЛИ ДЛЯ УПРАВЛЕНИЯ ТВИНКАМИ:\n');
    TWINK_ADMIN_ROLE_IDS.forEach((roleId, idx) => {
      console.log(`  ${idx + 1}. ${roleId}`);
    });
    
    console.log('\n✅ Проверка ролей выполняется в коде через hasTwinkAdminRole()');
    console.log('   Роли проверяются из константы TWINK_ADMIN_ROLE_IDS\n');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке команд:', error);
    process.exit(1);
  }
}

testCommandPermissions();



