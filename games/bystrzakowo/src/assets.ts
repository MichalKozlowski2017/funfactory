import { Assets, type Texture } from 'pixi.js';
import { pixelsToTexture, type Game } from '@funfactory/kit2d';
import { ITEMS, keepOnly, type Color } from './sim/catalog.ts';
import { state } from './state.ts';
import { PUZZLE_KINDS, SOUNDS, soundSlug, type PuzzleKind } from './sim/puzzles.ts';

/**
 * Grafiki i nagrania gry. Obrazki obiektów: public/art/items/<id>.webp.
 * Cienie liczone z kanału alfa dopiero, gdy są potrzebne (`shadowOf`), i trzymane w pamięci.
 */
export interface Art {
  items: Map<string, Texture>;
  lusia: Texture;
  bazyl: Texture;
  houses: Record<PuzzleKind, Texture>;
  meadow: Texture;
  puzzleBg: Texture;
}

export const SHADOW_COLOR: [number, number, number] = [74, 58, 110];

let art: Art | null = null;
const shadows = new Map<string, Promise<Texture>>();

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

/** Cień obiektu (liczony raz). */
export function shadowOf(id: string): Promise<Texture> {
  let s = shadows.get(id);
  if (!s) {
    s = loadArt().then((a) => silhouette(a.items.get(id)!));
    shadows.set(id, s);
  }
  return s;
}

/** Cień, jeśli jest już policzony (do synchronicznego rysowania), inaczej null. */
export const shadowNow = (() => {
  const ready = new Map<string, Texture>();
  return (id: string): Texture | null => {
    if (ready.has(id)) return ready.get(id)!;
    void shadowOf(id).then((t) => ready.set(id, t));
    return null;
  };
})();

export async function loadArt(): Promise<Art> {
  if (art) return art;
  const load = (path: string) => Assets.load<Texture>(url(path));
  const [items, lusia, bazyl, houses, meadow, puzzleBg] = await Promise.all([
    // Obiekt bez grafiki (np. jeszcze niewygenerowany) po prostu wypada z gry.
    Promise.all(ITEMS.map(async (i) => [i.id, await load(`art/items/${i.id}.webp`).catch(() => null)] as const)),
    load('art/lusia.webp'),
    load('art/bazyl.webp'),
    Promise.all(PUZZLE_KINDS.map(async (k) => [k, await load(`art/dom-${k}.webp`).catch(() => load('art/dom-cienie.webp'))] as const)),
    load('art/polana.jpg'),
    load('art/tlo-zagadka.jpg'),
  ]);
  const loaded = items.filter((e): e is readonly [string, Texture] => e[1] !== null);
  keepOnly(new Set(loaded.map(([id]) => id)));
  art = { items: new Map(loaded), lusia, bazyl, houses: Object.fromEntries(houses) as Record<PuzzleKind, Texture>, meadow, puzzleBg };
  return art;
}

/** Nagrania lektora: public/audio/<lusia|bazyl>/<nazwa>.m4a, w Sound pod nazwą "<głos>-<nazwa>". */
export type Guide = 'lusia' | 'bazyl';

export const COLORS_SPOKEN: readonly Color[] = ['czerwony', 'zolty', 'zielony', 'niebieski', 'pomaranczowy', 'rozowy', 'fioletowy', 'brazowy', 'bialy'];

const COMMON = ['brawo-1', 'brawo-2', 'brawo-3', 'brawo-4', 'brawo-5', 'oj-1', 'oj-2', 'nagroda', 'witaj', 'pomoc', ...ITEMS.map((i) => `item-${i.id}`)];
const VOICE: Record<Guide, string[]> = {
  lusia: [...COMMON, 'cienie', 'liczenie', 'liczenie-dotyk', 'album', ...Array.from({ length: 10 }, (_, i) => `liczba-${i + 1}`), ...SOUNDS.map((s) => `gloska-${soundSlug(s)}`)],
  bazyl: [...COMMON, 'pasuje', ...COLORS_SPOKEN.map((c) => `kolor-${c}`), ...ITEMS.filter((i) => i.mother).map((i) => `mama-${i.id}`)],
};

export function registerVoice(game: Game): void {
  for (const guide of ['lusia', 'bazyl'] as const)
    for (const line of VOICE[guide]) game.sound.add(`${guide}-${line}`, url(`audio/${guide}/${line}.m4a`));
  game.sound.add('muzyka', url('audio/muzyka.m4a'));
  void game.sound.load();
}

/** Mówi kwestię przewodnika (ucina poprzednią). Zwraca długość w sekundach (0, gdy nagranie niegotowe). */
export function say(game: Game, guide: Guide, line: string): number {
  return game.sound.play(`${guide}-${line}`, { channel: 'voice', volume: 1 });
}

/** Muzyka w tle: cicha pętla, startuje raz (po pierwszym dotknięciu, gdy dźwięk jest odblokowany). */
let musicOn = false;
export function startMusic(game: Game): void {
  if (musicOn || !state.progress.music) return;
  if (game.sound.play('muzyka', { loop: true, volume: 0.16 }) > 0) musicOn = true;
}

export function stopMusic(game: Game): void {
  game.sound.stopMusic();
  musicOn = false;
}
