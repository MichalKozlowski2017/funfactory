/**
 * Sylaby (Warsztat Bazyla): obrazek i rozsypane kafelki z sylabami; dziecko układa je po kolei,
 * Lusia czyta sylabami i całe słowo („Ko… za… Koza!”). Przygotowanie do czytania (zerówka).
 * Podział zgodny z tym, jak dzieli się słowa w przedszkolu (sylaby otwarte najpierw).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { lang, type Lang } from './lang.ts';
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
];

/** Słowa w każdym języku (nagrania „czytaj-<obiekt>” są osobne dla każdego języka). */
export const WORDS_BY_LANG: Record<Lang, readonly Word[]> = { pl: WORDS_PL, en: WORDS_EN, de: WORDS_DE };
/** Słowa w bieżącym języku. */
export const wordsOf = (l: Lang = lang()): readonly Word[] => WORDS_BY_LANG[l];
/** Polskie słowa (zgodność wstecz). */
export const WORDS: readonly Word[] = WORDS_PL;

/** Słowa do rundy: z poziomu dziecka (nowe najpierw) i niższych, z obrazkiem w katalogu. */
export function makeSyllableRound(rng: Rng, level: number): Word[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const have = new Set(ITEMS.map((i) => i.id));
  const ok = wordsOf().filter((w) => w.level <= l && have.has(w.item));
  return [...rng.shuffle(ok.filter((w) => w.level === l)), ...rng.shuffle(ok.filter((w) => w.level < l))].slice(0, SYLLABLE_ROUND);
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
