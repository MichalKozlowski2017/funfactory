import { Container, Graphics, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { logFact } from '../log.ts';
import { derange, makeShapeBoard, SHAPE_ROUND, type Shape } from '../sim/shapes.ts';
import { state } from '../state.ts';
import { COLORS, draggable, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

const COLOR: Record<Shape, number> = {
  kolo: 0xe8413c,
  kwadrat: 0x3d8bff,
  trojkat: 0xffd23f,
  prostokat: 0x7ad35a,
  gwiazda: 0xff8a2b,
  serce: 0xff8fc0,
  owal: 0x9b5de5,
  romb: 0x2fb8b0,
  ksiezyc: 0xc4cbd8,
  kropla: 0x4fd2f0,
};

/** Sierp księżyca: koło o promieniu 1 bez koła (0.45, 0) o promieniu 0.8, przesunięty do środka pola. */
const MOON: number[] = (() => {
  const d = 0.45, r = 0.8;
  const ix = (1 - r * r + d * d) / (2 * d), iy = Math.sqrt(1 - ix * ix);
  const a0 = Math.atan2(iy, ix), b0 = Math.atan2(iy, ix - d);
  const pts: number[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((2 * Math.PI - 2 * a0) * i) / n;
    pts.push(Math.cos(a), Math.sin(a));
  }
  for (let i = 1; i < n; i++) {
    const b = 2 * Math.PI - b0 - ((2 * Math.PI - 2 * b0) * i) / n;
    pts.push(d + Math.cos(b) * r, Math.sin(b) * r);
  }
  return pts.map((v, i) => (i % 2 === 0 ? v + 0.19 : v));
})();

/** Rysuje kształt o rozmiarze `s` (środek w 0,0). */
export function drawShape(g: Graphics, shape: Shape, s: number): Graphics {
  const h = s / 2;
  switch (shape) {
    case 'kolo':
      return g.circle(0, 0, h);
    case 'kwadrat':
      return g.roundRect(-h * 0.9, -h * 0.9, s * 0.9, s * 0.9, s * 0.08);
    case 'trojkat':
      return g.poly([0, -h, h, h * 0.8, -h, h * 0.8]);
    case 'prostokat':
      return g.roundRect(-h, -h * 0.55, s, s * 0.55, s * 0.06);
    case 'gwiazda':
      return g.star(0, s * 0.05, 5, h, h * 0.45);
    case 'serce':
      return g
        .moveTo(0, h * 0.85)
        .bezierCurveTo(-h * 1.25, -h * 0.05, -h * 0.55, -h * 1.05, 0, -h * 0.42)
        .bezierCurveTo(h * 0.55, -h * 1.05, h * 1.25, -h * 0.05, 0, h * 0.85)
        .closePath();
    case 'owal':
      return g.ellipse(0, 0, h, h * 0.62);
    case 'romb':
      return g.poly([0, -h, h * 0.72, 0, 0, h, -h * 0.72, 0]);
    case 'ksiezyc':
      return g.poly(MOON.map((v) => v * h));
    case 'kropla':
      return g
        .moveTo(0, -h)
        .bezierCurveTo(h * 0.25, -h * 0.55, h * 0.72, -h * 0.1, h * 0.72, h * 0.25)
        .arc(0, h * 0.25, h * 0.72, 0, Math.PI)
        .bezierCurveTo(-h * 0.72, -h * 0.1, -h * 0.25, -h * 0.55, 0, -h)
        .closePath();
  }
}

interface Piece {
  shape: Shape;
  view: Container;
  hole: Container;
  home: { x: number; y: number };
  done: boolean;
  /** Klocek był już wkładany w złą dziurkę (do dziennika rodzica). */
  missed?: boolean;
}

/**
 * Sorter kształtów (Warsztat Bazyla): drewniana deska z dziurkami, pod nią kolorowe klocki.
 * Klocek upuszczony nad swoją dziurką wskakuje i Bazyl mówi nazwę kształtu; nad cudzą wraca.
 */
export class ShapeScene extends RoundScene {
  readonly id = 'shapes';
  private boards: Shape[][] = [];
  private pieces: Piece[] = [];
  private readonly deck = new Graphics();
  private size = 120;
  private dragging = false;

  constructor() {
    super('ksztalty', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels.ksztalty ?? 0;
    this.boards = Array.from({ length: SHAPE_ROUND }, () => makeShapeBoard(this.game.rng, level));
    this.length = this.boards.length;
  }

  protected promptLine(): string {
    return 'ksztalty';
  }

  protected show(): void {
    const deck = new Graphics();
    deck.label = 'deck';
    deck.eventMode = 'none';
    this.layer.addChild(deck);
    const shapes = this.boards[this.index]!;
    const holes = shapes.map(() => {
      const hole = new Container();
      hole.addChild(new Graphics());
      hole.eventMode = 'none';
      this.layer.addChild(hole);
      return hole;
    });
    // Klocki w innej kolejności niż dziurki.
    const order = derange(this.game.rng, shapes.length);
    this.pieces = order.map((i) => {
      const shape = shapes[i]!;
      const view = new Container();
      view.addChild(new Graphics());
      const piece: Piece = { shape, view, hole: holes[i]!, home: { x: 0, y: 0 }, done: false };
      draggable(view, {
        tap: () => this.tapHint(),
        canStart: () => !piece.done && !this.busy && !this.dragging,
        start: () => {
          this.tweens.killOf(view);
          this.dragging = true;
          this.idle = 0;
          this.tweens.killOf(view.scale);
          this.tweens.to(view.scale, { x: 1.08, y: 1.08 }, { duration: 0.1 });
          sfx.pop(this.game.sound, 1.2);
        },
        drop: (at) => this.drop(piece, at),
      });
      this.layer.addChild(view);
      return piece;
    });
    this.timers.after(0.4, () => say(this.game, this.guide, 'ksztalty'));
  }

  protected override appear(): void {
    this.pieces.forEach((p, i) => {
      void popIn(this.tweens, p.view, 0.35, 0.2 + i * 0.07);
      this.timers.after(0.2 + i * 0.07, () => sfx.pop(this.game.sound, 0.9 + i * 0.06));
    });
  }

  private drop(p: Piece, at: Point): void {
    this.dragging = false;
    const near = (h: Container) => Math.hypot(at.x - h.x, at.y - h.y) < this.size * 0.55;
    if (near(p.hole)) return this.fit(p);
    const wrong = this.pieces.find((o) => o !== p && !o.done && near(o.hole));
    if (wrong) {
      // Nie pasuje: klocek podskakuje nad dziurką i wraca.
      void squash(this.tweens, p.view, 0.2);
      p.missed = true;
      this.missed();
    }
    this.tweens.to(p.view, { x: p.home.x, y: p.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(p.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  /** Klocek wskakuje do dziurki: przysiad, „klik”, nazwa kształtu. */
  private fit(p: Piece): void {
    p.done = true;
    logFact(`ksztalt:${p.shape}`, !p.missed);
    p.view.eventMode = 'none';
    this.tweens.to(p.view, { x: p.hole.x, y: p.hole.y }, { duration: 0.12, ease: 'quadOut' });
    void this.tweens.to(p.view.scale, { x: 0.92, y: 0.92 }, { duration: 0.12 }).done.then(() => void squash(this.tweens, p.view, 0.15));
    haptics.hit();
    sfx.plop(this.game.sound);
    this.burst(p.hole.x, p.hole.y, 18);
    const len = say(this.game, this.guide, `ksztalt-${p.shape}`);
    if (this.pieces.every((x) => x.done)) {
      this.timers.after(0.3, () => void pulse(this.tweens, this.layer, 0.04, 0.3));
      this.solved(len);
    }
  }

  /** Playtest: wszystkie klocki na miejsca. */
  solve(): void {
    for (const p of this.pieces) if (!p.done) this.fit(p);
  }

  /** Podpowiedź: klocek podjeżdża w stronę swojej dziurki. */
  protected override gesture(): Gesture | null {
    const p = this.pieces.find((x) => !x.done);
    return p ? { kind: 'drag', from: this.spot(p.view), to: this.spot(p.hole) } : null;
  }

  protected hint(): void {
    const p = this.pieces.find((x) => !x.done);
    if (!p) return;
    // Chwycenie elementu przerywa podpowiedź; wtedy nie cofamy go na start (dziecko mogło go już położyć).
    const tw = this.tweens
      .to(p.view, { x: p.home.x + (p.hole.x - p.home.x) * 0.4, y: p.home.y + (p.hole.y - p.home.y) * 0.4 }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 });
    void tw.done.then(() => !tw.killed && p.view.position.set(p.home.x, p.home.y));
  }

  protected place(): void {
    if (!this.pieces.length) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const n = this.pieces.length;
    this.size = Math.min(140, (right - left) / (n + 0.6));
    const s = this.size;
    const cx = (left + right) / 2;
    // Deska z dziurkami u góry.
    const deckW = n * s * 1.35 + 40;
    const deckY = safe.top + 120 + s * 0.75;
    const deck = this.layer.children.find((c) => c.label === 'deck') as Graphics;
    deck
      .clear()
      .roundRect(cx - deckW / 2, deckY - s * 0.85 + 10, deckW, s * 1.7, 30)
      .fill({ color: 0x000000, alpha: 0.14 })
      .roundRect(cx - deckW / 2, deckY - s * 0.85, deckW, s * 1.7, 30)
      .fill({ color: 0xd9a066 })
      .stroke({ color: COLORS.ink, width: 6 });
    const holeViews = this.pieces.map((p) => p.hole).sort((a, b) => this.layer.getChildIndex(a) - this.layer.getChildIndex(b));
    holeViews.forEach((hole, i) => {
      hole.position.set(cx + (i - (n - 1) / 2) * s * 1.35, deckY);
      const shape = this.pieces.find((p) => p.hole === hole)!.shape;
      drawShape((hole.children[0] as Graphics).clear(), shape, s * 0.98)
        .fill({ color: 0x6b4423 })
        .stroke({ color: 0x4a2e17, width: 5 });
    });
    // Klocki na dole.
    this.pieces.forEach((p, i) => {
      p.home = { x: cx + (i - (n - 1) / 2) * s * 1.35, y: h - s * 0.75 - 20 };
      if (!p.done) p.view.position.set(p.home.x, p.home.y);
      else p.view.position.set(p.hole.x, p.hole.y);
      const g = (p.view.children[0] as Graphics).clear();
      drawShape(g, p.shape, s * 0.94).fill({ color: COLOR[p.shape] }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
      // Odblask (plastelina), przycięty maską do kształtu klocka (bez maski wystawał poza romb, gwiazdę, trójkąt).
      let shine = p.view.getChildByLabel('shine') as Graphics | null;
      let mask = p.view.getChildByLabel('shine-mask') as Graphics | null;
      if (!shine || !mask) {
        shine = new Graphics();
        shine.label = 'shine';
        mask = new Graphics();
        mask.label = 'shine-mask';
        p.view.addChild(shine, mask);
        shine.mask = mask;
      }
      drawShape(mask.clear(), p.shape, s * 0.94 - 10).fill({ color: 0xffffff });
      shine.clear().ellipse(-s * 0.12, -s * 0.16, s * 0.14, s * 0.08).fill({ color: 0xffffff, alpha: 0.35 });
      p.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= s / 2 + 10 && Math.abs(y) <= s / 2 + 10 };
    });
  }
}
