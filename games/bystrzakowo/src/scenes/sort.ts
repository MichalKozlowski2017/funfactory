import { Container, Graphics, Sprite, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import type { Color, Item } from '../sim/catalog.ts';
import { makeSortRound, sortPromptLine, type SortTask } from '../sim/sorting.ts';
import { state } from '../state.ts';
import { COLORS, draggable, sfx } from '../ui.ts';
import { PAINT } from './puzzle.ts';
import { RoundScene } from './round.ts';

/** Obiekt do posegregowania: kafelek z obrazkiem, który przeciąga się do skrzynki. */
interface Piece {
  view: Container;
  item: Item;
  bin: number;
  home: { x: number; y: number };
  done: boolean;
}

interface BinView {
  view: Container;
  /** Obiekty już włożone (za przednią ścianką skrzynki). */
  pile: Container;
  box: Container;
  width: number;
  height: number;
}

/**
 * Segregowanie (Warsztat Bazyla): obiekty u góry, 2–3 skrzynki albo wiaderka na dole.
 * Dobra skrzynka: obiekt wpada do środka i lektor mówi nazwę. Zła: skrzynka kręci głową, obiekt wraca.
 */
export class SortScene extends RoundScene {
  readonly id = 'sort';
  private tasks: SortTask[] = [];
  private pieces: Piece[] = [];
  private bins: BinView[] = [];
  private dragging = false;

  constructor() {
    super('sortowanie', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    this.tasks = makeSortRound(this.game.rng, state.progress.levels.sortowanie ?? 0);
    this.length = this.tasks.length;
  }

  private get task(): SortTask {
    return this.tasks[this.index]!;
  }

  protected promptLine(): string {
    return sortPromptLine(this.task);
  }

  protected show(): void {
    const t = this.task;
    this.bins = t.bins.map((bin) => this.binView(t.rule === 'kolory' ? (bin.key as Color) : null, bin.sign));
    this.pieces = t.items.map(({ item, bin }) => this.piece(item, bin));
    [...this.bins.map((b) => b.view), ...this.pieces.map((p) => p.view)].forEach((c, i) => {
      void popIn(this.tweens, c, 0.4, i * 0.06);
      this.timers.after(i * 0.06, () => sfx.pop(this.game.sound, 0.9 + i * 0.05));
    });
    this.timers.after(0.4, () => {
      const len = say(this.game, this.guide, this.promptLine());
      if (this.index === 0 && state.progress.levels.sortowanie === 0) this.timers.after(len + 0.3, () => say(this.game, this.guide, 'przeciagnij'));
    });
  }

  private binView(color: Color | null, sign: string | undefined): BinView {
    const view = new Container();
    const pile = new Container();
    const box = new Container();
    const texture = color ? this.art.bucket : this.art.crate;
    if (texture) {
      const s = new Sprite({ texture, anchor: { x: 0.5, y: 1 } });
      if (color) s.tint = PAINT[color];
      box.addChild(s);
    } else {
      // Zapas, gdy grafiki jeszcze nie ma: prosta skrzynka z kodu.
      const g = new Graphics().roundRect(-140, -150, 280, 150, 24).fill({ color: color ? PAINT[color] : 0xc98a4b }).stroke({ color: COLORS.ink, width: 6 });
      box.addChild(g);
    }
    view.addChild(pile, box);
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
    return { view, pile, box, width: 0, height: 0 };
  }

  private piece(item: Item, bin: number): Piece {
    const view = new Container();
    const plate = new Graphics();
    const pic = new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 });
    view.addChild(plate, pic);
    const piece: Piece = { view, item, bin, home: { x: 0, y: 0 }, done: false };
    draggable(view, {
      canStart: () => !piece.done && !this.busy && !this.dragging,
      start: () => {
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

  /** Do której skrzynki trafił obiekt (punkt w obrębie skrzynki albo tuż nad nią). */
  private binAt(at: Point): number {
    return this.bins.findIndex((b) => Math.abs(at.x - b.view.x) < b.width / 2 + 20 && at.y > b.view.y - b.height - 140 && at.y < b.view.y + 30);
  }

  private drop(piece: Piece, at: Point): void {
    this.dragging = false;
    const target = this.binAt(at);
    if (target < 0) return this.goHome(piece);
    if (target === piece.bin) return this.put(piece);
    // Zła skrzynka: kręci się „nie”, obiekt wraca.
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

  /** Obiekt wpada do skrzynki: kurczy się i ląduje w stosiku za przednią ścianką. */
  private put(piece: Piece): void {
    piece.done = true;
    const bin = this.bins[piece.bin]!;
    const n = bin.pile.children.length;
    const slot = { x: (n % 3 - 1) * bin.width * 0.26 + (Math.floor(n / 3) % 2) * 20, y: -bin.height * 0.95 - Math.floor(n / 3) * 16 };
    const dest = { x: bin.view.x + slot.x, y: bin.view.y + slot.y };
    haptics.success();
    sfx.good(this.game.sound);
    void this.tweens.to(piece.view, { x: dest.x, y: dest.y }, { duration: 0.22, ease: 'quadOut' }).done.then(() => {
      const pic = piece.view.children[1] as Sprite;
      const small = new Sprite({ texture: pic.texture, anchor: 0.5 });
      small.scale.set(Math.min(bin.width * 0.34, 90) / Math.max(pic.texture.width, pic.texture.height));
      small.position.set(slot.x, slot.y);
      bin.pile.addChild(small);
      piece.view.visible = false;
      void squash(this.tweens, bin.box, 0.12);
      this.burst(dest.x, dest.y, 16);
    });
    const len = say(this.game, this.guide, `item-${piece.item.id}`);
    if (this.pieces.every((p) => p.done)) {
      for (const b of this.bins) void pulse(this.tweens, b.view, 0.1, 0.35);
      this.solved(len);
    }
  }

  /** Playtest: wszystko do dobrych skrzynek (`eval:__ff.game.scenes.current.solve()`). */
  solve(): void {
    for (const p of this.pieces) if (!p.done) this.put(p);
  }

  /** Podpowiedź: pierwszy obiekt sam „wskazuje” swoją skrzynkę. */
  protected hint(): void {
    const p = this.pieces.find((x) => !x.done);
    if (!p) return;
    const bin = this.bins[p.bin]!.view;
    const tx = p.home.x + (bin.x - p.home.x) * 0.35;
    const ty = p.home.y + (bin.y - 200 - p.home.y) * 0.35;
    void this.tweens.to(p.view, { x: tx, y: ty }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 }).done.then(() => p.view.position.set(p.home.x, p.home.y));
  }

  protected place(): void {
    if (!this.tasks.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const cw = right - left;
    const cx = (left + right) / 2;
    // Skrzynki na dole.
    const nb = this.bins.length;
    const bw = Math.min(290, (cw - 40 * (nb - 1)) / nb);
    this.bins.forEach((b, i) => {
      const sprite = b.box.children[0]!;
      const sw = sprite instanceof Sprite ? sprite.texture.width : 280;
      sprite.scale.set(bw / sw);
      b.width = bw;
      b.height = sprite.height;
      b.view.position.set(cx + (i - (nb - 1) / 2) * (bw + 40), h - 30);
      const sign = b.view.children.find((c) => c.label === 'sign');
      sign?.position.set(0, -b.height - 62);
      // Stosik: obiekty już w skrzynce przeskalowane do nowej szerokości.
      b.pile.children.forEach((c, n) => c.position.set((n % 3 - 1) * bw * 0.26 + (Math.floor(n / 3) % 2) * 20, -b.height * 0.95 - Math.floor(n / 3) * 16));
    });
    // Obiekty u góry: jeden rząd.
    const n = this.pieces.length;
    const size = Math.min(140, (cw - 24 * (n - 1)) / n);
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
