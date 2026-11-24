/**
 * Maze (Lusia's Path): guide the hero (e.g. a chick) with a finger to the goal (its mother).
 * A perfect maze (exactly one path between any two cells) from the "recursive backtracker" algorithm on a grid.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const MAZE_ROUND = 3;

/** Grid size per level (columns x rows, landscape like the screen). */
export function mazeSize(level: number): { cols: number; rows: number } {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return [
    { cols: 4, rows: 3 },
    { cols: 5, rows: 4 },
    { cols: 7, rows: 5 },
  ][l]!;
}

/** Cell walls: [top, right, bottom, left]. */
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

/** Whether you can step from cell (c, r) to the neighboring one (nc, nr). */
export function canStep(maze: Maze, c: number, r: number, nc: number, nr: number): boolean {
  const d = DIRS.findIndex(([dx, dy]) => c + dx === nc && r + dy === nr);
  return d >= 0 && !maze.walls[r]![c]![d];
}

/** Shortest path (list of cells) from (c, r) to (tc, tr). */
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

/** Who goes to whom (hero, goal, prompt recording "maze-<hero>"). */
export const MAZE_PAIRS: readonly [hero: string, goal: string][] = [
  ['chick', 'hen'],
  ['kitten', 'cat'],
  ['piglet', 'pig'],
  ['calf', 'cow'],
  ['duckling', 'duck'],
  ['bee', 'little-flower'],
  ['butterfly', 'little-flower'],
  ['rabbit', 'carrot'],
  ['monkey', 'banana'],
  ['squirrel', 'tree'],
  ['fox-cub', 'fox'],
  ['bear-cub', 'bear'],
  ['penguin-chick', 'penguin'],
  ['lion-cub', 'lion'],
  ['kid-goat', 'goat'],
  ['baby-giraffe', 'giraffe'],
  ['seal-pup', 'seal'],
  ['owlet', 'owl'],
  ['puppy', 'dog'],
  ['bunny', 'rabbit'],
  ['elephant-calf', 'elephant'],
  ['baby-turtle', 'turtle'],
];

/** Heroes of the previous round: the next round starts with different ones (if there are enough pairs). */
let lastHeroes = new Set<string>();

/** Pairs for a round (no repeated hero, no heroes from the previous round), only with pictures from the catalog. */
export function makeMazeRound(rng: Rng): [string, string][] {
  const have = new Set(ITEMS.map((i) => i.id));
  const ok = MAZE_PAIRS.filter(([a, b]) => have.has(a) && have.has(b));
  const fresh = rng.shuffle(ok.filter(([a]) => !lastHeroes.has(a)));
  const old = rng.shuffle(ok.filter(([a]) => lastHeroes.has(a)));
  const round = [...fresh, ...old].slice(0, MAZE_ROUND) as [string, string][];
  lastHeroes = new Set(round.map(([a]) => a));
  return round;
}
