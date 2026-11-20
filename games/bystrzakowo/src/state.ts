import { SaveStore } from '@funfactory/core';
import { newProgress, type Progress } from './sim/progress.ts';

/** Stan gry współdzielony przez sceny (wczytany w main.ts przed pierwszą sceną). */
export const store = new SaveStore<Progress>('bystrzakowo-save', newProgress());

export const state = {
  progress: newProgress(),
  /** Powitanie Lusi tylko raz na uruchomienie. */
  greeted: false,
};

export async function loadState(): Promise<void> {
  const loaded = await store.load();
  // Nowe pola w zapisie (np. nowe domki) uzupełniamy domyślnymi.
  state.progress = { ...newProgress(), ...loaded, levels: { ...newProgress().levels, ...loaded.levels } };
}

export const saveState = (): Promise<void> => store.save(state.progress);
