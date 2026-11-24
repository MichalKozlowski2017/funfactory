import { describe, expect, it } from 'vitest';
import { labelRegions, mergeThin, regionAt } from './fill.ts';

/** Picture from text: '#' is a line, the rest is background. */
function grid(rows: string[]) {
  const w = rows[0]!.length;
  const h = rows.length;
  const dark = (i: number) => rows[Math.floor(i / w)]![i % w] === '#';
  return { w, h, ...labelRegions(w, h, dark) };
}

describe('coloring', () => {
  // Large 12×12 area with a narrow (1 px) strip behind the line on the right and a tiny hole in the middle.
  const rows = Array.from({ length: 14 }, (_, y) => {
    if (y === 0 || y === 13) return '#'.repeat(16);
    let r = '#' + '.'.repeat(12) + '#.#';
    if (y >= 5 && y <= 7) r = r.split('').map((c, x) => (x >= 5 && x <= 7 ? (y === 6 && x === 6 ? '.' : '#') : c)).join('');
    return r;
  });
  const g = grid(rows);
  const at = (x: number, y: number) => y * g.w + x;

  it('splits the picture into regions between lines', () => {
    expect(g.count).toBe(3);
  });

  it('merges narrow strips and holes into the neighboring large region', () => {
    const m = mergeThin(g.labels, g.sizes, g.w, g.h, 2, 3);
    const big = m.labels[at(1, 1)]!;
    expect(m.labels[at(14, 3)]).toBe(big); // strip
    expect(m.labels[at(6, 6)]).toBe(big); // hole
    expect(m.sizes[big]).toBe(g.sizes[big]! + 12 + 1);
  });

  it('touching a line picks the nearest region', () => {
    const m = mergeThin(g.labels, g.sizes, g.w, g.h, 2, 3);
    expect(regionAt(m.labels, m.sizes, g.w, g.h, 0, 3, 1, 2)).toBe(m.labels[at(1, 1)]);
  });
});
