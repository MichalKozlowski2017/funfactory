/**
 * Zapis do dziennika postępów (strefa rodzica) z poziomu scen. Logika dziennika: sim/journal.ts.
 */
import { addTask, addTime, dayKey, newJournal, noteFact, prune, type Journal } from './sim/journal.ts';
import type { Activity } from './sim/realms.ts';
import { saveState, state } from './state.ts';

export const today = (): string => dayKey(new Date());

export function journal(): Journal {
  return (state.progress.journal ??= newJournal());
}

export function logTask(kind: Activity, misses: number): void {
  addTask(journal(), today(), kind, misses);
  // Pierwsze zadanie dnia zużywa dzień próby pełnej wersji (import leniwy: premium importuje log).
  void import('./premium.ts').then((m) => m.countPlayDay());
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
