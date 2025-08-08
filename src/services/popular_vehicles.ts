// Популярные идентификаторы техники для улучшения поиска
export const POPULAR_VEHICLES: { [key: string]: string[] } = {
  // Французская авиация
  'rafale': ['rafale_c_f3', 'rafale_c', 'rafale_f3'],
  'mirage': ['mirage_2000_5f', 'mirage_2000c_s5', 'mirage_iiic', 'mirage_f1c'],
  
  // Американская авиация
  'f-16': ['f_16c_block_50', 'f_16a_block_15_adf', 'f_16am_block_15_mlu_belgium', 'f_16c_block_52d'],
  'f16': ['f_16c_block_50', 'f_16a_block_15_adf', 'f_16am_block_15_mlu_belgium', 'f_16c_block_52d'],
  'f-18': ['f_18c', 'f_18a'],
  'f18': ['f_18c', 'f_18a'],
  'f-15': ['f_15e', 'f_15c_msip_ii', 'f_15a'],
  'f15': ['f_15e', 'f_15c_msip_ii', 'f_15a'],
  'f-14': ['f_14a_early', 'f_14b'],
  'f14': ['f_14a_early', 'f_14b'],
  'f-4': ['f_4e', 'f_4c', 'f_4j'],
  'f4': ['f_4e', 'f_4c', 'f_4j'],
  'a-10': ['a_10a', 'a_10c'],
  'a10': ['a_10a', 'a_10c'],
  
  // Немецкая авиация
  'eurofighter': ['eurofighter_typhoon_da7', 'eurofighter_typhoon'],
  'tornado': ['tornado_ids_wtd61', 'tornado_gr1'],
  'phantom': ['f_4f_early', 'f_4f'],
  
  // Российская авиация
  'su-27': ['su_27', 'su_27sm'],
  'su27': ['su_27', 'su_27sm'],
  'su-30': ['su_30sm'],
  'su30': ['su_30sm'],
  'su-34': ['su_34'],
  'su34': ['su_34'],
  'mig-29': ['mig_29smt', 'mig_29'],
  'mig29': ['mig_29smt', 'mig_29'],
  'mig-31': ['mig_31'],
  'mig31': ['mig_31'],
  
  // Британская авиация
  'gripen': ['jas39c', 'jas39a'],
  'harrier': ['harrier_gr7', 'harrier_gr3'],
  'jaguar': ['jaguar_gr1a', 'jaguar_a'],
  
  // Наземная техника - США
  'abrams': ['m1a2_sep_v2', 'm1a2_abrams', 'm1a1_abrams', 'm1_abrams'],
  'm1a2': ['m1a2_sep_v2', 'm1a2_abrams'],
  'm1a1': ['m1a1_abrams'],
  'bradley': ['m3_bradley', 'm2_bradley'],
  
  // Наземная техника - Германия
  'leopard': ['leopard_2a7v', 'leopard_2a6', 'leopard_2a5', 'leopard_2a4', 'leopard_2k', 'leopard_1a5'],
  'leopard2': ['leopard_2a7v', 'leopard_2a6', 'leopard_2a5', 'leopard_2a4'],
  'leopard1': ['leopard_1a5', 'leopard_1'],
  'puma': ['puma_ifv'],
  
  // Наземная техника - Россия
  't-80': ['t_80bvm', 't_80u', 't_80b', 't_80uk'],
  't80': ['t_80bvm', 't_80u', 't_80b', 't_80uk'],
  't-90': ['t_90m', 't_90a'],
  't90': ['t_90m', 't_90a'],
  't-72': ['t_72b3', 't_72b', 't_72a'],
  't72': ['t_72b3', 't_72b', 't_72a'],
  'bmp': ['bmp_3', 'bmp_2m', 'bmp_2', 'bmp_1'],
  
  // Наземная техника - Британия
  'challenger': ['challenger_3_td', 'challenger_2_tes', 'challenger_2', 'challenger_mk3'],
  'warrior': ['warrior'],
  
  // Наземная техника - Франция
  'leclerc': ['leclerc_s2', 'leclerc'],
  'amx': ['amx_56', 'amx_50', 'amx_13'],
  
  // Флот
  'bismarck': ['battleship_bismarck'],
  'yamato': ['battleship_yamato'],
  'iowa': ['battleship_iowa'],
  'hood': ['battlecruiser_hood'],
  
  // Вертолеты
  'apache': ['ah_64d_longbow', 'ah_64a_peten'],
  'ka-50': ['ka_50', 'ka_52'],
  'ka50': ['ka_50', 'ka_52'],
  'ka-52': ['ka_52'],
  'ka52': ['ka_52'],
  'mi-28': ['mi_28n'],
  'mi28': ['mi_28n'],
};

// Функция для получения возможных идентификаторов по поисковому запросу
export function getPossibleIdentifiers(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const identifiers: string[] = [];
  
  // Базовые варианты преобразования
  const baseVariants = [
    query.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_'),
    query.toLowerCase().replace(/\s+/g, '_'),
    query.toLowerCase().replace(/\s+/g, '').replace(/-/g, '_'),
    query.toLowerCase().replace(/[\s-]/g, '_'),
    query.trim().toLowerCase().replace(/\s+/g, '_')
  ];
  
  identifiers.push(...baseVariants);
  
  // Поиск в популярных техниках
  for (const [keyword, vehicles] of Object.entries(POPULAR_VEHICLES)) {
    if (lowerQuery.includes(keyword)) {
      identifiers.push(...vehicles);
    }
  }
  
  // Специальные правила для некоторых случаев
  if (lowerQuery.includes('belgium') || lowerQuery.includes('belgian')) {
    identifiers.push('f_16am_block_15_mlu_belgium');
  }
  
  if (lowerQuery.includes('netherlands') || lowerQuery.includes('dutch')) {
    identifiers.push('f_16am_block_15_mlu_netherlands');
  }
  
  if (lowerQuery.includes('sherman')) {
    identifiers.push('fr_m4a3_105_sherman', 'us_m4a3_105_sherman', 'm4a3_105_sherman');
  }
  
  // Удаляем дубликаты
  return [...new Set(identifiers)];
} 