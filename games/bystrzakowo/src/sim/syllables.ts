/**
 * Sylaby (Warsztat Bazyla): obrazek i rozsypane kafelki z sylabami; dziecko układa je po kolei,
 * Lusia czyta sylabami i całe słowo („Ko… za… Koza!”). Przygotowanie do czytania (zerówka).
 * Podział zgodny z tym, jak dzieli się słowa w przedszkolu (sylaby otwarte najpierw).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { lang, type Lang } from './lang.ts';
import { mixRound } from './letters.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const SYLLABLE_ROUND = 4;

export interface Word {
  /** Obiekt z katalogu (obrazek). */
  item: string;
  syl: string[];
  level: number;
}

const WORDS_PL: readonly Word[] = [
  // Dwie sylaby otwarte.
  { item: 'koza', syl: ['KO', 'ZA'], level: 0 },
  { item: 'zaba', syl: ['ŻA', 'BA'], level: 0 },
  { item: 'sowa', syl: ['SO', 'WA'], level: 0 },
  { item: 'foka', syl: ['FO', 'KA'], level: 0 },
  { item: 'lodka', syl: ['ŁÓD', 'KA'], level: 1 },
  { item: 'kura', syl: ['KU', 'RA'], level: 0 },
  { item: 'lalka', syl: ['LAL', 'KA'], level: 1 },
  // Sylaby zamknięte.
  { item: 'kotek', syl: ['KO', 'TEK'], level: 1 },
  { item: 'ryba', syl: ['RYB', 'KA'], level: 1 },
  { item: 'auto', syl: ['AUT', 'KO'], level: 1 },
  { item: 'banan', syl: ['BA', 'NAN'], level: 1 },
  { item: 'rower', syl: ['RO', 'WER'], level: 1 },
  { item: 'pilka', syl: ['PIŁ', 'KA'], level: 1 },
  { item: 'motyl', syl: ['MO', 'TYL'], level: 1 },
  { item: 'kubek', syl: ['KU', 'BEK'], level: 1 },
  // Trzy sylaby.
  { item: 'malina', syl: ['MA', 'LI', 'NA'], level: 2 },
  { item: 'pomidor', syl: ['PO', 'MI', 'DOR'], level: 2 },
  { item: 'samolot', syl: ['SA', 'MO', 'LOT'], level: 2 },
  { item: 'parasol', syl: ['PA', 'RA', 'SOL'], level: 2 },
  { item: 'rakieta', syl: ['RA', 'KIE', 'TA'], level: 2 },
  { item: 'balonik', syl: ['BA', 'LO', 'NIK'], level: 2 },
  { item: 'kapelusz', syl: ['KA', 'PE', 'LUSZ'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'dynia', syl: ['DY', 'NIA'], level: 0 },
  { item: 'tecza', syl: ['TĘ', 'CZA'], level: 0 },
  { item: 'lyzka', syl: ['ŁYŻ', 'KA'], level: 0 },
  { item: 'sanki', syl: ['SAN', 'KI'], level: 0 },
];

/** Angielski: podział jak przy klaskaniu sylab w przedszkolu (Ba-na-na). */
const WORDS_EN: readonly Word[] = [
  { item: 'zebra', syl: ['ZE', 'BRA'], level: 0 },
  { item: 'robot', syl: ['RO', 'BOT'], level: 0 },
  { item: 'malpa', syl: ['MON', 'KEY'], level: 0 },
  { item: 'krolik', syl: ['BUN', 'NY'], level: 0 },
  { item: 'jablko', syl: ['AP', 'PLE'], level: 0 },
  { item: 'cytryna', syl: ['LE', 'MON'], level: 0 },
  { item: 'pingwin', syl: ['PEN', 'GUIN'], level: 1 },
  { item: 'zolw', syl: ['TUR', 'TLE'], level: 1 },
  { item: 'rakieta', syl: ['ROCK', 'ET'], level: 1 },
  { item: 'dynia', syl: ['PUMP', 'KIN'], level: 1 },
  { item: 'tecza', syl: ['RAIN', 'BOW'], level: 1 },
  { item: 'delfin', syl: ['DOL', 'PHIN'], level: 1 },
  { item: 'kotek', syl: ['KIT', 'TEN'], level: 1 },
  { item: 'banan', syl: ['BA', 'NA', 'NA'], level: 2 },
  { item: 'pomidor', syl: ['TO', 'MA', 'TO'], level: 2 },
  { item: 'ziemniak', syl: ['PO', 'TA', 'TO'], level: 2 },
  { item: 'motyl', syl: ['BUT', 'TER', 'FLY'], level: 2 },
  { item: 'osmiornica', syl: ['OC', 'TO', 'PUS'], level: 2 },
  { item: 'parasol', syl: ['UM', 'BREL', 'LA'], level: 2 },
  { item: 'dinozaur', syl: ['DI', 'NO', 'SAUR'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'marchewka', syl: ['CAR', 'ROT'], level: 0 },
  { item: 'balonik', syl: ['BAL', 'LOON'], level: 0 },
  { item: 'traktor', syl: ['TRAC', 'TOR'], level: 0 },
  { item: 'muszelka', syl: ['SEA', 'SHELL'], level: 0 },
];

/** Niemiecki: Silbenklatschen jak w Kita (Ka-tze → Kat-ze). */
const WORDS_DE: readonly Word[] = [
  { item: 'kaczka', syl: ['EN', 'TE'], level: 0 },
  { item: 'pszczola', syl: ['BIE', 'NE'], level: 0 },
  { item: 'wiaderko', syl: ['EI', 'MER'], level: 0 },
  { item: 'gruszka', syl: ['BIR', 'NE'], level: 0 },
  { item: 'widelec', syl: ['GA', 'BEL'], level: 0 },
  { item: 'lalka', syl: ['PUP', 'PE'], level: 0 },
  { item: 'kot', syl: ['KAT', 'ZE'], level: 1 },
  { item: 'kubek', syl: ['TAS', 'SE'], level: 1 },
  { item: 'malpa', syl: ['AF', 'FE'], level: 1 },
  { item: 'slonce', syl: ['SON', 'NE'], level: 1 },
  { item: 'chmurka', syl: ['WOL', 'KE'], level: 1 },
  { item: 'kwiatek', syl: ['BLU', 'ME'], level: 1 },
  { item: 'hulajnoga', syl: ['ROL', 'LER'], level: 1 },
  { item: 'banan', syl: ['BA', 'NA', 'NE'], level: 2 },
  { item: 'pomidor', syl: ['TO', 'MA', 'TE'], level: 2 },
  { item: 'rakieta', syl: ['RA', 'KE', 'TE'], level: 2 },
  { item: 'cytryna', syl: ['ZI', 'TRO', 'NE'], level: 2 },
  { item: 'slon', syl: ['E', 'LE', 'FANT'], level: 2 },
  { item: 'ananas', syl: ['A', 'NA', 'NAS'], level: 2 },
  { item: 'papryka', syl: ['PA', 'PRI', 'KA'], level: 2 },
  { item: 'trabka', syl: ['TROM', 'PE', 'TE'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'spodnie', syl: ['HO', 'SE'], level: 0 },
  { item: 'czapka', syl: ['MÜT', 'ZE'], level: 0 },
  { item: 'ogorek', syl: ['GUR', 'KE'], level: 0 },
  { item: 'zajac', syl: ['HA', 'SE'], level: 0 },
];

/** Hiszpański: sylaby jak w szkole (ga-to, pe-rro, ma-ri-po-sa). */
const WORDS_ES: readonly Word[] = [
  { item: 'kot', syl: ['GA', 'TO'], level: 0 },
  { item: 'krowa', syl: ['VA', 'CA'], level: 0 },
  { item: 'kaczka', syl: ['PA', 'TO'], level: 0 },
  { item: 'zaba', syl: ['RA', 'NA'], level: 0 },
  { item: 'niedzwiedz', syl: ['O', 'SO'], level: 0 },
  { item: 'ksiezyc', syl: ['LU', 'NA'], level: 0 },
  { item: 'malpa', syl: ['MO', 'NO'], level: 0 },
  { item: 'pies', syl: ['PE', 'RRO'], level: 1 },
  { item: 'drzewo', syl: ['ÁR', 'BOL'], level: 1 },
  { item: 'osmiornica', syl: ['PUL', 'PO'], level: 1 },
  { item: 'swinka', syl: ['CER', 'DO'], level: 1 },
  { item: 'koza', syl: ['CA', 'BRA'], level: 1 },
  { item: 'kubek', syl: ['TA', 'ZA'], level: 1 },
  { item: 'kon', syl: ['CA', 'BA', 'LLO'], level: 2 },
  { item: 'krolik', syl: ['CO', 'NE', 'JO'], level: 2 },
  { item: 'pomidor', syl: ['TO', 'MA', 'TE'], level: 2 },
  { item: 'pilka', syl: ['PE', 'LO', 'TA'], level: 2 },
  { item: 'zyrafa', syl: ['JI', 'RA', 'FA'], level: 2 },
  { item: 'ptak', syl: ['PÁ', 'JA', 'RO'], level: 2 },
  { item: 'motyl', syl: ['MA', 'RI', 'PO', 'SA'], level: 2 },
  // Dodatkowe proste słowa (więcej różnorodności na poziomie 0).
  { item: 'foka', syl: ['FO', 'CA'], level: 0 },
  { item: 'chmurka', syl: ['NU', 'BE'], level: 0 },
  { item: 'gruszka', syl: ['PE', 'RA'], level: 0 },
  { item: 'ziemniak', syl: ['PA', 'PA'], level: 0 },
];

/** Słowa w każdym języku (nagrania „czytaj-<obiekt>” są osobne dla każdego języka). */
export const WORDS_BY_LANG: Record<Lang, readonly Word[]> = { pl: WORDS_PL, en: WORDS_EN, de: WORDS_DE, es: WORDS_ES };
/** Słowa w bieżącym języku. */
export const wordsOf = (l: Lang = lang()): readonly Word[] => WORDS_BY_LANG[l];
/** Polskie słowa (zgodność wstecz). */
export const WORDS: readonly Word[] = WORDS_PL;

/** Słowa do rundy: nowe z poziomu dziecka wymieszane z powtórką niższych, z obrazkiem w katalogu. */
export function makeSyllableRound(rng: Rng, level: number): Word[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const have = new Set(ITEMS.map((i) => i.id));
  return mixRound(rng, wordsOf().filter((w) => w.level <= l && have.has(w.item)), l, 'sylaby', SYLLABLE_ROUND, (w) => w.item);
}

/** Kafelki w losowej kolejności, ale nigdy już ułożone poprawnie. */
export function scramble(rng: Rng, syl: string[]): number[] {
  const idx = syl.map((_, i) => i);
  for (let k = 0; k < 10; k++) {
    const s = rng.shuffle([...idx]);
    if (s.some((v, i) => v !== i)) return s;
  }
  return [...idx].reverse();
}
