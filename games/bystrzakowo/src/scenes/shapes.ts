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
  circle: 0xe8413c,
  square: 0x3d8bff,
  triangle: 0xffd23f,
  rectangle: 0x7ad35a,
  star: 0xff8a2b,
  heart: 0xff8fc0,
  oval: 0x9b5de5,
  rhombus: 0x2fb8b0,
  moon: 0xc4cbd8,
  drop: 0x4fd2f0,
};

/** Crescent moon: a circle of radius 1 minus the circle at (0.45, 0) of radius 0.8, shifted to the center of the box. */
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

/** Draws a shape of size `s` (centered at 0,0). */
export function drawShape(g: Graphics, shape: Shape, s: number): Graphics {
  const h = s / 2;
  switch (shape) {
    case 'circle':
      return g.circle(0, 0, h);
    case 'square':
      return g.roundRect(-h * 0.9, -h * 0.9, s * 0.9, s * 0.9, s * 0.08);
    case 'triangle':
      return g.poly([0, -h, h, h * 0.8, -h, h * 0.8]);
    case 'rectangle':
      return g.roundRect(-h, -h * 0.55, s, s * 0.55, s * 0.06);
    case 'star':
      return g.star(0, s * 0.05, 5, h, h * 0.45);
    case 'heart':
      return g
        .moveTo(0, h * 0.85)
        .bezierCurveTo(-h * 1.25, -h * 0.05, -h * 0.55, -h * 1.05, 0, -h * 0.42)
        .bezierCurveTo(h * 0.55, -h * 1.05, h * 1.25, -h * 0.05, 0, h * 0.85)
        .closePath();
    case 'oval':
      return g.ellipse(0, 0, h, h * 0.62);
    case 'rhombus':
      return g.poly([0, -h, h * 0.72, 0, 0, h, -h * 0.72, 0]);
    case 'moon':
      return g.poly(MOON.map((v) => v * h));
    case 'drop':
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
  /** The block has already been put into a wrong hole (for the parent journal). */
  missed?: boolean;
}

/**
 * Shape sorter (Basil's Workshop): a wooden board with holes, colorful blocks below it.
 * A block dropped over its own hole pops in and Basil says the shape's name; over another hole it goes back.
 */
export class ShapeScene extends RoundScene {
  readonly id = 'shapes';
  private boards: Shape[][] = [];
  private pieces: Piece[] = [];
  private readonly deck = new Graphics();
  private size = 120;
  private dragging = false;

  constructor() {
    super('shapes', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels.shapes ?? 0;
    this.boards = Array.from({ length: SHAPE_ROUND }, () => makeShapeBoard(this.game.rng, level));
    this.length = this.boards.length;
  }

  protected promptLine(): string {
    return 'shapes';
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
    // Blocks in a different order than the holes.
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
    this.timers.after(0.4, () => say(this.game, this.guide, 'shapes'));
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
      // Doesn't fit: the block bounces over the hole and goes back.
      void squash(this.tweens, p.view, 0.2);
      p.missed = true;
      this.missed();
    }
    this.tweens.to(p.view, { x: p.home.x, y: p.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(p.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  /** The block pops into the hole: squash, "click", shape name. */
  private fit(p: Piece): void {
    p.done = true;
    logFact(`shape:${p.shape}`, !p.missed);
    p.view.eventMode = 'none';
    this.tweens.to(p.view, { x: p.hole.x, y: p.hole.y }, { duration: 0.12, ease: 'quadOut' });
    void this.tweens.to(p.view.scale, { x: 0.92, y: 0.92 }, { duration: 0.12 }).done.then(() => void squash(this.tweens, p.view, 0.15));
    haptics.hit();
    sfx.plop(this.game.sound);
    this.burst(p.hole.x, p.hole.y, 18);
    const len = say(this.game, this.guide, `shape-${p.shape}`);
    if (this.pieces.every((x) => x.done)) {
      this.timers.after(0.3, () => void pulse(this.tweens, this.layer, 0.04, 0.3));
      this.solved(len);
    }
  }

  /** Playtest: all blocks into place. */
  solve(): void {
    for (const p of this.pieces) if (!p.done) this.fit(p);
  }

  /** Hint: a block slides toward its hole. */
  protected override gesture(): Gesture | null {
    const p = this.pieces.find((x) => !x.done);
    return p ? { kind: 'drag', from: this.spot(p.view), to: this.spot(p.hole) } : null;
  }

  protected hint(): void {
    const p = this.pieces.find((x) => !x.done);
    if (!p) return;
    // Grabbing the item interrupts the hint; then we don't move it back to the start (the child may have placed it already).
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
    // Board with holes at the top.
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
    // Blocks at the bottom.
    this.pieces.forEach((p, i) => {
      p.home = { x: cx + (i - (n - 1) / 2) * s * 1.35, y: h - s * 0.75 - 20 };
      if (!p.done) p.view.position.set(p.home.x, p.home.y);
      else p.view.position.set(p.hole.x, p.hole.y);
      const g = (p.view.children[0] as Graphics).clear();
      drawShape(g, p.shape, s * 0.94).fill({ color: COLOR[p.shape] }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
      // Highlight (plasticine look), clipped by a mask to the block's shape (without the mask it stuck out of the rhombus, star, triangle).
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
