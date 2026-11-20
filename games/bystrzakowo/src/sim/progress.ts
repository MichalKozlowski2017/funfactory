import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { PUZZLE_KINDS, type PuzzleKind } from './puzzles.ts';

/** Zapis postępów dziecka. */
export interface Progress {
  /** Poziom trudności każdego domku (0..MAX_LEVEL). */
  levels: Record<PuzzleKind, number>;
  /** Zebrane naklejki (id obiektów z katalogu), w kolejności zdobycia. */
  stickers: string[];
  rounds: number;
}

export const newProgress = (): Progress => ({
  levels: Object.fromEntries(PUZZLE_KINDS.map((k) => [k, 0])) as Record<PuzzleKind, number>,
  stickers: [],
  rounds: 0,
});

/** Naklejka za rundę: najpierw te, których dziecko jeszcze nie ma. */
export function pickSticker(rng: Rng, owned: readonly string[]): string {
  const missing = ITEMS.filter((i) => !owned.includes(i.id));
  return rng.pick(missing.length > 0 ? missing : ITEMS).id;
}
