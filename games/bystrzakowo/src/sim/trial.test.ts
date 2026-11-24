import { describe, expect, it } from 'vitest';
import { markPlayDay, realmOpen, trialState, TRIAL_DAYS, type TrialSave } from './trial.ts';

const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;

describe('próba pełnej wersji', () => {
  it('liczy dni zabawy, nie kalendarzowe', () => {
    const s: TrialSave = {};
    // Gra w dni 1, 10, 20: trzy dni zabawy w ciągu trzech tygodni.
    for (const d of [1, 10]) {
      markPlayDay(s, day(d));
      markPlayDay(s, day(d)); // drugie zadanie tego samego dnia nic nie zmienia
      expect(realmOpen(s, day(d), 'warsztat')).toBe(true);
    }
    expect(trialState(s, day(15))).toMatchObject({ active: true, left: 0, used: 2 });
    markPlayDay(s, day(20));
    expect(trialState(s, day(20))).toMatchObject({ active: true, left: 0, used: TRIAL_DAYS });
    // Czwarty dzień zabawy: zostaje tylko Polana.
    expect(realmOpen(s, day(21), 'warsztat')).toBe(false);
    expect(realmOpen(s, day(21), 'polana')).toBe(true);
    markPlayDay(s, day(21));
    expect(s.trialDays).toHaveLength(TRIAL_DAYS);
  });

  it('ile zostało: przed pierwszą zabawą dnia dzień jeszcze się nie liczy', () => {
    const s: TrialSave = {};
    expect(trialState(s, day(1))).toMatchObject({ active: true, left: 2, used: 0 });
    markPlayDay(s, day(1));
    expect(trialState(s, day(1))).toMatchObject({ left: 2, used: 1 });
    expect(trialState(s, day(2))).toMatchObject({ left: 1, used: 1 });
  });

  it('pełna wersja otwiera wszystko i nie zużywa próby', () => {
    const s: TrialSave = { full: true, trialDays: [1, 2, 3].map(day) };
    expect(realmOpen(s, day(30), 'pracownia')).toBe(true);
    markPlayDay(s, day(30));
    expect(s.trialDays).toHaveLength(3);
  });
});
