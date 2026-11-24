/**
 * Sticker book: sticker pictures on a landscape background. The child has a gallery of several pictures, each with its own
 * background; changes save automatically. Pure TS (no Pixi), so it can be tested.
 */
import type { Progress } from './progress.ts';

/** Landscapes (sticker book backgrounds); `meadow` is the Puzzle Meadow background, the rest come from public/art/landscapes. */
export const LANDSCAPES = ['meadow', 'beach', 'forest', 'winter', 'farm', 'sea', 'space'] as const;
export type Landscape = (typeof LANDSCAPES)[number];

/** Maximum number of pictures in the gallery. */
export const MAX_PICTURES = 12;

export interface PlacedSticker {
  id: string;
  /** Position as screen fractions (0..1), independent of phone size. */
  x: number;
  y: number;
  flip: boolean;
}

export interface Picture {
  bg: Landscape;
  items: PlacedSticker[];
}

/** Gallery from progress; an old save (a single picture in `scene`) becomes the first picture. */
export function gallery(p: Progress): { pictures: Picture[]; current: number } {
  if (!p.pictures) {
    p.pictures = [{ bg: 'meadow', items: p.scene ?? [] }];
    p.picture = 0;
    delete p.scene;
  }
  if (p.pictures.length === 0) p.pictures.push({ bg: 'meadow', items: [] });
  p.picture = Math.max(0, Math.min(p.pictures.length - 1, p.picture ?? 0));
  return { pictures: p.pictures, current: p.picture };
}

/**
 * New picture (with the same background as the current one). An empty current picture is reused instead of
 * creating another empty one. Returns null when the gallery is full.
 */
export function addPicture(p: Progress, bg: Landscape): number | null {
  const { pictures, current } = gallery(p);
  if (pictures[current]!.items.length === 0) {
    pictures[current]!.bg = bg;
    return current;
  }
  const empty = pictures.findIndex((x) => x.items.length === 0);
  if (empty >= 0) {
    pictures[empty]!.bg = bg;
    p.picture = empty;
    return empty;
  }
  if (pictures.length >= MAX_PICTURES) return null;
  pictures.push({ bg, items: [] });
  p.picture = pictures.length - 1;
  return p.picture;
}

/** Removes a picture; the gallery never ends up empty, the current index still points to the same or a neighboring one. */
export function removePicture(p: Progress, index: number): void {
  const { pictures, current } = gallery(p);
  if (index < 0 || index >= pictures.length) return;
  pictures.splice(index, 1);
  if (pictures.length === 0) pictures.push({ bg: 'meadow', items: [] });
  p.picture = Math.max(0, Math.min(pictures.length - 1, index < current ? current - 1 : current));
}

/**
 * Perspective: a sticker higher up (farther) is smaller, lower (closer) is larger. `y` is a fraction of the
 * drawing area's height (0 top, 1 bottom).
 */
export function depthScale(y: number): number {
  const t = Math.max(0, Math.min(1, y));
  return 0.4 + 1.0 * t;
}

/** Sky things: they naturally belong at the top of the picture, so they don't shrink with perspective. */
export const SKY = new Set(['sun', 'cloud', 'little-star', 'moon', 'rainbow', 'airplane', 'helicopter', 'rocket', 'kite', 'small-balloon', 'bird']);

/** Sticker scale: constant for sky things, perspective for the rest. */
export function stickerScale(id: string, y: number): number {
  return SKY.has(id) ? 1 : depthScale(y);
}
