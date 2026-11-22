import { Graphics, Rectangle, Sprite, type FederatedPointerEvent } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { idleBreath, popIn, pulse } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { canStep, makeMaze, makeMazeRound, mazeSize, path, type Maze } from '../sim/maze.ts';
import { state } from '../state.ts';
import { COLORS, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';

const HEDGE = 0x4fa65a;
const HEDGE_DARK = 0x37804a;
const FLOOR = 0xfff3d6;

/**
 * Labirynt (Ścieżka Lusi): palcem prowadzi się bohatera (np. kurczaczka) korytarzami do celu (mamy).
 * Bohater idzie za palcem pole po polu, tylko przez otwarte przejścia; ściana go odbija.
 */
export class MazeScene extends RoundScene {
  readonly id = 'maze';
  private pairs: [string, string][] = [];
  private maze!: Maze;
  // Tworzone od nowa w każdym zadaniu (warstwa jest czyszczona i niszczona między zadaniami).
  private board = new Graphics();
  private trail = new Graphics();
  private glow = new Graphics();
  private hero!: Sprite;
  private goal!: Sprite;
  /** Odwiedzone pola (ostatnie = pole bohatera). */
  private steps: [number, number][] = [];
  private dragging = false;
  private bumpAt = -1;
  private bumpedThisDrag = false;
  private movedAt = -10;
  private time = 0;
  private cell = 80;
  private topLeft = { x: 0, y: 0 };

  constructor() {
    super('labirynt', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.pairs = makeMazeRound(this.game.rng);
    this.length = this.pairs.length;
  }

  protected override roundItems(): string[] {
    return this.pairs.map(([, goal]) => goal);
  }

  private get pair(): [string, string] {
    return this.pairs[this.index]!;
  }

  protected promptLine(): string {
    return `labirynt-${this.pair[0]}`;
  }

  protected show(): void {
    const { cols, rows } = mazeSize(state.progress.levels.labirynt ?? 0);
    this.maze = makeMaze(this.game.rng, cols, rows);
    this.steps = [[0, 0]];
    this.dragging = false;
    this.board = new Graphics();
    this.trail = new Graphics();
    this.glow = new Graphics();
    this.hero = new Sprite({ texture: this.art.items.get(this.pair[0])!, anchor: 0.5 });
    this.goal = new Sprite({ texture: this.art.items.get(this.pair[1])!, anchor: 0.5 });
    this.board.eventMode = 'static';
    this.board.on('pointerdown', (e) => {
      if (this.busy) return;
      this.dragging = true;
      this.bumpedThisDrag = false;
      this.idle = 0;
      this.follow(e);
    });
    this.board.on('globalpointermove', (e) => this.dragging && this.follow(e));
    this.board.on('pointerup', () => (this.dragging = false));
    this.board.on('pointerupoutside', () => (this.dragging = false));
    // Obrazki nie łapią dotyku: palec przyłożony na bohaterze ma trafić w planszę.
    for (const v of [this.glow, this.trail, this.goal, this.hero]) v.eventMode = 'none';
    this.layer.addChild(this.board, this.glow, this.trail, this.goal, this.hero);
    this.timers.after(0.4, () => say(this.game, this.guide, this.promptLine()));
  }

  protected override appear(): void {
    void popIn(this.tweens, this.goal, 0.4, 0.1);
    void popIn(this.tweens, this.hero, 0.4, 0.2);
    this.timers.after(0.6, () => idleBreath(this.tweens, this.goal, 0.06, 1.2));
  }

  private center(c: number, r: number): { x: number; y: number } {
    return { x: this.topLeft.x + (c + 0.5) * this.cell, y: this.topLeft.y + (r + 0.5) * this.cell };
  }

  /**
   * Bohater idzie za palcem pole po polu (albo wraca po własnych śladach). Gdy palec odjedzie dalej niż o jedno
   * pole (dziecko ciągnie prosto albo po skosie do celu), bohater go dogania korytarzem: krok w osi o większej
   * różnicy, a gdy tam ściana, w drugiej osi. Ściana liczy się jako pomyłka tylko tuż obok bohatera.
   */
  private follow(e: FederatedPointerEvent): void {
    if (this.busy) return;
    const p = this.layer.toLocal(e.global);
    const c = Math.max(0, Math.min(this.maze.cols - 1, Math.floor((p.x - this.topLeft.x) / this.cell)));
    const r = Math.max(0, Math.min(this.maze.rows - 1, Math.floor((p.y - this.topLeft.y) / this.cell)));
    let moved = false;
    for (let guard = 0; guard < this.maze.cols + this.maze.rows; guard++) {
      const [hc, hr] = this.steps[this.steps.length - 1]!;
      const dx = c - hc, dy = r - hr;
      if (dx === 0 && dy === 0) break;
      const sx = Math.sign(dx), sy = Math.sign(dy);
      const tries: [number, number][] = Math.abs(dx) >= Math.abs(dy) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
      const step = tries.find(([ax, ay]) => (ax || ay) && canStep(this.maze, hc, hr, hc + ax, hr + ay));
      if (!step) {
        // Ściana: „oj” tylko gdy palec jest na sąsiednim polu, a bohater od chwili stoi (dziecko naprawdę pcha
        // w ścianę). Przy płynnym ruchu po skosie palec przecina pola za ścianą i to nie jest pomyłka.
        if (Math.abs(dx) + Math.abs(dy) === 1 && this.time - this.movedAt > 0.5) this.bump(dx, dy);
        break;
      }
      const [nc, nr] = [hc + step[0], hr + step[1]];
      const prev = this.steps[this.steps.length - 2];
      if (prev && prev[0] === nc && prev[1] === nr) this.steps.pop();
      else this.steps.push([nc, nr]);
      moved = true;
      if (nc === this.maze.cols - 1 && nr === this.maze.rows - 1) break;
    }
    if (!moved) return;
    this.movedAt = this.time;
    this.moveHero();
    this.glow.clear();
    const [ec, er] = this.steps[this.steps.length - 1]!;
    if (ec === this.maze.cols - 1 && er === this.maze.rows - 1) this.arrive();
  }

  private moveHero(): void {
    const [c, r] = this.steps[this.steps.length - 1]!;
    const to = this.center(c, r);
    this.tweens.killOf(this.hero);
    this.tweens.to(this.hero, { x: to.x, y: to.y }, { duration: 0.12, ease: 'quadOut' });
    sfx.pop(this.game.sound, 1.2 + (this.steps.length % 5) * 0.05);
    haptics.tap();
    this.drawTrail();
  }

  /** Ściana: bohater odbija się w stronę ruchu; „oj” najwyżej co 2 s, pomyłka raz na jedno przyłożenie palca. */
  private bump(dx: number, dy: number): void {
    if (this.time - this.bumpAt < 2) return;
    this.bumpAt = this.time;
    const [c, r] = this.steps[this.steps.length - 1]!;
    const at = this.center(c, r);
    this.tweens.killOf(this.hero);
    this.hero.position.set(at.x, at.y);
    void this.tweens.to(this.hero, { x: at.x + dx * this.cell * 0.18, y: at.y + dy * this.cell * 0.18 }, { duration: 0.08, yoyo: true, repeat: 1 }).done.then(() => this.hero.position.set(at.x, at.y));
    if (this.bumpedThisDrag) return;
    this.bumpedThisDrag = true;
    this.missed();
  }

  /** Ślad: kropeczki po środku odwiedzonych pól. */
  private drawTrail(): void {
    const g = this.trail.clear();
    const pts = this.steps.map(([c, r]) => this.center(c, r));
    if (pts.length > 1) {
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.stroke({ color: COLORS.sun, width: this.cell * 0.14, cap: 'round', join: 'round', alpha: 0.9 });
    }
  }

  private arrive(): void {
    this.busy = true;
    this.dragging = false;
    const at = this.center(this.maze.cols - 1, this.maze.rows - 1);
    this.timers.after(0.15, () => {
      void pulse(this.tweens, this.goal, 0.25, 0.4);
      void pulse(this.tweens, this.hero, 0.25, 0.4);
      this.burst(at.x, at.y, 40);
      // Podskok radości.
      const y = this.hero.y;
      void this.tweens.to(this.hero, { y: y - this.cell * 0.4 }, { duration: 0.18, yoyo: true, repeat: 3, ease: 'quadOut' }).done.then(() => (this.hero.y = y));
      const len = say(this.game, this.guide, `item-${this.pair[1]}`);
      this.solved(len);
    });
  }

  /** Playtest: przejście najkrótszą drogą. */
  solve(): void {
    const route = path(this.maze, 0, 0, this.maze.cols - 1, this.maze.rows - 1);
    this.steps = route;
    this.moveHero();
    this.arrive();
  }

  /** Podpowiedź: świecą następne pola najkrótszej drogi. */
  protected hint(): void {
    const [c, r] = this.steps[this.steps.length - 1]!;
    const route = path(this.maze, c, r, this.maze.cols - 1, this.maze.rows - 1).slice(1, 4);
    const g = this.glow.clear();
    for (const [x, y] of route) {
      const p = this.center(x, y);
      g.circle(p.x, p.y, this.cell * 0.22).fill({ color: COLORS.sun, alpha: 0.7 });
    }
    this.glow.alpha = 1;
    this.tweens.to(this.glow, { alpha: 0 }, { duration: 0.6, delay: 2.5 });
  }

  protected place(): void {
    if (!this.maze) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const top = safe.top + 110;
    const bottom = h - 40;
    const { cols, rows, walls } = this.maze;
    this.cell = Math.min((right - left) / cols, (bottom - top) / rows);
    this.topLeft = { x: (left + right) / 2 - (this.cell * cols) / 2, y: (top + bottom) / 2 - (this.cell * rows) / 2 };
    const s = this.cell;
    const o = this.topLeft;
    const g = this.board.clear();
    // Podłoga z cieniem, potem żywopłot (ciemniejszy spód i jaśniejszy wierzch).
    g.roundRect(o.x - s * 0.12, o.y - s * 0.12 + 8, cols * s + s * 0.24, rows * s + s * 0.24, s * 0.25).fill({ color: 0x000000, alpha: 0.12 });
    g.roundRect(o.x - s * 0.12, o.y - s * 0.12, cols * s + s * 0.24, rows * s + s * 0.24, s * 0.25).fill({ color: FLOOR });
    const segs: [number, number, number, number][] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = o.x + c * s;
        const y = o.y + r * s;
        const wl = walls[r]![c]!;
        if (wl[0]) segs.push([x, y, x + s, y]);
        if (wl[3]) segs.push([x, y, x, y + s]);
        if (c === cols - 1 && wl[1]) segs.push([x + s, y, x + s, y + s]);
        if (r === rows - 1 && wl[2]) segs.push([x, y + s, x + s, y + s]);
      }
    for (const [width, color, dy] of [
      [s * 0.2, HEDGE_DARK, 4],
      [s * 0.16, HEDGE, 0],
    ] as const) {
      for (const [x1, y1, x2, y2] of segs) g.moveTo(x1, y1 + dy).lineTo(x2, y2 + dy);
      g.stroke({ color, width, cap: 'round' });
    }
    g.hitArea = new Rectangle(o.x - s, o.y - s, cols * s + 2 * s, rows * s + 2 * s);
    const fit = (sp: Sprite, k: number) => sp.scale.set((s * k) / Math.max(sp.texture.width, sp.texture.height));
    fit(this.hero, 0.78);
    fit(this.goal, 0.82);
    const goal = this.center(cols - 1, rows - 1);
    this.goal.position.set(goal.x, goal.y);
    const [c, r] = this.steps[this.steps.length - 1]!;
    const at = this.center(c, r);
    this.hero.position.set(at.x, at.y);
    this.drawTrail();
  }

  protected override step(dt: number): void {
    this.time += dt;
  }
}
