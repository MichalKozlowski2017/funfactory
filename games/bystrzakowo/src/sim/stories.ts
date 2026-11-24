/**
 * Picture stories (Basil's Workshop): three frames to put in order (what happened first).
 * At the lowest level the first frame is already in place.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

// Without 'candle' and 'airplane': a test with a child-agent showed their frames are ambiguous for a 4-year-old
// (the candle barely changes, the folded sheet doesn't look like a step before the paper plane). The art stays in the repo.
export const STORIES = [
  'flower', 'chick', 'butterfly', 'snowman', 'apple', 'ice-cream', 'froglet', 'sandwich', 'tower', 'balloon',
  'cake', 'castle', 'egg', 'pizza', 'cocoa', 'nest', 'small-tree', 'day',
  'banana', 'watermelon', 'aquarium', 'gift', 'car-wash', 'cupcake',
] as const;
export type Story = (typeof STORIES)[number];
export const FRAMES = 3;
export const STORY_ROUND = 3;

/** How many frames start out in their place. */
export const presetFrames = (level: number): number => (Math.max(0, Math.min(MAX_LEVEL, Math.round(level))) === 0 ? 1 : 0);

/**
 * A story round drawn "from a bag": first the ones the child hasn't seen yet (`seen`); only when
 * fresh ones run out do we add repeats. This way every story appears before any comes back.
 */
export function makeStoryRound(rng: Rng, seen: readonly string[] = []): Story[] {
  const fresh = rng.shuffle(STORIES.filter((s) => !seen.includes(s)));
  if (fresh.length >= STORY_ROUND) return fresh.slice(0, STORY_ROUND);
  const repeats = rng.shuffle(STORIES.filter((s) => !fresh.includes(s)));
  return [...fresh, ...repeats.slice(0, STORY_ROUND - fresh.length)];
}

/** The seen list after a round; once all have been seen, the bag starts over (from this round). */
export function markStoriesSeen(seen: readonly string[], round: readonly Story[]): string[] {
  const next = [...seen.filter((s) => !round.includes(s as Story)), ...round];
  return STORIES.every((s) => next.includes(s)) ? [...round] : next;
}
