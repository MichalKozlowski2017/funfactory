/**
 * Full version: the Riddle Meadow (meadow) is free. The parent can start a trial (3 days with full access, sim/trial.ts):
 * on iOS as a free non-consumable product "3-day Trial" (App Store 3.1.1), on Android locally (Google Play has no free
 * in-app products). After that only the Riddle Meadow until the parent buys the full version (one-time purchase, no external services). The full report and the postcard in the parent
 * zone work the same way: during the trial and after purchase.
 *
 * Playtests: `?free` (or a build with `VITE_PREVIEW=free`) fakes the end of the trial without a purchase, `?full` fakes a bought full version.
 */
import { platformName } from '@funfactory/core';
import { buy, getProduct, owns, ownedSince, restore, type BuyResult } from '@funfactory/core/purchases';
import { today } from './log.ts';
import { dayKey } from './sim/journal.ts';
import { markPlayDay, realmOpen, startTrial as startTrialSave, trialState, type TrialSave, type TrialState } from './sim/trial.ts';
import type { RealmId } from './sim/realms.ts';
import { saveState, state } from './state.ts';

/** Product id in App Store Connect and Google Play Console (one-time, "non-consumable"). */
export const PRODUCT_ID = 'bystrzakowo.full';
/** Free trial product (iOS only, price 0, non-consumable, display name "3-day Trial"). */
export const TRIAL_ID = 'bystrzakowo.trial';

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// On the phone the preview is enabled by a build with VITE_PREVIEW=free|full (the real save stays untouched).
const PREVIEW_FREE = query.has('free') || import.meta.env.VITE_PREVIEW === 'free';
const PREVIEW_FULL = query.has('full') || import.meta.env.VITE_PREVIEW === 'full';

/** Trial save (in the `?free` preview: trial used up). */
function save(): TrialSave {
  if (PREVIEW_FULL) return { full: true };
  if (PREVIEW_FREE) return { trialStarted: true, trialStart: '2000-01-01', trialOver: true };
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

/** First task of the day: fixes the trial start day and remembers when the trial has ended (sim/trial.ts). */
export function countPlayDay(): void {
  if (PREVIEW_FREE || PREVIEW_FULL) return;
  if (markPlayDay(state.progress, today())) void saveState();
}

/** At startup: a purchase made on another device or restored (silently, no dialogs). */
export async function syncPurchase(): Promise<void> {
  if (state.progress.full) return;
  if (await owns(PRODUCT_ID)) {
    state.progress.full = true;
    await saveState();
  } else if (!trial().started && platformName() === 'ios' && (await owns(TRIAL_ID))) {
    // The trial product was claimed earlier (e.g. before reinstalling the app): the trial runs from that day.
    const since = await ownedSince(TRIAL_ID);
    startTrialSave(state.progress, since ? dayKey(new Date(since)) : today());
    await saveState();
  }
}

/** The parent starts the trial (call after the adult gate). iOS: through the free "3-day Trial" product. */
export async function startTrial(): Promise<BuyResult> {
  if (trial().started) return 'bought';
  // iOS: through the free product; when the store doesn't know it (not set up yet, e.g. a TestFlight build before
  // the product exists) the trial starts locally, as on Android.
  const viaStore = platformName() === 'ios' && (await getProduct(TRIAL_ID)) !== null;
  const r = viaStore ? await buy(TRIAL_ID) : 'bought';
  if (r === 'bought') {
    startTrialSave(state.progress, today());
    await saveState();
  }
  return r;
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

/** Purchase: 'pending' (Ask to Buy, cash payment) unlocks later, at the next start (syncPurchase). */
export const purchase = async (): Promise<BuyResult> => {
  const r = await buy(PRODUCT_ID);
  if (r === 'bought') await unlock(true);
  return r;
};
export const restorePurchase = async (): Promise<boolean> => unlock(await restore(PRODUCT_ID));
