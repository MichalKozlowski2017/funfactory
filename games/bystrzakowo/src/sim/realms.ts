/**
 * Krainy Bystrzakowa: każda to inny rodzaj zabawy (zob. docs/bystrzakowo.md, „Krainy”).
 * Czysty TS: lista krain i zabaw, bez grafiki.
 */
import { PUZZLE_KINDS, type PuzzleKind } from './puzzles.ts';

/** Zabawy Warsztatu (przeciągnij i ułóż). */
export type WorkshopKind = 'sortowanie' | 'ukladanka' | 'wzory' | 'ksztalty';
export const WORKSHOP_KINDS: readonly WorkshopKind[] = ['sortowanie', 'ukladanka', 'wzory', 'ksztalty'];

/** Zabawy Polany poza zagadkami z wyborem (pamięć). */
export type MeadowKind = 'memory';

/** Zabawy Ścieżki Lusi (prowadź palcem). */
export type PathKind = 'kropki' | 'labirynt' | 'litery' | 'cyfry';
export const PATH_KINDS: readonly PathKind[] = ['kropki', 'labirynt', 'litery', 'cyfry'];

/** Zabawy Pracowni Malucha (twórz, bez złych odpowiedzi). */
export type StudioKind = 'kolorowanka' | 'naklejanka';
export const STUDIO_KINDS: readonly StudioKind[] = ['kolorowanka', 'naklejanka'];

/** Każda zabawa w grze (klucz poziomu trudności w zapisie). */
export type Activity = PuzzleKind | MeadowKind | WorkshopKind | PathKind | StudioKind;
export const ACTIVITIES: readonly Activity[] = [...PUZZLE_KINDS, 'memory', ...WORKSHOP_KINDS, ...PATH_KINDS, ...STUDIO_KINDS];

export type RealmId = 'polana' | 'warsztat' | 'sciezka' | 'pracownia';

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
  { id: 'polana', name: 'Polana Zagadek', guide: 'lusia', rows: [['kolory', 'gloski', 'mamy', 'memory'], ['cienie', 'pasuje', 'liczenie']] },
  { id: 'warsztat', name: 'Warsztat Bazyla', guide: 'bazyl', rows: [['wzory', 'ksztalty'], ['sortowanie', 'ukladanka']] },
  { id: 'sciezka', name: 'Ścieżka Lusi', guide: 'lusia', rows: [['litery', 'cyfry'], ['kropki', 'labirynt']] },
  { id: 'pracownia', name: 'Pracownia Malucha', guide: 'lusia', rows: [['kolorowanka', 'naklejanka']] },
];

export const isPuzzle = (a: Activity): a is PuzzleKind => (PUZZLE_KINDS as readonly string[]).includes(a);

/** Kraina, w której jest zabawa. */
export const realmOf = (a: Activity): Realm => REALMS.find((r) => r.rows.some((row) => row.includes(a)))!;
