import { Rng } from '@funfactory/core';
import {
  BOND,
  CLASSES,
  ENEMIES,
  GATE_HP,
  LEVEL,
  NAMES,
  REST_HEAL,
  TRAITS,
  WAVES,
  WOUNDS,
  type ClassId,
  type EnemyId,
  type Trait,
} from './data.ts';
import { firstMap, type MapDef, type Point } from './map.ts';

export interface Defender {
  id: number;
  name: string;
  cls: ClassId;
  trait: Trait;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  /** Stanowisko albo null (ławka). */
  slot: number | null;
  alive: boolean;
  /** Powalony w tej fali (ranny, nie walczy do końca fali). */
  down: boolean;
  wounds: number;
  cooldown: number;
  kills: number;
  /** Stan po śmierci towarzysza. */
  mood: 'grief' | 'rage' | null;
  /** Imię towarzysza, po którym mood. */
  mourns: string | null;
}

export interface Enemy {
  id: number;
  kind: EnemyId;
  hp: number;
  maxHp: number;
  /** Odległość wzdłuż drogi. */
  d: number;
  x: number;
  y: number;
  blockedBy: number | null;
  rangedCd: number;
  alive: boolean;
}

export type Phase = 'plan' | 'wave' | 'reward' | 'won' | 'lost';

export type RewardKind = 'recruit' | 'train' | 'sharpen' | 'palisade' | 'potion';

export interface Reward {
  kind: RewardKind;
  cls?: ClassId;
  title: string;
  text: string;
}

/** Zdarzenia z jednego kroku (dla widoku: strzały, trafienia, efekty). */
export interface Events {
  shots: { from: Point; to: Point; kind: 'arrow' | 'bolt' | 'slash' | 'heal' | 'curse' }[];
  enemyDied: Enemy[];
  defenderFell: Defender[];
  knockedOut: Defender[];
  levelUp: Defender[];
  gateHit: number;
  moods: Defender[];
}

export interface WaveSummary {
  bondUps: { a: Defender; b: Defender; level: number; name: string }[];
}

export const MAX_PARTY = 8;

const emptyEvents = (): Events => ({ shots: [], enemyDied: [], defenderFell: [], knockedOut: [], levelUp: [], gateHit: 0, moods: [] });

/** Maks. życie z poziomu, ran i premii z mikstur. */
export function maxHpOf(d: Defender, bonus = 1): number {
  return Math.round(CLASSES[d.cls].hp * (1 + LEVEL.hp * (d.level - 1)) * (1 - WOUNDS.hpPenalty * d.wounds) * bonus);
}

export const bondKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Poziom więzi (0 = brak) dla liczby punktów. */
export const bondLevel = (points: number): number => {
  let level = 0;
  BOND.levels.forEach((l, i) => {
    if (points >= l.at) level = i + 1;
  });
  return level;
};

/**
 * Jeden bieg Ostatniej Bramy (prototyp: jedna noc, 6 fal z bossem).
 * Fazy: plan (ustawianie) → wave (walka) → reward (wybór nagrody) → plan … → won / lost.
 */
export class Run {
  readonly rng: Rng;
  readonly map: MapDef;
  phase: Phase = 'plan';
  wave = 0;
  gate = GATE_HP;
  party: Defender[] = [];
  enemies: Enemy[] = [];
  bonds = new Map<string, number>();
  rewards: Reward[] = [];
  /** Premia drużynowa z nagród „ostrzenie”. */
  sharpen = 0;
  /** Mnożniki maks. życia z mikstur (per obrońca). */
  private readonly potions = new Map<number, number>();
  lastSummary: WaveSummary | null = null;
  private queue: { kind: EnemyId; delay: number }[] = [];
  private spawnIn = 0;
  private nextId = 1;
  private names: string[];
  /** Punkt na drodze, w którym rycerz na danym stanowisku zatrzymuje wrogów. */
  private readonly blockAt = new Map<number, number>();

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.map = firstMap();
    this.names = this.rng.shuffle([...NAMES]);
    for (const slot of this.map.slots) {
      const p = this.map.path.project(slot);
      if (p.dist <= CLASSES.knight.range) this.blockAt.set(slot.id, p.d);
    }
    for (const cls of ['knight', 'archer', 'mage', 'priestess'] as ClassId[]) this.recruit(cls);
  }

  // --- drużyna ---

  recruit(cls: ClassId): Defender | null {
    if (this.party.filter((d) => d.alive).length >= MAX_PARTY) return null;
    const def = CLASSES[cls];
    const d: Defender = {
      id: this.nextId++,
      name: this.names.pop() ?? `Najemnik ${this.nextId}`,
      cls,
      trait: this.rng.chance(0.5) ? 'faithful' : 'wrathful',
      level: 1,
      xp: 0,
      hp: def.hp,
      maxHp: def.hp,
      slot: null,
      alive: true,
      down: false,
      wounds: 0,
      cooldown: 0,
      kills: 0,
      mood: null,
      mourns: null,
    };
    this.party.push(d);
    return d;
  }

  defender(id: number): Defender | undefined {
    return this.party.find((d) => d.id === id);
  }

  at(slot: number): Defender | undefined {
    return this.party.find((d) => d.alive && d.slot === slot);
  }

  /** Czy obrońca walczy (żyje, stoi na stanowisku, nie jest powalony). */
  fighting(d: Defender): boolean {
    return d.alive && !d.down && d.slot !== null;
  }

  /** Czy rycerz na tym stanowisku może blokować drogę. */
  canBlock(slot: number): boolean {
    return this.blockAt.has(slot);
  }

  /** Przestawienie obrońcy (tylko w fazie planu). Zajęte stanowisko = zamiana miejscami. */
  place(id: number, slot: number | null): boolean {
    if (this.phase !== 'plan') return false;
    const d = this.defender(id);
    if (!d || !d.alive) return false;
    if (slot !== null) {
      const other = this.at(slot);
      if (other && other !== d) other.slot = d.slot;
    }
    d.slot = slot;
    return true;
  }

  neighborsOf(d: Defender): Defender[] {
    if (d.slot === null) return [];
    const slot = this.map.slots[d.slot];
    return (slot?.neighbors ?? []).map((s) => this.at(s)).filter((x): x is Defender => !!x);
  }

  bondPoints(a: Defender, b: Defender): number {
    return this.bonds.get(bondKey(a.id, b.id)) ?? 0;
  }

  /** Mnożnik obrażeń: poziom, najsilniejsza aktywna więź, nastrój, nagrody. */
  damageMult(d: Defender): number {
    let bond = 0;
    for (const n of this.neighborsOf(d)) {
      const level = bondLevel(this.bondPoints(d, n));
      if (level > 0) bond = Math.max(bond, BOND.levels[level - 1]?.damage ?? 0);
    }
    const mood = d.mood === 'grief' ? BOND.grief.damage : d.mood === 'rage' ? BOND.rage.damage : 0;
    return (1 + LEVEL.damage * (d.level - 1)) * (1 + bond) * (1 + mood) * (1 + this.sharpen);
  }

  slotPos(d: Defender): Point {
    const s = d.slot === null ? undefined : this.map.slots[d.slot];
    return s ? { x: s.x, y: s.y } : { x: -999, y: -999 };
  }

  // --- fale ---

  startWave(): boolean {
    if (this.phase !== 'plan') return false;
    const wave = WAVES[this.wave];
    if (!wave) return false;
    this.queue = [];
    for (const [kind, count, gap] of wave) for (let i = 0; i < count; i++) this.queue.push({ kind, delay: gap });
    this.spawnIn = 0.5;
    this.phase = 'wave';
    for (const d of this.party) d.cooldown = this.rng.range(0, 0.4);
    this.lastSummary = null;
    return true;
  }

  step(dt: number): Events {
    const ev = emptyEvents();
    if (this.phase !== 'wave') return ev;
    this.spawn(dt);
    this.moveEnemies(dt, ev);
    this.defendersAct(dt, ev);
    this.enemiesAct(dt, ev);
    this.cleanup(ev);
    if (this.gate <= 0) {
      this.gate = 0;
      this.phase = 'lost';
    } else if (this.queue.length === 0 && this.enemies.length === 0) {
      this.endWave();
    }
    return ev;
  }

  private spawn(dt: number): void {
    this.spawnIn -= dt;
    while (this.spawnIn <= 0 && this.queue.length) {
      const next = this.queue.shift();
      if (!next) break;
      const def = ENEMIES[next.kind];
      const start = this.map.path.at(0);
      this.enemies.push({
        id: this.nextId++,
        kind: next.kind,
        hp: def.hp,
        maxHp: def.hp,
        d: 0,
        x: start.x,
        y: start.y,
        blockedBy: null,
        rangedCd: def.rangedCooldown * this.rng.range(0.5, 1),
        alive: true,
      });
      this.spawnIn += next.delay;
    }
  }

  private moveEnemies(dt: number, ev: Events): void {
    const knights = this.party.filter((d) => this.fighting(d) && d.cls === 'knight' && this.blockAt.has(d.slot as number));
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.blockedBy !== null) {
        const k = this.defender(e.blockedBy);
        if (k && this.fighting(k)) continue;
        e.blockedBy = null;
      }
      const next = e.d + ENEMIES[e.kind].speed * dt;
      // Rycerz zatrzymuje wroga w swoim punkcie drogi, jeśli ma wolne „ręce”.
      for (const k of knights) {
        const at = this.blockAt.get(k.slot as number) as number;
        if (e.d <= at && next >= at && this.blocking(k) < CLASSES.knight.blocks) {
          e.blockedBy = k.id;
          e.d = at;
          break;
        }
      }
      if (e.blockedBy === null) e.d = next;
      const p = this.map.path.at(e.d);
      e.x = p.x;
      e.y = p.y;
      if (e.d >= this.map.path.length) {
        e.alive = false;
        this.gate -= ENEMIES[e.kind].gateDamage;
        ev.gateHit += ENEMIES[e.kind].gateDamage;
      }
    }
  }

  private blocking(k: Defender): number {
    return this.enemies.filter((e) => e.alive && e.blockedBy === k.id).length;
  }

  private defendersAct(dt: number, ev: Events): void {
    for (const d of this.party) {
      if (!this.fighting(d)) continue;
      const def = CLASSES[d.cls];
      const cdMult = d.mood === 'rage' ? 1 + BOND.rage.cooldown : 1;
      d.cooldown -= dt;
      if (d.cooldown > 0) continue;
      const from = this.slotPos(d);

      if (d.cls === 'priestess') {
        // Kapłanka leczy siebie i sąsiadów: jej miejsce w szyku ma znaczenie.
        const wounded = [d, ...this.neighborsOf(d)]
          .filter((x) => !x.down && x.hp < x.maxHp)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (wounded) {
          const amount = def.heal * (1 + LEVEL.damage * (d.level - 1));
          wounded.hp = Math.min(wounded.maxHp, wounded.hp + amount);
          ev.shots.push({ from, to: this.slotPos(wounded), kind: 'heal' });
          d.cooldown = def.cooldown * cdMult;
        }
        continue;
      }

      const inRange = this.enemies.filter((e) => e.alive && dist(e, from) <= def.range + ENEMIES[e.kind].radius);
      if (!inRange.length) continue;
      let target: Enemy | undefined;
      if (d.cls === 'knight') {
        target = inRange.find((e) => e.blockedBy === d.id) ?? inRange.sort((a, b) => dist(a, from) - dist(b, from))[0];
      } else {
        // Strzelcy celują w tego, kto jest najbliżej bramy.
        target = inRange.sort((a, b) => b.d - a.d)[0];
      }
      if (!target) continue;
      const damage = def.damage * this.damageMult(d);
      const hits = def.splash > 0 ? this.enemies.filter((e) => e.alive && dist(e, target) <= def.splash) : [target];
      for (const e of hits) this.hurtEnemy(e, damage, d, ev);
      ev.shots.push({ from, to: { x: target.x, y: target.y }, kind: d.cls === 'archer' ? 'arrow' : d.cls === 'mage' ? 'bolt' : 'slash' });
      d.cooldown = def.cooldown * cdMult;
    }
  }

  private hurtEnemy(e: Enemy, amount: number, by: Defender, ev: Events): void {
    if (!e.alive) return;
    e.hp -= amount;
    if (e.hp > 0) return;
    e.alive = false;
    ev.enemyDied.push(e);
    by.kills++;
    this.gainXp(by, ENEMIES[e.kind].xp, ev);
  }

  private gainXp(d: Defender, xp: number, ev: Events): void {
    d.xp += xp;
    while (d.level < LEVEL.max && d.xp >= LEVEL.xpFor(d.level)) {
      d.xp -= LEVEL.xpFor(d.level);
      d.level++;
      d.maxHp = Math.round(maxHpOf(d) * this.potionBonus(d));
      if (!d.down) d.hp = d.maxHp;
      ev.levelUp.push(d);
    }
  }

  private enemiesAct(dt: number, ev: Events): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const def = ENEMIES[e.kind];
      if (e.blockedBy !== null) {
        const k = this.defender(e.blockedBy);
        if (k) this.hurtDefender(k, def.melee * dt, ev);
      }
      if (def.ranged > 0) {
        e.rangedCd -= dt;
        if (e.rangedCd <= 0) {
          const target = this.party
            .filter((d) => this.fighting(d) && dist(this.slotPos(d), e) <= def.rangedRange)
            .sort((a, b) => dist(this.slotPos(a), e) - dist(this.slotPos(b), e))[0];
          if (target) {
            this.hurtDefender(target, def.ranged, ev);
            ev.shots.push({ from: { x: e.x, y: e.y }, to: this.slotPos(target), kind: 'curse' });
            e.rangedCd = def.rangedCooldown;
          } else {
            e.rangedCd = 0.3;
          }
        }
      }
    }
  }

  private hurtDefender(d: Defender, amount: number, ev: Events): void {
    if (!d.alive || d.down) return;
    d.hp -= amount;
    if (d.hp > 0) return;
    d.hp = 0;
    for (const e of this.enemies) if (e.blockedBy === d.id) e.blockedBy = null;
    if (d.wounds < WOUNDS.max) {
      // Ranny: wypada z tej fali, wróci z blizną.
      d.down = true;
      d.wounds++;
      ev.knockedOut.push(d);
      return;
    }
    d.alive = false;
    ev.defenderFell.push(d);
    // Więzi: towarzysze reagują na śmierć zgodnie z charakterem.
    for (const other of this.party) {
      if (!other.alive || other === d) continue;
      if (bondLevel(this.bondPoints(d, other)) < 1) continue;
      other.mood = other.trait === 'faithful' ? 'grief' : 'rage';
      other.mourns = d.name;
      ev.moods.push(other);
    }
    for (const e of this.enemies) if (e.blockedBy === d.id) e.blockedBy = null;
    d.slot = null;
  }

  private cleanup(ev: Events): void {
    if (ev.enemyDied.length || this.enemies.some((e) => !e.alive)) this.enemies = this.enemies.filter((e) => e.alive);
  }

  private endWave(): void {
    const summary: WaveSummary = { bondUps: [] };
    // Więzi rosną między sąsiadami, którzy razem przetrwali falę.
    const done = new Set<string>();
    for (const d of this.party) {
      if (!d.alive || d.slot === null) continue;
      for (const n of this.neighborsOf(d)) {
        const key = bondKey(d.id, n.id);
        if (done.has(key)) continue;
        done.add(key);
        const before = bondLevel(this.bonds.get(key) ?? 0);
        const points = (this.bonds.get(key) ?? 0) + BOND.perWave;
        this.bonds.set(key, points);
        const after = bondLevel(points);
        if (after > before) summary.bondUps.push({ a: d, b: n, level: after, name: BOND.levels[after - 1]?.name ?? '' });
      }
    }
    for (const d of this.party) {
      if (!d.alive) continue;
      if (d.down) {
        d.down = false;
        d.maxHp = Math.round(maxHpOf(d) * this.potionBonus(d));
        d.hp = Math.round(d.maxHp * WOUNDS.returnHp);
      } else {
        d.hp = Math.min(d.maxHp, d.hp + d.maxHp * REST_HEAL);
      }
    }
    this.lastSummary = summary;
    this.wave++;
    if (this.wave >= WAVES.length) {
      this.phase = 'won';
      return;
    }
    this.rewards = this.rollRewards();
    this.phase = 'reward';
  }

  // --- nagrody ---

  private rollRewards(): Reward[] {
    const alive = this.party.filter((d) => d.alive).length;
    const pool: Reward[] = [];
    const classes = this.rng.shuffle(['archer', 'knight', 'mage', 'priestess'] as ClassId[]);
    if (alive < MAX_PARTY) {
      for (const cls of classes.slice(0, 2)) {
        pool.push({ kind: 'recruit', cls, title: `Rekrut: ${CLASSES[cls].name}`, text: 'Nowy najemnik dołącza do drużyny.' });
      }
    }
    pool.push({ kind: 'train', title: 'Trening', text: 'Najsłabszy obrońca zyskuje 2 poziomy.' });
    pool.push({ kind: 'sharpen', title: 'Ostrzenie broni', text: 'Cała drużyna zadaje +12% obrażeń.' });
    pool.push({ kind: 'palisade', title: 'Palisada', text: 'Brama zyskuje 5 punktów życia.' });
    pool.push({ kind: 'potion', title: 'Mikstury', text: 'Pełne leczenie i +15% maks. życia dla wszystkich.' });
    return this.rng.shuffle(pool).slice(0, 3);
  }

  chooseReward(index: number): boolean {
    if (this.phase !== 'reward') return false;
    const r = this.rewards[index];
    if (!r) return false;
    const alive = this.party.filter((d) => d.alive);
    switch (r.kind) {
      case 'recruit':
        if (r.cls) this.recruit(r.cls);
        break;
      case 'train': {
        const weakest = [...alive].sort((a, b) => a.level - b.level)[0];
        if (weakest) this.gainXp(weakest, LEVEL.xpFor(weakest.level) + LEVEL.xpFor(weakest.level + 1), emptyEvents());
        break;
      }
      case 'sharpen':
        this.sharpen += 0.12;
        break;
      case 'palisade':
        this.gate += 5;
        break;
      case 'potion':
        for (const d of alive) {
          this.potions.set(d.id, this.potionBonus(d) * 1.15);
          d.maxHp = Math.round(maxHpOf(d) * this.potionBonus(d));
          d.hp = d.maxHp;
        }
        break;
    }
    this.rewards = [];
    this.phase = 'plan';
    return true;
  }

  private potionBonus(d: Defender): number {
    return this.potions.get(d.id) ?? 1;
  }

  traitName(d: Defender): string {
    return TRAITS[d.trait].name;
  }
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
