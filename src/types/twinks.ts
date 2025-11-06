export type NationCode = 'de' | 'ru' | 'us' | 'jp' | 'gb' | 'fr' | 'it' | 'ch' | 'is' | 'sw';

export type VehicleType = 'ground' | 'airplane' | 'helicopter';

export interface Vehicle {
  name: string;
  br: number;
  nation: NationCode;
  type: VehicleType;
}

export interface TwinkData {
  id: string;
  username: string;
  login?: string;
  password?: string;
  has2FA: boolean;
  twoFactorContact?: string;
  vehicles: Vehicle[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TwinkHistory {
  twinks: TwinkData[];
  lastUpdated: string;
}

export const NATION_NAMES: Record<NationCode, string> = {
  de: 'Германия',
  ru: 'СССР/Россия',
  us: 'США',
  jp: 'Япония',
  gb: 'Великобритания',
  fr: 'Франция',
  it: 'Италия',
  ch: 'Китай',
  is: 'Израиль',
  sw: 'Швеция'
};

export const VEHICLE_TYPE_NAMES: Record<VehicleType, string> = {
  ground: 'Наземная техника',
  airplane: 'Самолёты',
  helicopter: 'Вертолёты'
};
