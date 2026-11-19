import { Sprite, type Texture } from 'pixi.js';
import { circle, group, path, rect, svg } from '@funfactory/art';
import { svgTextures } from '@funfactory/kit2d';
import { TRAILS } from '../sim/shop.ts';

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
const HEART = 'M12,21 C5,15 1,11 1,7 C1,3.5 4,1 7,1 C9.5,1 11,2.5 12,4 C13,2.5 14.5,1 17,1 C20,1 23,3.5 23,7 C23,11 19,15 12,21 Z';

/** Białe kształty śladów (kolor nadaje tint cząsteczki). */
function shapeMarkup(shape: 'dot' | 'star' | 'heart', fill = '#ffffff'): string {
  if (shape === 'star') return path(STAR, { fill });
  if (shape === 'heart') return path(HEART, { fill });
  return circle(12, 12, 10, { fill });
}

export interface CosmeticTextures {
  acc: Map<string, Texture>;
  shapes: Map<'dot' | 'star' | 'heart', Texture>;
  trailPreviews: Map<string, Texture>;
}

export async function cosmeticTextures(pixelRatio: number): Promise<CosmeticTextures> {
  const sources: Record<string, string> = {};
  for (const [id, a] of Object.entries(ACC_ART)) sources[`acc:${id}`] = a.markup;
  for (const shape of ['dot', 'star', 'heart'] as const) sources[`shape:${shape}`] = svg(24, 24, [shapeMarkup(shape)]);
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
    else if (kind === 'shape') out.shapes.set(id as 'dot' | 'star' | 'heart', t);
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
