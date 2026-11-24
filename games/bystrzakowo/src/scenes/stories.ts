import { Container, Graphics, Sprite, Texture, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse } from '@funfactory/kit2d';
import { say, storyFrame } from '../assets.ts';
import { FRAMES, makeStoryRound, markStoriesSeen, presetFrames, type Story } from '../sim/stories.ts';
import { saveState, state } from '../state.ts';
import { COLORS, draggable, label, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

interface Card {
  view: Container;
  frame: number;
  home: { x: number; y: number };
  placed: boolean;
}

/**
 * Historyjki obrazkowe (Warsztat Bazyla): ponumerowane miejsca 1–2–3 i rozsypane kadry.
 * Kadr upuszczony na swoje miejsce wskakuje; po ułożeniu Bazyl opowiada historyjkę, kadry świecą po kolei.
 */
export class StoryScene extends RoundScene {
  readonly id = 'stories';
  private stories: Story[] = [];
  private slots: Container[] = [];
  private cards: Card[] = [];
  private textures: Texture[] = [];
  private size = 200;
  private dragging = false;

  constructor() {
    super('historyjki', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    this.stories = makeStoryRound(this.game.rng, state.progress.storiesSeen);
    this.length = this.stories.length;
    // Od razu zapisujemy jako obejrzane: przerwana runda też się liczy, inaczej po wyjściu wracałyby te same.
    state.progress.storiesSeen = markStoriesSeen(state.progress.storiesSeen ?? [], this.stories);
    void saveState();
  }

  protected promptLine(): string {
    return 'historyjki';
  }

  protected show(): void {
    const story = this.stories[this.index]!;
    this.textures = Array.from({ length: FRAMES }, (_, i) => storyFrame(story, i) ?? Texture.EMPTY);
    this.slots = Array.from({ length: FRAMES }, (_, i) => {
      const slot = new Container();
      slot.addChild(new Graphics(), label(String(i + 1), 54, this.game.pixelRatio, '#ffffff'));
      slot.eventMode = 'none';
      this.layer.addChild(slot);
      return slot;
    });
    const preset = presetFrames(state.progress.levels.historyjki ?? 0);
    const order = this.game.rng.shuffle(Array.from({ length: FRAMES }, (_, i) => i).filter((i) => i >= preset));
    const all = [...Array.from({ length: preset }, (_, i) => i), ...order];
    this.cards = all.map((frame) => {
      const view = new Container();
      view.addChild(new Graphics(), new Sprite({ texture: this.textures[frame]!, anchor: 0.5 }));
      const card: Card = { view, frame, home: { x: 0, y: 0 }, placed: frame < preset };
      if (!card.placed)
        draggable(view, {
          tap: () => this.tapHint(),
          canStart: () => !card.placed && !this.busy && !this.dragging,
          start: () => {
            this.tweens.killOf(view);
            this.dragging = true;
            this.idle = 0;
            this.tweens.killOf(view.scale);
            this.tweens.to(view.scale, { x: 1.06, y: 1.06 }, { duration: 0.1 });
            sfx.pop(this.game.sound, 1.2);
          },
          drop: (at) => this.drop(card, at),
        });
      else view.eventMode = 'none';
      this.layer.addChild(view);
      return card;
    });
    this.timers.after(0.4, () => say(this.game, this.guide, 'historyjki'));
  }

  protected override appear(): void {
    this.cards.forEach((c, i) => void popIn(this.tweens, c.view, 0.35, 0.1 + i * 0.08));
  }

  private drop(c: Card, at: Point): void {
    this.dragging = false;
    const slot = this.slots.findIndex((s) => Math.abs(at.x - s.x) < this.size * 0.55 && Math.abs(at.y - s.y) < this.size * 0.6);
    const free = slot >= 0 && !this.cards.some((o) => o.placed && o.frame === slot);
    if (slot === c.frame && free) return this.lock(c);
    if (slot >= 0 && free) this.missed();
    this.tweens.to(c.view, { x: c.home.x, y: c.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(c.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  private lock(c: Card): void {
    c.placed = true;
    c.view.eventMode = 'none';
    const s = this.slots[c.frame]!;
    this.tweens.to(c.view, { x: s.x, y: s.y }, { duration: 0.12, ease: 'quadOut' });
    this.tweens.to(c.view.scale, { x: 1, y: 1 }, { duration: 0.12 });
    haptics.hit();
    sfx.plop(this.game.sound);
    this.burst(s.x, s.y, 14);
    if (this.cards.every((x) => x.placed)) this.tell();
  }

  /** Historyjka: Bazyl opowiada, kadry podskakują po kolei. */
  private tell(): void {
    this.busy = true;
    const len = say(this.game, this.guide, `historia-${this.stories[this.index]}`);
    const per = Math.max(0.7, len / FRAMES);
    const sorted = [...this.cards].sort((a, b) => a.frame - b.frame);
    sorted.forEach((c, i) =>
      this.timers.after(0.15 + i * per, () => {
        void pulse(this.tweens, c.view, 0.12, 0.35);
        sfx.pop(this.game.sound, 1 + i * 0.15);
      }),
    );
    this.timers.after(0.15 + FRAMES * per, () => this.burst(this.slots[1]!.x, this.slots[1]!.y, 30));
    this.solved(len);
  }

  /** Playtest. */
  solve(): void {
    for (const c of this.cards) if (!c.placed) this.lock(c);
  }

  /** Podpowiedź: kadr, który ma być następny, podjeżdża w stronę swojego miejsca. */
  protected override gesture(): Gesture | null {
    const c = [...this.cards].filter((x) => !x.placed).sort((a, b) => a.frame - b.frame)[0];
    const s = c && this.slots[c.frame];
    return c && s ? { kind: 'drag', from: this.spot(c.view), to: this.spot(s) } : null;
  }

  protected hint(): void {
    const c = [...this.cards].filter((x) => !x.placed).sort((a, b) => a.frame - b.frame)[0];
    if (!c) return;
    const s = this.slots[c.frame]!;
    // Chwycenie elementu przerywa podpowiedź; wtedy nie cofamy go na start (dziecko mogło go już położyć).
    const tw = this.tweens
      .to(c.view, { x: c.home.x + (s.x - c.home.x) * 0.4, y: c.home.y + (s.y - c.home.y) * 0.4 }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 });
    void tw.done.then(() => !tw.killed && c.view.position.set(c.home.x, c.home.y));
  }

  protected place(): void {
    if (!this.cards.length) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const cx = (left + right) / 2;
    this.size = Math.min(210, (right - left - 60) / FRAMES, (h - 220) / 2.2);
    const s = this.size;
    const gap = 30;
    const slotY = safe.top + 120 + s / 2;
    this.slots.forEach((slot, i) => {
      slot.position.set(cx + (i - (FRAMES - 1) / 2) * (s + gap), slotY);
      (slot.children[0] as Graphics)
        .clear()
        .roundRect(-s / 2, -s / 2, s, s, s * 0.14)
        .fill({ color: 0xffffff, alpha: 0.5 })
        .stroke({ color: COLORS.ink, width: 4, alpha: 0.5 })
        .circle(-s / 2 + 26, -s / 2 + 26, 22)
        .fill({ color: COLORS.sun })
        .stroke({ color: COLORS.ink, width: 3 });
      (slot.children[1] as Container).position.set(-s / 2 + 26, -s / 2 + 26);
      (slot.children[1] as Container).scale.set(0.6);
    });
    const free = this.cards.filter((c) => !c.placed);
    free.forEach((c, i) => {
      c.home = { x: cx + (i - (free.length - 1) / 2) * (s + gap), y: h - s / 2 - 30 };
    });
    this.cards.forEach((c) => {
      const pos = c.placed ? this.slots[c.frame]! : c.home;
      c.view.position.set(pos.x, pos.y);
      (c.view.children[0] as Graphics)
        .clear()
        .roundRect(-s / 2, -s / 2 + 6, s, s, s * 0.14)
        .fill({ color: 0x000000, alpha: 0.12 })
        .roundRect(-s / 2, -s / 2, s, s, s * 0.14)
        .fill({ color: COLORS.card })
        .stroke({ color: COLORS.ink, width: 5 });
      const pic = c.view.children[1] as Sprite;
      if (pic.texture.width > 1) pic.scale.set((s * 0.84) / Math.max(pic.texture.width, pic.texture.height));
      c.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= s / 2 && Math.abs(y) <= s / 2 };
    });
  }
}
