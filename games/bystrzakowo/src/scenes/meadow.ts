import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { idleBreath, Particles, dotTexture, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, type Art } from '../assets.ts';
import type { PuzzleKind } from '../sim/puzzles.ts';
import { state } from '../state.ts';
import { COLORS, cover, label, sfx } from '../ui.ts';
import { PuzzleScene } from './puzzle.ts';

const HOUSES: PuzzleKind[] = ['cienie', 'pasuje', 'liczenie'];

/** Polana Bystrzakowa: trzy domki-zagadki, przewodnicy, licznik naklejek. */
export class MeadowScene extends Scene {
  readonly id = 'meadow';
  private art!: Art;
  private bg!: Sprite;
  private title!: Text;
  private readonly houses: Container[] = [];
  private lusia!: Sprite;
  private bazyl!: Sprite;
  private stickers!: Container;
  private stickerText!: Text;
  private particles!: Particles;
  private greeted = false;
  private leaving = false;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    const pr = this.game.pixelRatio;
    this.bg = new Sprite(this.art.meadow);
    this.title = label('Bystrzakowo', 84, pr, '#ffb347');
    this.addChild(this.bg, this.title);

    for (const kind of HOUSES) {
      const house = new Container();
      const sprite = new Sprite({ texture: this.art.houses[kind], anchor: { x: 0.5, y: 1 } });
      sprite.scale.set(300 / sprite.texture.height);
      house.addChild(sprite, this.emblem(kind));
      house.eventMode = 'static';
      house.cursor = 'pointer';
      house.on('pointertap', () => this.open(kind, house));
      this.houses.push(house);
      this.addChild(house);
    }

    this.lusia = new Sprite({ texture: this.art.lusia, anchor: { x: 0.5, y: 1 } });
    this.bazyl = new Sprite({ texture: this.art.bazyl, anchor: { x: 0.5, y: 1 } });
    for (const [guide, sprite] of [
      ['lusia', this.lusia],
      ['bazyl', this.bazyl],
    ] as const) {
      sprite.scale.set(330 / sprite.texture.height);
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointertap', () => {
        haptics.tap();
        void squash(this.tweens, sprite, 0.12);
        say(this.game, guide, 'witaj');
      });
      this.addChild(sprite);
      idleBreath(this.tweens, sprite, 0.03, 1.8 + (guide === 'bazyl' ? 0.3 : 0));
    }

    this.stickers = new Container();
    const star = new Graphics().star(0, 0, 5, 38, 18).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
    this.stickerText = label(String(state.progress.stickers.length), 48, pr);
    this.stickerText.anchor.set(0, 0.5);
    this.stickerText.x = 50;
    this.stickers.addChild(star, this.stickerText);
    this.addChild(this.stickers);

    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.addChild(this.particles.view);

    // Powitanie przy pierwszym dotknięciu (przeglądarki odblokowują dźwięk dopiero po geście).
    this.eventMode = 'static';
    this.on('pointerdown', () => {
      if (this.greeted || state.greeted) return;
      this.greeted = state.greeted = true;
      this.timers.after(0.15, () => say(this.game, 'lusia', 'witaj'));
    });
    this.game.markReady();
  }

  /** Znak na domku: co tam za zagadka (dziecko nie czyta, więc obrazkiem). */
  private emblem(kind: PuzzleKind): Container {
    const c = new Container();
    const disc = new Graphics().circle(0, 0, 50).fill({ color: COLORS.card }).stroke({ color: COLORS.ink, width: 6 });
    c.addChild(disc);
    if (kind === 'cienie') {
      const s = new Sprite({ texture: this.art.shadows.get('kot')!, anchor: 0.5 });
      s.scale.set(76 / Math.max(s.texture.width, s.texture.height));
      c.addChild(s);
    } else c.addChild(label(kind === 'pasuje' ? '?' : '123', kind === 'pasuje' ? 64 : 40, this.game.pixelRatio, kind === 'pasuje' ? '#ff7a8a' : '#5cb3ff'));
    c.y = -330;
    return c;
  }

  private open(kind: PuzzleKind, house: Container): void {
    if (this.leaving) return;
    this.leaving = true;
    haptics.hit();
    sfx.pop(this.game.sound);
    void squash(this.tweens, house, 0.18);
    this.particles.burst(house.x, house.y - 150, { count: 24, speed: [200, 520], life: [0.4, 0.8], gravity: 900, scale: [0.6, 1.2], colors: COLORS.confetti });
    this.timers.after(0.35, () => void this.game.scenes.go(new PuzzleScene(kind), { fade: 0.3, color: 0xfff6e8 }));
  }

  override update(dt: number): void {
    this.particles.update(dt);
  }

  override resize(view: View): void {
    const { width: w, height: h, safe } = view;
    cover(this.bg, w, h);
    this.title.position.set(w / 2, 90 + safe.top);
    const left = safe.left + 150;
    const right = w - safe.right - 150;
    this.lusia.position.set(left, h - 10);
    this.bazyl.position.set(right, h - 10);
    // Domki między przewodnikami, na wzgórzu.
    const span = right - left - 260;
    HOUSES.forEach((_, i) => {
      const house = this.houses[i]!;
      house.position.set(left + 130 + (span * (i + 0.5)) / HOUSES.length, h * 0.5 + 200 + (i === 1 ? -30 : 0));
      const scale = Math.min(1, span / HOUSES.length / 260);
      house.scale.set(scale);
    });
    this.stickers.position.set(w - safe.right - 130, 70 + safe.top);
  }
}
