/**
 * List of narrator recordings in every language (pure TS: used by the game and the recording script).
 * Files: public/audio/<voice>/<name>.m4a (Polish) or public/audio/<lang>/<voice>/<name>.m4a.
 */
import { ITEMS, type Color } from './sim/catalog.ts';
import { EMOTIONS } from './sim/emotions.ts';
import type { Lang } from './sim/lang.ts';
import { letterLines } from './sim/letters.ts';
import { MAZE_PAIRS } from './sim/maze.ts';
import { soundsOf, soundSlug } from './sim/puzzles.ts';
import { SHAPES } from './sim/shapes.ts';
import { SORT_LINES } from './sim/sorting.ts';
import { STORIES } from './sim/stories.ts';
import { wordsOf } from './sim/syllables.ts';

export type Guide = 'lusia' | 'bazyl';

export const COLORS_SPOKEN: readonly Color[] = ['red', 'yellow', 'green', 'blue', 'orange', 'pink', 'purple', 'brown', 'white'];

const COMMON = ['bravo-1', 'bravo-2', 'bravo-3', 'bravo-4', 'bravo-5', 'oops-1', 'oops-2', 'reward', 'hello', 'help', ...ITEMS.map((i) => `item-${i.id}`)];
/** Recording names of each guide in language `l` (without the voice prefix). */
export function voiceLines(l: Lang): Record<Guide, string[]> {
  return {
  lusia: [...COMMON, 'realm-meadow', 'realm-asleep', 'realm-path', 'dots', 'memory', 'realm-studio', 'good-night', 'melody', 'syllables', ...wordsOf(l).map((w) => `read-${w.item}`), 'coloring', 'coloring-done', 'stickers', 'letters', 'digits', 'number-0', ...letterLines(l).map((x) => x.line), ...MAZE_PAIRS.map(([hero]) => `maze-${hero}`), 'shadows', 'counting', 'counting-touch', 'album', ...Array.from({ length: 10 }, (_, i) => `number-${i + 1}`), ...soundsOf(l).map((s) => `phoneme-${soundSlug(s)}`)],
  bazyl: [...COMMON, 'realms', 'stories', ...STORIES.map((x) => `history-${x}`), ...EMOTIONS.flatMap((e) => [`emotions-${e}`, `face-${e}`]), 'realm-workshop', 'patterns', 'shapes', ...SHAPES.map((x) => `shape-${x}`), 'matching', 'jigsaw', 'drag', ...SORT_LINES, ...COLORS_SPOKEN.map((c) => `color-${c}`), ...ITEMS.filter((i) => i.mother).map((i) => `mother-${i.id}`)],
  };
}

