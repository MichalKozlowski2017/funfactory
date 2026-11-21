/**
 * Język gry: polski (podstawowy), angielski, niemiecki. Ustawiany raz przy starcie (telefon albo wybór
 * rodzica) i czytany przez logikę zabaw, które od niego zależą (głoski, sylaby, literki, raport).
 */
export const LANGS = ['pl', 'en', 'de'] as const;
export type Lang = (typeof LANGS)[number];

let current: Lang = 'pl';

export const lang = (): Lang => current;

export function setLang(l: Lang): void {
  current = l;
}

/** Język z ustawień telefonu (np. „de-AT” → de); spoza listy: angielski. */
export function deviceLang(locales: readonly string[]): Lang {
  for (const l of locales) {
    const code = l.toLowerCase().slice(0, 2);
    if ((LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return 'en';
}
