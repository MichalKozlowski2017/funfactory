/**
 * Emotions (Puzzle Meadow): "Show me the happy face!" – pick one face out of several.
 * First very different faces (happy, sad, angry), then subtler ones.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'scared' | 'sleepy';
export const EMOTIONS: readonly Emotion[] = ['happy', 'sad', 'angry', 'surprised', 'scared', 'sleepy'];
const EASY: Emotion[] = ['happy', 'sad', 'angry'];

export const EMOTION_ROUND = 5;

/**
 * Characters with faces: within one question all cards show the same character (the child compares only the expressions),
 * between questions the character changes, so the child recognizes the emotion rather than memorizing the picture.
 * 'child' is the original art/emotions/<emotion>.webp, the others: art/emotions/<emotion>-<char>.webp.
 */
export const EMOTION_CHARS = ['child', 'girl', 'kitten', 'teddy'] as const;
export type EmotionChar = (typeof EMOTION_CHARS)[number];
const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

export interface EmotionQuestion {
  target: Emotion;
  options: Emotion[];
  /** Character on all cards of the question. */
  char: EmotionChar;
}

/** Question: at level 0 two faces from the easy ones, then three, finally four from all. */
export function makeEmotionQuestion(
  rng: Rng,
  level: number,
  recent: readonly Emotion[] = [],
  chars: readonly EmotionChar[] = EMOTION_CHARS,
  lastChar?: EmotionChar,
): EmotionQuestion {
  const l = clamp(level);
  const pool = l === 0 ? EASY : EMOTIONS;
  const fresh = pool.filter((e) => !recent.includes(e));
  const target = rng.pick(fresh.length ? fresh : pool);
  const n = [2, 3, 4][l]!;
  const options = rng.shuffle([target, ...rng.shuffle(pool.filter((e) => e !== target)).slice(0, n - 1)]);
  const otherChars = chars.filter((c) => c !== lastChar);
  const char = rng.pick(otherChars.length ? otherChars : chars);
  return { target, options, char };
}

/** `chars`: characters whose art is loaded (all by default). */
export function makeEmotionRound(rng: Rng, level: number, chars: readonly EmotionChar[] = EMOTION_CHARS): EmotionQuestion[] {
  const out: EmotionQuestion[] = [];
  for (let i = 0; i < EMOTION_ROUND; i++)
    out.push(makeEmotionQuestion(rng, level, out.slice(-2).map((q) => q.target), chars, out.at(-1)?.char));
  return out;
}
