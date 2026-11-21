/**
 * Pełna wersja (płatna). Zakupów w aplikacji jeszcze nie ma, więc na razie wszystko jest odblokowane;
 * `?free` w adresie pokazuje, jak wygląda wersja darmowa (do playtestów i zrzutów).
 */
import { state } from './state.ts';

const FREE_PREVIEW = typeof location !== 'undefined' && new URLSearchParams(location.search).has('free');

/** Do czasu wdrożenia zakupów: true (chyba że `?free`). */
const UNLOCKED_UNTIL_IAP = true;

export const hasFull = (): boolean => !FREE_PREVIEW && (state.progress.full === true || UNLOCKED_UNTIL_IAP);
