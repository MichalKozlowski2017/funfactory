import { CONTROL_MODES, type ControlMode } from './controls.ts';
import { normalizeDaily, type DailyRecord } from './daily.ts';
/**
 * Szafa (sklep za cukierki): czapki, kolory, ślady w locie i dodatki.
 * Tylko wygląd, nic nie zmienia rozgrywki (zasada uczciwej rywalizacji).
 * Czysta logika zapisu (bez Pixi), żeby dało się ją testować.
 */

export type ItemKind = 'hat' | 'skin' | 'trail' | 'acc';

export const KINDS: { kind: ItemKind; name: string }[] = [
  { kind: 'hat', name: 'Czapki' },
  { kind: 'skin', name: 'Kolory' },
  { kind: 'trail', name: 'Ślady' },
  { kind: 'acc', name: 'Dodatki' },
];

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

export interface ItemDef {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
}

/** Kolory ciała slime'a (domyślny różowy nie jest w sklepie). */
export const SKINS: (ItemDef & { color: string })[] = [
  { id: 'mint', kind: 'skin', name: 'Miętowy', price: 40, color: '#7fe0b4' },
  { id: 'lemon', kind: 'skin', name: 'Cytrynowy', price: 80, color: '#fff27a' },
  { id: 'grape', kind: 'skin', name: 'Winogronowy', price: 150, color: '#a98bff' },
  { id: 'gold', kind: 'skin', name: 'Złoty', price: 300, color: '#e39a12' },
];

/** Ślady w locie: cząsteczki za slime'em. */
export const TRAILS: (ItemDef & { colors: number[]; shape: 'dot' | 'star' | 'heart' })[] = [
  { id: 'bubbles', kind: 'trail', name: 'Bąbelki', price: 50, colors: [0xbfeaff, 0xffffff], shape: 'dot' },
  { id: 'hearts', kind: 'trail', name: 'Serduszka', price: 100, colors: [0xff6f9f, 0xffb3cf], shape: 'heart' },
  { id: 'stars', kind: 'trail', name: 'Gwiazdki', price: 180, colors: [0xffd166, 0xffffff], shape: 'star' },
  { id: 'rainbow', kind: 'trail', name: 'Tęcza', price: 250, colors: [0xff5f6d, 0xffb84d, 0xffe66d, 0x6de38a, 0x5fc8ff, 0xa98bff], shape: 'dot' },
];

/** Dodatki na twarz i ciało. */
export const ACCESSORIES: ItemDef[] = [
  { id: 'bow', kind: 'acc', name: 'Kokarda', price: 40 },
  { id: 'mustache', kind: 'acc', name: 'Wąsy', price: 70 },
  { id: 'shades', kind: 'acc', name: 'Okulary', price: 110 },
  { id: 'monocle', kind: 'acc', name: 'Monokl', price: 160 },
];

export const ITEMS: ItemDef[] = [...HATS.map((h) => ({ id: h.id, kind: 'hat' as const, name: h.name, price: h.price })), ...SKINS, ...TRAILS, ...ACCESSORIES];

export const itemsOf = (kind: ItemKind): ItemDef[] => ITEMS.filter((i) => i.kind === kind);

export interface Save {
  best: number;
  candies: number;
  owned: string[];
  /** Założone rzeczy (po jednej z każdego działu). */
  hat: string | null;
  skin: string | null;
  trail: string | null;
  acc: string | null;
  controls: ControlMode;
  /** Ustawienia: muzyka, efekty dźwiękowe, wibracje. */
  music: boolean;
  sfx: boolean;
  vibration: boolean;
  /** Wyzwanie dnia: wyniki z ostatnich dni (najnowszy na końcu). */
  daily: DailyRecord[];
}

export const NEW_SAVE: Save = {
  best: 0,
  candies: 0,
  owned: [],
  hat: null,
  skin: null,
  trail: null,
  acc: null,
  controls: 'swipe',
  music: true,
  sfx: true,
  vibration: true,
  daily: [],
};

export type ShopResult =
  | { ok: true; save: Save; action: 'bought' | 'equipped' | 'removed' }
  | { ok: false; reason: 'unknown' | 'poor'; missing?: number };

/**
 * Stuknięcie w rzecz w szafie:
 * - nieposiadana: kup (jeśli stać) i od razu załóż,
 * - posiadana, niezałożona: załóż (zdejmuje inną z tego działu),
 * - założona: zdejmij.
 */
export function tapItem(save: Save, id: string): ShopResult {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (save.owned.includes(id)) {
    const removing = save[item.kind] === id;
    return { ok: true, save: { ...save, [item.kind]: removing ? null : id }, action: removing ? 'removed' : 'equipped' };
  }
  if (save.candies < item.price) return { ok: false, reason: 'poor', missing: item.price - save.candies };
  return {
    ok: true,
    save: { ...save, candies: save.candies - item.price, owned: [...save.owned, id], [item.kind]: id },
    action: 'bought',
  };
}

/** Dawna nazwa (sklep miał tylko czapki). */
export const tapHat = tapItem;

/** Zapis z poprzedniej wersji gry albo uszkodzony: uzupełnij domyślnymi. */
export function normalizeSave(raw: Partial<Save>): Save {
  const owned = Array.isArray(raw.owned) ? raw.owned.filter((id) => ITEMS.some((i) => i.id === id)) : [];
  const worn = (kind: ItemKind, v: unknown): string | null =>
    typeof v === 'string' && owned.includes(v) && ITEMS.some((i) => i.id === v && i.kind === kind) ? v : null;
  return {
    best: Number(raw.best) || 0,
    candies: Number(raw.candies) || 0,
    owned,
    hat: worn('hat', raw.hat),
    skin: worn('skin', raw.skin),
    trail: worn('trail', raw.trail),
    acc: worn('acc', raw.acc),
    controls: CONTROL_MODES.includes(raw.controls as ControlMode) ? (raw.controls as ControlMode) : 'swipe',
    music: raw.music !== false,
    sfx: raw.sfx !== false,
    vibration: raw.vibration !== false,
    daily: normalizeDaily(raw.daily),
  };
}
