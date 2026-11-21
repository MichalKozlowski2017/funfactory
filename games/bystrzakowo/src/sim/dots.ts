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

/** Obrazki do łączenia: o charakterystycznej sylwetce (te same co w cieniach). */
export function makeDotsRound(rng: Rng): Item[] {
  const pool = ITEMS.filter((i) => i.shadow);
  return rng.shuffle(pool.length >= DOTS_ROUND ? pool : ITEMS).slice(0, DOTS_ROUND);
}

/** Czy palec (x, y) trafił w kropkę (tolerancja dla małych palców). */
export const hitsDot = (p: Point, dot: Point, radius: number): boolean => Math.hypot(p.x - dot.x, p.y - dot.y) <= radius;
