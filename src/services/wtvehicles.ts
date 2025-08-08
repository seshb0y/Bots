import axios from 'axios';
import { getPossibleIdentifiers } from './popular_vehicles';

const BASE_URL = 'https://www.wtvehiclesapi.sgambe.serv00.net/api';

export interface Vehicle {
  identifier: string;
  country: string;
  vehicle_type: string;
  vehicle_sub_types: string[];
  event: string | null;
  release_date: string;
  version: string;
  era: number;
  arcade_br: number;
  realistic_br: number;
  realistic_ground_br: number;
  simulator_br: number;
  simulator_ground_br: number;
  value: number;
  req_exp: number;
  is_premium: boolean;
  is_pack: boolean;
  on_marketplace: boolean;
  squadron_vehicle: boolean;
  ge_cost: number;
  crew_total_count: number;
  visibility: number;
  hull_armor: any[];
  turret_armor: any[];
  mass: number;
  train1_cost: number;
  train2_cost: number;
  train3_cost_gold: number;
  train3_cost_exp: number;
  sl_mul_arcade: number;
  sl_mul_realistic: number;
  sl_mul_simulator: number;
  exp_mul: number;
  repair_time_arcade: number;
  repair_time_realistic: number;
  repair_time_simulator: number;
  repair_time_no_crew_arcade: number;
  repair_time_no_crew_realistic: number;
  repair_time_no_crew_simulator: number;
  repair_cost_arcade: number;
  repair_cost_realistic: number;
  repair_cost_simulator: number;
  repair_cost_per_min_arcade: number;
  repair_cost_per_min_realistic: number;
  repair_cost_per_min_simulator: number;
  repair_cost_full_upgraded_arcade: number;
  repair_cost_full_upgraded_realistic: number;
  repair_cost_full_upgraded_simulator: number;
  required_vehicle: string | null;
  engine: {
    horse_power_ab: number;
    horse_power_rb_sb: number;
    max_rpm: number;
    min_rpm: number;
    max_speed_ab: number;
    max_reverse_speed_ab: number;
    max_speed_rb_sb: number;
    max_reverse_speed_rb_sb: number;
  };
  modifications: Modification[];
  ir_devices: any;
  thermal_devices: any;
  ballistic_computer: {
    gun_ccip: boolean;
    turret_ccip: boolean;
    bombs_ccip: boolean;
    rocket_ccip: boolean;
    gun_ccrp: boolean;
    turret_ccrp: boolean;
    bombs_ccrp: boolean;
    rocket_ccrp: boolean;
  };
  aerodynamics: {
    length: number;
    wingspan: number;
    wing_area: number;
    empty_weight: number;
    max_takeoff_weight: number;
    max_altitude: number;
    turn_time: number;
    runway_length_required: number;
    max_speed_at_altitude: number;
  };
  has_customizable_weapons: boolean;
  weapons: any[];
  presets: WeaponPreset[];
  customizable_presets: any;
  versions: string[];
  images: {
    image: string;
    techtree: string;
  };
}

export interface Modification {
  name: string;
  tier: number;
  repair_coeff: number;
  value: number;
  req_exp: number;
  ge_cost: number;
  required_modification: string | null;
  mod_class: string;
  icon: string;
}

export interface WeaponPreset {
  name: string;
  weapons: Weapon[];
}

export interface Weapon {
  name: string;
  weapon_type: string;
  count: number;
  ammos: Ammo[];
}

export interface Ammo {
  name: string | null;
  type: string | null;
  caliber: number | null;
  mass: number;
  speed: number | null;
  max_distance: number | null;
  explosive_type: string | null;
  explosive_mass: number | null;
}

export interface VehicleListItem {
  identifier: string;
  country: string;
  vehicle_type: string;
  vehicle_sub_types: string[];
  era: number;
  arcade_br: number;
  realistic_br: number;
  simulator_br: number;
  is_premium: boolean;
  is_pack: boolean;
  squadron_vehicle: boolean;
  event: string | null;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export class WTVehiclesAPI {
  private static async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Discord Bot - WT Vehicles Info'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Получить список всех техник
   */
  static async getVehiclesList(filters?: {
    country?: string;
    vehicle_type?: string;
    era?: number;
    br_min?: number;
    br_max?: number;
    is_premium?: boolean;
    is_pack?: boolean;
    squadron_vehicle?: boolean;
    limit?: number;
  }): Promise<VehicleListItem[]> {
    let endpoint = '/vehicles';
    
    const params = new URLSearchParams();
    
    // Добавляем лимит по умолчанию для получения большего количества записей
    if (!filters?.limit) {
      params.append('limit', '1000');
    }
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.makeRequest<VehicleListItem[]>(endpoint);
  }

  /**
   * Получить детальную информацию о технике
   */
  static async getVehicle(identifier: string): Promise<Vehicle> {
    return this.makeRequest<Vehicle>(`/vehicles/${identifier}`);
  }

  /**
   * Поиск техники по названию
   */
  static async searchVehicles(query: string): Promise<VehicleListItem[]> {
    try {
      // Получаем возможные идентификаторы для поиска
      const searchVariants = getPossibleIdentifiers(query);

      // Пробуем прямой доступ для каждого варианта
      for (const variant of searchVariants) {
        try {
          const directVehicle = await this.getVehicle(variant);
          return [{
            identifier: directVehicle.identifier,
            country: directVehicle.country,
            vehicle_type: directVehicle.vehicle_type,
            vehicle_sub_types: directVehicle.vehicle_sub_types,
            era: directVehicle.era,
            arcade_br: directVehicle.arcade_br,
            realistic_br: directVehicle.realistic_br,
            simulator_br: directVehicle.simulator_br,
            is_premium: directVehicle.is_premium,
            is_pack: directVehicle.is_pack,
            squadron_vehicle: directVehicle.squadron_vehicle,
            event: directVehicle.event
          }];
        } catch {
          // Продолжаем со следующим вариантом
        }
      }

      // Поиск через различные комбинации фильтров
      const searchTerms = query.toLowerCase().split(/[\s_-]+/);
      const results: VehicleListItem[] = [];
      
      // Попробуем поиск по странам и типам техники
      const countries = ['usa', 'germany', 'ussr', 'britain', 'japan', 'china', 'italy', 'france', 'sweden', 'israel'];
      const types = ['fighter', 'attacker', 'bomber', 'tank', 'spaa', 'tank_destroyer', 'light_tank', 'medium_tank', 'heavy_tank', 'ship', 'boat', 'helicopter'];
      
      // Определяем возможную страну и тип из запроса
      let possibleCountry: string | undefined;
      let possibleType: string | undefined;
      
      for (const term of searchTerms) {
        if (countries.includes(term)) {
          possibleCountry = term;
        }
        if (types.includes(term)) {
          possibleType = term;
        }
        // Обработка специальных случаев
        if (term.includes('f16') || term.includes('f-16')) {
          possibleType = 'fighter';
        }
        if (term === 'belgium' || term === 'netherlands') {
          possibleCountry = 'britain'; // Техника Бельгии/Нидерландов часто в британской ветке
        }
        if (term === 'rafale') {
          possibleCountry = 'france';
          possibleType = 'fighter';
        }
      }
      
      // Поиск с фильтрами
      const filters: any = {};
      if (possibleCountry) filters.country = possibleCountry;
      if (possibleType) filters.vehicle_type = possibleType;
      
      let vehiclesList: VehicleListItem[] = [];
      
      // Получаем список с фильтрами или без них
      if (Object.keys(filters).length > 0) {
        vehiclesList = await this.getVehiclesList(filters);
      } else {
        // Если фильтры не определены, получаем больший список
        vehiclesList = await this.getVehiclesList();
      }
      
             // Фильтруем результаты по поисковому запросу
       const searchQuery = query.toLowerCase().replace(/[\s-]/g, '_');
             const queryVariants = [
         searchQuery,
         searchQuery.replace(/_/g, ''),
         searchQuery.replace(/_/g, ' '),
         query.toLowerCase().replace(/\s+/g, '_')
       ];
      
      const filteredResults = vehiclesList.filter(vehicle => {
        const vehicleId = vehicle.identifier.toLowerCase();
        
        return queryVariants.some(variant => 
          vehicleId.includes(variant) ||
          variant.split(/[\s_]/).every(term => 
            term.length > 2 && vehicleId.includes(term)
          )
        );
      });
      
      results.push(...filteredResults);
      
      // Если ничего не найдено, попробуем более широкий поиск
      if (results.length === 0 && searchTerms.length > 0) {
        const broadSearch = await this.getVehiclesList();
        const broadResults = broadSearch.filter(vehicle => {
          const vehicleId = vehicle.identifier.toLowerCase();
          return searchTerms.some(term => 
            term.length > 2 && vehicleId.includes(term)
          );
        });
        results.push(...broadResults);
      }
      
      // Удаляем дубликаты и ограничиваем результаты
      const uniqueResults = results.filter((vehicle, index, self) => 
        index === self.findIndex(v => v.identifier === vehicle.identifier)
      );
      
      return uniqueResults.slice(0, 10);
      
    } catch (error) {
      console.error('Ошибка поиска техники:', error);
      return [];
    }
  }

  /**
   * Получить техники определенной страны
   */
  static async getVehiclesByCountry(country: string): Promise<VehicleListItem[]> {
    return this.getVehiclesList({ country: country.toLowerCase() });
  }

  /**
   * Получить техники определенного типа
   */
  static async getVehiclesByType(type: string): Promise<VehicleListItem[]> {
    return this.getVehiclesList({ vehicle_type: type.toLowerCase() });
  }

  /**
   * Получить техники определенной эры
   */
  static async getVehiclesByEra(era: number): Promise<VehicleListItem[]> {
    return this.getVehiclesList({ era });
  }

  /**
   * Получить премиумные техники
   */
  static async getPremiumVehicles(): Promise<VehicleListItem[]> {
    return this.getVehiclesList({ is_premium: true });
  }

  /**
   * Получить пакетные техники
   */
  static async getPackVehicles(): Promise<VehicleListItem[]> {
    return this.getVehiclesList({ is_pack: true });
  }

  /**
   * Получить эскадронные техники
   */
  static async getSquadronVehicles(): Promise<VehicleListItem[]> {
    return this.getVehiclesList({ squadron_vehicle: true });
  }

  /**
   * Сравнить две техники
   */
  static async compareVehicles(identifier1: string, identifier2: string): Promise<{
    vehicle1: Vehicle;
    vehicle2: Vehicle;
    comparison: {
      br_difference: {
        arcade: number;
        realistic: number;
        simulator: number;
      };
      performance: {
        max_speed_difference: number;
        mass_difference: number;
        turn_time_difference: number;
      };
      economy: {
        value_difference: number;
        repair_cost_difference: {
          arcade: number;
          realistic: number;
          simulator: number;
        };
      };
    };
  }> {
    const [vehicle1, vehicle2] = await Promise.all([
      this.getVehicle(identifier1),
      this.getVehicle(identifier2)
    ]);

    const comparison = {
      br_difference: {
        arcade: vehicle2.arcade_br - vehicle1.arcade_br,
        realistic: vehicle2.realistic_br - vehicle1.realistic_br,
        simulator: vehicle2.simulator_br - vehicle1.simulator_br,
      },
      performance: {
        max_speed_difference: vehicle2.engine.max_speed_rb_sb - vehicle1.engine.max_speed_rb_sb,
        mass_difference: vehicle2.mass - vehicle1.mass,
        turn_time_difference: vehicle2.aerodynamics.turn_time - vehicle1.aerodynamics.turn_time,
      },
      economy: {
        value_difference: vehicle2.value - vehicle1.value,
        repair_cost_difference: {
          arcade: vehicle2.repair_cost_arcade - vehicle1.repair_cost_arcade,
          realistic: vehicle2.repair_cost_realistic - vehicle1.repair_cost_realistic,
          simulator: vehicle2.repair_cost_simulator - vehicle1.repair_cost_simulator,
        },
      },
    };

    return { vehicle1, vehicle2, comparison };
  }
} 