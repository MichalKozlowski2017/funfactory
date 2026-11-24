/**
 * What comes next? (Bazyl's Workshop): a row of pictures in a repeating pattern, one spot empty.
 * The child drags the missing picture from a few options.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, lookalike, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const PATTERN_ROUND = 4;

/** Patterns per level (letters = different pictures). */
const MOTIFS: string[][] = [['AB'], ['AAB', 'ABB', 'AB'], ['ABC', 'AABB', 'ABB', 'AAB']];

export interface PatternTask {
  /** The whole row (including the missing element). */
  row: Item[];
  /** Index of the empty spot. */
  gap: number;
  /** Pictures to choose from (including the correct one). */
  options: Item[];
}

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

export function makePatternTask(rng: Rng, level: number): PatternTask {
  const l = clamp(level);
  const motif = rng.pick(MOTIFS[l]!);
  const letters = [...new Set(motif)];
  // Pattern pictures: distinctive and different from each other (fruit, toys, animals).
  const pool = rng.shuffle(ITEMS.filter((i) => ['fruit', 'toys', 'animals', 'vehicles'].includes(i.category)));
  const pick: Item[] = [];
  for (const item of pool) {
    if (pick.length >= letters.length + 1) break;
    if (pick.some((p) => lookalike(p, item))) continue;
    pick.push(item);
  }
  const map = new Map(letters.map((ch, i) => [ch, pick[i]!]));
  // Row: the pattern repeated, two full repetitions and a bit more. 5 or 6 cells, so that with AB the answer
  // is not always the second picture (child-agent test: it was possible to guess without looking at the pattern).
  const len = Math.max(rng.int(5, 6), motif.length * 2 + 1);
  const row = Array.from({ length: len }, (_, i) => map.get(motif[i % motif.length]!)!);
  // Empty spot: at the end (lower levels), at the top level sometimes in the middle (after a full repetition).
  const gap = l >= MAX_LEVEL && rng.next() < 0.4 ? motif.length + rng.int(0, motif.length - 1) : len - 1;
  const decoy = pick[letters.length]!;
  const options = rng.shuffle([...new Set([row[gap]!, ...letters.map((ch) => map.get(ch)!), decoy])]).slice(0, 3);
  if (!options.includes(row[gap]!)) options[0] = row[gap]!;
  return { row, gap, options: rng.shuffle(options) };
}

export const makePatternRound = (rng: Rng, level: number): PatternTask[] => Array.from({ length: PATTERN_ROUND }, () => makePatternTask(rng, level));
