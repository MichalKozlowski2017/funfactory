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
 * Melody (Little Studio): Lusia plays a few notes on a xylophone (the bars light up), the child repeats them.
 * Mistake: the bar shakes its head and the melody plays again (no losing).
 */
/** Colour of the dimmed bars while the melody is being shown. */
const DIM = 0x9a9a9a;

export class MelodyScene extends RoundScene {
  readonly id = 'melody';
  private bars: Container[] = [];
  private melody: number[] = [];
  private pos = 0;
  /** Lusia is playing: touch is blocked. */
  private playing = false;

  constructor() {
    super('melody', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.length = MELODY_ROUND;
  }

  protected promptLine(): string {
    return 'melody';
  }

  protected show(): void {
    const level = state.progress.levels.melody ?? 0;
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
    // Instruction (first task), then the melody. The bars don't play until the demo ends (taps before the demo
    // would be lost anyway, since the demo resets progress).
    this.listen(true);
    const first = this.index === 0;
    this.timers.after(0.4, () => {
      const len = first ? say(this.game, this.guide, 'melody') : 0;
      this.timers.after(len + 0.4, () => this.play());
    });
  }

  protected override appear(): void {
    this.bars.forEach((b, i) => void popIn(this.tweens, b, 0.3, i * 0.05));
  }

  /** Bar sound (xylophone: pure tone with a bright overtone). */
  private ring(i: number): void {
    const f = BARS[i]!;
    this.game.sound.synth([
      { wave: 'sine', freq: f, duration: 0.7, volume: 0.32 },
      { wave: 'triangle', freq: f * 4, duration: 0.18, volume: 0.06 },
    ]);
    const bar = this.bars[i]!;
    void squash(this.tweens, bar, 0.12);
    this.glow(bar, BAR_COLORS[i]!);
    // During the demo the playing bar briefly lights up from its dimmed state.
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

  /** Lusia plays the melody; then it is the child's turn. */
  private play(): void {
    this.listen(true);
    this.pos = 0;
    void squash(this.tweens, this.guideSprite, 0.1);
    this.melody.forEach((b, k) => this.timers.after(k * 0.7, () => this.ring(b)));
    this.timers.after(this.melody.length * 0.7 + 0.1, () => this.listen(false));
  }

  /**
   * Listening phase (bars dimmed, silent) or the child's turn (full colour and all bars bounce).
   * Without this the child didn't know why taps during the demo did nothing.
   */
  private listen(on: boolean): void {
    this.playing = on;
    for (const [i, b] of this.bars.entries()) {
      // Dim with tint, not alpha (the frame showed through semi-transparent bars).
      b.tint = on ? DIM : 0xffffff;
      if (!on) this.timers.after(i * 0.04, () => void squash(this.tweens, b, 0.1));
    }
    // First time in melody: after Lusia's demo the hand taps the bars in order.
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
    // Mistake: the bar "shakes its head", melody again.
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

  /** Playtest: play the melody. */
  solve(): void {
    this.playing = false;
    for (const b of this.melody) this.hit(b);
  }

  /** Hint: the melody again. */
  /** The first bars of the melody in order (only once Lusia has finished playing). */
  protected override gesture(): Gesture | null {
    if (this.playing || this.busy || !this.melody.length) return null;
    return { kind: 'tap', at: this.melody.slice(this.pos, this.pos + 3).map((b) => this.middle(this.bars[b]!)) };
  }

  protected hint(): void {
    if (!this.playing) this.play();
  }

  protected place(): void {
    if (!this.bars.length) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const n = this.bars.length;
    const bw = Math.min(110, (right - left) / n - 16);
    const cx = (left + right) / 2;
    const base = h - 110;
    // Xylophone frame.
    const fw = n * (bw + 16) + 40;
    const frame = this.layer.children.find((c) => c.label === 'frame') as Graphics;
    frame
      .clear()
      .roundRect(cx - fw / 2, base - 40, fw, 70, 20)
      .fill({ color: 0x9a6236 })
      .stroke({ color: COLORS.ink, width: 6 });
    this.bars.forEach((bar, i) => {
      // Bars get shorter (higher pitch), like on a real xylophone.
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
