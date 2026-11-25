import { describe, expect, it } from 'vitest';
import { markPlayDay, realmOpen, startTrial, trialState, TRIAL_DAYS, type TrialSave } from './trial.ts';

const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;

describe('full version trial', () => {
  it('before the parent starts it, only the meadow is open and play does not use the trial', () => {
    const s: TrialSave = {};
    expect(trialState(s, day(1))).toMatchObject({ started: false, active: false, left: TRIAL_DAYS, used: 0 });
    expect(realmOpen(s, day(1), 'workshop')).toBe(false);
    expect(realmOpen(s, day(1), 'meadow')).toBe(true);
    markPlayDay(s, day(1));
    expect(s.trialDays ?? []).toHaveLength(0);
    startTrial(s);
    expect(realmOpen(s, day(1), 'workshop')).toBe(true);
  });

  it('old saves with trial days count as started', () => {
    expect(trialState({ trialDays: [day(1)] }, day(2))).toMatchObject({ started: true, active: true, used: 1 });
  });

  it('counts play days, not calendar days', () => {
    const s: TrialSave = { trialStarted: true };
    // Plays on days 1, 10, 20: three play days over three weeks.
    for (const d of [1, 10]) {
      markPlayDay(s, day(d));
      markPlayDay(s, day(d)); // a second task on the same day changes nothing
      expect(realmOpen(s, day(d), 'workshop')).toBe(true);
    }
    expect(trialState(s, day(15))).toMatchObject({ active: true, left: 0, used: 2 });
    markPlayDay(s, day(20));
    expect(trialState(s, day(20))).toMatchObject({ active: true, left: 0, used: TRIAL_DAYS });
    // Fourth play day: only the meadow remains.
    expect(realmOpen(s, day(21), 'workshop')).toBe(false);
    expect(realmOpen(s, day(21), 'meadow')).toBe(true);
    markPlayDay(s, day(21));
    expect(s.trialDays).toHaveLength(TRIAL_DAYS);
  });

  it('days left: a day does not count before the first play of the day', () => {
    const s: TrialSave = { trialStarted: true };
    expect(trialState(s, day(1))).toMatchObject({ active: true, left: 2, used: 0 });
    markPlayDay(s, day(1));
    expect(trialState(s, day(1))).toMatchObject({ left: 2, used: 1 });
    expect(trialState(s, day(2))).toMatchObject({ left: 1, used: 1 });
  });

  it('full version opens everything and does not consume the trial', () => {
    const s: TrialSave = { full: true, trialDays: [1, 2, 3].map(day) };
    expect(realmOpen(s, day(30), 'studio')).toBe(true);
    markPlayDay(s, day(30));
    expect(s.trialDays).toHaveLength(3);
  });
});
