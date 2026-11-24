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

/** Rozmiar maski do liczenia konturu (piksele). */
const MASK = 96;
const LINE = 0xff7a8a;

interface DotView {
  view: Container;
  ring: Graphics;
  num: Text;
  at: Point;
}

/**
 * Łączenie kropek (Ścieżka Lusi): kropki na konturze obrazka, palcem od jedynki po kolei i z powrotem
 * do jedynki. Lusia liczy na głos, a po zamknięciu kształtu pojawia się kolorowy obrazek.
 * Można prowadzić palcem albo dotykać kropek po kolei.
 */
export class DotsScene extends RoundScene {
  readonly id = 'dots';
  private items: Item[] = [];
  /** Kropki każdego obrazka w ułamkach obrazka (0..1). */
  private shapes: Point[][] = [];
  private points: DotView[] = [];
  // Tworzone od nowa w każdym zadaniu (warstwa jest czyszczona i niszczona między zadaniami).
  private lines = new Graphics();
  private live = new Graphics();
  private picture: Sprite | null = null;
  private ghost: Sprite | null = null;
  /** Ile kropek już połączono (0 = jeszcze nie dotknięto jedynki). */
  private done = 0;
  private drawing = false;
  /** Pole obrazka na ekranie. */
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
    // Blady cień obrazka: łączenie kropek odkrywa kształt, który dziecko może rozpoznać.
    this.ghost = shadowNow(item.id) ? new Sprite({ texture: shadowNow(item.id)!, anchor: 0.5 }) : null;
    if (this.ghost) this.ghost.alpha = 0.16;
    // Pole dotyku na całą warstwę: palec może zacząć gdziekolwiek.
    const pad = new Graphics();
    pad.label = 'pad';
    pad.eventMode = 'static';
    pad.on('pointerdown', (e) => this.down(e));
    pad.on('globalpointermove', (e) => this.move(e));
    pad.on('pointerup', () => this.up());
    pad.on('pointerupoutside', () => this.up());
    // Obrazki i kropki nie łapią dotyku: palec przyłożony na kropce ma trafić w pole dotyku.
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

  /** Następna kropka do połączenia (po ostatniej: z powrotem jedynka). */
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
    // Stuknięcie w inną kropkę niż następna: następna (zielona) pulsuje, żeby było widać, od której zacząć.
    if (this.done === before && this.points.some((d, i) => i !== this.target && hitsDot(p, d.at, 46))) void pulse(this.tweens, this.points[this.target]!.view, 0.35, 0.4);
  }

  private move(e: FederatedPointerEvent): void {
    if (!this.drawing || this.busy) return;
    const p = this.local(e);
    this.check(p);
    // Gumka od ostatniej połączonej kropki do palca.
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

  /** Palec na następnej kropce: połączenie. */
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

  /** Kropki: połączone na kolorowo, następna zielona i większa. */
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

  /** Kształt zamknięty: kropki znikają, pojawia się obrazek. */
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

  /** Playtest: wszystkie kropki po kolei. */
  solve(): void {
    while (!this.busy) this.check(this.points[this.target]!.at);
  }

  /** Podpowiedź: następna kropka podskakuje kilka razy. */
  /** Prowadzenie palcem od bieżącej kropki przez dwie następne. */
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
      // Numer na zewnątrz kształtu (od środka obrazka).
      const cx = this.box.x + bw / 2;
      const cy = this.box.y + bh / 2;
      const a = Math.atan2(d.at.y - cy, d.at.x - cx);
      d.num.position.set(Math.cos(a) * 52, Math.sin(a) * 52);
    });
  }
}

/** Kontur obrazka: maska alfa w małej rozdzielczości, potem promienie ze środka masy. */
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
