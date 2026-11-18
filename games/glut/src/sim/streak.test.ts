import { describe, expect, it } from 'vitest';
import { playBot } from './bot.ts';
import { Run, STREAK } from './run.ts';

describe('rhythm streak', () => {
  it('fast jumps build a streak and pay milestone rewards', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const r = playBot(seed, { reaction: 0.35, maxTime: 60 });
      expect(r.bestStreak).toBeGreaterThanOrEqual(STREAK.every);
      expect(r.bonus).toBeGreaterThanOrEqual(STREAK.reward(STREAK.every));
    }
  });

  it('hesitating never reaches a milestone', () => {
    // Pojedyncze „szybkie” skoki się zdarzają (pierwszy strzał, zjazd po lodzie na półkę), ale nie seria.
    for (let seed = 1; seed <= 8; seed++) {
      const r = playBot(seed, { reaction: STREAK.window + 0.3, maxTime: 60 });
      expect(r.bestStreak).toBeLessThan(STREAK.every);
    }
  });

  it('breaks when the player waits too long', () => {
    const run = new Run(5);
    run.started = true;
    run.streak = 4;
    let broken: number | undefined;
    for (let i = 0; i < 60 * (STREAK.window + 0.2) && broken === undefined; i++) broken = run.step(1 / 60).streakBroken;
    expect(broken).toBe(4);
    expect(run.streak).toBe(0);
  });

  it('caps milestone rewards', () => {
    expect(STREAK.reward(5)).toBe(3);
    expect(STREAK.reward(10)).toBe(5);
    expect(STREAK.reward(100)).toBe(10);
  });
});

describe('air combo', () => {
  it('rewards several candies in one flight on landing', () => {
    const run = new Run(3);
    run.launch(0, -1400);
    run.step(1 / 60);
    const free = [...run.shaft.candies.values()].flat().filter((c) => !c.taken).slice(0, 3);
    for (const c of free) Object.assign(c, { x: run.slime.x, y: run.slime.y });
    let combo: { count: number; reward: number } | undefined;
    for (let i = 0; i < 600 && !combo; i++) {
      const r = run.step(1 / 60);
      combo = r.airCombo;
      if (r.landed) break;
    }
    expect(combo?.count).toBeGreaterThanOrEqual(3);
    expect(combo?.reward).toBe(STREAK.airReward(combo?.count ?? 0));
    expect(run.bonus).toBe(combo?.reward);
  });
});
