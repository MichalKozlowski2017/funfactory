import type { Rng } from '@funfactory/core';
import { lang, type Lang } from './lang.ts';
import { ITEMS, lookalike, startOf, type Category, type Color, type Item } from './catalog.ts';

/**
 * Puzzle engines: generate questions from the catalog and the difficulty level (0..MAX_LEVEL).
 * Pure TS without Pixi, so they can be tested and tuned.
 */
export type PuzzleKind = 'shadows' | 'matching' | 'counting' | 'colors' | 'phonemes' | 'mothers';
export const PUZZLE_KINDS: readonly PuzzleKind[] = ['shadows', 'matching', 'counting', 'colors', 'phonemes', 'mothers'];
export const MAX_LEVEL = 2;
export const ROUND_LENGTH = 5;

/** "Whose shadow is this?": a large shadow of `target`, colored pictures to choose from. */
export interface ShadowQuestion {
  kind: 'shadows';
  target: Item;
  options: Item[];
}

/** "What doesn't belong?": all except `odd` are from one category. */
export interface OddQuestion {
  kind: 'matching';
  odd: Item;
  options: Item[];
}

/** "Count how many there are": `count` copies of `item`, numbers to choose from. */
export interface CountQuestion {
  kind: 'counting';
  item: Item;
  count: number;
  options: number[];
}

/** "Show me something red": exactly one item has the color `color`. */
export interface ColorQuestion {
  kind: 'colors';
  color: Color;
  target: Item;
  options: Item[];
}

/** "What starts with the letter R?": exactly one item starts with `sound` (first letter). */
export interface SoundQuestion {
  kind: 'phonemes';
  sound: string;
  target: Item;
  options: Item[];
}

/** "Where is the chick's mom?": `baby` at the top, adult animals to choose from. */
export interface MotherQuestion {
  kind: 'mothers';
  baby: Item;
  target: Item;
  options: Item[];
}

export type Question = ShadowQuestion | OddQuestion | CountQuestion | ColorQuestion | SoundQuestion | MotherQuestion;

/**
 * Polish: the first letter, asked about by the letter's name ("What starts with the letter… R?", recordings "phoneme-<letter>").
 * We used to ask about the sound, but the speech model can't say a bare consonant ("sss" came out as "sy").
 * Only letters with at least two pictures.
 */
export const SOUNDS_PL = ['a', 'o', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ł', 'm', 'n', 'p', 'r', 's', 'ś', 't', 'w', 'z', 'ż'] as const;
/** English and German: the first letter of the word (that's how preschools in those countries teach it). */
export const LETTERS_EN = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'o', 'p', 'r', 's', 't', 'w'] as const;
export const LETTERS_DE = ['a', 'b', 'e', 'f', 'g', 'h', 'k', 'l', 'm', 'p', 'r', 's', 't', 'w', 'z'] as const;
export const LETTERS_ES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'l', 'm', 'o', 'p', 'r', 's', 't'] as const;
/** Letters in the "What starts with…?" activity in the current language. */
export const soundsOf = (l: Lang = lang()): readonly string[] => ({ pl: SOUNDS_PL, en: LETTERS_EN, de: LETTERS_DE, es: LETTERS_ES })[l];
/** Polish letters (recording list). */
export const SOUNDS: readonly string[] = SOUNDS_PL;

/** Letter recording file name (no Polish diacritics in file names). */
export const soundSlug = (sound: string): string => sound.replace('ż', 'zh').replace('ś', 'si').replace('ł', 'lw').replace('ź', 'zi');

/** Easily confused letters (similar sound at the start of a word): decoys can't be from the same group as the answer. */
const CONFUSABLE: Record<Lang, string[][]> = {
  // The Polish barred L sounds like "u" or "w"; b/p, d/t, g/k, w/f are voiced-voiceless pairs.
  pl: [['s', 'ś', 'z', 'ż', 'c'], ['l', 'r'], ['ł', 'u', 'w', 'o'], ['m', 'n'], ['b', 'p'], ['d', 't'], ['g', 'k'], ['w', 'f']],
  // Letter names that rhyme ("bee, dee, pee"), and those with the same sound (c/k/s).
  en: [['b', 'c', 'd', 'e', 'g', 'p', 't', 'v', 'z'], ['c', 'k', 's'], ['m', 'n']],
  de: [['b', 'c', 'd', 'e', 'g', 'p', 't', 'w'], ['f', 'v'], ['m', 'n'], ['s', 'z']],
  // "be, ce, de, e, ge, pe, te" rhyme; b and v sound the same; c, s, z (seseo).
  es: [['b', 'c', 'd', 'e', 'g', 'p', 't'], ['b', 'v'], ['c', 's', 'z'], ['m', 'n']],
};
const confusable = (a: string, b: string) => a === b || CONFUSABLE[lang()].some((g) => g.includes(a) && g.includes(b));

/** Number of answer options at a given level. */
export const optionCount = (level: number): number => [2, 3, 4][clampLevel(level)] as number;
/** Largest number to count. */
export const maxCount = (level: number): number => [3, 5, 8][clampLevel(level)] as number;

const clampLevel = (level: number) => Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));

function take<T>(rng: Rng, pool: readonly T[], n: number, avoid: readonly T[] = []): T[] {
  return rng.shuffle(pool.filter((x) => !avoid.includes(x))).slice(0, n);
}

/** `n` random items from the pool, none similar to `target` or to each other. */
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
  // At the highest level decoys come from the same category (more similar silhouettes).
  const same = pool.filter((i) => i.category === target.category);
  const decoys = distinct(rng, level >= MAX_LEVEL && same.length > n ? same : pool, n - 1, target);
  return { kind: 'shadows', target, options: rng.shuffle([target, ...decoys]) };
}

/** Categories whose items a child might consider as "belonging" together. */
const NEAR: [Category, Category][] = [
  ['nature', 'animals'],
  ['nature', 'fruit'],
  ['nature', 'vegetables'],
  ['toys', 'vehicles'],
  ['toys', 'animals'],
];
const FRUIT_VEG: Category[] = ['fruit', 'vegetables'];

export function oddQuestion(rng: Rng, level: number, recent: readonly string[] = []): OddQuestion {
  const n = Math.max(3, optionCount(level));
  const groups = new Map<string, Item[]>();
  for (const item of ITEMS) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  const big = [...groups.values()].filter((g) => g.length >= n - 1);
  const group = rng.pick(big);
  const cat = group[0]!.category;
  // The odd one out comes from a clearly different category: a butterfly among flowers or a toy car among toys would be debatable.
  // Fruit and vegetables are told apart only at the highest level.
  const near = (c: Category) => c === cat || NEAR.some(([a, b]) => (a === cat && b === c) || (b === cat && a === c)) || (level < MAX_LEVEL && FRUIT_VEG.includes(c) && FRUIT_VEG.includes(cat));
  const others = ITEMS.filter((i) => !near(i.category));
  const freshOdd = others.filter((i) => !recent.includes(i.id));
  const odd = rng.pick(freshOdd.length > 0 ? freshOdd : others);
  const members = take(rng, group.filter((i) => !lookalike(i, odd)), n - 1);
  return { kind: 'matching', odd, options: rng.shuffle([odd, ...members]) };
}

/** Characters from the Meadow background (the pink piglet next to the fox): we don't count them, since the child would count the one in the background too. */
const IN_BACKGROUND = new Set(['piglet', 'pig']);

export function countQuestion(rng: Rng, level: number, recent: readonly string[] = [], lastCount = 0): CountQuestion {
  const pool = ITEMS.filter((i) => i.countable && !IN_BACKGROUND.has(i.id));
  const fresh = pool.filter((i) => !recent.includes(i.id));
  const item = rng.pick(fresh.length > 0 ? fresh : pool);
  const max = maxCount(level);
  // "One" is too easy and came up very often: only sometimes, and never the same number twice in a row.
  const counts = Array.from({ length: max }, (_, i) => i + 1).filter((c) => c !== lastCount && (c > 1 || rng.chance(0.25)));
  const count = rng.pick(counts.length ? counts : [Math.min(2, max)]);
  // Decoys: numbers next to the correct one (a child's most common mistake is being off by 1).
  const near = [count - 1, count + 1, count - 2, count + 2, count + 3].filter((x) => x >= 1 && x <= Math.max(max, 4));
  const n = Math.max(3, optionCount(level));
  const options = [count, ...near.slice(0, n - 1)].sort((a, b) => a - b);
  return { kind: 'counting', item, count, options };
}

const freshPick = <T extends Item>(rng: Rng, pool: readonly T[], recent: readonly string[]): T => {
  const fresh = pool.filter((i) => !recent.includes(i.id));
  return rng.pick(fresh.length > 0 ? fresh : pool);
};

export function colorQuestion(rng: Rng, level: number, recent: readonly string[] = []): ColorQuestion {
  const colored = ITEMS.filter((i) => i.color);
  const target = freshPick(rng, colored, recent);
  const n = Math.max(3, optionCount(level));
  // Decoys: different colors, other than the answer (so exactly one is right and the picture is clear).
  const decoys: Item[] = [];
  const used = new Set<string>([target.color!]);
  for (const item of rng.shuffle(colored.filter((i) => i.color !== target.color))) {
    if (decoys.length >= n - 1) break;
    if (used.has(item.color!)) continue;
    used.add(item.color!);
    decoys.push(item);
  }
  return { kind: 'colors', color: target.color!, target, options: rng.shuffle([target, ...decoys]) };
}

export function soundQuestion(rng: Rng, level: number, recent: readonly string[] = []): SoundQuestion {
  const known = new Set<string>(soundsOf());
  const pool = ITEMS.filter((i) => known.has(startOf(i)));
  // First the letter (each equally often, excluding those from recent puzzles), then the picture. Picking just the
  // picture asked about "s" (13 pictures) many times more often than about "sz" or "n".
  const sounds = [...new Set(pool.map(startOf))];
  const recentSounds = new Set(recent.map((id) => ITEMS.find((i) => i.id === id)).filter((i): i is Item => !!i).map(startOf));
  const freshSounds = sounds.filter((s) => !recentSounds.has(s));
  const sound = rng.pick(freshSounds.length > 0 ? freshSounds : sounds);
  const target = freshPick(rng, pool.filter((i) => startOf(i) === sound), recent);
  const n = Math.max(3, optionCount(level));
  const decoys = take(
    rng,
    ITEMS.filter((i) => startOf(i) !== '' && !confusable(startOf(i), sound)),
    n - 1,
  );
  return { kind: 'phonemes', sound, target, options: rng.shuffle([target, ...decoys]) };
}

export function motherQuestion(rng: Rng, level: number, recent: readonly string[] = []): MotherQuestion {
  // Only babies whose mother is in the catalog (the catalog may be trimmed to the loaded art).
  const babies = ITEMS.filter((i) => i.mother && ITEMS.some((m) => m.id === i.mother));
  const baby = freshPick(rng, babies, recent);
  const target = ITEMS.find((i) => i.id === baby.mother)!;
  const mothers = new Set(babies.map((b) => b.mother));
  // Decoys: other adult animals (first other mothers from this game, then the remaining animals).
  const adults = ITEMS.filter((i) => i.category === 'animals' && !i.mother && !lookalike(i, target) && !lookalike(i, baby));
  const n = Math.max(3, optionCount(level));
  // Decoys that don't resemble each other (a sheep next to a goat would be confusing).
  const preferred = distinct(rng, adults.filter((a) => mothers.has(a.id)), n - 1, target);
  const rest = distinct(rng, adults.filter((a) => !preferred.some((p) => lookalike(p, a))), n - 1 - preferred.length, target);
  const decoys = [...preferred, ...rest];
  return { kind: 'mothers', baby, target, options: rng.shuffle([target, ...decoys]) };
}

export function makeQuestion(kind: PuzzleKind, rng: Rng, level: number, recent: readonly string[] = []): Question {
  switch (kind) {
    case 'shadows':
      return shadowQuestion(rng, level, recent);
    case 'matching':
      return oddQuestion(rng, level, recent);
    case 'counting':
      return countQuestion(rng, level, recent);
    case 'colors':
      return colorQuestion(rng, level, recent);
    case 'phonemes':
      return soundQuestion(rng, level, recent);
    case 'mothers':
      return motherQuestion(rng, level, recent);
  }
}

/** The item the question is about (the correct answer or the item to count). */
export const questionItem = (q: Question): Item => (q.kind === 'matching' ? q.odd : q.kind === 'counting' ? q.item : q.kind === 'mothers' ? q.baby : q.target);

/** Id of the item the question "uses up" (so it isn't repeated in the round). */
export const questionKey = (q: Question): string => questionItem(q).id;

/** The correct answer. */
export const answerOf = (q: Question): Item | number => (q.kind === 'counting' ? q.count : q.kind === 'matching' ? q.odd : q.target);

export const isCorrect = (q: Question, answer: Item | number): boolean => answer === answerOf(q);

/** Prompt recording (without extension), e.g. "color-red", "phoneme-sz", "mother-chick". */
export function promptLine(q: Question): string {
  if (q.kind === 'colors') return `color-${q.color}`;
  if (q.kind === 'phonemes') return `phoneme-${soundSlug(q.sound)}`;
  if (q.kind === 'mothers') return `mother-${q.baby.id}`;
  return q.kind;
}

/** A whole round: ROUND_LENGTH questions without repeating the key item. */
export function makeRound(kind: PuzzleKind, rng: Rng, level: number): Question[] {
  const out: Question[] = [];
  const recent: string[] = [];
  // Pictures already shown in this round: decoys shouldn't come back every question
  // (in Colors the same red strawberry was a decoy three times in a row).
  const shown = new Set<string>();
  const repeats = (q: Question) => (q.kind === 'counting' ? 0 : q.options.filter((o) => shown.has(o.id)).length);
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const prev = out[out.length - 1];
    const make = () => (kind === 'counting' ? countQuestion(rng, level, recent, prev?.kind === 'counting' ? prev.count : 0) : makeQuestion(kind, rng, level, recent));
    let q = make();
    for (let t = 0; t < 8 && repeats(q) > 0; t++) {
      const alt = make();
      if (repeats(alt) < repeats(q)) q = alt;
    }
    recent.push(questionKey(q));
    if (q.kind !== 'counting') for (const o of q.options) shown.add(o.id);
    out.push(q);
  }
  return out;
}

/** Whether a round can be built from the current catalog (e.g. there are baby animals and their mothers). */
export function playable(kind: PuzzleKind, rng: Rng): boolean {
  try {
    const round = makeRound(kind, rng, MAX_LEVEL);
    return round.every((q) => q.kind === 'counting' || q.options.length >= 3 || (q.kind === 'shadows' && q.options.length >= 2));
  } catch {
    return false;
  }
}

/**
 * Adaptive difficulty after a round: no mistakes, level up; 3+ mistakes, level down.
 * `mistakes` is the number of wrong taps in the whole round.
 */
export function nextLevel(level: number, mistakes: number): number {
  if (mistakes === 0) return clampLevel(level + 1);
  if (mistakes >= 3) return clampLevel(level - 1);
  return clampLevel(level);
}
