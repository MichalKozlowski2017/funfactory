import { SaveStore } from '@funfactory/core';
import { newProgress, type Progress } from './sim/progress.ts';
import { migrateIds } from './sim/migrate.ts';

/** Game state shared by scenes (loaded in main.ts before the first scene). */
export const store = new SaveStore<Progress>('bystrzakowo-save', newProgress());

export const state = {
  progress: newProgress(),
  /** Lusia's greeting only once per launch. */
  greeted: false,
};

export async function loadState(): Promise<void> {
  const loaded = migrateIds(await store.load());
  // New fields in the save (e.g. new houses) are filled with defaults.
  state.progress = { ...newProgress(), ...loaded, levels: { ...newProgress().levels, ...loaded.levels } };
}

export const saveState = (): Promise<void> => store.save(state.progress);
