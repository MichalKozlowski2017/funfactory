import { PHYS, World, type StepResult } from './physics.ts';
import { CANDY_RADIUS, difficulty, POWER_RADIUS, Shaft, SHAFT, START, type Candy, type PowerKind, type PowerUp } from './shaft.ts';

/** Czasy i siła power-upów (wszystkie działają od razu po zebraniu). */
export const POWER = {
  shell: 10,
  magnet: 10,
  magnetRadius: 300,
  magnetSpeed: 950,
  frost: 6,
  /** O ile syrop opada przy zamrożeniu. */
  frostDrop: 400,
  rocket: 1.4,
  glue: 10,
} as const;

/** Power-upy z czasem działania (drugi oddech to ładunek, nie czas). */
export type TimedPower = 'shell' | 'magnet' | 'frost' | 'rocket' | 'glue';

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
  /** Cukierki zebrane w tym kroku. */
  collected?: Candy[];
  /** Power-up zebrany w tym kroku. */
  powered?: PowerUp;
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
  candies = 0;
  /** Pozostały czas power-upów (s). */
  readonly timers: Record<TimedPower, number> = { shell: 0, magnet: 0, frost: 0, rocket: 0, glue: 0 };
  /** Ładunki strzału w powietrzu (drugi oddech). */
  air = 0;

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

  /** Czy gracz może teraz celować: przyklejony albo w locie z ładunkiem drugiego oddechu. */
  get canAim(): boolean {
    const s = this.world.slime;
    if (this.over || this.timers.rocket > 0) return false;
    return s.state === 'stuck' || (s.state === 'flying' && this.air > 0);
  }

  launch(vx: number, vy: number): boolean {
    if (this.over || this.timers.rocket > 0) return false;
    const inAir = this.world.slime.state === 'flying';
    if (inAir && this.air <= 0) return false;
    if (!this.world.launch(vx, vy, inAir)) return false;
    if (inAir) this.air--;
    this.started = true;
    return true;
  }

  step(dt: number): RunStep {
    if (this.over) return {};
    for (const k of Object.keys(this.timers) as TimedPower[]) this.timers[k] = Math.max(0, this.timers[k] - dt);
    const mods = this.world.mods;
    mods.shell = this.timers.shell > 0;
    mods.glue = this.timers.glue > 0;
    const wasRocket = mods.rocket;
    mods.rocket = this.timers.rocket > 0;
    const result: RunStep = this.world.step(dt);
    const s = this.world.slime;
    if (result.shielded) this.timers.shell = 0;
    if (mods.rocket) s.x = Math.max(SHAFT.wall + s.r + 4, Math.min(SHAFT.width - SHAFT.wall - s.r - 4, s.x));
    if (wasRocket && !mods.rocket) s.vy = -500; // po rakiecie: łagodne wyhamowanie w górę
    if (s.state !== 'dead') {
      this.peakY = Math.min(this.peakY, s.y);
      this.attract(dt);
      this.collect(result);
      this.pickPowers(result);
    }

    if (this.started) {
      this.time += dt;
      const chunk = Math.floor(-this.syrupY / SHAFT.chunk);
      let speed = SYRUP.speedMin + (SYRUP.speedMax - SYRUP.speedMin) * difficulty(chunk);
      const gap = this.syrupY - s.y;
      if (gap > SYRUP.leash) speed += (gap - SYRUP.leash) * SYRUP.catchUp;
      if (this.timers.frost <= 0) this.syrupY -= speed * dt;
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

  /** Magnes: cukierki w zasięgu lecą do slime'a. */
  private attract(dt: number): void {
    if (this.timers.magnet <= 0) return;
    const s = this.world.slime;
    const k = Math.floor(-s.y / SHAFT.chunk);
    for (const chunk of [k - 1, k, k + 1]) {
      for (const c of this.shaft.candies.get(chunk) ?? []) {
        if (c.taken) continue;
        const dx = s.x - c.x;
        const dy = s.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d > POWER.magnetRadius || d < 1) continue;
        const step = Math.min(d, POWER.magnetSpeed * dt);
        c.x += (dx / d) * step;
        c.y += (dy / d) * step;
      }
    }
  }

  private pickPowers(result: RunStep): void {
    const s = this.world.slime;
    const reach = (s.r + POWER_RADIUS) ** 2;
    const k = Math.floor(-s.y / SHAFT.chunk);
    for (const chunk of [k - 1, k, k + 1]) {
      for (const p of this.shaft.powers.get(chunk) ?? []) {
        if (p.taken || (p.x - s.x) ** 2 + (p.y - s.y) ** 2 > reach) continue;
        p.taken = true;
        this.activate(p.kind);
        result.powered = p;
      }
    }
  }

  /** Włącza power-up od razu. Publiczne, żeby dało się testować i dawać power-upy na start. */
  activate(kind: PowerKind): void {
    switch (kind) {
      case 'breath':
        this.air = 1;
        break;
      case 'frost':
        this.timers.frost = POWER.frost;
        this.syrupY = Math.min(SYRUP.startY, this.syrupY + POWER.frostDrop);
        break;
      default:
        this.timers[kind] = POWER[kind];
    }
  }

  private collect(result: RunStep): void {
    const s = this.world.slime;
    const reach = (s.r + CANDY_RADIUS) ** 2;
    const k = Math.floor(-s.y / SHAFT.chunk);
    for (const chunk of [k - 1, k, k + 1]) {
      for (const c of this.shaft.candies.get(chunk) ?? []) {
        if (c.taken || (c.x - s.x) ** 2 + (c.y - s.y) ** 2 > reach) continue;
        c.taken = true;
        this.candies++;
        (result.collected ??= []).push(c);
      }
    }
  }
}
