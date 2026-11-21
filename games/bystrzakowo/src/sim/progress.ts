import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { ACTIVITIES, type Activity } from './realms.ts';

/** Zapis postępów dziecka. */
export interface Progress {
  /** Poziom trudności każdej zabawy (0..MAX_LEVEL). */
  levels: Record<Activity, number>;
  /** Zebrane naklejki (id obiektów z katalogu), w kolejności zdobycia. */
  stickers: string[];
  rounds: number;
  /** Ostatnio oglądana kraina (powrót z zabawy do tej samej krainy). */
  realm: number;
  /** Pokolorowane strony kolorowanki (najpierw nowe). */
  colored?: string[];
  /** Obrazek z naklejek (pozycje w ułamkach ekranu). */
  scene?: { id: string; x: number; y: number; flip: boolean }[];
  /** Ustawienia ze strefy rodzica. */
  music: boolean;
  /** Limit czasu zabawy w minutach (0 = bez limitu). */
  limit?: number;
}

export const newProgress = (): Progress => ({
  levels: Object.fromEntries(ACTIVITIES.map((k) => [k, 0])) as Record<Activity, number>,
  stickers: [],
  rounds: 0,
  realm: 0,
  music: true,
});

/** Naklejka za rundę: najpierw te, których dziecko jeszcze nie ma. */
export function pickSticker(rng: Rng, owned: readonly string[]): string {
  const missing = ITEMS.filter((i) => !owned.includes(i.id));
  return rng.pick(missing.length > 0 ? missing : ITEMS).id;
}
