/**
 * Sylaby (Warsztat Bazyla): obrazek i rozsypane kafelki z sylabami; dziecko układa je po kolei,
 * Lusia czyta sylabami i całe słowo („Ko… za… Koza!”). Przygotowanie do czytania (zerówka).
 * Podział zgodny z tym, jak dzieli się słowa w przedszkolu (sylaby otwarte najpierw).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const SYLLABLE_ROUND = 4;

export interface Word {
  /** Obiekt z katalogu (obrazek). */
  item: string;
  syl: string[];
  level: number;
}

export const WORDS: readonly Word[] = [
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

/** Słowa do rundy: z poziomu dziecka (nowe najpierw) i niższych, z obrazkiem w katalogu. */
export function makeSyllableRound(rng: Rng, level: number): Word[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const have = new Set(ITEMS.map((i) => i.id));
  const ok = WORDS.filter((w) => w.level <= l && have.has(w.item));
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
