/**
 * Emocje (Polana Zagadek): „Pokaż wesołą minkę!” – wybór twarzy z kilku.
 * Najpierw minki bardzo różne (wesoła, smutna, zła), potem subtelniejsze.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export type Emotion = 'wesoly' | 'smutny' | 'zly' | 'zdziwiony' | 'przestraszony' | 'spiacy';
export const EMOTIONS: readonly Emotion[] = ['wesoly', 'smutny', 'zly', 'zdziwiony', 'przestraszony', 'spiacy'];
const EASY: Emotion[] = ['wesoly', 'smutny', 'zly'];

export const EMOTION_ROUND = 5;
const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

export interface EmotionQuestion {
  target: Emotion;
  options: Emotion[];
}

/** Pytanie: na poziomie 0 dwie minki z łatwych, potem trzy, na końcu cztery z wszystkich. */
export function makeEmotionQuestion(rng: Rng, level: number, recent: readonly Emotion[] = []): EmotionQuestion {
  const l = clamp(level);
  const pool = l === 0 ? EASY : EMOTIONS;
  const fresh = pool.filter((e) => !recent.includes(e));
  const target = rng.pick(fresh.length ? fresh : pool);
  const n = [2, 3, 4][l]!;
  const options = rng.shuffle([target, ...rng.shuffle(pool.filter((e) => e !== target)).slice(0, n - 1)]);
  return { target, options };
}

export function makeEmotionRound(rng: Rng, level: number): EmotionQuestion[] {
  const out: EmotionQuestion[] = [];
  for (let i = 0; i < EMOTION_ROUND; i++) out.push(makeEmotionQuestion(rng, level, out.slice(-2).map((q) => q.target)));
  return out;
}
