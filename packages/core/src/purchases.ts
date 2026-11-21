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

/** Czy produkt jest kupiony (także przez Chmurę rodzinną na iOS). */
export async function owns(id: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    return purchases.some((t) => t.productIdentifier === id && (platformName() === 'ios' || t.purchaseState === '1'));
  } catch {
    return false;
  }
}

/** Zakup; true, gdy po nim produkt jest kupiony (false: anulowany albo błąd). */
export async function buy(id: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await NativePurchases.purchaseProduct({ productIdentifier: id, productType: PURCHASE_TYPE.INAPP, quantity: 1 });
    return await owns(id);
  } catch {
    return false;
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
