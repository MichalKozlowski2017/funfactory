/**
 * Krainy Bystrzakowa: każda to inny rodzaj zabawy (zob. docs/bystrzakowo.md, „Krainy”).
 * Czysty TS: lista krain i zabaw, bez grafiki.
 */
import { PUZZLE_KINDS, type PuzzleKind } from './puzzles.ts';

/** Zabawy Warsztatu (przeciągnij i ułóż). */
export type WorkshopKind = 'sorting' | 'jigsaw' | 'patterns' | 'shapes' | 'syllables' | 'stories';
export const WORKSHOP_KINDS: readonly WorkshopKind[] = ['sorting', 'jigsaw', 'patterns', 'shapes', 'syllables', 'stories'];

/** Zabawy Polany poza zagadkami z wyborem (pamięć). */
export type MeadowKind = 'memory' | 'emotions';

/** Zabawy Ścieżki Lusi (prowadź palcem). */
export type PathKind = 'dots' | 'maze' | 'letters' | 'digits';
export const PATH_KINDS: readonly PathKind[] = ['dots', 'maze', 'letters', 'digits'];

/** Zabawy Pracowni Malucha (twórz, bez złych odpowiedzi). */
export type StudioKind = 'coloring' | 'stickers' | 'melody';
export const STUDIO_KINDS: readonly StudioKind[] = ['coloring', 'stickers', 'melody'];

/** Każda zabawa w grze (klucz poziomu trudności w zapisie). */
export type Activity = PuzzleKind | MeadowKind | WorkshopKind | PathKind | StudioKind;
export const ACTIVITIES: readonly Activity[] = [...PUZZLE_KINDS, 'memory', 'emotions', ...WORKSHOP_KINDS, ...PATH_KINDS, ...STUDIO_KINDS];

export type RealmId = 'meadow' | 'workshop' | 'path' | 'studio';

export interface Realm {
  id: RealmId;
  /** Nazwa na ekranie. */
  name: string;
  /** Przewodnik, który wita w krainie. */
  guide: 'lusia' | 'bazyl';
  /** Zabawy: dla polany dwa rzędy (tylny, przedni), dla pozostałych jeden. */
  rows: Activity[][];
}

export const REALMS: readonly Realm[] = [
  { id: 'meadow', name: 'puzzleMeadow', guide: 'lusia', rows: [['colors', 'phonemes', 'mothers', 'memory'], ['shadows', 'matching', 'counting', 'emotions']] },
  { id: 'workshop', name: 'basilsWorkshop', guide: 'bazyl', rows: [['patterns', 'shapes', 'syllables'], ['sorting', 'jigsaw', 'stories']] },
  { id: 'path', name: 'lusiasPath', guide: 'lusia', rows: [['letters', 'digits'], ['dots', 'maze']] },
  { id: 'studio', name: 'littleStudio', guide: 'lusia', rows: [['coloring', 'stickers', 'melody']] },
];

export const isPuzzle = (a: Activity): a is PuzzleKind => (PUZZLE_KINDS as readonly string[]).includes(a);

/** Kraina, w której jest zabawa. */
export const realmOf = (a: Activity): Realm => REALMS.find((r) => r.rows.some((row) => row.includes(a)))!;

/** Podpisy zabaw na kafelkach krain (krótkie, żeby mieściły się w jednej linii). */
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
