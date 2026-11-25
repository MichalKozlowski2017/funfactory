/**
 * Full version trial: the parent starts it (behind the adult gate; on iOS as a free "3-day Trial" product, App Store 3.1.1).
 * Before that only the Riddle Meadow (meadow) is open. Once started, all realms are open for 3 play days (not calendar days),
 * then only the Riddle Meadow remains until the parent buys the full version. A day counts when the child solves
 * the first task; an app left unused does not consume the trial, and changing the clock achieves nothing
 * (what counts is the number of distinct days with play).
 */
import type { RealmId } from './realms.ts';

export const TRIAL_DAYS = 3;
/** Realm that is always free. */
export const FREE_REALM: RealmId = 'meadow';

export interface TrialSave {
  /** The parent started the trial. */
  trialStarted?: boolean;
  /** Play days during the trial (distinct, at most TRIAL_DAYS). */
  trialDays?: string[];
  /** Full version bought. */
  full?: boolean;
}

export interface TrialState {
  /** Full version bought. */
  full: boolean;
  /** The trial was started (saves from before the trial needed starting: any trial play day counts as started). */
  started: boolean;
  /** Trial is running (everything open today). */
  active: boolean;
  /** How many play days with full access remain after today (0 = today is the last). */
  left: number;
  /** How many trial days have been used (including today, if there was play today). */
  used: number;
}

export function trialState(save: TrialSave, today: string): TrialState {
  const days = save.trialDays ?? [];
  const started = !!save.trialStarted || days.length > 0;
  const playedToday = days.includes(today);
  const used = days.length;
  // Open today: the trial is started and today is already in it or there is still room for a new day.
  const active = started && (playedToday || used < TRIAL_DAYS);
  const left = started ? Math.max(0, TRIAL_DAYS - used - (playedToday ? 0 : 1)) : TRIAL_DAYS;
  return { full: !!save.full, started, active, left, used };
}

/** First task of the day: the play day counts toward the trial (if the trial is still running). */
export function markPlayDay(save: TrialSave, today: string): void {
  if (save.full || !trialState(save, today).started) return;
  const days = (save.trialDays ??= []);
  if (days.includes(today) || days.length >= TRIAL_DAYS) return;
  days.push(today);
}

/** The parent starts the trial (after the adult gate and, on iOS, the free trial product). */
export function startTrial(save: TrialSave): void {
  save.trialStarted = true;
}

/** Whether the realm is open today. */
export function realmOpen(save: TrialSave, today: string, realm: RealmId): boolean {
  if (realm === FREE_REALM || save.full) return true;
  return trialState(save, today).active;
}
