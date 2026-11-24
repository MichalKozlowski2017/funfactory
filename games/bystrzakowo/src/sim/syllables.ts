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
import { WORDS_BY_LANG } from './locales/syllables.ts';

export { WORDS_BY_LANG };

export const SYLLABLE_ROUND = 4;

export interface Word {
  /** Obiekt z katalogu (obrazek). */
  item: string;
  syl: string[];
  level: number;
}

/** Słowa w bieżącym języku. */
export const wordsOf = (l: Lang = lang()): readonly Word[] => WORDS_BY_LANG[l];
/** Polskie słowa (zgodność wstecz). */
export const WORDS: readonly Word[] = WORDS_BY_LANG.pl;

/** Słowa do rundy: nowe z poziomu dziecka wymieszane z powtórką niższych, z obrazkiem w katalogu. */
export function makeSyllableRound(rng: Rng, level: number): Word[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const have = new Set(ITEMS.map((i) => i.id));
  return mixRound(rng, wordsOf().filter((w) => w.level <= l && have.has(w.item)), l, 'syllables', SYLLABLE_ROUND, (w) => w.item);
}

/**
 * Kafelki w losowej kolejności, czasem także w dobrej. Gdyby nigdy nie były ułożone, przy dwóch sylabach
 * byłyby zawsze odwrócone i dziecko układałoby „prawy pierwszy” bez czytania (wyłapał to test agentem).
 * Dziecko i tak przeciąga każdy kafelek do okienka.
 */
export function scramble(rng: Rng, syl: string[]): number[] {
  return rng.shuffle(syl.map((_, i) => i));
}

/** Kolory kafelków słowa: losowe przypisanie, żeby kolor nie zdradzał, która sylaba jest pierwsza. */
export function tileColors<T>(rng: Rng, palette: readonly T[], n: number): T[] {
  const p = rng.shuffle([...palette]);
  return Array.from({ length: n }, (_, i) => p[i % p.length]!);
}
