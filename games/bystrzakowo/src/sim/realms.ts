/**
 * Krainy Bystrzakowa: każda to inny rodzaj zabawy (zob. docs/bystrzakowo.md, „Krainy”).
 * Czysty TS: lista krain i zabaw, bez grafiki.
 */
import { PUZZLE_KINDS, type PuzzleKind } from './puzzles.ts';

/** Zabawy Warsztatu (przeciągnij i ułóż). */
export type WorkshopKind = 'sortowanie' | 'ukladanka';
export const WORKSHOP_KINDS: readonly WorkshopKind[] = ['sortowanie', 'ukladanka'];

/** Każda zabawa w grze (klucz poziomu trudności w zapisie). */
export type Activity = PuzzleKind | WorkshopKind;
export const ACTIVITIES: readonly Activity[] = [...PUZZLE_KINDS, ...WORKSHOP_KINDS];

export type RealmId = 'polana' | 'warsztat';

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
  { id: 'polana', name: 'Polana Zagadek', guide: 'lusia', rows: [['kolory', 'gloski', 'mamy'], ['cienie', 'pasuje', 'liczenie']] },
  { id: 'warsztat', name: 'Warsztat Bazyla', guide: 'bazyl', rows: [['sortowanie', 'ukladanka']] },
];

export const isPuzzle = (a: Activity): a is PuzzleKind => (PUZZLE_KINDS as readonly string[]).includes(a);

/** Kraina, w której jest zabawa. */
export const realmOf = (a: Activity): Realm => REALMS.find((r) => r.rows.some((row) => row.includes(a)))!;
