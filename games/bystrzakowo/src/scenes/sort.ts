import { Container, Graphics, Sprite, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import type { Color, Item } from '../sim/catalog.ts';
import { binLine, makeSortRound, sortPromptLine, type SortTask } from '../sim/sorting.ts';
import { state } from '../state.ts';
import { COLORS, draggable, sfx } from '../ui.ts';
import { PAINT } from './puzzle.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

/**
 * Shape of the container opening as fractions of the image (measured on the Flux files): `mouth` is the height of the rim
 * line from the top, `rx`/`ry` the semi-axes of the opening ellipse (0 = straight edge, like the front board of a crate),
 * `sink`: how deep an item sits (fraction of its size below the rim; the crate is shallower).
 */
const BUCKET = { mouth: 0.41, rx: 0.39, ry: 0.05, sink: 0.25 };
const CRATE = { mouth: 0.4, rx: 0, ry: 0, sink: 0.05 };

/** Item to sort: a picture tile dragged into a bin. */
interface Piece {
  view: Container;
  item: Item;
  bin: number;
  home: { x: number; y: number };
  done: boolean;
}

interface BinView {
  view: Container;
  /** Items already put in (behind the bin's front wall). */
  pile: Container;
  box: Container;
  /** Recording of the bin's name (e.g. "house-forest"). */
  line: string;
  /** Container image (back) and the front wall above the items; scaled together. */
  back: Container;
  front: Container;
  width: number;
  height: number;
  /** Droplet colours when an item drops in (the bucket's colour or confetti). */
  splash: number[];
  /** Rim height as a fraction of the image height (the bucket has a handle above the rim). */
  rim: number;
  /** How deep an item sits (fraction of its size below the rim). */
  sink: number;
}

/**
 * Sorting (Basil's Workshop): items at the top, 2–3 crates or buckets at the bottom.
 * Right bin: the item drops inside and the narrator says its name. Wrong: the bin shakes its head, the item returns.
 */
export class SortScene extends RoundScene {
  readonly id = 'sort';
  private tasks: SortTask[] = [];
  private pieces: Piece[] = [];
  private bins: BinView[] = [];
  private dragging = false;

  constructor() {
    super('sorting', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    this.tasks = makeSortRound(this.game.rng, state.progress.levels.sorting ?? 0);
    this.length = this.tasks.length;
  }

  protected override roundItems(): string[] {
    return this.tasks.flatMap((t) => t.items.map((x) => x.item.id));
  }

  private get task(): SortTask {
    return this.tasks[this.index]!;
  }

  protected promptLine(): string {
    return sortPromptLine(this.task);
  }

  protected show(): void {
    const t = this.task;
    this.bins = t.bins.map((bin) => this.binView(t.rule === 'colors' ? (bin.key as Color) : null, bin.sign, binLine(t.rule, bin.key)));
    this.pieces = t.items.map(({ item, bin }) => this.piece(item, bin));
    [...this.bins.map((b) => b.view), ...this.pieces.map((p) => p.view)].forEach((c, i) => {
      void popIn(this.tweens, c, 0.4, i * 0.06);
      this.timers.after(i * 0.06, () => sfx.pop(this.game.sound, 0.9 + i * 0.05));
    });
    this.timers.after(0.4, () => this.announce());
  }

  /** The rule question, then the name of each bin (a bin bounces when Basil names it). */
  private announce(): void {
    const len = say(this.game, this.guide, this.promptLine());
    let at = len + 0.25;
    const index = this.index;
    for (const bin of this.bins) {
      this.timers.after(at, () => {
        if (this.index !== index || this.dragging) return;
        this.nameBin(bin);
      });
      at += 1.1;
    }
    if (this.index === 0 && state.progress.levels.sorting === 0)
      this.timers.after(at + 0.1, () => {
        if (this.index === index && !this.dragging) say(this.game, this.guide, 'drag');
      });
  }

  /** Bin name (also when it is touched): narrator and a bounce. */
  private nameBin(bin: BinView): void {
    say(this.game, this.guide, bin.line);
    // Bounce only the container (the `box` layer), so it doesn't clash with the wobble after a drop.
    this.tweens.killOf(bin.box);
    bin.box.y = 0;
    void this.tweens.to(bin.box, { y: -26 }, { duration: 0.14, ease: 'quadOut', yoyo: true, repeat: 1 }).done.then(() => (bin.box.y = 0));
    const sign = bin.view.children.find((c) => c.label === 'sign');
    if (sign) void squash(this.tweens, sign, 0.2);
  }

  protected override repeatPrompt(): void {
    if (this.busy || this.overlay) return;
    this.idle = 0;
    this.announce();
  }

  private binView(color: Color | null, sign: string | undefined, line: string): BinView {
    const view = new Container();
    // Container in three layers: back, items inside, front wall (the same image clipped
    // to the rim line). This way items stick out of the inside instead of lying behind the container.
    const box = new Container();
    const pile = new Container();
    const back = new Container();
    const front = new Container();
    const texture = color ? this.art.bucket : this.art.crate;
    const shape = color ? BUCKET : CRATE;
    if (texture) {
      const make = () => {
        const s = new Sprite({ texture, anchor: { x: 0.5, y: 1 } });
        if (color) s.tint = PAINT[color];
        return s;
      };
      back.addChild(make());
      const w = texture.width;
      const h = texture.height;
      const mask = new Graphics();
      if (shape.ry > 0) {
        // Lower half of the opening ellipse and everything below.
        const cy = -h * (1 - shape.mouth);
        const pts: number[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI;
          pts.push(-Math.cos(a) * w * shape.rx, cy + Math.sin(a) * h * shape.ry);
        }
        pts.push(w, 0, w, 10, -w, 10, -w, 0);
        mask.poly(pts).fill({ color: 0xffffff });
      } else mask.rect(-w, -h * (1 - shape.mouth), w * 2, h * (1 - shape.mouth) + 10).fill({ color: 0xffffff });
      const frontSprite = make();
      front.addChild(frontSprite, mask);
      frontSprite.mask = mask;
    } else {
      // Fallback while the image isn't loaded yet: a simple crate drawn in code.
      back.addChild(new Graphics().roundRect(-140, -150, 280, 150, 24).fill({ color: color ? PAINT[color] : 0xc98a4b }).stroke({ color: COLORS.ink, width: 6 }));
    }
    box.addChild(back, pile, front);
    view.addChild(box);
    if (sign) {
      const tex = this.art.items.get(sign) ?? this.art.signs.get(sign);
      const plate = new Container();
      plate.addChild(new Graphics().circle(0, 0, 58).fill({ color: COLORS.card }).stroke({ color: COLORS.ink, width: 6 }));
      if (tex) {
        const pic = new Sprite({ texture: tex, anchor: 0.5 });
        pic.scale.set(84 / Math.max(tex.width, tex.height));
        plate.addChild(pic);
      }
      plate.label = 'sign';
      view.addChild(plate);
    }
    this.layer.addChild(view);
    const splash = color ? [PAINT[color], PAINT[color], 0xffffff] : COLORS.confetti;
    const bin: BinView = { view, pile, box, back, front, line, width: 0, height: 0, splash, rim: texture ? 1 - shape.mouth : 0.9, sink: shape.sink };
    // Touching a bin: its name.
    view.eventMode = 'static';
    view.cursor = 'pointer';
    view.on('pointertap', () => {
      if (this.dragging || this.busy) return;
      this.idle = 0;
      this.nameBin(bin);
    });
    return bin;
  }

  private piece(item: Item, bin: number): Piece {
    const view = new Container();
    const plate = new Graphics();
    const pic = new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 });
    view.addChild(plate, pic);
    const piece: Piece = { view, item, bin, home: { x: 0, y: 0 }, done: false };
    draggable(view, {
      tap: () => this.tapHint(),
      canStart: () => !piece.done && !this.busy && !this.dragging,
      start: () => {
        this.tweens.killOf(view);
        this.dragging = true;
        this.idle = 0;
        this.tweens.killOf(view.scale);
        this.tweens.to(view.scale, { x: 1.12, y: 1.12 }, { duration: 0.12 });
        sfx.pop(this.game.sound, 1.2);
      },
      drop: (at) => this.drop(piece, at),
    });
    this.layer.addChild(view);
    return piece;
  }

  /** Which bin the item landed in (a point inside the bin or just above it). */
  private binAt(at: Point): number {
    return this.bins.findIndex((b) => Math.abs(at.x - b.view.x) < b.width / 2 + 20 && at.y > b.view.y - b.height - 140 && at.y < b.view.y + 30);
  }

  private drop(piece: Piece, at: Point): void {
    this.dragging = false;
    const target = this.binAt(at);
    if (target < 0) return this.goHome(piece);
    if (target === piece.bin) return this.put(piece);
    // Wrong bin: it shakes "no", the item returns.
    const box = this.bins[target]!.view;
    const x = box.x;
    void this.tweens.to(box, { x: x + 12 }, { duration: 0.05, yoyo: true, repeat: 5 }).done.then(() => (box.x = x));
    this.goHome(piece);
    this.missed();
  }

  private goHome(piece: Piece): void {
    this.tweens.to(piece.view, { x: piece.home.x, y: piece.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(piece.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  /** Picture size inside the container (fits the opening, three side by side). */
  private itemSize(bin: BinView): number {
    return bin.width * 0.3;
  }

  /** Position of the n-th item in the container: within the opening, only the top part sticks out. */
  private pileSlot(bin: BinView, n: number): { x: number; y: number } {
    const size = this.itemSize(bin);
    const col = [0, -0.21, 0.21][n % 3]!;
    const row = Math.floor(n / 3);
    return { x: (col + (row % 2) * 0.1) * bin.width, y: -bin.height * bin.rim + size * bin.sink - row * 10 };
  }

  /**
   * The item drops into the container. First it flies in an arc with a somersault above the opening (in front of the container),
   * then it moves behind the front wall and falls straight down through the opening: plop, the container squats
   * and wobbles, droplets splash, and the item bounces and stays inside, sticking out only a little.
   */
  private put(piece: Piece): void {
    piece.done = true;
    const bin = this.bins[piece.bin]!;
    const v = piece.view;
    const slot = this.pileSlot(bin, bin.pile.children.length + this.flying(bin));
    this.tweens.killOf(v);
    this.tweens.killOf(v.scale);
    v.eventMode = 'none';
    // Flight: no tile, just the picture.
    const plate = v.children[0]!;
    this.tweens.to(plate, { alpha: 0 }, { duration: 0.15 });
    const size = this.itemSize(bin);
    const pic = v.children[1] as Sprite;
    const s1 = size / (Math.max(pic.texture.width, pic.texture.height) * pic.scale.x);
    const start = { x: v.x, y: v.y };
    // Point above the opening: the whole picture still above the rim.
    const above = { x: bin.view.x + slot.x, y: bin.view.y - bin.height * bin.rim - size * 0.75 };
    const apex = { x: (start.x + above.x) / 2, y: Math.min(start.y, above.y) - 130 };
    const s0 = v.scale.x;
    const spin = (above.x >= start.x ? 1 : -1) * Math.PI * 2;
    sfx.whoosh(this.game.sound);
    haptics.tap();
    const len = say(this.game, this.guide, `item-${piece.item.id}`);
    (bin as BinView & { inFlight?: number }).inFlight = this.flying(bin) + 1;
    void this.tweens
      .to(
        { t: 0 },
        { t: 1 },
        {
          duration: 0.5,
          ease: 'sineInOut',
          onUpdate: (t) => {
            const a = (1 - t) * (1 - t);
            const b = 2 * (1 - t) * t;
            const c = t * t;
            v.position.set(a * start.x + b * apex.x + c * above.x, a * start.y + b * apex.y + c * above.y);
            v.rotation = spin * t;
            v.scale.set(s0 + (s1 - s0) * t);
          },
        },
      )
      .done.then(() => this.sink(piece, bin, slot, s1));
    if (this.pieces.every((p) => p.done)) this.solved(len + 0.6);
  }

  private flying(bin: BinView): number {
    return (bin as BinView & { inFlight?: number }).inFlight ?? 0;
  }

  /** Fall through the opening: the item is already behind the front wall (in the pile), so it disappears inside. */
  private sink(piece: Piece, bin: BinView, slot: { x: number; y: number }, scale: number): void {
    const v = piece.view;
    v.rotation = 0;
    v.scale.set(scale);
    v.position.set(v.x - bin.view.x, v.y - bin.view.y);
    bin.pile.addChild(v);
    // Down inside, but not below the bottom (the crate is low: the item must not peek out underneath).
    const size = this.itemSize(bin);
    const deep = Math.min(slot.y + size * 0.9, -size * 0.5 - 10);
    void this.tweens.to(v, { y: deep }, { duration: 0.16, ease: 'quadIn' }).done.then(() => this.land(piece, bin, slot));
  }

  /** Plop: the container squats and wobbles, droplets, a star, the item bounces into its place. */
  private land(piece: Piece, bin: BinView, slot: { x: number; y: number }): void {
    const v = piece.view;
    (bin as BinView & { inFlight?: number }).inFlight = Math.max(0, this.flying(bin) - 1);
    sfx.plop(this.game.sound);
    haptics.hit();
    const box = bin.box;
    this.tweens.killOf(box.scale);
    box.scale.set(1.14, 0.8);
    this.tweens.to(box.scale, { x: 1, y: 1 }, { duration: 0.5, ease: 'elasticOut' });
    this.tweens.killOf(bin.view);
    bin.view.rotation = 0;
    void this.tweens.to(bin.view, { rotation: 0.07 }, { duration: 0.09, yoyo: true, repeat: 3, ease: 'sineInOut' }).done.then(() => (bin.view.rotation = 0));
    const top = { x: bin.view.x, y: bin.view.y - bin.height * bin.rim };
    this.particles.burst(top.x + slot.x, top.y, { count: 32, speed: [300, 700], life: [0.5, 1], gravity: 1400, scale: [1, 2], angle: -Math.PI / 2, spread: 1.4, colors: bin.splash });
    this.floatStar(top.x, top.y - 60);
    void this.tweens.to(v, { y: slot.y }, { duration: 0.38, delay: 0.05, ease: 'backOut' });
  }

  /** A star floating up above the bin. */
  private floatStar(x: number, y: number): void {
    const star = new Graphics().star(0, 0, 5, 26, 12).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
    star.position.set(x, y);
    star.scale.set(0.3);
    this.layer.addChild(star);
    this.tweens.to(star.scale, { x: 1, y: 1 }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(star, { rotation: 0.6 }, { duration: 0.8 });
    void this.tweens.to(star, { y: y - 90, alpha: 0 }, { duration: 0.8, delay: 0.15, ease: 'quadOut' }).done.then(() => star.destroy());
  }

  /** Playtest: everything into the right bins (`eval:__ff.game.scenes.current.solve()`). */
  solve(): void {
    for (const p of this.pieces) if (!p.done) this.put(p);
  }

  /** Hint: the first item "points" to its bin by itself. */
  protected override gesture(): Gesture | null {
    const p = this.pieces.find((x) => !x.done);
    const bin = p && this.bins[p.bin];
    return p && bin ? { kind: 'drag', from: this.spot(p.view), to: this.spot(bin.view, 0, -bin.height * 0.55) } : null;
  }

  protected hint(): void {
    const p = this.pieces.find((x) => !x.done);
    if (!p) return;
    const bin = this.bins[p.bin]!.view;
    const tx = p.home.x + (bin.x - p.home.x) * 0.35;
    const ty = p.home.y + (bin.y - 200 - p.home.y) * 0.35;
    // Grabbing an item interrupts the hint; then we don't move it back to the start (the child may have already placed it).
    const tw = this.tweens.to(p.view, { x: tx, y: ty }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 });
    void tw.done.then(() => !tw.killed && p.view.position.set(p.home.x, p.home.y));
  }

  protected place(): void {
    if (!this.tasks.length) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const cw = right - left;
    const cx = (left + right) / 2;
    // Bins at the bottom.
    const nb = this.bins.length;
    const bw = Math.min(290, (cw - 40 * (nb - 1)) / nb);
    this.bins.forEach((b, i) => {
      const art = b.back.children[0]!;
      const sw = art instanceof Sprite ? art.texture.width : 280;
      b.back.scale.set(bw / sw);
      b.front.scale.set(bw / sw);
      b.width = bw;
      b.height = b.back.height;
      b.view.position.set(cx + (i - (nb - 1) / 2) * (bw + 40), h - 30);
      const sign = b.view.children.find((c) => c.label === 'sign');
      sign?.position.set(0, -b.height - 62);
      // Pile: items already in the bin, rescaled to the new width.
      b.pile.children.forEach((c, n) => {
        const slot = this.pileSlot(b, n);
        c.position.set(slot.x, slot.y);
      });
    });
    // Items at the top: one row.
    const n = this.pieces.length;
    const size = Math.min(170, (cw - 24 * (n - 1)) / n);
    this.pieces.forEach((p, i) => {
      const plate = p.view.children[0] as Graphics;
      plate
        .clear()
        .roundRect(-size / 2, -size / 2 + 6, size, size, size * 0.18)
        .fill({ color: 0x000000, alpha: 0.12 })
        .roundRect(-size / 2, -size / 2, size, size, size * 0.18)
        .fill({ color: COLORS.card })
        .stroke({ color: COLORS.ink, width: 5 });
      const pic = p.view.children[1] as Sprite;
      pic.scale.set((size * 0.8) / Math.max(pic.texture.width, pic.texture.height));
      p.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= size / 2 + 10 && Math.abs(y) <= size / 2 + 10 };
      p.home = { x: cx + (i - (n - 1) / 2) * (size + 24), y: safe.top + 200 };
      if (!p.done) p.view.position.set(p.home.x, p.home.y);
    });
  }
}
