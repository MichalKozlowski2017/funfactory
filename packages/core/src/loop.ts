export interface LoopCallbacks {
  /** Logika w stałym kroku (fizyka, symulacja). */
  fixedUpdate?: (dt: number) => void;
  /** Raz na klatkę, zmienne dt (animacje, tweeny). */
  update?: (dt: number) => void;
  /** `alpha` w [0, 1): ile brakuje do następnego kroku stałego, do interpolacji. */
  render?: (alpha: number) => void;
}

/**
 * Pętla z akumulatorem stałego kroku. Nie zna renderera ani requestAnimationFrame.
 * Platforma (np. kit2d) woła `tick(seconds)` z własnego tickera.
 */
export class Loop {
  readonly fixedStep: number;
  /** Maksymalna liczba kroków stałych na klatkę (ochrona przed spiralą śmierci). */
  maxSteps = 5;
  timeScale = 1;
  paused = false;
  /** Czas gry w sekundach (uwzględnia timeScale i pauzę). */
  time = 0;
  private acc = 0;
  private readonly cb: LoopCallbacks;

  constructor(cb: LoopCallbacks, fixedHz = 60) {
    this.cb = cb;
    this.fixedStep = 1 / fixedHz;
  }

  tick(realDt: number): void {
    if (this.paused) {
      this.cb.render?.(0);
      return;
    }
    const dt = Math.min(realDt, 0.1) * this.timeScale;
    this.time += dt;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= this.fixedStep && steps < this.maxSteps) {
      this.cb.fixedUpdate?.(this.fixedStep);
      this.acc -= this.fixedStep;
      steps++;
    }
    if (steps === this.maxSteps) this.acc = Math.min(this.acc, this.fixedStep);
    this.cb.update?.(dt);
    this.cb.render?.(this.acc / this.fixedStep);
  }
}
