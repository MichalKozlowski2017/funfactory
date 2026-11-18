import { Container, Graphics } from 'pixi.js';
import { Timers, Tweens } from '@funfactory/core';
import type { Game, View } from './app.ts';

/**
 * Scena: kontener z własnymi tweenami i timerami. Po wyjściu ze sceny wszystko jest sprzątane.
 */
export abstract class Scene extends Container {
  readonly tweens = new Tweens();
  readonly timers = new Timers();
  game!: Game;

  /** Nazwa do logów i playtestu. */
  abstract readonly id: string;

  /**
   * Budowanie sceny. Może być async (ładowanie tekstur).
   * Tweeny i timery sceny ruszają dopiero po zakończeniu enter(), więc nie czekaj tu na `tween.done`.
   */
  enter(): void | Promise<void> {}
  exit(): void {}
  /** Logika w stałym kroku 1/60 s. */
  fixedUpdate(_dt: number): void {}
  /** Co klatkę, po kroku stałym. */
  update(_dt: number): void {}
  /** Zmiana rozmiaru ekranu: ułóż elementy względem `view`. */
  resize(_view: View): void {}

  /** Wewnętrzne: aktualizacja tweenów i timerów sceny, potem update. */
  tick(dt: number): void {
    this.timers.update(dt);
    this.tweens.update(dt);
    this.update(dt);
  }
}

export interface GoOptions {
  /** Czas przejścia w sekundach. 0 = natychmiast. */
  fade?: number;
  color?: number;
}

export class SceneManager {
  current: Scene | null = null;
  /** false, dopóki `enter()` bieżącej sceny się nie zakończy. Wtedy scena nie dostaje update. */
  private live = false;
  private busy = false;
  private readonly curtain = new Graphics();

  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  async go(next: Scene, opts: GoOptions = {}): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const fade = opts.fade ?? 0.25;
    const root = this.game.root;
    const view = this.game.view;
    this.curtain.clear().rect(-50, -50, view.width + 100, view.height + 100).fill({ color: opts.color ?? 0x000000 });

    if (this.current && fade > 0) await this.fadeCurtain(0, 1, fade);
    this.live = false;
    if (this.current) {
      this.current.exit();
      this.current.tweens.killAll();
      this.current.timers.clear();
      root.removeChild(this.current);
      this.current.destroy({ children: true });
    }
    next.game = this.game;
    this.current = next;
    root.addChildAt(next, 0);
    await next.enter();
    next.resize(this.game.view);
    this.live = true;
    if (window.__ff) window.__ff.scene = next.id;
    if (fade > 0 && root.children.includes(this.curtain)) await this.fadeCurtain(1, 0, fade);
    this.busy = false;
  }

  fixedUpdate(dt: number): void {
    if (this.live) this.current?.fixedUpdate(dt);
  }

  update(dt: number): void {
    if (this.live) this.current?.tick(dt);
  }

  resize(view: View): void {
    if (this.live) this.current?.resize(view);
  }

  private fadeCurtain(from: number, to: number, seconds: number): Promise<void> {
    const root = this.game.root;
    this.curtain.alpha = from;
    root.addChild(this.curtain);
    return new Promise((resolve) => {
      const start = performance.now();
      const step = () => {
        const t = Math.min((performance.now() - start) / (seconds * 1000), 1);
        this.curtain.alpha = from + (to - from) * t;
        if (t < 1) requestAnimationFrame(step);
        else {
          if (to === 0) root.removeChild(this.curtain);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }
}
