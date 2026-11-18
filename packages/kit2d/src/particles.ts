import { Particle, ParticleContainer, type Texture } from 'pixi.js';
import type { Rng } from '@funfactory/core';

export interface BurstConfig {
  count: number;
  /** Prędkość początkowa [min, max] w jednostkach/s. */
  speed: [number, number];
  /** Kierunek środkowy (radiany) i rozrzut. Domyślnie pełne koło. */
  angle?: number;
  spread?: number;
  /** Czas życia [min, max] w sekundach. */
  life: [number, number];
  /** Skala na starcie [min, max] i mnożnik na końcu życia. */
  scale?: [number, number];
  endScale?: number;
  gravity?: number;
  /** Opór powietrza, 0 = brak, 3 = szybko hamuje. */
  drag?: number;
  spin?: [number, number];
  /** Kolory (0xRRGGBB), losowane per cząsteczka. */
  colors?: number[];
  /** Zanikanie alfa pod koniec życia. */
  fade?: boolean;
}

interface Live {
  p: Particle;
  vx: number;
  vy: number;
  vr: number;
  age: number;
  life: number;
  s0: number;
  s1: number;
  gravity: number;
  drag: number;
  fade: boolean;
}

/**
 * Emiter cząsteczek na ParticleContainer (jedna tekstura = jeden draw call, tysiące cząsteczek).
 * Iskry, kurz, konfetti, rozbryzgi.
 */
export class Particles {
  /** Dodaj do sceny: `scene.addChild(particles.view)`. */
  readonly view = new ParticleContainer({
    dynamicProperties: { position: true, rotation: true, vertex: true, color: true },
  });
  private live: Live[] = [];
  private pool: Particle[] = [];

  constructor(
    private readonly texture: Texture,
    private readonly rng: Rng,
  ) {}

  burst(x: number, y: number, cfg: BurstConfig): void {
    const r = this.rng;
    const spread = cfg.spread ?? Math.PI * 2;
    const center = cfg.angle ?? 0;
    for (let i = 0; i < cfg.count; i++) {
      const p = this.pool.pop() ?? new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5 });
      const angle = center + (r.next() - 0.5) * spread;
      const speed = r.range(cfg.speed[0], cfg.speed[1]);
      const s0 = cfg.scale ? r.range(cfg.scale[0], cfg.scale[1]) : 1;
      p.x = x;
      p.y = y;
      p.rotation = r.next() * Math.PI * 2;
      p.scaleX = p.scaleY = s0;
      p.tint = cfg.colors ? r.pick(cfg.colors) : 0xffffff;
      p.alpha = 1;
      this.view.addParticle(p);
      this.live.push({
        p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vr: cfg.spin ? r.range(cfg.spin[0], cfg.spin[1]) : 0,
        age: 0,
        life: r.range(cfg.life[0], cfg.life[1]),
        s0,
        s1: s0 * (cfg.endScale ?? 0),
        gravity: cfg.gravity ?? 0,
        drag: cfg.drag ?? 0,
        fade: cfg.fade ?? true,
      });
    }
  }

  /** Woła scena co klatkę. */
  update(dt: number): void {
    const keep: Live[] = [];
    for (const l of this.live) {
      l.age += dt;
      if (l.age >= l.life) {
        this.view.removeParticle(l.p);
        this.pool.push(l.p);
        continue;
      }
      const k = Math.exp(-l.drag * dt);
      l.vx *= k;
      l.vy = l.vy * k + l.gravity * dt;
      l.p.x += l.vx * dt;
      l.p.y += l.vy * dt;
      l.p.rotation += l.vr * dt;
      const t = l.age / l.life;
      const s = l.s0 + (l.s1 - l.s0) * t;
      l.p.scaleX = l.p.scaleY = s;
      if (l.fade) l.p.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      keep.push(l);
    }
    this.live = keep;
  }

  get alive(): number {
    return this.live.length;
  }
}
