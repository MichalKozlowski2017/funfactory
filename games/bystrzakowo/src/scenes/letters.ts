import { Graphics, Rectangle, Sprite, type FederatedPointerEvent } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { advance, makeDigitRound, makeLetterRound, resample, traceTolerance, type Letter } from '../sim/letters.ts';
import { ITEMS } from '../sim/catalog.ts';
import { state } from '../state.ts';
import { COLORS, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

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
  /** Strzałki „›” płynące wzdłuż kreski od kropki startowej (kierunek rysowania). */
  private guideLine = new Graphics();
  private guideT = 0;
  private pad = new Graphics();
  private picture: Sprite | null = null;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private tol = 0.14;

  /** Cyfry: po narysowaniu tyle obrazków, ile mówi cyfra. */
  private readonly digits: boolean;
  private counted: Sprite[] = [];

  constructor(kind: 'litery' | 'cyfry' = 'litery') {
    super(kind, 'lusia');
    this.digits = kind === 'cyfry';
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels[this.kind] ?? 0;
    this.letters = this.digits ? makeDigitRound(this.game.rng, level) : makeLetterRound(this.game.rng, level);
    this.length = this.letters.length;
    this.tol = traceTolerance(level);
  }

  protected override taskFacts(): string[] {
    return [`${this.digits ? 'cyfra' : 'litera'}:${this.letter.ch}`];
  }

  private get letter(): Letter {
    return this.letters[this.index]!;
  }

  protected promptLine(): string {
    return this.digits ? 'cyfry' : 'litery';
  }

  protected show(): void {
    this.strokes = this.letter.strokes.map((s) => resample(s, 0.03));
    this.stroke = 0;
    this.at = 0;
    this.tracing = false;
    this.track = new Graphics();
    this.ink = new Graphics();
    this.start = new Graphics();
    this.guideLine = new Graphics();
    this.pad = new Graphics();
    // Cyfry: obrazek do liczenia losowany z małych obiektów (np. 3 jabłka).
    const item = this.digits ? this.game.rng.pick(ITEMS.filter((i) => i.countable)).id : this.letter.item;
    this.picture = new Sprite({ texture: this.art.items.get(item)!, anchor: 0.5 });
    this.picture.visible = false;
    this.counted = [];
    for (const v of [this.track, this.ink, this.guideLine, this.start, this.picture]) v.eventMode = 'none';
    this.pad.eventMode = 'static';
    this.pad.on('pointerdown', (e) => this.down(e));
    this.pad.on('globalpointermove', (e) => this.tracing && this.trace(e));
    this.pad.on('pointerup', () => this.up());
    this.pad.on('pointerupoutside', () => this.up());
    this.layer.addChild(this.pad, this.track, this.ink, this.guideLine, this.start, this.picture);
    this.timers.after(0.4, () => say(this.game, this.guide, this.promptLine()));
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

  /** Postęp w chwili przyłożenia palca i liczba prób z rzędu bez postępu (np. rysowanie od złej strony). */
  private atDown = 0;
  private strokeAtDown = 0;
  private fails = 0;
  /** Ruchy palca w tym dotknięciu daleko od bieżącej kreski (rysowanie nie tej kreski). */
  private offPath = 0;

  private down(e: FederatedPointerEvent): void {
    if (this.busy) return;
    this.idle = 0;
    this.tracing = true;
    this.atDown = this.at;
    this.strokeAtDown = this.stroke;
    this.offPath = 0;
    this.trace(e);
  }

  /**
   * Palec podniesiony. Dwie próby z rzędu bez postępu: podpowiedź (kropka startu i strzałki), bo dziecko,
   * które uparcie rysuje od złej strony, ciągle dotyka ekranu i zwykła podpowiedź po bezczynności nie przychodzi.
   */
  private up(): void {
    if (!this.tracing) return;
    this.tracing = false;
    if (this.busy) return;
    // Inna kreska, która tylko zahaczyła o początek bieżącej (w A obie zaczynają się u góry): bez okruchu tuszu.
    const len = this.strokes[this.stroke]!.length;
    if (this.stroke === this.strokeAtDown && this.offPath > 5 && this.at - this.atDown < len * 0.4 && this.at !== this.atDown) {
      this.at = this.atDown;
      this.drawInk();
    }
    if (this.stroke === this.strokeAtDown && this.at === this.atDown) {
      if (++this.fails >= 2) {
        this.fails = 0;
        this.tapHint();
      }
    } else this.fails = 0;
  }

  private trace(e: FederatedPointerEvent): void {
    if (this.busy) return;
    const f = this.toLetter(e);
    const pts = this.strokes[this.stroke]!;
    const k = this.box.w / this.box.h;
    const scaled = pts.map(([x, y]) => [x * k, y] as P);
    const next = advance(scaled, this.at, f, this.tol);
    if (next === this.at) {
      if (scaled.every(([x, y]) => Math.hypot(x - f[0], y - f[1]) > this.tol * 2)) this.offPath++;
      return;
    }
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
    this.guideLine.clear();
    const pic = this.picture!;
    // Puls względem środka litery (tusz jest rysowany we współrzędnych warstwy, więc bez tego „odjeżdżał” w bok).
    const cx = this.box.x + this.box.w / 2, cy = this.box.y + this.box.h / 2;
    this.ink.pivot.set(cx, cy);
    this.ink.position.set(cx, cy);
    void pulse(this.tweens, this.ink, 0.08, 0.35);
    if (this.digits) return this.countOut(Number(this.letter.ch));
    pic.visible = true;
    void popIn(this.tweens, pic, 0.5);
    this.burst(pic.x, pic.y, 36);
    const len = say(this.game, this.guide, `litera-${this.letter.ch.toLowerCase()}`);
    this.solved(len);
  }

  /** Po cyfrze: obrazki pojawiają się po kolei, Lusia liczy; zero to pusty talerz i „zero”. */
  private countOut(n: number): void {
    const pic = this.picture!;
    const right = this.stage.width - this.stage.safe.right - 30;
    const x0 = this.box.x + this.box.w + 30;
    const cols = n > 6 ? 3 : n > 2 ? 2 : 1;
    const rows = Math.max(1, Math.ceil(n / cols));
    const size = Math.min(120, (right - x0) / cols, (this.box.h - 20) / Math.max(rows, 1));
    for (let i = 0; i < n; i++) {
      const s = new Sprite({ texture: pic.texture, anchor: 0.5 });
      s.eventMode = 'none';
      s.scale.set((size * 0.85) / Math.max(s.texture.width, s.texture.height));
      const col = i % cols;
      const row = Math.floor(i / cols);
      s.position.set(x0 + (right - x0) / 2 + (col - (cols - 1) / 2) * size, this.box.y + this.box.h / 2 + (row - (rows - 1) / 2) * size);
      s.visible = false;
      this.layer.addChild(s);
      this.counted.push(s);
      this.timers.after(0.2 + i * 0.6, () => {
        s.visible = true;
        void popIn(this.tweens, s, 0.3);
        sfx.pop(this.game.sound, 1 + i * 0.07);
        say(this.game, this.guide, `liczba-${i + 1}`);
      });
    }
    this.timers.after(0.4 + n * 0.6, () => {
      const len = n === 0 ? say(this.game, this.guide, 'liczba-0') : 0;
      this.burst(x0 + (right - x0) / 2, this.box.y + this.box.h / 2, 36);
      this.solved(len);
    });
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
  /** Prowadzenie palcem po bieżącej kresce litery (od miejsca, w którym dziecko skończyło). */
  protected override gesture(): Gesture | null {
    const s = this.strokes[this.stroke];
    if (!s?.length) return null;
    const path = s.slice(Math.max(0, this.at - 1)).map((p) => this.toScreen(p)).map(([x, y]) => ({ x, y }));
    return path.length > 1 ? { kind: 'trace', path } : null;
  }

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

  /** Zielona kropka (plastelina: poświata i odblask) na początku bieżącej kreski. */
  private drawStart(): void {
    const pts = this.strokes[this.stroke];
    const g = this.start.clear();
    if (!pts) return;
    const [x, y] = this.toScreen(pts[0]!);
    const r = this.box.h * 0.05;
    this.start.position.set(x, y);
    g.circle(0, 0, r * 1.55).fill({ color: COLORS.good, alpha: 0.25 });
    g.circle(0, 0, r).fill({ color: COLORS.good }).stroke({ color: COLORS.ink, width: 4 });
    g.ellipse(-r * 0.3, -r * 0.35, r * 0.32, r * 0.2).fill({ color: 0xffffff, alpha: 0.55 });
  }

  /** Punkt kreski w odległości `d` (px) od początku i kąt kierunku w tym miejscu; null za końcem kreski. */
  private along(pts: readonly P[], d: number): { x: number; y: number; a: number } | null {
    let left = d;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = this.toScreen(pts[i - 1]!);
      const [x1, y1] = this.toScreen(pts[i]!);
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (left <= len && len > 0) {
        const t = left / len;
        return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, a: Math.atan2(y1 - y0, x1 - x0) };
      }
      left -= len;
    }
    return null;
  }

  /** Strzałki „›” płyną po kresce od kropki, dopóki dziecko nie zacznie rysować. */
  private drawGuide(dt: number): void {
    const g = this.guideLine.clear();
    const pts = this.strokes[this.stroke];
    if (!pts || this.busy || this.tracing || this.at > 0) return;
    this.guideT += dt;
    const r = this.box.h * 0.05;
    const gap = r * 1.7;
    const shift = (this.guideT * gap * 0.9) % gap;
    for (let k = 0; k < 4; k++) {
      const d = r * 1.9 + k * gap + shift;
      const p = this.along(pts, d);
      if (!p) break;
      // Pojawianie się przy kropce i znikanie na końcu wężyka.
      const alpha = Math.min(1, (d - r * 1.9) / (gap * 0.6)) * (1 - Math.max(0, (d - r * 1.9 - gap * 2.6) / (gap * 1.4)));
      if (alpha <= 0.02) continue;
      const w = r * 0.75;
      const back = (s: number) => [p.x - Math.cos(p.a + s) * w, p.y - Math.sin(p.a + s) * w] as const;
      const [ax, ay] = back(0.75);
      const [bx, by] = back(-0.75);
      g.moveTo(ax, ay).lineTo(p.x, p.y).lineTo(bx, by).stroke({ color: COLORS.ink, width: r * 0.55, cap: 'round', join: 'round', alpha: alpha * 0.85 });
      g.moveTo(ax, ay).lineTo(p.x, p.y).lineTo(bx, by).stroke({ color: COLORS.good, width: r * 0.34, cap: 'round', join: 'round', alpha });
    }
  }

  protected override step(dt: number): void {
    this.drawGuide(dt);
  }

  protected place(): void {
    if (!this.strokes.length) return;
    const { width: w, height: h, safe } = this.stage;
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
