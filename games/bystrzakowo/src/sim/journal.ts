/**
 * Dziennik postępów dziecka (dla strefy rodzica). Zapisuje się tylko na urządzeniu.
 *
 * - `days`: czas zabawy i liczba zadań w każdym dniu (ostatnie ~3 miesiące),
 * - `facts`: historia odpowiedzi na konkretne umiejętności („liczba:5”, „kolor:zielony”, „gloska:sz”,
 *   „litera:A”…), ostatnie wyniki jako napis z „1” (dobrze za pierwszym razem) i „0” (z pomyłką),
 * - `learned`: kiedy umiejętność pierwszy raz została opanowana (do pocztówki „w tym tygodniu”).
 */
import type { Activity } from './realms.ts';

export interface DayLog {
  /** Sekundy zabawy. */
  sec: number;
  /** Rozwiązane zadania w każdej zabawie. */
  acts: Partial<Record<Activity, number>>;
  /** Pomyłki (suma ze wszystkich zabaw). */
  miss: number;
}

export interface Journal {
  days: Record<string, DayLog>;
  facts: Record<string, string>;
  learned: Record<string, string>;
}

/** Ile ostatnich wyników pamiętamy dla każdej umiejętności. */
const HISTORY = 6;
/** Ile dni dziennika trzymamy. */
const KEEP_DAYS = 92;

export const newJournal = (): Journal => ({ days: {}, facts: {}, learned: {} });

/** Klucz dnia w czasie lokalnym: „2026-11-21”. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Klucz dnia przesunięty o `delta` dni. */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d + delta));
}

function day(j: Journal, key: string): DayLog {
  return (j.days[key] ??= { sec: 0, acts: {}, miss: 0 });
}

export function addTime(j: Journal, key: string, sec: number): void {
  if (sec > 0) day(j, key).sec += sec;
}

/** Zadanie rozwiązane (z `misses` pomyłkami po drodze). */
export function addTask(j: Journal, key: string, kind: Activity, misses: number): void {
  const d = day(j, key);
  d.acts[kind] = (d.acts[kind] ?? 0) + 1;
  d.miss += misses;
}

/** Opanowana: trzy ostatnie odpowiedzi dobre za pierwszym razem. */
export const mastered = (history: string | undefined): boolean => !!history && history.length >= 3 && history.endsWith('111');

/** Sprawia kłopot: w czterech ostatnich próbach co najmniej dwie z pomyłką. */
export const struggling = (history: string | undefined): boolean => !!history && [...history.slice(-4)].filter((c) => c === '0').length >= 2;

/** Wynik próby dla umiejętności `fact` (np. „liczba:5”). */
export function noteFact(j: Journal, key: string, fact: string, ok: boolean): void {
  const h = ((j.facts[fact] ?? '') + (ok ? '1' : '0')).slice(-HISTORY);
  j.facts[fact] = h;
  if (mastered(h) && !j.learned[fact]) j.learned[fact] = key;
}

/** Usuwa dni starsze niż ~3 miesiące. */
export function prune(j: Journal, today: string): void {
  const oldest = shiftDay(today, -KEEP_DAYS);
  for (const k of Object.keys(j.days)) if (k < oldest) delete j.days[k];
}

/** Umiejętności danej grupy („liczba”, „kolor”…) z historią: wartość po dwukropku → historia. */
export function factsOf(j: Journal, group: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(j.facts)) if (k.startsWith(group + ':')) out.set(k.slice(group.length + 1), v);
  return out;
}

/** Podsumowanie dni od `from` do `to` włącznie. */
export function summarize(j: Journal, from: string, to: string): { days: number; sec: number; tasks: number; acts: Partial<Record<Activity, number>> } {
  let days = 0;
  let sec = 0;
  let tasks = 0;
  const acts: Partial<Record<Activity, number>> = {};
  for (const [k, d] of Object.entries(j.days)) {
    if (k < from || k > to) continue;
    if (d.sec >= 30 || Object.keys(d.acts).length) days++;
    sec += d.sec;
    for (const [a, n] of Object.entries(d.acts) as [Activity, number][]) {
      acts[a] = (acts[a] ?? 0) + n;
      tasks += n;
    }
  }
  return { days, sec, tasks, acts };
}
