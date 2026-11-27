import { describe, expect, it } from 'vitest';
import { addDays, markPlayDay, realmOpen, startTrial, trialState, TRIAL_DAYS, type TrialSave } from './trial.ts';

const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;

describe('full version trial', () => {
  it('before the parent starts it, only the meadow is open and play does not start the trial', () => {
    const s: TrialSave = {};
    expect(trialState(s, day(1))).toMatchObject({ started: false, active: false, left: TRIAL_DAYS, lastDay: null });
    expect(realmOpen(s, day(1), 'workshop')).toBe(false);
    expect(realmOpen(s, day(1), 'meadow')).toBe(true);
    expect(markPlayDay(s, day(1))).toBe(false);
    startTrial(s, day(1));
    expect(realmOpen(s, day(1), 'workshop')).toBe(true);
  });

  it('runs for 3 calendar days after the start day, whether the child plays or not', () => {
    const s: TrialSave = {};
    startTrial(s, day(1));
    expect(trialState(s, day(1))).toMatchObject({ active: true, left: 3, lastDay: day(4) });
    expect(trialState(s, day(3))).toMatchObject({ active: true, left: 1 });
    expect(trialState(s, day(4))).toMatchObject({ active: true, left: 0 });
    expect(realmOpen(s, day(5), 'workshop')).toBe(false);
    expect(realmOpen(s, day(5), 'meadow')).toBe(true);
    expect(trialState(s, day(5))).toMatchObject({ started: true, active: false, left: 0 });
  });

  it('a clock turned back does not reopen a trial the game saw ending', () => {
    const s: TrialSave = {};
    startTrial(s, day(1));
    expect(markPlayDay(s, day(9))).toBe(true);
    expect(s.trialOver).toBe(true);
    expect(realmOpen(s, day(2), 'studio')).toBe(false);
    // A date before the start is not inside the trial either.
    expect(realmOpen({ trialStarted: true, trialStart: day(5) }, day(3), 'studio')).toBe(false);
  });

  it('old saves (trial in play days) start at their first play day', () => {
    const s: TrialSave = { trialStarted: true, trialDays: [day(2), day(9)] };
    expect(trialState(s, day(3))).toMatchObject({ active: true, lastDay: day(5) });
    expect(markPlayDay(s, day(3))).toBe(true);
    expect(s.trialStart).toBe(day(2));
    // Started without play days: the trial starts on the first day the game is used.
    const t: TrialSave = { trialStarted: true };
    markPlayDay(t, day(7));
    expect(trialState(t, day(10))).toMatchObject({ active: true, left: 0 });
  });

  it('full version opens everything', () => {
    const s: TrialSave = { full: true, trialStarted: true, trialStart: day(1), trialOver: true };
    expect(realmOpen(s, day(30), 'studio')).toBe(true);
    expect(markPlayDay(s, day(30))).toBe(false);
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-27', 3)).toBe('2028-03-01');
  });
});
