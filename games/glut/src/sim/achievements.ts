/**
 * Osiągnięcia: cele na długą grę. Nagrody to cukierki, a cztery osiągnięcia dają rzeczy do szafy,
 * których nie da się kupić. Wszystko liczone z liczników (`Stats`) i rekordu, więc postęp widać
 * w panelu (np. 12/25), a sprawdzenie jest czystą funkcją.
 */

/** Liczniki gracza (od początku gry). */
export interface Stats {
  runs: number;
  /** Wszystkie zebrane cukierki (z premiami). */
  candies: number;
  bestStreak: number;
  /** Najwięcej skoków w jednym locie. */
  maxAirJumps: number;
  /** Najwięcej cukierków w jednym skoku. */
  maxAirCombo: number;
  rescues: number;
  bounces: number;
  crumbles: number;
  /** Rodzaje zebranych power-upów. */
  powers: string[];
  dailyRuns: number;
  /** Najszybsze dojście do 100 / 200 / 300 m w jednym biegu (s czasu gry; 0 = jeszcze nie). */
  fast100: number;
  fast200: number;
  fast300: number;
  /** Najwięcej cukierków w pierwszej minucie biegu. */
  candies60: number;
  /** Najdłuższy bieg (s czasu gry). */
  longest: number;
}

export const EMPTY_STATS: Stats = {
  runs: 0,
  candies: 0,
  bestStreak: 0,
  maxAirJumps: 0,
  maxAirCombo: 0,
  rescues: 0,
  bounces: 0,
  crumbles: 0,
  powers: [],
  dailyRuns: 0,
  fast100: 0,
  fast200: 0,
  fast300: 0,
  candies60: 0,
  longest: 0,
};

/** Co mierzy osiągnięcie. */
export type Metric =
  | 'best'
  | 'streak'
  | 'airJumps'
  | 'airCombo'
  | 'rescues'
  | 'bounces'
  | 'crumbles'
  | 'powers'
  | 'runs'
  | 'candies'
  | 'dailyRuns'
  | 'dailyStreak'
  | 'worn'
  | 'fast100'
  | 'fast200'
  | 'fast300'
  | 'candies60'
  | 'longest';

/** Cele „na czas”: wartość ma być nie większa niż cel (0 = jeszcze nie ma wyniku). */
export const LOWER_IS_BETTER: ReadonlySet<Metric> = new Set(['fast100', 'fast200', 'fast300']);

/** Czas jako m:ss. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Czy wartość spełnia cel osiągnięcia. */
export function reached(metric: Metric, value: number, goal: number): boolean {
  return LOWER_IS_BETTER.has(metric) ? value > 0 && value <= goal : value >= goal;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  metric: Metric;
  goal: number;
  /** Nagroda w cukierkach. */
  reward: number;
  /** Rzecz do szafy (id), jeśli osiągnięcie ją daje. */
  item?: string;
}

const a = (id: string, name: string, desc: string, metric: Metric, goal: number, reward: number, item?: string): AchievementDef => ({
  id,
  name,
  desc,
  metric,
  goal,
  reward,
  ...(item ? { item } : {}),
});

export const ACHIEVEMENTS: AchievementDef[] = [
  a('h50', 'Pierwsze kroki', 'Wejdź na 50 m', 'best', 50, 100),
  a('h100', 'Czekoladowa kopalnia', 'Dotrzyj do 100 m', 'best', 100, 200),
  a('h200', 'Żelkowy las', 'Dotrzyj do 200 m', 'best', 200, 300),
  a('h300', 'Ponad chmury', 'Dotrzyj do 300 m', 'best', 300, 500),
  a('h400', 'Spalony karmel', 'Dotrzyj do 400 m', 'best', 400, 700),
  a('h500', 'Lukrecjowe bagno', 'Dotrzyj do 500 m', 'best', 500, 900),
  a('h600', 'Opuszczona fabryka', 'Dotrzyj do 600 m', 'best', 600, 1200),
  a('h700', 'Cukrowy koszmar', 'Dotrzyj do 700 m', 'best', 700, 1500, 'horns'),
  a('s5', 'W rytmie', 'Seria ×5', 'streak', 5, 100),
  a('s10', 'Super rytm', 'Seria ×10', 'streak', 10, 300),
  a('s15', 'Szał', 'Seria ×15', 'streak', 15, 600),
  a('s20', 'Cukrowy szał', 'Seria ×20', 'streak', 20, 1000, 'prism'),
  a('air3', 'Trzy oddechy', '3 skoki w jednym locie', 'airJumps', 3, 150),
  a('air6', 'Akrobata', '6 skoków w jednym locie (z drugim oddechem)', 'airJumps', 6, 500),
  a('combo4', 'Łasuch', '4 cukierki w jednym skoku', 'airCombo', 4, 200),
  a('combo6', 'Żarłok', '6 cukierków w jednym skoku', 'airCombo', 6, 600),
  a('rescue1', 'Na ostatnią chwilę', 'Uratuj się skokiem w locie', 'rescues', 1, 100),
  a('rescue25', 'Ratownik', '25 ratunków', 'rescues', 25, 800, 'fire'),
  a('bounce50', 'Trampolina', '50 odbić od galaretki', 'bounces', 50, 400),
  a('crumble30', 'Kruszynka', 'Pokrusz 30 czekolad', 'crumbles', 30, 300),
  a('powers', 'Kolekcjoner', 'Zbierz każdy power-up', 'powers', 6, 400),
  // Na czas (czas gry; strojenie botem: dobry gracz 100 m w ok. 29 s, 200 m w 59 s, 300 m w 86 s).
  a('fast100', 'Sprinter', '100 m w 30 sekund', 'fast100', 30, 300),
  a('fast200', 'Błyskawica', '200 m w minutę', 'fast200', 60, 600),
  a('fast300', 'Rakieta', '300 m w 1:30', 'fast300', 90, 1200),
  a('candies60', 'Słodki pośpiech', '50 cukierków w pierwszej minucie', 'candies60', 50, 300),
  a('candies60b', 'Cukrowa burza', '100 cukierków w pierwszej minucie', 'candies60', 100, 800),
  a('live120', 'Dwie minuty', 'Przetrwaj 2 minuty w jednym biegu', 'longest', 120, 200),
  a('live300', 'Maraton', 'Przetrwaj 5 minut w jednym biegu', 'longest', 300, 1000),
  a('runs10', 'Rozgrzewka', 'Zagraj 10 biegów', 'runs', 10, 100),
  a('runs100', 'Wytrwały', 'Zagraj 100 biegów', 'runs', 100, 800),
  a('runs500', 'Weteran', 'Zagraj 500 biegów', 'runs', 500, 2500),
  a('candy1k', 'Słodki ząb', 'Zbierz 1000 cukierków', 'candies', 1000, 200),
  a('candy10k', 'Cukiernik', 'Zbierz 10 000 cukierków', 'candies', 10000, 1000),
  a('candy50k', 'Cukrowy baron', 'Zbierz 50 000 cukierków', 'candies', 50000, 3000),
  a('daily1', 'Wyzwanie przyjęte', 'Zagraj wyzwanie dnia', 'dailyRuns', 1, 100),
  a('daily3', 'Trzy dni', 'Wyzwanie dnia 3 dni z rzędu', 'dailyStreak', 3, 300),
  a('daily7', 'Cały tydzień', 'Wyzwanie dnia 7 dni z rzędu', 'dailyStreak', 7, 1000, 'medal'),
  a('dressed', 'Elegant', 'Załóż coś z każdego działu szafy', 'worn', 4, 300),
];

/** Wartości liczników potrzebne do osiągnięć. */
export type Progress = Record<Metric, number>;

export function progressOf(stats: Stats, extra: { best: number; dailyStreak: number; worn: number }): Progress {
  return {
    best: extra.best,
    streak: stats.bestStreak,
    airJumps: stats.maxAirJumps,
    airCombo: stats.maxAirCombo,
    rescues: stats.rescues,
    bounces: stats.bounces,
    crumbles: stats.crumbles,
    powers: stats.powers.length,
    runs: stats.runs,
    candies: stats.candies,
    dailyRuns: stats.dailyRuns,
    dailyStreak: extra.dailyStreak,
    worn: extra.worn,
    fast100: stats.fast100,
    fast200: stats.fast200,
    fast300: stats.fast300,
    candies60: stats.candies60,
    longest: stats.longest,
  };
}

/** Osiągnięcia spełnione, a jeszcze niezdobyte (w kolejności listy). */
export function newlyEarned(progress: Progress, earned: readonly string[]): AchievementDef[] {
  return ACHIEVEMENTS.filter((d) => !earned.includes(d.id) && reached(d.metric, progress[d.metric], d.goal));
}

export function normalizeStats(raw: unknown): Stats {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Stats, unknown>>;
  const n = (v: unknown) => Math.max(0, Number(v) || 0);
  return {
    runs: n(r.runs),
    candies: n(r.candies),
    bestStreak: n(r.bestStreak),
    maxAirJumps: n(r.maxAirJumps),
    maxAirCombo: n(r.maxAirCombo),
    rescues: n(r.rescues),
    bounces: n(r.bounces),
    crumbles: n(r.crumbles),
    powers: Array.isArray(r.powers) ? [...new Set(r.powers.filter((p): p is string => typeof p === 'string'))] : [],
    dailyRuns: n(r.dailyRuns),
    fast100: n(r.fast100),
    fast200: n(r.fast200),
    fast300: n(r.fast300),
    candies60: n(r.candies60),
    longest: n(r.longest),
  };
}
