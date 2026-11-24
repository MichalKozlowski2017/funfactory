/**
 * Letter tracing (Lusia's Path): an uppercase letter made of strokes in writing order. The finger is guided
 * along each stroke from the green dot; progress moves forward when the finger is close to the trace ahead.
 * Coordinates in the letter box 0..1 (width × height).
 */
import type { Rng } from '@funfactory/core';
import { lang, type Lang } from './lang.ts';
import { ITEMS } from './catalog.ts';
import { LETTER_PIC_IDS } from './letter-pics.ts';
import { MAX_LEVEL } from './puzzles.ts';
import { LETTER_EXAMPLES } from './locales/letters.ts';
import { rotate } from './rotation.ts';

export { LETTER_EXAMPLES };

export const LETTER_ROUND = 3;

type P = [number, number];

/** Letter (digit) shape: strokes in writing order and the level from which it appears. */
export interface Glyph {
  ch: string;
  /** Strokes in writing order. */
  strokes: P[][];
  /** Level from which the letter appears (simple ones first). */
  level: number;
}

/** Letter in a round: shape and example ("A as in apple"): object (picture after drawing) and the narrator's word. */
export interface Letter extends Glyph {
  item: string;
  word: string;
}

/** Ellipse arc (center, semi-axes, angles in degrees; 0° = right, 90° = down). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 16): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P;
  });
}

const BASE: Glyph[] = [
  { ch: 'I', level: 0, strokes: [[[0.5, 0], [0.5, 1]]] },
  { ch: 'L', level: 0, strokes: [[[0.28, 0], [0.28, 1], [0.78, 1]]] },
  { ch: 'T', level: 0, strokes: [[[0.12, 0], [0.88, 0]], [[0.5, 0], [0.5, 1]]] },
  { ch: 'O', level: 0, strokes: [arc(0.5, 0.5, 0.38, 0.5, -90, -450, 28)] }, // from the top to the left, as taught in preschool (and like C, G)
  { ch: 'A', level: 1, strokes: [[[0.5, 0], [0.12, 1]], [[0.5, 0], [0.88, 1]], [[0.28, 0.62], [0.72, 0.62]]] },
  { ch: 'M', level: 1, strokes: [[[0.12, 1], [0.12, 0], [0.5, 0.6], [0.88, 0], [0.88, 1]]] },
  { ch: 'W', level: 1, strokes: [[[0.04, 0], [0.27, 1], [0.5, 0.35], [0.73, 1], [0.96, 0]]] },
  { ch: 'K', level: 1, strokes: [[[0.25, 0], [0.25, 1]], [[0.82, 0], [0.25, 0.56], [0.82, 1]]] },
  { ch: 'P', level: 2, strokes: [[[0.25, 1], [0.25, 0]], [[0.25, 0], ...arc(0.5, 0.25, 0.3, 0.25, -90, 90, 14).slice(0), [0.25, 0.5]]] },
  { ch: 'D', level: 2, strokes: [[[0.25, 0], [0.25, 1]], [[0.25, 0], ...arc(0.42, 0.5, 0.4, 0.5, -90, 90, 20), [0.25, 1]]] },
  { ch: 'B', level: 2, strokes: [[[0.25, 0], [0.25, 1]], [[0.25, 0], ...arc(0.47, 0.24, 0.26, 0.24, -90, 90, 12), ...arc(0.5, 0.74, 0.32, 0.26, -90, 90, 12), [0.25, 1]]] },
  { ch: 'S', level: 2, strokes: [[...arc(0.5, 0.25, 0.3, 0.25, -15, -270, 16), ...arc(0.5, 0.75, 0.3, 0.25, -90, 165, 16).slice(1)]] },
  { ch: 'E', level: 0, strokes: [[[0.78, 0], [0.25, 0], [0.25, 1], [0.78, 1]], [[0.25, 0.5], [0.7, 0.5]]] },
  { ch: 'F', level: 0, strokes: [[[0.78, 0], [0.25, 0], [0.25, 1]], [[0.25, 0.5], [0.7, 0.5]]] },
  { ch: 'H', level: 0, strokes: [[[0.22, 0], [0.22, 1]], [[0.78, 0], [0.78, 1]], [[0.22, 0.5], [0.78, 0.5]]] },
  { ch: 'N', level: 1, strokes: [[[0.2, 1], [0.2, 0], [0.8, 1], [0.8, 0]]] },
  { ch: 'Z', level: 1, strokes: [[[0.18, 0], [0.82, 0], [0.18, 1], [0.82, 1]]] },
  { ch: 'U', level: 1, strokes: [[[0.2, 0], [0.2, 0.62], ...arc(0.5, 0.62, 0.3, 0.38, 180, 0, 16), [0.8, 0]]] },
  { ch: 'C', level: 1, strokes: [arc(0.55, 0.5, 0.4, 0.5, -40, -320, 24)] },
  { ch: 'R', level: 2, strokes: [[[0.25, 1], [0.25, 0]], [[0.25, 0], ...arc(0.5, 0.25, 0.3, 0.25, -90, 90, 14), [0.25, 0.5]], [[0.45, 0.5], [0.82, 1]]] },
  { ch: 'G', level: 2, strokes: [[...arc(0.55, 0.5, 0.4, 0.5, -40, -360, 26), [0.6, 0.5]]] },
  { ch: 'J', level: 2, strokes: [[[0.7, 0], [0.7, 0.68], ...arc(0.45, 0.68, 0.25, 0.32, 0, 180, 14)]] },
  // Letters from the other languages' alphabets (and the Polish L with stroke).
  { ch: 'Ł', level: 1, strokes: [[[0.34, 0], [0.34, 1], [0.84, 1]], [[0.12, 0.62], [0.58, 0.36]]] },
  { ch: 'V', level: 0, strokes: [[[0.1, 0], [0.5, 1], [0.9, 0]]] },
  { ch: 'Y', level: 1, strokes: [[[0.12, 0], [0.5, 0.5]], [[0.88, 0], [0.5, 0.5], [0.5, 1]]] },
  { ch: 'Q', level: 2, strokes: [arc(0.5, 0.5, 0.38, 0.5, -90, -450, 28), [[0.58, 0.7], [0.92, 1]]] },
];

/** Letter with a mark above it: the base is squeezed into the lower part of the box, leaving room at the top for an accent or dots. */
const TOP = 0.26;
function accented(base: string): P[][] {
  const g = BASE.find((x) => x.ch === base)!;
  return g.strokes.map((st) => st.map(([x, y]) => [x, TOP + y * (1 - TOP)] as P));
}
/** Acute accent over a letter (Polish s-acute): from top right down to the left, as in a school notebook. */
const ACUTE: P[] = [[0.66, 0], [0.46, 0.16]];
/** Dot (Polish z-dot): a short stroke, touching it is enough. */
const dot = (x: number): P[] => [[x - 0.02, 0.08], [x + 0.02, 0.08]];
/** Tilde over Ñ. */
const TILDE: P[] = Array.from({ length: 13 }, (_, i) => [0.2 + (0.6 * i) / 12, 0.1 - Math.sin((i / 12) * Math.PI * 2) * 0.06] as P);

const ACCENTED: Glyph[] = [
  { ch: 'Ś', level: 2, strokes: [...accented('S'), ACUTE] },
  { ch: 'Ż', level: 2, strokes: [...accented('Z'), dot(0.5)] },
  { ch: 'Ñ', level: 2, strokes: [...accented('N'), TILDE] },
];

/** All letter shapes (alphabets of the four languages). */
export const LETTERS: readonly Glyph[] = [...BASE, ...ACCENTED];


/** A stroke as a dense sequence of points every `step` (in letter box units). */
export function resample(stroke: P[], step: number): P[] {
  const out: P[] = [stroke[0]!];
  for (let i = 1; i < stroke.length; i++) {
    const [ax, ay] = stroke[i - 1]!;
    const [bx, by] = stroke[i]!;
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/**
 * Progress along a stroke: from index `at` it moves to the farthest point within a window of `look` points ahead
 * that lies closer to the finger than `tol`. Finger far from the trace: progress stays put.
 */
export function advance(points: readonly P[], at: number, finger: P, tol: number, look = 8): number {
  let best = at;
  for (let j = at; j < Math.min(points.length, at + look + 1); j++) {
    const [x, y] = points[j]!;
    if (Math.hypot(x - finger[0], y - finger[1]) <= tol) best = j;
  }
  return best;
}


/** File name of the "X as in word" recording (ASCII only). */
export function letterLine(ch: string, item: string): string {
  const slug = ch.toLowerCase().replace('ć', 'ci').replace('ł', 'lw').replace('ó', 'oo').replace('ś', 'si').replace('ź', 'zi').replace('ż', 'zh').replace('ä', 'ae').replace('ö', 'oe').replace('ñ', 'ny');
  return `letter-${slug}-${item}`;
}

/** All letter recordings in language `l` (with letter and word, for the narrator list). */
export function letterLines(l: Lang = lang()): { line: string; ch: string; word: string }[] {
  return Object.entries(LETTER_EXAMPLES[l]).flatMap(([ch, xs]) => xs.map(([item, word]) => ({ line: letterLine(ch, item), ch, word })));
}

/** Alphabet letters in language `l` (with the first example). */
export function lettersOf(l: Lang = lang()): Letter[] {
  return Object.entries(LETTER_EXAMPLES[l]).flatMap(([ch, xs]) => {
    const g = LETTERS.find((x) => x.ch === ch);
    return g && xs.length ? [{ ...g, item: xs[0]![0], word: xs[0]![1] }] : [];
  });
}

/** Which example of a letter was shown last (the next round with this letter shows the following one). */
const shownExample = new Map<string, number>();

export function makeLetterRound(rng: Rng, level: number, have: ReadonlySet<string> = new Set([...ITEMS.map((i) => i.id), ...LETTER_PIC_IDS])): Letter[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const lg = lang();
  const pool = lettersOf(lg).filter((x) => x.level <= l && LETTER_EXAMPLES[lg][x.ch]!.some(([item]) => have.has(item)));
  return rotate(rng, pool, LETTER_ROUND, `letters:${lg}`, (x) => x.ch, (ch) => `letter:${ch}`).map((x) => {
    const xs = LETTER_EXAMPLES[lg][x.ch]!.filter(([item]) => have.has(item));
    const key = `${lg}:${x.ch}`;
    const i = ((shownExample.get(key) ?? rng.int(0, xs.length - 1)) + 1) % xs.length;
    shownExample.set(key, i);
    return { ...x, item: xs[i]![0], word: xs[i]![1] };
  });
}


/** Trace tolerance (fraction of letter height): younger children draw less precisely. */
export const traceTolerance = (level: number): number => [0.16, 0.13, 0.11][Math.max(0, Math.min(MAX_LEVEL, Math.round(level)))] as number;

/** Digit tracing: after drawing, as many pictures as the digit says (Lusia counts). */
export const DIGITS: readonly Letter[] = ([
  { ch: '1', level: 0, strokes: [[[0.28, 0.22], [0.6, 0], [0.6, 1]]] },
  { ch: '7', level: 0, strokes: [[[0.15, 0], [0.85, 0], [0.4, 1]]] },
  { ch: '4', level: 0, strokes: [[[0.6, 0], [0.12, 0.68], [0.9, 0.68]], [[0.65, 0.35], [0.65, 1]]] },
  { ch: '0', level: 0, strokes: [arc(0.5, 0.5, 0.34, 0.5, -90, -450, 28)] }, // from the top to the left
  { ch: '2', level: 1, strokes: [[...arc(0.5, 0.28, 0.32, 0.28, -170, 25, 14), [0.15, 1], [0.85, 1]]] },
  { ch: '3', level: 1, strokes: [[...arc(0.5, 0.25, 0.3, 0.25, -160, 90, 14), ...arc(0.5, 0.75, 0.32, 0.25, -90, 160, 14).slice(1)]] },
  { ch: '5', level: 1, strokes: [[[0.8, 0], [0.27, 0], [0.22, 0.45], ...arc(0.48, 0.68, 0.32, 0.32, -125, 150, 16)]] },
  { ch: '6', level: 2, strokes: [[[0.75, 0.04], [0.45, 0.1], [0.27, 0.32], [0.18, 0.65], ...arc(0.5, 0.72, 0.32, 0.28, 180, -180, 24)]] },
  { ch: '8', level: 2, strokes: [[...arc(0.5, 0.25, 0.27, 0.25, -90, -270, 14), ...arc(0.5, 0.75, 0.32, 0.25, -90, 270, 24).slice(1), ...arc(0.5, 0.25, 0.27, 0.25, 90, -90, 14).slice(1)]] },
  { ch: '9', level: 2, strokes: [[...arc(0.5, 0.3, 0.32, 0.3, 0, -360, 24), [0.8, 1]]] },
] as Glyph[]).map((g) => ({ ...g, item: '', word: '' }));

/** Digits for a round: new ones from the child's level mixed with review of lower ones. */
export function makeDigitRound(rng: Rng, level: number): Letter[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return rotate(rng, DIGITS.filter((x) => x.level <= l), LETTER_ROUND, 'digits', (x) => x.ch, (ch) => `digit:${ch}`);
}
