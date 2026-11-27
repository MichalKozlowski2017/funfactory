/**
 * Full version trial: the parent starts it (behind the adult gate; on iOS as a free "3-day Trial" product, App Store 3.1.1).
 * Before that only the Riddle Meadow (meadow) is open. Once started, all realms are open for 3 calendar days after the
 * start day (started on the 27th: open until the end of the 30th, so starting in the evening loses nothing), then only
 * the Riddle Meadow remains until the parent buys the full version. Turning the clock back doesn't bring the trial back:
 * once the game has seen the trial end, it stays ended.
 */
import type { RealmId } from './realms.ts';

export const TRIAL_DAYS = 3;
/** Realm that is always free. */
export const FREE_REALM: RealmId = 'meadow';

export interface TrialSave {
  /** The parent started the trial. */
  trialStarted?: boolean;
  /** Day the trial started (YYYY-MM-DD). */
  trialStart?: string;
  /** The game saw the trial end (a clock turned back doesn't reopen it). */
  trialOver?: boolean;
  /** Play days of the old trial counted in play days (saves from before 2026-11-27): the first one is the start. */
  trialDays?: string[];
  /** Full version bought. */
  full?: boolean;
}

export interface TrialState {
  /** Full version bought. */
  full: boolean;
  /** The trial was started. */
  started: boolean;
  /** Trial is running (everything open today). */
  active: boolean;
  /** How many days with full access remain after today (0 = today is the last). */
  left: number;
  /** Last day with full access (YYYY-MM-DD), once the trial is started. */
  lastDay: string | null;
}

/** `day` (YYYY-MM-DD) moved by `n` days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (YYYY-MM-DD). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Start day: saved, or the first play day of an old save, or today for a started trial without a date. */
function startOf(save: TrialSave, today: string): string | null {
  const started = !!save.trialStarted || !!save.trialDays?.length;
  return started ? (save.trialStart ?? save.trialDays?.[0] ?? today) : null;
}

export function trialState(save: TrialSave, today: string): TrialState {
  const start = startOf(save, today);
  if (!start) return { full: !!save.full, started: false, active: false, left: TRIAL_DAYS, lastDay: null };
  const lastDay = addDays(start, TRIAL_DAYS);
  const active = !save.trialOver && today >= start && today <= lastDay;
  return { full: !!save.full, started: true, active, left: active ? daysBetween(today, lastDay) : 0, lastDay };
}

/**
 * The game is used today (first task of the day): fixes the start day of a started trial and remembers that the trial
 * has ended. Returns whether the save changed.
 */
export function markPlayDay(save: TrialSave, today: string): boolean {
  if (save.full) return false;
  const start = startOf(save, today);
  if (!start) return false;
  let changed = false;
  if (!save.trialStart) (save.trialStart = start), (changed = true);
  if (!save.trialOver && !trialState(save, today).active) (save.trialOver = true), (changed = true);
  return changed;
}

/** The parent starts the trial (after the adult gate and, on iOS, the free trial product) on `day` (YYYY-MM-DD). */
export function startTrial(save: TrialSave, day: string): void {
  save.trialStarted = true;
  save.trialStart = day;
}

/** Whether the realm is open today. */
export function realmOpen(save: TrialSave, today: string, realm: RealmId): boolean {
  if (realm === FREE_REALM || save.full) return true;
  return trialState(save, today).active;
}
