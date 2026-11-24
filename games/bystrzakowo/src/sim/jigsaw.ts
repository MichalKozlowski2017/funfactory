/**
 * Jigsaw (Basil's Workshop): a catalog picture cut into pieces that the child drags into place.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const JIGSAW_ROUND = 3;

/** Piece grid per level: 2 (halves), 4 (2×2), 6 (3×2). */
export function jigsawGrid(level: number): { cols: number; rows: number } {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return [
    { cols: 2, rows: 1 },
    { cols: 2, rows: 2 },
    { cols: 3, rows: 2 },
  ][l]!;
}

/** Pictures to assemble: animals and vehicles have the most distinctive shapes, so they are easier. */
export function makeJigsawRound(rng: Rng): Item[] {
  const easy = ITEMS.filter((i) => i.category === 'animals' || i.category === 'vehicles');
  const pool = easy.length >= JIGSAW_ROUND ? easy : ITEMS;
  return rng.shuffle(pool).slice(0, JIGSAW_ROUND);
}

/** Whether a piece dropped at (x, y) landed in its place (tolerance for small fingers: 40% of the piece). */
export function snaps(dx: number, dy: number, pieceW: number, pieceH: number): boolean {
  return Math.abs(dx) < pieceW * 0.4 && Math.abs(dy) < pieceH * 0.4;
}
