import { Rng } from '@funfactory/core';
import { contact, type Block, type Surface } from './physics.ts';

export interface Candy {
  id: string;
  x: number;
  y: number;
  taken: boolean;
}

/** Promień cukierka do zbierania (dodawany do promienia slime'a). */
export const CANDY_RADIUS = 30;

export type PowerKind = 'shell' | 'breath' | 'magnet' | 'frost' | 'rocket' | 'glue';

export interface PowerUp {
  id: string;
  kind: PowerKind;
  x: number;
  y: number;
  taken: boolean;
}

/** Promień bańki z power-upem. */
export const POWER_RADIUS = 38;

/**
 * Rozkład baniek: co drugi kawałek (nieparzyste) zawsze ma bańkę, pozostałe z szansą `extra`.
 * Średnio ok. 57%, ale bez długich serii bez power-upów (czysta losowość dawała np. 50 m pustki).
 */
export const POWER_SPAWN = {
  extra: 0.15,
  weights: [
    ['shell', 1],
    ['breath', 1],
    ['magnet', 1],
    ['frost', 0.8],
    ['rocket', 0.6],
    ['glue', 0.8],
  ] as [PowerKind, number][],
};

/** Wymiary studni. Ściany wchodzą w ekran na `wall` jednostek. */
export const SHAFT = { width: 720, wall: 40, chunk: 1200 } as const;

/** Punkt startu slime'a (nad dnem). */
export const START = { x: SHAFT.width / 2, y: -60 } as const;

/** Trudność 0..1 dla numeru kawałka. Pełna trudność po ok. 140 m. */
export const difficulty = (chunk: number): number => Math.min(1, Math.max(0, (chunk - 1) / 11));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Seed kawałka zależy tylko od seedu biegu i numeru, więc kolejność generowania nie ma znaczenia. */
const chunkSeed = (seed: number, chunk: number): number => {
  let h = (seed ^ Math.imul(chunk + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};

/**
 * Jeden kawałek studni: od y = -chunk*CH (dół) do -(chunk+1)*CH (góra).
 *
 * Zasady, które trzymają grę uczciwą:
 * - odstęp między półkami < zasięg strzału (≈1150), więc zawsze da się dosięgnąć następnej,
 * - ściany są poszatkowane na odcinki; im wyżej, tym mniej lukru, a więcej lodu i kolców,
 *   więc wspinaczka po samych ścianach przestaje działać,
 * - pierwsze kawałki nie mają kolców.
 */
export function generateChunk(seed: number, chunk: number): Block[] {
  const rng = new Rng(chunkSeed(seed, chunk));
  const d = difficulty(chunk);
  const CH = SHAFT.chunk;
  const bottom = -chunk * CH;
  const top = bottom - CH;
  const blocks: Block[] = [];
  const add = (x: number, y: number, w: number, h: number, surface: Surface) =>
    blocks.push({ x, y, w, h, surface, chunk });

  if (chunk === 0) add(-200, 0, SHAFT.width + 400, 400, 'sticky');

  // Ściany: odcinki różnej wysokości.
  for (const side of ['L', 'R'] as const) {
    let y = bottom;
    while (y > top) {
      const segTop = Math.max(top, y - rng.range(220, 460));
      let surface: Surface = 'sticky';
      if (chunk > 0) {
        const spikes = chunk >= 3 ? lerp(0.05, 0.22, d) : 0;
        const ice = lerp(0.35, 0.55, d);
        surface = rng.weighted<Surface>([
          ['spikes', spikes],
          ['ice', ice],
          ['sticky', Math.max(0.1, 1 - spikes - ice)],
        ]);
      }
      const x = side === 'L' ? -200 : SHAFT.width - SHAFT.wall;
      add(x, segTop, 200 + SHAFT.wall, y - segTop, surface);
      y = segTop;
    }
  }

  // Półki w slotach o równych odstępach (także na styku kawałków) z losowym przesunięciem.
  const slots = 3;
  const slotH = CH / slots;
  const jitter = lerp(0.1, 0.3, d);
  let side: 'L' | 'R' | 'C' = rng.chance(0.5) ? 'L' : 'R';
  for (let i = 0; i < slots; i++) {
    if (chunk === 0 && i === 0) continue; // dno jest pierwszą „półką”
    const y = bottom - (i + 0.5) * slotH + rng.range(-jitter, jitter) * slotH;
    const w = rng.range(lerp(240, 150, d), lerp(300, 200, d));
    const inner = SHAFT.width - 2 * SHAFT.wall;
    let x: number;
    if (side === 'L') x = SHAFT.wall;
    else if (side === 'R') x = SHAFT.width - SHAFT.wall - w;
    else x = SHAFT.wall + rng.range(inner * 0.2, inner * 0.8 - w);
    const surface: Surface = chunk > 1 && rng.chance(lerp(0.05, 0.3, d)) ? 'ice' : 'sticky';
    add(x, y, w, 36, surface);
    // Bez kolców pod półkami: karały za strzał w górę zza kadru (decyzja po testach na telefonie).
    side = side === 'C' ? (rng.chance(0.5) ? 'L' : 'R') : rng.chance(0.25) ? 'C' : side === 'L' ? 'R' : 'L';
  }
  return blocks;
}

/**
 * Cukierki kawałka: nad półkami (nagroda za lądowanie) i w powietrzu między nimi (nagroda za odważny lot).
 * Osobny strumień losowy, więc zmiany w cukierkach nie zmieniają układu półek.
 */
export function generateCandies(seed: number, chunk: number, blocks: Block[]): Candy[] {
  const rng = new Rng(chunkSeed(seed ^ 0x5eed, chunk));
  const candies: Candy[] = [];
  const free = (x: number, y: number) => blocks.every((b) => !contact(x, y, CANDY_RADIUS + 8, b));
  const put = (x: number, y: number) => {
    if (free(x, y)) candies.push({ id: `${chunk}:${candies.length}`, x, y, taken: false });
  };
  for (const b of blocks) {
    if (b.h !== 36 || b.surface === 'spikes') continue;
    if (!rng.chance(0.6)) continue;
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) put(b.x + ((i + 1) * b.w) / (n + 1), b.y - 70);
  }
  // Łuk cukierków w powietrzu.
  if (chunk > 0 && rng.chance(0.7)) {
    const cx = rng.range(200, SHAFT.width - 200);
    const cy = -chunk * SHAFT.chunk - rng.range(200, SHAFT.chunk - 200);
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - 0.5;
      put(cx + t * 260, cy + t * t * 220 - 40);
    }
  }
  return candies;
}

/**
 * Bańki z power-upami: najwyżej jedna na kawałek, w powietrzu (trzeba po nią skoczyć).
 * Osobny strumień losowy, niezależny od układu półek i cukierków.
 */
export function generatePowerUps(seed: number, chunk: number, blocks: Block[]): PowerUp[] {
  if (chunk < 1) return [];
  const rng = new Rng(chunkSeed(seed ^ 0x90a3, chunk));
  if (chunk % 2 === 0 && !rng.chance(POWER_SPAWN.extra)) return [];
  const kind = rng.weighted(POWER_SPAWN.weights);
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = rng.range(150, SHAFT.width - 150);
    const y = -chunk * SHAFT.chunk - rng.range(150, SHAFT.chunk - 150);
    if (blocks.every((b) => !contact(x, y, POWER_RADIUS + 40, b))) return [{ id: `${chunk}:p`, kind, x, y, taken: false }];
  }
  return [];
}

/**
 * Studnia dogrywana kawałkami w miarę wspinaczki i sprzątana poniżej (tam i tak jest syrop).
 */
export class Shaft {
  readonly chunks = new Map<number, Block[]>();
  readonly candies = new Map<number, Candy[]>();
  readonly powers = new Map<number, PowerUp[]>();
  blocks: Block[] = [];
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** Generuje kawałki aż do wysokości `y` (z zapasem) i usuwa te daleko poniżej `belowY`. Zwraca zmiany. */
  update(y: number, belowY: number): { added: number[]; removed: number[] } {
    const added: number[] = [];
    const removed: number[] = [];
    const wantTop = Math.floor(-y / SHAFT.chunk) + 2;
    for (let k = 0; k <= wantTop; k++) {
      if (this.chunks.has(k)) continue;
      const blocks = generateChunk(this.seed, k);
      this.chunks.set(k, blocks);
      this.candies.set(k, generateCandies(this.seed, k, blocks));
      this.powers.set(k, generatePowerUps(this.seed, k, blocks));
      added.push(k);
    }
    const keepFrom = Math.floor(-belowY / SHAFT.chunk) - 1;
    for (const k of this.chunks.keys()) {
      if (k < keepFrom) {
        this.chunks.delete(k);
        this.candies.delete(k);
        this.powers.delete(k);
        removed.push(k);
      }
    }
    if (added.length || removed.length) this.blocks = [...this.chunks.values()].flat();
    return { added, removed };
  }
}
