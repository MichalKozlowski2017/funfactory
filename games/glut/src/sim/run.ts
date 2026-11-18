import { PHYS, World, type StepResult } from './physics.ts';
import { difficulty, Shaft, SHAFT, START } from './shaft.ts';

export const SYRUP = {
  /** Start syropu pod dnem studni. */
  startY: 260,
  /** Prędkość na dole i przy pełnej trudności (jednostki/s). */
  speedMin: 45,
  speedMax: 150,
  /** Gdy syrop zostaje dalej niż `leash` pod slime'em, przyspiesza, żeby zawsze był blisko. */
  leash: 1000,
  catchUp: 1.2,
} as const;

export interface RunStep extends StepResult {
  /** Syrop dogonił slime'a. */
  drowned?: boolean;
  /** Zmiany kawałków studni (dla widoku). */
  added?: number[];
  removed?: number[];
}

/**
 * Jeden bieg: fizyka + studnia + syrop + wynik. Bez Pixi.
 * Syrop rusza dopiero po pierwszym strzale, żeby gracz miał czas się rozejrzeć.
 */
export class Run {
  readonly shaft: Shaft;
  readonly world: World;
  syrupY: number = SYRUP.startY;
  started = false;
  over = false;
  /** Najwyższy osiągnięty punkt (najmniejsze y). */
  peakY: number;
  time = 0;

  constructor(seed: number) {
    this.shaft = new Shaft(seed);
    this.shaft.update(START.y, START.y);
    this.world = new World(this.shaft.blocks, START);
    this.peakY = this.world.slime.y;
  }

  get slime() {
    return this.world.slime;
  }

  /** Wysokość w metrach (100 jednostek = 1 m). */
  get meters(): number {
    return Math.max(0, Math.floor((START.y - this.peakY) / 100));
  }

  launch(vx: number, vy: number): boolean {
    if (this.over || !this.world.launch(vx, vy)) return false;
    this.started = true;
    return true;
  }

  step(dt: number): RunStep {
    if (this.over) return {};
    const result: RunStep = this.world.step(dt);
    const s = this.world.slime;
    if (s.state !== 'dead') this.peakY = Math.min(this.peakY, s.y);

    if (this.started) {
      this.time += dt;
      const chunk = Math.floor(-this.syrupY / SHAFT.chunk);
      let speed = SYRUP.speedMin + (SYRUP.speedMax - SYRUP.speedMin) * difficulty(chunk);
      const gap = this.syrupY - s.y;
      if (gap > SYRUP.leash) speed += (gap - SYRUP.leash) * SYRUP.catchUp;
      this.syrupY -= speed * dt;
      if (s.state !== 'dead' && s.y + PHYS.radius * 0.3 > this.syrupY) {
        this.world.kill();
        result.drowned = true;
      }
    }

    if (result.died || result.drowned) this.over = true;

    const changes = this.shaft.update(this.peakY, Math.max(this.syrupY, s.y) + 400);
    if (changes.added.length || changes.removed.length) {
      this.world.blocks = this.shaft.blocks;
      result.added = changes.added;
      result.removed = changes.removed;
    }
    return result;
  }
}
