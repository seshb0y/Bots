import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Vehicle, VehicleListItem, Weapon, WeaponPreset } from '../services/wtvehicles';

export class VehicleFormatter {
  /**
   * Форматирует название техники для отображения
   */
  static formatVehicleName(identifier: string): string {
    return identifier
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Получает флаг страны
   */
  static getCountryFlag(country: string): string {
    const flags: { [key: string]: string } = {
      'usa': '🇺🇸',
      'germany': '🇩🇪',
      'ussr': '🇷🇺',
      'britain': '🇬🇧',
      'japan': '🇯🇵',
      'china': '🇨🇳',
      'italy': '🇮🇹',
      'france': '🇫🇷',
      'sweden': '🇸🇪',
      'israel': '🇮🇱'
    };
    return flags[country.toLowerCase()] || '🏳️';
  }

  /**
   * Форматирует тип техники
   */
  static formatVehicleType(type: string): string {
    const types: { [key: string]: string } = {
      'fighter': '✈️ Истребитель',
      'attacker': '🚀 Штурмовик',
      'bomber': '💣 Бомбардировщик',
      'tank': '🚗 Танк',
      'spaa': '🎯 ЗСУ',
      'tank_destroyer': '💥 ПТ-САУ',
      'light_tank': '🏃 Легкий танк',
      'medium_tank': '⚖️ Средний танк',
      'heavy_tank': '🛡️ Тяжелый танк',
      'ship': '🚢 Корабль',
      'boat': '⛵ Катер',
      'helicopter': '🚁 Вертолет'
    };
    return types[type.toLowerCase()] || `🔧 ${type}`;
  }

  /**
   * Создает embed с информацией о технике
   */
  static createVehicleEmbed(vehicle: Vehicle): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`${this.getCountryFlag(vehicle.country)} ${this.formatVehicleName(vehicle.identifier)}`)
      .setDescription(`${this.formatVehicleType(vehicle.vehicle_type)} • Эра ${vehicle.era}`)
      .setColor(this.getVehicleColor(vehicle))
      .setThumbnail(vehicle.images.image);

    // Боевые рейтинги
    embed.addFields({
      name: '🎯 Боевые рейтинги',
      value: `**Аркада:** ${vehicle.arcade_br}\n**Реалистичные:** ${vehicle.realistic_br}\n**Симулятор:** ${vehicle.simulator_br}`,
      inline: true
    });

    // Характеристики двигателя
    if (vehicle.engine.max_speed_rb_sb > 0) {
      embed.addFields({
        name: '🏃 Скорость',
        value: `**Макс. скорость:** ${vehicle.engine.max_speed_rb_sb} км/ч\n**Масса:** ${(vehicle.mass / 1000).toFixed(1)} т`,
        inline: true
      });
    }

    // Экономика
    embed.addFields({
      name: '💰 Экономика',
      value: `**Стоимость:** ${this.formatNumber(vehicle.value)} 🦁\n**Опыт:** ${this.formatNumber(vehicle.req_exp)} ⭐\n**Ремонт (РБ):** ${this.formatNumber(vehicle.repair_cost_realistic)} 🦁`,
      inline: true
    });

    // Особенности
    const features: string[] = [];
    if (vehicle.is_premium) features.push('💎 Премиум');
    if (vehicle.is_pack) features.push('📦 Пак');
    if (vehicle.squadron_vehicle) features.push('👥 Эскадрон');
    if (vehicle.event) features.push('🎪 Событие');
    if (vehicle.on_marketplace) features.push('🏪 Маркет');

    if (features.length > 0) {
      embed.addFields({
        name: '✨ Особенности',
        value: features.join('\n'),
        inline: true
      });
    }

    // Аэродинамика для самолетов
    if (vehicle.aerodynamics && vehicle.vehicle_type === 'fighter') {
      embed.addFields({
        name: '✈️ Аэродинамика',
        value: `**Время виража:** ${vehicle.aerodynamics.turn_time}с\n**Потолок:** ${this.formatNumber(vehicle.aerodynamics.max_altitude)}м\n**Длина ВПП:** ${vehicle.aerodynamics.runway_length_required}м`,
        inline: true
      });
    }

    // Баллистический компьютер
    if (vehicle.ballistic_computer) {
      const bcFeatures: string[] = [];
      if (vehicle.ballistic_computer.gun_ccip) bcFeatures.push('🎯 CCIP пушки');
      if (vehicle.ballistic_computer.bombs_ccip) bcFeatures.push('💣 CCIP бомб');
      if (vehicle.ballistic_computer.rocket_ccip) bcFeatures.push('🚀 CCIP ракет');
      if (vehicle.ballistic_computer.bombs_ccrp) bcFeatures.push('🎯 CCRP бомб');

      if (bcFeatures.length > 0) {
        embed.addFields({
          name: '🖥️ Баллистический компьютер',
          value: bcFeatures.join('\n'),
          inline: true
        });
      }
    }

    // Дата релиза
    if (vehicle.release_date) {
      embed.setFooter({ text: `Добавлена: ${vehicle.release_date} • Версия: ${vehicle.version}` });
    }

    return embed;
  }

  /**
   * Создает краткий embed для списка техники
   */
  static createVehicleListEmbed(vehicles: VehicleListItem[], title: string = 'Техника War Thunder'): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor('#00ff00');

    if (vehicles.length === 0) {
      embed.setDescription('Техника не найдена.');
      return embed;
    }

    const vehicleList = vehicles.slice(0, 20).map((vehicle, index) => {
      const flag = this.getCountryFlag(vehicle.country);
      const type = this.formatVehicleType(vehicle.vehicle_type);
      const name = this.formatVehicleName(vehicle.identifier);
      const br = `${vehicle.realistic_br}`;
      const features = [];
      
      if (vehicle.is_premium) features.push('💎');
      if (vehicle.is_pack) features.push('📦');
      if (vehicle.squadron_vehicle) features.push('👥');
      if (vehicle.event) features.push('🎪');

      return `${index + 1}. ${flag} **${name}** (${br}) ${features.join('')}`;
    }).join('\n');

    embed.setDescription(vehicleList);

    if (vehicles.length > 20) {
      embed.setFooter({ text: `Показано 20 из ${vehicles.length} техник` });
    }

    return embed;
  }

  /**
   * Создает embed для сравнения техники
   */
  static createComparisonEmbed(
    vehicle1: Vehicle, 
    vehicle2: Vehicle, 
    comparison: any
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('⚖️ Сравнение техники')
      .setColor('#ffff00');

    // Названия техник
    embed.addFields({
      name: '🔴 Техника 1',
      value: `${this.getCountryFlag(vehicle1.country)} **${this.formatVehicleName(vehicle1.identifier)}**`,
      inline: true
    });

    embed.addFields({
      name: '🔵 Техника 2',
      value: `${this.getCountryFlag(vehicle2.country)} **${this.formatVehicleName(vehicle2.identifier)}**`,
      inline: true
    });

    embed.addFields({ name: '\u200B', value: '\u200B', inline: true });

    // Сравнение BR
    embed.addFields({
      name: '🎯 Боевые рейтинги',
      value: `**Аркада:** ${vehicle1.arcade_br} vs ${vehicle2.arcade_br} (${this.formatDifference(comparison.br_difference.arcade)})\n**Реалистичные:** ${vehicle1.realistic_br} vs ${vehicle2.realistic_br} (${this.formatDifference(comparison.br_difference.realistic)})\n**Симулятор:** ${vehicle1.simulator_br} vs ${vehicle2.simulator_br} (${this.formatDifference(comparison.br_difference.simulator)})`,
      inline: false
    });

    // Сравнение производительности
    if (comparison.performance) {
      embed.addFields({
        name: '🏃 Производительность',
        value: `**Скорость:** ${vehicle1.engine.max_speed_rb_sb} vs ${vehicle2.engine.max_speed_rb_sb} км/ч (${this.formatDifference(comparison.performance.max_speed_difference)} км/ч)\n**Масса:** ${(vehicle1.mass/1000).toFixed(1)} vs ${(vehicle2.mass/1000).toFixed(1)} т (${this.formatDifference(comparison.performance.mass_difference/1000, 1)} т)\n**Время виража:** ${vehicle1.aerodynamics?.turn_time || 'Н/Д'} vs ${vehicle2.aerodynamics?.turn_time || 'Н/Д'} с`,
        inline: false
      });
    }

    // Сравнение экономики
    embed.addFields({
      name: '💰 Экономика',
      value: `**Стоимость:** ${this.formatNumber(vehicle1.value)} vs ${this.formatNumber(vehicle2.value)} 🦁 (${this.formatDifference(comparison.economy.value_difference, 0, true)})\n**Ремонт (РБ):** ${this.formatNumber(vehicle1.repair_cost_realistic)} vs ${this.formatNumber(vehicle2.repair_cost_realistic)} 🦁 (${this.formatDifference(comparison.economy.repair_cost_difference.realistic, 0, true)})`,
      inline: false
    });

    return embed;
  }

  /**
   * Создает embed с оружием техники
   */
  static createWeaponsEmbed(vehicle: Vehicle): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`🔫 Вооружение: ${this.formatVehicleName(vehicle.identifier)}`)
      .setColor('#ff6600')
      .setThumbnail(vehicle.images.image);

    if (!vehicle.presets || vehicle.presets.length === 0) {
      embed.setDescription('Информация о вооружении недоступна.');
      return embed;
    }

    // Показываем первые 3 пресета
    vehicle.presets.slice(0, 3).forEach((preset, index) => {
      const weaponsList = preset.weapons.map(weapon => {
        const weaponType = this.getWeaponTypeEmoji(weapon.weapon_type);
        const ammoInfo = weapon.ammos[0];
        let info = `${weaponType} **${weapon.name.replace(/_/g, ' ')}** x${weapon.count}`;
        
        if (ammoInfo) {
          if (ammoInfo.explosive_mass && ammoInfo.explosive_mass > 0) {
            info += ` (💥 ${ammoInfo.explosive_mass}кг ${ammoInfo.explosive_type || ''})`;
          }
          if (ammoInfo.max_distance && ammoInfo.max_distance > 0) {
            info += ` (📏 ${(ammoInfo.max_distance / 1000).toFixed(1)}км)`;
          }
        }
        
        return info;
      }).join('\n');

      embed.addFields({
        name: `📋 Пресет ${index + 1}: ${preset.name.replace(/_/g, ' ')}`,
        value: weaponsList || 'Нет оружия',
        inline: false
      });
    });

    if (vehicle.presets.length > 3) {
      embed.setFooter({ text: `Показано 3 из ${vehicle.presets.length} пресетов` });
    }

    return embed;
  }

  /**
   * Получает эмодзи для типа оружия
   */
  private static getWeaponTypeEmoji(weaponType: string): string {
    const emojis: { [key: string]: string } = {
      'cannon': '🔫',
      'rocket': '🚀',
      'bomb': '💣',
      'payload': '📦',
      'torpedo': '🐟'
    };
    return emojis[weaponType] || '⚔️';
  }

  /**
   * Получает цвет для embed в зависимости от типа техники
   */
  private static getVehicleColor(vehicle: Vehicle): number {
    if (vehicle.is_premium) return 0xFFD700; // Золотой для премиума
    if (vehicle.is_pack) return 0xFF6B35; // Оранжевый для паков
    if (vehicle.squadron_vehicle) return 0x9B59B6; // Фиолетовый для эскадрона
    if (vehicle.event) return 0xE74C3C; // Красный для событий
    
    // Цвета по типам техники
    switch (vehicle.vehicle_type) {
      case 'fighter': return 0x3498DB; // Синий
      case 'attacker': return 0xE67E22; // Оранжевый
      case 'bomber': return 0x95A5A6; // Серый
      case 'tank': return 0x27AE60; // Зеленый
      case 'ship': return 0x2980B9; // Темно-синий
      case 'helicopter': return 0xF39C12; // Желтый
      default: return 0x34495E; // Темно-серый
    }
  }

  /**
   * Форматирует числа с разделителями
   */
  private static formatNumber(num: number): string {
    return num.toLocaleString('ru-RU');
  }

  /**
   * Форматирует разность значений
   */
  private static formatDifference(diff: number, decimals: number = 2, isEconomy: boolean = false): string {
    const sign = diff > 0 ? '+' : '';
    const formatted = decimals === 0 ? diff.toString() : diff.toFixed(decimals);
    
    if (isEconomy) {
      return `${sign}${this.formatNumber(parseFloat(formatted))}`;
    }
    
    return `${sign}${formatted}`;
  }
} 