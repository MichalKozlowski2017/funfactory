/**
 * Segregowanie (Warsztat Bazyla): obiekty przeciąga się do 2–3 skrzynek według reguły.
 * Każda reguła to zestaw grup (kategorie, kolory, domy zwierząt, pory roku, wielkość, ruch);
 * zadanie losuje 2–3 grupy, które do siebie nie są podobne, i po kilka obiektów z każdej.
 * Polecenie lektora: pytanie reguły (`sort-<reguła>`), potem nazwa każdej skrzynki (`binLine`).
 */
import type { Rng } from '@funfactory/core';
import { ITEMS, type Category, type Color, type Item } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export type SortRule = 'kategorie' | 'kolory' | 'domy' | 'pory' | 'wielkosc' | 'ruch';
export const SORT_RULES: readonly SortRule[] = ['kategorie', 'kolory', 'domy', 'pory', 'wielkosc', 'ruch'];

/** Skrzynka: klucz grupy i obrazek na znaku (obiekt z katalogu albo grafika Warsztatu; kolory: brak, wiaderko jest w kolorze). */
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
const TWO_TONE = ['kukurydza', 'ananas', 'biedronka', 'pszczola'];
const byColor = (c: Color) => () => ITEMS.filter((i) => i.color === c && !TWO_TONE.includes(i.id)).map((i) => i.id);

const GROUPS: Record<SortRule, GroupDef[]> = {
  kategorie: [
    { key: 'owoce', sign: 'jablko', ids: byCategory('owoce') },
    { key: 'warzywa', sign: 'marchewka', ids: byCategory('warzywa') },
    { key: 'zwierzeta', sign: 'kot', ids: byCategory('zwierzeta') },
    { key: 'pojazdy', sign: 'auto', ids: byCategory('pojazdy') },
    { key: 'ubrania', sign: 'koszulka', ids: byCategory('ubrania') },
    { key: 'kuchnia', sign: 'kubek', ids: byCategory('kuchnia') },
    { key: 'zabawki', sign: 'pilka', ids: byCategory('zabawki') },
  ],
  kolory: (['czerwony', 'zolty', 'zielony', 'niebieski', 'pomaranczowy', 'rozowy', 'fioletowy', 'brazowy', 'bialy'] as Color[]).map((c) => ({ key: c, ids: byColor(c) })),
  domy: [
    { key: 'wies', sign: 'stodola', ids: ids(['kot', 'pies', 'krowa', 'kura', 'kaczka', 'swinka', 'owca', 'kon', 'kurczak', 'cielaczek', 'prosiaczek', 'jagniatko', 'zrebak', 'koza', 'osiolek', 'indyk', 'ges']) },
    { key: 'las', sign: 'drzewo', ids: ids(['jez', 'wiewiorka', 'sowa', 'niedzwiedz', 'lis', 'zajac', 'dzik', 'sarna', 'dzieciol']) },
    { key: 'woda', sign: 'staw', ids: ids(['ryba', 'krab', 'osmiornica', 'wieloryb', 'delfin', 'meduza', 'konikmorski']) },
    { key: 'afryka', sign: 'palma', ids: ids(['lew', 'zyrafa', 'zebra', 'slon', 'malpa', 'hipopotam', 'nosorozec']) },
    { key: 'lod', sign: 'kra', ids: ids(['pingwin', 'foka', 'mors', 'mispolarny']) },
  ],
  pory: [
    { key: 'lato', sign: 'slonce', ids: ids(['okulary', 'kapelusz', 'sandaly', 'stroj']) },
    { key: 'zima', sign: 'balwan', ids: ids(['czapka', 'szalik', 'rekawiczki', 'kurtka', 'sanki']) },
  ],
  wielkosc: [
    { key: 'duze', sign: 'slon', ids: ids(['zyrafa', 'wieloryb', 'hipopotam', 'nosorozec', 'niedzwiedz', 'kon', 'krowa', 'mispolarny']) },
    { key: 'male', sign: 'mysz', ids: ids(['biedronka', 'pszczola', 'slimak', 'motyl', 'kurczak', 'jez', 'ptak']) },
  ],
  ruch: [
    { key: 'lata', sign: 'chmurka', ids: ids(['ptak', 'sowa', 'motyl', 'pszczola', 'dzieciol', 'samolot', 'helikopter', 'rakieta', 'latawiec', 'biedronka']) },
    { key: 'plywa', sign: 'staw', ids: ids(['ryba', 'delfin', 'wieloryb', 'meduza', 'lodka', 'osmiornica', 'konikmorski']) },
    { key: 'jezdzi', sign: 'droga', ids: ids(['auto', 'autobus', 'rower', 'traktor', 'pociag', 'hulajnoga', 'skuter', 'straz', 'ciezarowka']) },
  ],
};

/**
 * Grupy, których nie stawiamy obok siebie, bo dziecko mogłoby uznać obiekt za pasujący do obu
 * (pingwin pływa, zabawkowe autko jest zabawką, różowy i czerwony są bliskie).
 */
const CLASH: Record<SortRule, [string, string][]> = {
  kategorie: [
    ['zabawki', 'pojazdy'],
    ['zabawki', 'zwierzeta'],
    ['owoce', 'kuchnia'],
    ['warzywa', 'kuchnia'],
  ],
  kolory: [
    ['czerwony', 'rozowy'],
    ['czerwony', 'pomaranczowy'],
    ['zolty', 'pomaranczowy'],
    ['rozowy', 'fioletowy'],
    ['brazowy', 'pomaranczowy'],
    ['bialy', 'zolty'],
  ],
  domy: [['woda', 'lod']],
  pory: [],
  wielkosc: [],
  ruch: [],
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

/** Pytanie reguły, np. "sort-domy". */
export const sortPromptLine = (task: SortTask): string => `sort-${task.rule}`;

/** Nazwa skrzynki czytana po pytaniu i po jej dotknięciu, np. "kat-owoce", "barwa-zolty", "dom-las". */
export function binLine(rule: SortRule, key: string): string {
  const prefix: Record<SortRule, string> = { kategorie: 'kat', kolory: 'barwa', domy: 'dom', pory: 'pora', wielkosc: 'rozmiar', ruch: 'ruch' };
  return `${prefix[rule]}-${key}`;
}

/** Wszystkie nagrania segregowania (do listy lektora i testów). */
export const SORT_LINES: readonly string[] = [...SORT_RULES.map((r) => `sort-${r}`), ...SORT_RULES.flatMap((r) => GROUPS[r].map((g) => binLine(r, g.key)))];

/** Obrazki znaków skrzynek spoza katalogu (grafiki Warsztatu). */
export const SIGN_ART = ['stodola', 'staw', 'palma', 'kra', 'balwan', 'droga'];
