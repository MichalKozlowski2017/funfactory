/**
 * Segregowanie (Warsztat Bazyla): obiekty przeciąga się do 2–3 skrzynek według reguły.
 * Reguły: kategorie (owoce i warzywa…), kolory (wiaderka) i „kto gdzie mieszka” (wieś, las, woda).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Category, type Color, type Home, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export type SortRule = 'kategorie' | 'kolory' | 'domy';

/** Skrzynka: co do niej pasuje i co jest na jej znaku. */
export interface Bin {
  /** Kategoria, kolor albo dom. */
  key: string;
  /** Obrazek na znaku skrzynki: id obiektu z katalogu (kategorie) albo grafiki Warsztatu (domy). Kolory: brak, wiaderko jest w kolorze. */
  sign?: string;
}

export interface SortTask {
  rule: SortRule;
  bins: Bin[];
  /** Obiekty do posegregowania z numerem skrzynki. */
  items: { item: Item; bin: number }[];
}

export const SORT_ROUND = 3;

/** Pary kategorii (z obrazkiem na znaku), łatwe do rozróżnienia dla przedszkolaka. */
const CATEGORY_PAIRS: [Category, Category][] = [
  ['owoce', 'warzywa'],
  ['zwierzeta', 'pojazdy'],
  ['ubrania', 'kuchnia'],
];
/** Obrazek na skrzynce kategorii (ten obiekt nie trafia do segregowania). */
export const CATEGORY_SIGN: Partial<Record<Category, string>> = { owoce: 'jablko', warzywa: 'marchewka', zwierzeta: 'kot', pojazdy: 'auto', ubrania: 'koszulka', kuchnia: 'kubek' };
const HOME_SIGN: Record<Home, string> = { wies: 'stodola', las: 'drzewo', woda: 'staw' };
/** Obiekty z dużą plamą drugiego koloru (kukurydza: żółta z zielonymi liśćmi): nie do wiaderek. */
const TWO_TONE = ['kukurydza', 'ananas'];
/** Kolory wiaderek: wyraźnie różne. */
const BUCKET_COLORS: Color[] = ['czerwony', 'zolty', 'zielony', 'niebieski'];

/** Liczba obiektów do posegregowania na poziomie. */
export const sortCount = (level: number): number => [4, 6, 6][clamp(level)] as number;
/** Liczba skrzynek na poziomie. */
export const binCount = (level: number): number => (clamp(level) >= MAX_LEVEL ? 3 : 2);
const clamp = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

/** Reguły dostępne na poziomie (na najwyższym trzy skrzynki: kolory albo domy). */
export function rulesFor(level: number): SortRule[] {
  return binCount(level) === 3 ? ['kolory', 'domy'] : ['kategorie', 'kolory', 'domy'];
}

export function makeSortTask(rng: Rng, level: number, rule: SortRule): SortTask {
  const nBins = binCount(level);
  const count = sortCount(level);
  let bins: Bin[];
  let pools: Item[][];
  if (rule === 'kategorie') {
    const pair = rng.pick(CATEGORY_PAIRS.filter(([a, b]) => ITEMS.some((i) => i.category === a) && ITEMS.some((i) => i.category === b)));
    bins = pair.map((c) => ({ key: c, sign: CATEGORY_SIGN[c] }));
    pools = pair.map((c) => ITEMS.filter((i) => i.category === c && i.id !== CATEGORY_SIGN[c]));
  } else if (rule === 'kolory') {
    const colored = ITEMS.filter((i) => i.color && !TWO_TONE.includes(i.id));
    const colors = rng.shuffle(BUCKET_COLORS.filter((c) => colored.filter((i) => i.color === c).length >= 2)).slice(0, nBins);
    bins = colors.map((c) => ({ key: c }));
    pools = colors.map((c) => colored.filter((i) => i.color === c));
  } else {
    const homes = rng.shuffle((['wies', 'las', 'woda'] as Home[]).filter((h) => ITEMS.filter((i) => i.home === h).length >= 2)).slice(0, nBins);
    bins = homes.map((h) => ({ key: h, sign: HOME_SIGN[h] }));
    pools = homes.map((h) => ITEMS.filter((i) => i.home === h));
  }
  // Po równo do każdej skrzynki (reszta do losowych), każda dostaje co najmniej jeden obiekt.
  const per = bins.map((_, b) => Math.floor(count / bins.length) + (b < count % bins.length ? 1 : 0));
  const items = rng.shuffle(bins.flatMap((_, b) => rng.shuffle(pools[b]!).slice(0, per[b]).map((item) => ({ item, bin: b }))));
  return { rule, bins, items };
}

/** Runda segregowania: różne reguły po kolei. */
export function makeSortRound(rng: Rng, level: number): SortTask[] {
  const rules = rng.shuffle(rulesFor(level));
  return Array.from({ length: SORT_ROUND }, (_, i) => makeSortTask(rng, level, rules[i % rules.length]!));
}

/** Nagranie polecenia, np. "sort-owoce-warzywa", "sort-kolory", "sort-domy-wies-las". */
export function sortPromptLine(task: SortTask): string {
  if (task.rule === 'kolory') return 'sort-kolory';
  const keys = task.bins.map((b) => b.key);
  if (task.rule === 'kategorie') return `sort-${keys.join('-')}`;
  // Domy: nazwa stała niezależnie od kolejności skrzynek.
  const order: Home[] = ['wies', 'las', 'woda'];
  return `sort-domy-${order.filter((h) => keys.includes(h)).join('-')}`;
}

/** Wszystkie możliwe nagrania poleceń segregowania (do listy lektora i testów). */
export const SORT_LINES: readonly string[] = [
  'sort-owoce-warzywa',
  'sort-zwierzeta-pojazdy',
  'sort-ubrania-kuchnia',
  'sort-kolory',
  'sort-domy-wies-las',
  'sort-domy-wies-woda',
  'sort-domy-las-woda',
  'sort-domy-wies-las-woda',
];
