// Тест различных функций нормализации
function normalize1(nick) {
  return nick.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalize2(nick) {
  return nick.toLowerCase().replace(/[^a-z0-9а-яё]/g, '');
}

function normalize3(nick) {
  return nick.toLowerCase();
}

const testNicks = [
  'Джaмбо',
  'джaмбо', 
  'DeDky4er',
  'dedky4er',
  'Mawiile',
  'mawiile',
  'Спермококус',
  'спермококус'
];

console.log('=== ТЕСТ НОРМАЛИЗАЦИИ НИКНЕЙМОВ ===\n');

console.log('Функция 1 (только латиница):');
testNicks.forEach(nick => {
  console.log(`${nick} -> ${normalize1(nick)}`);
});

console.log('\nФункция 2 (латиница + кириллица):');
testNicks.forEach(nick => {
  console.log(`${nick} -> ${normalize2(nick)}`);
});

console.log('\nФункция 3 (только нижний регистр):');
testNicks.forEach(nick => {
  console.log(`${nick} -> ${normalize3(nick)}`);
});

// Проверим совпадения
console.log('\n=== ПРОВЕРКА СОВПАДЕНИЙ ===');
const pairs = [
  ['Джaмбо', 'джaмбо'],
  ['DeDky4er', 'dedky4er'],
  ['Mawiile', 'mawiile'],
  ['Спермококус', 'спермококус']
];

pairs.forEach(([nick1, nick2]) => {
  const norm1_1 = normalize1(nick1);
  const norm1_2 = normalize1(nick2);
  const norm2_1 = normalize2(nick1);
  const norm2_2 = normalize2(nick2);
  const norm3_1 = normalize3(nick1);
  const norm3_2 = normalize3(nick2);
  
  console.log(`${nick1} vs ${nick2}:`);
  console.log(`  Функция 1: ${norm1_1} === ${norm1_2} -> ${norm1_1 === norm1_2}`);
  console.log(`  Функция 2: ${norm2_1} === ${norm2_2} -> ${norm2_1 === norm2_2}`);
  console.log(`  Функция 3: ${norm3_1} === ${norm3_2} -> ${norm3_1 === norm3_2}`);
  console.log('');
});

