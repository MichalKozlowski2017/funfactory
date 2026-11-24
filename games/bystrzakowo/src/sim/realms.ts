/**
 * Realms of Bystrzakowo: each one is a different kind of activity (see docs/bystrzakowo.md, the realms section).
 * Pure TS: list of realms and activities, no graphics.
 */
import { PUZZLE_KINDS, type PuzzleKind } from './puzzles.ts';

/** Workshop activities (drag and place). */
export type WorkshopKind = 'sorting' | 'jigsaw' | 'patterns' | 'shapes' | 'syllables' | 'stories';
export const WORKSHOP_KINDS: readonly WorkshopKind[] = ['sorting', 'jigsaw', 'patterns', 'shapes', 'syllables', 'stories'];

/** Meadow activities other than multiple-choice puzzles (memory). */
export type MeadowKind = 'memory' | 'emotions';

/** Lusia's Path activities (trace with a finger). */
export type PathKind = 'dots' | 'maze' | 'letters' | 'digits';
export const PATH_KINDS: readonly PathKind[] = ['dots', 'maze', 'letters', 'digits'];

/** Little Studio activities (create, no wrong answers). */
export type StudioKind = 'coloring' | 'stickers' | 'melody';
export const STUDIO_KINDS: readonly StudioKind[] = ['coloring', 'stickers', 'melody'];

/** Every activity in the game (key of the difficulty level in the save). */
export type Activity = PuzzleKind | MeadowKind | WorkshopKind | PathKind | StudioKind;
export const ACTIVITIES: readonly Activity[] = [...PUZZLE_KINDS, 'memory', 'emotions', ...WORKSHOP_KINDS, ...PATH_KINDS, ...STUDIO_KINDS];

export type RealmId = 'meadow' | 'workshop' | 'path' | 'studio';

export interface Realm {
  id: RealmId;
  /** Name on screen. */
  name: string;
  /** Guide who welcomes the child in the realm. */
  guide: 'lusia' | 'bazyl';
  /** Activities: two rows for the meadow (back, front), one for the others. */
  rows: Activity[][];
}

export const REALMS: readonly Realm[] = [
  { id: 'meadow', name: 'puzzleMeadow', guide: 'lusia', rows: [['colors', 'phonemes', 'mothers', 'memory'], ['shadows', 'matching', 'counting', 'emotions']] },
  { id: 'workshop', name: 'basilsWorkshop', guide: 'bazyl', rows: [['patterns', 'shapes', 'syllables'], ['sorting', 'jigsaw', 'stories']] },
  { id: 'path', name: 'lusiasPath', guide: 'lusia', rows: [['letters', 'digits'], ['dots', 'maze']] },
  { id: 'studio', name: 'littleStudio', guide: 'lusia', rows: [['coloring', 'stickers', 'melody']] },
];

export const isPuzzle = (a: Activity): a is PuzzleKind => (PUZZLE_KINDS as readonly string[]).includes(a);

/** Realm containing the activity. */
export const realmOf = (a: Activity): Realm => REALMS.find((r) => r.rows.some((row) => row.includes(a)))!;

/** Activity labels on the realm tiles (short, so they fit on one line). */
export const ACTIVITY_NAMES: Record<Activity, string> = {
  colors: 'colors',
  phonemes: 'firstLetter',
  mothers: 'mommies',
  memory: 'pairs',
  shadows: 'shadows',
  matching: 'oddOneOut',
  counting: 'counting',
  emotions: 'faces',
  patterns: 'whatsNext',
  shapes: 'shapes',
  syllables: 'syllables',
  sorting: 'sorting',
  jigsaw: 'puzzle',
  stories: 'stories',
  letters: 'letters',
  digits: 'numbers',
  dots: 'dots',
  maze: 'maze',
  coloring: 'coloring',
  stickers: 'stickers',
  melody: 'melody',
};
