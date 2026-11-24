/**
 * Full version: 3 play days with full access (sim/trial.ts), then only the Riddle Meadow (meadow) until the parent
 * buys the full version (one-time purchase, no external services). The full report and the postcard in the parent
 * zone work the same way: during the trial and after purchase.
 *
 * Playtests: `?free` (or a build with `VITE_PREVIEW=free`) fakes the end of the trial without a purchase, `?full` fakes a bought full version.
 */
import { buy, getProduct, owns, restore } from '@funfactory/core/purchases';
import { today } from './log.ts';
import { markPlayDay, realmOpen, trialState, TRIAL_DAYS, type TrialSave, type TrialState } from './sim/trial.ts';
import type { RealmId } from './sim/realms.ts';
import { saveState, state } from './state.ts';

/** Product id in App Store Connect and Google Play Console (one-time, "non-consumable"). */
export const PRODUCT_ID = 'bystrzakowo.full';

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// On the phone the preview is enabled by a build with VITE_PREVIEW=free|full (the real save stays untouched).
const PREVIEW_FREE = query.has('free') || import.meta.env.VITE_PREVIEW === 'free';
const PREVIEW_FULL = query.has('full') || import.meta.env.VITE_PREVIEW === 'full';

/** Trial save (in the `?free` preview: trial used up). */
function save(): TrialSave {
  if (PREVIEW_FULL) return { full: true };
  if (PREVIEW_FREE) return { trialDays: Array.from({ length: TRIAL_DAYS }, (_, i) => `2000-01-0${i + 1}`) };
  return state.progress;
}

export const trial = (): TrialState => trialState(save(), today());

/** Full access today (purchase or an ongoing trial). */
export const hasFull = (): boolean => {
  const t = trial();
  return t.full || t.active;
};

export const isBought = (): boolean => trial().full;

export const realmIsOpen = (realm: RealmId): boolean => realmOpen(save(), today(), realm);

/** The first task of the day uses up a trial day. */
export function countPlayDay(): void {
  if (PREVIEW_FREE || PREVIEW_FULL) return;
  const before = state.progress.trialDays?.length ?? 0;
  markPlayDay(state.progress, today());
  if ((state.progress.trialDays?.length ?? 0) !== before) void saveState();
}

/** At startup: a purchase made on another device or restored (silently, no dialogs). */
export async function syncPurchase(): Promise<void> {
  if (state.progress.full) return;
  if (await owns(PRODUCT_ID)) {
    state.progress.full = true;
    await saveState();
  }
}

let priceCache: Promise<string | null> | null = null;
/** Localized price from the store (e.g. "$4.99") or null (no store, e.g. in the browser). */
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
