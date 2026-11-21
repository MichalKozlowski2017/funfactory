/**
 * Labirynt (Ścieżka Lusi): prowadzenie palcem bohatera (np. kurczaczka) do celu (mamy).
 * Labirynt doskonały (jedna droga między dowolnymi polami) z algorytmu „cofania się” na siatce.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const MAZE_ROUND = 3;

/** Rozmiar siatki na poziomie (kolumny × wiersze, poziomo jak ekran). */
export function mazeSize(level: number): { cols: number; rows: number } {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return [
    { cols: 4, rows: 3 },
    { cols: 5, rows: 4 },
    { cols: 7, rows: 5 },
  ][l]!;
}

/** Ściany pola: [góra, prawo, dół, lewo]. */
export type Walls = [boolean, boolean, boolean, boolean];

export interface Maze {
  cols: number;
  rows: number;
  /** walls[row][col] */
  walls: Walls[][];
}

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

export function makeMaze(rng: Rng, cols: number, rows: number): Maze {
  const walls: Walls[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [true, true, true, true] as Walls));
  const seen = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const stack: [number, number][] = [[0, 0]];
  seen[0]![0] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1]!;
    const next = rng.shuffle([0, 1, 2, 3]).find((d) => {
      const nc = c + DIRS[d]![0];
      const nr = r + DIRS[d]![1];
      return nc >= 0 && nr >= 0 && nc < cols && nr < rows && !seen[nr]![nc];
    });
    if (next === undefined) {
      stack.pop();
      continue;
    }
    const nc = c + DIRS[next]![0];
    const nr = r + DIRS[next]![1];
    walls[r]![c]![next] = false;
    walls[nr]![nc]![(next + 2) % 4] = false;
    seen[nr]![nc] = true;
    stack.push([nc, nr]);
  }
  return { cols, rows, walls };
}

/** Czy z pola (c, r) można przejść do sąsiedniego (nc, nr). */
export function canStep(maze: Maze, c: number, r: number, nc: number, nr: number): boolean {
  const d = DIRS.findIndex(([dx, dy]) => c + dx === nc && r + dy === nr);
  return d >= 0 && !maze.walls[r]![c]![d];
}

/** Najkrótsza droga (lista pól) z (c, r) do (tc, tr). */
export function path(maze: Maze, c: number, r: number, tc: number, tr: number): [number, number][] {
  const prev = new Map<string, string | null>([[`${c},${r}`, null]]);
  const queue: [number, number][] = [[c, r]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (x === tc && y === tr) break;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= maze.cols || ny >= maze.rows || prev.has(key) || !canStep(maze, x, y, nx, ny)) continue;
      prev.set(key, `${x},${y}`);
      queue.push([nx, ny]);
    }
  }
  const out: [number, number][] = [];
  let k: string | null | undefined = `${tc},${tr}`;
  while (k) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    out.unshift([x, y]);
    k = prev.get(k);
  }
  return out;
}

/** Kto idzie do kogo (bohater, cel, nagranie polecenia „labirynt-<bohater>”). */
export const MAZE_PAIRS: readonly [hero: string, goal: string][] = [
  ['kurczak', 'kura'],
  ['kotek', 'kot'],
  ['prosiaczek', 'swinka'],
  ['cielaczek', 'krowa'],
  ['kaczatko', 'kaczka'],
  ['pszczola', 'kwiatek'],
  ['motyl', 'kwiatek'],
  ['krolik', 'marchewka'],
  ['malpa', 'banan'],
  ['wiewiorka', 'drzewo'],
];

/** Pary do rundy (bez powtórzeń bohatera), tylko z obrazkami obecnymi w katalogu. */
export function makeMazeRound(rng: Rng): [string, string][] {
  const have = new Set(ITEMS.map((i) => i.id));
  const ok = MAZE_PAIRS.filter(([a, b]) => have.has(a) && have.has(b));
  return rng.shuffle([...ok]).slice(0, MAZE_ROUND) as [string, string][];
}
