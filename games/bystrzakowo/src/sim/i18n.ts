/**
 * Teksty na ekranie w języku gry. Kluczem jest polski tekst (źródło), słowniki: sim/locales/<język>.ts.
 * Zmienne w nawiasach klamrowych: tr('Czas zabawy: {n} min', { n: 15 }).
 * Brak tłumaczenia: polski tekst (test i18n.test.ts pilnuje, żeby słowniki były pełne).
 */
import { lang } from './lang.ts';
import { DE } from './locales/de.ts';
import { EN } from './locales/en.ts';

const DICT = { en: EN, de: DE } as const;

export function tr(pl: string, vars?: Record<string, string | number>): string {
  const l = lang();
  let s = l === 'pl' ? pl : (DICT[l][pl] ?? pl);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Wszystkie klucze słowników (do testu kompletności). */
export const dictionaries = DICT;
