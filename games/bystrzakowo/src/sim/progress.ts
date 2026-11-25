import type { Rng } from '@funfactory/core';
import { ITEMS } from './catalog.ts';
import { ACTIVITIES, type Activity } from './realms.ts';
import type { Journal } from './journal.ts';
import type { Lang } from './lang.ts';
import type { Picture } from './stickers.ts';
import type { Rotation } from './rotation.ts';
import { IDS_VERSION } from './migrate.ts';

/** The child's saved progress. */
export interface Progress {
  /** Difficulty level of each activity (0..MAX_LEVEL). */
  levels: Record<Activity, number>;
  /** Collected stickers (catalog item ids), in the order earned. */
  stickers: string[];
  rounds: number;
  /** Last viewed realm (returning from an activity goes back to the same realm). */
  realm: number;
  /** Stories the child has already seen in the current "bag" (sim/stories.ts). */
  storiesSeen?: string[];
  /** Colored coloring-book pages (newest first). */
  colored?: string[];
  /** Old save: a single sticker picture (migrated to `pictures`). */
  scene?: { id: string; x: number; y: number; flip: boolean }[];
  /** Gallery of sticker pictures (sim/stickers.ts) and the index of the current one. */
  pictures?: Picture[];
  picture?: number;
  /** Progress journal for the parent (sim/journal.ts). */
  journal?: Journal;
  /** Child's age given during onboarding (sim/onboarding.ts); sets the starting level of activities. */
  age?: number;
  /** The parent completed onboarding (or skipped it). */
  onboarded?: boolean;
  /** Activities where the hand has already demonstrated the gesture. */
  hands?: string[];
  /** Child's name (optional, stored only on the device). */
  childName?: string;
  /** Parent's last visit to the parent zone (day), for the "something new" dot. */
  parentSeen?: string;
  /** Language chosen by the parent (missing: phone language). */
  lang?: Lang;
  /** Full version purchased. */
  full?: boolean;
  /** The parent started the full-version trial (sim/trial.ts). */
  trialStarted?: boolean;
  /** Play days during the full-version trial (sim/trial.ts). */
  trialDays?: string[];
  /** Settings from the parent zone. */
  music: boolean;
  /** Play time limit in minutes (0 = no limit). */
  limit?: number;
  /** Rotation memory of letters, digits and syllable words (sim/rotation.ts). */
  rotation?: Record<string, Rotation>;
  /** Id format version (sim/migrate.ts); missing = old Polish ids. */
  ids?: number;
}

export const newProgress = (): Progress => ({
  levels: Object.fromEntries(ACTIVITIES.map((k) => [k, 0])) as Record<Activity, number>,
  stickers: [],
  rounds: 0,
  realm: 0,
  music: true,
});

/** Sticker for a round: first the ones the child doesn't have yet. */
export function pickSticker(rng: Rng, owned: readonly string[]): string {
  const missing = ITEMS.filter((i) => !owned.includes(i.id));
  return rng.pick(missing.length > 0 ? missing : ITEMS).id;
}
