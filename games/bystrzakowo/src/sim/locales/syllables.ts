import type { Lang } from '../lang.ts';
import type { Word } from '../syllables.ts';

const WORDS_PL: readonly Word[] = [
  // Dwie sylaby otwarte.
  { item: 'goat', syl: ['KO', 'ZA'], level: 0 },
  { item: 'frog', syl: ['ŻA', 'BA'], level: 0 },
  { item: 'owl', syl: ['SO', 'WA'], level: 0 },
  { item: 'seal', syl: ['FO', 'KA'], level: 0 },
  { item: 'boat', syl: ['ŁÓD', 'KA'], level: 1 },
  { item: 'hen', syl: ['KU', 'RA'], level: 0 },
  { item: 'lalka', syl: ['LAL', 'KA'], level: 1 },
  // Sylaby zamknięte.
  { item: 'kitten', syl: ['KO', 'TEK'], level: 1 },
  { item: 'fish', syl: ['RYB', 'KA'], level: 1 },
  { item: 'car', syl: ['AUT', 'KO'], level: 1 },
  { item: 'banana', syl: ['BA', 'NAN'], level: 1 },
  { item: 'bike', syl: ['RO', 'WER'], level: 1 },
  { item: 'ball', syl: ['PIŁ', 'KA'], level: 1 },
  { item: 'butterfly', syl: ['MO', 'TYL'], level: 1 },
  { item: 'mug', syl: ['KU', 'BEK'], level: 1 },
  // Trzy sylaby.
  { item: 'raspberry', syl: ['MA', 'LI', 'NA'], level: 2 },
  { item: 'tomato', syl: ['PO', 'MI', 'DOR'], level: 2 },
  { item: 'airplane', syl: ['SA', 'MO', 'LOT'], level: 2 },
  { item: 'umbrella', syl: ['PA', 'RA', 'SOL'], level: 2 },
  { item: 'rocket', syl: ['RA', 'KIE', 'TA'], level: 2 },
  { item: 'small-balloon', syl: ['BA', 'LO', 'NIK'], level: 2 },
  { item: 'sun-hat', syl: ['KA', 'PE', 'LUSZ'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'pumpkin', syl: ['DY', 'NIA'], level: 0 },
  { item: 'rainbow', syl: ['TĘ', 'CZA'], level: 0 },
  { item: 'spoon', syl: ['ŁYŻ', 'KA'], level: 0 },
  { item: 'sled', syl: ['SAN', 'KI'], level: 0 },
  { item: 'zebra', syl: ['ZE', 'BRA'], level: 0 },
  { item: 'cow', syl: ['KRO', 'WA'], level: 0 },
  { item: 'bowl', syl: ['MIS', 'KA'], level: 1 },
  { item: 'fox-cub', syl: ['LI', 'SEK'], level: 1 },
  { item: 'robot', syl: ['RO', 'BOT'], level: 1 },
  // Więcej trzech sylab (poziom 2 miał tylko 7 słów).
  { item: 'giraffe', syl: ['ŻY', 'RA', 'FA'], level: 2 },
  { item: 'jellyfish', syl: ['ME', 'DU', 'ZA'], level: 2 },
  { item: 'kite', syl: ['LA', 'TA', 'WIEC'], level: 2 },
  { item: 'rain-boots', syl: ['KA', 'LO', 'SZE'], level: 2 },
  { item: 'bus', syl: ['AU', 'TO', 'BUS'], level: 2 },
  { item: 'pineapple', syl: ['A', 'NA', 'NAS'], level: 2 },
  { item: 'ladybug', syl: ['BIE', 'DRON', 'KA'], level: 2 },
  { item: 'onion', syl: ['CE', 'BU', 'LA'], level: 2 },
];

/** Angielski: podział jak przy klaskaniu sylab w przedszkolu (Ba-na-na). */
const WORDS_EN: readonly Word[] = [
  { item: 'zebra', syl: ['ZE', 'BRA'], level: 0 },
  { item: 'robot', syl: ['RO', 'BOT'], level: 0 },
  { item: 'monkey', syl: ['MON', 'KEY'], level: 0 },
  { item: 'rabbit', syl: ['BUN', 'NY'], level: 0 },
  { item: 'apple', syl: ['AP', 'PLE'], level: 0 },
  { item: 'lemon', syl: ['LE', 'MON'], level: 0 },
  { item: 'penguin', syl: ['PEN', 'GUIN'], level: 1 },
  { item: 'turtle', syl: ['TUR', 'TLE'], level: 1 },
  { item: 'rocket', syl: ['ROCK', 'ET'], level: 1 },
  { item: 'pumpkin', syl: ['PUMP', 'KIN'], level: 1 },
  { item: 'rainbow', syl: ['RAIN', 'BOW'], level: 1 },
  { item: 'dolphin', syl: ['DOL', 'PHIN'], level: 1 },
  { item: 'kitten', syl: ['KIT', 'TEN'], level: 1 },
  { item: 'banana', syl: ['BA', 'NA', 'NA'], level: 2 },
  { item: 'tomato', syl: ['TO', 'MA', 'TO'], level: 2 },
  { item: 'potato', syl: ['PO', 'TA', 'TO'], level: 2 },
  { item: 'butterfly', syl: ['BUT', 'TER', 'FLY'], level: 2 },
  { item: 'octopus', syl: ['OC', 'TO', 'PUS'], level: 2 },
  { item: 'umbrella', syl: ['UM', 'BREL', 'LA'], level: 2 },
  { item: 'dinosaur', syl: ['DI', 'NO', 'SAUR'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'carrot', syl: ['CAR', 'ROT'], level: 0 },
  { item: 'small-balloon', syl: ['BAL', 'LOON'], level: 0 },
  { item: 'tractor', syl: ['TRAC', 'TOR'], level: 0 },
  { item: 'shell', syl: ['SEA', 'SHELL'], level: 0 },
];

/** Niemiecki: Silbenklatschen jak w Kita (Ka-tze → Kat-ze). */
const WORDS_DE: readonly Word[] = [
  { item: 'duck', syl: ['EN', 'TE'], level: 0 },
  { item: 'bee', syl: ['BIE', 'NE'], level: 0 },
  { item: 'bucket', syl: ['EI', 'MER'], level: 0 },
  { item: 'pear', syl: ['BIR', 'NE'], level: 0 },
  { item: 'fork', syl: ['GA', 'BEL'], level: 0 },
  { item: 'lalka', syl: ['PUP', 'PE'], level: 0 },
  { item: 'cat', syl: ['KAT', 'ZE'], level: 1 },
  { item: 'mug', syl: ['TAS', 'SE'], level: 1 },
  { item: 'monkey', syl: ['AF', 'FE'], level: 1 },
  { item: 'sun', syl: ['SON', 'NE'], level: 1 },
  { item: 'cloud', syl: ['WOL', 'KE'], level: 1 },
  { item: 'little-flower', syl: ['BLU', 'ME'], level: 1 },
  { item: 'scooter', syl: ['ROL', 'LER'], level: 1 },
  { item: 'banana', syl: ['BA', 'NA', 'NE'], level: 2 },
  { item: 'tomato', syl: ['TO', 'MA', 'TE'], level: 2 },
  { item: 'rocket', syl: ['RA', 'KE', 'TE'], level: 2 },
  { item: 'lemon', syl: ['ZI', 'TRO', 'NE'], level: 2 },
  { item: 'elephant', syl: ['E', 'LE', 'FANT'], level: 2 },
  { item: 'pineapple', syl: ['A', 'NA', 'NAS'], level: 2 },
  { item: 'pepper', syl: ['PA', 'PRI', 'KA'], level: 2 },
  { item: 'trumpet', syl: ['TROM', 'PE', 'TE'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'trousers', syl: ['HO', 'SE'], level: 0 },
  { item: 'hat', syl: ['MÜT', 'ZE'], level: 0 },
  { item: 'cucumber', syl: ['GUR', 'KE'], level: 0 },
  { item: 'hare', syl: ['HA', 'SE'], level: 0 },
];

/** Hiszpański: sylaby jak w szkole (ga-to, pe-rro, ma-ri-po-sa). */
const WORDS_ES: readonly Word[] = [
  { item: 'cat', syl: ['GA', 'TO'], level: 0 },
  { item: 'cow', syl: ['VA', 'CA'], level: 0 },
  { item: 'duck', syl: ['PA', 'TO'], level: 0 },
  { item: 'frog', syl: ['RA', 'NA'], level: 0 },
  { item: 'bear', syl: ['O', 'SO'], level: 0 },
  { item: 'moon', syl: ['LU', 'NA'], level: 0 },
  { item: 'monkey', syl: ['MO', 'NO'], level: 0 },
  { item: 'dog', syl: ['PE', 'RRO'], level: 1 },
  { item: 'tree', syl: ['ÁR', 'BOL'], level: 1 },
  { item: 'octopus', syl: ['PUL', 'PO'], level: 1 },
  { item: 'pig', syl: ['CER', 'DO'], level: 1 },
  { item: 'goat', syl: ['CA', 'BRA'], level: 1 },
  { item: 'mug', syl: ['TA', 'ZA'], level: 1 },
  { item: 'horse', syl: ['CA', 'BA', 'LLO'], level: 2 },
  { item: 'rabbit', syl: ['CO', 'NE', 'JO'], level: 2 },
  { item: 'tomato', syl: ['TO', 'MA', 'TE'], level: 2 },
  { item: 'ball', syl: ['PE', 'LO', 'TA'], level: 2 },
  { item: 'giraffe', syl: ['JI', 'RA', 'FA'], level: 2 },
  { item: 'bird', syl: ['PÁ', 'JA', 'RO'], level: 2 },
  { item: 'butterfly', syl: ['MA', 'RI', 'PO', 'SA'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'seal', syl: ['FO', 'CA'], level: 0 },
  { item: 'cloud', syl: ['NU', 'BE'], level: 0 },
  { item: 'pear', syl: ['PE', 'RA'], level: 0 },
  { item: 'potato', syl: ['PA', 'PA'], level: 0 },
];

/** Słowa w każdym języku (nagrania „czytaj-<obiekt>” są osobne dla każdego języka). */
export const WORDS_BY_LANG: Record<Lang, readonly Word[]> = { pl: WORDS_PL, en: WORDS_EN, de: WORDS_DE, es: WORDS_ES };
