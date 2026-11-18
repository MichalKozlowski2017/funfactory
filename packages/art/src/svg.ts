/**
 * Mały builder SVG. Grafiki wektorowe pisane w kodzie: postaci składane z części,
 * ikony, elementy UI. kit2d zamienia wynik na teksturę w rozdzielczości ekranu.
 *
 * ```ts
 * const blob = svg(128, 128, [
 *   circle(64, 64, 50, { fill: '#ff9ebb', stroke: '#1e1530', strokeWidth: 6 }),
 * ]);
 * ```
 */

export type Attrs = Record<string, string | number | undefined>;

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const attrs = (a: Attrs = {}): string =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${kebab(k)}="${esc(String(v))}"`)
    .join('');

export const el = (tag: string, a: Attrs = {}, children: string[] = []): string =>
  children.length ? `<${tag}${attrs(a)}>${children.join('')}</${tag}>` : `<${tag}${attrs(a)}/>`;

export const svg = (width: number, height: number, children: string[], a: Attrs = {}): string =>
  el('svg', { xmlns: 'http://www.w3.org/2000/svg', width, height, viewBox: `0 0 ${width} ${height}`, ...a }, children);

export const group = (children: string[], a: Attrs = {}): string => el('g', a, children);

export const circle = (cx: number, cy: number, r: number, a: Attrs = {}): string => el('circle', { cx, cy, r, ...a });

export const ellipse = (cx: number, cy: number, rx: number, ry: number, a: Attrs = {}): string =>
  el('ellipse', { cx, cy, rx, ry, ...a });

export const rect = (x: number, y: number, w: number, h: number, a: Attrs = {}): string =>
  el('rect', { x, y, width: w, height: h, ...a });

export const path = (d: string, a: Attrs = {}): string => el('path', { d, ...a });

export const text = (x: number, y: number, content: string, a: Attrs = {}): string =>
  el('text', { x, y, ...a }, [esc(content)]);

export const linearGradient = (id: string, stops: [offset: number, color: string][], vertical = true): string =>
  el(
    'linearGradient',
    { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 },
    stops.map(([offset, color]) => el('stop', { offset, stopColor: color })),
  );

export const radialGradient = (id: string, stops: [offset: number, color: string][]): string =>
  el('radialGradient', { id }, stops.map(([offset, color]) => el('stop', { offset, stopColor: color })));

export const defs = (children: string[]): string => el('defs', {}, children);

/** Gładki zamknięty kształt przez punkty (Catmull-Rom -> Bezier). Dobry do „blobów” i organicznych sylwetek. */
export const smoothClosedPath = (points: readonly [number, number][], tension = 1): string => {
  const n = points.length;
  if (n < 3) return '';
  const p = (i: number) => points[((i % n) + n) % n] as [number, number];
  let d = `M${p(0)[0].toFixed(2)},${p(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const c1x = x1 + ((x2 - x0) / 6) * tension;
    const c1y = y1 + ((y2 - y0) / 6) * tension;
    const c2x = x2 - ((x3 - x1) / 6) * tension;
    const c2y = y2 - ((y3 - y1) / 6) * tension;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }
  return d + 'Z';
};

/** Organiczny blob wokół środka. `wobble` 0–0.4, `rand` to np. `() => rng.next()`. */
export const blobPoints = (
  cx: number,
  cy: number,
  radius: number,
  count: number,
  wobble: number,
  rand: () => number,
): [number, number][] =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = radius * (1 + (rand() * 2 - 1) * wobble);
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });

/** Data URL do załadowania jako obraz. */
export const svgDataUrl = (markup: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
