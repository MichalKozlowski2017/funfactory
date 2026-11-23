/**
 * Sorter kształtów (Warsztat Bazyla): klocki w kształtach figur wkłada się do pasujących dziurek.
 * Na wyższych poziomach więcej kształtów i podobne do siebie (kwadrat i prostokąt, koło i owal).
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export type Shape = 'kolo' | 'kwadrat' | 'trojkat' | 'prostokat' | 'gwiazda' | 'serce' | 'owal' | 'romb' | 'ksiezyc' | 'kropla';
export const SHAPES: readonly Shape[] = ['kolo', 'kwadrat', 'trojkat', 'prostokat', 'gwiazda', 'serce', 'owal', 'romb', 'ksiezyc', 'kropla'];

export const SHAPE_ROUND = 3;
const BASIC: Shape[] = ['kolo', 'kwadrat', 'trojkat'];
const MIDDLE: Shape[] = ['prostokat', 'gwiazda', 'serce'];
/** Wyraziste kształty spoza geometrii (od poziomu 0, żeby plansze się nie powtarzały). */
const FUN: Shape[] = ['serce', 'gwiazda', 'ksiezyc', 'kropla'];
const HARD: Shape[] = ['owal', 'romb'];

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
/** Liczba kształtów na planszy. */
export const shapeCount = (level: number): number => [3, 4, 5][clamp(level)] as number;

/** Kształty jednej planszy: podstawowe zawsze, potem coraz trudniejsze. */
/** Zestaw poprzedniej planszy (posortowany): następna plansza ma być inna. */
let lastBoard = '';

/** Kolejność klocków bez punktów stałych: żaden klocek nie leży dokładnie pod swoją dziurką. */
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
  // Poziom 0: trzy z siedmiu łatwych (serce, gwiazda, księżyc i kropla są wyraziste): 35 różnych plansz zamiast 10.
  const easy = [...new Set([...BASIC, ...FUN])];
  const pool = l === 0 ? easy : l === 1 ? [...new Set([...easy, ...MIDDLE])] : [...new Set([...easy, ...MIDDLE, ...HARD])];
  // Na najwyższym poziomie zawsze choć jedna para podobnych (owal z kołem albo romb z kwadratem).
  const must = l >= MAX_LEVEL ? [rng.pick(HARD)] : [];
  const rest = rng.shuffle(pool.filter((s) => !must.includes(s))).slice(0, shapeCount(level) - must.length);
  return rng.shuffle([...must, ...rest]);
}
