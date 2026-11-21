import { describe, expect, it } from 'vitest';
import { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { JIGSAW_ROUND, jigsawGrid, makeJigsawRound, snaps } from './jigsaw.ts';
import { ACTIVITIES, REALMS } from './realms.ts';
import { binCount, CATEGORY_SIGN, makeSortRound, makeSortTask, rulesFor, SORT_LINES, SORT_ROUND, sortCount, sortPromptLine } from './sorting.ts';

const levels = [0, 1, 2];

describe('krainy', () => {
  it('każda zabawa jest w dokładnie jednej krainie', () => {
    const all = REALMS.flatMap((r) => r.rows.flat());
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...ACTIVITIES].sort());
  });
});

describe('segregowanie', () => {
  it('każdy obiekt pasuje do swojej skrzynki i do żadnej innej', () => {
    const rng = new Rng(3);
    for (const level of levels)
      for (const rule of rulesFor(level))
        for (let i = 0; i < 200; i++) {
          const t = makeSortTask(rng, level, rule);
          expect(t.bins.length).toBe(binCount(level));
          expect(t.items.length).toBe(sortCount(level));
          expect(new Set(t.items.map((x) => x.item.id)).size).toBe(t.items.length);
          const fits = (item: (typeof ITEMS)[number], key: string) => item.category === key || item.color === key || item.home === key;
          for (const { item, bin } of t.items) {
            expect(fits(item, t.bins[bin]!.key)).toBe(true);
            t.bins.forEach((b, j) => j !== bin && expect(fits(item, b.key), `${item.id} pasuje też do ${b.key}`).toBe(false));
            // Obrazek ze znaku skrzynki nie trafia do segregowania.
            expect(t.bins.some((b) => b.sign === item.id)).toBe(false);
          }
          // Każda skrzynka coś dostaje.
          t.bins.forEach((_, j) => expect(t.items.some((x) => x.bin === j)).toBe(true));
          expect(SORT_LINES).toContain(sortPromptLine(t));
        }
  });

  it('runda ma różne reguły', () => {
    const round = makeSortRound(new Rng(5), 0);
    expect(round.length).toBe(SORT_ROUND);
    expect(new Set(round.map((t) => t.rule)).size).toBe(SORT_ROUND);
  });

  it('znaki kategorii istnieją w katalogu', () => {
    for (const id of Object.values(CATEGORY_SIGN)) expect(ITEMS.some((i) => i.id === id)).toBe(true);
  });
});

describe('układanka', () => {
  it('siatka rośnie z poziomem, obrazki bez powtórzeń', () => {
    expect(levels.map((l) => jigsawGrid(l).cols * jigsawGrid(l).rows)).toEqual([2, 4, 6]);
    const round = makeJigsawRound(new Rng(1));
    expect(round.length).toBe(JIGSAW_ROUND);
    expect(new Set(round).size).toBe(JIGSAW_ROUND);
  });

  it('przyciąganie kawałka z tolerancją', () => {
    expect(snaps(30, -20, 200, 200)).toBe(true);
    expect(snaps(90, 0, 200, 200)).toBe(false);
  });
});
