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
  /** Ile kroków stałych wykonała ostatnia klatka (diagnostyka płynności). */
  lastSteps = 0;
  /**
   * Wyrównanie czasu klatki: odczyt czasu z przeglądarki drga o ±1–2 ms, przez co przy 60 Hz
   * raz wypada 0 kroków fizyki, raz 2 (obiekt stoi, potem skacze). Klatkę bliską kroku
   * (albo jego wielokrotności / połowy przy 120 Hz) traktujemy jak dokładnie ten krok.
   */
  snap = 0.15;
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
    const real = this.snapped(Math.min(realDt, 0.1));
    const dt = real * this.timeScale;
    this.time += dt;
    // Akumulujemy czas rzeczywisty, a krok skalujemy: w slow-motion symulacja dalej rusza się
    // co klatkę (krótszymi krokami), zamiast stać przez kilka klatek i skakać, co klatkowało.
    this.acc += real;
    let steps = 0;
    while (this.acc >= this.fixedStep && steps < this.maxSteps) {
      if (this.timeScale > 0) this.cb.fixedUpdate?.(this.fixedStep * this.timeScale);
      this.acc -= this.fixedStep;
      steps++;
    }
    if (steps === this.maxSteps) this.acc = Math.min(this.acc, this.fixedStep);
    this.lastSteps = steps;
    this.cb.update?.(dt);
    this.cb.render?.(this.alpha);
  }

  /** Ułamek do następnego kroku stałego [0, 1): do interpolacji pozycji między krokami. */
  get alpha(): number {
    return Math.min(1, this.acc / this.fixedStep);
  }

  private snapped(real: number): number {
    if (this.snap <= 0) return real;
    const step = this.fixedStep;
    for (const k of [0.5, 1, 2, 3]) {
      if (Math.abs(real - step * k) < step * this.snap * Math.min(1, k)) return step * k;
    }
    return real;
  }
}
