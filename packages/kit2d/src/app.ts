import { Application, Container, UPDATE_PRIORITY } from 'pixi.js';
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
  /**
   * Gry poziome: stała wysokość przestrzeni projektowej (np. 720), szerokość wynika z proporcji ekranu
   * (tablet 4:3 ~960, telefon 19.5:9 ~1560). Gdy ustawione, `designWidth` nie ma znaczenia.
   */
  designHeight?: number;
  /** Seed RNG. Domyślnie z `?seed=` w URL albo z czasu. */
  seed?: number;
  /**
   * Wygładzanie krawędzi (MSAA), domyślnie włączone. Na ekranach 3x kosztuje sporo pracy GPU,
   * a różnicy prawie nie widać. `?aa=1` / `?aa=0` w URL wymusza (do porównań).
   */
  antialias?: boolean;
}

/** Statystyki płynności (zawsze liczone, tanie). Okno: ostatnie `PerfStats.window` sekund. */
export interface PerfStats {
  fps: number;
  /** Średni i najdłuższy odstęp między klatkami (ms). */
  frameMs: number;
  worstMs: number;
  /** Czas pracy procesora na klatkę: logika + rysowanie (ms). */
  cpuMs: number;
  cpuWorst: number;
  /** Zacięcia (klatka > 25 ms) od startu. */
  hitches: number;
  /** Klatki bez kroku fizyki i z 2+ krokami w oknie (nierówny ruch). */
  zeroSteps: number;
  multiSteps: number;
}

export interface View {
  /** Szerokość w jednostkach gry (= designWidth, a w grach poziomych zależy od ekranu). */
  width: number;
  /** Wysokość w jednostkach gry (zależy od ekranu, a w grach poziomych = designHeight). */
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
  /** Płynność z ostatnich sekund (licznik wydajności). */
  readonly perf: PerfStats = { fps: 0, frameMs: 0, worstMs: 0, cpuMs: 0, cpuWorst: 0, hitches: 0, zeroSteps: 0, multiSteps: 0 };
  private readonly perfWindow: { frame: number; cpu: number; steps: number }[] = [];
  private frameStart = 0;
  private lastFrame = 0;
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
      antialias: this.antialias(),
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      preference: 'webgl',
    });
    parent.appendChild(this.app.canvas);
    // Przerwany dotyk (gest systemowy od krawędzi, powiadomienie, połączenie) to w przeglądarce `pointercancel`,
    // którego Pixi v8 nie obsługuje: przeciągany obiekt zostawał w połowie drogi i blokował zabawę.
    // Zamieniamy go na `pointerup` w tym samym miejscu, więc każda obsługa przeciągania kończy się normalnie.
    this.app.canvas.addEventListener('pointercancel', (e) => {
      this.app.canvas.dispatchEvent(
        new PointerEvent('pointerup', { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, bubbles: true, cancelable: true, button: 0, buttons: 0 }),
      );
    });
    this.app.stage.addChild(this.root);
    this.safeProbe = makeSafeProbe();
    this.app.renderer.on('resize', () => this.layout());
    this.layout();
    // iOS (WKWebView) potrafi podać env(safe-area-inset-*) dopiero chwilę po starcie albo po obrocie,
    // bez zdarzenia resize. Sprawdzamy więc obszar bezpieczny jeszcze kilka razy i przy powrocie do aplikacji.
    const recheck = () => {
      const s = readSafe(this.safeProbe);
      const scale = this.unitScale();
      const v = this.view.safe;
      if (Math.abs(s.top / scale - v.top) > 0.5 || Math.abs(s.bottom / scale - v.bottom) > 0.5 || Math.abs(s.left / scale - v.left) > 0.5 || Math.abs(s.right / scale - v.right) > 0.5) this.layout();
    };
    for (const ms of [100, 300, 700, 1500, 3000]) window.setTimeout(recheck, ms);
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('orientationchange', () => window.setTimeout(recheck, 300));
    this.app.ticker.add((ticker) => {
      if (this.dev) this.dev.frames++;
      this.frameStart = performance.now();
      // Wyjątek w klatce nie może zatrzymać gry: Pixi po błędzie nie zamawia kolejnej klatki
      // i obraz zamiera na zawsze. Zgłaszamy błąd (window 'error') i rysujemy dalej.
      try {
        this.loop.tick(ticker.deltaMS / 1000);
      } catch (e) {
        reportFrameError(e);
      }
    });
    // Błąd poza logiką klatki (np. w rysowaniu) też zatrzymałby ticker: uruchamiamy go ponownie.
    window.addEventListener('error', () => {
      const t = this.app.ticker;
      if (t.started) {
        t.stop();
        t.start();
      }
    });
    // Po narysowaniu (render ma priorytet LOW): koniec pracy klatki.
    this.app.ticker.add(() => this.measure(), null, UPDATE_PRIORITY.UTILITY);
    document.addEventListener('visibilitychange', () => {
      this.loop.paused = document.hidden;
    });
    this.installDevHook();
    return this;
  }

  private antialias(): boolean {
    const forced = new URLSearchParams(location.search).get('aa');
    if (forced !== null) return forced !== '0';
    return this.opts.antialias ?? true;
  }

  private measure(): void {
    const now = performance.now();
    const frame = this.lastFrame ? now - this.lastFrame : 16.7;
    this.lastFrame = now;
    if (frame > 25 && frame < 1000) this.perf.hitches++;
    const w = this.perfWindow;
    w.push({ frame, cpu: now - this.frameStart, steps: this.loop.lastSteps });
    // Okno ok. 3 s.
    let total = 0;
    for (const f of w) total += f.frame;
    while (w.length > 2 && total > 3000) total -= w.shift()!.frame;
    const p = this.perf;
    p.fps = (w.length / total) * 1000;
    p.frameMs = total / w.length;
    p.worstMs = 0;
    p.cpuMs = 0;
    p.cpuWorst = 0;
    p.zeroSteps = 0;
    p.multiSteps = 0;
    for (const f of w) {
      p.worstMs = Math.max(p.worstMs, f.frame);
      p.cpuMs += f.cpu / w.length;
      p.cpuWorst = Math.max(p.cpuWorst, f.cpu);
      if (f.steps === 0 && !this.loop.paused && this.loop.timeScale > 0) p.zeroSteps++;
      if (f.steps > 1) p.multiSteps++;
    }
  }

  /** Zatrzymanie gry na chwilę przy mocnym trafieniu (hit-stop). */
  hitstop(seconds = 0.06): void {
    const previous = this.loop.timeScale;
    this.loop.timeScale = 0;
    window.setTimeout(() => (this.loop.timeScale = previous), seconds * 1000);
  }

  /** Ile pikseli CSS przypada na jednostkę gry. */
  private unitScale(): number {
    const { width, height } = this.app.screen;
    return this.opts.designHeight ? height / this.opts.designHeight : width / this.designWidth;
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    const scale = this.unitScale();
    this.root.scale.set(scale);
    this.pixelRatio = scale * this.app.renderer.resolution;
    const safe = readSafe(this.safeProbe);
    this.view = {
      width: width / scale,
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

let frameErrors = 0;

/** Błąd z klatki: do konsoli i jako zdarzenie window 'error' (diagnostyka gier), najwyżej 50 razy. */
function reportFrameError(e: unknown): void {
  if (frameErrors++ >= 50) return;
  console.error(e);
  const message = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
  window.dispatchEvent(new ErrorEvent('error', { message, error: e }));
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
