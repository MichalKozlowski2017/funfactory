/**
 * Sorter kształtów (Warsztat Bazyla): klocki w kształtach figur wkłada się do pasujących dziurek.
 * Na wyższych poziomach więcej kształtów i podobne do siebie (kwadrat i prostokąt, koło i owal).
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export type Shape = 'kolo' | 'kwadrat' | 'trojkat' | 'prostokat' | 'gwiazda' | 'serce' | 'owal' | 'romb';
export const SHAPES: readonly Shape[] = ['kolo', 'kwadrat', 'trojkat', 'prostokat', 'gwiazda', 'serce', 'owal', 'romb'];

export const SHAPE_ROUND = 3;
const BASIC: Shape[] = ['kolo', 'kwadrat', 'trojkat'];
const MIDDLE: Shape[] = ['prostokat', 'gwiazda', 'serce'];
const HARD: Shape[] = ['owal', 'romb'];

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
/** Liczba kształtów na planszy. */
export const shapeCount = (level: number): number => [3, 4, 5][clamp(level)] as number;

/** Kształty jednej planszy: podstawowe zawsze, potem coraz trudniejsze. */
export function makeShapeBoard(rng: Rng, level: number): Shape[] {
  const l = clamp(level);
  const pool = l === 0 ? BASIC : l === 1 ? [...BASIC, ...MIDDLE] : [...BASIC, ...MIDDLE, ...HARD];
  // Na najwyższym poziomie zawsze choć jedna para podobnych (owal z kołem albo romb z kwadratem).
  const must = l >= MAX_LEVEL ? [rng.pick(HARD)] : [];
  const rest = rng.shuffle(pool.filter((s) => !must.includes(s))).slice(0, shapeCount(level) - must.length);
  return rng.shuffle([...must, ...rest]);
}
