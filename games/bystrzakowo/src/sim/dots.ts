/**
 * Connect the dots (Lusia's Path): dots placed on the outline of a catalog picture.
 * The outline is computed from the alpha mask with rays from the center of mass (enough for compact silhouettes),
 * dots evenly spaced along the outline. Pure TS: the mask is a 0/1 array, no canvas.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const DOTS_ROUND = 3;

/** Number of dots per level (up to 10, because the narrator counts to ten). */
export const dotCount = (level: number): number => [5, 8, 10][Math.max(0, Math.min(MAX_LEVEL, Math.round(level)))] as number;

export interface Point {
  x: number;
  y: number;
}

/**
 * Mask outline (width `w`, height `h`, values 0/1) as a polygon: for each of `rays` directions from the center
 * of mass, the farthest opaque pixel. Coordinates normalized to 0..1.
 */
export function radialContour(mask: Uint8Array, w: number, h: number, rays = 180): Point[] {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        sx += x;
        sy += y;
        n++;
      }
  if (n === 0) return [];
  const cx = sx / n;
  const cy = sy / n;
  const maxR = Math.hypot(w, h);
  const out: Point[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let far = 0;
    for (let r = 0; r < maxR; r += 0.5) {
      const x = Math.round(cx + dx * r);
      const y = Math.round(cy + dy * r);
      if (x < 0 || y < 0 || x >= w || y >= h) break;
      if (mask[y * w + x]) far = r;
    }
    out.push({ x: (cx + dx * far) / w, y: (cy + dy * far) / h });
  }
  return out;
}

/**
 * Outer edge of the mask's largest blob (Moore neighbor tracing), smoothed and thinned out.
 * Unlike the ray outline, it also goes into concavities (scooter, banana, giraffe).
 * Coordinates normalized to 0..1.
 */
export function traceContour(mask: Uint8Array, w: number, h: number, smoothing = 1): Point[] {
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  // Largest blob (flood fill), so tiny specks don't start the outline.
  const comp = new Int32Array(w * h).fill(-1);
  let best = -1;
  let bestSize = 0;
  let id = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || comp[i] !== -1) continue;
    const stack = [i];
    comp[i] = id;
    let size = 0;
    while (stack.length) {
      const j = stack.pop()!;
      size++;
      const x = j % w;
      const y = (j - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (at(nx, ny) && comp[ny * w + nx] === -1) {
          comp[ny * w + nx] = id;
          stack.push(ny * w + nx);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
    id++;
  }
  if (best < 0) return [];
  const inBlob = (x: number, y: number) => at(x, y) && comp[y * w + x] === best;
  let start = -1;
  for (let i = 0; i < w * h && start < 0; i++) if (comp[i] === best) start = i;
  const sx = start % w;
  const sy = (start - sx) / w;
  // Neighbors clockwise, starting from the left.
  const DIRS = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]] as const;
  const out: [number, number][] = [[sx, sy]];
  let cx = sx;
  let cy = sy;
  let back = 0; // direction we came from (start: from the left, since it's the topmost-leftmost pixel)
  for (let guard = 0; guard < w * h * 4; guard++) {
    let found = false;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8;
      const nx = cx + DIRS[d]![0];
      const ny = cy + DIRS[d]![1];
      if (inBlob(nx, ny)) {
        back = (d + 4) % 8;
        cx = nx;
        cy = ny;
        found = true;
        break;
      }
    }
    if (!found || (cx === sx && cy === sy)) break;
    out.push([cx, cy]);
  }
  // Smoothing (moving average) and thinning to every ~1% of the perimeter.
  const n = out.length;
  const r = Math.max(1, Math.round((n / 120) * smoothing));
  const smooth = out.map((_, i) => {
    let ax = 0;
    let ay = 0;
    for (let k = -r; k <= r; k++) {
      const p = out[(i + k + n) % n]!;
      ax += p[0];
      ay += p[1];
    }
    return { x: ax / (2 * r + 1) / w, y: ay / (2 * r + 1) / h };
  });
  const step = Math.max(1, Math.floor(n / 200));
  return smooth.filter((_, i) => i % step === 0);
}

/** `count` points evenly along the perimeter of a closed polygon, starting from the topmost point. */
export function evenDots(poly: Point[], count: number): Point[] {
  if (poly.length < 3) return [];
  const top = poly.reduce((best, p, i) => (p.y < poly[best]!.y ? i : best), 0);
  const ring = [...poly.slice(top), ...poly.slice(0, top)];
  const seg = ring.map((p, i) => Math.hypot(ring[(i + 1) % ring.length]!.x - p.x, ring[(i + 1) % ring.length]!.y - p.y));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Point[] = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (acc + seg[i]! < target) acc += seg[i++]!;
    const t = seg[i]! > 0 ? (target - acc) / seg[i]! : 0;
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** Smallest distance between two dots (in 0..1 coordinates). */
export const minGap = (dots: readonly Point[]): number => {
  let best = Infinity;
  for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) best = Math.min(best, Math.hypot(dots[i]!.x - dots[j]!.x, dots[i]!.y - dots[j]!.y));
  return best;
};

/**
 * Dots along the picture's edge. When two land too close (a narrow notch, e.g. between the ears), the outline is
 * smoothed harder until the notch disappears; in the end the version with the largest gap is picked.
 */
export function dotsOnEdge(mask: Uint8Array, w: number, h: number, count: number): Point[] {
  let best: Point[] = [];
  for (const smoothing of [1, 2, 4, 8]) {
    const dots = evenDots(traceContour(mask, w, h, smoothing), count);
    if (!best.length || minGap(dots) > minGap(best)) best = dots;
    if (minGap(dots) >= 0.11) return dots;
  }
  return best;
}

/** Pictures to connect: ones with a distinctive silhouette (the same as in shadows). */
export function makeDotsRound(rng: Rng): Item[] {
  // Thin parts (balloon string, ukulele neck, spade handle): dots and digits crowd on them.
  const THIN = new Set(['small-balloon', 'ukulele', 'spade']);
  const pool = ITEMS.filter((i) => i.shadow && !THIN.has(i.id));
  return rng.shuffle(pool.length >= DOTS_ROUND ? pool : ITEMS).slice(0, DOTS_ROUND);
}

/** Whether the finger (x, y) hit a dot (tolerance for small fingers). */
export const hitsDot = (p: Point, dot: Point, radius: number): boolean => Math.hypot(p.x - dot.x, p.y - dot.y) <= radius;
