import type { Container } from 'pixi.js';
import { damp } from '@funfactory/core';

export interface FollowCameraOptions {
  /** Szybkość dochodzenia do celu (większa = sztywniej). */
  lambda?: number;
  /** Kamera tylko w górę (wspinaczki, runnery pionowe). */
  upOnly?: boolean;
  /** Ograniczenia pozycji kamery (lewy górny róg widoku w świecie). */
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

/**
 * Kamera 2D: (x, y) to punkt świata w lewym górnym rogu ekranu.
 * Przesuwa kontener świata; trzęsienie (Shaker) podpinaj do rodzica świata, nie do niego.
 */
export class FollowCamera {
  x = 0;
  y = 0;
  private readonly layers: { layer: Container; factor: number; baseY: number; baseX: number }[] = [];

  private readonly world: Container;
  opts: FollowCameraOptions;

  constructor(world: Container, opts: FollowCameraOptions = {}) {
    this.world = world;
    this.opts = opts;
  }

  /** Natychmiast ustaw kamerę. */
  snap(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.clamp();
    this.apply();
  }

  /** Dąż do pozycji (x, y) lewego górnego rogu widoku. */
  follow(targetX: number, targetY: number, dt: number): void {
    const lambda = this.opts.lambda ?? 6;
    this.x = damp(this.x, targetX, lambda, dt);
    const nextY = damp(this.y, targetY, lambda, dt);
    this.y = this.opts.upOnly ? Math.min(this.y, nextY) : nextY;
    this.clamp();
    this.apply();
  }

  /** Warstwa paralaksy: przesuwa się o `factor` ruchu kamery (0 = stoi, 1 = jak świat). */
  addParallax(layer: Container, factor: number): void {
    this.layers.push({ layer, factor, baseX: layer.x, baseY: layer.y });
    this.apply();
  }

  /** Punkt ekranu (jednostki gry) -> punkt świata. */
  toWorld(screenX: number, screenY: number): { x: number; y: number } {
    return { x: screenX + this.x, y: screenY + this.y };
  }

  private clamp(): void {
    const o = this.opts;
    if (o.minX !== undefined) this.x = Math.max(o.minX, this.x);
    if (o.maxX !== undefined) this.x = Math.min(o.maxX, this.x);
    if (o.minY !== undefined) this.y = Math.max(o.minY, this.y);
    if (o.maxY !== undefined) this.y = Math.min(o.maxY, this.y);
  }

  private apply(): void {
    this.world.position.set(-this.x, -this.y);
    for (const l of this.layers) l.layer.position.set(l.baseX - this.x * l.factor, l.baseY - this.y * l.factor);
  }
}
