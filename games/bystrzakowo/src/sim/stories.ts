/**
 * Historyjki obrazkowe (Warsztat Bazyla): trzy kadry do ułożenia po kolei (co było najpierw).
 * Na najniższym poziomie pierwszy kadr leży już na miejscu.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

// Bez „swieca” i „samolot”: test agentem-dzieckiem pokazał, że ich kadry są dla 4-latka niejednoznaczne
// (świeczka prawie się nie zmienia, złożona kartka nie wygląda na etap przed samolotem). Grafiki zostają w repo.
export const STORIES = [
  'kwiat', 'kurczak', 'motyl', 'balwan', 'jablko', 'lody', 'zabka', 'kanapka', 'wieza', 'balon',
  'tort', 'zamek', 'jajko', 'pizza', 'kakao', 'gniazdo', 'drzewko', 'dzien',
  'banan', 'arbuz', 'akwarium', 'prezent', 'myjnia', 'babeczka',
] as const;
export type Story = (typeof STORIES)[number];
export const FRAMES = 3;
export const STORY_ROUND = 3;

/** Ile kadrów jest na starcie na swoim miejscu. */
export const presetFrames = (level: number): number => (Math.max(0, Math.min(MAX_LEVEL, Math.round(level))) === 0 ? 1 : 0);

/**
 * Runda historyjek „z worka”: najpierw te, których dziecko jeszcze nie widziało (`seen`), dopiero gdy
 * zabraknie świeżych, dobieramy powtórki. Dzięki temu wszystkie historyjki pojawią się, zanim któraś wróci.
 */
export function makeStoryRound(rng: Rng, seen: readonly string[] = []): Story[] {
  const fresh = rng.shuffle(STORIES.filter((s) => !seen.includes(s)));
  if (fresh.length >= STORY_ROUND) return fresh.slice(0, STORY_ROUND);
  const repeats = rng.shuffle(STORIES.filter((s) => !fresh.includes(s)));
  return [...fresh, ...repeats.slice(0, STORY_ROUND - fresh.length)];
}

/** Lista obejrzanych po rundzie; gdy obejrzane są wszystkie, worek zaczyna się od nowa (od tej rundy). */
export function markStoriesSeen(seen: readonly string[], round: readonly Story[]): string[] {
  const next = [...seen.filter((s) => !round.includes(s as Story)), ...round];
  return STORIES.every((s) => next.includes(s)) ? [...round] : next;
}
