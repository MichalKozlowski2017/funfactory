/**
 * Shared by the sticker scene and the parent album: landscape backgrounds and drawing the sticker picture,
 * plus storage of colored coloring pages (JPEG thumbnails, on the device only).
 */
import { Assets, Container, Sprite, type Texture } from 'pixi.js';
import { SaveStore } from '@funfactory/core';
import type { Art } from './assets.ts';
import { LANDSCAPES, stickerScale, type Landscape, type Picture } from './sim/stickers.ts';
import { cover } from './ui.ts';
import { IDS_VERSION, LEGACY_STORES, legacyId } from './sim/migrate.ts';

export const TRAY_H = 150;
/** Sticker size at half the picture height (smaller higher up, larger lower down). */
export const STICKER = 120;
const URL_BASE = import.meta.env.BASE_URL;

let landscapes: Promise<Map<Landscape, Texture>> | null = null;

/** Sticker scene backgrounds (loaded once). */
export function loadLandscapes(art: Art): Promise<Map<Landscape, Texture>> {
  return (landscapes ??= (async () => {
    const map = new Map<Landscape, Texture>([['meadow', art.realmBg.meadow]]);
    await Promise.all(
      LANDSCAPES.filter((l) => l !== 'meadow').map(async (l) => {
        const tex = await Assets.load<Texture>(`${URL_BASE}art/landscapes/${l}.jpg`).catch(() => null);
        if (tex) map.set(l, tex);
      }),
    );
    return map;
  })());
}

/** Sticker picture at size `w`×`h` (as on a sticker screen of that size). */
export function pictureView(pic: Picture, w: number, h: number, art: Art, bgs: Map<Landscape, Texture>): Container {
  const inner = new Container();
  const bg = new Sprite(bgs.get(pic.bg) ?? art.realmBg.meadow);
  cover(bg, w, h);
  inner.addChild(bg);
  for (const s of pic.items) {
    const tex = art.items.get(s.id);
    if (!tex) continue;
    const sp = new Sprite({ texture: tex, anchor: 0.5 });
    const sk = (STICKER * stickerScale(s.id, (s.y * h) / (h - TRAY_H))) / Math.max(tex.width, tex.height);
    sp.scale.set(s.flip ? -sk : sk, sk);
    sp.position.set(s.x * w, s.y * h);
    inner.addChild(sp);
  }
  return inner;
}

// ——— Colored coloring pages ———

export interface Painting {
  id: string;
  page: string;
  /** Day ("2026-11-21"). */
  date: string;
  /** JPEG as a data URL. */
  img: string;
}

/** Maximum number of saved works (the oldest drop out). */
const MAX_PAINTINGS = 24;
const STORE_KEY = 'bystrzakowo-works';
const store = new SaveStore<{ items: Painting[]; ids?: number }>(STORE_KEY, { items: [] });
let cache: Painting[] | null = null;

export async function paintings(): Promise<Painting[]> {
  if (cache) return cache;
  const saved = await store.load();
  if (saved.ids === undefined) {
    // Paintings saved before the English rename live under the old key, with old page ids.
    const old = await new SaveStore<{ items: Painting[] }>(LEGACY_STORES[STORE_KEY]!, { items: [] }).load();
    saved.items = [...saved.items, ...old.items.map((x) => ({ ...x, page: legacyId(x.page) }))].slice(0, MAX_PAINTINGS);
    await store.save({ items: saved.items, ids: IDS_VERSION });
  }
  return (cache = saved.items);
}

export async function addPainting(p: Painting): Promise<void> {
  const list = await paintings();
  list.unshift(p);
  list.splice(MAX_PAINTINGS);
  await store.save({ items: list, ids: IDS_VERSION });
}

export async function removePainting(id: string): Promise<void> {
  const list = await paintings();
  const i = list.findIndex((p) => p.id === id);
  if (i >= 0) list.splice(i, 1);
  await store.save({ items: list, ids: IDS_VERSION });
}

/** Image pixels → JPEG data URL with side `side`. */
export function pixelsToJpeg(img: ImageData, side: number, quality = 0.85): string {
  const src = document.createElement('canvas');
  src.width = img.width;
  src.height = img.height;
  src.getContext('2d')!.putImageData(img, 0, 0);
  const out = document.createElement('canvas');
  out.width = out.height = side;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, side, side);
  return out.toDataURL('image/jpeg', quality);
}
