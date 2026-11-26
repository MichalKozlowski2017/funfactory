import { describe, expect, it } from 'vitest';
import { buildRegions, detailShade, labelRegions, mergeThin, pickRegion, regionAt } from './fill.ts';

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

describe('coloring regions (magic details)', () => {
  // 30×30: background, a big body (square) with a small detail (4×4 hole) and a tiny glint (1 px), a thin line between.
  const W = 30;
  const rows = Array.from({ length: W }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const inBody = x >= 3 && x <= 26 && y >= 3 && y <= 26;
      const border = inBody && (x === 3 || x === 26 || y === 3 || y === 26);
      const detailRing = x >= 9 && x <= 15 && y >= 9 && y <= 15 && (x === 9 || x === 15 || y === 9 || y === 15);
      const glintRing = x >= 19 && x <= 21 && y >= 19 && y <= 21 && !(x === 20 && y === 20);
      return border || detailRing || glintRing ? '#' : '.';
    }).join(''),
  );
  const dark = (i: number) => rows[Math.floor(i / W)]![i % W] === '#';
  const p = buildRegions(W, W, dark, { speck: 1, detailRadius: 4, highlight: 4, reach: 3 });
  const at = (x: number, y: number) => p.labels[y * W + x]!;

  it('keeps parts separate and finds the background', () => {
    expect(p.background).toBe(at(0, 0));
    expect(at(5, 5)).not.toBe(at(12, 12));
  });

  it('marks narrow parts as details with the surrounding part as parent', () => {
    const body = at(5, 5);
    expect(p.detail[at(12, 12)]).toBe(true);
    expect(p.parent[at(12, 12)]).toBe(body);
    expect(p.detail[body]).toBe(false);
    expect(p.keepWhite[at(20, 20)]).toBe(true);
  });

  it('a touch on the line picks the part more under the finger', () => {
    // On the body border, closer to the body: the body wins over the background.
    expect(pickRegion(p.labels, W, W, 4, 15, 4).region).toBe(at(5, 5));
    // Precisely inside the detail: the detail.
    expect(pickRegion(p.labels, W, W, 12, 12, 3).region).toBe(at(12, 12));
  });

  it('detail shade is lighter for dark colours and darker for light ones', () => {
    expect(detailShade(0x2f9e5b)).toBeGreaterThan(0x2f9e5b);
    expect(detailShade(0xffffff)).toBeLessThan(0xffffff);
  });
});
