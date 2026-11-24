import { Container, Graphics } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { barCount, BARS, makeMelody, MELODY_ROUND } from '../sim/melody.ts';
import { state } from '../state.ts';
import { COLORS, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';
import { needsHand } from '../sim/onboarding.ts';

const BAR_COLORS = [0xe8413c, 0xff8a2b, 0xffd23f, 0x7ad35a, 0x3d8bff, 0x9b5de5];

/**
 * Melodia (Pracownia Malucha): Lusia gra kilka dźwięków na cymbałkach (sztabki świecą), dziecko powtarza.
 * Pomyłka: sztabka kręci głową i melodia gra jeszcze raz (bez przegrywania).
 */
/** Kolor przygaszonych sztabek w czasie pokazu melodii. */
const DIM = 0x9a9a9a;

export class MelodyScene extends RoundScene {
  readonly id = 'melody';
  private bars: Container[] = [];
  private melody: number[] = [];
  private pos = 0;
  /** Lusia gra: dotyk zablokowany. */
  private playing = false;

  constructor() {
    super('melodia', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.length = MELODY_ROUND;
  }

  protected promptLine(): string {
    return 'melodia';
  }

  protected show(): void {
    const level = state.progress.levels.melodia ?? 0;
    this.melody = makeMelody(this.game.rng, level, this.index);
    this.pos = 0;
    const frame = new Graphics();
    frame.label = 'frame';
    frame.eventMode = 'none';
    this.layer.addChild(frame);
    this.bars = Array.from({ length: barCount(level) }, (_, i) => {
      const bar = new Container();
      bar.addChild(new Graphics());
      bar.eventMode = 'static';
      bar.cursor = 'pointer';
      bar.on('pointerdown', () => this.hit(i));
      this.layer.addChild(bar);
      return bar;
    });
    // Polecenie (pierwsze zadanie), potem melodia. Do końca pokazu sztabki nie grają (stuknięcia przed pokazem
    // i tak by przepadły, bo pokaz zeruje postęp).
    this.listen(true);
    const first = this.index === 0;
    this.timers.after(0.4, () => {
      const len = first ? say(this.game, this.guide, 'melodia') : 0;
      this.timers.after(len + 0.4, () => this.play());
    });
  }

  protected override appear(): void {
    this.bars.forEach((b, i) => void popIn(this.tweens, b, 0.3, i * 0.05));
  }

  /** Dźwięk sztabki (cymbałki: czysty ton z jasnym alikwotem). */
  private ring(i: number): void {
    const f = BARS[i]!;
    this.game.sound.synth([
      { wave: 'sine', freq: f, duration: 0.7, volume: 0.32 },
      { wave: 'triangle', freq: f * 4, duration: 0.18, volume: 0.06 },
    ]);
    const bar = this.bars[i]!;
    void squash(this.tweens, bar, 0.12);
    this.glow(bar, BAR_COLORS[i]!);
    // W czasie pokazu grająca sztabka na chwilę rozbłyska z przygaszenia.
    if (this.playing) {
      bar.tint = 0xffffff;
      this.timers.after(0.6, () => this.playing && (bar.tint = DIM));
    }
  }

  private glow(bar: Container, color: number): void {
    const g = new Graphics().circle(0, 0, 70).fill({ color, alpha: 0.5 });
    g.eventMode = 'none';
    g.position.copyFrom(bar.position);
    g.y -= bar.height / 2 + 30;
    g.scale.set(0.3);
    this.layer.addChild(g);
    this.tweens.to(g.scale, { x: 1.2, y: 1.2 }, { duration: 0.45, ease: 'quadOut' });
    void this.tweens.to(g, { alpha: 0 }, { duration: 0.45 }).done.then(() => g.destroy());
  }

  /** Lusia gra melodię; potem kolej dziecka. */
  private play(): void {
    this.listen(true);
    this.pos = 0;
    void squash(this.tweens, this.guideSprite, 0.1);
    this.melody.forEach((b, k) => this.timers.after(k * 0.7, () => this.ring(b)));
    this.timers.after(this.melody.length * 0.7 + 0.1, () => this.listen(false));
  }

  /**
   * Faza słuchania (sztabki przygaszone, nie grają) albo kolej dziecka (pełny kolor i podskok wszystkich sztabek).
   * Bez tego dziecko nie wiedziało, czemu stuknięcia w czasie pokazu nic nie dają.
   */
  private listen(on: boolean): void {
    this.playing = on;
    for (const [i, b] of this.bars.entries()) {
      // Przyciemnienie kolorem, nie przezroczystością (przez półprzezroczyste sztabki prześwitywała rama).
      b.tint = on ? DIM : 0xffffff;
      if (!on) this.timers.after(i * 0.04, () => void squash(this.tweens, b, 0.1));
    }
    // Pierwszy raz w melodii: po pokazie Lusi rączka stuka w sztabki po kolei.
    if (!on && this.index === 0 && needsHand(state.progress, this.kind)) this.timers.after(0.3, () => this.demo());
  }

  private hit(i: number): void {
    if (this.playing || this.busy) return;
    this.idle = 0;
    haptics.tap();
    this.ring(i);
    if (i === this.melody[this.pos]) {
      this.pos++;
      if (this.pos >= this.melody.length) this.done();
      return;
    }
    // Pomyłka: sztabka „kręci głową”, melodia jeszcze raz.
    const bar = this.bars[i]!;
    const x = bar.x;
    void this.tweens.to(bar, { x: x + 10 }, { duration: 0.05, yoyo: true, repeat: 5 }).done.then(() => (bar.x = x));
    this.missed();
    this.listen(true);
    this.timers.after(1.4, () => this.play());
  }

  private done(): void {
    this.busy = true;
    this.timers.after(0.3, () => {
      for (const b of this.bars) void pulse(this.tweens, b, 0.1, 0.3);
      sfx.fanfare(this.game.sound);
      this.burst(this.bars[Math.floor(this.bars.length / 2)]!.x, this.bars[0]!.y - 120, 36);
      this.solved(0.4);
    });
  }

  /** Playtest: zagranie melodii. */
  solve(): void {
    this.playing = false;
    for (const b of this.melody) this.hit(b);
  }

  /** Podpowiedź: melodia jeszcze raz. */
  /** Pierwsze sztabki melodii po kolei (dopiero gdy Lusia skończy grać). */
  protected override gesture(): Gesture | null {
    if (this.playing || this.busy || !this.melody.length) return null;
    return { kind: 'tap', at: this.melody.slice(this.pos, this.pos + 3).map((b) => this.middle(this.bars[b]!)) };
  }

  protected hint(): void {
    if (!this.playing) this.play();
  }

  protected place(): void {
    if (!this.bars.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const n = this.bars.length;
    const bw = Math.min(110, (right - left) / n - 16);
    const cx = (left + right) / 2;
    const base = h - 110;
    // Rama cymbałków.
    const fw = n * (bw + 16) + 40;
    const frame = this.layer.children.find((c) => c.label === 'frame') as Graphics;
    frame
      .clear()
      .roundRect(cx - fw / 2, base - 40, fw, 70, 20)
      .fill({ color: 0x9a6236 })
      .stroke({ color: COLORS.ink, width: 6 });
    this.bars.forEach((bar, i) => {
      // Sztabki coraz krótsze (wyższy dźwięk), jak w prawdziwych cymbałkach.
      const bh = 330 - i * 30;
      bar.position.set(cx + (i - (n - 1) / 2) * (bw + 16), base);
      (bar.children[0] as Graphics)
        .clear()
        .roundRect(-bw / 2, -bh + 6, bw, bh, 22)
        .fill({ color: 0x000000, alpha: 0.15 })
        .roundRect(-bw / 2, -bh, bw, bh, 22)
        .fill({ color: BAR_COLORS[i]! })
        .stroke({ color: COLORS.ink, width: 5 })
        .circle(0, -bh + 26, 9)
        .fill({ color: 0xffffff, alpha: 0.8 })
        .circle(0, -26, 9)
        .fill({ color: 0xffffff, alpha: 0.8 })
        .roundRect(-bw / 2 + 12, -bh + 46, 12, bh - 92, 6)
        .fill({ color: 0xffffff, alpha: 0.25 });
      bar.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= bw / 2 + 8 && y <= 10 && y >= -bh - 10 };
    });
  }
}
