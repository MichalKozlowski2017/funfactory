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
  /** Drugi oddech: przez ten czas w każdym locie są dwa skoki zamiast jednego. */
  breath: 10,
} as const;

/**
 * Skok w locie: każdy lot ma jeden (z drugim oddechem dwa), odnawia się po lądowaniu.
 * Nagrody: ratunek (skok przy opadaniu, gdy syrop jest blisko, i bezpieczne lądowanie)
 * oraz akrobacja (po skoku w locie lądowanie wyżej niż start).
 */
export const AIR = {
  jumps: 1,
  breathJumps: 2,
  /** Skok w locie jest słabszy niż z półki: ratuje, ale nie zastępuje strzału. */
  power: 0.6,
  rescueGap: 500,
  rescueReward: 2,
  acrobatReward: 1,
} as const;

/** Power-upy z czasem działania. */
export type TimedPower = 'shell' | 'magnet' | 'frost' | 'rocket' | 'glue' | 'breath';

export const SYRUP = {
  /** Start syropu pod dnem studni. */
  startY: 260,
  /** Prędkość na dole i przy pełnej trudności (jednostki/s). */
  speedMin: 50,
  speedMax: 165,
  /** Gdy syrop zostaje dalej niż `leash` pod slime'em, przyspiesza, żeby zawsze był blisko. */
  leash: 1000,
  catchUp: 1.2,
} as const;

/**
 * Serie. Rytm: szybki strzał po lądowaniu (w oknie `window`) i lądowanie wyżej podbija serię,
 * zawahanie ją zrywa. Co `every` skoków premia w cukierkach. Seria w locie: kilka cukierków w jednym skoku.
 */
export const STREAK = {
  window: 1.0,
  /** O ile wyżej trzeba wylądować, żeby skok się liczył (skoki w bok nie podbijają serii, ale jej nie zrywają). */
  minClimb: 60,
  every: 5,
  /** Premia za kamień milowy serii: 5 → 3, 10 → 5, 15 → 8, od 20 → 10. */
  reward: (streak: number) => Math.min(10, Math.round(streak / 2)),
  /** Premia za n cukierków w jednym skoku: rząd 3 to +1. Dwa dają tylko napis „x2”. */
  airReward: (n: number) => Math.max(0, n - 2),
} as const;

export interface RunStep extends StepResult {
  /** Nowa długość serii po udanym skoku w rytmie. */
  streak?: number;
  /** Kamień milowy serii (co STREAK.every) i premia. */
  milestone?: { streak: number; reward: number };
  /** Seria zerwana przez zawahanie (długość przed zerwaniem). */
  streakBroken?: number;
  /** Kilka cukierków w jednym skoku i premia. */
  airCombo?: { count: number; reward: number };
  /** Udane lądowanie po skoku w locie: ratunek albo akrobacja, z premią. */
  trick?: { kind: 'rescue' | 'acrobat'; reward: number };
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
  readonly timers: Record<TimedPower, number> = { shell: 0, magnet: 0, frost: 0, rocket: 0, glue: 0, breath: 0 };
  /** Pozostałe skoki w tym locie. */
  air = 0;
  private usedAir = false;
  private rescue = false;
  /** Seria w rytmie, najlepsza seria biegu i suma premii (już wliczona w `candies`). */
  streak = 0;
  bestStreak = 0;
  bonus = 0;
  /** Czas od ostatniego lądowania (liczony tylko, gdy slime stoi). */
  sinceLand = 0;
  private launchQuick = false;
  private launchY = 0;
  private flightCandies = 0;

  constructor(seed: number) {
    this.shaft = new Shaft(seed);
    this.shaft.update(START.y, START.y);
    this.world = new World(this.shaft.blocks, START);
    this.peakY = this.world.slime.y;
  }

  get slime() {
    return this.world.slime;
  }

  /** Skoki w locie na jeden lot. */
  get maxAir(): number {
    return this.timers.breath > 0 ? AIR.breathJumps : AIR.jumps;
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

  /** Prędkość strzału z uwzględnieniem słabszego skoku w locie (do celowania i przewidywania toru). */
  shotVelocity(vx: number, vy: number): { vx: number; vy: number } {
    const k = this.world.slime.state === 'flying' ? AIR.power : 1;
    return { vx: vx * k, vy: vy * k };
  }

  launch(vx: number, vy: number): boolean {
    if (this.over || this.timers.rocket > 0) return false;
    const inAir = this.world.slime.state === 'flying';
    ({ vx, vy } = this.shotVelocity(vx, vy));
    if (inAir && this.air <= 0) return false;
    const s = this.world.slime;
    const falling = s.vy > 0 && this.syrupY - s.y < AIR.rescueGap;
    if (!this.world.launch(vx, vy, inAir)) return false;
    if (inAir) {
      this.air--;
      this.usedAir = true;
      if (falling) this.rescue = true;
    } else {
      this.air = this.maxAir;
      this.usedAir = false;
      this.rescue = false;
      this.launchQuick = this.sinceLand <= STREAK.window;
      this.launchY = s.y;
      this.flightCandies = 0;
    }
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
      this.rhythm(dt, result);
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

  /** Serie: rytm skoków i cukierki w jednym locie. */
  private rhythm(dt: number, result: RunStep): void {
    const s = this.world.slime;
    if (result.landed) {
      this.sinceLand = 0;
      const climbed = this.started && s.y < this.launchY - STREAK.minClimb;
      if (this.usedAir && this.started && (this.rescue || climbed)) {
        const trick = this.rescue ? { kind: 'rescue' as const, reward: AIR.rescueReward } : { kind: 'acrobat' as const, reward: AIR.acrobatReward };
        this.give(trick.reward);
        result.trick = trick;
      }
      this.usedAir = false;
      this.rescue = false;
      this.air = this.maxAir; // zejście z półki bez strzału też daje skok w locie
      if (climbed) {
        this.streak = this.launchQuick ? this.streak + 1 : 1;
        this.launchY = s.y; // kolejne lądowania z tego samego lotu (np. zjazd po lodzie) nie liczą się podwójnie
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        result.streak = this.streak;
        if (this.streak % STREAK.every === 0) {
          const reward = STREAK.reward(this.streak);
          this.give(reward);
          result.milestone = { streak: this.streak, reward };
        }
      }
      if (this.flightCandies >= 2) {
        const reward = STREAK.airReward(this.flightCandies);
        this.give(reward);
        result.airCombo = { count: this.flightCandies, reward };
      }
      this.flightCandies = 0;
    } else if (s.state === 'stuck' && this.started) {
      this.sinceLand += dt;
      if (this.streak > 0 && this.sinceLand > STREAK.window) {
        result.streakBroken = this.streak;
        this.streak = 0;
      }
    }
  }

  private give(reward: number): void {
    this.candies += reward;
    this.bonus += reward;
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
        this.timers.breath = POWER.breath;
        this.air = Math.max(this.air, AIR.breathJumps);
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
        if (s.state === 'flying') this.flightCandies++;
        (result.collected ??= []).push(c);
      }
    }
  }
}
