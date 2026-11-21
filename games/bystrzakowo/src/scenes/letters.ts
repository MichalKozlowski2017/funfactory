import { Graphics, Rectangle, Sprite, type FederatedPointerEvent } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { advance, makeLetterRound, resample, traceTolerance, type Letter } from '../sim/letters.ts';
import { state } from '../state.ts';
import { COLORS, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';

type P = [number, number];
const INK = 0x9b5de5;

/**
 * Litery po śladzie (Ścieżka Lusi): gruby szary ślad litery, zielona kropka pokazuje początek kreski.
 * Palec prowadzony po śladzie zostawia kolor; po wszystkich kreskach obok wyskakuje obrazek na tę literę.
 */
export class LetterScene extends RoundScene {
  readonly id = 'letters';
  private letters: Letter[] = [];
  /** Kreski bieżącej litery jako gęste punkty (w ułamkach pola litery). */
  private strokes: P[][] = [];
  private stroke = 0;
  private at = 0;
  private tracing = false;
  private track = new Graphics();
  private ink = new Graphics();
  private start = new Graphics();
  private pad = new Graphics();
  private picture: Sprite | null = null;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private tol = 0.14;

  constructor() {
    super('litery', 'lusia');
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels.litery ?? 0;
    this.letters = makeLetterRound(this.game.rng, level);
    this.length = this.letters.length;
    this.tol = traceTolerance(level);
  }

  private get letter(): Letter {
    return this.letters[this.index]!;
  }

  protected promptLine(): string {
    return 'litery';
  }

  protected show(): void {
    this.strokes = this.letter.strokes.map((s) => resample(s, 0.03));
    this.stroke = 0;
    this.at = 0;
    this.tracing = false;
    this.track = new Graphics();
    this.ink = new Graphics();
    this.start = new Graphics();
    this.pad = new Graphics();
    this.picture = new Sprite({ texture: this.art.items.get(this.letter.item)!, anchor: 0.5 });
    this.picture.visible = false;
    for (const v of [this.track, this.ink, this.start, this.picture]) v.eventMode = 'none';
    this.pad.eventMode = 'static';
    this.pad.on('pointerdown', (e) => this.down(e));
    this.pad.on('globalpointermove', (e) => this.tracing && this.trace(e));
    this.pad.on('pointerup', () => (this.tracing = false));
    this.pad.on('pointerupoutside', () => (this.tracing = false));
    this.layer.addChild(this.pad, this.track, this.ink, this.start, this.picture);
    this.timers.after(0.4, () => say(this.game, this.guide, 'litery'));
  }

  protected override appear(): void {
    this.track.alpha = 0;
    this.tweens.to(this.track, { alpha: 1 }, { duration: 0.35 });
    void popIn(this.tweens, this.start, 0.4, 0.3);
  }

  /** Punkt pola litery (0..1) na ekranie. */
  private toScreen([x, y]: P): P {
    return [this.box.x + x * this.box.w, this.box.y + y * this.box.h];
  }

  private toLetter(e: FederatedPointerEvent): P {
    const p = this.layer.toLocal(e.global);
    // Tolerancja liczona w wysokości litery, więc obie osie w tych samych jednostkach.
    return [(p.x - this.box.x) / this.box.h, (p.y - this.box.y) / this.box.h];
  }

  private down(e: FederatedPointerEvent): void {
    if (this.busy) return;
    this.idle = 0;
    this.tracing = true;
    this.trace(e);
  }

  private trace(e: FederatedPointerEvent): void {
    if (this.busy) return;
    const f = this.toLetter(e);
    const pts = this.strokes[this.stroke]!;
    const k = this.box.w / this.box.h;
    const scaled = pts.map(([x, y]) => [x * k, y] as P);
    const next = advance(scaled, this.at, f, this.tol);
    if (next === this.at) return;
    if (Math.floor(next / 6) > Math.floor(this.at / 6)) sfx.pop(this.game.sound, 1 + (next / pts.length) * 0.6);
    this.at = next;
    this.drawInk();
    if (this.at >= pts.length - 1) this.strokeDone();
  }

  private strokeDone(): void {
    haptics.hit();
    this.burst(...this.toScreen(this.strokes[this.stroke]!.at(-1)!), 12);
    this.stroke++;
    this.at = 0;
    this.tracing = false;
    if (this.stroke >= this.strokes.length) return this.complete();
    this.drawStart();
  }

  /** Litera gotowa: puls, obrazek obok, „A jak autko!”. */
  private complete(): void {
    this.busy = true;
    this.start.clear();
    const pic = this.picture!;
    pic.visible = true;
    void popIn(this.tweens, pic, 0.5);
    void pulse(this.tweens, this.ink, 0.08, 0.35);
    this.burst(pic.x, pic.y, 36);
    const len = say(this.game, this.guide, `litera-${this.letter.ch.toLowerCase()}`);
    this.solved(len);
  }

  /** Playtest: wszystkie kreski. */
  solve(): void {
    while (!this.busy) {
      this.at = this.strokes[this.stroke]!.length - 1;
      this.drawInk();
      this.strokeDone();
    }
  }

  /** Podpowiedź: kropka startowa podskakuje, a strzałka pokazuje kierunek. */
  protected hint(): void {
    void this.tweens.to(this.start.scale, { x: 1.5, y: 1.5 }, { duration: 0.25, yoyo: true, repeat: 5, ease: 'sineInOut' });
  }

  private drawInk(): void {
    const g = this.ink.clear();
    const w = this.box.h * 0.085;
    this.strokes.forEach((pts, i) => {
      const upto = i < this.stroke ? pts.length - 1 : i === this.stroke ? this.at : -1;
      if (upto < 1) return;
      const [x0, y0] = this.toScreen(pts[0]!);
      g.moveTo(x0, y0);
      for (let j = 1; j <= upto; j++) g.lineTo(...this.toScreen(pts[j]!));
      g.stroke({ color: INK, width: w, cap: 'round', join: 'round' });
    });
  }

  /** Zielona kropka na początku kreski i mała strzałka w stronę ruchu. */
  private drawStart(): void {
    const pts = this.strokes[this.stroke];
    const g = this.start.clear();
    if (!pts) return;
    const [x, y] = this.toScreen(pts[0]!);
    const [x2, y2] = this.toScreen(pts[Math.min(4, pts.length - 1)]!);
    const a = Math.atan2(y2 - y, x2 - x);
    const r = this.box.h * 0.05;
    this.start.position.set(x, y);
    g.circle(0, 0, r).fill({ color: COLORS.good }).stroke({ color: COLORS.ink, width: 4 });
    const tip = r * 2.1;
    g.poly([Math.cos(a) * tip, Math.sin(a) * tip, Math.cos(a + 2.6) * r * 1.2 + Math.cos(a) * r, Math.sin(a + 2.6) * r * 1.2 + Math.sin(a) * r, Math.cos(a - 2.6) * r * 1.2 + Math.cos(a) * r, Math.sin(a - 2.6) * r * 1.2 + Math.sin(a) * r]).fill({ color: COLORS.good }).stroke({ color: COLORS.ink, width: 3, join: 'round' });
  }

  protected place(): void {
    if (!this.strokes.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 30;
    const top = safe.top + 165;
    const bottom = h - 70;
    const lh = bottom - top;
    const lw = lh * 0.72;
    // Litera po lewej, miejsce na obrazek po prawej.
    const lx = left + (right - left) * 0.36 - lw / 2;
    this.box = { x: lx, y: top, w: lw, h: lh };
    const g = this.track.clear();
    const tw = lh * 0.15;
    for (const pts of this.strokes) {
      const [x0, y0] = this.toScreen(pts[0]!);
      g.moveTo(x0, y0);
      for (const p of pts.slice(1)) g.lineTo(...this.toScreen(p));
    }
    g.stroke({ color: 0xffffff, width: tw + 10, cap: 'round', join: 'round', alpha: 0.9 });
    for (const pts of this.strokes) {
      const [x0, y0] = this.toScreen(pts[0]!);
      g.moveTo(x0, y0);
      for (const p of pts.slice(1)) g.lineTo(...this.toScreen(p));
    }
    g.stroke({ color: 0xd9d0c3, width: tw, cap: 'round', join: 'round' });
    this.pad.clear().rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0.001 });
    this.pad.hitArea = new Rectangle(0, 0, w, h);
    const pic = this.picture!;
    pic.scale.set(Math.min(300, (right - (lx + lw)) * 0.8) / Math.max(pic.texture.width, pic.texture.height));
    pic.position.set((lx + lw + right) / 2 + 20, top + lh / 2);
    this.drawInk();
    if (!this.busy) this.drawStart();
  }
}
