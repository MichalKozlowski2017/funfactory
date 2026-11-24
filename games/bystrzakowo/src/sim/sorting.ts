/**
 * Segregowanie (Warsztat Bazyla): obiekty przeciąga się do 2–3 skrzynek według reguły.
 * Każda reguła to zestaw grup (kategorie, kolory, domy zwierząt, pory roku, wielkość, ruch);
 * zadanie losuje 2–3 grupy, które do siebie nie są podobne, i po kilka obiektów z każdej.
 * Polecenie lektora: pytanie reguły (`sort-<reguła>`), potem nazwa każdej skrzynki (`binLine`).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Category, type Color, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export type SortRule = 'categories' | 'colors' | 'houses' | 'seasons' | 'size' | 'motion';
export const SORT_RULES: readonly SortRule[] = ['categories', 'colors', 'houses', 'seasons', 'size', 'motion'];

/** Skrzynka: klucz grupy i obrazek na znaku (obiekt z katalogu albo grafika Warsztatu; colors: brak, wiaderko jest w kolorze). */
export interface Bin {
  key: string;
  sign?: string;
}

export interface SortTask {
  rule: SortRule;
  bins: Bin[];
  /** Obiekty do posegregowania z numerem skrzynki. */
  items: { item: Item; bin: number }[];
}

export const SORT_ROUND = 3;

/** Grupa reguły: klucz, znak i członkowie (id z katalogu; brakujące w katalogu są pomijane). */
interface GroupDef {
  key: string;
  sign?: string;
  ids: () => string[];
}

const ids = (list: string[]) => () => list;
const byCategory = (c: Category) => () => ITEMS.filter((i) => i.category === c).map((i) => i.id);
/** Obiekty z dużą plamą drugiego koloru (kukurydza: żółta z zielonymi liśćmi): nie do wiaderek. */
const TWO_TONE = ['corn', 'pineapple', 'ladybug', 'bee'];
const byColor = (c: Color) => () => ITEMS.filter((i) => i.color === c && !TWO_TONE.includes(i.id)).map((i) => i.id);

const GROUPS: Record<SortRule, GroupDef[]> = {
  categories: [
    { key: 'fruit', sign: 'apple', ids: byCategory('fruit') },
    { key: 'vegetables', sign: 'carrot', ids: byCategory('vegetables') },
    { key: 'animals', sign: 'cat', ids: byCategory('animals') },
    { key: 'vehicles', sign: 'car', ids: byCategory('vehicles') },
    { key: 'clothes', sign: 't-shirt', ids: byCategory('clothes') },
    { key: 'kitchen', sign: 'mug', ids: byCategory('kitchen') },
    { key: 'toys', sign: 'ball', ids: byCategory('toys') },
  ],
  colors: (['red', 'yellow', 'green', 'blue', 'orange', 'pink', 'purple', 'brown', 'white'] as Color[]).map((c) => ({ key: c, ids: byColor(c) })),
  houses: [
    { key: 'village', sign: 'barn', ids: ids(['cat', 'dog', 'cow', 'hen', 'duck', 'pig', 'sheep', 'horse', 'chick', 'calf', 'piglet', 'lamb', 'foal', 'goat', 'donkey', 'turkey', 'goose']) },
    { key: 'forest', sign: 'tree', ids: ids(['hedgehog', 'squirrel', 'owl', 'bear', 'fox', 'hare', 'boar', 'deer', 'woodpecker']) },
    { key: 'water', sign: 'sea', ids: ids(['fish', 'crab', 'octopus', 'whale', 'dolphin', 'jellyfish', 'seahorse']) },
    { key: 'africa', sign: 'palm', ids: ids(['lion', 'giraffe', 'zebra', 'elephant', 'monkey', 'hippo', 'rhino']) },
    { key: 'ice', sign: 'ice-floe', ids: ids(['penguin', 'seal', 'walrus', 'polar-bear']) },
  ],
  seasons: [
    { key: 'summer', sign: 'sun', ids: ids(['glasses', 'sun-hat', 'sandals', 'outfit']) },
    { key: 'winter', sign: 'snowman', ids: ids(['hat', 'scarf', 'mittens', 'jacket', 'sled']) },
  ],
  size: [
    { key: 'big', sign: 'elephant', ids: ids(['giraffe', 'whale', 'hippo', 'rhino', 'bear', 'horse', 'cow', 'polar-bear']) },
    { key: 'small', sign: 'mouse', ids: ids(['ladybug', 'bee', 'snail', 'butterfly', 'chick', 'hedgehog', 'bird']) },
  ],
  motion: [
    { key: 'flies', sign: 'cloud', ids: ids(['bird', 'owl', 'butterfly', 'bee', 'woodpecker', 'airplane', 'helicopter', 'rocket', 'kite', 'ladybug']) },
    { key: 'swims', sign: 'sea', ids: ids(['fish', 'dolphin', 'whale', 'jellyfish', 'boat', 'octopus', 'seahorse']) },
    { key: 'drives', sign: 'road', ids: ids(['car', 'bus', 'bike', 'tractor', 'train', 'scooter', 'moped', 'fire-station', 'truck']) },
  ],
};

/**
 * Grupy, których nie stawiamy obok siebie, bo dziecko mogłoby uznać obiekt za pasujący do obu
 * (pingwin pływa, zabawkowe autko jest zabawką, różowy i czerwony są bliskie).
 */
const CLASH: Record<SortRule, [string, string][]> = {
  categories: [
    ['toys', 'vehicles'],
    ['toys', 'animals'],
    ['fruit', 'kitchen'],
    ['vegetables', 'kitchen'],
  ],
  colors: [
    ['red', 'pink'],
    ['red', 'orange'],
    ['yellow', 'orange'],
    ['pink', 'purple'],
    ['brown', 'orange'],
    ['white', 'yellow'],
  ],
  houses: [['water', 'ice']],
  seasons: [],
  size: [],
  motion: [],
};

/** Liczba obiektów do posegregowania na poziomie. */
export const sortCount = (level: number): number => [4, 6, 6][clamp(level)] as number;
/** Liczba skrzynek na poziomie. */
export const binCount = (level: number): number => (clamp(level) >= MAX_LEVEL ? 3 : 2);
const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

const present = () => new Set(ITEMS.map((i) => i.id));

/** Grupy reguły z członkami obecnymi w katalogu (bez obiektu ze znaku). */
function groups(rule: SortRule): { key: string; sign?: string; members: Item[] }[] {
  const have = present();
  return GROUPS[rule].map((g) => ({
    key: g.key,
    sign: g.sign,
    members: g
      .ids()
      .filter((id) => have.has(id) && id !== g.sign)
      .map((id) => ITEMS.find((i) => i.id === id)!),
  }));
}

/** Czy obiekt należy do grupy (do testów: każdy obiekt pasuje dokładnie do jednej skrzynki zadania). */
export function belongs(rule: SortRule, key: string, item: Item): boolean {
  return groups(rule).some((g) => g.key === key && g.members.includes(item));
}

const clash = (rule: SortRule, a: string, b: string) => CLASH[rule].some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** Losuje `n` grup bez konfliktów, każda z co najmniej `need` członkami. Null, gdy się nie da. */
function pickGroups(rng: Rng, rule: SortRule, n: number, need: number) {
  const pool = rng.shuffle(groups(rule).filter((g) => g.members.length >= need));
  const out: typeof pool = [];
  for (const g of pool) {
    if (out.length >= n) break;
    if (out.some((o) => clash(rule, o.key, g.key))) continue;
    // Obiekt należący do dwóch wybranych grup byłby niejednoznaczny: grupa musi mieć dość „własnych”.
    out.push(g);
  }
  return out.length === n ? out : null;
}

/** Reguły dostępne na poziomie (z co najmniej tyloma grupami, ile skrzynek). */
export function rulesFor(level: number): SortRule[] {
  const n = binCount(level);
  const need = Math.ceil(sortCount(level) / n);
  return SORT_RULES.filter((r) => pickGroups(rngStub, r, n, need) !== null);
}

/** Deterministyczny „rng” do sprawdzania dostępności reguł (bez tasowania). */
const rngStub = { shuffle: <T>(a: T[]) => a } as unknown as Rng;

export function makeSortTask(rng: Rng, level: number, rule: SortRule): SortTask {
  const nBins = binCount(level);
  const count = sortCount(level);
  const per = Array.from({ length: nBins }, (_, b) => Math.floor(count / nBins) + (b < count % nBins ? 1 : 0));
  const chosen = pickGroups(rng, rule, nBins, Math.max(...per)) ?? pickGroups(rngStub, rule, nBins, 1)!;
  const keys = chosen.map((g) => g.key);
  // Obiekt może być w kilku grupach reguły (np. ptak: lata i jest mały) – bierzemy tylko jednoznaczne.
  const own = chosen.map((g) => g.members.filter((m) => keys.filter((k) => belongs(rule, k, m)).length === 1));
  const items = rng.shuffle(chosen.flatMap((_, b) => rng.shuffle(own[b]!).slice(0, per[b]).map((item) => ({ item, bin: b }))));
  return { rule, bins: chosen.map((g) => ({ key: g.key, sign: g.sign })), items };
}

/** Runda segregowania: różne reguły po kolei. */
export function makeSortRound(rng: Rng, level: number): SortTask[] {
  const rules = rng.shuffle(rulesFor(level));
  return Array.from({ length: SORT_ROUND }, (_, i) => makeSortTask(rng, level, rules[i % rules.length]!));
}

/** Pytanie reguły, np. "sort-houses". */
export const sortPromptLine = (task: SortTask): string => `sort-${task.rule}`;

/** Nazwa skrzynki czytana po pytaniu i po jej dotknięciu, np. "category-fruit", "hue-yellow", "house-forest". */
export function binLine(rule: SortRule, key: string): string {
  const prefix: Record<SortRule, string> = { categories: 'category', colors: 'hue', houses: 'house', seasons: 'season', size: 'size', motion: 'motion' };
  return `${prefix[rule]}-${key}`;
}

/** Wszystkie nagrania segregowania (do listy lektora i testów). */
export const SORT_LINES: readonly string[] = [...SORT_RULES.map((r) => `sort-${r}`), ...SORT_RULES.flatMap((r) => GROUPS[r].map((g) => binLine(r, g.key)))];

/** Obrazki znaków skrzynek spoza katalogu (grafiki Warsztatu). */
// „morze” zamiast „staw”: wieloryb, delfin i meduza w stawie myliły (test agentem-dzieckiem).
export const SIGN_ART = ['barn', 'sea', 'palm', 'ice-floe', 'snowman', 'road'];
