import { Container, Graphics, Text } from 'pixi.js';
import { hexToNumber, mix, palettes } from '@funfactory/art';
import { haptics } from '@funfactory/core';
import {
  Button,
  dotTexture,
  gestures,
  idleBreath,
  Particles,
  popIn,
  pulse,
  Scene,
  Shaker,
  squash,
  stretch,
  type View,
} from '@funfactory/kit2d';
import { BlobCharacter } from './blob-character.ts';

const pal = palettes.candy;

/**
 * Stanowisko testowe zestawu narzędzi: postać wektorowa, juice, cząsteczki, przycisk, gesty.
 * Stuknięcie = rozbryzg + trzęsienie, przeciągnięcie = przesuwanie postaci, przycisk = skok.
 */
export class KitScene extends Scene {
  readonly id = 'kit';
  private readonly world = new Container();
  private readonly backdrop = new Graphics();
  private readonly ui = new Container();
  private hero!: BlobCharacter;
  private sparks!: Particles;
  private shaker!: Shaker;
  private button!: Button;
  private counter!: Text;
  private taps = 0;
  private targetX = 360;

  override async enter(): Promise<void> {
    const game = this.game;
    this.addChild(this.backdrop, this.world, this.ui);
    this.shaker = new Shaker(this.world, game.rng);

    this.hero = await BlobCharacter.create(pal.swatches[0], pal.ink, game.pixelRatio);
    this.world.addChild(this.hero);
    idleBreath(this.tweens, this.hero.body);

    this.sparks = new Particles(dotTexture(game.app.renderer, 10), game.rng);
    this.world.addChild(this.sparks.view);

    this.counter = new Text({
      text: 'stuknij',
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 40, fontWeight: '800', fill: pal.surface },
      anchor: 0.5,
      resolution: game.pixelRatio,
    });
    this.button = new Button({
      label: 'Skok',
      color: pal.accent,
      resolution: game.pixelRatio,
      onTap: () => void this.jump(),
    });
    this.ui.addChild(this.counter, this.button);

    const input = gestures(this.backdrop);
    input.on('tap', ({ x, y }) => this.splash(x, y));
    input.on('drag', ({ x, dx }) => {
      this.targetX = Math.max(120, Math.min(600, x));
      this.hero.push(dx * 60);
    });
    input.on('swipe', ({ dir }) => {
      if (dir === 'up') void this.jump();
    });

    void popIn(this.tweens, this.hero, 0.5);
    void popIn(this.tweens, this.button, 0.45, 0.15);
    this.timers.after(0.7, () => {
      this.splash(360, this.game.view.height * 0.4);
      this.game.markReady();
    });
  }

  override resize(view: View): void {
    const top = mix(pal.bg, pal.accent, 0.15);
    this.backdrop.clear().rect(0, 0, view.width, view.height).fill({ color: hexToNumber(pal.bg) });
    this.backdrop.rect(0, view.height * 0.62, view.width, view.height * 0.38).fill({ color: hexToNumber(top) });
    this.hero.position.set(this.targetX, view.height * 0.62);
    this.shaker.setBase(0, 0);
    this.counter.position.set(view.width / 2, view.safe.top + 90);
    this.button.position.set(view.width / 2, view.height - view.safe.bottom - 140);
  }

  override update(dt: number): void {
    this.hero.x += (this.targetX - this.hero.x) * (1 - Math.exp(-10 * dt));
    this.hero.tick(dt);
    this.button.tick(dt);
    this.sparks.update(dt);
    this.shaker.update(dt);
  }

  private splash(x: number, y: number): void {
    this.taps++;
    this.counter.text = `${this.taps}`;
    void pulse(this.tweens, this.counter, 0.3);
    this.sparks.burst(x, y, {
      count: 28,
      speed: [260, 720],
      life: [0.4, 0.9],
      scale: [0.6, 1.4],
      endScale: 0.2,
      gravity: 1400,
      drag: 1.5,
      colors: pal.swatches.map(hexToNumber),
    });
    this.shaker.add(0.35);
    haptics.hit();
    void squash(this.tweens, this.hero.body, 0.18);
  }

  private async jump(): Promise<void> {
    const hero = this.hero;
    const ground = this.game.view.height * 0.62;
    if (hero.y < ground - 1) return;
    await squash(this.tweens, hero.body, 0.22, 0.12);
    void stretch(this.tweens, hero.body, 0.18, 0.3);
    await this.tweens.to(hero, { y: ground - 320 }, { duration: 0.32, ease: 'quadOut' }).done;
    await this.tweens.to(hero, { y: ground }, { duration: 0.28, ease: 'quadIn' }).done;
    this.sparks.burst(hero.x, ground, {
      count: 14,
      speed: [120, 320],
      angle: -Math.PI / 2,
      spread: Math.PI * 0.9,
      life: [0.25, 0.5],
      scale: [0.5, 1],
      gravity: 900,
      colors: [hexToNumber(pal.surface)],
    });
    this.shaker.add(0.25);
    haptics.hit();
    void squash(this.tweens, hero.body, 0.3, 0.3);
  }
}
