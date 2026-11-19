import type { Feature } from './physics.ts';
import { START } from './shaft.ts';

/**
 * Światy (biomy) co 100 m: im wyżej, tym mroczniej, ale mrok dopiero od 400 m.
 * Każdy świat od drugiego ma własne półki (mechaniki): czekolada się kruszy, galaretka odbija,
 * chmury przepuszczają od dołu, w fabryce jeżdżą taśmociągi. Wyższe światy je mieszają.
 * Układ jest ten sam dla danego seedu, więc rywalizacja zostaje uczciwa.
 */
export const BIOME_HEIGHT = 100; // metrów
/** Ostatnie metry świata, na których tło płynnie przechodzi w następne. */
export const BIOME_BLEND = 8;

export const BIOMES = [
  { id: 'crystal', name: 'Kryształowa jaskinia', tip: '' },
  { id: 'choco', name: 'Czekoladowa kopalnia', tip: 'Czekolada kruszy się pod Tobą!' },
  { id: 'jelly', name: 'Żelkowy las', tip: 'Galaretka odbija jak trampolina' },
  { id: 'clouds', name: 'Chmury z waty cukrowej', tip: 'Przez chmury przelecisz od dołu' },
  { id: 'caramel', name: 'Spalony karmel', tip: 'Czekolada i galaretka naraz' },
  { id: 'licorice', name: 'Lukrecjowe bagno', tip: 'Chmury i kruszące się półki' },
  { id: 'factory', name: 'Opuszczona fabryka', tip: 'Taśmociągi zrzucają z półek' },
  { id: 'nightmare', name: 'Cukrowy koszmar', tip: 'Wszystko naraz. Powodzenia!' },
] as const;

/** Szansa, że lukrowana półka w danym świecie dostanie mechanikę (suma ≤ 1, reszta zostaje zwykła). */
export const BIOME_FEATURES: Record<(typeof BIOMES)[number]['id'], [Feature, number][]> = {
  crystal: [],
  choco: [['crumble', 0.45]],
  jelly: [['bounce', 0.4], ['crumble', 0.1]],
  clouds: [['cloud', 0.5]],
  caramel: [['crumble', 0.35], ['bounce', 0.2]],
  licorice: [['cloud', 0.3], ['crumble', 0.25]],
  factory: [['belt', 0.5], ['crumble', 0.15]],
  nightmare: [['belt', 0.2], ['crumble', 0.25], ['bounce', 0.15], ['cloud', 0.15]],
};

export type BiomeId = (typeof BIOMES)[number]['id'];

/** Wysokość w metrach dla punktu świata (y rośnie w dół). */
export function metersAt(y: number): number {
  return (START.y - y) / 100;
}

/** Indeks świata dla wysokości w metrach (ostatni trwa w nieskończoność). */
export function biomeIndex(meters: number): number {
  return Math.min(BIOMES.length - 1, Math.max(0, Math.floor(meters / BIOME_HEIGHT)));
}

/** Świat i płynne przejście do następnego: `t` od 0 do 1 na ostatnich BIOME_BLEND metrach. */
export function biomeBlend(meters: number): { index: number; next: number; t: number } {
  const index = biomeIndex(meters);
  const next = Math.min(BIOMES.length - 1, index + 1);
  if (next === index) return { index, next, t: 0 };
  const into = meters - index * BIOME_HEIGHT;
  const t = Math.min(1, Math.max(0, (into - (BIOME_HEIGHT - BIOME_BLEND)) / BIOME_BLEND));
  return { index, next, t: t * t * (3 - 2 * t) };
}
