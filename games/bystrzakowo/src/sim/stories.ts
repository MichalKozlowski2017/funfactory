/**
 * Historyjki obrazkowe (Warsztat Bazyla): trzy kadry do ułożenia po kolei (co było najpierw).
 * Na najniższym poziomie pierwszy kadr leży już na miejscu.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export const STORIES = [
  'kwiat', 'kurczak', 'motyl', 'balwan', 'jablko', 'lody', 'zabka', 'kanapka', 'wieza', 'balon',
  'tort', 'zamek', 'jajko', 'pizza', 'swieca', 'kakao', 'gniazdo', 'drzewko', 'samolot', 'dzien',
] as const;
export type Story = (typeof STORIES)[number];
export const FRAMES = 3;
export const STORY_ROUND = 3;

/** Ile kadrów jest na starcie na swoim miejscu. */
export const presetFrames = (level: number): number => (Math.max(0, Math.min(MAX_LEVEL, Math.round(level))) === 0 ? 1 : 0);

export const makeStoryRound = (rng: Rng): Story[] => rng.shuffle([...STORIES]).slice(0, STORY_ROUND);
