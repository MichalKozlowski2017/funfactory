/**
 * Shape sorter (Bazyl's Workshop): shaped blocks go into the matching holes.
 * Higher levels have more shapes, including similar ones (square and rectangle, circle and oval).
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export type Shape = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart' | 'oval' | 'rhombus' | 'moon' | 'drop';
export const SHAPES: readonly Shape[] = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'rhombus', 'moon', 'drop'];

export const SHAPE_ROUND = 3;
const BASIC: Shape[] = ['circle', 'square', 'triangle'];
const MIDDLE: Shape[] = ['rectangle', 'star', 'heart'];
/** Distinctive non-geometric shapes (from level 0, so boards don't repeat). */
const FUN: Shape[] = ['heart', 'star', 'moon', 'drop'];
const HARD: Shape[] = ['oval', 'rhombus'];

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
/** Number of shapes on a board. */
export const shapeCount = (level: number): number => [3, 4, 5][clamp(level)] as number;

/** Shapes of one board: basic ones always, then harder and harder. */
/** The previous board's set (sorted): the next board must be different. */
let lastBoard = '';

/** Block order without fixed points: no block lies exactly under its own hole. */
export function derange(rng: Rng, n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return idx;
  for (let k = 0; k < 50; k++) {
    const s = rng.shuffle([...idx]);
    if (s.every((v, i) => v !== i)) return s;
  }
  return idx.map((i) => (i + 1) % n);
}

export function makeShapeBoard(rng: Rng, level: number): Shape[] {
  for (let k = 0; k < 20; k++) {
    const b = drawBoard(rng, level);
    const key = [...b].sort().join(',');
    if (key !== lastBoard || k === 19) {
      lastBoard = key;
      return b;
    }
  }
  return drawBoard(rng, level);
}

function drawBoard(rng: Rng, level: number): Shape[] {
  const l = clamp(level);
  // Level 0: three of seven easy ones (heart, star, moon and drop are distinctive): 35 different boards instead of 10.
  const easy = [...new Set([...BASIC, ...FUN])];
  const pool = l === 0 ? easy : l === 1 ? [...new Set([...easy, ...MIDDLE])] : [...new Set([...easy, ...MIDDLE, ...HARD])];
  // At the top level always at least one similar pair (oval with circle or rhombus with square).
  const must = l >= MAX_LEVEL ? [rng.pick(HARD)] : [];
  const rest = rng.shuffle(pool.filter((s) => !must.includes(s))).slice(0, shapeCount(level) - must.length);
  return rng.shuffle([...must, ...rest]);
}
