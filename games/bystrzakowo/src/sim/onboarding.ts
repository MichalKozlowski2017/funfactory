/**
 * First launch: the child's age sets the starting level of the activities, and the hand shows the gesture
 * the first time in each activity. Pure TS (no Pixi).
 */
import { MAX_LEVEL } from './puzzles.ts';
import { ACTIVITIES, type Activity } from './realms.ts';
import type { Journal } from './journal.ts';
import type { Progress } from './progress.ts';

/** Ages to choose from on the welcome screen (6 means "6 and older"). */
export const AGES = [3, 4, 5, 6] as const;
export type Age = (typeof AGES)[number];

/**
 * Starting level for an age. Three- and four-year-olds start at the easiest, five-year-olds in the middle,
 * six-year-olds at the hardest. After that the difficulty adapts after every round anyway
 * (flawless round: up, three mistakes: down).
 */
export const startLevel = (age: number): number => Math.max(0, Math.min(MAX_LEVEL, age - 4));

/**
 * Sets the age and the starting levels. Activities the child has already played (the journal has an entry) stay
 * at the level reached: changing the age in the parent zone doesn't undo progress.
 */
export function applyAge(p: Progress, age: number, played: ReadonlySet<Activity> = new Set()): void {
  p.age = age;
  const level = startLevel(age);
  for (const a of ACTIVITIES) if (!played.has(a)) p.levels[a] = level;
}

/** Parent welcome: only on a fresh save (players from before this version who have already played don't see it). */
export const needsWelcome = (p: Progress): boolean => !p.onboarded && p.rounds === 0;

/** What the hand (or the first hint) has already shown: an activity, the first puzzle's house in the world, the realm tabs. */
export type HandKey = Activity | 'world' | 'realms';

/** Hand with a gesture demo: the first time in a given activity. */
export const needsHand = (p: Progress, a: HandKey): boolean => !(p.hands ?? []).includes(a);

export function markHand(p: Progress, a: HandKey): void {
  if (needsHand(p, a)) p.hands = [...(p.hands ?? []), a];
}

/** Next age in the parent zone (the button cycles 3 -> 4 -> 5 -> 6+ -> 3). */
export const nextAge = (age?: number): Age => AGES[(AGES.indexOf(age as Age) + 1) % AGES.length]!;

/** Activities the child has already played (they have solved tasks in the journal). */
export function playedActivities(j: Journal): Set<Activity> {
  const out = new Set<Activity>();
  for (const d of Object.values(j.days)) for (const a of Object.keys(d.acts) as Activity[]) out.add(a);
  return out;
}
