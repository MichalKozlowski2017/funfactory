/**
 * Child's progress journal (for the parent zone). Stored only on the device.
 *
 * - `days`: play time and number of tasks for each day (last ~3 months),
 * - `facts`: answer history for specific skills ("number:5", "color:green", "phoneme:sz",
 *   "letter:A"...), latest results as a string: "1" correct on the first try, "h" correct, but with
 *   a choice of two (half a point, since it can be guessed), "0" with a mistake,
 * - `learned`: when a skill was first mastered (for the "this week" postcard),
 * - `firsts`: day of the first solved task in each activity ("first times").
 */
import type { Activity } from './realms.ts';

export interface DayLog {
  /** Seconds of play. */
  sec: number;
  /** Solved tasks in each activity. */
  acts: Partial<Record<Activity, number>>;
  /** Mistakes (sum over all activities). */
  miss: number;
  /** Mistakes in each activity. */
  misses?: Partial<Record<Activity, number>>;
  /** Tasks solved without any mistake (since the version with stats; earlier days: missing). */
  clean?: Partial<Record<Activity, number>>;
  /** Difficulty level of the activity that day (the last one), for the "higher level" markers on the chart. */
  lvl?: Partial<Record<Activity, number>>;
  /** Times of correct answers in tenths of a second: key "<group>@<level>" (e.g. "color@1"). */
  ms?: Record<string, number[]>;
}

export interface Journal {
  days: Record<string, DayLog>;
  facts: Record<string, string>;
  learned: Record<string, string>;
  firsts?: Partial<Record<Activity, string>>;
}

/** How many recent results we keep for each skill. */
const HISTORY = 6;
/** How many days of the journal we keep. */
const KEEP_DAYS = 92;

export const newJournal = (): Journal => ({ days: {}, facts: {}, learned: {} });

/** Day key in local time: "2026-11-21". */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Day key shifted by `delta` days. */
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

/** Task solved (with `misses` mistakes along the way) at level `level`. */
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

/** Max answer times per group and level in one day (keeps the save small). */
const TEMPO_PER_DAY = 40;

/** Time of a correct answer without mistakes (seconds since the end of the prompt) in a skill group at a given level. */
export function addTempo(j: Journal, key: string, group: string, level: number, sec: number): void {
  const list = ((day(j, key).ms ??= {})[`${group}@${level}`] ??= []);
  if (list.length < TEMPO_PER_DAY) list.push(Math.round(sec * 10));
}

/**
 * Mastered: at least 3 points since the last mistake (three sure answers, or six with a choice
 * of two, which are easy to guess).
 */
export function mastered(history: string | undefined): boolean {
  if (!history) return false;
  let score = 0;
  for (let i = history.length - 1; i >= 0 && history[i] !== '0'; i--) score += history[i] === 'h' ? 0.5 : 1;
  return score >= 3;
}

/** Struggling: at least two of the last four attempts had a mistake. */
export const struggling = (history: string | undefined): boolean => !!history && [...history.slice(-4)].filter((c) => c === '0').length >= 2;

/** Attempt result for skill `fact` (e.g. "number:5"); `easy`: a choice of two (half a point). */
export function noteFact(j: Journal, key: string, fact: string, ok: boolean, easy = false): void {
  const h = ((j.facts[fact] ?? '') + (ok ? (easy ? 'h' : '1') : '0')).slice(-HISTORY);
  j.facts[fact] = h;
  if (mastered(h) && !j.learned[fact]) j.learned[fact] = key;
}

/** Removes days older than ~3 months. */
export function prune(j: Journal, today: string): void {
  const oldest = shiftDay(today, -KEEP_DAYS);
  for (const k of Object.keys(j.days)) if (k < oldest) delete j.days[k];
}

/** Skills of a given group ("number", "color"...) with history: value after the colon -> history. */
export function factsOf(j: Journal, group: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(j.facts)) if (k.startsWith(group + ':')) out.set(k.slice(group.length + 1), v);
  return out;
}

/** Summary of days from `from` to `to` inclusive. */
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

/** Play days after day `after` (for the "new in the parent zone" dot). */
export function playDaysAfter(j: Journal, after: string): number {
  return Object.entries(j.days).filter(([k, d]) => k > after && (d.sec >= 30 || Object.keys(d.acts).length)).length;
}
