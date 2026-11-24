import { describe, expect, it } from 'vitest';
import { applyAge, markHand, needsHand, needsWelcome, startLevel } from './onboarding.ts';
import { newProgress } from './progress.ts';
import { MAX_LEVEL } from './puzzles.ts';

describe('pierwsze uruchomienie', () => {
  it('wiek ustawia poziom startowy w zakresie gry', () => {
    expect([3, 4, 5, 6].map(startLevel)).toEqual([0, 0, 1, 2]);
    expect(startLevel(2)).toBe(0);
    expect(startLevel(9)).toBe(MAX_LEVEL);
  });

  it('zmiana wieku nie cofa zabaw, w które dziecko już grało', () => {
    const p = newProgress();
    p.levels.counting = 2;
    applyAge(p, 3, new Set(['counting']));
    expect(p.age).toBe(3);
    expect(p.levels.counting).toBe(2);
    expect(p.levels.colors).toBe(0);
    applyAge(p, 6);
    expect(p.levels.colors).toBe(2);
  });

  it('powitanie tylko przy świeżym zapisie', () => {
    const p = newProgress();
    expect(needsWelcome(p)).toBe(true);
    p.onboarded = true;
    expect(needsWelcome(p)).toBe(false);
    const old = newProgress();
    old.rounds = 4;
    expect(needsWelcome(old)).toBe(false);
  });

  it('rączka raz na zabawę', () => {
    const p = newProgress();
    expect(needsHand(p, 'sorting')).toBe(true);
    markHand(p, 'sorting');
    markHand(p, 'sorting');
    expect(p.hands).toEqual(['sorting']);
    expect(needsHand(p, 'sorting')).toBe(false);
    expect(needsHand(p, 'colors')).toBe(true);
  });
});

describe('wiek w strefie rodzica', () => {
  it('przycisk przełącza wiek po kolei', async () => {
    const { nextAge, playedActivities } = await import('./onboarding.ts');
    expect([undefined, 3, 4, 5, 6].map((a) => nextAge(a))).toEqual([3, 4, 5, 6, 3]);
    const j = { days: { '2026-11-20': { sec: 60, acts: { counting: 3 }, miss: 0 }, '2026-11-21': { sec: 0, acts: { colors: 1 }, miss: 0 } }, facts: {}, learned: {} };
    expect([...playedActivities(j)].sort()).toEqual(['colors', 'counting']);
  });
});
