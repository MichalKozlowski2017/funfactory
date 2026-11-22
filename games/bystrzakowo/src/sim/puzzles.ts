import type { Rng } from '@funfactory/core';
import { lang, type Lang } from './lang.ts';
import { ITEMS, lookalike, startOf, type Category, type Color, type Item } from './catalog.ts';

/**
 * Silniki zagadek: z katalogu i poziomu trudności (0..MAX_LEVEL) generują pytania.
 * Czysty TS bez Pixi, żeby dało się testować i stroić.
 */
export type PuzzleKind = 'cienie' | 'pasuje' | 'liczenie' | 'kolory' | 'gloski' | 'mamy';
export const PUZZLE_KINDS: readonly PuzzleKind[] = ['cienie', 'pasuje', 'liczenie', 'kolory', 'gloski', 'mamy'];
export const MAX_LEVEL = 2;
export const ROUND_LENGTH = 5;

/** „Czyj to cień?”: duży cień `target`, do wyboru kolorowe obrazki. */
export interface ShadowQuestion {
  kind: 'cienie';
  target: Item;
  options: Item[];
}

/** „Co tu nie pasuje?”: wszystkie oprócz `odd` są z jednej kategorii. */
export interface OddQuestion {
  kind: 'pasuje';
  odd: Item;
  options: Item[];
}

/** „Policz, ile ich jest”: `count` sztuk `item`, do wyboru liczby. */
export interface CountQuestion {
  kind: 'liczenie';
  item: Item;
  count: number;
  options: number[];
}

/** „Pokaż coś czerwonego”: dokładnie jeden obiekt ma kolor `color`. */
export interface ColorQuestion {
  kind: 'kolory';
  color: Color;
  target: Item;
  options: Item[];
}

/** „Co zaczyna się na głoskę sz?”: dokładnie jeden obiekt zaczyna się na `sound`. */
export interface SoundQuestion {
  kind: 'gloski';
  sound: string;
  target: Item;
  options: Item[];
}

/** „Gdzie jest mama kurczaczka?”: `baby` u góry, do wyboru dorosłe zwierzęta. */
export interface MotherQuestion {
  kind: 'mamy';
  baby: Item;
  target: Item;
  options: Item[];
}

export type Question = ShadowQuestion | OddQuestion | CountQuestion | ColorQuestion | SoundQuestion | MotherQuestion;

/**
 * Głoski, o które pytamy (lektor ma do nich nagrania „gloska-<głoska>”). Pomijamy zwarte (k, p, t, b, d, g),
 * bo w izolacji brzmią jak sylaby („ka”, „pe”) i myliłyby dzieci.
 */
export const SOUNDS_PL = ['a', 'o', 'u', 'm', 'l', 'w', 's', 'sz', 'ż', 'ś', 'r', 'h', 'z', 'cz', 'j', 'n', 'ł'] as const;
/** Angielski i niemiecki: pierwsza litera słowa (tak uczą przedszkola w tych krajach). */
export const LETTERS_EN = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'o', 'p', 'r', 's', 't', 'w'] as const;
export const LETTERS_DE = ['a', 'b', 'e', 'f', 'g', 'h', 'k', 'l', 'm', 'p', 'r', 's', 't', 'w', 'z'] as const;
export const LETTERS_ES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'l', 'm', 'o', 'p', 'r', 's', 't'] as const;
/** Głoski (pl) albo litery (en, de) w zabawie „Co zaczyna się na…?” w bieżącym języku. */
export const soundsOf = (l: Lang = lang()): readonly string[] => ({ pl: SOUNDS_PL, en: LETTERS_EN, de: LETTERS_DE, es: LETTERS_ES })[l];
/** Wszystkie głoski i litery ze wszystkich języków (lista nagrań). */
export const SOUNDS: readonly string[] = SOUNDS_PL;

/** Nazwa pliku nagrania głoski (bez polskich znaków w nazwach plików). */
export const soundSlug = (sound: string): string => sound.replace('ż', 'zh').replace('ś', 'si').replace('ł', 'lw').replace('ź', 'zi');

/** Głoski łatwe do pomylenia: zmyłki nie mogą być z tej samej grupy co odpowiedź. */
const CONFUSABLE: Record<Lang, string[][]> = {
  pl: [['s', 'ś', 'sz', 'z', 'ź', 'ż', 'c', 'ć', 'cz', 'dz', 'dź', 'dż'], ['l', 'ł', 'r'], ['o', 'u'], ['m', 'n', 'ń']],
  // Nazwy liter, które się rymują („bee, dee, pee”), i te o tym samym dźwięku (c/k/s).
  en: [['b', 'c', 'd', 'e', 'g', 'p', 't', 'v', 'z'], ['c', 'k', 's'], ['m', 'n']],
  de: [['b', 'c', 'd', 'e', 'g', 'p', 't', 'w'], ['f', 'v'], ['m', 'n'], ['s', 'z']],
  // „be, ce, de, e, ge, pe, te” się rymują; b i v brzmią tak samo; c, s, z (seseo).
  es: [['b', 'c', 'd', 'e', 'g', 'p', 't'], ['b', 'v'], ['c', 's', 'z'], ['m', 'n']],
};
const confusable = (a: string, b: string) => a === b || CONFUSABLE[lang()].some((g) => g.includes(a) && g.includes(b));

/** Liczba odpowiedzi do wyboru na danym poziomie. */
export const optionCount = (level: number): number => [2, 3, 4][clampLevel(level)] as number;
/** Największa liczba do policzenia. */
export const maxCount = (level: number): number => [3, 5, 8][clampLevel(level)] as number;

const clampLevel = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

function take<T>(rng: Rng, pool: readonly T[], n: number, avoid: readonly T[] = []): T[] {
  return rng.shuffle(pool.filter((x) => !avoid.includes(x))).slice(0, n);
}

/** `n` losowych obiektów z puli, żaden nie jest podobny do `target` ani do siebie nawzajem. */
function distinct(rng: Rng, pool: readonly Item[], n: number, target: Item): Item[] {
  const out: Item[] = [];
  for (const item of rng.shuffle([...pool])) {
    if (out.length >= n) break;
    if (lookalike(item, target) || out.some((o) => lookalike(o, item))) continue;
    out.push(item);
  }
  return out;
}

export function shadowQuestion(rng: Rng, level: number, recent: readonly string[] = []): ShadowQuestion {
  const pool = ITEMS.filter((i) => i.shadow);
  const fresh = pool.filter((i) => !recent.includes(i.id));
  const target = rng.pick(fresh.length > 0 ? fresh : pool);
  const n = optionCount(level);
  // Na najwyższym poziomie zmyłki z tej samej kategorii (podobniejsze sylwetki).
  const same = pool.filter((i) => i.category === target.category);
  const decoys = distinct(rng, level >= MAX_LEVEL && same.length > n ? same : pool, n - 1, target);
  return { kind: 'cienie', target, options: rng.shuffle([target, ...decoys]) };
}

/** Kategorie, których obiekty dziecko może uznać za „pasujące” do siebie. */
const NEAR: [Category, Category][] = [
  ['natura', 'zwierzeta'],
  ['natura', 'owoce'],
  ['natura', 'warzywa'],
  ['zabawki', 'pojazdy'],
  ['zabawki', 'zwierzeta'],
];
const FRUIT_VEG: Category[] = ['owoce', 'warzywa'];

export function oddQuestion(rng: Rng, level: number, recent: readonly string[] = []): OddQuestion {
  const n = Math.max(3, optionCount(level));
  const groups = new Map<string, Item[]>();
  for (const item of ITEMS) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  const big = [...groups.values()].filter((g) => g.length >= n - 1);
  const group = rng.pick(big);
  const cat = group[0]!.category;
  // Intruz z kategorii wyraźnie innej: motyl wśród kwiatków albo autko wśród zabawek byłyby sporne.
  // Owoce i warzywa rozróżniamy dopiero na najwyższym poziomie.
  const near = (c: Category) => c === cat || NEAR.some(([a, b]) => (a === cat && b === c) || (b === cat && a === c)) || (level < MAX_LEVEL && FRUIT_VEG.includes(c) && FRUIT_VEG.includes(cat));
  const others = ITEMS.filter((i) => !near(i.category));
  const freshOdd = others.filter((i) => !recent.includes(i.id));
  const odd = rng.pick(freshOdd.length > 0 ? freshOdd : others);
  const members = take(rng, group.filter((i) => !lookalike(i, odd)), n - 1);
  return { kind: 'pasuje', odd, options: rng.shuffle([odd, ...members]) };
}

export function countQuestion(rng: Rng, level: number, recent: readonly string[] = []): CountQuestion {
  const pool = ITEMS.filter((i) => i.countable);
  const fresh = pool.filter((i) => !recent.includes(i.id));
  const item = rng.pick(fresh.length > 0 ? fresh : pool);
  const max = maxCount(level);
  const count = rng.int(1, max);
  // Zmyłki: liczby obok prawidłowej (najczęstszy błąd dziecka to pomyłka o 1).
  const near = [count - 1, count + 1, count - 2, count + 2, count + 3].filter((x) => x >= 1 && x <= Math.max(max, 4));
  const n = Math.max(3, optionCount(level));
  const options = [count, ...near.slice(0, n - 1)].sort((a, b) => a - b);
  return { kind: 'liczenie', item, count, options };
}

const freshPick = <T extends Item>(rng: Rng, pool: readonly T[], recent: readonly string[]): T => {
  const fresh = pool.filter((i) => !recent.includes(i.id));
  return rng.pick(fresh.length > 0 ? fresh : pool);
};

export function colorQuestion(rng: Rng, level: number, recent: readonly string[] = []): ColorQuestion {
  const colored = ITEMS.filter((i) => i.color);
  const target = freshPick(rng, colored, recent);
  const n = Math.max(3, optionCount(level));
  // Zmyłki: różne kolory, inne niż odpowiedź (żeby dokładnie jedna była dobra i obraz był czytelny).
  const decoys: Item[] = [];
  const used = new Set<string>([target.color!]);
  for (const item of rng.shuffle(colored.filter((i) => i.color !== target.color))) {
    if (decoys.length >= n - 1) break;
    if (used.has(item.color!)) continue;
    used.add(item.color!);
    decoys.push(item);
  }
  return { kind: 'kolory', color: target.color!, target, options: rng.shuffle([target, ...decoys]) };
}

export function soundQuestion(rng: Rng, level: number, recent: readonly string[] = []): SoundQuestion {
  const known = new Set<string>(soundsOf());
  const pool = ITEMS.filter((i) => known.has(startOf(i)));
  const target = freshPick(rng, pool, recent);
  const sound = startOf(target);
  const n = Math.max(3, optionCount(level));
  const decoys = take(
    rng,
    ITEMS.filter((i) => startOf(i) !== '' && !confusable(startOf(i), sound)),
    n - 1,
  );
  return { kind: 'gloski', sound, target, options: rng.shuffle([target, ...decoys]) };
}

export function motherQuestion(rng: Rng, level: number, recent: readonly string[] = []): MotherQuestion {
  // Tylko młode, których mama jest w katalogu (katalog może być okrojony do wczytanych grafik).
  const babies = ITEMS.filter((i) => i.mother && ITEMS.some((m) => m.id === i.mother));
  const baby = freshPick(rng, babies, recent);
  const target = ITEMS.find((i) => i.id === baby.mother)!;
  const mothers = new Set(babies.map((b) => b.mother));
  // Zmyłki: inne dorosłe zwierzęta (najpierw inne mamy z tej gry, potem reszta zwierząt).
  const adults = ITEMS.filter((i) => i.category === 'zwierzeta' && !i.mother && !lookalike(i, target) && !lookalike(i, baby));
  const n = Math.max(3, optionCount(level));
  // Zmyłki niepodobne do siebie nawzajem (owca i koza obok siebie myliłyby).
  const preferred = distinct(rng, adults.filter((a) => mothers.has(a.id)), n - 1, target);
  const rest = distinct(rng, adults.filter((a) => !preferred.some((p) => lookalike(p, a))), n - 1 - preferred.length, target);
  const decoys = [...preferred, ...rest];
  return { kind: 'mamy', baby, target, options: rng.shuffle([target, ...decoys]) };
}

export function makeQuestion(kind: PuzzleKind, rng: Rng, level: number, recent: readonly string[] = []): Question {
  switch (kind) {
    case 'cienie':
      return shadowQuestion(rng, level, recent);
    case 'pasuje':
      return oddQuestion(rng, level, recent);
    case 'liczenie':
      return countQuestion(rng, level, recent);
    case 'kolory':
      return colorQuestion(rng, level, recent);
    case 'gloski':
      return soundQuestion(rng, level, recent);
    case 'mamy':
      return motherQuestion(rng, level, recent);
  }
}

/** Obiekt, o który chodzi w pytaniu (dobra odpowiedź albo obiekt do liczenia). */
export const questionItem = (q: Question): Item => (q.kind === 'pasuje' ? q.odd : q.kind === 'liczenie' ? q.item : q.kind === 'mamy' ? q.baby : q.target);

/** Id obiektu, który pytanie „zużywa” (żeby nie powtarzać go w rundzie). */
export const questionKey = (q: Question): string => questionItem(q).id;

/** Prawidłowa odpowiedź. */
export const answerOf = (q: Question): Item | number => (q.kind === 'liczenie' ? q.count : q.kind === 'pasuje' ? q.odd : q.target);

export const isCorrect = (q: Question, answer: Item | number): boolean => answer === answerOf(q);

/** Nagranie polecenia (bez rozszerzenia), np. "kolor-czerwony", "gloska-sz", "mama-kurczak". */
export function promptLine(q: Question): string {
  if (q.kind === 'kolory') return `kolor-${q.color}`;
  if (q.kind === 'gloski') return `gloska-${soundSlug(q.sound)}`;
  if (q.kind === 'mamy') return `mama-${q.baby.id}`;
  return q.kind;
}

/** Cała runda: ROUND_LENGTH pytań bez powtórzeń obiektu przewodniego. */
export function makeRound(kind: PuzzleKind, rng: Rng, level: number): Question[] {
  const out: Question[] = [];
  const recent: string[] = [];
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const q = makeQuestion(kind, rng, level, recent);
    recent.push(questionKey(q));
    out.push(q);
  }
  return out;
}

/** Czy z obecnego katalogu da się złożyć rundę (np. są młode zwierzęta i ich mamy). */
export function playable(kind: PuzzleKind, rng: Rng): boolean {
  try {
    const round = makeRound(kind, rng, MAX_LEVEL);
    return round.every((q) => q.kind === 'liczenie' || q.options.length >= 3 || (q.kind === 'cienie' && q.options.length >= 2));
  } catch {
    return false;
  }
}

/**
 * Trudność adaptacyjna po rundzie: bez pomyłek poziom w górę, 3+ pomyłki w dół.
 * `mistakes` to liczba błędnych dotknięć w całej rundzie.
 */
export function nextLevel(level: number, mistakes: number): number {
  if (mistakes === 0) return clampLevel(level + 1);
  if (mistakes >= 3) return clampLevel(level - 1);
  return clampLevel(level);
}
