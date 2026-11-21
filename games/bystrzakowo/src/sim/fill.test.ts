import { describe, expect, it } from 'vitest';
import { labelRegions, mergeThin, regionAt } from './fill.ts';

/** Obrazek z tekstu: '#' to linia, reszta to tło. */
function grid(rows: string[]) {
  const w = rows[0]!.length;
  const h = rows.length;
  const dark = (i: number) => rows[Math.floor(i / w)]![i % w] === '#';
  return { w, h, ...labelRegions(w, h, dark) };
}

describe('kolorowanka', () => {
  // Duże pole (6×6) z wąskim paskiem (1 px) za linią po prawej i maleńkim oczkiem w środku.
  // Duże pole 12×12 z wąskim paskiem (1 px) za linią po prawej i maleńkim oczkiem w środku.
  const rows = Array.from({ length: 14 }, (_, y) => {
    if (y === 0 || y === 13) return '#'.repeat(16);
    let r = '#' + '.'.repeat(12) + '#.#';
    if (y >= 5 && y <= 7) r = r.split('').map((c, x) => (x >= 5 && x <= 7 ? (y === 6 && x === 6 ? '.' : '#') : c)).join('');
    return r;
  });
  const g = grid(rows);
  const at = (x: number, y: number) => y * g.w + x;

  it('dzieli obrazek na obszary między liniami', () => {
    expect(g.count).toBe(3);
  });

  it('wąskie pasy i oczka dołącza do sąsiedniego dużego pola', () => {
    const m = mergeThin(g.labels, g.sizes, g.w, g.h, 2, 3);
    const big = m.labels[at(1, 1)]!;
    expect(m.labels[at(14, 3)]).toBe(big); // pasek
    expect(m.labels[at(6, 6)]).toBe(big); // oczko
    expect(m.sizes[big]).toBe(g.sizes[big]! + 12 + 1);
  });

  it('dotknięcie linii łapie najbliższe pole', () => {
    const m = mergeThin(g.labels, g.sizes, g.w, g.h, 2, 3);
    expect(regionAt(m.labels, m.sizes, g.w, g.h, 0, 3, 1, 2)).toBe(m.labels[at(1, 1)]);
  });
});
