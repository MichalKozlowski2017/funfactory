import { SaveStore } from '@funfactory/core';
import { newProgress, type Progress } from './sim/progress.ts';
import { migrateIds } from './sim/migrate.ts';
import { struggles, useRotation } from './sim/rotation.ts';

/** Game state shared by scenes (loaded in main.ts before the first scene). */
export const store = new SaveStore<Progress>('bystrzakowo-save', newProgress());

export const state = {
  progress: newProgress(),
  /** Lusia's greeting only once per launch. */
  greeted: false,
};

export async function loadState(): Promise<void> {
  const saved = await store.load();
  const loaded = migrateIds(saved);
  // New fields in the save (e.g. new houses) are filled with defaults.
  state.progress = { ...newProgress(), ...loaded, levels: { ...newProgress().levels, ...loaded.levels } };
  // A migrated save is written back at once, so the old ids never come back.
  if (loaded !== saved) await saveState();
  // Round rotation remembers what the child saw (in the save) and what they struggle with (journal facts).
  useRotation(() => (state.progress.rotation ??= {}), (fact) => struggles(state.progress.journal?.facts[fact]));
}

export const saveState = (): Promise<void> => store.save(state.progress);
