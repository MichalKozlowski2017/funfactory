/**
 * Trailer recordings (`?promo=letters:1,shadows:2,coloring:4`, dev builds only): plays the listed activities like a
 * child. It enters each activity from the world, waits for the guide's prompt, then performs the task's own gesture
 * (the one the tutorial hand shows) with real touch events, so the game reacts exactly as to a child (voice, praise,
 * stars). A plasticine child's hand follows the touch. The number after the colon is how many gestures to perform;
 * coloring then finishes the picture so it comes alive; `stats:<s>` shows the parent zone charts for that many
 * seconds. Game music is off (the trailer adds one continuous track).
 * Record with `pnpm shot games/bystrzakowo --gpu ... --steps "rec:start,wait:...,rec:save:x"` (docs/promo.md).
 */
import { Container, Sprite, type Texture } from 'pixi.js';
import type { Game } from '@funfactory/kit2d';
import { stopMusic } from './assets.ts';
import { along, HAND_TIP, type Gesture, type P } from './hand.ts';
import { state } from './state.ts';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Palette indices for coloring in trailers: orange, pink, yellow, light blue, green. */
const PAINT_ORDER = [1, 8, 2, 5, 3];

const sleep = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

async function until(test: () => boolean, timeout = 15): Promise<boolean> {
  const end = performance.now() + timeout * 1000;
  while (performance.now() < end) {
    if (test()) return true;
    await sleep(0.1);
  }
  return false;
}

/** Runs the plan once the world is on screen. */
export function startPromo(game: Game, plan: string): void {
  state.progress.music = false;
  stopMusic(game);
  const steps = plan.split(',').map((s) => {
    const [kind, n] = s.split(':');
    return { kind: kind!, n: Number(n) || 1 };
  });
  const scene = () => game.scenes.current as unknown as Any;
  const finger = new Finger(game);
  void (async () => {
    await until(() => scene().id === 'world', 30);
    await sleep(1.2);
    for (const { kind, n } of steps) {
      if (scene().id !== 'world') {
        scene().leave?.();
        await until(() => scene().id === 'world');
        await sleep(0.8);
      }
      if (kind === 'stats') {
        // Parent zone: progress charts with demo data (as on the store screenshots).
        scene().demoStats('');
        await sleep(n);
        continue;
      }
      scene().play(kind);
      await until(() => scene().id !== 'world' && !scene().busy && scene().layer?.children?.length > 0);
      finger.use(scene().art?.hand ?? null);
      // Let the guide say the task first.
      await sleep(1.6);
      for (let i = 0; i < n; i++) {
        await until(() => !scene().busy && !scene().overlay, 8);
        const s = scene();
        let g: Gesture | null = s.gesture?.();
        if (!g) break;
        // Coloring: a different paint for every part (the hint always picks the first other color).
        if (kind === 'coloring' && g.kind === 'tap') {
          const blob = s.palette.children[PAINT_ORDER[i % PAINT_ORDER.length]!];
          if (blob) g = { kind: 'tap', at: [s.spot(blob), g.at[g.at.length - 1]!] };
        }
        await finger.perform(s.layer as Container, g);
        await sleep(0.5);
      }
      if (kind === 'coloring') {
        scene().solve();
        await sleep(4.5);
      } else {
        // Praise, stars or the round's reward stay on screen for a moment.
        await sleep(2.2);
      }
    }
    finger.hide();
    console.log('PROMO done');
  })();
}

/** Plasticine child's hand that moves on top of everything and touches the canvas for real. */
class Finger {
  private readonly view = new Container();
  private sprite: Sprite | null = null;
  private pos: P = { x: 0, y: 0 };

  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
    this.view.eventMode = 'none';
    this.view.visible = false;
    game.app.stage.addChild(this.view);
  }

  use(texture: Texture | null): void {
    if (this.sprite || !texture) return;
    this.sprite = new Sprite({ texture, anchor: { x: HAND_TIP.x, y: HAND_TIP.y } });
    this.sprite.rotation = -0.35;
    this.view.addChild(this.sprite);
  }

  hide(): void {
    this.view.visible = false;
  }

  async perform(layer: Container, g: Gesture): Promise<void> {
    const toStage = (p: P) => layer.toGlobal(p);
    const size = 150 * this.game.root.scale.x;
    if (this.sprite) this.sprite.scale.set(size / this.sprite.texture.height);
    this.game.app.stage.addChild(this.view);
    const first = toStage(g.kind === 'tap' ? g.at[0]! : g.kind === 'drag' ? g.from : g.path[0]!);
    if (!this.view.visible) {
      this.pos = { x: first.x + size * 0.6, y: first.y + size * 0.8 };
      this.view.visible = true;
    }
    if (g.kind === 'tap') {
      for (const p of g.at) {
        const at = toStage(p);
        await this.move(at, 0.45);
        this.touch('pointerdown', at);
        await this.press(0.12);
        this.touch('pointerup', at);
        await this.release(0.3);
      }
    } else {
      const path = (g.kind === 'drag' ? [g.from, g.to] : g.path).map(toStage);
      const len = path.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y), 0) / this.game.root.scale.x;
      await this.move(path[0]!, 0.45);
      this.touch('pointerdown', path[0]!);
      await this.press(0.12);
      const d = g.kind === 'drag' ? Math.min(1.2, Math.max(0.6, len / 500)) : Math.min(2.4, Math.max(0.9, len / 420));
      await this.animate(d, (t) => {
        const p = along(path, ease(t));
        this.place(p);
        this.touch('pointermove', p);
      });
      const end = path[path.length - 1]!;
      this.touch('pointerup', end);
      await this.release(0.3);
    }
  }

  private place(p: P): void {
    this.pos = p;
    this.view.position.set(p.x, p.y);
  }

  private move(to: P, d: number): Promise<void> {
    const from = { ...this.pos };
    return this.animate(d, (t) => {
      const k = ease(t);
      this.place({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k });
    });
  }

  private press(d: number): Promise<void> {
    return this.animate(d, (t) => this.view.scale.set(1 - 0.12 * t));
  }

  private release(d: number): Promise<void> {
    return this.animate(d, (t) => this.view.scale.set(0.88 + 0.12 * t));
  }

  private animate(d: number, fn: (t: number) => void): Promise<void> {
    return new Promise((done) => {
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / (d * 1000));
        fn(t);
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
  }

  /** Real touch on the canvas (Pixi's event system turns it into the scene's pointer events). */
  private touch(type: 'pointerdown' | 'pointermove' | 'pointerup', p: P): void {
    const canvas = this.game.app.canvas;
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / this.game.app.renderer.screen.width;
    canvas.dispatchEvent(
      new PointerEvent(type, {
        clientX: rect.left + p.x * k,
        clientY: rect.top + p.y * k,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        bubbles: true,
        cancelable: true,
        pressure: type === 'pointerup' ? 0 : 0.5,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
      }),
    );
  }
}
