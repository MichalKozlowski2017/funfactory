/**
 * Pełna wersja: 5 dni zabawy z pełnym dostępem (sim/trial.ts), potem tylko Polana Zagadek, aż rodzic
 * kupi pełną wersję (jednorazowy zakup, bez zewnętrznych serwisów). Pełny raport i pocztówka w strefie
 * rodzica działają tak samo: w próbie i po zakupie.
 *
 * Playtesty: `?free` udaje koniec próby bez zakupu, `?full` udaje kupioną pełną wersję.
 */
import { buy, getProduct, owns, restore } from '@funfactory/core/purchases';
import { today } from './log.ts';
import { markPlayDay, realmOpen, trialState, TRIAL_DAYS, type TrialSave, type TrialState } from './sim/trial.ts';
import type { RealmId } from './sim/realms.ts';
import { saveState, state } from './state.ts';

/** Identyfikator produktu w App Store Connect i Google Play Console (jednorazowy, „non-consumable”). */
export const PRODUCT_ID = 'bystrzakowo.full';

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const PREVIEW_FREE = query.has('free');
const PREVIEW_FULL = query.has('full');

/** Zapis próby (w podglądzie `?free`: próba wykorzystana). */
function save(): TrialSave {
  if (PREVIEW_FULL) return { full: true };
  if (PREVIEW_FREE) return { trialDays: Array.from({ length: TRIAL_DAYS }, (_, i) => `2000-01-0${i + 1}`) };
  return state.progress;
}

export const trial = (): TrialState => trialState(save(), today());

/** Pełny dostęp dziś (zakup albo trwająca próba). */
export const hasFull = (): boolean => {
  const t = trial();
  return t.full || t.active;
};

export const isBought = (): boolean => trial().full;

export const realmIsOpen = (realm: RealmId): boolean => realmOpen(save(), today(), realm);

/** Pierwsze zadanie dnia zużywa dzień próby. */
export function countPlayDay(): void {
  if (PREVIEW_FREE || PREVIEW_FULL) return;
  const before = state.progress.trialDays?.length ?? 0;
  markPlayDay(state.progress, today());
  if ((state.progress.trialDays?.length ?? 0) !== before) void saveState();
}

/** Przy starcie: zakup zrobiony na innym urządzeniu albo przywrócony (po cichu, bez okienek). */
export async function syncPurchase(): Promise<void> {
  if (state.progress.full) return;
  if (await owns(PRODUCT_ID)) {
    state.progress.full = true;
    await saveState();
  }
}

let priceCache: Promise<string | null> | null = null;
/** Cena ze sklepu („24,99 zł”) albo null (brak sklepu, np. w przeglądarce). */
export const price = (): Promise<string | null> => (priceCache ??= getProduct(PRODUCT_ID).then((p) => p?.price ?? null));

async function unlock(ok: boolean): Promise<boolean> {
  if (ok) {
    state.progress.full = true;
    await saveState();
  }
  return ok;
}

export const purchase = async (): Promise<boolean> => unlock(await buy(PRODUCT_ID));
export const restorePurchase = async (): Promise<boolean> => unlock(await restore(PRODUCT_ID));
