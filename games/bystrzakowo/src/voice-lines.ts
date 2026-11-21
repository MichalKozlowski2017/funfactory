/**
 * Lista nagrań lektora w każdym języku (czysty TS: używa jej gra i skrypt nagrań).
 * Pliki: public/audio/<głos>/<nazwa>.m4a (polski) albo public/audio/<język>/<głos>/<nazwa>.m4a.
 */
import { ITEMS, type Color } from './sim/catalog.ts';
import { EMOTIONS } from './sim/emotions.ts';
import type { Lang } from './sim/lang.ts';
import { lettersOf } from './sim/letters.ts';
import { MAZE_PAIRS } from './sim/maze.ts';
import { soundsOf, soundSlug } from './sim/puzzles.ts';
import { SHAPES } from './sim/shapes.ts';
import { SORT_LINES } from './sim/sorting.ts';
import { STORIES } from './sim/stories.ts';
import { wordsOf } from './sim/syllables.ts';

export type Guide = 'lusia' | 'bazyl';

export const COLORS_SPOKEN: readonly Color[] = ['czerwony', 'zolty', 'zielony', 'niebieski', 'pomaranczowy', 'rozowy', 'fioletowy', 'brazowy', 'bialy'];

const COMMON = ['brawo-1', 'brawo-2', 'brawo-3', 'brawo-4', 'brawo-5', 'oj-1', 'oj-2', 'nagroda', 'witaj', 'pomoc', ...ITEMS.map((i) => `item-${i.id}`)];
/** Nazwy nagrań każdego przewodnika w języku `l` (bez przedrostka głosu). */
export function voiceLines(l: Lang): Record<Guide, string[]> {
  return {
  lusia: [...COMMON, 'kraina-polana', 'kraina-spi', 'kraina-sciezka', 'kropki', 'memory', 'kraina-pracownia', 'dobranoc', 'melodia', 'sylaby', ...wordsOf(l).map((w) => `czytaj-${w.item}`), 'kolorowanka', 'kolorowanka-gotowe', 'naklejanka', 'litery', 'cyfry', 'liczba-0', ...lettersOf(l).map((x) => `litera-${x.ch.toLowerCase()}`), ...MAZE_PAIRS.map(([hero]) => `labirynt-${hero}`), 'cienie', 'liczenie', 'liczenie-dotyk', 'album', ...Array.from({ length: 10 }, (_, i) => `liczba-${i + 1}`), ...soundsOf(l).map((s) => `gloska-${soundSlug(s)}`)],
  bazyl: [...COMMON, 'krainy', 'historyjki', ...STORIES.map((x) => `historia-${x}`), ...EMOTIONS.flatMap((e) => [`emocje-${e}`, `minka-${e}`]), 'kraina-warsztat', 'wzory', 'ksztalty', ...SHAPES.map((x) => `ksztalt-${x}`), 'pasuje', 'ukladanka', 'przeciagnij', ...SORT_LINES, ...COLORS_SPOKEN.map((c) => `kolor-${c}`), ...ITEMS.filter((i) => i.mother).map((i) => `mama-${i.id}`)],
  };
}

