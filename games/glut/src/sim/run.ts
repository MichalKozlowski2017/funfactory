import { PHYS, World, type StepResult } from './physics.ts';
import { CANDY_RADIUS, POWER_RADIUS, Shaft, SHAFT, START, type Candy, type PowerKind, type PowerUp } from './shaft.ts';

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
  /** Drugi oddech: przez ten czas skoki w locie nie słabną. */
  breath: 10,
} as const;

/**
 * Skoki w locie: bez limitu, ale każdy kolejny w tym samym locie słabszy (`decay`), po lądowaniu
 * siła wraca. Dzięki temu seria skoków ratuje i wynosi wyżej, ale nie zastępuje półek.
 * Nagrody po bezpiecznym lądowaniu: akrobacja (wyżej niż start) = liczba skoków,
 * ratunek (skok przy opadaniu, gdy syrop był blisko) = liczba skoków + 1. Obie z limitem.
 */
export const AIR = {
  /** Pierwszy skok w locie względem strzału z półki. */
  power: 0.6,
  /** Mnożnik siły każdego kolejnego skoku w tym samym locie (drugi oddech go wyłącza). */
  decay: 0.8,
  rescueGap: 500,
  maxReward: 6,
} as const;

/** Siła n-tego skoku w locie (od 0) względem strzału z półki. */
export function airPower(n: number, breath: boolean): number {
  return AIR.power * (breath ? 1 : AIR.decay ** n);
}

/** Power-upy z czasem działania. */
export type TimedPower = 'shell' | 'magnet' | 'frost' | 'rocket' | 'glue' | 'breath';

export const SYRUP = {
  /** Start syropu pod dnem studni (nisko: nowy gracz ma chwilę na naukę, zanim syrop się pojawi). */
  startY: 860,
  /** Prędkość na dole i przy pełnej trudności (jednostki/s). */
  speedMin: 35,
  speedMax: 150,
  /**
   * Między tymi wysokościami (m) prędkość rośnie od `speedMin` do `speedMax`. Długa rampa: pełne tempo
   * dopiero w Spalonym karmelu, żeby przeciętny gracz zobaczył kilka światów (strojenie: sim/balance.ts).
   */
  rampFrom: 20,
  rampTo: 450,
  /** Gdy syrop zostaje dalej niż `leash` pod slime'em, przyspiesza, żeby zawsze był blisko. */
  leash: 1500,
  catchUp: 0.8,
} as const;

/** Prędkość syropu (jednostki/s) na wysokości `meters` (bez doganiania). */
export function syrupSpeed(meters: number): number {
  const k = Math.min(1, Math.max(0, (meters - SYRUP.rampFrom) / (SYRUP.rampTo - SYRUP.rampFrom)));
  return SYRUP.speedMin + (SYRUP.speedMax - SYRUP.speedMin) * k;
}

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
  trick?: { kind: 'rescue' | 'acrobat'; jumps: number; reward: number };
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
  /** Skoki w locie wykonane w tym locie (zerowane po lądowaniu). */
  airJumps = 0;
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


  /** Wysokość w metrach (100 jednostek = 1 m). */
  get meters(): number {
    return Math.max(0, Math.floor((START.y - this.peakY) / 100));
  }

  /** Czy gracz może teraz celować: przyklejony albo w locie z ładunkiem drugiego oddechu. */
  get canAim(): boolean {
    const s = this.world.slime;
    if (this.over || this.timers.rocket > 0) return false;
    return s.state === 'stuck' || s.state === 'flying';
  }

  /** Prędkość strzału z uwzględnieniem słabszego skoku w locie (do celowania i przewidywania toru). */
  shotVelocity(vx: number, vy: number): { vx: number; vy: number } {
    const k = this.world.slime.state === 'flying' ? airPower(this.airJumps, this.timers.breath > 0) : 1;
    return { vx: vx * k, vy: vy * k };
  }

  launch(vx: number, vy: number): boolean {
    if (this.over || this.timers.rocket > 0) return false;
    const inAir = this.world.slime.state === 'flying';
    ({ vx, vy } = this.shotVelocity(vx, vy));
    const s = this.world.slime;
    const falling = s.vy > 0 && this.syrupY - s.y < AIR.rescueGap;
    if (!this.world.launch(vx, vy, inAir)) return false;
    if (inAir) {
      this.airJumps++;
      if (falling) this.rescue = true;
    } else {
      this.airJumps = 0;
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
      let speed = syrupSpeed((START.y - this.syrupY) / 100);
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
    // Odbicie od galaretki zaczyna nowy lot: skoki w locie znów mają pełną siłę.
    if (result.bounced) {
      this.airJumps = 0;
      this.rescue = false;
    }
    if (result.landed) {
      this.sinceLand = 0;
      const climbed = this.started && s.y < this.launchY - STREAK.minClimb;
      const n = this.airJumps;
      if (n > 0 && this.started && (this.rescue || climbed)) {
        const trick = this.rescue
          ? { kind: 'rescue' as const, jumps: n, reward: Math.min(AIR.maxReward, n + 1) }
          : { kind: 'acrobat' as const, jumps: n, reward: Math.min(AIR.maxReward, n) };
        this.give(trick.reward);
        result.trick = trick;
      }
      this.airJumps = 0;
      this.rescue = false;
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
