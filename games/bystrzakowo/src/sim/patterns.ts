/**
 * Co dalej? (Warsztat Bazyla): rząd obrazków w powtarzającym się wzorze, jedno miejsce puste.
 * Dziecko przeciąga brakujący obrazek z kilku do wyboru.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, lookalike, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const PATTERN_ROUND = 4;

/** Wzory na poziomie (litery = różne obrazki). */
const MOTIFS: string[][] = [['AB'], ['AAB', 'ABB', 'AB'], ['ABC', 'AABB', 'ABB', 'AAB']];

export interface PatternTask {
  /** Cały rząd (z brakującym elementem w środku). */
  row: Item[];
  /** Indeks pustego miejsca. */
  gap: number;
  /** Obrazki do wyboru (w tym poprawny). */
  options: Item[];
}

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

export function makePatternTask(rng: Rng, level: number): PatternTask {
  const l = clamp(level);
  const motif = rng.pick(MOTIFS[l]!);
  const letters = [...new Set(motif)];
  // Obrazki wzoru: wyraziste i różne od siebie (owoce, zabawki, zwierzęta).
  const pool = rng.shuffle(ITEMS.filter((i) => ['owoce', 'zabawki', 'zwierzeta', 'pojazdy'].includes(i.category)));
  const pick: Item[] = [];
  for (const item of pool) {
    if (pick.length >= letters.length + 1) break;
    if (pick.some((p) => lookalike(p, item))) continue;
    pick.push(item);
  }
  const map = new Map(letters.map((ch, i) => [ch, pick[i]!]));
  // Rząd: wzór powtórzony, co najmniej 6 pól (dwa pełne powtórzenia i kawałek).
  const len = Math.max(6, motif.length * 2 + 1);
  const row = Array.from({ length: len }, (_, i) => map.get(motif[i % motif.length]!)!);
  // Puste miejsce: na końcu (niższe poziomy), na najwyższym czasem w środku (po pełnym powtórzeniu).
  const gap = l >= MAX_LEVEL && rng.next() < 0.4 ? motif.length + rng.int(0, motif.length - 1) : len - 1;
  const decoy = pick[letters.length]!;
  const options = rng.shuffle([...new Set([row[gap]!, ...letters.map((ch) => map.get(ch)!), decoy])]).slice(0, 3);
  if (!options.includes(row[gap]!)) options[0] = row[gap]!;
  return { row, gap, options: rng.shuffle(options) };
}

export const makePatternRound = (rng: Rng, level: number): PatternTask[] => Array.from({ length: PATTERN_ROUND }, () => makePatternTask(rng, level));
