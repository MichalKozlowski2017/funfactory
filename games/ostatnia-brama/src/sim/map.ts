/**
 * Mapa: kręta droga z góry do bramy na dole i stanowiska obrońców wzdłuż niej.
 * Współrzędne w jednostkach gry (szerokość 720). Mapa zajmuje y ~100..1150.
 */

export interface Point {
  x: number;
  y: number;
}

export class Path {
  readonly points: Point[];
  readonly length: number;
  private readonly cumulative: number[];

  constructor(points: Point[]) {
    this.points = points;
    this.cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1] as Point;
      const b = points[i] as Point;
      this.cumulative.push((this.cumulative[i - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cumulative[this.cumulative.length - 1] as number;
  }

  /** Punkt na drodze w odległości `d` od początku. */
  at(d: number): Point {
    const dist = Math.max(0, Math.min(this.length, d));
    let i = 1;
    while (i < this.points.length - 1 && (this.cumulative[i] as number) < dist) i++;
    const a = this.points[i - 1] as Point;
    const b = this.points[i] as Point;
    const seg = (this.cumulative[i] as number) - (this.cumulative[i - 1] as number);
    const t = seg > 0 ? (dist - (this.cumulative[i - 1] as number)) / seg : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /** Najbliższa odległość wzdłuż drogi od punktu (do ustawiania blokad rycerzy). */
  project(p: Point): { d: number; dist: number } {
    let best = { d: 0, dist: Infinity };
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1] as Point;
      const b = this.points[i] as Point;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const len2 = abx * abx + aby * aby;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2)) : 0;
      const cx = a.x + abx * t;
      const cy = a.y + aby * t;
      const dist = Math.hypot(p.x - cx, p.y - cy);
      if (dist < best.dist) best = { d: (this.cumulative[i - 1] as number) + Math.sqrt(len2) * t, dist };
    }
    return best;
  }
}

export interface Slot {
  id: number;
  x: number;
  y: number;
  /** Sąsiednie stanowiska (więzi powstają między sąsiadami). */
  neighbors: number[];
}

export interface MapDef {
  path: Path;
  slots: Slot[];
  gate: Point;
}

/** Odległość, przy której stanowiska są sąsiadami. */
export const NEIGHBOR_DIST = 230;

export function firstMap(): MapDef {
  const path = new Path([
    { x: 600, y: 90 },
    { x: 600, y: 240 },
    { x: 150, y: 330 },
    { x: 150, y: 520 },
    { x: 570, y: 610 },
    { x: 570, y: 800 },
    { x: 160, y: 880 },
    { x: 160, y: 1020 },
    { x: 360, y: 1090 },
    { x: 360, y: 1150 },
  ]);
  // Grupy stanowisk w zakrętach drogi; każde ma sąsiada (więzi), część blokuje drogę (rycerze).
  const raw: Point[] = [
    { x: 470, y: 150 },
    { x: 450, y: 340 },
    { x: 270, y: 420 },
    { x: 50, y: 440 },
    { x: 270, y: 600 },
    { x: 450, y: 700 },
    { x: 665, y: 690 },
    { x: 450, y: 870 },
    { x: 60, y: 960 },
    { x: 260, y: 960 },
    { x: 480, y: 1060 },
  ];
  const slots: Slot[] = raw.map((p, id) => ({ id, ...p, neighbors: [] }));
  for (const a of slots) {
    for (const b of slots) {
      if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) <= NEIGHBOR_DIST) a.neighbors.push(b.id);
    }
  }
  return { path, slots, gate: { x: 360, y: 1150 } };
}
