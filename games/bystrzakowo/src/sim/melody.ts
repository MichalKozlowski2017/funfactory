/**
 * Melodia (Pracownia Malucha): Lusia gra na cymbałkach, dziecko powtarza (pamięć słuchowa i kolejność).
 * Cymbałki w skali pentatonicznej (zawsze brzmi ładnie), melodie coraz dłuższe.
 */
import type { Rng } from '@funfactory/core';
import { MAX_LEVEL } from './puzzles.ts';

export const MELODY_ROUND = 4;
/** Częstotliwości sztabek (C, D, E, G, A, C). */
export const BARS = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
/** Liczba sztabek na poziomie (mniej = łatwiej zapamiętać). */
export const barCount = (level: number): number => [4, 5, 6][clamp(level)] as number;
/** Długość melodii: na poziomie i w rundzie (druga połowa rundy o jeden dźwięk dłuższa). */
export const melodyLength = (level: number, task: number): number => [2, 3, 4][clamp(level)]! + (task >= MELODY_ROUND / 2 ? 1 : 0);

/** Melodia: indeksy sztabek, bez trzech takich samych z rzędu. */
export function makeMelody(rng: Rng, level: number, task: number): number[] {
  const n = barCount(level);
  const out: number[] = [];
  while (out.length < melodyLength(level, task)) {
    const b = rng.int(0, n - 1);
    if (out.length >= 2 && out[out.length - 1] === b && out[out.length - 2] === b) continue;
    out.push(b);
  }
  return out;
}
