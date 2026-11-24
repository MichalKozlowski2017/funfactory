/**
 * Łączenie kropek (Ścieżka Lusi): kropki rozmieszczone na konturze obrazka z katalogu.
 * Kontur liczony z maski alfa promieniami ze środka masy (dla zwartych sylwetek wystarcza),
 * kropki równo po długości konturu. Czysty TS: maska to tablica 0/1, bez canvasa.
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const DOTS_ROUND = 3;

/** Liczba kropek na poziomie (do 10, bo lektor liczy do dziesięciu). */
export const dotCount = (level: number): number => [5, 8, 10][Math.max(0, Math.min(MAX_LEVEL, Math.round(level)))] as number;

export interface Point {
  x: number;
  y: number;
}

/**
 * Kontur maski (szerokość `w`, wysokość `h`, wartości 0/1) jako wielokąt: dla `rays` kierunków ze środka
 * masy najdalszy nieprzezroczysty piksel. Współrzędne znormalizowane do 0..1.
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
 * Zewnętrzna krawędź największej plamy maski (śledzenie sąsiadów Moore'a), wygładzona i przerzedzona.
 * W przeciwieństwie do konturu z promieni idzie też w głąb wklęsłości (hulajnoga, banan, żyrafa).
 * Współrzędne znormalizowane do 0..1.
 */
export function traceContour(mask: Uint8Array, w: number, h: number, smoothing = 1): Point[] {
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  // Największa plama (zalewanie), żeby drobne okruchy nie zaczynały konturu.
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
  // Sąsiedzi zgodnie z ruchem wskazówek zegara, od lewego.
  const DIRS = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]] as const;
  const out: [number, number][] = [[sx, sy]];
  let cx = sx;
  let cy = sy;
  let back = 0; // kierunek, z którego przyszliśmy (start: z lewej, bo to najwyższy-najbardziej lewy piksel)
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
  // Wygładzenie (średnia ruchoma) i przerzedzenie co ~1% obwodu.
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

/** `count` punktów równo po obwodzie zamkniętego wielokąta, zaczynając od najwyższego punktu. */
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

/** Najmniejsza odległość między dwiema kropkami (we współrzędnych 0..1). */
export const minGap = (dots: readonly Point[]): number => {
  let best = Infinity;
  for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) best = Math.min(best, Math.hypot(dots[i]!.x - dots[j]!.x, dots[i]!.y - dots[j]!.y));
  return best;
};

/**
 * Kropki po krawędzi obrazka. Gdy dwie wypadają za blisko (wąskie wcięcie, np. między uszami), kontur jest
 * mocniej wygładzany, aż wcięcie zniknie; na końcu wybór wersji z największym odstępem.
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

/** Obrazki do łączenia: o charakterystycznej sylwetce (te same co w cieniach). */
export function makeDotsRound(rng: Rng): Item[] {
  // Cienkie części (sznurek balonika, gryf ukulele, trzonek łopatki): kropki i cyfry się na nich tłoczą.
  const THIN = new Set(['small-balloon', 'ukulele', 'spade']);
  const pool = ITEMS.filter((i) => i.shadow && !THIN.has(i.id));
  return rng.shuffle(pool.length >= DOTS_ROUND ? pool : ITEMS).slice(0, DOTS_ROUND);
}

/** Czy palec (x, y) trafił w kropkę (tolerancja dla małych palców). */
export const hitsDot = (p: Point, dot: Point, radius: number): boolean => Math.hypot(p.x - dot.x, p.y - dot.y) <= radius;
