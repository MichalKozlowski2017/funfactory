import { Container, Graphics, Sprite, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { makeSyllableRound, scramble, tileColors, type Word } from '../sim/syllables.ts';
import { state } from '../state.ts';
import { COLORS, draggable, label, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';

const TILE_COLORS = [0xff8fb1, 0x8fc8ff, 0xffd166];

interface Tile {
  view: Container;
  index: number;
  color: number;
  home: { x: number; y: number };
  placed: boolean;
}

/**
 * Sylaby (Warsztat Bazyla): obrazek, puste miejsca i rozsypane kafelki z sylabami. Kafelek pasujący
 * do miejsca wskakuje; po ułożeniu Lusia czyta sylabami i całe słowo, a kafelki podświetlają się po kolei.
 */
export class SyllableScene extends RoundScene {
  readonly id = 'syllables';
  private words: Word[] = [];
  private tiles: Tile[] = [];
  private slots: Container[] = [];
  private picture!: Sprite;
  private size = 150;
  private dragging = false;

  constructor() {
    super('sylaby', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.words = makeSyllableRound(this.game.rng, state.progress.levels.sylaby ?? 0);
    this.length = this.words.length;
  }

  protected override roundItems(): string[] {
    return this.words.map((w) => w.item);
  }

  private get word(): Word {
    return this.words[this.index]!;
  }

  protected promptLine(): string {
    return 'sylaby';
  }

  protected show(): void {
    const w = this.word;
    this.picture = new Sprite({ texture: this.art.items.get(w.item)!, anchor: 0.5 });
    this.picture.eventMode = 'none';
    this.layer.addChild(this.picture);
    this.slots = w.syl.map(() => {
      const slot = new Container();
      slot.addChild(new Graphics());
      slot.eventMode = 'none';
      this.layer.addChild(slot);
      return slot;
    });
    const colors = tileColors(this.game.rng, TILE_COLORS, w.syl.length);
    this.tiles = scramble(this.game.rng, w.syl).map((index) => {
      const view = new Container();
      view.addChild(new Graphics(), label(w.syl[index]!, 64, this.game.pixelRatio, '#ffffff'));
      const tile: Tile = { view, index, color: colors[index]!, home: { x: 0, y: 0 }, placed: false };
      draggable(view, {
        canStart: () => !tile.placed && !this.busy && !this.dragging,
        start: () => {
          this.dragging = true;
          this.idle = 0;
          this.tweens.killOf(view.scale);
          this.tweens.to(view.scale, { x: 1.08, y: 1.08 }, { duration: 0.1 });
          sfx.pop(this.game.sound, 1.2);
        },
        drop: (at) => this.drop(tile, at),
      });
      this.layer.addChild(view);
      return tile;
    });
    this.timers.after(0.4, () => say(this.game, this.guide, this.index === 0 ? 'sylaby' : `item-${w.item}`));
  }

  protected override appear(): void {
    void popIn(this.tweens, this.picture, 0.4);
    this.tiles.forEach((t, i) => void popIn(this.tweens, t.view, 0.35, 0.2 + i * 0.08));
  }

  private drop(t: Tile, at: Point): void {
    this.dragging = false;
    const slot = this.slots.findIndex((s) => Math.abs(at.x - s.x) < this.size * 0.6 && Math.abs(at.y - s.y) < this.size * 0.6);
    if (slot === t.index) return this.lock(t);
    if (slot >= 0) this.missed();
    this.tweens.to(t.view, { x: t.home.x, y: t.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(t.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  private lock(t: Tile): void {
    t.placed = true;
    t.view.eventMode = 'none';
    const s = this.slots[t.index]!;
    this.tweens.to(t.view, { x: s.x, y: s.y }, { duration: 0.12, ease: 'quadOut' });
    this.tweens.to(t.view.scale, { x: 1, y: 1 }, { duration: 0.12 });
    haptics.hit();
    sfx.plop(this.game.sound);
    this.burst(s.x, s.y, 12);
    if (this.tiles.every((x) => x.placed)) this.read();
  }

  /** Czytanie: kafelki podskakują po kolei (sylaby), potem całe słowo i obrazek. */
  private read(): void {
    this.busy = true;
    const len = say(this.game, this.guide, `czytaj-${this.word.item}`);
    const ordered = [...this.tiles].sort((a, b) => a.index - b.index);
    const per = Math.max(0.45, (len * 0.6) / ordered.length);
    ordered.forEach((t, i) =>
      this.timers.after(0.1 + i * per, () => {
        const y = t.view.y;
        void this.tweens.to(t.view, { y: y - 24 }, { duration: 0.12, yoyo: true, repeat: 1, ease: 'quadOut' }).done.then(() => (t.view.y = y));
      }),
    );
    this.timers.after(0.1 + ordered.length * per, () => {
      void pulse(this.tweens, this.picture, 0.15, 0.35);
      this.burst(this.picture.x, this.picture.y, 30);
    });
    this.solved(len);
  }

  /** Playtest. */
  solve(): void {
    for (const t of this.tiles) if (!t.placed) this.lock(t);
  }

  /** Podpowiedź: pierwszy brakujący kafelek podjeżdża w stronę swojego miejsca. */
  protected hint(): void {
    const t = [...this.tiles].filter((x) => !x.placed).sort((a, b) => a.index - b.index)[0];
    if (!t) return;
    const s = this.slots[t.index]!;
    void this.tweens
      .to(t.view, { x: t.home.x + (s.x - t.home.x) * 0.4, y: t.home.y + (s.y - t.home.y) * 0.4 }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 })
      .done.then(() => t.view.position.set(t.home.x, t.home.y));
  }

  protected place(): void {
    if (!this.tiles.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const cx = (left + right) / 2;
    const n = this.word.syl.length;
    this.size = Math.min(160, (right - left - 40) / (n + 1));
    const s = this.size;
    const pic = this.picture;
    pic.scale.set(Math.min(200, h * 0.28) / Math.max(pic.texture.width, pic.texture.height));
    pic.position.set(cx, safe.top + 90 + Math.min(200, h * 0.28) / 2);
    const slotY = h * 0.56;
    this.slots.forEach((slot, i) => {
      slot.position.set(cx + (i - (n - 1) / 2) * (s + 16), slotY);
      (slot.children[0] as Graphics)
        .clear()
        .roundRect(-s / 2, -s * 0.4, s, s * 0.8, 22)
        .fill({ color: 0xffffff, alpha: 0.6 })
        .stroke({ color: COLORS.ink, width: 4, alpha: 0.5 });
    });
    this.tiles.forEach((t, i) => {
      t.home = { x: cx + (i - (n - 1) / 2) * (s + 40), y: h - 90 };
      if (!t.placed) t.view.position.set(t.home.x, t.home.y);
      (t.view.children[0] as Graphics)
        .clear()
        .roundRect(-s / 2, -s * 0.4 + 6, s, s * 0.8, 22)
        .fill({ color: 0x000000, alpha: 0.14 })
        .roundRect(-s / 2, -s * 0.4, s, s * 0.8, 22)
        .fill({ color: t.color })
        .stroke({ color: COLORS.ink, width: 5 });
      t.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= s / 2 + 8 && Math.abs(y) <= s * 0.4 + 8 };
    });
  }
}
