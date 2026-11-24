/**
 * Naklejanka: obrazki z naklejek na tle krajobrazu. Dziecko ma galerię kilku obrazków, każdy z własnym
 * tłem; zmiany zapisują się same. Czysty TS (bez Pixi), żeby dało się testować.
 */
import type { Progress } from './progress.ts';

/** Krajobrazy (tła naklejanki); `meadow` to tło Polany Zagadek, reszta z public/art/krajobrazy. */
export const LANDSCAPES = ['meadow', 'beach', 'forest', 'winter', 'farm', 'sea', 'space'] as const;
export type Landscape = (typeof LANDSCAPES)[number];

/** Najwięcej obrazków w galerii. */
export const MAX_PICTURES = 12;

export interface PlacedSticker {
  id: string;
  /** Pozycja w ułamkach ekranu (0..1), niezależna od rozmiaru telefonu. */
  x: number;
  y: number;
  flip: boolean;
}

export interface Picture {
  bg: Landscape;
  items: PlacedSticker[];
}

/** Galeria z postępów; stary zapis (jeden obrazek w `scene`) staje się pierwszym obrazkiem. */
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
 * Nowy obrazek (z tym samym tłem co bieżący). Pusty bieżący obrazek jest używany ponownie zamiast
 * tworzyć kolejny pusty. Przy pełnej galerii zwraca null.
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

/** Usuwa obrazek; galeria nigdy nie zostaje pusta, bieżący wskazuje dalej ten sam albo sąsiedni. */
export function removePicture(p: Progress, index: number): void {
  const { pictures, current } = gallery(p);
  if (index < 0 || index >= pictures.length) return;
  pictures.splice(index, 1);
  if (pictures.length === 0) pictures.push({ bg: 'meadow', items: [] });
  p.picture = Math.max(0, Math.min(pictures.length - 1, index < current ? current - 1 : current));
}

/**
 * Perspektywa: naklejka wyżej (dalej) jest mniejsza, niżej (bliżej) większa. `y` to ułamek wysokości
 * obszaru rysowania (0 góra, 1 dół).
 */
export function depthScale(y: number): number {
  const t = Math.max(0, Math.min(1, y));
  return 0.4 + 1.0 * t;
}

/** Rzeczy z nieba: na górze obrazka są naturalnie, więc nie maleją z perspektywą. */
export const SKY = new Set(['sun', 'cloud', 'little-star', 'moon', 'rainbow', 'airplane', 'helicopter', 'rocket', 'kite', 'small-balloon', 'bird']);

/** Skala naklejki: stała dla rzeczy z nieba, dla reszty perspektywa. */
export function stickerScale(id: string, y: number): number {
  return SKY.has(id) ? 1 : depthScale(y);
}
