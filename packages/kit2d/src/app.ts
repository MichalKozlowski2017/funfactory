import { Application, Container } from 'pixi.js';
import { Loop, Rng, Sound } from '@funfactory/core';
import { SceneManager } from './scene.ts';

export interface GameOptions {
  /** Element, do którego trafia canvas. Domyślnie document.body. */
  parent?: HTMLElement;
  /** Kolor tła (#rrggbb). */
  background?: string;
  /**
   * Szerokość przestrzeni projektowej w jednostkach gry. Wysokość wynika z proporcji ekranu.
   * Projektujemy dla 720 szerokości. Telefony 19.5:9 dają ~1560 wysokości, tablety mniej.
   */
  designWidth?: number;
  /** Seed RNG. Domyślnie z `?seed=` w URL albo z czasu. */
  seed?: number;
}

export interface View {
  /** Szerokość w jednostkach gry (= designWidth). */
  width: number;
  /** Wysokość w jednostkach gry (zależy od ekranu). */
  height: number;
  /** Wcięcia bezpiecznego obszaru (notch, home indicator) w jednostkach gry. */
  safe: { top: number; right: number; bottom: number; left: number };
}

export interface DevHook {
  ready: boolean;
  frames: number;
  scene: string;
  errors: string[];
  game: Game;
}

declare global {
  interface Window {
    __ff?: DevHook;
  }
}

/**
 * Gra 2D: Pixi + pętla + sceny + dźwięk + RNG.
 *
 * Wszystko w scenach jest w jednostkach projektowych (szerokość 720),
 * skalowanie do ekranu i gęstość pikseli załatwia Game.
 */
export class Game {
  readonly app = new Application();
  readonly root = new Container();
  readonly scenes = new SceneManager(this);
  readonly sound = new Sound();
  readonly rng: Rng;
  readonly loop: Loop;
  readonly designWidth: number;
  view: View = { width: 720, height: 1280, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
  /** Ile pikseli urządzenia przypada na jednostkę gry. Do renderowania tekstur w pełnej ostrości. */
  pixelRatio = 1;
  private safeProbe: HTMLDivElement | null = null;

  private readonly opts: GameOptions;

  constructor(opts: GameOptions = {}) {
    this.opts = opts;
    this.designWidth = opts.designWidth ?? 720;
    const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
    this.rng = new Rng(opts.seed ?? (Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : Date.now()));
    this.loop = new Loop({
      fixedUpdate: (dt) => this.scenes.fixedUpdate(dt),
      update: (dt) => this.scenes.update(dt),
    });
  }

  async start(): Promise<this> {
    const parent = this.opts.parent ?? document.body;
    await this.app.init({
      resizeTo: parent === document.body ? window : parent,
      background: this.opts.background ?? '#000000',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      preference: 'webgl',
    });
    parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.safeProbe = makeSafeProbe();
    this.app.renderer.on('resize', () => this.layout());
    this.layout();
    this.app.ticker.add((ticker) => {
      if (this.dev) this.dev.frames++;
      this.loop.tick(ticker.deltaMS / 1000);
    });
    document.addEventListener('visibilitychange', () => {
      this.loop.paused = document.hidden;
    });
    this.installDevHook();
    return this;
  }

  /** Zatrzymanie gry na chwilę przy mocnym trafieniu (hit-stop). */
  hitstop(seconds = 0.06): void {
    const previous = this.loop.timeScale;
    this.loop.timeScale = 0;
    window.setTimeout(() => (this.loop.timeScale = previous), seconds * 1000);
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    const scale = width / this.designWidth;
    this.root.scale.set(scale);
    this.pixelRatio = scale * this.app.renderer.resolution;
    const safe = readSafe(this.safeProbe);
    this.view = {
      width: this.designWidth,
      height: height / scale,
      safe: { top: safe.top / scale, right: safe.right / scale, bottom: safe.bottom / scale, left: safe.left / scale },
    };
    this.scenes.resize(this.view);
  }

  private get dev(): DevHook | undefined {
    return window.__ff;
  }

  private installDevHook(): void {
    if (!import.meta.env.DEV) return;
    const hook: DevHook = { ready: false, frames: 0, scene: '', errors: [], game: this };
    window.addEventListener('error', (e) => hook.errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => hook.errors.push(String(e.reason)));
    window.__ff = hook;
  }

  /** Scena sygnalizuje, że jest gotowa do zrzutu (playtest czeka na to). */
  markReady(): void {
    if (this.dev) this.dev.ready = true;
  }
}

function makeSafeProbe(): HTMLDivElement {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;inset:0;pointer-events:none;visibility:hidden;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
  document.body.appendChild(probe);
  return probe;
}

function readSafe(probe: HTMLDivElement | null) {
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const s = getComputedStyle(probe);
  return {
    top: parseFloat(s.paddingTop) || 0,
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  };
}
