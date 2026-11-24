/**
 * Game language: Polish (primary), English, German, Spanish (Latin American). Set once at startup (phone or parent's
 * choice) and read by the activity logic that depends on it (phonemes, syllables, letters, report).
 */
export const LANGS = ['pl', 'en', 'de', 'es'] as const;
export type Lang = (typeof LANGS)[number];

let current: Lang = 'pl';

export const lang = (): Lang => current;

export function setLang(l: Lang): void {
  current = l;
}

/** Language from phone settings (e.g. "de-AT" → de); outside the list: English. */
export function deviceLang(locales: readonly string[]): Lang {
  for (const l of locales) {
    const code = l.toLowerCase().slice(0, 2);
    if ((LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return 'en';
}
