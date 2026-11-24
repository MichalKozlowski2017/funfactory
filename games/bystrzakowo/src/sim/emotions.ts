/**
 * Emocje (Polana Zagadek): „Pokaż wesołą minkę!” – wybór twarzy z kilku.
 * Najpierw minki bardzo różne (wesoła, smutna, zła), potem subtelniejsze.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'scared' | 'sleepy';
export const EMOTIONS: readonly Emotion[] = ['happy', 'sad', 'angry', 'surprised', 'scared', 'sleepy'];
const EASY: Emotion[] = ['happy', 'sad', 'angry'];

export const EMOTION_ROUND = 5;

/**
 * Postaci z minkami: w jednym pytaniu wszystkie karty mają tę samą postać (dziecko porównuje same miny),
 * między pytaniami postać się zmienia, żeby dziecko rozpoznawało emocję, a nie zapamiętywało obrazek.
 * 'child' to pierwotne grafiki art/emocje/<emocja>.webp, pozostałe: art/emocje/<emocja>-<postać>.webp.
 */
export const EMOTION_CHARS = ['child', 'girl', 'kitten', 'teddy'] as const;
export type EmotionChar = (typeof EMOTION_CHARS)[number];
const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

export interface EmotionQuestion {
  target: Emotion;
  options: Emotion[];
  /** Postać na wszystkich kartach pytania. */
  char: EmotionChar;
}

/** Pytanie: na poziomie 0 dwie minki z łatwych, potem trzy, na końcu cztery z wszystkich. */
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

/** `chars`: postaci, których grafiki są wczytane (domyślnie wszystkie). */
export function makeEmotionRound(rng: Rng, level: number, chars: readonly EmotionChar[] = EMOTION_CHARS): EmotionQuestion[] {
  const out: EmotionQuestion[] = [];
  for (let i = 0; i < EMOTION_ROUND; i++)
    out.push(makeEmotionQuestion(rng, level, out.slice(-2).map((q) => q.target), chars, out.at(-1)?.char));
  return out;
}
