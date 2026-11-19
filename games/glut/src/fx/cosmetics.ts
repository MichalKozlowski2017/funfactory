import { Sprite, type Texture } from 'pixi.js';
import { circle, group, path, rect, svg } from '@funfactory/art';
import { svgTextures } from '@funfactory/kit2d';
import { TRAILS, type TrailShape } from '../sim/shop.ts';

/**
 * Grafika kosmetyki z kodu (SVG): dodatki na twarz, kształty śladów, podglądy do szafy.
 * Dodatki siedzą na twarzy slime'a (jednostki twarzy ≈ jednostki gry, środek = środek koła,
 * oczy na (±14, -3), usta na (0, 10)), więc zostają pionowo jak oczy.
 */

const INK = '#2a1a3a';

/** Rozmiar SVG dodatków (w jednostkach twarzy) i miejsce kotwicy. */
const ACC_ART: Record<string, { w: number; h: number; x: number; y: number; markup: string }> = {
  shades: {
    w: 72,
    h: 26,
    x: 0,
    y: -3,
    markup: svg(72, 26, [
      rect(28, 7, 16, 4, { fill: INK, rx: 2 }),
      rect(3, 3, 28, 20, { rx: 9, fill: '#1d1430', stroke: INK, strokeWidth: 3 }),
      rect(41, 3, 28, 20, { rx: 9, fill: '#1d1430', stroke: INK, strokeWidth: 3 }),
      path('M8,9 L16,9', { stroke: '#ffffff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }),
      path('M46,9 L54,9', { stroke: '#ffffff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }),
    ]),
  },
  mustache: {
    w: 46,
    h: 18,
    x: 0,
    y: 6,
    markup: svg(46, 18, [
      path('M23,6 C18,1 10,1 6,6 C3,10 2,14 6,15 C4,11 9,9 13,11 C17,13 21,12 23,9 C25,12 29,13 33,11 C37,9 42,11 40,15 C44,14 43,10 40,6 C36,1 28,1 23,6 Z', {
        fill: '#5a3420',
        stroke: INK,
        strokeWidth: 2.5,
        strokeLinejoin: 'round',
      }),
    ]),
  },
  monocle: {
    w: 34,
    h: 56,
    x: 14,
    y: 11,
    markup: svg(34, 56, [
      path('M17,30 Q22,42 14,54', { fill: 'none', stroke: '#f5c542', strokeWidth: 2.5, strokeLinecap: 'round' }),
      circle(17, 17, 13, { fill: '#cfefff', opacity: 0.35 }),
      circle(17, 17, 13, { fill: 'none', stroke: '#f5c542', strokeWidth: 4 }),
      circle(17, 17, 13, { fill: 'none', stroke: INK, strokeWidth: 1.5, opacity: 0.6 }),
      path('M10,11 Q13,7 18,8', { fill: 'none', stroke: '#ffffff', strokeWidth: 2.5, strokeLinecap: 'round', opacity: 0.8 }),
    ]),
  },
  headphones: {
    w: 104,
    h: 62,
    x: 0,
    y: -14,
    markup: svg(104, 62, [
      path('M14,40 C14,6 90,6 90,40', { fill: 'none', stroke: INK, strokeWidth: 11, strokeLinecap: 'round' }),
      path('M14,40 C14,6 90,6 90,40', { fill: 'none', stroke: '#7fd3ff', strokeWidth: 6, strokeLinecap: 'round' }),
      rect(2, 30, 22, 30, { rx: 9, fill: '#ff6f9f', stroke: INK, strokeWidth: 3 }),
      rect(80, 30, 22, 30, { rx: 9, fill: '#ff6f9f', stroke: INK, strokeWidth: 3 }),
      path('M7,36 L7,46', { stroke: '#ffffff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }),
      path('M85,36 L85,46', { stroke: '#ffffff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }),
    ]),
  },
  medal: {
    w: 26,
    h: 37,
    x: 25,
    y: 24,
    markup: svg(34, 48, [
      path('M8,0 L17,18 L26,0', { fill: 'none', stroke: '#5fc8ff', strokeWidth: 7, strokeLinejoin: 'round' }),
      path('M8,0 L17,18 L26,0', { fill: 'none', stroke: '#ff6f9f', strokeWidth: 3, strokeLinejoin: 'round' }),
      circle(17, 31, 13, { fill: '#ffd166', stroke: INK, strokeWidth: 3 }),
      path('M17,23 L19.5,29 L25,29.5 L20.8,33 L22.2,38.5 L17,35.5 L11.8,38.5 L13.2,33 L9,29.5 L14.5,29 Z', { fill: '#ffeaa0', stroke: '#c98a1a', strokeWidth: 1.2 }),
    ]),
  },
  bow: {
    w: 44,
    h: 30,
    x: -22,
    y: -30,
    markup: svg(44, 30, [
      group(
        [
          path('M22,15 L4,4 Q1,15 4,26 Z', { fill: '#ff4f7f', stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' }),
          path('M22,15 L40,4 Q43,15 40,26 Z', { fill: '#ff4f7f', stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' }),
          path('M8,8 L14,12', { stroke: '#ffffff', strokeWidth: 2.5, strokeLinecap: 'round', opacity: 0.6 }),
          circle(22, 15, 6, { fill: '#ff7aa0', stroke: INK, strokeWidth: 3 }),
        ],
        { transform: 'rotate(-18 22 15)' },
      ),
    ]),
  },
};

const STAR = 'M12,1 L15,8.5 L23,9 L17,14 L19,22.5 L12,18 L5,22.5 L7,14 L1,9 L9,8.5 Z';
const NOTE = 'M9,19 C9,22 5.5,23.5 3.5,22.5 C1,21 1.5,17.5 4.5,16.5 C6,16 7.2,16.2 8,16.6 L8,3 L20,1 L20,16 C20,19 16.5,20.5 14.5,19.5 C12,18 12.5,14.5 15.5,13.5 C17,13 18.2,13.2 19,13.6 L19,6 L9,7.6 Z';
const FLAME = 'M12,23 C6,23 3,18.5 4,14 C5,10 8,8.5 8.5,4.5 C11,6.5 11.5,9 11,11 C13,9.5 14,6.5 13.5,1 C18,4 21,9 20.5,14.5 C20,19.5 17,23 12,23 Z';
const HEART = 'M12,21 C5,15 1,11 1,7 C1,3.5 4,1 7,1 C9.5,1 11,2.5 12,4 C13,2.5 14.5,1 17,1 C20,1 23,3.5 23,7 C23,11 19,15 12,21 Z';

/** Białe kształty śladów (kolor nadaje tint cząsteczki). */
function shapeMarkup(shape: TrailShape, fill = '#ffffff'): string {
  if (shape === 'star') return path(STAR, { fill });
  if (shape === 'note') return path(NOTE, { fill });
  if (shape === 'flame') return path(FLAME, { fill });
  if (shape === 'heart') return path(HEART, { fill });
  return circle(12, 12, 10, { fill });
}

export interface CosmeticTextures {
  acc: Map<string, Texture>;
  shapes: Map<TrailShape, Texture>;
  trailPreviews: Map<string, Texture>;
}

export async function cosmeticTextures(pixelRatio: number): Promise<CosmeticTextures> {
  const sources: Record<string, string> = {};
  for (const [id, a] of Object.entries(ACC_ART)) sources[`acc:${id}`] = a.markup;
  for (const shape of ['dot', 'star', 'heart', 'note', 'flame'] as const) sources[`shape:${shape}`] = svg(24, 24, [shapeMarkup(shape)]);
  for (const t of TRAILS) {
    // Podgląd: łuk kształtów w kolorach śladu, coraz mniejszych.
    const parts = [0, 1, 2, 3].map((i) => {
      const color = `#${(t.colors[i % t.colors.length] ?? 0xffffff).toString(16).padStart(6, '0')}`;
      const k = 1.3 - i * 0.22;
      const x = 120 - i * 32;
      const y = 22 + i * 12;
      return group([shapeMarkup(t.shape, color)], { transform: `translate(${x - 12 * k} ${y - 12 * k}) scale(${k})` });
    });
    sources[`trail:${t.id}`] = svg(150, 80, parts);
  }
  const tex = await svgTextures(sources, pixelRatio * 1.5);
  const out: CosmeticTextures = { acc: new Map(), shapes: new Map(), trailPreviews: new Map() };
  for (const [key, t] of Object.entries(tex)) {
    const [kind, id] = key.split(':') as [string, string];
    if (kind === 'acc') out.acc.set(id, t);
    else if (kind === 'shape') out.shapes.set(id as TrailShape, t);
    else out.trailPreviews.set(id, t);
  }
  return out;
}

/** Sprite dodatku w układzie twarzy slime'a. */
export function accessorySprite(id: string, tex: Texture): Sprite | null {
  const a = ACC_ART[id];
  if (!a) return null;
  const s = new Sprite({ texture: tex, anchor: 0.5 });
  s.scale.set(a.w / tex.width);
  s.position.set(a.x, a.y);
  return s;
}
