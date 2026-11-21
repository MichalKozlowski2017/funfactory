/**
 * Wspólne dla naklejanki i albumu rodzica: tła-krajobrazy i rysowanie obrazka z naklejek,
 * oraz zapis pokolorowanych kolorowanek (miniatury JPEG, tylko na urządzeniu).
 */
import { Assets, Container, Sprite, type Texture } from 'pixi.js';
import { SaveStore } from '@funfactory/core';
import type { Art } from './assets.ts';
import { LANDSCAPES, stickerScale, type Landscape, type Picture } from './sim/stickers.ts';
import { cover } from './ui.ts';

export const TRAY_H = 150;
/** Rozmiar naklejki w połowie wysokości obrazka (wyżej mniejsza, niżej większa). */
export const STICKER = 120;
const URL_BASE = import.meta.env.BASE_URL;

let landscapes: Promise<Map<Landscape, Texture>> | null = null;

/** Tła naklejanki (wczytywane raz). */
export function loadLandscapes(art: Art): Promise<Map<Landscape, Texture>> {
  return (landscapes ??= (async () => {
    const map = new Map<Landscape, Texture>([['polana', art.realmBg.polana]]);
    await Promise.all(
      LANDSCAPES.filter((l) => l !== 'polana').map(async (l) => {
        const tex = await Assets.load<Texture>(`${URL_BASE}art/krajobrazy/${l}.jpg`).catch(() => null);
        if (tex) map.set(l, tex);
      }),
    );
    return map;
  })());
}

/** Obrazek z naklejek w rozmiarze `w`×`h` (jak na ekranie naklejanki o tym rozmiarze). */
export function pictureView(pic: Picture, w: number, h: number, art: Art, bgs: Map<Landscape, Texture>): Container {
  const inner = new Container();
  const bg = new Sprite(bgs.get(pic.bg) ?? art.realmBg.polana);
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

// ——— Pokolorowane kolorowanki ———

export interface Painting {
  id: string;
  page: string;
  /** Dzień („2026-11-21”). */
  date: string;
  /** JPEG jako data URL. */
  img: string;
}

/** Najwięcej zapamiętanych prac (najstarsze wypadają). */
const MAX_PAINTINGS = 24;
const store = new SaveStore<{ items: Painting[] }>('bystrzakowo-prace', { items: [] });
let cache: Painting[] | null = null;

export async function paintings(): Promise<Painting[]> {
  return (cache ??= (await store.load()).items);
}

export async function addPainting(p: Painting): Promise<void> {
  const list = await paintings();
  list.unshift(p);
  list.splice(MAX_PAINTINGS);
  await store.save({ items: list });
}

export async function removePainting(id: string): Promise<void> {
  const list = await paintings();
  const i = list.findIndex((p) => p.id === id);
  if (i >= 0) list.splice(i, 1);
  await store.save({ items: list });
}

/** Piksele obrazka → JPEG data URL o boku `side`. */
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
