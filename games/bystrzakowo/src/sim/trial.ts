/**
 * Full version trial: for 3 play days (not calendar days) all realms are open, then only the
 * Riddle Meadow (meadow) remains until the parent buys the full version. A day counts when the child solves
 * the first task; an app left unused does not consume the trial, and changing the clock achieves nothing
 * (what counts is the number of distinct days with play).
 */
import type { RealmId } from './realms.ts';

export const TRIAL_DAYS = 3;
/** Realm that is always free. */
export const FREE_REALM: RealmId = 'meadow';

export interface TrialSave {
  /** Play days during the trial (distinct, at most TRIAL_DAYS). */
  trialDays?: string[];
  /** Full version bought. */
  full?: boolean;
}

export interface TrialState {
  /** Full version bought. */
  full: boolean;
  /** Trial is running (everything open today). */
  active: boolean;
  /** How many play days with full access remain after today (0 = today is the last). */
  left: number;
  /** How many trial days have been used (including today, if there was play today). */
  used: number;
}

export function trialState(save: TrialSave, today: string): TrialState {
  const days = save.trialDays ?? [];
  const playedToday = days.includes(today);
  const used = days.length;
  // Open today: today is already in the trial or there is still room for a new day.
  const active = playedToday || used < TRIAL_DAYS;
  const left = Math.max(0, TRIAL_DAYS - used - (playedToday ? 0 : 1));
  return { full: !!save.full, active, left, used };
}

/** First task of the day: the play day counts toward the trial (if the trial is still running). */
export function markPlayDay(save: TrialSave, today: string): void {
  if (save.full) return;
  const days = (save.trialDays ??= []);
  if (days.includes(today) || days.length >= TRIAL_DAYS) return;
  days.push(today);
}

/** Whether the realm is open today. */
export function realmOpen(save: TrialSave, today: string, realm: RealmId): boolean {
  if (realm === FREE_REALM || save.full) return true;
  return trialState(save, today).active;
}
