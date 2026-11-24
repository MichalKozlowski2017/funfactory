import { Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Text } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse } from '@funfactory/kit2d';
import { say, shadowNow, shadowOf } from '../assets.ts';
import type { Item } from '../sim/catalog.ts';
import { dotCount, dotsOnEdge, hitsDot, makeDotsRound, type Point } from '../sim/dots.ts';
import { state } from '../state.ts';
import { COLORS, label, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

/** Size of the mask used to compute the outline (pixels). */
const MASK = 96;
const LINE = 0xff7a8a;

interface DotView {
  view: Container;
  ring: Graphics;
  num: Text;
  at: Point;
}

/**
 * Connect the dots (Lusia's Path): dots on the picture's outline, joined with a finger from 1 in order and back
 * to 1. Lusia counts aloud, and once the shape is closed the coloured picture appears.
 * The child can trace with a finger or tap the dots in order.
 */
export class DotsScene extends RoundScene {
  readonly id = 'dots';
  private items: Item[] = [];
  /** Dots of each picture as fractions of the picture (0..1). */
  private shapes: Point[][] = [];
  private points: DotView[] = [];
  // Recreated for every task (the layer is cleared and destroyed between tasks).
  private lines = new Graphics();
  private live = new Graphics();
  private picture: Sprite | null = null;
  private ghost: Sprite | null = null;
  /** How many dots are already joined (0 = dot 1 not touched yet). */
  private done = 0;
  private drawing = false;
  /** Picture area on screen. */
  private box = { x: 0, y: 0, w: 0, h: 0 };

  constructor() {
    super('dots', 'lusia');
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels.dots ?? 0;
    this.items = makeDotsRound(this.game.rng);
    this.length = this.items.length;
    await Promise.all(this.items.map((item) => shadowOf(item.id)));
    this.shapes = this.items.map((item) => dotsOf(this.art.items.get(item.id)!.source.resource as CanvasImageSource & { width: number; height: number }, dotCount(level)));
  }

  protected override roundItems(): string[] {
    return this.items.map((i) => i.id);
  }

  protected promptLine(): string {
    return 'dots';
  }

  protected show(): void {
    const item = this.items[this.index]!;
    this.done = 0;
    this.drawing = false;
    this.lines = new Graphics();
    this.live = new Graphics();
    this.picture = new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 });
    this.picture.visible = false;
    // Faint shadow of the picture: joining the dots reveals a shape the child can recognise.
    this.ghost = shadowNow(item.id) ? new Sprite({ texture: shadowNow(item.id)!, anchor: 0.5 }) : null;
    if (this.ghost) this.ghost.alpha = 0.16;
    // Touch area covering the whole layer: the finger can start anywhere.
    const pad = new Graphics();
    pad.label = 'pad';
    pad.eventMode = 'static';
    pad.on('pointerdown', (e) => this.down(e));
    pad.on('globalpointermove', (e) => this.move(e));
    pad.on('pointerup', () => this.up());
    pad.on('pointerupoutside', () => this.up());
    // Pictures and dots don't catch touch: a finger placed on a dot must hit the touch area.
    for (const v of [this.ghost, this.picture, this.lines, this.live]) if (v) v.eventMode = 'none';
    this.layer.addChild(pad, ...(this.ghost ? [this.ghost] : []), this.picture, this.lines, this.live);
    this.points = this.shapes[this.index]!.map((_, i) => {
      const view = new Container();
      view.eventMode = 'none';
      const ring = new Graphics();
      const num = label(String(i + 1), 42, this.game.pixelRatio, '#ffffff');
      view.addChild(ring, num);
      this.layer.addChild(view);
      return { view, ring, num, at: { x: 0, y: 0 } };
    });
    this.timers.after(0.4, () => say(this.game, this.guide, 'dots'));
  }

  protected override appear(): void {
    this.points.forEach((d, i) => void popIn(this.tweens, d.view, 0.3, i * 0.05));
    this.highlight();
  }

  private local(e: FederatedPointerEvent): Point {
    return this.layer.toLocal(e.global);
  }

  /** Next dot to join (after the last one: back to 1). */
  private get target(): number {
    return this.done % this.points.length;
  }

  private down(e: FederatedPointerEvent): void {
    if (this.busy) return;
    this.idle = 0;
    this.drawing = true;
    const p = this.local(e);
    const before = this.done;
    this.check(p);
    // Tap on a dot other than the next one: the next (green) one pulses to show where to start.
    if (this.done === before && this.points.some((d, i) => i !== this.target && hitsDot(p, d.at, 46))) void pulse(this.tweens, this.points[this.target]!.view, 0.35, 0.4);
  }

  private move(e: FederatedPointerEvent): void {
    if (!this.drawing || this.busy) return;
    const p = this.local(e);
    this.check(p);
    // Rubber band from the last joined dot to the finger.
    this.live.clear();
    if (this.done > 0 && !this.busy) {
      const from = this.points[(this.done - 1) % this.points.length]!.at;
      this.live.moveTo(from.x, from.y).lineTo(p.x, p.y).stroke({ color: LINE, width: 8, alpha: 0.45, cap: 'round' });
    }
  }

  private up(): void {
    this.drawing = false;
    this.live.clear();
  }

  /** Finger on the next dot: join it. */
  private check(p: Point): void {
    const t = this.target;
    const dot = this.points[t]!;
    if (!hitsDot(p, dot.at, 46)) return;
    if (this.done > 0) {
      const from = this.points[(this.done - 1) % this.points.length]!.at;
      this.lines.moveTo(from.x, from.y).lineTo(dot.at.x, dot.at.y).stroke({ color: LINE, width: 10, cap: 'round' });
    }
    this.done++;
    haptics.tap();
    sfx.pop(this.game.sound, 1 + Math.min(this.done, 10) * 0.06);
    void pulse(this.tweens, dot.view, 0.3, 0.25);
    this.burst(dot.at.x, dot.at.y, 8);
    const closed = this.done > this.points.length;
    if (!closed) say(this.game, this.guide, `number-${t + 1}`);
    this.highlight();
    if (closed) this.complete();
  }

  /** Dots: joined ones coloured, the next one green and bigger. */
  private highlight(): void {
    this.points.forEach((d, i) => {
      const next = !this.busy && i === this.target;
      const joined = i < this.done && !(this.done <= this.points.length && i === this.target);
      d.ring
        .clear()
        .circle(0, 0, next ? 30 : 22)
        .fill({ color: next ? COLORS.good : joined ? LINE : 0xffffff })
        .stroke({ color: COLORS.ink, width: 5 });
    });
  }

  /** Shape closed: the dots vanish and the picture appears. */
  private complete(): void {
    this.busy = true;
    this.live.clear();
    const item = this.items[this.index]!;
    this.timers.after(0.25, () => {
      for (const d of this.points) this.tweens.to(d.view, { alpha: 0 }, { duration: 0.3 });
      this.tweens.to(this.lines, { alpha: 0 }, { duration: 0.4 });
      if (this.ghost) this.tweens.to(this.ghost, { alpha: 0 }, { duration: 0.3 });
      const pic = this.picture!;
      pic.visible = true;
      void popIn(this.tweens, pic, 0.5);
      this.burst(this.box.x + this.box.w / 2, this.box.y + this.box.h / 2, 40);
      const len = say(this.game, this.guide, `item-${item.id}`);
      this.solved(len);
    });
  }

  /** Playtest: all dots in order. */
  solve(): void {
    while (!this.busy) this.check(this.points[this.target]!.at);
  }

  /** Hint: the next dot bounces a few times. */
  /** Trace with a finger from the current dot through the next two. */
  protected override gesture(): Gesture | null {
    if (!this.points.length) return null;
    const n = this.points.length;
    const path = [0, 1, 2].map((k) => this.points[(this.target + k) % n]!.at).map((p) => ({ x: p.x, y: p.y }));
    return { kind: 'trace', path };
  }

  protected hint(): void {
    const d = this.points[this.target];
    if (d) void this.tweens.to(d.view.scale, { x: 1.6, y: 1.6 }, { duration: 0.25, yoyo: true, repeat: 5, ease: 'sineInOut' });
  }

  protected place(): void {
    if (!this.points.length) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 280;
    const right = w - safe.right - 60;
    const top = safe.top + 160;
    const bottom = h - 70;
    const pic = this.picture!;
    const tex = pic.texture;
    const k = Math.min((right - left) / tex.width, (bottom - top) / tex.height);
    const bw = tex.width * k;
    const bh = tex.height * k;
    this.box = { x: (left + right) / 2 - bw / 2, y: (top + bottom) / 2 - bh / 2, w: bw, h: bh };
    pic.scale.set(k);
    pic.position.set(this.box.x + bw / 2, this.box.y + bh / 2);
    if (this.ghost) {
      this.ghost.scale.set(k * (tex.width / this.ghost.texture.width));
      this.ghost.position.copyFrom(pic.position);
    }
    const pad = this.layer.children.find((c) => c.label === 'pad') as Graphics;
    pad.clear().rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0.001 });
    pad.hitArea = new Rectangle(0, 0, w, h);
    const shape = this.shapes[this.index]!;
    this.points.forEach((d, i) => {
      d.at = { x: this.box.x + shape[i]!.x * bw, y: this.box.y + shape[i]!.y * bh };
      d.view.position.set(d.at.x, d.at.y);
      // Number outside the shape (away from the picture's centre).
      const cx = this.box.x + bw / 2;
      const cy = this.box.y + bh / 2;
      const a = Math.atan2(d.at.y - cy, d.at.x - cx);
      d.num.position.set(Math.cos(a) * 52, Math.sin(a) * 52);
    });
  }
}

/** Picture outline: low-resolution alpha mask, then rays from the centre of mass. */
function dotsOf(src: CanvasImageSource & { width: number; height: number }, count: number): Point[] {
  const k = MASK / Math.max(src.width, src.height);
  const w = Math.max(1, Math.round(src.width * k));
  const h = Math.max(1, Math.round(src.height * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = (data[i * 4 + 3] as number) > 110 ? 1 : 0;
  return dotsOnEdge(mask, w, h, count);
}
