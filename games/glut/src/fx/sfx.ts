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
