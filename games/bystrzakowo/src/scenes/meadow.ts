import { Container, Graphics, Sprite, type Text, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, shadowOf, startMusic, type Art } from '../assets.ts';
import { playable, type PuzzleKind } from '../sim/puzzles.ts';
import { state } from '../state.ts';
import { COLORS, cover, label, sfx } from '../ui.ts';
import { AlbumScene } from './album.ts';
import { PuzzleScene } from './puzzle.ts';

/** Domki: tylny rząd (dalej, mniejsze) i przedni rząd. */
const BACK: PuzzleKind[] = ['kolory', 'gloski', 'mamy'];
const FRONT: PuzzleKind[] = ['cienie', 'pasuje', 'liczenie'];

/** Polana Bystrzakowa: sześć domków-zagadek, przewodnicy, album naklejek. */
export class MeadowScene extends Scene {
  readonly id = 'meadow';
  private art!: Art;
  private bg!: Sprite;
  private title!: Text;
  private readonly houses = new Map<PuzzleKind, Container>();
  private lusia!: Sprite;
  private bazyl!: Sprite;
  private album!: Container;
  private particles!: Particles;
  private leaving = false;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    const catShadow = await shadowOf('kot');
    const pr = this.game.pixelRatio;
    this.bg = new Sprite(this.art.meadow);
    this.title = label('Bystrzakowo', 84, pr, '#ffb347');
    this.addChild(this.bg, this.title);

    for (const kind of [...BACK, ...FRONT]) {
      const house = new Container();
      const sprite = new Sprite({ texture: this.art.houses[kind], anchor: { x: 0.5, y: 1 } });
      sprite.scale.set(300 / sprite.texture.height);
      house.addChild(sprite, this.emblem(kind, catShadow));
      house.eventMode = 'static';
      house.cursor = 'pointer';
      house.on('pointertap', () => this.open(kind, house));
      // Domek bez treści (brakuje obrazków w katalogu) się nie pokazuje.
      house.visible = playable(kind, this.game.rng);
      this.houses.set(kind, house);
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

    // Album: książeczka z gwiazdką i liczbą naklejek.
    this.album = new Container();
    const book = new Graphics()
      .roundRect(-62, -48, 124, 96, 16)
      .fill({ color: 0xff8fb1 })
      .stroke({ color: COLORS.ink, width: 6 })
      .rect(-6, -48, 12, 96)
      .fill({ color: 0xe86a92 })
      .star(0, -2, 5, 30, 14)
      .fill({ color: COLORS.sun })
      .stroke({ color: COLORS.ink, width: 4, join: 'round' });
    const count: Text = label(String(state.progress.stickers.length), 40, pr);
    count.position.set(0, 72);
    this.album.addChild(book, count);
    this.album.eventMode = 'static';
    this.album.cursor = 'pointer';
    this.album.hitArea = { contains: (x: number, y: number) => Math.abs(x) < 80 && y > -70 && y < 100 };
    this.album.on('pointertap', () => {
      if (this.leaving) return;
      this.leaving = true;
      haptics.hit();
      sfx.pop(this.game.sound);
      void squash(this.tweens, this.album, 0.2);
      this.timers.after(0.25, () => void this.game.scenes.go(new AlbumScene(), { fade: 0.3, color: 0xfff6e8 }));
    });
    this.addChild(this.album);
    this.tweens.to(this.album, { rotation: 0.06 }, { duration: 1.2, yoyo: true, repeat: -1, ease: 'sineInOut' });

    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.addChild(this.particles.view);

    // Powitanie i muzyka przy pierwszym dotknięciu (przeglądarki odblokowują dźwięk dopiero po geście).
    this.eventMode = 'static';
    this.on('pointerdown', () => {
      startMusic(this.game);
      if (state.greeted) return;
      state.greeted = true;
      this.timers.after(0.15, () => say(this.game, 'lusia', 'witaj'));
    });
    this.game.markReady();
  }

  /** Znak na domku: co tam za zagadka (dziecko nie czyta, więc obrazkiem). */
  private emblem(kind: PuzzleKind, catShadow: Texture): Container {
    const c = new Container();
    c.addChild(new Graphics().circle(0, 0, 50).fill({ color: COLORS.card }).stroke({ color: COLORS.ink, width: 6 }));
    const pr = this.game.pixelRatio;
    if (kind === 'cienie') {
      const s = new Sprite({ texture: catShadow, anchor: 0.5 });
      s.scale.set(76 / Math.max(s.texture.width, s.texture.height));
      c.addChild(s);
    } else if (kind === 'pasuje') c.addChild(label('?', 64, pr, '#ff7a8a'));
    else if (kind === 'liczenie') c.addChild(label('123', 40, pr, '#5cb3ff'));
    else if (kind === 'gloski') c.addChild(label('Aa', 48, pr, '#9b5de5'));
    else if (kind === 'kolory') {
      const g = new Graphics();
      [0xe8413c, 0xffd23f, 0x3d8bff, 0x4cbf56].forEach((color, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.circle(Math.cos(a) * 18, Math.sin(a) * 18, 15).fill({ color }).stroke({ color: COLORS.ink, width: 3 });
      });
      c.addChild(g);
    } else {
      // mamy: dwa serduszka, duże i małe
      const big = new Graphics();
      const draw = (g: Graphics, s: number) =>
        g
          .moveTo(0, s * 0.45)
          .bezierCurveTo(-s * 1.1, -s * 0.25, -s * 0.5, -s * 1.05, 0, -s * 0.4)
          .bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.25, 0, s * 0.45)
          .fill({ color: 0xff6f91 })
          .stroke({ color: COLORS.ink, width: 3 });
      draw(big, 30);
      big.position.set(-8, 4);
      const small = new Graphics();
      draw(small, 17);
      small.position.set(22, 16);
      c.addChild(big, small);
    }
    c.y = -330;
    return c;
  }

  private open(kind: PuzzleKind, house: Container): void {
    if (this.leaving) return;
    this.leaving = true;
    startMusic(this.game);
    haptics.hit();
    sfx.pop(this.game.sound);
    void squash(this.tweens, house, 0.18);
    const p = this.toLocal(house.getGlobalPosition());
    this.particles.burst(p.x, p.y - 120, { count: 24, speed: [200, 520], life: [0.4, 0.8], gravity: 900, scale: [0.6, 1.2], colors: COLORS.confetti });
    this.timers.after(0.35, () => void this.game.scenes.go(new PuzzleScene(kind), { fade: 0.3, color: 0xfff6e8 }));
  }

  override update(dt: number): void {
    this.particles.update(dt);
  }

  override resize(view: View): void {
    const { width: w, height: h, safe } = view;
    cover(this.bg, w, h);
    this.title.position.set(w / 2, 80 + safe.top);
    const left = safe.left + 150;
    const right = w - safe.right - 150;
    this.lusia.position.set(left, h - 10);
    this.bazyl.position.set(right, h - 10);
    // Domki między przewodnikami: tylny rząd wyżej i mniejszy.
    const span = right - left - 230;
    const place = (kinds: PuzzleKind[], y: number, maxScale: number) => {
      const scale = Math.min(maxScale, span / kinds.length / 270);
      kinds.forEach((kind, i) => {
        const house = this.houses.get(kind)!;
        house.position.set(left + 115 + (span * (i + 0.5)) / kinds.length, y);
        house.scale.set(scale);
      });
    };
    place(BACK, h * 0.5 + 75, 0.62);
    place(FRONT, h - 40, 0.9);
    this.album.position.set(w - safe.right - 110, 90 + safe.top);
  }
}
