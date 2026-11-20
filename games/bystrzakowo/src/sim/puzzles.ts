import type { Rng } from '@funfactory/core';
import { ITEMS, type Item } from './catalog.ts';

/**
 * Silniki zagadek: z katalogu i poziomu trudności (0..MAX_LEVEL) generują pytania.
 * Czysty TS bez Pixi, żeby dało się testować i stroić.
 */
export type PuzzleKind = 'cienie' | 'pasuje' | 'liczenie';
export const PUZZLE_KINDS: readonly PuzzleKind[] = ['cienie', 'pasuje', 'liczenie'];
export const MAX_LEVEL = 2;
export const ROUND_LENGTH = 5;

/** „Czyj to cień?”: duży cień `target`, do wyboru kolorowe obrazki. */
export interface ShadowQuestion {
  kind: 'cienie';
  target: Item;
  options: Item[];
}

/** „Co tu nie pasuje?”: wszystkie oprócz `odd` są z jednej kategorii. */
export interface OddQuestion {
  kind: 'pasuje';
  odd: Item;
  options: Item[];
}

/** „Policz, ile ich jest”: `count` sztuk `item`, do wyboru liczby. */
export interface CountQuestion {
  kind: 'liczenie';
  item: Item;
  count: number;
  options: number[];
}

export type Question = ShadowQuestion | OddQuestion | CountQuestion;

/** Liczba odpowiedzi do wyboru na danym poziomie. */
export const optionCount = (level: number): number => [2, 3, 4][clampLevel(level)] as number;
/** Największa liczba do policzenia. */
export const maxCount = (level: number): number => [3, 5, 8][clampLevel(level)] as number;

const clampLevel = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

function take<T>(rng: Rng, pool: readonly T[], n: number, avoid: readonly T[] = []): T[] {
  return rng.shuffle(pool.filter((x) => !avoid.includes(x))).slice(0, n);
}

export function shadowQuestion(rng: Rng, level: number, recent: readonly string[] = []): ShadowQuestion {
  const pool = ITEMS.filter((i) => i.shadow);
  const fresh = pool.filter((i) => !recent.includes(i.id));
  const target = rng.pick(fresh.length > 0 ? fresh : pool);
  const n = optionCount(level);
  // Na najwyższym poziomie zmyłki z tej samej kategorii (podobniejsze sylwetki).
  const same = pool.filter((i) => i.category === target.category && i !== target);
  const decoys = level >= MAX_LEVEL && same.length >= n - 1 ? take(rng, same, n - 1) : take(rng, pool, n - 1, [target]);
  return { kind: 'cienie', target, options: rng.shuffle([target, ...decoys]) };
}

export function oddQuestion(rng: Rng, level: number, recent: readonly string[] = []): OddQuestion {
  const n = Math.max(3, optionCount(level));
  const groups = new Map<string, Item[]>();
  for (const item of ITEMS) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  const big = [...groups.values()].filter((g) => g.length >= n - 1);
  const group = rng.pick(big);
  const others = ITEMS.filter((i) => i.category !== group[0]!.category);
  const freshOdd = others.filter((i) => !recent.includes(i.id));
  const odd = rng.pick(freshOdd.length > 0 ? freshOdd : others);
  return { kind: 'pasuje', odd, options: rng.shuffle([odd, ...take(rng, group, n - 1)]) };
}

export function countQuestion(rng: Rng, level: number, recent: readonly string[] = []): CountQuestion {
  const pool = ITEMS.filter((i) => i.countable);
  const fresh = pool.filter((i) => !recent.includes(i.id));
  const item = rng.pick(fresh.length > 0 ? fresh : pool);
  const max = maxCount(level);
  const count = rng.int(1, max);
  // Zmyłki: liczby obok prawidłowej (najczęstszy błąd dziecka to pomyłka o 1).
  const near = [count - 1, count + 1, count - 2, count + 2, count + 3].filter((x) => x >= 1 && x <= Math.max(max, 4));
  const n = Math.max(3, optionCount(level));
  const options = [count, ...near.slice(0, n - 1)].sort((a, b) => a - b);
  return { kind: 'liczenie', item, count, options };
}

export function makeQuestion(kind: PuzzleKind, rng: Rng, level: number, recent: readonly string[] = []): Question {
  if (kind === 'cienie') return shadowQuestion(rng, level, recent);
  if (kind === 'pasuje') return oddQuestion(rng, level, recent);
  return countQuestion(rng, level, recent);
}

/** Id obiektu, który pytanie „zużywa” (żeby nie powtarzać go w rundzie). */
export const questionKey = (q: Question): string => (q.kind === 'cienie' ? q.target.id : q.kind === 'pasuje' ? q.odd.id : q.item.id);

export const isCorrect = (q: Question, answer: Item | number): boolean =>
  q.kind === 'cienie' ? answer === q.target : q.kind === 'pasuje' ? answer === q.odd : answer === q.count;

/** Cała runda: ROUND_LENGTH pytań bez powtórzeń obiektu przewodniego. */
export function makeRound(kind: PuzzleKind, rng: Rng, level: number): Question[] {
  const out: Question[] = [];
  const recent: string[] = [];
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const q = makeQuestion(kind, rng, level, recent);
    recent.push(questionKey(q));
    out.push(q);
  }
  return out;
}

/**
 * Trudność adaptacyjna po rundzie: bez pomyłek poziom w górę, 3+ pomyłki w dół.
 * `mistakes` to liczba błędnych dotknięć w całej rundzie.
 */
export function nextLevel(level: number, mistakes: number): number {
  if (mistakes === 0) return clampLevel(level + 1);
  if (mistakes >= 3) return clampLevel(level - 1);
  return clampLevel(level);
}
