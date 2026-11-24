/**
 * Sorting (Basil's Workshop): items are dragged into 2–3 bins according to a rule.
 * Each rule is a set of groups (categories, colours, animal homes, seasons, size, movement);
 * a task draws 2–3 groups that aren't similar to each other, and a few items from each.
 * Narrator instruction: the rule question (`sort-<rule>`), then the name of each bin (`binLine`).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Category, type Color, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export type SortRule = 'categories' | 'colors' | 'houses' | 'seasons' | 'size' | 'motion';
export const SORT_RULES: readonly SortRule[] = ['categories', 'colors', 'houses', 'seasons', 'size', 'motion'];

/** Bin: group key and the picture on its sign (a catalog item or Workshop art; colors: none, the bucket itself is coloured). */
export interface Bin {
  key: string;
  sign?: string;
}

export interface SortTask {
  rule: SortRule;
  bins: Bin[];
  /** Items to sort with their bin index. */
  items: { item: Item; bin: number }[];
}

export const SORT_ROUND = 3;

/** Rule group: key, sign and members (catalog ids; ones missing from the catalog are skipped). */
interface GroupDef {
  key: string;
  sign?: string;
  ids: () => string[];
}

const ids = (list: string[]) => () => list;
const byCategory = (c: Category) => () => ITEMS.filter((i) => i.category === c).map((i) => i.id);
/** Items with a large patch of a second colour (corn: yellow with green leaves): not for the buckets. */
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
 * Groups never shown side by side, because a child could think an item fits both
 * (a penguin swims, a toy car is a toy, pink and red are close).
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

/** Number of items to sort per level. */
export const sortCount = (level: number): number => [4, 6, 6][clamp(level)] as number;
/** Number of bins per level. */
export const binCount = (level: number): number => (clamp(level) >= MAX_LEVEL ? 3 : 2);
const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

const present = () => new Set(ITEMS.map((i) => i.id));

/** Rule groups with members present in the catalog (excluding the sign's item). */
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

/** Whether an item belongs to a group (for tests: every item fits exactly one of the task's bins). */
export function belongs(rule: SortRule, key: string, item: Item): boolean {
  return groups(rule).some((g) => g.key === key && g.members.includes(item));
}

const clash = (rule: SortRule, a: string, b: string) => CLASH[rule].some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** Draws `n` non-conflicting groups, each with at least `need` members. Null when impossible. */
function pickGroups(rng: Rng, rule: SortRule, n: number, need: number) {
  const pool = rng.shuffle(groups(rule).filter((g) => g.members.length >= need));
  const out: typeof pool = [];
  for (const g of pool) {
    if (out.length >= n) break;
    if (out.some((o) => clash(rule, o.key, g.key))) continue;
    // An item belonging to two chosen groups would be ambiguous: a group needs enough "own" members.
    out.push(g);
  }
  return out.length === n ? out : null;
}

/** Rules available at a level (with at least as many groups as bins). */
export function rulesFor(level: number): SortRule[] {
  const n = binCount(level);
  const need = Math.ceil(sortCount(level) / n);
  return SORT_RULES.filter((r) => pickGroups(rngStub, r, n, need) !== null);
}

/** Deterministic "rng" for checking rule availability (no shuffling). */
const rngStub = { shuffle: <T>(a: T[]) => a } as unknown as Rng;

export function makeSortTask(rng: Rng, level: number, rule: SortRule): SortTask {
  const nBins = binCount(level);
  const count = sortCount(level);
  const per = Array.from({ length: nBins }, (_, b) => Math.floor(count / nBins) + (b < count % nBins ? 1 : 0));
  const chosen = pickGroups(rng, rule, nBins, Math.max(...per)) ?? pickGroups(rngStub, rule, nBins, 1)!;
  const keys = chosen.map((g) => g.key);
  // An item can be in several groups of a rule (e.g. a bird: flies and is small) – only unambiguous ones are taken.
  const own = chosen.map((g) => g.members.filter((m) => keys.filter((k) => belongs(rule, k, m)).length === 1));
  const items = rng.shuffle(chosen.flatMap((_, b) => rng.shuffle(own[b]!).slice(0, per[b]).map((item) => ({ item, bin: b }))));
  return { rule, bins: chosen.map((g) => ({ key: g.key, sign: g.sign })), items };
}

/** Sorting round: different rules in turn. */
export function makeSortRound(rng: Rng, level: number): SortTask[] {
  const rules = rng.shuffle(rulesFor(level));
  return Array.from({ length: SORT_ROUND }, (_, i) => makeSortTask(rng, level, rules[i % rules.length]!));
}

/** Rule question, e.g. "sort-houses". */
export const sortPromptLine = (task: SortTask): string => `sort-${task.rule}`;

/** Bin name read after the question and when the bin is touched, e.g. "category-fruit", "hue-yellow", "house-forest". */
export function binLine(rule: SortRule, key: string): string {
  const prefix: Record<SortRule, string> = { categories: 'category', colors: 'hue', houses: 'house', seasons: 'season', size: 'size', motion: 'motion' };
  return `${prefix[rule]}-${key}`;
}

/** All sorting recordings (for the narrator list and tests). */
export const SORT_LINES: readonly string[] = [...SORT_RULES.map((r) => `sort-${r}`), ...SORT_RULES.flatMap((r) => GROUPS[r].map((g) => binLine(r, g.key)))];

/** Bin sign pictures not in the catalog (Workshop art). */
// "sea" instead of "pond": a whale, dolphin and jellyfish in a pond were confusing (child-agent test).
export const SIGN_ART = ['barn', 'sea', 'palm', 'ice-floe', 'snowman', 'road'];
