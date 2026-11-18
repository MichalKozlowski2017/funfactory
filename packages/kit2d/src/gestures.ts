import type { Container, FederatedPointerEvent } from 'pixi.js';
import { Emitter } from '@funfactory/core';

export type SwipeDir = 'left' | 'right' | 'up' | 'down';

export interface GestureEvents {
  [key: string]: unknown;
  tap: { x: number; y: number };
  dragStart: { x: number; y: number };
  drag: { x: number; y: number; dx: number; dy: number };
  dragEnd: { x: number; y: number; vx: number; vy: number };
  swipe: { dir: SwipeDir; vx: number; vy: number };
}

export interface GestureOptions {
  /** Od ilu jednostek ruch staje się przeciągnięciem, nie stuknięciem. */
  dragThreshold?: number;
  /** Minimalna prędkość swipe (jednostki/s). */
  swipeSpeed?: number;
}

/**
 * Gesty jednego palca na kontenerze: tap, drag, swipe.
 * Współrzędne w lokalnym układzie `target` (czyli w jednostkach gry, jeśli target jest w root).
 */
export function gestures(target: Container, opts: GestureOptions = {}): Emitter<GestureEvents> {
  const bus = new Emitter<GestureEvents>();
  const threshold = opts.dragThreshold ?? 16;
  const swipeSpeed = opts.swipeSpeed ?? 900;
  let id: number | null = null;
  let start = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };
  // Próbki z ostatnich ~100 ms: prędkość puszczenia = przesunięcie / czas w tym oknie.
  let samples: { x: number; y: number; t: number }[] = [];
  let dragging = false;

  const velocity = (now: number) => {
    const recent = samples.filter((s) => now - s.t <= 100);
    const first = recent[0];
    const lastSample = recent[recent.length - 1];
    if (!first || !lastSample || lastSample.t - first.t < 8) return { x: 0, y: 0 };
    const dt = (lastSample.t - first.t) / 1000;
    return { x: (lastSample.x - first.x) / dt, y: (lastSample.y - first.y) / dt };
  };

  target.eventMode = 'static';

  const local = (e: FederatedPointerEvent) => target.toLocal(e.global);

  target.on('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId;
    const p = local(e);
    start = { x: p.x, y: p.y };
    last = { x: p.x, y: p.y };
    samples = [{ x: p.x, y: p.y, t: performance.now() }];
    dragging = false;
  });

  target.on('globalpointermove', (e) => {
    if (e.pointerId !== id) return;
    const p = local(e);
    const now = performance.now();
    samples.push({ x: p.x, y: p.y, t: now });
    if (samples.length > 24) samples.shift();
    if (!dragging && Math.hypot(p.x - start.x, p.y - start.y) >= threshold) {
      dragging = true;
      bus.emit('dragStart', { ...start });
    }
    if (dragging) bus.emit('drag', { x: p.x, y: p.y, dx: p.x - last.x, dy: p.y - last.y });
    last = { x: p.x, y: p.y };
  });

  const end = (e: FederatedPointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    const p = local(e);
    if (!dragging) {
      bus.emit('tap', { x: p.x, y: p.y });
      return;
    }
    const vel = velocity(performance.now());
    bus.emit('dragEnd', { x: p.x, y: p.y, vx: vel.x, vy: vel.y });
    const speed = Math.hypot(vel.x, vel.y);
    if (speed >= swipeSpeed) {
      const dir: SwipeDir =
        Math.abs(vel.x) > Math.abs(vel.y) ? (vel.x > 0 ? 'right' : 'left') : vel.y > 0 ? 'down' : 'up';
      bus.emit('swipe', { dir, vx: vel.x, vy: vel.y });
    }
  };
  target.on('pointerup', end);
  target.on('pointerupoutside', end);

  return bus;
}
