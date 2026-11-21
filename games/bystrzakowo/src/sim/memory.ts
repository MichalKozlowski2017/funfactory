/**
 * Memory (Polana Zagadek): karty odwrócone obrazkiem do dołu, szuka się par.
 * Niższe poziomy: dwa takie same obrazki. Najwyższy: obrazek i jego cień.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, lookalike, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const MEMORY_ROUND = 2;

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
/** Liczba par na poziomie. */
export const pairCount = (level: number): number => [3, 4, 6][clamp(level)] as number;
/** Na najwyższym poziomie para to obrazek i jego cień. */
export const shadowPairs = (level: number): boolean => clamp(level) >= MAX_LEVEL;

export interface MemoryCard {
  item: Item;
  /** Karta pokazuje cień (para obrazek–cień). */
  shadow: boolean;
}

/** Talia: pary bez podobnych do siebie obiektów (kot i kotek na jednej planszy byłyby mylące), potasowane. */
export function makeMemoryBoard(rng: Rng, level: number): MemoryCard[] {
  const shadows = shadowPairs(level);
  const pool = rng.shuffle(ITEMS.filter((i) => !shadows || i.shadow));
  const picked: Item[] = [];
  for (const item of pool) {
    if (picked.length >= pairCount(level)) break;
    if (picked.some((p) => lookalike(p, item))) continue;
    picked.push(item);
  }
  return rng.shuffle(picked.flatMap((item) => [
    { item, shadow: false },
    { item, shadow: shadows },
  ]));
}

/** Siatka kart (kolumny × wiersze) dla liczby kart, poziomo jak ekran. */
export function memoryGrid(cards: number): { cols: number; rows: number } {
  if (cards <= 6) return { cols: 3, rows: 2 };
  if (cards <= 8) return { cols: 4, rows: 2 };
  return { cols: 4, rows: 3 };
}

/** Pomyłki do poziomu trudności: kilka nietrafionych odkryć to normalna część gry, liczą się dopiero ponad liczbę par. */
export const memoryMistakes = (misses: number, pairs: number): number => Math.floor(Math.max(0, misses - pairs) / 2);
