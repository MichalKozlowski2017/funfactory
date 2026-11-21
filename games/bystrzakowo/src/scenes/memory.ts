import { Container, Graphics, Sprite } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse } from '@funfactory/kit2d';
import { say, shadowNow, shadowOf } from '../assets.ts';
import { makeMemoryBoard, MEMORY_ROUND, memoryGrid, memoryMistakes, shadowPairs, type MemoryCard } from '../sim/memory.ts';
import { state } from '../state.ts';
import { COLORS, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';

interface CardView {
  card: MemoryCard;
  view: Container;
  front: Container;
  back: Container;
  open: boolean;
  matched: boolean;
}

/**
 * Memory (Polana Zagadek): karty odwrócone, odkrywa się po dwie. Para zostaje odkryta i lektor mówi nazwę,
 * inne odwracają się z powrotem. Na najwyższym poziomie para to obrazek i jego cień.
 */
export class MemoryScene extends RoundScene {
  readonly id = 'memory';
  private boards: MemoryCard[][] = [];
  private cards: CardView[] = [];
  private picked: CardView[] = [];
  private misses = 0;
  private size = 150;

  constructor() {
    super('memory', 'lusia');
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels.memory ?? 0;
    this.boards = Array.from({ length: MEMORY_ROUND }, () => makeMemoryBoard(this.game.rng, level));
    this.length = this.boards.length;
    if (shadowPairs(level)) await Promise.all(this.boards.flat().map((c) => shadowOf(c.item.id)));
  }

  protected promptLine(): string {
    return shadowPairs(state.progress.levels.memory ?? 0) ? 'memory-cien' : 'memory';
  }

  protected show(): void {
    this.picked = [];
    this.misses = 0;
    this.cards = this.boards[this.index]!.map((card) => {
      const view = new Container();
      const back = new Container();
      back.addChild(new Graphics());
      const front = new Container();
      const tex = card.shadow ? shadowNow(card.item.id)! : this.art.items.get(card.item.id)!;
      front.addChild(new Graphics(), new Sprite({ texture: tex, anchor: 0.5 }));
      front.visible = false;
      view.addChild(back, front);
      view.eventMode = 'static';
      view.cursor = 'pointer';
      const cv: CardView = { card, view, front, back, open: false, matched: false };
      view.on('pointertap', () => this.tap(cv));
      this.layer.addChild(view);
      return cv;
    });
    this.timers.after(0.4, () => say(this.game, this.guide, this.promptLine()));
  }

  protected override appear(): void {
    this.cards.forEach((c, i) => {
      void popIn(this.tweens, c.view, 0.3, i * 0.04);
      this.timers.after(i * 0.04, () => sfx.pop(this.game.sound, 0.9 + i * 0.03));
    });
  }

  private tap(c: CardView): void {
    if (this.busy || c.open || c.matched || this.picked.length >= 2) return;
    this.idle = 0;
    haptics.tap();
    sfx.pop(this.game.sound, 1.2);
    this.flip(c, true);
    this.picked.push(c);
    if (this.picked.length < 2) return;
    const [a, b] = this.picked as [CardView, CardView];
    if (a.card.item === b.card.item) {
      a.matched = b.matched = true;
      this.picked = [];
      this.timers.after(0.25, () => {
        for (const x of [a, b]) {
          void pulse(this.tweens, x.view, 0.15, 0.3);
          this.burst(x.view.x, x.view.y, 14);
          this.drawFront(x, true);
        }
        sfx.good(this.game.sound);
        haptics.success();
        const len = say(this.game, this.guide, `item-${a.card.item.id}`);
        if (this.cards.every((x) => x.matched)) {
          this.mistakes += memoryMistakes(this.misses, this.cards.length / 2);
          this.solved(len);
        }
      });
    } else {
      this.misses++;
      this.timers.after(1.1, () => {
        this.flip(a, false);
        this.flip(b, false);
        this.picked = [];
      });
    }
  }

  /** Odwrócenie karty: zwężenie do zera, zamiana stron, rozszerzenie. */
  private flip(c: CardView, open: boolean): void {
    c.open = open;
    this.tweens.killOf(c.view.scale);
    void this.tweens.to(c.view.scale, { x: 0 }, { duration: 0.1, ease: 'quadIn' }).done.then(() => {
      c.front.visible = open;
      c.back.visible = !open;
      this.tweens.to(c.view.scale, { x: 1 }, { duration: 0.12, ease: 'quadOut' });
    });
  }

  private drawFront(c: CardView, good: boolean): void {
    const s = this.size;
    (c.front.children[0] as Graphics)
      .clear()
      .roundRect(-s / 2, -s / 2 + 6, s, s, s * 0.16)
      .fill({ color: 0x000000, alpha: 0.12 })
      .roundRect(-s / 2, -s / 2, s, s, s * 0.16)
      .fill({ color: COLORS.card })
      .stroke({ color: good ? COLORS.good : COLORS.ink, width: good ? 8 : 5 });
  }

  /** Playtest: odkrywa wszystkie pary. */
  solve(): void {
    const left = this.cards.filter((c) => !c.matched);
    for (const c of left) {
      if (c.matched) continue;
      const twin = left.find((x) => x !== c && !x.matched && x.card.item === c.card.item)!;
      this.picked = [];
      this.tap(c);
      this.tap(twin);
    }
  }

  /** Podpowiedź: para pierwszej nieodkrytej karty mrugnie. */
  protected hint(): void {
    const c = this.cards.find((x) => !x.matched && !x.open);
    if (!c) return;
    const twin = this.cards.find((x) => x !== c && x.card.item === c.card.item)!;
    for (const x of [c, twin]) void this.tweens.to(x.view, { rotation: 0.1 }, { duration: 0.12, yoyo: true, repeat: 5, ease: 'sineInOut' }).done.then(() => (x.view.rotation = 0));
  }

  protected place(): void {
    if (!this.cards.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const top = safe.top + 110;
    const bottom = h - 30;
    const { cols, rows } = memoryGrid(this.cards.length);
    const gap = 18;
    this.size = Math.min(190, (right - left - gap * (cols - 1)) / cols, (bottom - top - gap * (rows - 1)) / rows);
    const s = this.size;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    this.cards.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      c.view.position.set(cx + (col - (cols - 1) / 2) * (s + gap), cy + (row - (rows - 1) / 2) * (s + gap));
      // Rewers: fioletowa karta z gwiazdką.
      (c.back.children[0] as Graphics)
        .clear()
        .roundRect(-s / 2, -s / 2 + 6, s, s, s * 0.16)
        .fill({ color: 0x000000, alpha: 0.14 })
        .roundRect(-s / 2, -s / 2, s, s, s * 0.16)
        .fill({ color: 0x9b7be0 })
        .stroke({ color: COLORS.ink, width: 5 })
        .roundRect(-s / 2 + 12, -s / 2 + 12, s - 24, s - 24, s * 0.12)
        .stroke({ color: 0xffffff, width: 3, alpha: 0.5 })
        .star(0, 0, 5, s * 0.22, s * 0.1)
        .fill({ color: COLORS.sun })
        .stroke({ color: COLORS.ink, width: 3, join: 'round' });
      this.drawFront(c, c.matched);
      const pic = c.front.children[1] as Sprite;
      pic.scale.set((s * 0.78) / Math.max(pic.texture.width, pic.texture.height));
      c.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= s / 2 && Math.abs(y) <= s / 2 };
    });
  }
}
