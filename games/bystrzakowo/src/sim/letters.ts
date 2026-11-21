/**
 * Litery po śladzie (Ścieżka Lusi): wielka litera z kresek w kolejności pisania. Palec prowadzi się
 * po każdej kresce od zielonej kropki; postęp idzie naprzód, gdy palec jest blisko śladu przed nim.
 * Współrzędne w polu litery 0..1 (szerokość × wysokość).
 */
import type { Rng } from '@funfactory/core';
import { lang, type Lang } from './lang.ts';
import { ITEMS } from './catalog.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const LETTER_ROUND = 3;

type P = [number, number];

export interface Letter {
  ch: string;
  /** Obiekt z katalogu na tę literę (pokazywany po narysowaniu). */
  item: string;
  /** Kreski w kolejności pisania. */
  strokes: P[][];
  /** Poziom, od którego litera się pojawia (proste najpierw). */
  level: number;
}

/** Łuk elipsy (środek, półosie, kąty w stopniach; 0° = prawo, 90° = dół). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 16): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P;
  });
}

export const LETTERS: readonly Letter[] = [
  { ch: 'I', item: 'indyk', level: 0, strokes: [[[0.5, 0], [0.5, 1]]] },
  { ch: 'L', item: 'lew', level: 0, strokes: [[[0.28, 0], [0.28, 1], [0.78, 1]]] },
  { ch: 'T', item: 'traktor', level: 0, strokes: [[[0.12, 0], [0.88, 0]], [[0.5, 0], [0.5, 1]]] },
  { ch: 'O', item: 'owca', level: 0, strokes: [arc(0.5, 0.5, 0.38, 0.5, -90, 270, 28)] },
  { ch: 'A', item: 'auto', level: 1, strokes: [[[0.5, 0], [0.12, 1]], [[0.5, 0], [0.88, 1]], [[0.28, 0.62], [0.72, 0.62]]] },
  { ch: 'M', item: 'motyl', level: 1, strokes: [[[0.12, 1], [0.12, 0], [0.5, 0.6], [0.88, 0], [0.88, 1]]] },
  { ch: 'W', item: 'wieloryb', level: 1, strokes: [[[0.04, 0], [0.27, 1], [0.5, 0.35], [0.73, 1], [0.96, 0]]] },
  { ch: 'K', item: 'kot', level: 1, strokes: [[[0.25, 0], [0.25, 1]], [[0.82, 0], [0.25, 0.56], [0.82, 1]]] },
  { ch: 'P', item: 'pies', level: 2, strokes: [[[0.25, 1], [0.25, 0]], [[0.25, 0], ...arc(0.5, 0.25, 0.3, 0.25, -90, 90, 14).slice(0), [0.25, 0.5]]] },
  { ch: 'D', item: 'dinozaur', level: 2, strokes: [[[0.25, 0], [0.25, 1]], [[0.25, 0], ...arc(0.42, 0.5, 0.4, 0.5, -90, 90, 20), [0.25, 1]]] },
  { ch: 'B', item: 'banan', level: 2, strokes: [[[0.25, 0], [0.25, 1]], [[0.25, 0], ...arc(0.47, 0.24, 0.26, 0.24, -90, 90, 12), ...arc(0.5, 0.74, 0.32, 0.26, -90, 90, 12), [0.25, 1]]] },
  { ch: 'S', item: 'slon', level: 2, strokes: [[...arc(0.5, 0.25, 0.3, 0.25, -15, -270, 16), ...arc(0.5, 0.75, 0.3, 0.25, -90, 165, 16).slice(1)]] },
];

/** Kreska jako gęsty ciąg punktów co `step` (w jednostkach pola litery). */
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
 * Postęp po kresce: z indeksu `at` przesuwa się do najdalszego punktu w oknie `look` punktów naprzód,
 * który leży bliżej palca niż `tol`. Palec daleko od śladu: postęp stoi.
 */
export function advance(points: readonly P[], at: number, finger: P, tol: number, look = 8): number {
  let best = at;
  for (let j = at; j < Math.min(points.length, at + look + 1); j++) {
    const [x, y] = points[j]!;
    if (Math.hypot(x - finger[0], y - finger[1]) <= tol) best = j;
  }
  return best;
}

/** Litery do rundy: z poziomu dziecka i niższych, z obrazkiem w katalogu, bez powtórzeń. */
/**
 * Obiekt do litery w każdym języku („A jak autko”, „A is for apple”, „A wie Affe”). Pusty: litera nie
 * pojawia się w tym języku (po angielsku nie ma w katalogu nic na „I”).
 */
const LETTER_ITEMS: Record<Exclude<Lang, 'pl'>, Record<string, string>> = {
  en: { A: 'jablko', B: 'pilka', D: 'pies', I: '', K: 'latawiec', L: 'lew', M: 'malpa', O: 'sowa', P: 'swinka', S: 'slonce', T: 'traktor', W: 'wieloryb' },
  de: { A: 'malpa', B: 'pilka', D: 'dinozaur', I: 'jez', K: 'kot', L: 'lew', M: 'mysz', O: 'pomarancza', P: 'pingwin', S: 'slonce', T: 'traktor', W: 'wieloryb' },
};

/** Litery w języku `l` z obiektem z tego języka (bez liter, do których nie ma obiektu). */
export function lettersOf(l: Lang = lang()): Letter[] {
  if (l === 'pl') return [...LETTERS];
  return LETTERS.map((x) => ({ ...x, item: LETTER_ITEMS[l][x.ch] ?? '' })).filter((x) => x.item);
}

export function makeLetterRound(rng: Rng, level: number): Letter[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const have = new Set(ITEMS.map((i) => i.id));
  const ok = lettersOf().filter((x) => x.level <= l && have.has(x.item));
  // Najpierw litery z bieżącego poziomu (nowe), potem powtórka.
  const fresh = rng.shuffle(ok.filter((x) => x.level === l));
  const old = rng.shuffle(ok.filter((x) => x.level < l));
  return [...fresh, ...old].slice(0, LETTER_ROUND);
}

/** Tolerancja śladu (ułamek wysokości litery): młodsze dzieci rysują mniej dokładnie. */
export const traceTolerance = (level: number): number => [0.16, 0.13, 0.11][Math.max(0, Math.min(MAX_LEVEL, Math.round(level)))] as number;

/** Cyfry po śladzie: po narysowaniu tyle obrazków, ile mówi cyfra (Lusia liczy). */
export const DIGITS: readonly Letter[] = [
  { ch: '1', item: '', level: 0, strokes: [[[0.28, 0.22], [0.6, 0], [0.6, 1]]] },
  { ch: '7', item: '', level: 0, strokes: [[[0.15, 0], [0.85, 0], [0.4, 1]]] },
  { ch: '4', item: '', level: 0, strokes: [[[0.6, 0], [0.12, 0.68], [0.9, 0.68]], [[0.65, 0.35], [0.65, 1]]] },
  { ch: '0', item: '', level: 1, strokes: [arc(0.5, 0.5, 0.34, 0.5, -90, 270, 28)] },
  { ch: '2', item: '', level: 1, strokes: [[...arc(0.5, 0.28, 0.32, 0.28, -170, 25, 14), [0.15, 1], [0.85, 1]]] },
  { ch: '3', item: '', level: 1, strokes: [[...arc(0.5, 0.25, 0.3, 0.25, -160, 90, 14), ...arc(0.5, 0.75, 0.32, 0.25, -90, 160, 14).slice(1)]] },
  { ch: '5', item: '', level: 1, strokes: [[[0.8, 0], [0.27, 0], [0.22, 0.45], ...arc(0.48, 0.68, 0.32, 0.32, -125, 150, 16)]] },
  { ch: '6', item: '', level: 2, strokes: [[[0.75, 0.04], [0.45, 0.1], [0.27, 0.32], [0.18, 0.65], ...arc(0.5, 0.72, 0.32, 0.28, 180, -180, 24)]] },
  { ch: '8', item: '', level: 2, strokes: [[...arc(0.5, 0.25, 0.27, 0.25, -90, -270, 14), ...arc(0.5, 0.75, 0.32, 0.25, -90, 270, 24).slice(1), ...arc(0.5, 0.25, 0.27, 0.25, 90, -90, 14).slice(1)]] },
  { ch: '9', item: '', level: 2, strokes: [[...arc(0.5, 0.3, 0.32, 0.3, 0, -360, 24), [0.8, 1]]] },
];

/** Cyfry do rundy: z poziomu dziecka (nowe najpierw) i niższych. */
export function makeDigitRound(rng: Rng, level: number): Letter[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const ok = DIGITS.filter((x) => x.level <= l);
  return [...rng.shuffle(ok.filter((x) => x.level === l)), ...rng.shuffle(ok.filter((x) => x.level < l))].slice(0, LETTER_ROUND);
}
