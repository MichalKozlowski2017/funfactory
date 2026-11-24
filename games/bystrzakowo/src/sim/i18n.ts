/**
 * On-screen texts in the game language. Keys are English ids; dictionaries live in sim/locales/<lang>.ts.
 * Placeholders in braces: tr('playTimeMin', { n: 15 }).
 * A missing key shows the key itself (i18n.test.ts keeps every dictionary complete).
 */
import { lang } from './lang.ts';
import { DE } from './locales/de.ts';
import { EN } from './locales/en.ts';
import { ES } from './locales/es.ts';
import { PL } from './locales/pl.ts';

const DICT = { pl: PL, en: EN, de: DE, es: ES } as const;

export function tr(key: string, vars?: Record<string, string | number>): string {
  let s = DICT[lang()][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** All dictionaries (for the completeness test). */
export const dictionaries = DICT;
