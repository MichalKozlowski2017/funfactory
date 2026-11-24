/**
 * Colouring page: splits an outline drawing into regions (connected components of non-line pixels).
 * Computed once after loading; filling swaps the colour of every pixel of one region,
 * so nothing "leaks" through the anti-aliased line edges. Pure TS (arrays), no canvas.
 */

/** Region labels: 0 = line, 1.. = regions. `dark` tells whether a pixel is a line. */
export function labelRegions(w: number, h: number, dark: (i: number) => boolean): { labels: Int32Array; count: number; sizes: number[] } {
  const labels = new Int32Array(w * h);
  const sizes = [0];
  let next = 1;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (labels[start] !== 0 || dark(start)) continue;
    let size = 0;
    labels[start] = next;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0 && labels[i - 1] === 0 && !dark(i - 1)) (labels[i - 1] = next), stack.push(i - 1);
      if (x < w - 1 && labels[i + 1] === 0 && !dark(i + 1)) (labels[i + 1] = next), stack.push(i + 1);
      if (y > 0 && labels[i - w] === 0 && !dark(i - w)) (labels[i - w] = next), stack.push(i - w);
      if (y < h - 1 && labels[i + w] === 0 && !dark(i + w)) (labels[i + w] = next), stack.push(i + w);
    }
    sizes.push(size);
    next++;
  }
  return { labels, count: next - 1, sizes };
}

/** Region under a point; for a line or tiny gaps, the nearest large region within `r` pixels. */
export function regionAt(labels: Int32Array, sizes: number[], w: number, h: number, x: number, y: number, minSize = 60, r = 10): number {
  let best = 0;
  let bestD = Infinity;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const px = Math.round(x) + dx;
      const py = Math.round(y) + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const l = labels[py * w + px]!;
      if (l === 0 || sizes[l]! < minSize) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD) (bestD = d), (best = l);
    }
  return best;
}

/**
 * Region thickness: for each region, the radius of the largest circle that fits inside it (in pixels,
 * chessboard metric). Narrow strips and small loops have a small radius even when they have many pixels.
 */
export function regionThickness(labels: Int32Array, w: number, h: number, count: number): number[] {
  const dist = new Int32Array(w * h);
  const BIG = 1 << 20;
  for (let i = 0; i < w * h; i++) dist[i] = labels[i] === 0 ? 0 : BIG;
  // Two passes (distance transform, 8-neighbourhood): a pixel of another region is also a boundary.
  const edge = (i: number, j: number) => labels[j] !== labels[i];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      if (x === 0 || y === 0) {
        dist[i] = 1;
        continue;
      }
      for (const j of [i - 1, i - w, i - w - 1, i - w + 1]) {
        if (x === w - 1 && j === i - w + 1) continue;
        dist[i] = Math.min(dist[i]!, edge(i, j) ? 1 : dist[j]! + 1);
      }
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      if (x === w - 1 || y === h - 1) {
        dist[i] = 1;
        continue;
      }
      for (const j of [i + 1, i + w, i + w + 1, i + w - 1]) {
        if (x === 0 && j === i + w - 1) continue;
        dist[i] = Math.min(dist[i]!, edge(i, j) ? 1 : dist[j]! + 1);
      }
    }
  const thick = new Array<number>(count + 1).fill(0);
  for (let i = 0; i < w * h; i++) {
    const l = labels[i]!;
    if (l && dist[i]! > thick[l]!) thick[l] = dist[i]!;
  }
  return thick;
}

/**
 * Merges regions too narrow for a child's finger (radius < `minRadius`) into a neighbouring thick region
 * (the one they share the longest border with across a line up to `reach` pixels thick; never the background). Filling the thick
 * region also fills the merged ones. A region with no thick neighbour stays alone (and cannot be filled).
 */
export function mergeThin(labels: Int32Array, sizes: number[], w: number, h: number, minRadius: number, reach = 8): { labels: Int32Array; sizes: number[] } {
  const count = sizes.length - 1;
  const thick = regionThickness(labels, w, h, count);
  const thin = (l: number) => l > 0 && thick[l]! < minRadius;
  // The background (the region touching the image edge) does not absorb drawing details: a fin isn't filled together with the background.
  const outside = new Set<number>();
  for (let x = 0; x < w; x++) outside.add(labels[x]!).add(labels[(h - 1) * w + x]!);
  for (let y = 0; y < h; y++) outside.add(labels[y * w]!).add(labels[y * w + w - 1]!);
  const votes = new Map<number, Map<number, number>>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const l = labels[y * w + x]!;
      if (!thin(l)) continue;
      // Only pixels at the region edge: look across the line in four directions.
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        for (let k = 1; k <= reach; k++) {
          const px = x + dx * k;
          const py = y + dy * k;
          if (px < 0 || py < 0 || px >= w || py >= h) break;
          const o = labels[py * w + px]!;
          if (o === l) break;
          if (o === 0) continue;
          if (!thin(o) && !outside.has(o)) {
            const v = votes.get(l) ?? new Map<number, number>();
            v.set(o, (v.get(o) ?? 0) + 1);
            votes.set(l, v);
          }
          break;
        }
      }
    }
  const target = new Int32Array(count + 1);
  for (let l = 1; l <= count; l++) target[l] = l;
  for (const [l, v] of votes) target[l] = [...v.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  const out = new Int32Array(labels.length);
  const outSizes = new Array<number>(count + 1).fill(0);
  for (let i = 0; i < labels.length; i++) {
    const t = target[labels[i]!]!;
    out[i] = t;
    if (t) outSizes[t]!++;
  }
  // A region left narrow with no neighbour is not a touch target.
  for (let l = 1; l <= count; l++) if (thin(l) && target[l] === l) outSizes[l] = 0;
  return { labels: out, sizes: outSizes };
}
