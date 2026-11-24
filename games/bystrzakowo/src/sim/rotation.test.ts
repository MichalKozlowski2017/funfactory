import { Rng } from '@funfactory/core';
import { describe, expect, it } from 'vitest';
import { rotate, struggles, useRotation, type Rotation } from './rotation.ts';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `x${i}`);
const run = (pool: string[], n: number, rounds: number, seed = 1) => {
  const rng = new Rng(seed);
  return Array.from({ length: rounds }, () => rotate(rng, pool, n, `t${seed}-${pool.length}`, (x) => x, (x) => x));
};

describe('round rotation', () => {
  it('goes through the whole pool before anything repeats', () => {
    const rounds = run(ids(24), 3, 8);
    expect(new Set(rounds.flat()).size).toBe(24);
  });

  it('never repeats an element in the next round when the pool allows it', () => {
    for (const size of [7, 9, 25]) {
      const rounds = run(ids(size), 3, 40, size);
      for (let i = 1; i < rounds.length; i++) expect(rounds[i]!.filter((x) => rounds[i - 1]!.includes(x)), `pool ${size}`).toEqual([]);
    }
  });

  it('shows every element about equally often', () => {
    const counts = new Map<string, number>();
    for (const x of run(ids(8), 3, 40).flat()) counts.set(x, (counts.get(x) ?? 0) + 1);
    expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBeLessThanOrEqual(1);
  });

  it('a tiny pool (4 digits, 3 per round) still rotates', () => {
    const counts = new Map<string, number>();
    for (const x of run(ids(4), 3, 20).flat()) counts.set(x, (counts.get(x) ?? 0) + 1);
    expect([...counts.values()].every((c) => c === 15)).toBe(true);
  });

  it('elements the child struggles with come back more often, but not in back-to-back rounds', () => {
    const mem: Record<string, Rotation> = {};
    useRotation(() => mem, (fact) => fact === 'x0');
    const rounds = run(ids(12), 3, 40, 7);
    const hard = rounds.filter((r) => r.includes('x0')).length;
    const other = rounds.filter((r) => r.includes('x5')).length;
    expect(hard).toBeGreaterThan(other * 1.4);
    for (let i = 1; i < rounds.length; i++) expect(rounds[i]!.includes('x0') && rounds[i - 1]!.includes('x0')).toBe(false);
    useRotation(() => mem, () => false);
  });

  it('struggling means a mistake last time or two in the last four', () => {
    expect(struggles(undefined)).toBe(false);
    expect(struggles('1111')).toBe(false);
    expect(struggles('1110')).toBe(true);
    expect(struggles('10101')).toBe(true);
    expect(struggles('0111')).toBe(false);
  });
});
