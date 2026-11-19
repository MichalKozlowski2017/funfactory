import { PHYS } from './physics.ts';
import { Run } from './run.ts';

/**
 * Powtórka biegu: seed, długości kroków symulacji i strzały. Symulacja jest deterministyczna,
 * więc serwer rankingu może ją odtworzyć (`verifyReplay`) i sprawdzić wynik zamiast mu ufać.
 * Kroki mają różną długość (slow-motion przy celowaniu w locie), dlatego zapisujemy je
 * jako ciąg [dt, ile razy] (zwykle kilka wpisów na bieg).
 */
export interface Replay {
  v: 1;
  seed: number;
  /** Długości kroków jako [dt, liczba powtórzeń]. */
  steps: [number, number][];
  /** Strzały: numer kroku (przed którym padł strzał) i prędkość podana do Run.launch. */
  shots: [number, number, number][];
  /** Wynik zgłoszony przez grę (do porównania z odtworzonym). */
  meters: number;
}

export class ReplayRecorder {
  readonly replay: Replay;
  private count = 0;

  constructor(seed: number) {
    this.replay = { v: 1, seed, steps: [], shots: [], meters: 0 };
  }

  /** Wołane przed każdym `run.step(dt)`. */
  step(dt: number): void {
    const last = this.replay.steps[this.replay.steps.length - 1];
    if (last && last[0] === dt) last[1]++;
    else this.replay.steps.push([dt, 1]);
    this.count++;
  }

  /** Wołane przy udanym `run.launch(vx, vy)`. */
  shot(vx: number, vy: number): void {
    this.replay.shots.push([this.count, vx, vy]);
  }

  finish(meters: number): Replay {
    this.replay.meters = meters;
    return this.replay;
  }
}

export interface Verified {
  ok: boolean;
  meters: number;
  candies: number;
  time: number;
}

/** Odtwarza bieg z powtórki. `ok`, gdy wynik zgadza się ze zgłoszonym. */
export function verifyReplay(replay: Replay, maxSteps = 60 * 60 * 30): Verified {
  const run = new Run(replay.seed);
  let i = 0;
  let shot = 0;
  for (const [dt, n] of replay.steps) {
    // Krok dłuższy niż w grze (1/60 s) albo niedodatni to manipulacja.
    if (!(dt > 0 && dt <= 1 / 60 + 1e-9)) return { ok: false, meters: 0, candies: 0, time: 0 };
    for (let k = 0; k < n; k++, i++) {
      if (i > maxSteps) return { ok: false, meters: run.meters, candies: run.candies, time: run.time };
      while (shot < replay.shots.length && replay.shots[shot]![0] === i) {
        const [, vx, vy] = replay.shots[shot++]!;
        // Strzał silniejszy niż pozwala gra to oszustwo.
        if (Math.hypot(vx, vy) > PHYS.maxSpeed * 1.001) return { ok: false, meters: 0, candies: 0, time: 0 };
        run.launch(vx, vy);
      }
      run.step(dt);
      if (run.over) break;
    }
    if (run.over) break;
  }
  return { ok: run.meters === replay.meters, meters: run.meters, candies: run.candies, time: run.time };
}
