import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { COLORS } from './ui.ts';

export interface P {
  x: number;
  y: number;
}

/** Gest do pokazania: stuknięcia (po kolei), przeciągnięcie albo prowadzenie palcem po linii. */
export type Gesture = { kind: 'tap'; at: P[] } | { kind: 'drag'; from: P; to: P } | { kind: 'trace'; path: P[] };

/** Odcinek animacji: ruch z `a` do `b` (albo po `path`), docisk palca i przezroczystość od-do. */
interface Seg {
  d: number;
  a: P;
  b: P;
  path?: P[];
  press: [number, number];
  alpha: [number, number];
  /** Fala w miejscu dotknięcia na początku odcinka. */
  ring?: boolean;
  /** Ślad palca (prowadzenie po linii, przeciąganie). */
  trail?: boolean;
}

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Skąd rączka wjeżdża: z dołu po prawej od pierwszego punktu. */
const ENTRY: P = { x: 90, y: 120 };

/** Punkt na łamanej w ułamku `t` jej długości. */
export function along(path: readonly P[], t: number): P {
  if (path.length === 1) return path[0]!;
  const lens = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
  let left = lens.reduce((s, l) => s + l, 0) * Math.max(0, Math.min(1, t));
  for (const [i, l] of lens.entries()) {
    if (left <= l || i === lens.length - 1) {
      const k = l > 0 ? Math.min(1, left / l) : 1;
      return { x: lerp(path[i]!.x, path[i + 1]!.x, k), y: lerp(path[i]!.y, path[i + 1]!.y, k) };
    }
    left -= l;
  }
  return path[path.length - 1]!;
}

/** Cała pętla animacji dla gestu (czysta funkcja: łatwo sprawdzić w teście). */
export function timeline(g: Gesture): Seg[] {
  const first = g.kind === 'tap' ? g.at[0]! : g.kind === 'drag' ? g.from : g.path[0]!;
  const enter: P = { x: first.x + ENTRY.x, y: first.y + ENTRY.y };
  const s: Seg[] = [
    { d: 0.35, a: enter, b: enter, press: [0, 0], alpha: [0, 1] },
    { d: 0.5, a: enter, b: first, press: [0, 0], alpha: [1, 1] },
  ];
  let last = first;
  if (g.kind === 'tap') {
    for (const [i, p] of g.at.entries()) {
      if (i > 0) s.push({ d: 0.55, a: last, b: p, press: [0, 0], alpha: [1, 1] });
      s.push({ d: 0.14, a: p, b: p, press: [0, 1], alpha: [1, 1], ring: true }, { d: 0.18, a: p, b: p, press: [1, 0], alpha: [1, 1] }, { d: 0.35, a: p, b: p, press: [0, 0], alpha: [1, 1] });
      last = p;
    }
  } else if (g.kind === 'drag') {
    const d = Math.min(1.6, Math.max(0.8, Math.hypot(g.to.x - g.from.x, g.to.y - g.from.y) / 450));
    s.push(
      { d: 0.16, a: g.from, b: g.from, press: [0, 1], alpha: [1, 1], ring: true },
      { d, a: g.from, b: g.to, press: [1, 1], alpha: [1, 1], trail: true },
      { d: 0.18, a: g.to, b: g.to, press: [1, 0], alpha: [1, 1] },
    );
    last = g.to;
  } else {
    const len = g.path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - g.path[i]!.x, p.y - g.path[i]!.y), 0);
    const end = g.path[g.path.length - 1]!;
    s.push(
      { d: 0.16, a: first, b: first, press: [0, 1], alpha: [1, 1], ring: true },
      { d: Math.min(2.6, Math.max(1, len / 380)), a: first, b: end, path: g.path, press: [1, 1], alpha: [1, 1], trail: true },
      { d: 0.18, a: end, b: end, press: [1, 0], alpha: [1, 1] },
    );
    last = end;
  }
  s.push({ d: 0.5, a: last, b: last, press: [0, 0], alpha: [1, 1] }, { d: 0.35, a: last, b: last, press: [0, 0], alpha: [1, 0] }, { d: 0.7, a: last, b: last, press: [0, 0], alpha: [0, 0] });
  return s;
}

/**
 * Rączka z samouczka: pokazuje dziecku gest (dotknij, przeciągnij, prowadź palcem) w pętli,
 * aż dziecko samo dotknie ekranu. Czubek palca jest w punkcie (0, 0) kontenera.
 */
export class Hand extends Container {
  private readonly finger: Container;
  private readonly trail = new Graphics();
  private readonly ring = new Graphics();
  private segs: Seg[] = [];
  private t = 0;
  private ringT = 1;
  private ringAt: P = { x: 0, y: 0 };
  private trailFrom: P | null = null;
  private trailPath: P[] = [];
  private fading = false;
  private fade = 1;

  constructor(texture: Texture | null, size = 150) {
    super();
    this.eventMode = 'none';
    this.finger = new Container();
    if (texture) {
      // Grafika: palec do góry, czubek w HAND_TIP (ułamki wymiarów tekstury).
      const s = new Sprite({ texture, anchor: { x: HAND_TIP.x, y: HAND_TIP.y } });
      s.scale.set(size / texture.height);
      this.finger.addChild(s);
    } else this.finger.addChild(drawnHand(size));
    // Lekko pochylona, jak prawa ręka trzymająca tablet.
    this.finger.rotation = -0.35;
    this.addChild(this.trail, this.ring, this.finger);
    this.visible = false;
  }

  show(g: Gesture): void {
    this.segs = timeline(g);
    this.t = 0;
    this.fading = false;
    this.fade = 1;
    this.alpha = 1;
    this.visible = true;
    this.trail.clear();
    this.trailPath = [];
    this.trailFrom = null;
  }

  /** Wygaszenie (dziecko dotknęło ekranu). */
  stop(): void {
    if (this.visible) this.fading = true;
  }

  get active(): boolean {
    return this.visible && !this.fading;
  }

  update(dt: number): void {
    if (!this.visible) return;
    if (this.fading) {
      this.fade -= dt / 0.25;
      if (this.fade <= 0) {
        this.visible = false;
        return;
      }
    }
    const total = this.segs.reduce((s, x) => s + x.d, 0);
    const prev = this.t;
    this.t = (this.t + dt) % total;
    if (this.t < prev) {
      this.trail.clear();
      this.trailPath = [];
      this.trailFrom = null;
    }
    let at = 0;
    for (const seg of this.segs) {
      if (this.t < at + seg.d) {
        const k = (this.t - at) / seg.d;
        const e = ease(k);
        const p = seg.path ? along(seg.path, e) : { x: lerp(seg.a.x, seg.b.x, e), y: lerp(seg.a.y, seg.b.y, e) };
        this.finger.position.set(p.x, p.y);
        const press = lerp(seg.press[0], seg.press[1], k);
        this.finger.scale.set(1 - 0.14 * press);
        this.alpha = lerp(seg.alpha[0], seg.alpha[1], k) * this.fade;
        if (seg.ring && prev < at) {
          this.ringT = 0;
          this.ringAt = seg.a;
        }
        if (seg.trail) this.drawTrail(seg, p);
        break;
      }
      at += seg.d;
    }
    this.ringT = Math.min(1, this.ringT + dt / 0.5);
    this.ring.clear();
    if (this.ringT < 1) this.ring.circle(this.ringAt.x, this.ringAt.y, 20 + 46 * this.ringT).stroke({ color: 0xffffff, width: 8 * (1 - this.ringT), alpha: 1 - this.ringT });
  }

  private drawTrail(seg: Seg, p: P): void {
    this.trailFrom ??= seg.a;
    this.trailPath.push(p);
    const g = this.trail.clear();
    g.moveTo(this.trailFrom.x, this.trailFrom.y);
    for (const q of this.trailPath) g.lineTo(q.x, q.y);
    g.stroke({ color: COLORS.sun, width: 16, cap: 'round', join: 'round', alpha: 0.75 });
  }
}

/** Czubek palca na grafice rączki (ułamki szerokości i wysokości tekstury). */
export const HAND_TIP = { x: 0.24, y: 0.03 };

/** Zapasowa rączka z kształtów (gdy grafika się nie wczytała). */
function drawnHand(size: number): Graphics {
  const k = size / 150;
  const g = new Graphics();
  g.roundRect(-14 * k, 0, 28 * k, 80 * k, 14 * k).fill({ color: 0xffd9b8 }).stroke({ color: COLORS.ink, width: 5 * k });
  g.roundRect(-30 * k, 55 * k, 76 * k, 75 * k, 30 * k).fill({ color: 0xffd9b8 }).stroke({ color: COLORS.ink, width: 5 * k });
  g.roundRect(-34 * k, 125 * k, 84 * k, 26 * k, 10 * k).fill({ color: 0x8fd0ff }).stroke({ color: COLORS.ink, width: 5 * k });
  return g;
}
