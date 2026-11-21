/**
 * Kolorowanka: podział obrazka konturowego na obszary (spójne składowe pikseli, które nie są linią).
 * Liczone raz po wczytaniu; zamalowanie to podmiana koloru wszystkich pikseli jednego obszaru,
 * więc nic nie „przecieka” przez wygładzone krawędzie linii. Czysty TS (tablice), bez canvasa.
 */

/** Etykiety obszarów: 0 = linia, 1.. = obszary. `dark` mówi, czy piksel jest linią. */
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

/** Obszar pod punktem; dla linii albo maleńkich szczelin najbliższy duży obszar w promieniu `r` pikseli. */
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
