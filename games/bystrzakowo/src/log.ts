/**
 * Zapis do dziennika postępów (strefa rodzica) z poziomu scen. Logika dziennika: sim/journal.ts.
 */
import { addTask, addTempo, addTime, dayKey, newJournal, noteFact, prune, type Journal } from './sim/journal.ts';
import type { Activity } from './sim/realms.ts';
import { saveState, state } from './state.ts';

/** Przesunięcie daty dziennika w dniach (tylko autopilot w trybie historii: rozgrywa minione dni). */
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
  // Pierwsze zadanie dnia zużywa dzień próby pełnej wersji (import leniwy: premium importuje log).
  // Autopilot rozgrywający minione dni nie zużywa próby.
  if (!dayShift) void import('./premium.ts').then((m) => m.countPlayDay());
}

/** Czas dobrej odpowiedzi (tempo myślenia) w grupie umiejętności na bieżącym poziomie zabawy. */
export function logTempo(group: string, kind: Activity, sec: number): void {
  addTempo(journal(), today(), group, state.progress.levels[kind] ?? 0, sec);
}

/** `easy`: wybór tylko z dwóch odpowiedzi (łatwo zgadnąć, liczy się za pół). */
export function logFact(fact: string, ok: boolean, easy = false): void {
  noteFact(journal(), today(), fact, ok, easy);
}

let pending = 0;
let pruned = false;

/** Czas widocznej aplikacji; zapis co 30 s, żeby nie pisać do pamięci w każdej klatce. */
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
