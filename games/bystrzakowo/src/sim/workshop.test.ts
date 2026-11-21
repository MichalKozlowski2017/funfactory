import { describe, expect, it } from 'vitest';
import { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { JIGSAW_ROUND, jigsawGrid, makeJigsawRound, snaps } from './jigsaw.ts';
import { ACTIVITIES, REALMS } from './realms.ts';
import { belongs, binCount, binLine, makeSortRound, makeSortTask, rulesFor, SORT_LINES, SORT_ROUND, SORT_RULES, sortCount, sortPromptLine } from './sorting.ts';

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
          expect(new Set(t.bins.map((b) => b.key)).size).toBe(t.bins.length);
          for (const { item, bin } of t.items) {
            expect(belongs(rule, t.bins[bin]!.key, item)).toBe(true);
            t.bins.forEach((b, j) => j !== bin && expect(belongs(rule, b.key, item), `${item.id} pasuje też do ${b.key}`).toBe(false));
            // Obrazek ze znaku skrzynki nie trafia do segregowania.
            expect(t.bins.some((b) => b.sign === item.id)).toBe(false);
          }
          t.bins.forEach((_, j) => expect(t.items.some((x) => x.bin === j)).toBe(true));
          expect(SORT_LINES).toContain(sortPromptLine(t));
          for (const b of t.bins) expect(SORT_LINES).toContain(binLine(rule, b.key));
        }
  });

  it('wszystkie reguły są dostępne na niższych poziomach, a na najwyższym co najmniej trzy', () => {
    expect(rulesFor(0)).toEqual([...SORT_RULES]);
    expect(rulesFor(2).length).toBeGreaterThanOrEqual(3);
  });

  it('runda ma różne reguły', () => {
    const round = makeSortRound(new Rng(5), 0);
    expect(round.length).toBe(SORT_ROUND);
    expect(new Set(round.map((t) => t.rule)).size).toBe(SORT_ROUND);
  });

  it('dużo różnych zestawów skrzynek (gra nie jest powtarzalna)', () => {
    const rng = new Rng(11);
    const combos = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const t = makeSortTask(rng, 1, rng.pick(rulesFor(1)));
      combos.add(`${t.rule}:${t.bins.map((b) => b.key).sort().join('+')}`);
    }
    expect(combos.size).toBeGreaterThan(40);
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

describe('co dalej (wzory)', () => {
  it('brakujący obrazek wynika ze wzoru i jest wśród odpowiedzi', async () => {
    const { makePatternTask } = await import('./patterns.ts');
    const rng = new Rng(13);
    for (const level of [0, 1, 2])
      for (let i = 0; i < 300; i++) {
        const t = makePatternTask(rng, level);
        expect(t.row.length).toBeGreaterThanOrEqual(6);
        expect(t.options).toContain(t.row[t.gap]);
        expect(new Set(t.options).size).toBe(t.options.length);
        expect(t.options.length).toBeGreaterThanOrEqual(2);
        // Okres wzoru: najkrótszy p, dla którego row[i] === row[i % p]; brakujący zgodny z nim.
        const p = [1, 2, 3, 4].find((k) => t.row.every((x, j) => x === t.row[j % k]))!;
        expect(p).toBeGreaterThan(1);
        // Jednoznaczność: tylko jedna odpowiedź pasuje do wzoru.
        expect(t.options.filter((o) => o === t.row[t.gap % p]).length).toBe(1);
      }
  });
});
