/**
 * Fizyka Gluta: slime to koło, świat to prostokąty. Bez Pixi, żeby dało się testować.
 * Układ: x w prawo (0..720 to szerokość studni), y w dół (wspinaczka = coraz mniejsze y).
 */

export type Surface = 'sticky' | 'ice' | 'spikes';

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  surface: Surface;
}

export type SlimeState = 'stuck' | 'flying' | 'dead';

export const PHYS = {
  radius: 34,
  gravity: 2600,
  /** Przeciągnięcie (w jednostkach), przy którym strzał ma pełną siłę. */
  maxDrag: 300,
  /** Krótsze przeciągnięcie anuluje strzał. */
  minDrag: 30,
  /** Prędkość strzału przy pełnej sile. Daje ok. 1150 jednostek wysokości w pionie. */
  maxSpeed: 2450,
  minSpeed: 500,
  /** Zjeżdżanie po lodzie (jednostki/s). */
  iceSlide: 150,
} as const;

export interface Contact {
  nx: number;
  ny: number;
  depth: number;
}

/** Kontakt koła z prostokątem: normalna od prostokąta do środka koła i głębokość wejścia. */
export function contact(cx: number, cy: number, r: number, b: Block): Contact | null {
  const px = Math.max(b.x, Math.min(cx, b.x + b.w));
  const py = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - px;
  const dy = cy - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, depth: r - d };
  }
  // Środek koła w środku prostokąta: wypychamy najkrótszą drogą.
  const left = cx - b.x;
  const right = b.x + b.w - cx;
  const top = cy - b.y;
  const bottom = b.y + b.h - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { nx: -1, ny: 0, depth: left + r };
  if (m === right) return { nx: 1, ny: 0, depth: right + r };
  if (m === top) return { nx: 0, ny: -1, depth: top + r };
  return { nx: 0, ny: 1, depth: bottom + r };
}

/** Wektor przeciągnięcia (koniec - początek) -> prędkość strzału. Proca: strzał w przeciwną stronę. */
export function launchVelocity(dragX: number, dragY: number): { vx: number; vy: number; power: number } | null {
  const len = Math.hypot(dragX, dragY);
  if (len < PHYS.minDrag) return null;
  const power = Math.min(len, PHYS.maxDrag) / PHYS.maxDrag;
  const speed = PHYS.minSpeed + (PHYS.maxSpeed - PHYS.minSpeed) * power;
  return { vx: (-dragX / len) * speed, vy: (-dragY / len) * speed, power };
}

export interface LandEvent {
  speed: number;
  nx: number;
  ny: number;
  surface: Surface;
  x: number;
  y: number;
}

export interface StepResult {
  landed?: LandEvent;
  died?: boolean;
  /** Zsunął się z krawędzi lodu i spada. */
  slipped?: boolean;
}

export class Slime {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  readonly r = PHYS.radius;
  state: SlimeState = 'stuck';
  /** Normalna powierzchni, do której slime jest przyklejony. */
  nx = 0;
  ny = -1;
  stuckTo: Block | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class World {
  readonly slime: Slime;
  blocks: Block[];

  constructor(blocks: Block[], start: { x: number; y: number }) {
    this.blocks = blocks;
    this.slime = new Slime(start.x, start.y);
    this.settle();
  }

  /** Ustawia slime'a na najbliższej powierzchni pod nim (start, respawn). */
  settle(): void {
    const s = this.slime;
    s.state = 'flying';
    s.vx = 0;
    s.vy = 0;
    for (let i = 0; i < 600 && s.state === 'flying'; i++) this.step(1 / 60);
  }

  launch(vx: number, vy: number): boolean {
    const s = this.slime;
    if (s.state !== 'stuck') return false;
    s.state = 'flying';
    s.vx = vx;
    s.vy = vy;
    s.stuckTo = null;
    return true;
  }

  step(dt: number): StepResult {
    const s = this.slime;
    if (s.state === 'dead') return {};
    if (s.state === 'stuck') return this.stepStuck(dt);
    return this.stepFlying(s, dt);
  }

  /** Tor lotu dla podglądu celowania: punkty co `every` kroków aż do pierwszego kontaktu. */
  predict(vx: number, vy: number, maxSteps = 80, every = 3): { x: number; y: number }[] {
    const ghost = new Slime(this.slime.x, this.slime.y);
    ghost.state = 'flying';
    ghost.vx = vx;
    ghost.vy = vy;
    const points: { x: number; y: number }[] = [];
    for (let i = 1; i <= maxSteps; i++) {
      const result = this.stepFlying(ghost, 1 / 60, true);
      if (result.landed || result.died) {
        points.push({ x: ghost.x, y: ghost.y });
        break;
      }
      if (i % every === 0) points.push({ x: ghost.x, y: ghost.y });
    }
    return points;
  }

  private stepFlying(s: Slime, dt: number, dry = false): StepResult {
    const speed = Math.hypot(s.vx, s.vy + PHYS.gravity * dt);
    // Podkroki: nigdy więcej niż pół promienia na krok, więc slime nie przeleci przez ścianę.
    const n = Math.max(1, Math.ceil((speed * dt) / (s.r * 0.5)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      s.vy += PHYS.gravity * h;
      s.x += s.vx * h;
      s.y += s.vy * h;
      for (const b of this.blocks) {
        const c = contact(s.x, s.y, s.r, b);
        if (!c) continue;
        if (b.surface === 'spikes') {
          if (!dry) this.kill();
          return { died: true };
        }
        s.x += c.nx * c.depth;
        s.y += c.ny * c.depth;
        const into = s.vx * c.nx + s.vy * c.ny;
        if (into >= 0) continue; // oddala się od powierzchni (np. tuż po strzale)
        if (b.surface === 'ice' && c.ny > 0.5) {
          // Lodowy sufit: nie trzyma, tylko zatrzymuje ruch w górę.
          s.vx -= into * c.nx;
          s.vy -= into * c.ny;
          continue;
        }
        const hit = Math.hypot(s.vx, s.vy);
        s.state = 'stuck';
        s.vx = 0;
        s.vy = 0;
        s.nx = c.nx;
        s.ny = c.ny;
        s.stuckTo = b;
        return { landed: { speed: hit, nx: c.nx, ny: c.ny, surface: b.surface, x: s.x, y: s.y } };
      }
    }
    return {};
  }

  private stepStuck(dt: number): StepResult {
    const s = this.slime;
    const b = s.stuckTo;
    if (!b || b.surface !== 'ice' || s.ny < -0.5) return {};
    // Lód na ścianie: powolne zjeżdżanie w dół.
    s.y += PHYS.iceSlide * dt;
    for (const other of this.blocks) {
      if (other === b) continue;
      const c = contact(s.x, s.y, s.r, other);
      if (!c) continue;
      if (other.surface === 'spikes') {
        this.kill();
        return { died: true };
      }
      // Zjechał na inną powierzchnię: przykleja się do niej.
      s.x += c.nx * c.depth;
      s.y += c.ny * c.depth;
      s.nx = c.nx;
      s.ny = c.ny;
      s.stuckTo = other;
      return { landed: { speed: PHYS.iceSlide, nx: c.nx, ny: c.ny, surface: other.surface, x: s.x, y: s.y } };
    }
    if (!contact(s.x, s.y, s.r + 2, b)) {
      s.state = 'flying';
      s.vx = 0;
      s.vy = PHYS.iceSlide;
      s.stuckTo = null;
      return { slipped: true };
    }
    return {};
  }

  private kill(): void {
    const s = this.slime;
    s.state = 'dead';
    s.vx = 0;
    s.vy = 0;
    s.stuckTo = null;
  }
}
