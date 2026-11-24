/**
 * Syllables (Bazyl's Workshop): a picture and scattered syllable tiles; the child puts them in order,
 * Lusia reads the word syllable by syllable and then as a whole. Preparation for reading (kindergarten year).
 * Words are split the way they are split in kindergarten (open syllables first).
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
  /** Catalog item (picture). */
  item: string;
  syl: string[];
  level: number;
}

/** Words in the current language. */
export const wordsOf = (l: Lang = lang()): readonly Word[] => WORDS_BY_LANG[l];
/** Polish words (backward compatibility). */
export const WORDS: readonly Word[] = WORDS_BY_LANG.pl;

/** Words for a round: new ones from the child's level mixed with a review of lower ones, with a picture in the catalog. */
export function makeSyllableRound(rng: Rng, level: number): Word[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const have = new Set(ITEMS.map((i) => i.id));
  return mixRound(rng, wordsOf().filter((w) => w.level <= l && have.has(w.item)), l, 'syllables', SYLLABLE_ROUND, (w) => w.item);
}

/**
 * Tiles in random order, sometimes also in the right one. If they were never in order, with two syllables
 * they would always be reversed and the child would place "right one first" without reading (caught by an agent test).
 * The child drags every tile to a slot anyway.
 */
export function scramble(rng: Rng, syl: string[]): number[] {
  return rng.shuffle(syl.map((_, i) => i));
}

/** Word tile colors: random assignment, so the color doesn't reveal which syllable comes first. */
export function tileColors<T>(rng: Rng, palette: readonly T[], n: number): T[] {
  const p = rng.shuffle([...palette]);
  return Array.from({ length: n }, (_, i) => p[i % p.length]!);
}
