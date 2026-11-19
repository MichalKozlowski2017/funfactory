import { ease as eases, type Ease, type EaseName } from './easing.ts';

type NumericKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];
export type TweenProps<T> = Partial<Pick<T, NumericKeys<T>>>;

export interface TweenOptions {
  /** Czas w sekundach. */
  duration: number;
  ease?: EaseName | Ease;
  delay?: number;
  /** Liczba powtórzeń po pierwszym przebiegu. -1 = bez końca. */
  repeat?: number;
  /** Przy powtórzeniu wraca do wartości startowych zamiast skakać. */
  yoyo?: boolean;
  onUpdate?: (t: number) => void;
}

export class Tween<T extends object = object> {
  readonly target: T;
  readonly done: Promise<void>;
  private readonly from = new Map<string, number>();
  private readonly to: Map<string, number>;
  private readonly easeFn: Ease;
  private elapsed: number;
  private repeatLeft: number;
  private forward = true;
  private started = false;
  private resolve!: () => void;
  killed = false;
  finished = false;

  private readonly opts: TweenOptions;

  constructor(target: T, props: TweenProps<T>, opts: TweenOptions) {
    this.opts = opts;
    this.target = target;
    this.to = new Map(Object.entries(props) as [string, number][]);
    this.easeFn = typeof opts.ease === 'function' ? opts.ease : eases[opts.ease ?? 'quadOut'];
    this.elapsed = -(opts.delay ?? 0);
    this.repeatLeft = opts.repeat ?? 0;
    this.done = new Promise((r) => (this.resolve = r));
  }

  /** Zwraca true, gdy tween się skończył. */
  step(dt: number): boolean {
    if (this.killed || this.finished) return true;
    this.elapsed += dt;
    if (this.elapsed < 0) return false;
    if (!this.started) {
      this.started = true;
      const rec = this.target as Record<string, number>;
      for (const key of this.to.keys()) this.from.set(key, rec[key] ?? 0);
    }
    const duration = Math.max(this.opts.duration, 1e-6);
    let t = Math.min(this.elapsed / duration, 1);
    this.apply(this.forward ? t : 1 - t);
    this.opts.onUpdate?.(t);
    if (t < 1) return false;
    if (this.repeatLeft !== 0) {
      if (this.repeatLeft > 0) this.repeatLeft--;
      this.elapsed -= duration;
      if (this.opts.yoyo) this.forward = !this.forward;
      return false;
    }
    this.finished = true;
    this.resolve();
    return true;
  }

  /** Przerywa tween. `complete` ustawia wartości końcowe. */
  kill(complete = false): void {
    if (this.finished || this.killed) return;
    if (complete && this.started) this.apply(this.forward ? 1 : 0);
    this.killed = true;
    this.resolve();
  }

  private apply(t: number): void {
    const k = this.easeFn(t);
    const rec = this.target as Record<string, number>;
    for (const [key, end] of this.to) {
      const start = this.from.get(key) ?? 0;
      rec[key] = start + (end - start) * k;
    }
  }
}

/**
 * Menedżer tweenów. Jedna instancja na scenę albo grę, `update(dt)` wołane co klatkę.
 *
 * ```ts
 * await tweens.to(sprite.scale, { x: 1.2, y: 0.8 }, { duration: 0.08, yoyo: true, repeat: 1 }).done;
 * ```
 */
export class Tweens {
  private active: Tween<object>[] = [];
  /** Mnożnik czasu (slow-motion, pauza = 0). */
  timeScale = 1;

  to<T extends object>(target: T, props: TweenProps<T>, opts: TweenOptions): Tween<T> {
    const tween = new Tween(target, props, opts);
    this.active.push(tween as Tween<object>);
    return tween;
  }

  /** Czeka podaną liczbę sekund czasu gry. */
  wait(seconds: number): Promise<void> {
    return this.to({}, {}, { duration: seconds }).done;
  }

  killOf(target: object, complete = false): void {
    for (const tween of this.active) if (tween.target === target) tween.kill(complete);
  }

  killAll(): void {
    for (const tween of this.active) tween.kill();
    this.active = [];
  }

  get count(): number {
    return this.active.length;
  }

  update(dt: number): void {
    const scaled = dt * this.timeScale;
    if (this.active.length === 0) return;
    const snapshot = this.active;
    this.active = [];
    const keep: Tween<object>[] = [];
    for (const tween of snapshot) {
      // Obiekt zniszczony w trakcie animacji (np. Pixi `destroy()`): tween znika po cichu,
      // zamiast pisać do zwolnionych pól i wywracać całą klatkę.
      if ((tween.target as { destroyed?: unknown }).destroyed === true) {
        tween.kill();
        continue;
      }
      if (!tween.step(scaled)) keep.push(tween);
    }
    // Tweeny utworzone w trakcie update (np. w onUpdate) trafiły do this.active.
    this.active = keep.concat(this.active);
  }
}
