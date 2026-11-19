/**
 * Wyzwanie dnia: wszyscy grają tę samą studnię (seed z daty), więc wyniki da się porównać.
 * Lokalnie trzymamy wyniki z ostatnich dni; ranking globalny idzie przez Game Center / Play Games.
 */

export interface DailyRecord {
  /** Dzień w formacie RRRR-MM-DD (UTC). */
  day: string;
  best: number;
  tries: number;
}

/** Ile ostatnich dni pamiętamy. */
export const DAILY_KEEP = 30;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Klucz dnia w UTC: wyzwanie zmienia się o północy UTC (w Polsce o 1:00 albo 2:00), razem
 * z dzienną tablicą wyników w Game Center. Wszyscy na świecie grają w danej chwili tę samą studnię.
 */
export function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Seed studni dla dnia: ten sam dla wszystkich, inny niż seedy zwykłych biegów. */
export function dailySeed(day: string): number {
  // FNV-1a + mieszanie bitów.
  let h = 0x811c9dc5;
  for (const ch of `glut-daily:${day}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % (2 ** 31 - 2)) + 1;
}

/** Zapisuje próbę dnia. Zwraca nową listę i czy to nowy najlepszy wynik dnia. */
export function recordDaily(list: DailyRecord[], day: string, meters: number): { list: DailyRecord[]; improved: boolean; record: DailyRecord } {
  const old = list.find((r) => r.day === day);
  const record: DailyRecord = { day, best: Math.max(old?.best ?? 0, meters), tries: (old?.tries ?? 0) + 1 };
  const rest = list.filter((r) => r.day !== day);
  const next = [...rest, record].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-DAILY_KEEP);
  return { list: next, improved: !old || meters > old.best, record };
}

/** Seria dni z rzędu z co najmniej jedną próbą, kończąca się dziś albo wczoraj. */
export function dailyStreak(list: DailyRecord[], today: string): number {
  const days = new Set(list.map((r) => r.day));
  const d = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export function normalizeDaily(raw: unknown): DailyRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is DailyRecord => !!r && typeof r.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.day))
    .map((r) => ({ day: r.day, best: Number(r.best) || 0, tries: Number(r.tries) || 0 }))
    .slice(-DAILY_KEEP);
}

/** Ostatnie `n` dni (UTC) kończące się dziś, od najstarszego. */
export function lastDays(today: string, n: number): string[] {
  const d = new Date(`${today}T12:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(dayKey(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

/** Sekundy do następnego wyzwania (północ UTC). */
export function secondsToNextDay(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.ceil((next - now.getTime()) / 1000));
}

/** Dzień tygodnia dla klucza dnia: 0 = poniedziałek … 6 = niedziela. */
export function weekday(day: string): number {
  return (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
}
