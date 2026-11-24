/**
 * Dziennik postępów dziecka (dla strefy rodzica). Zapisuje się tylko na urządzeniu.
 *
 * - `days`: czas zabawy i liczba zadań w każdym dniu (ostatnie ~3 miesiące),
 * - `facts`: historia odpowiedzi na konkretne umiejętności („liczba:5”, „kolor:zielony”, „gloska:sz”,
 *   „litera:A”…), ostatnie wyniki jako napis: „1” dobrze za pierwszym razem, „h” dobrze, ale przy
 *   wyborze z dwóch (pół punktu, bo można zgadnąć), „0” z pomyłką,
 * - `learned`: kiedy umiejętność pierwszy raz została opanowana (do pocztówki „w tym tygodniu”),
 * - `firsts`: dzień pierwszego rozwiązanego zadania w każdej zabawie („pierwsze razy”).
 */
import type { Activity } from './realms.ts';

export interface DayLog {
  /** Sekundy zabawy. */
  sec: number;
  /** Rozwiązane zadania w każdej zabawie. */
  acts: Partial<Record<Activity, number>>;
  /** Pomyłki (suma ze wszystkich zabaw). */
  miss: number;
  /** Pomyłki w każdej zabawie. */
  misses?: Partial<Record<Activity, number>>;
  /** Zadania rozwiązane bez żadnej pomyłki (od wersji ze statystykami; wcześniejsze dni: brak). */
  clean?: Partial<Record<Activity, number>>;
  /** Poziom trudności zabawy tego dnia (ostatni), do znaczników „wyższy poziom” na wykresie. */
  lvl?: Partial<Record<Activity, number>>;
  /** Czasy dobrych odpowiedzi w dziesiątych sekundy: klucz „<grupa>@<poziom>” (np. „kolor@1”). */
  ms?: Record<string, number[]>;
}

export interface Journal {
  days: Record<string, DayLog>;
  facts: Record<string, string>;
  learned: Record<string, string>;
  firsts?: Partial<Record<Activity, string>>;
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

/** Zadanie rozwiązane (z `misses` pomyłkami po drodze) na poziomie `level`. */
export function addTask(j: Journal, key: string, kind: Activity, misses: number, level?: number): void {
  const d = day(j, key);
  d.acts[kind] = (d.acts[kind] ?? 0) + 1;
  d.miss += misses;
  if (misses) (d.misses ??= {})[kind] = (d.misses[kind] ?? 0) + misses;
  else (d.clean ??= {})[kind] = (d.clean[kind] ?? 0) + 1;
  if (level !== undefined) (d.lvl ??= {})[kind] = level;
  j.firsts ??= {};
  j.firsts[kind] ??= key;
}

/** Najwięcej czasów odpowiedzi na grupę i poziom w jednym dniu (zapis zostaje mały). */
const TEMPO_PER_DAY = 40;

/** Czas dobrej odpowiedzi bez pomyłki (sekundy od końca polecenia) w grupie umiejętności na danym poziomie. */
export function addTempo(j: Journal, key: string, group: string, level: number, sec: number): void {
  const list = ((day(j, key).ms ??= {})[`${group}@${level}`] ??= []);
  if (list.length < TEMPO_PER_DAY) list.push(Math.round(sec * 10));
}

/**
 * Opanowana: od ostatniej pomyłki co najmniej 3 punkty (trzy pewne odpowiedzi albo sześć przy wyborze
 * z dwóch, które łatwo zgadnąć).
 */
export function mastered(history: string | undefined): boolean {
  if (!history) return false;
  let score = 0;
  for (let i = history.length - 1; i >= 0 && history[i] !== '0'; i--) score += history[i] === 'h' ? 0.5 : 1;
  return score >= 3;
}

/** Sprawia kłopot: w czterech ostatnich próbach co najmniej dwie z pomyłką. */
export const struggling = (history: string | undefined): boolean => !!history && [...history.slice(-4)].filter((c) => c === '0').length >= 2;

/** Wynik próby dla umiejętności `fact` (np. „liczba:5”); `easy`: wybór z dwóch (pół punktu). */
export function noteFact(j: Journal, key: string, fact: string, ok: boolean, easy = false): void {
  const h = ((j.facts[fact] ?? '') + (ok ? (easy ? 'h' : '1') : '0')).slice(-HISTORY);
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
export function summarize(
  j: Journal,
  from: string,
  to: string,
): { days: number; sec: number; tasks: number; acts: Partial<Record<Activity, number>>; misses: Partial<Record<Activity, number>> } {
  let days = 0;
  let sec = 0;
  let tasks = 0;
  const acts: Partial<Record<Activity, number>> = {};
  const misses: Partial<Record<Activity, number>> = {};
  for (const [k, d] of Object.entries(j.days)) {
    if (k < from || k > to) continue;
    if (d.sec >= 30 || Object.keys(d.acts).length) days++;
    sec += d.sec;
    for (const [a, n] of Object.entries(d.acts) as [Activity, number][]) {
      acts[a] = (acts[a] ?? 0) + n;
      tasks += n;
    }
    for (const [a, n] of Object.entries(d.misses ?? {}) as [Activity, number][]) misses[a] = (misses[a] ?? 0) + n;
  }
  return { days, sec, tasks, acts, misses };
}

/** Dni zabawy po dniu `after` (do kropki „nowe w strefie rodzica”). */
export function playDaysAfter(j: Journal, after: string): number {
  return Object.entries(j.days).filter(([k, d]) => k > after && (d.sec >= 30 || Object.keys(d.acts).length)).length;
}
