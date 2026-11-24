/**
 * Jednorazowy zakup w aplikacji (pełna wersja): App Store (StoreKit 2) i Google Play Billing przez
 * `@capgo/native-purchases`, bez zewnętrznych serwisów. Osobny moduł (`@funfactory/core/purchases`).
 * W przeglądarce nic nie kupuje (zwraca null / false).
 */
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { isNative, platformName } from './platform.ts';

export interface StoreProduct {
  id: string;
  /** Cena sformatowana przez sklep, np. „24,99 zł”. */
  price: string;
}

export async function getProduct(id: string): Promise<StoreProduct | null> {
  if (!isNative()) return null;
  try {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: [id], productType: PURCHASE_TYPE.INAPP });
    const p = products.find((x) => x.identifier === id);
    return p ? { id, price: p.priceString } : null;
  } catch {
    return null;
  }
}

/** Czy produkt jest kupiony (także przez Chmurę rodzinną na iOS). Zwrócone i odebrane zakupy się nie liczą. */
export async function owns(id: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // iOS: tylko bieżące uprawnienia zalogowanego Apple ID (bez zwrotów i zakupów z innego konta na tym urządzeniu).
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP, onlyCurrentEntitlements: true });
    const ios = platformName() === 'ios';
    const t = purchases.find((x) => x.productIdentifier === id && (ios ? !x.revocationDate : x.purchaseState === '1'));
    if (!t) return false;
    // Android: zakup opłacony później (np. gotówką) trzeba potwierdzić w ciągu 3 dni, inaczej Google zwraca pieniądze.
    if (!ios && t.isAcknowledged === false && t.purchaseToken) await NativePurchases.acknowledgePurchase({ purchaseToken: t.purchaseToken }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/** Wynik zakupu: kupione, czeka (zgoda rodzica „Poproś o zakup”, płatność gotówką) albo nie doszło do skutku. */
export type BuyResult = 'bought' | 'pending' | 'failed';

/** Zakup; „pending” rozstrzyga się później (sprawdza to `owns` przy starcie gry). */
export async function buy(id: string): Promise<BuyResult> {
  if (!isNative()) return 'failed';
  try {
    const t = await NativePurchases.purchaseProduct({ productIdentifier: id, productType: PURCHASE_TYPE.INAPP, quantity: 1 });
    if (platformName() !== 'ios' && t?.purchaseState === '0') return 'pending';
    return (await owns(id)) ? 'bought' : 'failed';
  } catch (e) {
    return /pending|deferred/i.test(String((e as { message?: string })?.message ?? e)) ? 'pending' : 'failed';
  }
}

/** Przywrócenie zakupów (wymagane przez Apple); true, gdy produkt jest kupiony. */
export async function restore(id: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await NativePurchases.restorePurchases();
  } catch {
    // Brak połączenia: sprawdzamy to, co sklep pamięta lokalnie.
  }
  return owns(id);
}
