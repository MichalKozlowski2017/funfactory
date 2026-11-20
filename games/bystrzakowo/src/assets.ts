import { Assets, type Texture } from 'pixi.js';
import { pixelsToTexture, type Game } from '@funfactory/kit2d';
import { ITEMS } from './sim/catalog.ts';

/**
 * Grafiki i nagrania gry. Obrazki obiektów: public/art/items/<id>.webp,
 * cienie liczone w locie z kanału alfa (zawsze zgodne z obrazkiem).
 */
export interface Art {
  items: Map<string, Texture>;
  shadows: Map<string, Texture>;
  lusia: Texture;
  bazyl: Texture;
  houses: Record<'cienie' | 'pasuje' | 'liczenie', Texture>;
  meadow: Texture;
  puzzleBg: Texture;
}

export const SHADOW_COLOR: [number, number, number] = [74, 58, 110];

let art: Art | null = null;

const url = (path: string) => `${import.meta.env.BASE_URL}${path}`;

async function silhouette(texture: Texture): Promise<Texture> {
  const source = texture.source.resource as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const [r, g, b] = SHADOW_COLOR;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = (d[i + 3] as number) > 110 ? 255 : 0;
  }
  return pixelsToTexture(img, texture.source.resolution);
}

export async function loadArt(): Promise<Art> {
  if (art) return art;
  const load = (path: string) => Assets.load<Texture>(url(path));
  const [items, lusia, bazyl, cienie, pasuje, liczenie, meadow, puzzleBg] = await Promise.all([
    Promise.all(ITEMS.map(async (i) => [i.id, await load(`art/items/${i.id}.webp`)] as const)),
    load('art/lusia.webp'),
    load('art/bazyl.webp'),
    load('art/dom-cienie.webp'),
    load('art/dom-pasuje.webp'),
    load('art/dom-liczenie.webp'),
    load('art/polana.jpg'),
    load('art/tlo-zagadka.jpg'),
  ]);
  const itemMap = new Map(items);
  const shadows = new Map<string, Texture>();
  await Promise.all(ITEMS.filter((i) => i.shadow).map(async (i) => shadows.set(i.id, await silhouette(itemMap.get(i.id)!))));
  art = { items: itemMap, shadows, lusia, bazyl, houses: { cienie, pasuje, liczenie }, meadow, puzzleBg };
  return art;
}

/** Nagrania lektora: public/audio/<lusia|bazyl>/<nazwa>.m4a, w Sound pod nazwą "<głos>-<nazwa>". */
export type Guide = 'lusia' | 'bazyl';

const COMMON = ['brawo-1', 'brawo-2', 'brawo-3', 'brawo-4', 'brawo-5', 'oj-1', 'oj-2', 'nagroda', 'witaj', ...ITEMS.map((i) => `item-${i.id}`)];
const VOICE: Record<Guide, string[]> = {
  lusia: [...COMMON, 'cienie', 'liczenie', 'liczenie-dotyk', ...Array.from({ length: 10 }, (_, i) => `liczba-${i + 1}`)],
  bazyl: [...COMMON, 'pasuje'],
};

export function registerVoice(game: Game): void {
  for (const guide of ['lusia', 'bazyl'] as const)
    for (const line of VOICE[guide]) game.sound.add(`${guide}-${line}`, url(`audio/${guide}/${line}.m4a`));
  void game.sound.load();
}

/** Mówi kwestię przewodnika (ucina poprzednią). Zwraca długość w sekundach (0, gdy nagranie niegotowe). */
export function say(game: Game, guide: Guide, line: string): number {
  return game.sound.play(`${guide}-${line}`, { channel: 'voice', volume: 1 });
}
