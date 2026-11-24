/**
 * Writing to the progress journal (parent zone) from scenes. Journal logic: sim/journal.ts.
 */
import { addTask, addTempo, addTime, dayKey, newJournal, noteFact, prune, type Journal } from './sim/journal.ts';
import type { Activity } from './sim/realms.ts';
import { saveState, state } from './state.ts';

/** Journal date shift in days (only the autopilot in history mode: it plays past days). */
let dayShift = 0;
export function setDayShift(days: number): void {
  dayShift = days;
}

export const today = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + dayShift);
  return dayKey(d);
};

export function journal(): Journal {
  return (state.progress.journal ??= newJournal());
}

export function logTask(kind: Activity, misses: number): void {
  addTask(journal(), today(), kind, misses, state.progress.levels[kind]);
  // The first task of the day uses up a full-version trial day (lazy import: premium imports log).
  // The autopilot playing past days doesn't use up the trial.
  if (!dayShift) void import('./premium.ts').then((m) => m.countPlayDay());
}

/** Time of a correct answer (thinking speed) in a skill group at the activity's current level. */
export function logTempo(group: string, kind: Activity, sec: number): void {
  addTempo(journal(), today(), group, state.progress.levels[kind] ?? 0, sec);
}

/** `easy`: a choice of only two answers (easy to guess, counts as half). */
export function logFact(fact: string, ok: boolean, easy = false): void {
  noteFact(journal(), today(), fact, ok, easy);
}

let pending = 0;
let pruned = false;

/** Time the app is visible; saved every 30 s so we don't write to storage every frame. */
export function logTime(sec: number): void {
  if (sec <= 0 || sec > 1 || (typeof document !== 'undefined' && document.hidden)) return;
  pending += sec;
  if (pending < 30) return;
  const j = journal();
  if (!pruned) {
    prune(j, today());
    pruned = true;
  }
  addTime(j, today(), Math.round(pending));
  pending = 0;
  void saveState();
}
