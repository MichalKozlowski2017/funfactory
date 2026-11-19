import type { SynthLayer } from '@funfactory/core';

/** Efekty dźwiękowe Gluta, syntezowane w kodzie. */
export const SFX = {
  launch: [
    { wave: 'noise', freq: 500, filter: 'bandpass', filterFreq: 500, filterFreqEnd: 2400, duration: 0.2, volume: 0.25 },
    { wave: 'sine', freq: 260, freqEnd: 620, duration: 0.14, volume: 0.18 },
  ],
  land: [
    { wave: 'noise', freq: 900, filter: 'lowpass', filterFreq: 1400, filterFreqEnd: 300, duration: 0.14, volume: 0.35 },
    { wave: 'sine', freq: 190, freqEnd: 80, duration: 0.12, volume: 0.3 },
  ],
  candy: [
    { wave: 'triangle', freq: 988, duration: 0.07, volume: 0.22 },
    { wave: 'triangle', freq: 1319, duration: 0.12, volume: 0.22, delay: 0.06 },
  ],
  death: [
    { wave: 'sawtooth', freq: 420, freqEnd: 70, duration: 0.55, volume: 0.18, filter: 'lowpass', filterFreq: 1800 },
    { wave: 'noise', freq: 600, filter: 'lowpass', filterFreq: 1200, filterFreqEnd: 200, duration: 0.4, volume: 0.3 },
  ],
  record: [523, 659, 784, 1047].map((freq, i) => ({ wave: 'square', freq, duration: 0.16, volume: 0.1, delay: i * 0.09, filter: 'lowpass', filterFreq: 3000 })),
  heartbeat: [
    { wave: 'sine', freq: 70, freqEnd: 45, duration: 0.14, volume: 0.45 },
    { wave: 'sine', freq: 70, freqEnd: 45, duration: 0.12, volume: 0.3, delay: 0.18 },
  ],
  tap: [{ wave: 'triangle', freq: 660, freqEnd: 880, duration: 0.06, volume: 0.15 }],
  /** Przejście: przesłona się zamyka. */
  whoosh: [
    { wave: 'noise', freq: 800, filter: 'bandpass', filterFreq: 600, filterFreqEnd: 3200, duration: 0.36, volume: 0.22, attack: 0.08 },
    { wave: 'sine', freq: 220, freqEnd: 440, duration: 0.3, volume: 0.06 },
  ],
  /** Przejście: slime wyskakuje w nowym biegu. */
  pop: [
    { wave: 'sine', freq: 300, freqEnd: 900, duration: 0.12, volume: 0.22 },
    { wave: 'triangle', freq: 1320, duration: 0.1, volume: 0.1, delay: 0.06 },
    { wave: 'triangle', freq: 1760, duration: 0.14, volume: 0.08, delay: 0.12 },
  ],
} satisfies Record<string, SynthLayer[]>;

/** Dźwięki półek z mechaniką. */
export const FEATURE_SFX = {
  /** Galaretka: „boing” z opadającym i wracającym tonem. */
  boing: [
    { wave: 'sine', freq: 180, freqEnd: 520, duration: 0.22, volume: 0.3 },
    { wave: 'triangle', freq: 360, freqEnd: 900, duration: 0.16, volume: 0.08, delay: 0.03 },
  ],
  /** Czekolada trzeszczy pod slime'em. */
  creak: [
    { wave: 'noise', freq: 1500, filter: 'bandpass', filterFreq: 1300, duration: 0.05, volume: 0.18 },
    { wave: 'noise', freq: 1500, filter: 'bandpass', filterFreq: 1700, duration: 0.04, volume: 0.14, delay: 0.09 },
  ],
  /** Czekolada pęka. */
  crumble: [
    { wave: 'noise', freq: 900, filter: 'lowpass', filterFreq: 2400, filterFreqEnd: 300, duration: 0.35, volume: 0.35 },
    { wave: 'sine', freq: 140, freqEnd: 60, duration: 0.2, volume: 0.25 },
    { wave: 'noise', freq: 3000, filter: 'bandpass', filterFreq: 2600, duration: 0.05, volume: 0.15, delay: 0.12 },
  ],
} satisfies Record<string, SynthLayer[]>;

/** Dźwięki power-upów. */
export const POWER_SFX = {
  pickup: [523, 784, 1047, 1568].map((freq, i) => ({ wave: 'triangle', freq, duration: 0.12, volume: 0.16, delay: i * 0.05 })),
  shield: [
    { wave: 'sine', freq: 180, freqEnd: 720, duration: 0.25, volume: 0.35 },
    { wave: 'triangle', freq: 1200, freqEnd: 600, duration: 0.15, volume: 0.12, delay: 0.05 },
  ],
  rocket: [
    { wave: 'noise', freq: 400, filter: 'bandpass', filterFreq: 300, filterFreqEnd: 1800, duration: 1.3, volume: 0.3, attack: 0.05 },
    { wave: 'sawtooth', freq: 90, freqEnd: 220, duration: 1.3, volume: 0.08, filter: 'lowpass', filterFreq: 600 },
  ],
  frost: [1568, 2093, 2637].map((freq, i) => ({ wave: 'sine', freq, duration: 0.35, volume: 0.12, delay: i * 0.07 })),
  air: [{ wave: 'noise', freq: 1200, filter: 'highpass', filterFreq: 1500, filterFreqEnd: 4000, duration: 0.18, volume: 0.22 }],
} satisfies Record<string, SynthLayer[]>;

/** Dźwięki serii. Rytm gra kolejne nuty pentatoniki, więc dobra seria brzmi jak melodia. */
export const STREAK_SFX = {
  beat: [
    { wave: 'triangle', freq: 523, duration: 0.14, volume: 0.2 },
    { wave: 'sine', freq: 1046, duration: 0.09, volume: 0.07 },
  ],
  milestone: [
    ...[523, 659, 784, 1047, 1319].map((freq, i) => ({ wave: 'square' as const, freq, duration: 0.18, volume: 0.09, delay: i * 0.06, filter: 'lowpass' as const, filterFreq: 3200 })),
    { wave: 'triangle', freq: 1047, duration: 0.5, volume: 0.16, delay: 0.3 },
    { wave: 'triangle', freq: 1568, duration: 0.5, volume: 0.1, delay: 0.3 },
    { wave: 'noise', freq: 3000, filter: 'highpass', filterFreq: 3000, filterFreqEnd: 8000, duration: 0.6, volume: 0.08, delay: 0.25, attack: 0.05 },
  ],
  lost: [
    { wave: 'triangle', freq: 440, freqEnd: 170, duration: 0.38, volume: 0.18 },
    { wave: 'sine', freq: 220, freqEnd: 100, duration: 0.32, volume: 0.14, delay: 0.06 },
  ],
  combo: [1319, 1568, 2093].map((freq, i) => ({ wave: 'triangle' as const, freq, duration: 0.1, volume: 0.14, delay: i * 0.045 })),
  coin: [{ wave: 'triangle', freq: 1760, freqEnd: 2200, duration: 0.06, volume: 0.1 }],
  /** Ratunek: szybki wznoszący się glissando + dzwoneczki. */
  rescue: [
    { wave: 'sine', freq: 330, freqEnd: 1320, duration: 0.3, volume: 0.22 },
    ...[1047, 1319, 1568, 2093].map((freq, i) => ({ wave: 'triangle' as const, freq, duration: 0.14, volume: 0.13, delay: 0.18 + i * 0.05 })),
  ],
  acrobat: [784, 1175, 1568].map((freq, i) => ({ wave: 'triangle' as const, freq, duration: 0.12, volume: 0.14, delay: i * 0.06 })),
} satisfies Record<string, SynthLayer[]>;

const PENTATONIC = [0, 2, 4, 7, 9];

/** Wysokość nuty dla n-tego skoku serii: pentatonika, co kamień milowy oktawa wyżej (maks. 2). */
export function beatPitch(streak: number): number {
  const i = Math.max(0, streak - 1);
  const semis = PENTATONIC[i % 5]! + 12 * Math.min(2, Math.floor(i / 5));
  return 2 ** (semis / 12);
}
