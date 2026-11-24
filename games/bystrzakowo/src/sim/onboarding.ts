/**
 * Pierwsze uruchomienie: wiek dziecka ustawia początkowy poziom zabaw, a rączka pokazuje gest
 * przy pierwszym razie w każdej zabawie. Czysty TS (bez Pixi).
 */
import { MAX_LEVEL } from './puzzles.ts';
import { ACTIVITIES, type Activity } from './realms.ts';
import type { Journal } from './journal.ts';
import type { Progress } from './progress.ts';

/** Wiek do wyboru na powitaniu (6 oznacza „6 i więcej”). */
export const AGES = [3, 4, 5, 6] as const;
export type Age = (typeof AGES)[number];

/**
 * Poziom startowy dla wieku. Trzy- i czterolatki zaczynają od najłatwiejszego, pięciolatki od środka,
 * sześciolatki od najtrudniejszego. Dalej trudność i tak dopasowuje się po każdej rundzie
 * (bezbłędna runda: wyżej, trzy pomyłki: niżej).
 */
export const startLevel = (age: number): number => Math.max(0, Math.min(MAX_LEVEL, age - 4));

/**
 * Ustawia wiek i poziomy startowe. Zabawy, w które dziecko już grało (dziennik ma wpis), zostają
 * na wypracowanym poziomie: zmiana wieku w strefie rodzica nie cofa postępów.
 */
export function applyAge(p: Progress, age: number, played: ReadonlySet<Activity> = new Set()): void {
  p.age = age;
  const level = startLevel(age);
  for (const a of ACTIVITIES) if (!played.has(a)) p.levels[a] = level;
}

/** Powitanie rodzica: tylko przy świeżym zapisie (gracze sprzed tej wersji, którzy już grali, go nie widzą). */
export const needsWelcome = (p: Progress): boolean => !p.onboarded && p.rounds === 0;

/** Co rączka (albo pierwsza podpowiedź) już pokazała: zabawa, domek pierwszej zagadki w świecie, zakładki krain. */
export type HandKey = Activity | 'world' | 'krainy';

/** Rączka z pokazem gestu: pierwszy raz w danej zabawie. */
export const needsHand = (p: Progress, a: HandKey): boolean => !(p.hands ?? []).includes(a);

export function markHand(p: Progress, a: HandKey): void {
  if (needsHand(p, a)) p.hands = [...(p.hands ?? []), a];
}

/** Następny wiek w strefie rodzica (przycisk przełącza 3 → 4 → 5 → 6+ → 3). */
export const nextAge = (age?: number): Age => AGES[(AGES.indexOf(age as Age) + 1) % AGES.length]!;

/** Zabawy, w które dziecko już grało (mają rozwiązane zadania w dzienniku). */
export function playedActivities(j: Journal): Set<Activity> {
  const out = new Set<Activity>();
  for (const d of Object.values(j.days)) for (const a of Object.keys(d.acts) as Activity[]) out.add(a);
  return out;
}
