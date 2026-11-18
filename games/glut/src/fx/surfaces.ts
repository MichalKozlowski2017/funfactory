import type { Graphics } from 'pixi.js';
import { Rng } from '@funfactory/core';
import type { Block } from '../sim/physics.ts';
import { SHAFT } from '../sim/shaft.ts';

/** Kolory powierzchni (cukierkowa paleta). */
export const SURFACE = {
  rock: 0x3a2850,
  rockEdge: 0x523a70,
  frosting: 0xffb3d1,
  frostingShade: 0xe58bb1,
  biscuit: 0xd9965f,
  biscuitShade: 0xa96a3c,
  ice: 0xa8e9ff,
  iceShade: 0x6cc3e8,
  caramel: 0xff7a59,
  caramelShade: 0xc94a33,
  ink: 0x2a1a3a,
};

const seedOf = (b: Block) => (Math.round(b.x * 7 + b.y * 13 + b.w * 3) >>> 0) || 1;

/**
 * Falisty brzeg lukru wzdłuż krawędzi + nieregularne zacieki zakończone kroplą.
 * Krawędź pozioma: od x0 do x1 na wysokości `at`, lukier spływa w dół.
 * Krawędź pionowa: od y0 do y1 na x = `at`, fale wystają w stronę `inward`, zacieki spływają w dół po ścianie.
 */
function frostingEdge(g: Graphics, rng: Rng, from: number, to: number, at: number, color: number, vertical: boolean, inward = 1): void {
  let t = from + rng.range(4, 10);
  while (t < to - 4) {
    const r = rng.range(5, 8);
    if (vertical) g.circle(at + inward * (r * 0.35), t, r).fill({ color });
    else g.circle(t, at, r).fill({ color });
    t += rng.range(11, 17);
  }
  t = from + rng.range(10, 60);
  while (t < to - 20) {
    const len = rng.range(10, vertical ? 34 : 20);
    const w = rng.range(6, 9);
    if (vertical) {
      const x = at + inward * rng.range(2, 6) - w / 2;
      g.roundRect(x, t, w, len, w / 2).fill({ color });
      g.circle(x + w / 2, t + len, w * 0.62).fill({ color });
    } else {
      g.roundRect(t - w / 2, at, w, len, w / 2).fill({ color });
      g.circle(t, at + len, w * 0.62).fill({ color });
    }
    t += rng.range(vertical ? 90 : 34, vertical ? 200 : 70);
  }
}

/** Rysuje blok w palecie świata (domyślnie kryształowa jaskinia). */
export function drawBlock(g: Graphics, b: Block, P: typeof SURFACE = SURFACE): void {
  const rng = new Rng(seedOf(b));
  const isWall = b.x < 0 || b.x >= SHAFT.width - SHAFT.wall;

  if (b.w > SHAFT.width) {
    // Dno studni: skała z grubą warstwą lukru na górze.
    g.rect(b.x, b.y, b.w, b.h).fill({ color: P.rock });
    g.rect(b.x, b.y, b.w, 12).fill({ color: P.frosting });
    frostingEdge(g, rng, b.x, b.x + b.w, b.y + 12, P.frosting, false);
    g.rect(b.x, b.y, b.w, 4).fill({ color: 0xffffff, alpha: 0.35 });
    return;
  }

  if (isWall) {
    const left = b.x < 0;
    const edge = left ? b.x + b.w : b.x; // wewnętrzna krawędź ściany
    const inward = left ? 1 : -1;
    g.rect(b.x, b.y, b.w, b.h).fill({ color: P.rock });
    // Ciemniejsze plamy skały, żeby ściana nie była płaska.
    for (let i = 0; i < 3; i++) {
      const cy = b.y + rng.range(20, Math.max(21, b.h - 20));
      g.ellipse(edge - inward * rng.range(14, 30), cy, rng.range(8, 16), rng.range(10, 24)).fill({ color: P.rockEdge, alpha: 0.6 });
    }
    if (b.surface === 'sticky') {
      // Pas lukru na krawędzi + zacieki do środka studni.
      const x = left ? edge - 10 : edge;
      g.rect(x, b.y, 10, b.h).fill({ color: P.frosting });
      g.rect(left ? edge - 3 : edge, b.y, 3, b.h).fill({ color: P.frostingShade });
      frostingEdge(g, rng, b.y, b.y + b.h, edge, P.frosting, true, inward);
    } else if (b.surface === 'ice') {
      const x = left ? edge - 14 : edge;
      g.rect(x, b.y, 14, b.h).fill({ color: P.ice, alpha: 0.95 });
      g.rect(left ? edge - 4 : edge, b.y, 4, b.h).fill({ color: P.iceShade });
      // Odblaski.
      for (let y = b.y + rng.range(10, 40); y < b.y + b.h - 30; y += rng.range(50, 90)) {
        g.poly([x + 3, y, x + 7, y, x + 11, y + 26, x + 7, y + 26]).fill({ color: 0xffffff, alpha: 0.7 });
      }
    } else {
      // Karmelowe kolce skierowane do środka.
      const n = Math.max(1, Math.floor(b.h / 30));
      for (let i = 0; i < n; i++) {
        const y = b.y + (i + 0.5) * (b.h / n);
        const tip = edge + inward * 24;
        g.poly([edge, y - 13, tip, y, edge, y + 13]).fill({ color: P.caramel }).stroke({ color: P.ink, width: 3, join: 'round' });
        g.poly([edge, y - 7, edge + inward * 12, y - 1, edge, y]).fill({ color: 0xffffff, alpha: 0.45 });
      }
    }
    return;
  }

  if (b.surface === 'spikes') {
    // Kolce pod półką: zęby w dół.
    const n = Math.max(1, Math.floor(b.w / 30));
    for (let i = 0; i < n; i++) {
      const x = b.x + (i + 0.5) * (b.w / n);
      g.poly([x - 13, b.y, x, b.y + b.h + 8, x + 13, b.y]).fill({ color: P.caramel }).stroke({ color: P.ink, width: 3, join: 'round' });
      g.poly([x - 7, b.y + 2, x - 1, b.y + 2, x - 1, b.y + b.h - 2]).fill({ color: 0xffffff, alpha: 0.4 });
    }
    return;
  }

  if (b.surface === 'ice') {
    g.roundRect(b.x, b.y, b.w, b.h, 12).fill({ color: P.ice, alpha: 0.95 }).stroke({ color: P.ink, width: 3 });
    g.roundRect(b.x + 6, b.y + 5, b.w - 12, 6, 3).fill({ color: 0xffffff, alpha: 0.8 });
    for (let x = b.x + rng.range(14, 30); x < b.x + b.w - 20; x += rng.range(40, 70)) {
      g.poly([x, b.y + 14, x + 6, b.y + 14, x + 14, b.y + b.h - 6, x + 8, b.y + b.h - 6]).fill({ color: 0xffffff, alpha: 0.55 });
    }
    return;
  }

  // Herbatnik z lukrem.
  g.roundRect(b.x, b.y, b.w, b.h, 12).fill({ color: P.biscuit }).stroke({ color: P.ink, width: 3 });
  g.roundRect(b.x + 4, b.y + b.h - 10, b.w - 8, 6, 3).fill({ color: P.biscuitShade });
  for (let x = b.x + rng.range(16, 30); x < b.x + b.w - 14; x += rng.range(26, 44)) {
    g.circle(x, b.y + b.h * 0.62, 2.4).fill({ color: P.biscuitShade });
  }
  g.roundRect(b.x - 2, b.y - 3, b.w + 4, 16, 8).fill({ color: P.frosting }).stroke({ color: P.ink, width: 3 });
  frostingEdge(g, rng, b.x + 6, b.x + b.w - 6, b.y + 11, P.frosting, false);
  g.roundRect(b.x + 8, b.y, Math.min(60, b.w * 0.3), 4, 2).fill({ color: 0xffffff, alpha: 0.6 });
}
