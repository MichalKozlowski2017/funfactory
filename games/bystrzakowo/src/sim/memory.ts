/**
 * Memory (Puzzle Meadow): cards placed picture-down, the child looks for pairs.
 * A pair is always two identical pictures; a higher level means more pairs (shadows confuse toddlers).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, lookalike, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const MEMORY_ROUND = 2;

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
/** Number of pairs per level. */
export const pairCount = (level: number): number => [3, 4, 6][clamp(level)] as number;

export interface MemoryCard {
  item: Item;
}

/** Deck: pairs without look-alike items (a cat and a kitten on one board would be confusing), shuffled. */
export function makeMemoryBoard(rng: Rng, level: number): MemoryCard[] {
  const pool = rng.shuffle([...ITEMS]);
  const picked: Item[] = [];
  for (const item of pool) {
    if (picked.length >= pairCount(level)) break;
    if (picked.some((p) => lookalike(p, item))) continue;
    picked.push(item);
  }
  return rng.shuffle(picked.flatMap((item) => [{ item }, { item }]));
}

/** Card grid (columns × rows) for a number of cards, landscape like the screen. */
export function memoryGrid(cards: number): { cols: number; rows: number } {
  if (cards <= 6) return { cols: 3, rows: 2 };
  if (cards <= 8) return { cols: 4, rows: 2 };
  return { cols: 4, rows: 3 };
}

/** Mistakes for the difficulty level: a few missed flips are a normal part of the game, they only count beyond the number of pairs. */
export const memoryMistakes = (misses: number, pairs: number): number => Math.floor(Math.max(0, misses - pairs) / 2);
