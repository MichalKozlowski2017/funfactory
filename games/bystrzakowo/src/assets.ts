import { Assets, type Texture } from 'pixi.js';
import { isNative } from '@funfactory/core';
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
 * Game art and recordings. Object pictures: public/art/items/<id>.webp.
 * Shadows are computed from the alpha channel only when needed (`shadowOf`) and kept in memory.
 */
export interface Art {
  items: Map<string, Texture>;
  lusia: Texture;
  bazyl: Texture;
  /** House or station of each activity. */
  houses: Record<Activity, Texture>;
  /** Realm background and the background of activities in that realm. */
  realmBg: Record<RealmId, Texture>;
  playBg: Record<RealmId, Texture>;
  /** Workshop: crate, white pail (tinted to a color) and animal home signs (barn, sea). */
  crate: Texture | null;
  bucket: Texture | null;
  /** Parent zone gear. */
  gear: Texture | null;
  /** Tutorial hand (src/hand.ts). */
  hand: Texture | null;
  signs: Map<string, Texture>;
  /** Faces (emotions riddle). */
  emotions: Map<string, Texture>;
  /** Story frames: "<story>-<1..3>". */
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

/** Object shadow (computed once). */
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

/** Shadow if already computed (for synchronous drawing), otherwise null (and starts computing it). */
export function shadowNow(id: string): Texture | null {
  const t = shadowsReady.get(id);
  if (!t) void shadowOf(id);
  return t ?? null;
}

export async function loadArt(): Promise<Art> {
  if (art) return art;
  const load = (path: string) => Assets.load<Texture>(url(path));
  const opt = (path: string) => load(path).catch(() => null);
  const [items, lusia, bazyl, houses, realmBg, playBg, crate, bucket, signs, emotions, stories, gear, hand] = await Promise.all([
    // An object without art (e.g. not generated yet) simply drops out of the game.
    Promise.all(ITEMS.map(async (i) => [i.id, await opt(`art/items/${i.id}.webp`)] as const)),
    load('art/lusia.webp'),
    load('art/bazyl.webp'),
    Promise.all(ACTIVITIES.map(async (k) => [k, await load(`art/house-${k}.webp`).catch(() => load('art/house-shadows.webp'))] as const)),
    Promise.all(REALMS.map(async (r) => [r.id, await load(`art/realm-${r.id}.jpg`).catch(() => load('art/meadow.jpg'))] as const)),
    Promise.all(REALMS.map(async (r) => [r.id, await load(`art/game-${r.id}.jpg`).catch(() => load('art/background-riddle.jpg'))] as const)),
    opt('art/workshop/crate.webp'),
    opt('art/workshop/pail.webp'),
    Promise.all(SIGN_ART.map(async (id) => [id, await opt(`art/workshop/${id}.webp`)] as const)),
    // Faces: key "<emotion>:<character>"; the "child" character uses the original files without a suffix.
    Promise.all(
      EMOTIONS.flatMap((id) =>
        EMOTION_CHARS.map(async (c): Promise<readonly [string, Texture | null]> => [`${id}:${c}`, await opt(c === 'child' ? `art/emotions/${id}.webp` : `art/emotions/${id}-${c}.webp`)]),
      ),
    ),
    Promise.all(STORIES.flatMap((st) => Array.from({ length: FRAMES }, (_, i) => `${st}-${i + 1}`)).map(async (id): Promise<readonly [string, Texture | null]> => [id, await opt(`art/stories/${id}.webp`)])),
    opt('art/gear.webp'),
    opt('art/hand.webp'),
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
    hand,
    signs: new Map(signs.filter((e): e is readonly [string, Texture] => e[1] !== null)),
    emotions: new Map(emotions.filter((e): e is readonly [string, Texture] => e[1] !== null)),
    stories: new Map(stories.filter((e): e is readonly [string, Texture] => e[1] !== null)),
  };
  return art;
}

/** Story frame (null when the art is missing). */
export const storyFrame = (story: string, i: number): Texture | null => art?.stories.get(`${story}-${i + 1}`) ?? null;

export type { Guide } from './voice-lines.ts';

/**
 * Native app: sound starts at launch, so the world plays music and Lusia's greeting without waiting for a touch.
 * Resolves true once the context runs and both are decoded; false in a browser (there they start on the first touch).
 */
export let soundAtLaunch: Promise<boolean> = Promise.resolve(false);

export function registerVoice(game: Game): void {
  // The game makes no sense without the narrator, so it also plays in silent mode (parents often have the phone muted).
  game.sound.playThroughSilentMode();
  // After the iPhone sleeps, sound can go mute: the first touch after returning rebuilds it (the game has no audio nodes of its own).
  game.sound.recoverAfterBackground = true;
  // Speech and quiet music: 24 kHz is enough, and decoded recordings take half the memory.
  game.sound.sampleRate = 24000;
  // Recordings in the game language: Polish in audio/<voice>/, others in audio/<lang>/<voice>/.
  const l = lang();
  const VOICE = voiceLines(l);
  const dir = l === 'pl' ? 'audio' : `audio/${l}`;
  for (const guide of ['lusia', 'bazyl'] as const)
    for (const line of VOICE[guide]) game.sound.add(`${guide}-${line}`, url(`${dir}/${guide}/${line}.m4a`));
  game.sound.add('music', url('audio/music.m4a'));
  if (isNative()) {
    // The context exists before `load` below, so everything decodes right away; music and the greeting come first.
    const running = game.sound.startWithoutGesture();
    const first = game.sound.load(['music', 'lusia-hello']);
    soundAtLaunch = running.then((ok) => (ok ? first.then(() => true) : false));
  }
  // At startup only instructions and reactions; object names and letter sentences ("A as in apple", several hundred recordings)
  // are decoded by the round that needs them.
  void game.sound.load([...VOICE.lusia.map((l) => `lusia-${l}`), ...VOICE.bazyl.map((l) => `bazyl-${l}`), 'music'].filter((n) => !n.includes('-item-') && !n.includes('-letter-')));
}

/** Object name recordings (both voices) to load for a round and release after it. */
export const itemVoices = (ids: readonly string[]): string[] => [...new Set(ids)].flatMap((id) => [`lusia-item-${id}`, `bazyl-item-${id}`]);

/** Plays a guide's line (cuts off the previous one). Returns its length in seconds (0 when the recording is not ready). */
export function say(game: Game, guide: Guide, line: string): number {
  return game.sound.play(`${guide}-${line}`, { channel: 'voice', volume: 1 });
}

/** Background music: a quiet loop, started once (at launch in the app, after the first touch in a browser). */
let musicOn = false;
export function startMusic(game: Game): void {
  if (musicOn || !state.progress.music) return;
  if (game.sound.play('music', { loop: true, volume: 0.16 }) > 0) musicOn = true;
}

export function stopMusic(game: Game): void {
  game.sound.stopMusic();
  musicOn = false;
}
