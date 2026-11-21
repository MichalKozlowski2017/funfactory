/**
 * Układanka (Warsztat Bazyla): obrazek z katalogu pocięty na kawałki, które dziecko przeciąga na miejsce.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const JIGSAW_ROUND = 3;

/** Siatka kawałków na poziomie: 2 (połówki), 4 (2×2), 6 (3×2). */
export function jigsawGrid(level: number): { cols: number; rows: number } {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return [
    { cols: 2, rows: 1 },
    { cols: 2, rows: 2 },
    { cols: 3, rows: 2 },
  ][l]!;
}

/** Obrazki do układania: zwierzęta i pojazdy mają najbardziej charakterystyczne kształty, więc są łatwiejsze. */
export function makeJigsawRound(rng: Rng): Item[] {
  const easy = ITEMS.filter((i) => i.category === 'zwierzeta' || i.category === 'pojazdy');
  const pool = easy.length >= JIGSAW_ROUND ? easy : ITEMS;
  return rng.shuffle(pool).slice(0, JIGSAW_ROUND);
}

/** Czy kawałek upuszczony w (x, y) trafił na swoje miejsce (tolerancja dla małych palców: 40% kawałka). */
export function snaps(dx: number, dy: number, pieceW: number, pieceH: number): boolean {
  return Math.abs(dx) < pieceW * 0.4 && Math.abs(dy) < pieceH * 0.4;
}
