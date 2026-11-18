import { describe, expect, it } from 'vitest';
import { playBot } from './bot.ts';
import { Run, SYRUP } from './run.ts';
import { generateCandies, generateChunk, Shaft, SHAFT } from './shaft.ts';
import { contact } from './physics.ts';

describe('generator', () => {
  it('is deterministic per seed and chunk, regardless of order', () => {
    const a = generateChunk(42, 5);
    generateChunk(42, 9);
    const b = generateChunk(42, 5);
    expect(a).toEqual(b);
    expect(generateChunk(43, 5)).not.toEqual(a);
  });

  it('keeps every ledge gap within jump reach', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ledges = Array.from({ length: 15 }, (_, k) => generateChunk(seed, k))
        .flat()
        .filter((b) => b.h === 36)
        .map((b) => b.y)
        .sort((x, y) => y - x);
      for (let i = 1; i < ledges.length; i++) {
        expect((ledges[i - 1] as number) - (ledges[i] as number)).toBeLessThan(800);
      }
    }
  });

  it('streams chunks up and drops them far below', () => {
    const shaft = new Shaft(1);
    shaft.update(-60, -60);
    expect([...shaft.chunks.keys()]).toEqual([0, 1, 2]);
    const change = shaft.update(-10 * SHAFT.chunk, -8 * SHAFT.chunk);
    expect(change.added).toContain(12);
    expect(change.removed).toContain(0);
  });
});

describe('candies', () => {
  it('never spawn inside blocks and are deterministic', () => {
    for (let k = 0; k < 10; k++) {
      const blocks = generateChunk(5, k);
      const candies = generateCandies(5, k, blocks);
      expect(candies).toEqual(generateCandies(5, k, blocks));
      for (const c of candies) for (const b of blocks) expect(contact(c.x, c.y, 30, b)).toBeNull();
    }
  });

  it('get collected on contact, once', () => {
    const run = new Run(3);
    const all = [...run.shaft.candies.values()].flat();
    const c = all[0];
    expect(c).toBeDefined();
    if (!c) return;
    run.slime.state = 'stuck';
    run.slime.x = c.x;
    run.slime.y = c.y;
    const r1 = run.step(1 / 60);
    const r2 = run.step(1 / 60);
    expect(r1.collected?.map((x) => x.id)).toContain(c.id);
    expect(r2.collected ?? []).not.toContain(c);
    expect(run.candies).toBeGreaterThanOrEqual(1);
  });
});

describe('Run', () => {
  it('syrup waits for the first shot, then drowns an idle slime', () => {
    const run = new Run(1);
    for (let i = 0; i < 600; i++) run.step(1 / 60);
    expect(run.syrupY).toBe(SYRUP.startY);
    run.launch(0, -600);
    let drowned = false;
    for (let i = 0; i < 60 * 30 && !drowned; i++) drowned = !!run.step(1 / 60).drowned;
    expect(drowned).toBe(true);
    expect(run.over).toBe(true);
  });

  it('is climbable: a simple bot gets well past the start on most seeds', () => {
    const results = Array.from({ length: 12 }, (_, i) => playBot(i + 1, { maxTime: 120 }));
    const meters = results.map((r) => r.meters).sort((a, b) => a - b);
    const median = meters[Math.floor(meters.length / 2)] as number;
    expect(median).toBeGreaterThanOrEqual(80);
  });
});
