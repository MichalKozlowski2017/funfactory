import { Assets, type Texture } from 'pixi.js';
import { pixelsToTexture, type Game } from '@funfactory/kit2d';
import { ITEMS, keepOnly } from './sim/catalog.ts';
import { SIGN_ART } from './sim/sorting.ts';
import { lang } from './sim/lang.ts';
import { voiceLines, type Guide } from './voice-lines.ts';
import { state } from './state.ts';
import { ACTIVITIES, REALMS, type Activity, type RealmId } from './sim/realms.ts';
import { EMOTION_CHARS, EMOTIONS } from './sim/emotions.ts';
import { FRAMES, STORIES } from './sim/stories.ts';

/**
 * Grafiki i nagrania gry. Obrazki obiektów: public/art/items/<id>.webp.
 * Cienie liczone z kanału alfa dopiero, gdy są potrzebne (`shadowOf`), i trzymane w pamięci.
 */
export interface Art {
  items: Map<string, Texture>;
  lusia: Texture;
  bazyl: Texture;
  /** Domek albo stanowisko każdej zabawy. */
  houses: Record<Activity, Texture>;
  /** Tło krainy i tło zabaw w tej krainie. */
  realmBg: Record<RealmId, Texture>;
  playBg: Record<RealmId, Texture>;
  /** Warsztat: skrzynka, białe wiaderko (barwione na kolor) i znaki domów zwierząt (stodoła, morze). */
  crate: Texture | null;
  bucket: Texture | null;
  /** Zębatka strefy rodzica. */
  gear: Texture | null;
  signs: Map<string, Texture>;
  /** Minki (zagadka z emocjami). */
  emotions: Map<string, Texture>;
  /** Kadry historyjek: "<historyjka>-<1..3>". */
  stories: Map<string, Texture>;
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

const shadowsReady = new Map<string, Texture>();

/** Cień obiektu (liczony raz). */
export function shadowOf(id: string): Promise<Texture> {
  let s = shadows.get(id);
  if (!s) {
    s = loadArt()
      .then((a) => silhouette(a.items.get(id)!))
      .then((t) => (shadowsReady.set(id, t), t));
    shadows.set(id, s);
  }
  return s;
}

/** Cień, jeśli jest już policzony (do synchronicznego rysowania), inaczej null (i zaczyna liczyć). */
export function shadowNow(id: string): Texture | null {
  const t = shadowsReady.get(id);
  if (!t) void shadowOf(id);
  return t ?? null;
}

export async function loadArt(): Promise<Art> {
  if (art) return art;
  const load = (path: string) => Assets.load<Texture>(url(path));
  const opt = (path: string) => load(path).catch(() => null);
  const [items, lusia, bazyl, houses, realmBg, playBg, crate, bucket, signs, emotions, stories, gear] = await Promise.all([
    // Obiekt bez grafiki (np. jeszcze niewygenerowany) po prostu wypada z gry.
    Promise.all(ITEMS.map(async (i) => [i.id, await opt(`art/items/${i.id}.webp`)] as const)),
    load('art/lusia.webp'),
    load('art/bazyl.webp'),
    Promise.all(ACTIVITIES.map(async (k) => [k, await load(`art/dom-${k}.webp`).catch(() => load('art/dom-cienie.webp'))] as const)),
    Promise.all(REALMS.map(async (r) => [r.id, await load(`art/kraina-${r.id}.jpg`).catch(() => load('art/polana.jpg'))] as const)),
    Promise.all(REALMS.map(async (r) => [r.id, await load(`art/gra-${r.id}.jpg`).catch(() => load('art/tlo-zagadka.jpg'))] as const)),
    opt('art/warsztat/skrzynka.webp'),
    opt('art/warsztat/wiadro.webp'),
    Promise.all(SIGN_ART.map(async (id) => [id, await opt(`art/warsztat/${id}.webp`)] as const)),
    // Minki: klucz „<emocja>:<postać>”; postać „dziecko” to pierwotne pliki bez przyrostka.
    Promise.all(
      EMOTIONS.flatMap((id) =>
        EMOTION_CHARS.map(async (c): Promise<readonly [string, Texture | null]> => [`${id}:${c}`, await opt(c === 'dziecko' ? `art/emocje/${id}.webp` : `art/emocje/${id}-${c}.webp`)]),
      ),
    ),
    Promise.all(STORIES.flatMap((st) => Array.from({ length: FRAMES }, (_, i) => `${st}-${i + 1}`)).map(async (id): Promise<readonly [string, Texture | null]> => [id, await opt(`art/historyjki/${id}.webp`)])),
    opt('art/zebatka.webp'),
  ]);
  const loaded = items.filter((e): e is readonly [string, Texture] => e[1] !== null);
  keepOnly(new Set(loaded.map(([id]) => id)));
  art = {
    items: new Map(loaded),
    lusia,
    bazyl,
    houses: Object.fromEntries(houses) as Record<Activity, Texture>,
    realmBg: Object.fromEntries(realmBg) as Record<RealmId, Texture>,
    playBg: Object.fromEntries(playBg) as Record<RealmId, Texture>,
    crate,
    bucket,
    gear,
    signs: new Map(signs.filter((e): e is readonly [string, Texture] => e[1] !== null)),
    emotions: new Map(emotions.filter((e): e is readonly [string, Texture] => e[1] !== null)),
    stories: new Map(stories.filter((e): e is readonly [string, Texture] => e[1] !== null)),
  };
  return art;
}

/** Kadr historyjki (null, gdy grafiki brak). */
export const storyFrame = (story: string, i: number): Texture | null => art?.stories.get(`${story}-${i + 1}`) ?? null;

export type { Guide } from './voice-lines.ts';

export function registerVoice(game: Game): void {
  // Bez lektora gra nie ma sensu, więc gra też w trybie cichym (rodzice często mają wyciszony telefon).
  game.sound.playThroughSilentMode();
  // Po uśpieniu iPhone'a dźwięk bywa niemy: pierwsze dotknięcie po powrocie odbudowuje go (gra nie ma własnych węzłów audio).
  game.sound.recoverAfterBackground = true;
  // Mowa i cicha muzyka: 24 kHz wystarczy, a zdekodowane nagrania zajmują połowę pamięci.
  game.sound.sampleRate = 24000;
  // Nagrania w języku gry: polskie w audio/<głos>/, pozostałe w audio/<język>/<głos>/.
  const l = lang();
  const VOICE = voiceLines(l);
  const dir = l === 'pl' ? 'audio' : `audio/${l}`;
  for (const guide of ['lusia', 'bazyl'] as const)
    for (const line of VOICE[guide]) game.sound.add(`${guide}-${line}`, url(`${dir}/${guide}/${line}.m4a`));
  game.sound.add('muzyka', url('audio/muzyka.m4a'));
  // Na starcie tylko polecenia i reakcje; nazwy obiektów (większość nagrań) dekoduje runda, która ich potrzebuje.
  void game.sound.load([...VOICE.lusia.map((l) => `lusia-${l}`), ...VOICE.bazyl.map((l) => `bazyl-${l}`), 'muzyka'].filter((n) => !n.includes('-item-')));
}

/** Nagrania nazw obiektów (oba głosy) do wczytania na rundę i zwolnienia po niej. */
export const itemVoices = (ids: readonly string[]): string[] => [...new Set(ids)].flatMap((id) => [`lusia-item-${id}`, `bazyl-item-${id}`]);

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
