import { describe, expect, it } from 'vitest';
import { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { JIGSAW_ROUND, jigsawGrid, makeJigsawRound, snaps } from './jigsaw.ts';
import { ACTIVITIES, REALMS } from './realms.ts';
import { belongs, binCount, binLine, makeSortRound, makeSortTask, rulesFor, SORT_LINES, SORT_ROUND, SORT_RULES, sortCount, sortPromptLine } from './sorting.ts';

const levels = [0, 1, 2];

describe('realms', () => {
  it('every activity is in exactly one realm', () => {
    const all = REALMS.flatMap((r) => r.rows.flat());
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...ACTIVITIES].sort());
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('classifying', () => {
  it('every item fits its own crate and no other', () => {
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
            t.bins.forEach((b, j) => j !== bin && expect(belongs(rule, b.key, item), `${item.id} also fits ${b.key}`).toBe(false));
            // A picture from a crate sign doesn't go into sorting.
            expect(t.bins.some((b) => b.sign === item.id)).toBe(false);
          }
          t.bins.forEach((_, j) => expect(t.items.some((x) => x.bin === j)).toBe(true));
          expect(SORT_LINES).toContain(sortPromptLine(t));
          for (const b of t.bins) expect(SORT_LINES).toContain(binLine(rule, b.key));
        }
  }, 30000);

  it('all rules are available on the lower levels, and at least three on the top one', () => {
    expect(rulesFor(0)).toEqual([...SORT_RULES]);
    expect(rulesFor(2).length).toBeGreaterThanOrEqual(3);
  });

  it('a round has different rules', () => {
    const round = makeSortRound(new Rng(5), 0);
    expect(round.length).toBe(SORT_ROUND);
    expect(new Set(round.map((t) => t.rule)).size).toBe(SORT_ROUND);
  });

  it('many different crate sets (the game does not repeat itself)', () => {
    const rng = new Rng(11);
    const combos = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const t = makeSortTask(rng, 1, rng.pick(rulesFor(1)));
      combos.add(`${t.rule}:${t.bins.map((b) => b.key).sort().join('+')}`);
    }
    expect(combos.size).toBeGreaterThan(40);
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('jigsaw', () => {
  it('grid grows with the level, pictures without repeats', () => {
    expect(levels.map((l) => jigsawGrid(l).cols * jigsawGrid(l).rows)).toEqual([2, 4, 6]);
    const round = makeJigsawRound(new Rng(1));
    expect(round.length).toBe(JIGSAW_ROUND);
    expect(new Set(round).size).toBe(JIGSAW_ROUND);
  });

  it('piece snapping with tolerance', () => {
    expect(snaps(30, -20, 200, 200)).toBe(true);
    expect(snaps(90, 0, 200, 200)).toBe(false);
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('what comes next (patterns)', () => {
  it('the missing picture follows from the pattern and is among the answers', async () => {
    const { makePatternTask } = await import('./patterns.ts');
    const rng = new Rng(13);
    for (const level of [0, 1, 2])
      for (let i = 0; i < 300; i++) {
        const t = makePatternTask(rng, level);
        expect(t.row.length).toBeGreaterThanOrEqual(5); // two full repetitions before the gap
        expect(t.options).toContain(t.row[t.gap]);
        expect(new Set(t.options).size).toBe(t.options.length);
        expect(t.options.length).toBeGreaterThanOrEqual(2);
        // Pattern period: the shortest p for which row[i] === row[i % p]; the missing one matches it.
        const p = [1, 2, 3, 4].find((k) => t.row.every((x, j) => x === t.row[j % k]))!;
        expect(p).toBeGreaterThan(1);
        // Unambiguity: only one answer fits the pattern.
        expect(t.options.filter((o) => o === t.row[t.gap % p]).length).toBe(1);
      }
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('shape sorter', () => {
  it('different shapes, count grows with the level', async () => {
    const { makeShapeBoard, shapeCount } = await import('./shapes.ts');
    const rng = new Rng(21);
    for (const level of [0, 1, 2])
      for (let i = 0; i < 100; i++) {
        const b = makeShapeBoard(rng, level);
        expect(b.length).toBe(shapeCount(level));
        expect(new Set(b).size).toBe(b.length);
        if (level === 0) expect(b.every((s) => ['circle', 'square', 'triangle', 'heart', 'star', 'moon', 'drop'].includes(s))).toBe(true);
      }
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('melody', () => {
  it('length grows with the level, bars within range', async () => {
    const { makeMelody, barCount, melodyLength, MELODY_ROUND } = await import('./melody.ts');
    const rng = new Rng(2);
    for (const level of [0, 1, 2])
      for (let t = 0; t < MELODY_ROUND; t++) {
        const m = makeMelody(rng, level, t);
        expect(m.length).toBe(melodyLength(level, t));
        expect(m.every((b) => b >= 0 && b < barCount(level))).toBe(true);
      }
    expect(melodyLength(0, 0)).toBe(2);
    expect(melodyLength(2, 3)).toBe(5);
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('syllables', () => {
  it('syllables join into the picture name, tiles are a permutation', async () => {
    const { WORDS, makeSyllableRound, scramble, SYLLABLE_ROUND } = await import('./syllables.ts');
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
    for (const w of WORDS) {
      const item = ITEMS.find((i) => i.id === w.item)!;
      expect(item, w.item).toBeDefined();
      // The joined syllables give the item's name (or its stem for diminutives; we compare the start).
      expect(strip(w.syl.join('')), w.item).toBe(strip(item.name));
    }
    const rng = new Rng(4);
    for (const level of [0, 1, 2]) {
      const r = makeSyllableRound(rng, level);
      expect(r.length).toBe(SYLLABLE_ROUND);
      for (const w of r) {
        const s = scramble(rng, w.syl);
        expect([...s].sort()).toEqual(w.syl.map((_, i) => i));
      }
    }
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});

describe('stories', () => {
  it('three stories per round, first frame preset only on level 0', async () => {
    const { makeStoryRound, presetFrames, STORY_ROUND } = await import('./stories.ts');
    const r = makeStoryRound(new Rng(1));
    expect(r.length).toBe(STORY_ROUND);
    expect(new Set(r).size).toBe(STORY_ROUND);
    expect([0, 1, 2].map(presetFrames)).toEqual([1, 0, 0]);
  });

  it('neither tile position nor color reveals the order (two syllables)', async () => {
    const { scramble, tileColors } = await import('./syllables.ts');
    const rng = new Rng(8);
    let firstLeft = 0, pinkFirst = 0;
    for (let i = 0; i < 400; i++) {
      if (scramble(rng, ['A', 'B'])[0] === 0) firstLeft++;
      if (tileColors(rng, ['pink', 'blue', 'yellow'], 2)[0] === 'pink') pinkFirst++;
    }
    expect(firstLeft).toBeGreaterThan(140);
    expect(firstLeft).toBeLessThan(260);
    expect(pinkFirst).toBeLessThan(200);
  });
});
