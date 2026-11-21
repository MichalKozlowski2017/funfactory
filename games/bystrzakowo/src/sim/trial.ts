/**
 * Próba pełnej wersji: przez 5 dni zabawy (nie kalendarzowych) otwarte są wszystkie krainy, potem
 * zostaje tylko Polana Zagadek, aż rodzic kupi pełną wersję. Dzień liczy się, gdy dziecko rozwiąże
 * pierwsze zadanie; aplikacja leżąca odłogiem nie zużywa próby, a przestawienie zegara nic nie daje
 * (liczą się różne dni, w które była zabawa).
 */
import type { RealmId } from './realms.ts';

export const TRIAL_DAYS = 5;
/** Kraina zawsze darmowa. */
export const FREE_REALM: RealmId = 'polana';

export interface TrialSave {
  /** Dni zabawy w czasie próby (różne, najwyżej TRIAL_DAYS). */
  trialDays?: string[];
  /** Kupiona pełna wersja. */
  full?: boolean;
}

export interface TrialState {
  /** Pełna wersja kupiona. */
  full: boolean;
  /** Próba trwa (dziś wszystko otwarte). */
  active: boolean;
  /** Ile dni zabawy z pełnym dostępem zostało po dzisiejszym (0 = dziś ostatni). */
  left: number;
  /** Ile dni próby już wykorzystano (z dzisiejszym, jeśli dziś była zabawa). */
  used: number;
}

export function trialState(save: TrialSave, today: string): TrialState {
  const days = save.trialDays ?? [];
  const playedToday = days.includes(today);
  const used = days.length;
  // Dziś otwarte: dzisiejszy dzień jest już w próbie albo jest jeszcze miejsce na nowy.
  const active = playedToday || used < TRIAL_DAYS;
  const left = Math.max(0, TRIAL_DAYS - used - (playedToday ? 0 : 1));
  return { full: !!save.full, active, left, used };
}

/** Pierwsze zadanie dnia: dzień zabawy liczy się do próby (jeśli próba jeszcze trwa). */
export function markPlayDay(save: TrialSave, today: string): void {
  if (save.full) return;
  const days = (save.trialDays ??= []);
  if (days.includes(today) || days.length >= TRIAL_DAYS) return;
  days.push(today);
}

/** Czy kraina jest dziś otwarta. */
export function realmOpen(save: TrialSave, today: string, realm: RealmId): boolean {
  if (realm === FREE_REALM || save.full) return true;
  return trialState(save, today).active;
}
