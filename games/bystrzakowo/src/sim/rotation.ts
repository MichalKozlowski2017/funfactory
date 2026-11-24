/**
 * Rotation of round content (letters, digits, syllable words): every round takes the elements the child
 * has not seen for the longest time, so the whole pool comes round in turn instead of the same letter
 * three rounds in a row. Nothing from the previous round, unless the pool is too small. Elements the child
 * struggles with (recent mistakes) come back about twice as often.
 * The memory lives in the save (Progress.rotation), so it survives closing the app.
 */
import type { Rng } from '@funfactory/core';

export interface Rotation {
  /** Rounds played so far. */
  round: number;
  /** Element id -> round in which it was last shown. */
  last: Record<string, number>;
  /** Element id -> how many times it was shown (breaks ties, keeps small pools even). */
  count?: Record<string, number>;
}

let store: () => Record<string, Rotation> = (() => {
  const mem: Record<string, Rotation> = {};
  return () => mem;
})();
let trouble: (fact: string) => boolean = () => false;

/** The game points rotation at the save and at the journal (tests keep the in-memory default). */
export function useRotation(get: () => Record<string, Rotation>, isTrouble: (fact: string) => boolean): void {
  store = get;
  trouble = isTrouble;
}

/** Recent results of a fact ("1" ok, "0" mistake, "h" ok with help): a mistake last time or 2 in the last 4. */
export const struggles = (history: string | undefined): boolean => {
  if (!history) return false;
  const recent = history.slice(-4);
  return recent.endsWith('0') || [...recent].filter((c) => c === '0').length >= 2;
};

/**
 * Picks `n` elements of `pool` for the next round under rotation `key` and records them as shown.
 * `fact` maps an element id to its journal fact (e.g. "letter:S") to spot the ones the child struggles with.
 */
export function rotate<T>(rng: Rng, pool: readonly T[], n: number, key: string, id: (x: T) => string, fact?: (id: string) => string): T[] {
  const rot = (store()[key] ??= { round: 0, last: {} });
  // Rounds it takes to go through the whole pool once; struggling elements are treated as seen that much less recently / 2.
  const cycle = Math.max(1, pool.length / n);
  const count = (rot.count ??= {});
  const ranked = pool
    .map((x) => {
      const k = id(x);
      const last = (rot.last[k] ?? -1e6) - (fact && trouble(fact(k)) ? cycle / 2 : 0);
      return { x, last, count: count[k] ?? 0, tie: rng.next() };
    })
    .sort((a, b) => a.last - b.last || a.count - b.count || a.tie - b.tie)
    .map((e) => e.x);
  const prev = (x: T) => rot.last[id(x)] === rot.round;
  // Fill from the previous round only when the pool is too small: least shown first.
  const again = ranked.filter(prev).sort((a, b) => (count[id(a)] ?? 0) - (count[id(b)] ?? 0));
  const rested = ranked.filter((x) => !prev(x));
  const out = [...rested, ...again].slice(0, n);
  rot.round++;
  for (const x of out) {
    rot.last[id(x)] = rot.round;
    count[id(x)] = (count[id(x)] ?? 0) + 1;
  }
  return rng.shuffle(out);
}
