import { START } from './shaft.ts';

/**
 * Światy (biomy) co 100 m: im wyżej, tym mroczniej, ale mrok dopiero od 400 m.
 * Czysto wizualne: nie zmieniają rozgrywki, więc rywalizacja zostaje uczciwa.
 */
export const BIOME_HEIGHT = 100; // metrów
/** Ostatnie metry świata, na których tło płynnie przechodzi w następne. */
export const BIOME_BLEND = 8;

export const BIOMES = [
  { id: 'crystal', name: 'Kryształowa jaskinia' },
  { id: 'choco', name: 'Czekoladowa kopalnia' },
  { id: 'jelly', name: 'Żelkowy las' },
  { id: 'clouds', name: 'Chmury z waty cukrowej' },
  { id: 'caramel', name: 'Spalony karmel' },
  { id: 'licorice', name: 'Lukrecjowe bagno' },
  { id: 'factory', name: 'Opuszczona fabryka' },
  { id: 'nightmare', name: 'Cukrowy koszmar' },
] as const;

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
