import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, EMPTY_STATS, newlyEarned, normalizeStats, progressOf } from './achievements.ts';
import { ITEMS } from './shop.ts';

describe('achievements', () => {
  it('have unique ids and items that exist and point back', () => {
    expect(new Set(ACHIEVEMENTS.map((x) => x.id)).size).toBe(ACHIEVEMENTS.length);
    for (const d of ACHIEVEMENTS) {
      expect(d.goal).toBeGreaterThan(0);
      if (!d.item) continue;
      const item = ITEMS.find((i) => i.id === d.item);
      expect(item?.unlock).toBe(d.id);
    }
    // Każda rzecz „za osiągnięcie” ma swoje osiągnięcie.
    for (const i of ITEMS.filter((x) => x.unlock)) expect(ACHIEVEMENTS.find((d) => d.id === i.unlock)?.item).toBe(i.id);
  });

  it('earns what the progress reaches, once', () => {
    const p = progressOf({ ...EMPTY_STATS, bestStreak: 12, runs: 3 }, { best: 120, dailyStreak: 0, worn: 1 });
    const ids = newlyEarned(p, []).map((d) => d.id);
    expect(ids).toEqual(['h50', 'h100', 's5', 's10']);
    expect(newlyEarned(p, ids)).toEqual([]);
  });

  it('time goals need a result at or under the goal', () => {
    const base = { best: 0, dailyStreak: 0, worn: 0 };
    const ids = (stats: Partial<typeof EMPTY_STATS>) => newlyEarned(progressOf({ ...EMPTY_STATS, ...stats }, base), []).map((d) => d.id);
    expect(ids({ fast100: 0 })).not.toContain('fast100');
    expect(ids({ fast100: 31 })).not.toContain('fast100');
    expect(ids({ fast100: 29.5 })).toContain('fast100');
    expect(ids({ candies60: 60, longest: 130 })).toEqual(expect.arrayContaining(['candies60', 'live120']));
  });

  it('normalizes stats from old or broken saves', () => {
    expect(normalizeStats(undefined)).toEqual(EMPTY_STATS);
    expect(normalizeStats({ runs: '4', powers: ['shell', 'shell', 3], rescues: -2 })).toEqual({ ...EMPTY_STATS, runs: 4, powers: ['shell'] });
  });
});
