import { CONTROL_MODES, type ControlMode } from './controls.ts';
import { normalizeDaily, type DailyRecord } from './daily.ts';
import { normalizeStats, type Stats } from './achievements.ts';
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

/**
 * Ceny: przeciętny gracz zbiera ok. 1500–2500 cukierków na godzinę (pomiar botem, z zapasem
 * na to, że bot gra lepiej niż początkujący). Progi 400 / 1000 / 2500 / 5000 / 10 000 to od
 * kwadransa do kilku godzin gry na rzecz; cała szafa to kilkadziesiąt godzin. Szósta rzecz
 * w każdym dziale jest tylko za osiągnięcie (`unlock`), nie da się jej kupić.
 */
export const HATS: (HatDef & { unlock?: string })[] = [
  { id: 'party', name: 'Imprezowa', price: 400, file: 'hats/party.png', width: 40, y: -66, tilt: 0.18 },
  { id: 'chef', name: 'Kucharska', price: 1000, file: 'hats/chef.png', width: 62, y: -60, tilt: -0.08 },
  { id: 'pirate', name: 'Piracka', price: 2500, file: 'hats/pirate.png', width: 74, y: -58, tilt: -0.1 },
  { id: 'crown', name: 'Korona', price: 5000, file: 'hats/crown.png', width: 58, y: -64, tilt: 0.06 },
  { id: 'wizard', name: 'Czarodzieja', price: 10000, file: 'hats/wizard.png', width: 78, y: -60, tilt: -0.12 },
  { id: 'horns', name: 'Rogi', price: 0, unlock: 'h700', file: 'hats/horns.png', width: 70, y: -54, tilt: 0 },
];

export interface ItemDef {
  id: string;
  kind: ItemKind;
  name: string;
  /** Cena w cukierkach (0 dla rzeczy za osiągnięcie). */
  price: number;
  /** Id osiągnięcia, które daje tę rzecz (nie da się jej kupić). */
  unlock?: string;
}

/** Kolory ciała slime'a (domyślny różowy nie jest w sklepie). */
export const SKINS: (ItemDef & { color: string; rainbow?: boolean })[] = [
  { id: 'mint', kind: 'skin', name: 'Miętowy', price: 400, color: '#7fe0b4' },
  { id: 'lemon', kind: 'skin', name: 'Cytrynowy', price: 1000, color: '#fff27a' },
  { id: 'ice', kind: 'skin', name: 'Lodowy', price: 2500, color: '#9fdcff' },
  { id: 'grape', kind: 'skin', name: 'Winogronowy', price: 5000, color: '#a98bff' },
  { id: 'gold', kind: 'skin', name: 'Złoty', price: 10000, color: '#e39a12' },
  { id: 'prism', kind: 'skin', name: 'Tęczowy', price: 0, unlock: 's20', color: '#f6f2ff', rainbow: true },
];

/** Ślady w locie: cząsteczki za slime'em. */
export type TrailShape = 'dot' | 'star' | 'heart' | 'note' | 'flame';

export const TRAILS: (ItemDef & { colors: number[]; shape: TrailShape })[] = [
  { id: 'bubbles', kind: 'trail', name: 'Bąbelki', price: 400, colors: [0xbfeaff, 0xffffff], shape: 'dot' },
  { id: 'hearts', kind: 'trail', name: 'Serduszka', price: 1000, colors: [0xff6f9f, 0xffb3cf], shape: 'heart' },
  { id: 'notes', kind: 'trail', name: 'Nutki', price: 2500, colors: [0xffffff, 0xc9b8ff, 0x9fe8ff], shape: 'note' },
  { id: 'stars', kind: 'trail', name: 'Gwiazdki', price: 5000, colors: [0xffd166, 0xffffff], shape: 'star' },
  { id: 'rainbow', kind: 'trail', name: 'Tęcza', price: 10000, colors: [0xff5f6d, 0xffb84d, 0xffe66d, 0x6de38a, 0x5fc8ff, 0xa98bff], shape: 'dot' },
  { id: 'fire', kind: 'trail', name: 'Ogień', price: 0, unlock: 'rescue25', colors: [0xff4d2e, 0xff9a3d, 0xffd166], shape: 'flame' },
];

/** Dodatki na twarz i ciało. */
export const ACCESSORIES: ItemDef[] = [
  { id: 'bow', kind: 'acc', name: 'Kokarda', price: 400 },
  { id: 'mustache', kind: 'acc', name: 'Wąsy', price: 1000 },
  { id: 'headphones', kind: 'acc', name: 'Słuchawki', price: 2500 },
  { id: 'shades', kind: 'acc', name: 'Okulary', price: 5000 },
  { id: 'monocle', kind: 'acc', name: 'Monokl', price: 10000 },
  { id: 'medal', kind: 'acc', name: 'Medal', price: 0, unlock: 'daily7' },
];

export const ITEMS: ItemDef[] = [
  ...HATS.map((h) => ({ id: h.id, kind: 'hat' as const, name: h.name, price: h.price, unlock: h.unlock })),
  ...SKINS,
  ...TRAILS,
  ...ACCESSORIES,
];

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
  /** Liczniki do osiągnięć i zdobyte osiągnięcia. */
  stats: Stats;
  achievements: string[];
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
  stats: normalizeStats(undefined),
  achievements: [],
};

export type ShopResult =
  | { ok: true; save: Save; action: 'bought' | 'equipped' | 'removed' }
  | { ok: false; reason: 'unknown' | 'poor' | 'locked'; missing?: number; unlock?: string };

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
  if (item.unlock) return { ok: false, reason: 'locked', unlock: item.unlock };
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
    stats: normalizeStats(raw.stats),
    achievements: Array.isArray(raw.achievements) ? raw.achievements.filter((id): id is string => typeof id === 'string') : [],
  };
}
