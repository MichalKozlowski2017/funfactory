import type { Sound, SynthLayer } from '@funfactory/core';
import { BIOMES, type BiomeId } from '../sim/biomes.ts';

/**
 * Muzyka proceduralna Gluta (w duchu Tetris Effect): utwór składa się na żywo z warstw zależnych
 * od akcji, a każda akcja gracza (strzał, cukierek, seria, skok w locie) gra nutę z aktualnego akordu.
 * Wszystko w a-moll, w takt zegara świata, więc nie da się zagrać fałszywie.
 *
 * Brzmienie: dwa wejścia miksu: suche (perkusja, bas) i mokre (pogłos + echo w rytm kropkowanej ósemki)
 * dla padów, dzwonków i melodii; stereo; akordy z noną/septymą; części A/B co 8 taktów; przejścia na końcu fraz.
 */

/** Częstotliwość dla półtonów względem A4 (440 Hz). */
const hz = (semis: number) => 440 * 2 ** (semis / 12);

/** Akordy (półtony względem A4), pierwszy to pryma; czwarty dźwięk to nona/septyma dla koloru. */
const CH = {
  Am: [0, 3, 7, 14],
  F: [-4, 0, 3, 7],
  C: [3, 7, 10, 17],
  G: [-2, 2, 5, 7],
  Dm: [5, 8, 12, 15],
  E: [7, 11, 14, 17],
  Em: [7, 10, 14, 17],
  Bb: [1, 5, 8, 12],
} as const;
type Chord = readonly number[];

type Voice = (freq: number, len: number, pan?: number) => SynthLayer[];

interface Style {
  bpm: number;
  /** Akord na każdy takt. */
  prog: Chord[];
  pad: Voice;
  bass: Voice;
  /** Arpeggio i nuty akcji (strzał). */
  pluck: Voice;
  /** Melodia i nuty serii. */
  lead: Voice;
  kick: SynthLayer[];
  snare: SynthLayer[];
  hat: SynthLayer[];
  /** Wzory perkusji na 16 kroków ('x' = uderzenie). */
  kickPat: string;
  snarePat: string;
  hatPat: string;
  /** Kolejność dźwięków akordu w arpeggio (część A; część B gra ją odwróconą i wyżej). */
  arp: number[];
  /** Swing 0..0.3 (opóźnienie parzystych szesnastek). */
  swing: number;
  /** Ile pogłosu i echa (0..1). */
  wet: number;
}

// --- barwy (syntezowane) ---
const scale = (l: SynthLayer, v: number): SynthLayer => ({ ...l, volume: (l.volume ?? 0.3) * v });
const bell: Voice = (f, _len, pan = 0) => [
  { wave: 'sine', freq: f, duration: 0.7, volume: 0.05, pan },
  { wave: 'sine', freq: f * 3.01, duration: 0.2, volume: 0.016, pan },
  { wave: 'sine', freq: f * 5.4, duration: 0.08, volume: 0.008, pan },
];
const marimba: Voice = (f, _len, pan = 0) => [
  { wave: 'sine', freq: f, duration: 0.28, volume: 0.07, pan },
  { wave: 'sine', freq: f * 4, duration: 0.05, volume: 0.025, pan },
  { wave: 'triangle', freq: f * 10, duration: 0.012, volume: 0.02, pan },
];
const pluckTri: Voice = (f, _len, pan = 0) => [
  { wave: 'triangle', freq: f, duration: 0.22, volume: 0.06, pan },
  { wave: 'sawtooth', freq: f, duration: 0.05, volume: 0.015, filter: 'lowpass', filterFreq: f * 6, pan },
];
const pluckSaw: Voice = (f, _len, pan = 0) => [
  { wave: 'sawtooth', freq: f, duration: 0.18, volume: 0.035, filter: 'lowpass', filterFreq: f * 5, filterFreqEnd: f * 1.2, pan },
  { wave: 'sawtooth', freq: f * 1.005, duration: 0.18, volume: 0.025, filter: 'lowpass', filterFreq: f * 4, filterFreqEnd: f, pan: -pan },
];
const musicBox: Voice = (f, _len, pan = 0) => [
  { wave: 'sine', freq: f * 2, duration: 0.5, volume: 0.045, pan },
  { wave: 'sine', freq: f * 2 * 1.012, duration: 0.45, volume: 0.025, pan: -pan },
  { wave: 'triangle', freq: f * 8, duration: 0.02, volume: 0.012, pan },
];
// Pady trzymają dźwięk (sustain) i są rozciągnięte w stereo dwoma rozstrojonymi głosami.
const pad =
  (wave: OscillatorType, detune: number, vol: number, filterMul = 0): Voice =>
  (f, len) =>
    [-1, 1].map((side) => ({
      wave,
      freq: f * 2 ** ((side * detune) / 1200),
      duration: len,
      volume: vol,
      attack: Math.min(0.5, len / 4),
      sustain: 0.8,
      release: Math.min(0.6, len / 3),
      pan: side * 0.6,
      ...(filterMul ? { filter: 'lowpass' as const, filterFreq: f * filterMul } : {}),
    }));
const padSoft = pad('sine', 7, 0.018);
const padWarm = pad('triangle', 8, 0.015);
const padDark = pad('sawtooth', 12, 0.009, 3);
const bassSine: Voice = (f, len) => [
  { wave: 'sine', freq: f, duration: Math.min(len, 0.5), volume: 0.14, attack: 0.008, sustain: 0.7, release: 0.12 },
  { wave: 'triangle', freq: f * 2, duration: 0.06, volume: 0.03 },
];
const bassSquare: Voice = (f, len) => [{ wave: 'square', freq: f, duration: Math.min(len, 0.32), volume: 0.045, filter: 'lowpass', filterFreq: f * 6, filterFreqEnd: f * 1.5 }];
const bassSaw: Voice = (f, len) => [
  { wave: 'sawtooth', freq: f, duration: Math.min(len, 0.4), volume: 0.05, filter: 'lowpass', filterFreq: f * 6, filterFreqEnd: f * 2, sustain: 0.6, release: 0.1 },
  { wave: 'sine', freq: f / 2, duration: Math.min(len, 0.4), volume: 0.08, sustain: 0.7, release: 0.1 },
];
const leadSquare: Voice = (f, _len, pan = 0) => [
  { wave: 'square', freq: f, duration: 0.28, volume: 0.025, filter: 'lowpass', filterFreq: f * 5, sustain: 0.6, release: 0.1, pan },
  { wave: 'square', freq: f * 1.004, duration: 0.28, volume: 0.018, filter: 'lowpass', filterFreq: f * 4, sustain: 0.6, release: 0.1, pan: -pan },
];

const kickSoft: SynthLayer[] = [{ wave: 'sine', freq: 130, freqEnd: 45, duration: 0.24, volume: 0.32 }];
const kickHard: SynthLayer[] = [
  { wave: 'sine', freq: 160, freqEnd: 40, duration: 0.32, volume: 0.45 },
  { wave: 'noise', freq: 800, filter: 'lowpass', filterFreq: 900, duration: 0.03, volume: 0.13 },
];
const tom: SynthLayer[] = [{ wave: 'sine', freq: 140, freqEnd: 70, duration: 0.3, volume: 0.32, pan: -0.2 }];
const snareSoft: SynthLayer[] = [{ wave: 'noise', freq: 1500, filter: 'bandpass', filterFreq: 1800, duration: 0.14, volume: 0.11 }];
const snareSnap: SynthLayer[] = [
  { wave: 'noise', freq: 2000, filter: 'highpass', filterFreq: 1500, duration: 0.15, volume: 0.14 },
  { wave: 'triangle', freq: 220, freqEnd: 160, duration: 0.08, volume: 0.09 },
];
const clank: SynthLayer[] = [
  { wave: 'square', freq: 1300, freqEnd: 900, duration: 0.06, volume: 0.035, pan: 0.4 },
  { wave: 'noise', freq: 4000, filter: 'bandpass', filterFreq: 5000, duration: 0.08, volume: 0.07, pan: 0.4 },
];
const hatLight: SynthLayer[] = [{ wave: 'noise', freq: 8000, filter: 'highpass', filterFreq: 7000, duration: 0.035, volume: 0.04, pan: 0.35 }];
const shaker: SynthLayer[] = [{ wave: 'noise', freq: 6000, filter: 'bandpass', filterFreq: 6500, duration: 0.06, volume: 0.035, attack: 0.015, pan: 0.3 }];

const STYLES: Record<BiomeId, Style> = {
  crystal: {
    bpm: 96, prog: [CH.Am, CH.F, CH.C, CH.G], pad: padSoft, bass: bassSine, pluck: bell, lead: bell,
    kick: kickSoft, snare: snareSoft, hat: hatLight, kickPat: 'x.......x.......', snarePat: '....x.......x...', hatPat: '..x...x...x...x.', arp: [0, 1, 2, 3, 2, 1, 0, 1], swing: 0, wet: 0.8,
  },
  choco: {
    bpm: 100, prog: [CH.Am, CH.C, CH.F, CH.G], pad: padWarm, bass: bassSine, pluck: marimba, lead: marimba,
    kick: kickSoft, snare: snareSoft, hat: shaker, kickPat: 'x.....x.x.......', snarePat: '....x.......x...', hatPat: 'x.xxx.xxx.xxx.xx', arp: [0, 2, 1, 3, 0, 2, 1, 4], swing: 0.14, wet: 0.45,
  },
  jelly: {
    bpm: 108, prog: [CH.Am, CH.G, CH.F, CH.G], pad: padWarm, bass: bassSquare, pluck: pluckSaw, lead: leadSquare,
    kick: kickHard, snare: snareSnap, hat: hatLight, kickPat: 'x..x..x...x..x..', snarePat: '....x.......x..x', hatPat: 'x.x.x.x.x.x.x.x.', arp: [0, 1, 2, 4, 3, 2, 1, 2], swing: 0.16, wet: 0.4,
  },
  clouds: {
    bpm: 88, prog: [CH.F, CH.C, CH.Am, CH.G], pad: padSoft, bass: bassSine, pluck: bell, lead: bell,
    kick: kickSoft, snare: snareSoft, hat: shaker, kickPat: 'x.........x.....', snarePat: '........x.......', hatPat: '....x.......x...', arp: [0, 1, 2, 3, 4, 3, 2, 1], swing: 0.05, wet: 1,
  },
  caramel: {
    bpm: 112, prog: [CH.Am, CH.Dm, CH.E, CH.Am], pad: padDark, bass: bassSaw, pluck: pluckSaw, lead: leadSquare,
    kick: kickHard, snare: tom, hat: hatLight, kickPat: 'x...x...x...x...', snarePat: '..x...x...x.x.x.', hatPat: 'xxxxxxxxxxxxxxxx', arp: [0, 0, 2, 0, 1, 0, 2, 3], swing: 0, wet: 0.5,
  },
  licorice: {
    bpm: 84, prog: [CH.Am, CH.Em, CH.Dm, CH.E], pad: padDark, bass: bassSine, pluck: pluckTri, lead: bell,
    kick: kickSoft, snare: snareSoft, hat: shaker, kickPat: 'x.......x..x....', snarePat: '........x.......', hatPat: '..x.......x...x.', arp: [0, 2, 1, 2, 0, 3, 1, 2], swing: 0.08, wet: 0.9,
  },
  factory: {
    bpm: 104, prog: [CH.Am, CH.Am, CH.Dm, CH.E], pad: padDark, bass: bassSquare, pluck: musicBox, lead: musicBox,
    kick: kickHard, snare: clank, hat: clank, kickPat: 'x...x...x...x...', snarePat: '....x..x....x...', hatPat: '..x...x...x...xx', arp: [0, 1, 2, 1, 0, 2, 3, 2], swing: 0, wet: 0.6,
  },
  nightmare: {
    bpm: 80, prog: [CH.Am, CH.Bb, CH.Am, CH.E], pad: padDark, bass: bassSaw, pluck: musicBox, lead: musicBox,
    kick: kickHard, snare: tom, hat: shaker, kickPat: 'x.......x.......', snarePat: '......x.......xx', hatPat: '....x.......x...', arp: [0, 1, 0, 2, 0, 1, 3, 2], swing: 0, wet: 1,
  },
};

// --- uderzenia „epickie” (combo, premie) ---
const clap: SynthLayer[] = [0, 0.012, 0.024].map((delay, k) => ({
  wave: 'noise' as const, freq: 1800, filter: 'bandpass' as const, filterFreq: 1600, duration: k === 2 ? 0.16 : 0.03, volume: 0.13, delay,
}));
const taiko: SynthLayer[] = [
  { wave: 'sine', freq: 95, freqEnd: 48, duration: 0.6, volume: 0.5 },
  { wave: 'noise', freq: 400, filter: 'lowpass', filterFreq: 500, duration: 0.08, volume: 0.22 },
];
const tomHi: SynthLayer[] = [{ wave: 'sine', freq: 200, freqEnd: 110, duration: 0.22, volume: 0.28, pan: 0.3 }];
const tomMid: SynthLayer[] = [{ wave: 'sine', freq: 150, freqEnd: 85, duration: 0.25, volume: 0.3 }];
const tomLow: SynthLayer[] = [{ wave: 'sine', freq: 110, freqEnd: 60, duration: 0.3, volume: 0.32, pan: -0.3 }];
const subDrop: SynthLayer[] = [{ wave: 'sine', freq: 70, freqEnd: 28, duration: 1.4, volume: 0.45, attack: 0.005 }];
const crashBig: SynthLayer[] = [
  { wave: 'noise', freq: 6000, filter: 'highpass', filterFreq: 3500, filterFreqEnd: 9000, duration: 2, volume: 0.13, pan: -0.3 },
  { wave: 'noise', freq: 6000, filter: 'highpass', filterFreq: 4500, filterFreqEnd: 10000, duration: 1.8, volume: 0.1, pan: 0.3 },
];
/** „Tss”: otwarty hi-hat / talerz na końcu ba-dum-tss. */
const tss: SynthLayer[] = [
  { wave: 'noise', freq: 9000, filter: 'highpass', filterFreq: 6500, duration: 0.55, volume: 0.13, pan: 0.25 },
  { wave: 'noise', freq: 5000, filter: 'bandpass', filterFreq: 5200, duration: 0.3, volume: 0.06, pan: -0.25 },
];

/** Akord „dęty” (stab): rozstrojone piły z zamykającym się filtrem. */
const stab = (chord: Chord, len = 0.35, bright = 1): SynthLayer[] =>
  chord.slice(0, 3).flatMap((semi, k) =>
    [-1, 1].map((side) => ({
      wave: 'sawtooth' as const,
      freq: hz(semi - 12) * 2 ** ((side * 9) / 1200),
      duration: len,
      volume: 0.028,
      attack: 0.006,
      filter: 'lowpass' as const,
      filterFreq: 3200 * bright,
      filterFreqEnd: 500,
      pan: side * (0.3 + k * 0.15),
    })),
  );
/** Narastanie przed premią: szum przesuwany w górę + wznoszący się ton. */
const riser = (len: number): SynthLayer[] => [
  { wave: 'noise', freq: 800, filter: 'bandpass', filterFreq: 400, filterFreqEnd: 7000, duration: len, volume: 0.09, attack: len * 0.9 },
  { wave: 'sawtooth', freq: 110, freqEnd: 880, duration: len, volume: 0.02, attack: len * 0.9, filter: 'lowpass', filterFreq: 1200, filterFreqEnd: 6000 },
];

const CRASH: SynthLayer[] = [{ wave: 'noise', freq: 6000, filter: 'highpass', filterFreq: 4000, filterFreqEnd: 9000, duration: 1.4, volume: 0.1 }];

/** Rytmy melodii (kroki szesnastek w takcie); wybierane co takt, żeby melodia nie była zapętlona. */
const RHYTHMS = [
  [0, 3, 6, 10, 14],
  [0, 2, 4, 8, 12],
  [0, 6, 8, 11, 14],
  [2, 4, 7, 10, 12, 14],
];

/** Dźwięk akordu nr i (i może wychodzić ponad długość akordu: kolejne oktawy). */
function tone(chord: Chord, i: number, octave = 0): number {
  const n = chord.length;
  const k = ((i % n) + n) % n;
  return hz(chord[k]! + 12 * (Math.floor(i / n) + octave));
}

/** Deterministyczny „los” dla taktu (melodia się zmienia, ale ten sam takt brzmi tak samo). */
function hash(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296; // >>> 0: bez znaku, zawsze 0..1
}

/** Uderzenie do zsynchronizowania obrazu z dźwiękiem (czas kontekstu audio). */
export interface Pulse {
  time: number;
  kind: 'kick' | 'snare' | 'bar' | 'hit' | 'drop';
  /** Siła 0..1. */
  power: number;
}

export interface ScoreState {
  /** 0 = menu, 1 = bieg, 2..4 = rosnąca seria. */
  intensity: number;
  /** Bliskość syropu 0..1. */
  danger: number;
  /** Skala czasu gry (slow-motion). */
  timeScale: number;
  dead: boolean;
}

export class Score {
  private readonly sound: Sound;
  private filter: BiquadFilterNode | null = null;
  /** Wejścia miksu: suche (perkusja, bas) i mokre (z pogłosem i echem). */
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private wetSend: GainNode | null = null;
  /** Pady osobno, żeby „pompowały” w rytm stopy przy dużej intensywności. */
  private pads: GainNode | null = null;
  /** Narastanie przed premią osobno, żeby dało się je uciąć (premia albo zerwana seria). */
  private riserBus: GainNode | null = null;
  private delay: DelayNode | null = null;
  private style: Style = STYLES.crystal;
  private wantedStyle: Style = STYLES.crystal;
  private step = 0;
  private nextTime = 0;
  private level = 0;
  private wantedLevel = 0;
  private danger = 0;
  private tempo = 1;
  private dead = false;
  private flash = 0;
  private melodyPos = 2;
  private readonly pulses: Pulse[] = [];
  /** Głośność całej muzyki. */
  volume = 0.25;
  private bus: GainNode | null = null;
  private enabled = true;

  /** Włącza/wyłącza muzykę (ustawienia). Efekty akcji zostają w efektach dźwiękowych. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    const ctx = this.sound.audio;
    if (ctx && this.bus) this.bus.gain.setTargetAtTime(on ? this.volume : 0, ctx.currentTime, 0.1);
  }

  constructor(sound: Sound) {
    this.sound = sound;
  }

  /** Uderzenia, które już zabrzmiały (czas audio <= teraz): scena robi z nich światła. */
  takePulses(): Pulse[] {
    const now = this.sound.audio?.currentTime ?? Infinity;
    const out: Pulse[] = [];
    while (this.pulses.length && this.pulses[0]!.time <= now) out.push(this.pulses.shift()!);
    return out;
  }

  /** Aktualny poziom warstw (0 = menu .. 4), do siły świateł. */
  get intensity(): number {
    return this.level;
  }

  private pulse(kind: Pulse['kind'], power: number, time?: number): void {
    const t = time ?? this.sound.audio?.currentTime ?? 0;
    this.pulses.push({ time: t, kind, power });
    if (this.pulses.length > 64) this.pulses.shift();
    this.pulses.sort((a, b) => a.time - b.time);
  }

  /** Styl świata: zmienia się na początku następnego taktu. */
  setBiome(index: number): void {
    this.wantedStyle = STYLES[BIOMES[index]?.id ?? 'crystal'];
  }

  private get bar(): number {
    return Math.floor(this.step / 16);
  }

  private get chord(): Chord {
    return this.style.prog[this.bar % this.style.prog.length]!;
  }

  // --- akcje gracza: nuty z aktualnego akordu, od razu (bez czekania na takt) ---

  /** Strzał: im mocniejszy, tym wyższy dźwięk akordu. */
  launch(power: number): void {
    this.note(this.style.pluck(tone(this.chord, Math.round(power * 6), 0), 0.2, 0), 1, undefined, true);
  }

  /** Kolejne cukierki w locie: wznosząca się melodia po dźwiękach akordu, na zmianę lewo/prawo. */
  candy(combo: number): void {
    this.note(bell(tone(this.chord, combo - 1, 1), 0.4, combo % 2 ? -0.4 : 0.4), 1.2, undefined, true);
  }

  /** Seria rytmu: melodia wspina się z każdym skokiem, a perkusja uderza tym mocniej, im dłuższa seria. */
  streak(n: number): void {
    const power = Math.min(1, n / 12);
    this.note(this.style.lead(tone(this.chord, n - 1, 0), 0.3, 0.2), 1.3, undefined, true);
    this.note(stab(this.chord, 0.3, 0.7 + power), 0.6 + power * 0.8, undefined, true);
    if (n >= 5) {
      this.badum(power); // od ×5: ba-dum-tss w rytm
    } else {
      this.note(kickHard, 0.6 + power * 0.6);
      this.note(clap, 0.6 + power * 0.8, undefined, true);
      this.pulse('hit', 0.5 + power * 0.5);
    }
    if (n >= 10) this.note(taiko, 0.7 + power * 0.4, undefined, true);
  }

  /**
   * Ba-dum-tss: werbel, tom ze stopą, talerz, równo na najbliższych szesnastkach utworu
   * (brzmi jak perkusista, nie jak efekt). `power` 0..1 = siła akcji.
   */
  badum(power: number): void {
    const ctx = this.sound.audio;
    if (!ctx || this.dead) return;
    const s16 = this.sixteenth();
    const at = Math.max(ctx.currentTime + 0.01, this.nextTime);
    const v = 0.8 + power * 0.6;
    this.note(snareSnap, v, at);
    this.pulse('snare', 0.6 + power * 0.4, at);
    this.note(tomLow, v, at + s16);
    this.note(kickHard, v, at + s16);
    this.pulse('kick', 0.7 + power * 0.3, at + s16);
    this.note(tss, v, at + 3 * s16, true);
    this.note(kickHard, v * 0.9, at + 3 * s16);
    this.pulse('hit', 0.6 + power * 0.4, at + 3 * s16);
  }

  /** Narastanie przed kamieniem milowym (jeden skok przed premią). */
  anticipate(): void {
    const ctx = this.sound.audio;
    if (!ctx || !this.ensure() || !this.riserBus) return;
    this.riserBus.gain.cancelScheduledValues(ctx.currentTime);
    this.riserBus.gain.setValueAtTime(1, ctx.currentTime);
    this.sound.synth(riser(2.2), { output: this.riserBus });
  }

  /** Ucina narastanie (zerwana seria: szybko opada; premia: zastępuje je uderzenie). */
  private cutRiser(seconds: number): void {
    const ctx = this.sound.audio;
    if (!ctx || !this.riserBus) return;
    this.riserBus.gain.cancelScheduledValues(ctx.currentTime);
    this.riserBus.gain.setTargetAtTime(0.0001, ctx.currentTime, seconds / 3);
  }

  /** Ratunek, akrobacja, combo w locie: akord i szybkie przejście na tomach. */
  trick(n: number): void {
    const ctx = this.sound.audio;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.note(stab(this.chord, 0.4, 1.2), 1, t, true);
    if (n >= 2) {
      this.badum(Math.min(1, n / 4)); // większa akcja: ba-dum-tss
    } else {
      [tomHi, tomMid, tomLow].forEach((tm, k) => this.note(tm, 0.9, t + k * 0.07));
      this.pulse('hit', 0.7);
    }
    if (n >= 3) this.note(taiko, 0.8, t + 0.21, true);
  }

  /** Skok w locie: błysk oktawę wyżej. */
  airJump(n: number): void {
    this.note(bell(tone(this.chord, n + 2, 1), 0.3, n % 2 ? 0.5 : -0.5), 1, undefined, true);
  }

  /** Lądowanie: miękka pryma w basie. */
  land(strength: number): void {
    this.note(this.style.bass(tone(this.chord, 0, -2), 0.3), 0.3 + strength * 0.5);
  }

  /** Kamień milowy: „drop” od razu (zjazd basu, taiko, wielki talerz, akord), potem przebieg dzwonków w takt. */
  milestone(): void {
    const ctx = this.sound.audio;
    if (!ctx) return;
    this.cutRiser(0.05);
    const now = ctx.currentTime;
    this.note(subDrop, 1, now);
    this.note(kickHard, 1.3, now);
    this.note(taiko, 1.1, now, true);
    this.note(crashBig, 1, now, true);
    this.note(stab(this.chord, 0.9, 1.4), 1.5, now, true);
    this.note(clap, 1.2, now, true);
    const sixteenth = this.sixteenth();
    const at = Math.max(now + 0.1, this.nextTime);
    for (let i = 0; i < 8; i++) this.note(bell(tone(this.chord, i, 1), 0.3, i % 2 ? 0.5 : -0.5), 1.1, at + i * sixteenth, true);
    [taiko, tomMid, taiko, tomLow].forEach((d, k) => {
      this.note(d, 0.8, at + (k * 2 + 8) * sixteenth, true);
      this.pulse('kick', 0.9, at + (k * 2 + 8) * sixteenth);
    });
    this.pulse('drop', 1, now);
    this.flash = 1;
  }

  /** Zerwana seria: dwie opadające nuty, narastanie opada. */
  lost(): void {
    this.cutRiser(0.4);
    this.note(this.style.pluck(tone(this.chord, 2, 0), 0.2), 0.8, undefined, true);
    const ctx = this.sound.audio;
    if (ctx) this.note(this.style.pluck(tone(this.chord, 0, -1), 0.3), 0.8, ctx.currentTime + 0.14, true);
  }

  /** Śmierć: akord rozpada się w dół. */
  die(): void {
    const ctx = this.sound.audio;
    if (!ctx) return;
    this.dead = true;
    [3, 2, 1, 0].forEach((i, k) =>
      this.note([{ wave: 'triangle', freq: tone(this.chord, i, 0), freqEnd: tone(this.chord, i, -1), duration: 0.6, volume: 0.07, pan: k % 2 ? 0.4 : -0.4 }], 1, ctx.currentTime + k * 0.09, true),
    );
  }

  revive(): void {
    this.dead = false;
  }

  /** Co klatkę: harmonogram kroków (szesnastek) z wyprzedzeniem, warstwy wg intensywności. */
  update(s: ScoreState): void {
    const ctx = this.sound.audio;
    if (!ctx || !this.ensure() || ctx.state !== 'running') return;
    this.wantedLevel = s.dead || this.dead ? 0 : s.intensity;
    this.danger += (s.danger - this.danger) * 0.1;
    // Slow-motion: tempo zwalnia, ale wysokość zostaje (to nie taśma, tylko instrumenty).
    this.tempo = 0.5 + 0.5 * Math.min(1, s.timeScale);
    this.flash = Math.max(0, this.flash - 0.03);
    const muffle = Math.max(this.wantedLevel === 0 && !this.dead ? 0.35 : 0, this.danger * 0.7, s.timeScale < 1 ? 0.3 : 0, this.dead ? 0.6 : 0) * (1 - this.flash);
    this.filter?.frequency.setTargetAtTime(16000 * Math.pow(600 / 16000, muffle), ctx.currentTime, 0.08);

    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05; // po pauzie / zablokowanym audio
    while (this.nextTime < ctx.currentTime + 0.12) {
      const odd = this.step % 2 === 1;
      this.playStep(this.step, this.nextTime + (odd ? this.style.swing * this.sixteenth() : 0));
      this.nextTime += this.sixteenth();
      this.step++;
    }
  }

  private sixteenth(): number {
    return 60 / (this.style.bpm * this.tempo) / 4;
  }

  private playStep(step: number, at: number): void {
    const i = step % 16;
    if (i === 0) {
      // Na początku taktu: zmiana świata i poziomu warstw (muzycznie, bez urwanych fraz).
      if (this.style !== this.wantedStyle) {
        this.style = this.wantedStyle;
        this.retime();
      }
      this.level = this.wantedLevel;
    }
    const st = this.style;
    const chord = this.chord;
    const bar = this.bar;
    const barLen = 16 * this.sixteenth();
    const partB = Math.floor(bar / 8) % 2 === 1;
    const phraseEnd = bar % 4 === 3;
    const L = this.level;

    if (i === 0) this.pulse('bar', Math.min(1, 0.3 + L * 0.2), at);
    if (i === 0) {
      const padLen = barLen * 0.98;
      if (this.pads) this.sound.synth([0, 1, 2, 3].flatMap((k) => st.pad(tone(chord, k, -1), padLen)), { at, output: this.pads });
    }
    if (L >= 1) {
      // Bas: w części B gęściej (ósemki z oktawą).
      const bassSteps = partB && L >= 3 ? [0, 3, 6, 8, 11, 14] : [0, 8];
      if (bassSteps.includes(i)) this.note(st.bass(tone(chord, 0, i % 3 === 0 ? -2 : -1), barLen / 4), 1, at);
      if (st.kickPat[i] === 'x' && (L >= 3 || i === 0 || i === 8)) {
        this.note(st.kick, 1, at);
        this.pulse('kick', Math.min(1, 0.35 + L * 0.16), at);
      }
    }
    if (L >= 2) {
      if (st.hatPat[i] === 'x') this.note(st.hat, partB ? 1.2 : 1, at);
      if (i % 2 === 0) {
        const arp = partB ? [...st.arp].reverse() : st.arp;
        const k = arp[(i / 2) % arp.length]!;
        this.note(st.pluck(tone(chord, k, partB ? 1 : 0), 0.2, i % 4 === 0 ? -0.5 : 0.5), 0.85, at, true);
      }
    }
    if (L >= 3) {
      if (st.snarePat[i] === 'x') {
        this.note(st.snare, 1, at);
        this.pulse('snare', Math.min(1, 0.4 + (L - 3) * 0.3), at);
      }
      if (i % 2 === 1) this.note(st.pluck(tone(chord, st.arp[(i + 3) % st.arp.length]!, 1), 0.15, i % 4 === 1 ? 0.6 : -0.6), 0.45, at, true);
      // Przejście na końcu frazy: werbel szesnastkami, coraz głośniej.
      if (phraseEnd && i >= 12) this.note(st.snare, 0.5 + (i - 12) * 0.2, at);
    }
    if (L >= 3 && st.kickPat[i] === 'x') this.pump(at);
    if (L >= 4) {
      // Epicko: talerz na początku taktu, akord dęty przy zmianie harmonii, taiko na „raz” i „trzy”, bas w oktawach.
      if (i === 0) {
        this.note(CRASH, 0.7, at, true);
        this.note(stab(chord, 0.45, 1), 0.9, at, true);
      }
      if (i === 0 || i === 8) this.note(taiko, 0.7, at, true);
      if (i % 4 === 2) this.note(st.bass(tone(chord, 0, -1), barLen / 8), 0.5, at);
      // Melodia: co takt inny rytm, krokowy ruch po dźwiękach akordu (bez skoków o pół skali).
      const rhythm = RHYTHMS[Math.floor(hash(bar) * RHYTHMS.length)]!;
      if (rhythm.includes(i)) {
        const r = hash(bar * 31 + i);
        this.melodyPos = Math.max(1, Math.min(7, this.melodyPos + (r < 0.4 ? -1 : r < 0.8 ? 1 : 2)));
        const last = i === rhythm[rhythm.length - 1];
        this.note(st.lead(tone(chord, last ? 4 : this.melodyPos, 0), last ? 0.6 : 0.25, (r - 0.5) * 0.6), 1, at, true);
      }
    }
    // Napięcie: syrop blisko = bicie serca i niepokojąca sekunda nad prymą.
    if (this.danger > 0.45 && !this.dead) {
      if (i === 0 || i === 3) {
        this.note(kickSoft, 0.8 + this.danger * 0.6, at);
        this.pulse('kick', 0.3 + this.danger * 0.3, at);
      }
      if (i === 8) this.note([{ wave: 'triangle', freq: hz(chord[0]! + 1), duration: barLen / 2, volume: 0.025 * this.danger, attack: 0.1, sustain: 0.8, release: 0.2 }], 1, at, true);
    }
  }

  /** Pompowanie: pady przyciszają się na uderzeniu stopy i wracają (efekt „sidechain”). */
  private pump(at: number): void {
    const g = this.pads?.gain;
    if (!g) return;
    g.cancelScheduledValues(at);
    g.setValueAtTime(1, at);
    g.linearRampToValueAtTime(0.35, at + 0.02);
    g.linearRampToValueAtTime(1, at + this.sixteenth() * 3);
  }

  private note(layers: SynthLayer[], volume: number, at?: number, wet = false): void {
    if (!this.ensure()) return;
    const out = wet ? this.wet : this.dry;
    if (!out) return;
    this.sound.synth(volume === 1 ? layers : layers.map((l) => scale(l, volume)), { at, output: out });
  }

  /** Echo w rytm świata (kropkowana ósemka) i ilość efektów. */
  private retime(): void {
    const ctx = this.sound.audio;
    if (!ctx || !this.delay || !this.wetSend) return;
    this.delay.delayTime.setTargetAtTime((60 / this.style.bpm) * 0.75, ctx.currentTime, 0.1);
    this.wetSend.gain.setTargetAtTime(0.35 * this.style.wet, ctx.currentTime, 0.2);
  }

  private ensure(): boolean {
    if (this.filter) return true;
    const ctx = this.sound.audio;
    const out = this.sound.output;
    if (!ctx || !out) return false;
    // Wyjście: filtr (przytłumienie) -> głośność muzyki -> wyjście główne.
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 16000;
    const bus = ctx.createGain();
    bus.gain.value = this.enabled ? this.volume : 0;
    this.bus = bus;
    // Kompresor „skleja” miks (jak przy produkcji muzyki) i nie pozwala uderzeniom przesterować.
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.knee.value = 12;
    glue.ratio.value = 3.5;
    glue.attack.value = 0.006;
    glue.release.value = 0.2;
    const makeup = ctx.createGain();
    makeup.gain.value = 1;
    this.filter.connect(glue).connect(makeup).connect(bus).connect(out);
    // Suche wejście prosto do filtra.
    this.dry = ctx.createGain();
    this.dry.connect(this.filter);
    // Mokre: sygnał suchy + wysyłka na pogłos (generowana odpowiedź impulsowa) i echo ze sprzężeniem.
    this.wet = ctx.createGain();
    this.wet.connect(this.filter);
    this.wetSend = ctx.createGain();
    this.wet.connect(this.wetSend);
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 2.4);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.9;
    this.wetSend.connect(reverb).connect(reverbGain).connect(this.filter);
    this.delay = ctx.createDelay(2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3500;
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.5;
    this.wetSend.connect(this.delay);
    this.delay.connect(tone).connect(feedback).connect(this.delay);
    tone.connect(delayOut).connect(this.filter);
    this.pads = ctx.createGain();
    this.pads.connect(this.wet);
    this.riserBus = ctx.createGain();
    this.riserBus.connect(this.wet);
    this.retime();
    return true;
  }
}

/** Odpowiedź impulsowa pogłosu: stereo szum z wykładniczym zanikiem (tanio i bez plików). */
function impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}
