/**
 * How big a coloring page must be on screen: parts narrower than a fingertip (FINGER_RADIUS_PT) become ink in the game
 * (sim/fill.ts inkSmallParts), so for every page this finds the smallest picture width (points) at which ink swallows
 * at most MAX_INK of the drawing (a few rays, dots and glints, not half of the picture).
 * The page is prepared exactly like in the game (crop to the outlines, 640 px).
 *   node games/bystrzakowo/scripts/coloring-sizes.ts [files.png...]     # print (candidates)
 *   node games/bystrzakowo/scripts/coloring-sizes.ts --write            # all pages -> src/sim/coloring-sizes.ts
 *   --preview <dir>                                                     # also save each page as inked on a phone
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { FINGER_RADIUS_PT } from '../src/sim/coloring.ts';
import { inkSmallParts, labelRegions, regionThickness, tooSmall } from '../src/sim/fill.ts';

const SIZE = 640;
/** Share of the drawing (inside parts, without the background) that may turn into ink. */
export const MAX_INK = 0.04;
/** Picture width on a phone (points, about an iPhone in landscape). */
const PHONE = 325;
const game = join(import.meta.dirname, '..');
const dir = join(game, 'public/art/coloring-pages');
const write = process.argv.includes('--write');
const previewAt = process.argv.indexOf('--preview');
const preview = previewAt > 0 ? process.argv[previewAt + 1]! : '';
const files = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--preview');
const list = files.length ? files : readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => join(dir, f));

const gray = (file: string, crop = '') =>
  execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-filter_complex', `color=white:s=${SIZE}x${SIZE}[bg];[0]scale=${SIZE}:${SIZE}${crop}[f];[bg][f]overlay=format=auto,format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });

/** The page as the game sees it: 1 = line. */
function load(file: string): Uint8Array {
  let g = gray(file);
  // Crop to the outlines like the game (scenes/coloring.ts prepare).
  let x0 = SIZE, y0 = SIZE, x1 = -1, y1 = -1;
  for (let i = 0; i < SIZE * SIZE; i++)
    if (g[i]! < 150) {
      const x = i % SIZE, y = (i - x) / SIZE;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  if (x1 >= 0) {
    const side = Math.min(SIZE, Math.round(Math.max(x1 - x0 + 1, y1 - y0 + 1) * 1.06));
    const sx = Math.round(Math.max(0, Math.min(SIZE - side, x0 + (x1 - x0 + 1) / 2 - side / 2)));
    const sy = Math.round(Math.max(0, Math.min(SIZE - side, y0 + (y1 - y0 + 1) / 2 - side / 2)));
    g = gray(file, `,crop=${side}:${side}:${sx}:${sy},scale=${SIZE}:${SIZE}`);
  }
  return Uint8Array.from(g, (v) => (v < 150 ? 1 : 0));
}

export function pageMinWidth(file: string): { width: number; parts: number; phoneInk: number; phoneParts: number } {
  const dark = load(file);
  const { labels, count, sizes } = labelRegions(SIZE, SIZE, (i) => dark[i] === 1);
  const radius = regionThickness(labels, SIZE, SIZE, count);
  let background = 0;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const x = i % SIZE, y = (i - x) / SIZE;
    if (x && y && x < SIZE - 1 && y < SIZE - 1) continue;
    const l = labels[i]!;
    if (l && (!background || sizes[l]! > sizes[background]!)) background = l;
  }
  const parts = sizes.map((s, l) => ({ s, r: radius[l]! })).filter((_, l) => l && l !== background);
  const drawing = parts.reduce((a, p) => a + p.s, 0) || 1;
  const inkAt = (width: number) => {
    const minR = (FINGER_RADIUS_PT * SIZE) / width;
    const small = parts.filter((p) => tooSmall(p.s, p.r, minR));
    return { ink: small.reduce((a, p) => a + p.s, 0) / drawing, left: parts.length - small.length };
  };
  // Smallest width (points, step 8) where ink takes at most MAX_INK of the drawing.
  let width = 80;
  while (width < 1600 && inkAt(width).ink > MAX_INK) width += 8;
  const phone = inkAt(PHONE);
  const phoneR = (FINGER_RADIUS_PT * SIZE) / PHONE;
  const phoneInk = phone.ink;
  const phoneParts = phone.left;
  if (preview) {
    inkSmallParts(SIZE, SIZE, dark, phoneR);
    const pgm = Buffer.concat([Buffer.from(`P5 ${SIZE} ${SIZE} 255\n`), Buffer.from(dark.map((v) => (v ? 0 : 255)))]);
    writeFileSync(join(preview, `${basename(file, '.png')}.pgm`), pgm);
  }
  return { width, parts: parts.length, phoneInk, phoneParts };
}

const out: Record<string, number> = {};
for (const f of list.sort()) {
  const m = pageMinWidth(f);
  out[basename(f, '.png')] = m.width;
  if (!write) console.log(basename(f, '.png').padEnd(26), `min width ${String(m.width).padStart(4)} pt`, `parts ${String(m.parts).padStart(3)}`, `phone: ink ${(m.phoneInk * 100).toFixed(1).padStart(5)}% parts ${m.phoneParts}`);
}
if (write) {
  const body = Object.entries(out).map(([k, v]) => `  '${k}': ${v},`).join('\n');
  writeFileSync(join(game, 'src/sim/coloring-sizes.ts'), `/** Generated by scripts/coloring-sizes.ts: the smallest picture width (points) at which parts too small for a finger (inked) are at most MAX_INK of the drawing. */\nexport const MIN_WIDTH: Record<string, number> = {\n${body}\n};\n`);
  console.log(`wrote ${Object.keys(out).length} pages`);
}
