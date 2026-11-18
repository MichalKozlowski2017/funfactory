import { CONTROL_MODES, type ControlMode } from './controls.ts';
/**
 * Czapki i sklep: czysta logika zapisu (bez Pixi), żeby dało się ją testować.
 */

export interface HatDef {
  id: string;
  name: string;
  price: number;
  /** Plik w public/art. */
  file: string;
  /** Szerokość czapki na slime'ie (jednostki gry). */
  width: number;
  /** Przesunięcie podstawy czapki względem podstawy ciała (w górę = ujemne). */
  y: number;
  /** Lekki przechył dla charakteru. */
  tilt: number;
}

export const HATS: HatDef[] = [
  { id: 'party', name: 'Imprezowa', price: 30, file: 'hats/party.png', width: 40, y: -66, tilt: 0.18 },
  { id: 'chef', name: 'Kucharska', price: 60, file: 'hats/chef.png', width: 62, y: -60, tilt: -0.08 },
  { id: 'crown', name: 'Korona', price: 120, file: 'hats/crown.png', width: 58, y: -64, tilt: 0.06 },
  { id: 'wizard', name: 'Czarodzieja', price: 200, file: 'hats/wizard.png', width: 78, y: -60, tilt: -0.12 },
];

export interface Save {
  best: number;
  candies: number;
  owned: string[];
  hat: string | null;
  controls: ControlMode;
  /** Ustawienia: muzyka, efekty dźwiękowe, wibracje. */
  music: boolean;
  sfx: boolean;
  vibration: boolean;
}

export const NEW_SAVE: Save = { best: 0, candies: 0, owned: [], hat: null, controls: 'swipe', music: true, sfx: true, vibration: true };

export type ShopResult =
  | { ok: true; save: Save; action: 'bought' | 'equipped' | 'removed' }
  | { ok: false; reason: 'unknown' | 'poor'; missing?: number };

/**
 * Stuknięcie w czapkę w sklepie:
 * - nieposiadana: kup (jeśli stać) i od razu załóż,
 * - posiadana, niezałożona: załóż,
 * - założona: zdejmij.
 */
export function tapHat(save: Save, id: string): ShopResult {
  const hat = HATS.find((h) => h.id === id);
  if (!hat) return { ok: false, reason: 'unknown' };
  if (save.owned.includes(id)) {
    const removing = save.hat === id;
    return { ok: true, save: { ...save, hat: removing ? null : id }, action: removing ? 'removed' : 'equipped' };
  }
  if (save.candies < hat.price) return { ok: false, reason: 'poor', missing: hat.price - save.candies };
  return {
    ok: true,
    save: { ...save, candies: save.candies - hat.price, owned: [...save.owned, id], hat: id },
    action: 'bought',
  };
}

/** Zapis z poprzedniej wersji gry (bez owned/hat) albo uszkodzony: uzupełnij domyślnymi. */
export function normalizeSave(raw: Partial<Save>): Save {
  return {
    best: Number(raw.best) || 0,
    candies: Number(raw.candies) || 0,
    owned: Array.isArray(raw.owned) ? raw.owned.filter((id) => HATS.some((h) => h.id === id)) : [],
    hat: typeof raw.hat === 'string' && HATS.some((h) => h.id === raw.hat) ? raw.hat : null,
    controls: CONTROL_MODES.includes(raw.controls as ControlMode) ? (raw.controls as ControlMode) : 'swipe',
    music: raw.music !== false,
    sfx: raw.sfx !== false,
    vibration: raw.vibration !== false,
  };
}
