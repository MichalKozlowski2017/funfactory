import { Container, Graphics, Sprite, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import type { Item } from '../sim/catalog.ts';
import { makePatternRound, type PatternTask } from '../sim/patterns.ts';
import { state } from '../state.ts';
import { COLORS, draggable, label, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';

interface Tile {
  view: Container;
  item: Item | null;
}

/**
 * Co dalej? (Warsztat Bazyla): rząd obrazków we wzorze z jednym pustym miejscem; brakujący obrazek
 * przeciąga się z dołu. Dobry wskakuje na miejsce i cały rząd „gra” po kolei, zły wraca.
 */
export class PatternScene extends RoundScene {
  readonly id = 'patterns';
  private tasks: PatternTask[] = [];
  private tiles: Tile[] = [];
  private options: { view: Container; item: Item; home: { x: number; y: number } }[] = [];
  private size = 110;
  private dragging = false;

  constructor() {
    super('wzory', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    this.tasks = makePatternRound(this.game.rng, state.progress.levels.wzory ?? 0);
    this.length = this.tasks.length;
  }

  private get task(): PatternTask {
    return this.tasks[this.index]!;
  }

  protected promptLine(): string {
    return 'wzory';
  }

  protected show(): void {
    const t = this.task;
    this.tiles = t.row.map((item, i) => {
      const view = new Container();
      view.addChild(new Graphics());
      if (i !== t.gap) view.addChild(new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 }));
      else view.addChild(label('?', 64, this.game.pixelRatio, '#ff7a8a'));
      view.eventMode = 'none';
      this.layer.addChild(view);
      return { view, item: i === t.gap ? null : item };
    });
    this.options = t.options.map((item) => {
      const view = new Container();
      view.addChild(new Graphics(), new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 }));
      const opt = { view, item, home: { x: 0, y: 0 } };
      draggable(view, {
        canStart: () => !this.busy && !this.dragging,
        start: () => {
          this.dragging = true;
          this.idle = 0;
          this.tweens.killOf(view.scale);
          this.tweens.to(view.scale, { x: 1.1, y: 1.1 }, { duration: 0.1 });
          sfx.pop(this.game.sound, 1.2);
        },
        drop: (at) => this.drop(opt, at),
      });
      this.layer.addChild(view);
      return opt;
    });
    this.timers.after(0.4, () => say(this.game, this.guide, 'wzory'));
  }

  protected override appear(): void {
    [...this.tiles.map((t) => t.view), ...this.options.map((o) => o.view)].forEach((v, i) => {
      void popIn(this.tweens, v, 0.3, i * 0.05);
      this.timers.after(i * 0.05, () => sfx.pop(this.game.sound, 0.9 + i * 0.04));
    });
  }

  private drop(opt: { view: Container; item: Item; home: { x: number; y: number } }, at: Point): void {
    this.dragging = false;
    const gap = this.tiles[this.task.gap]!.view;
    const over = Math.abs(at.x - gap.x) < this.size * 0.75 && Math.abs(at.y - gap.y) < this.size * 0.9;
    if (over && opt.item === this.task.row[this.task.gap]) return this.correct(opt);
    if (over) this.missed();
    this.tweens.to(opt.view, { x: opt.home.x, y: opt.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(opt.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  /** Dobry obrazek wskakuje na miejsce, a cały rząd podskakuje po kolei jak melodia. */
  private correct(opt: { view: Container; item: Item }): void {
    this.busy = true;
    const gap = this.tiles[this.task.gap]!;
    this.tweens.to(opt.view, { x: gap.view.x, y: gap.view.y }, { duration: 0.15, ease: 'quadOut' });
    this.tweens.to(opt.view.scale, { x: 1, y: 1 }, { duration: 0.15 });
    gap.view.children[1]!.visible = false;
    haptics.success();
    for (const o of this.options) if (o !== opt) this.tweens.to(o.view, { alpha: 0 }, { duration: 0.25 });
    this.tiles.forEach((t, i) => {
      const v = i === this.task.gap ? opt.view : t.view;
      this.timers.after(0.2 + i * 0.12, () => {
        sfx.pop(this.game.sound, 0.9 + (i % 4) * 0.15);
        const y = v.y;
        void this.tweens.to(v, { y: y - 24 }, { duration: 0.1, yoyo: true, repeat: 1, ease: 'quadOut' }).done.then(() => (v.y = y));
      });
    });
    this.timers.after(0.2 + this.tiles.length * 0.12, () => {
      this.burst(gap.view.x, gap.view.y, 30);
      this.solved();
    });
  }

  /** Playtest: dobry obrazek na miejsce. */
  solve(): void {
    const opt = this.options.find((o) => o.item === this.task.row[this.task.gap])!;
    this.correct(opt);
  }

  /** Podpowiedź: dobry obrazek się kołysze. */
  protected hint(): void {
    const opt = this.options.find((o) => o.item === this.task.row[this.task.gap]);
    if (opt) void this.tweens.to(opt.view, { rotation: 0.1 }, { duration: 0.12, yoyo: true, repeat: 5, ease: 'sineInOut' }).done.then(() => (opt.view.rotation = 0));
  }

  private plate(g: Graphics, s: number, dashed: boolean): void {
    g.clear()
      .roundRect(-s / 2, -s / 2 + 5, s, s, s * 0.18)
      .fill({ color: 0x000000, alpha: dashed ? 0 : 0.12 })
      .roundRect(-s / 2, -s / 2, s, s, s * 0.18)
      .fill({ color: dashed ? 0xffffff : COLORS.card, alpha: dashed ? 0.55 : 1 })
      .stroke({ color: dashed ? 0xff7a8a : COLORS.ink, width: dashed ? 6 : 5 });
  }

  protected place(): void {
    if (!this.tiles.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 260;
    const right = w - safe.right - 30;
    const n = this.tiles.length;
    const gap = 12;
    this.size = Math.min(170, (right - left - gap * (n - 1)) / n);
    const s = this.size;
    const cx = (left + right) / 2;
    this.tiles.forEach((t, i) => {
      t.view.position.set(cx + (i - (n - 1) / 2) * (s + gap), h * 0.42);
      this.plate(t.view.children[0] as Graphics, s, t.item === null);
      const pic = t.view.children[1]!;
      if (pic instanceof Sprite) pic.scale.set((s * 0.8) / Math.max(pic.texture.width, pic.texture.height));
    });
    const os = Math.min(160, s * 1.25);
    const m = this.options.length;
    this.options.forEach((o, i) => {
      o.home = { x: cx + (i - (m - 1) / 2) * (os + 40), y: h - 120 };
      if (!this.busy) o.view.position.set(o.home.x, o.home.y);
      this.plate(o.view.children[0] as Graphics, s, false);
      const pic = o.view.children[1] as Sprite;
      pic.scale.set((s * 0.8) / Math.max(pic.texture.width, pic.texture.height));
      o.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= s / 2 + 12 && Math.abs(y) <= s / 2 + 12 };
    });
  }
}
