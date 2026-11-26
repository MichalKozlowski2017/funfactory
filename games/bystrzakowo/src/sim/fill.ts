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

/**
 * Coloring page regions without merging (each part of the drawing is its own region):
 * - specks smaller than `speck` pixels become part of the line;
 * - `detail`: a region both narrow (inscribed radius < `detailRadius`) and small (< `detailArea` pixels; a long tail stays a
 *   touch target) that is not the background and lies on another part of the drawing (not only on the background);
 *   details colour themselves ("magic details") when their `parent` (the neighbour across the line they share
 *   the longest border with, preferably not the background) is painted;
 * - `keepWhite`: tiny details (under `highlight` pixels, e.g. glints in the eyes) stay white;
 * - `pixels[l]`: pixel indices of region l (filling without scanning the whole picture);
 * - `center[l]`: a pixel of the region nearest to its centroid (sparkles);
 * - `radius[l]`: inscribed radius in pixels (how wide the part is for a finger).
 */
export interface PageRegions {
  labels: Int32Array;
  sizes: number[];
  background: number;
  detail: boolean[];
  keepWhite: boolean[];
  parent: Int32Array;
  pixels: Int32Array[];
  center: [number, number][];
  radius: number[];
}

export function buildRegions(w: number, h: number, dark: (i: number) => boolean, o: { speck?: number; detailRadius?: number; detailArea?: number; highlight?: number; reach?: number } = {}): PageRegions {
  const speck = o.speck ?? 40;
  const detailRadius = o.detailRadius ?? 22;
  const highlight = o.highlight ?? 260;
  const reach = o.reach ?? 22;
  const detailArea = o.detailArea ?? 2500;
  const raw = labelRegions(w, h, dark);
  // Specks join the line; the rest is renumbered 1..n.
  const map = new Int32Array(raw.count + 1);
  let n = 0;
  for (let l = 1; l <= raw.count; l++) map[l] = raw.sizes[l]! >= speck ? ++n : 0;
  const labels = new Int32Array(w * h);
  const sizes = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < w * h; i++) {
    const l = map[raw.labels[i]!]!;
    labels[i] = l;
    if (l) sizes[l]!++;
  }
  const outside = new Set<number>();
  for (let x = 0; x < w; x++) outside.add(labels[x]!).add(labels[(h - 1) * w + x]!);
  for (let y = 0; y < h; y++) outside.add(labels[y * w]!).add(labels[y * w + w - 1]!);
  outside.delete(0);
  let background = 0;
  for (const l of outside) if (!background || sizes[l]! > sizes[background]!) background = l;
  const thick = regionThickness(labels, w, h, n);
  const detail = sizes.map((s, l) => l > 0 && !outside.has(l) && thick[l]! < detailRadius && s < detailArea);
  // Parent of a detail: votes across the line, from the detail's pixels in four directions.
  const votes = new Map<number, Map<number, number>>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const l = labels[y * w + x]!;
      if (!detail[l]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        for (let k = 1; k <= reach; k++) {
          const px = x + dx * k;
          const py = y + dy * k;
          if (px < 0 || py < 0 || px >= w || py >= h) break;
          const m = labels[py * w + px]!;
          if (m === l) break;
          if (m === 0) continue;
          if (!detail[m]) {
            const v = votes.get(l) ?? new Map<number, number>();
            // The background counts less: a detail on the edge of the figure belongs to the figure.
            v.set(m, (v.get(m) ?? 0) + (outside.has(m) ? 0.25 : 1));
            votes.set(l, v);
          }
          break;
        }
      }
    }
  const parent = new Int32Array(n + 1);
  for (const [l, v] of votes) parent[l] = [...v.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  // A narrow part that touches only the background (a wheel, a fin) has no part to belong to: it stays a touch target.
  for (let l = 1; l <= n; l++) if (detail[l] && (!parent[l] || outside.has(parent[l]!))) (detail[l] = false), (parent[l] = 0);
  const keepWhite = sizes.map((s, l) => detail[l]! && s < highlight);
  // Pixel lists and centres.
  const counts = new Int32Array(n + 1);
  const pixels = sizes.map((s) => new Int32Array(s));
  const sx = new Float64Array(n + 1);
  const sy = new Float64Array(n + 1);
  for (let i = 0; i < w * h; i++) {
    const l = labels[i]!;
    if (!l) continue;
    pixels[l]![counts[l]!++] = i;
    sx[l] = sx[l]! + (i % w);
    sy[l] = sy[l]! + (i - (i % w)) / w;
  }
  const center: [number, number][] = sizes.map((s, l) => {
    if (!l || !s) return [0, 0];
    const cx = sx[l]! / s;
    const cy = sy[l]! / s;
    let best = pixels[l]![0]!;
    let bd = Infinity;
    for (const i of pixels[l]!) {
      const d = ((i % w) - cx) ** 2 + ((i - (i % w)) / w - cy) ** 2;
      if (d < bd) (bd = d), (best = i);
    }
    return [best % w, (best - (best % w)) / w];
  });
  return { labels, sizes, background, detail, keepWhite, parent, pixels, center, radius: thick };
}

/**
 * The region a fingertip means: every pixel within `r` of the touch votes for its region, weighted by closeness
 * (Gaussian, sigma r/2). Touching a line between two parts picks the one more under the finger; a precise touch
 * on a small part still picks it (its pixels are the closest). Returns 0 when nothing is under the finger.
 * `share` = the winner's part of all votes (a smeared finger only paints when it is clearly inside one region).
 */
export function pickRegion(labels: Int32Array, w: number, h: number, x: number, y: number, r: number): { region: number; share: number } {
  let region = 0;
  let share = 0;
  for (const [l, v] of fingerVotes(labels, w, h, x, y, r)) if (v > share) (share = v), (region = l);
  return { region, share };
}

/** Share of the fingertip's votes for each region under it (Gaussian weights, sigma r/2; shares add up to 1). */
export function fingerVotes(labels: Int32Array, w: number, h: number, x: number, y: number, r: number): Map<number, number> {
  const votes = new Map<number, number>();
  const s2 = 2 * (r / 2) ** 2;
  let total = 0;
  const cx = Math.round(x);
  const cy = Math.round(y);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > r * r) continue;
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const l = labels[py * w + px]!;
      if (!l) continue;
      const wgt = Math.exp(-d2 / s2);
      votes.set(l, (votes.get(l) ?? 0) + wgt);
      total += wgt;
    }
  for (const [l, v] of votes) votes.set(l, v / total);
  return votes;
}

/**
 * A touch in a crowd of small parts: the finger covers a clear share (`minShare`) of a part narrower than `minRadius`
 * pixels (an inscribed radius), so it cannot tell which part the child means. Returns the radius of the narrowest such part
 * (to pick the zoom that makes it finger-sized), or 0 when the touch is clear. `skip`: parts that never count (glints).
 */
export function tinyUnderFinger(votes: Map<number, number>, radius: number[], minRadius: number, skip: (l: number) => boolean = () => false, minShare = 0.2): number {
  let tiny = 0;
  for (const [l, v] of votes) {
    const r = radius[l] ?? 0;
    if (v < minShare || skip(l) || r >= minRadius) continue;
    if (!tiny || r < tiny) tiny = Math.max(1, r);
  }
  return tiny;
}

/** Zoom-view focus (point of the picture at the centre of the frame, picture coordinates from its centre) kept so the
 * zoomed picture always covers the frame: |focus| <= half * (1 - 1/zoom). */
export function clampFocus(focus: number, half: number, zoom: number): number {
  const m = half * (1 - 1 / Math.max(1, zoom));
  return Math.max(-m, Math.min(m, focus));
}

/** Colour for a magic detail: a lighter shade of the parent's colour (a darker one for very light colours). */
export function detailShade(color: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  const mix = (c: number) => (lum > 0.78 ? Math.round(c * 0.82) : Math.round(c + (255 - c) * 0.45));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/** Three shades of a paint for the shade row under the palette: light, the paint itself, dark (white and gray get grays). */
export function shadesOf(color: number): [number, number, number] {
  const mix = (c: number, t: number, k: number) => {
    const ch = (s: number) => Math.round(((c >> s) & 255) + ((((t >> s) & 255) - ((c >> s) & 255)) * k));
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  if (color === 0xffffff) return [0xffffff, 0xd6d6d6, 0x9e9e9e];
  return [mix(color, 0xffffff, 0.45), color, mix(color, 0x000000, 0.35)];
}

/**
 * Smooth outlines for display at twice the working size (zoomed in, 1 working pixel would be a visible step):
 * the line mask is blurred a little (1-2-1), upsampled bilinearly and turned into a soft edge around 0.5, so the stairs
 * of the 1-bit drawing become curves. `alpha`: ink coverage of each display pixel (0..255); `src`: the working pixel
 * whose colour fills it (the nearest non-line one of its bilinear neighbours; -1 = pure line).
 */
export function smoothLines(w: number, h: number, dark: (i: number) => boolean): { alpha: Uint8Array; src: Int32Array } {
  const m = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = dark(i) ? 1 : 0;
  // Separable 1-2-1 blur.
  const t = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      t[i] = (m[x > 0 ? i - 1 : i]! + 2 * m[i]! + m[x < w - 1 ? i + 1 : i]!) / 4;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      m[i] = (t[y > 0 ? i - w : i]! + 2 * t[i]! + t[y < h - 1 ? i + w : i]!) / 4;
    }
  const W = w * 2;
  const H = h * 2;
  const alpha = new Uint8Array(W * H);
  const src = new Int32Array(W * H);
  for (let Y = 0; Y < H; Y++) {
    const fy = Math.max(0, Math.min(h - 1, (Y + 0.5) / 2 - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(h - 1, y0 + 1);
    const ty = fy - y0;
    for (let X = 0; X < W; X++) {
      const fx = Math.max(0, Math.min(w - 1, (X + 0.5) / 2 - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(w - 1, x0 + 1);
      const tx = fx - x0;
      const n = [y0 * w + x0, y0 * w + x1, y1 * w + x0, y1 * w + x1] as const;
      const k = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty] as const;
      const v = m[n[0]]! * k[0] + m[n[1]]! * k[1] + m[n[2]]! * k[2] + m[n[3]]! * k[3];
      let best = -1;
      let bw = -1;
      for (let j = 0; j < 4; j++) if (!dark(n[j]!) && k[j]! > bw) (bw = k[j]!), (best = n[j]!);
      // The soft edge sits a bit outside the 0.5 contour, so 1-2 px lines keep full ink after the blur.
      const e = Math.max(0, Math.min(1, (v - 0.15) / 0.3));
      const o = Y * W + X;
      src[o] = best;
      alpha[o] = best < 0 ? 255 : Math.round(e * e * (3 - 2 * e) * 255);
    }
  }
  return { alpha, src };
}

/** Display image (2× size, see smoothLines): each pixel is its working pixel's colour under the ink. */
export function composeSmooth(pixels: Uint8ClampedArray, alpha: Uint8Array, src: Int32Array, out: Uint8ClampedArray, ink: number): void {
  const ir = (ink >> 16) & 255;
  const ig = (ink >> 8) & 255;
  const ib = ink & 255;
  for (let o = 0; o < alpha.length; o++) {
    const s = src[o]!;
    const a = alpha[o]! / 255;
    const q = o * 4;
    if (s < 0) {
      out[q] = ir;
      out[q + 1] = ig;
      out[q + 2] = ib;
    } else {
      out[q] = pixels[s * 4]! + (ir - pixels[s * 4]!) * a;
      out[q + 1] = pixels[s * 4 + 1]! + (ig - pixels[s * 4 + 1]!) * a;
      out[q + 2] = pixels[s * 4 + 2]! + (ib - pixels[s * 4 + 2]!) * a;
    }
    out[q + 3] = 255;
  }
}
