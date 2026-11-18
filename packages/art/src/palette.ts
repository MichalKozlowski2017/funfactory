/**
 * Palety bazowe. Gra wybiera jedną i trzyma się jej we wszystkich grafikach,
 * dzięki temu grafika z kodu, CC0 i ComfyUI wygląda spójnie.
 *
 * Role: bg (tło), surface (plansza/karty), ink (kontur/tekst), accent (akcja),
 * plus kolory postaci/obiektów w `swatches`.
 */
export interface Palette {
  name: string;
  bg: string;
  surface: string;
  ink: string;
  accent: string;
  good: string;
  bad: string;
  swatches: string[];
}

export const palettes = {
  /** Ciepła, miękka, „cukierkowa”: casual / puzzle. */
  candy: {
    name: 'candy',
    bg: '#2b1e3f',
    surface: '#f6e7d8',
    ink: '#1e1530',
    accent: '#ff7a59',
    good: '#5fd38d',
    bad: '#ff4f6d',
    swatches: ['#ff9ebb', '#ffd166', '#7ad7f0', '#9b8cff', '#8ee3a1', '#ff8f5a'],
  },
  /** Neon na ciemnym: arcade / zręcznościowe. */
  neon: {
    name: 'neon',
    bg: '#0b0f1e',
    surface: '#151b33',
    ink: '#e8f1ff',
    accent: '#00e5ff',
    good: '#39ff88',
    bad: '#ff2e63',
    swatches: ['#00e5ff', '#ff00a8', '#ffe600', '#7c4dff', '#39ff88', '#ff8a00'],
  },
  /** Natura, ziemiste: przygodowe / strategia. */
  meadow: {
    name: 'meadow',
    bg: '#1d2b22',
    surface: '#cfe3b4',
    ink: '#18221b',
    accent: '#f2a541',
    good: '#7bc96f',
    bad: '#d9534f',
    swatches: ['#7bc96f', '#f2a541', '#6fb7d9', '#c98bd9', '#e8d36b', '#d97b5a'],
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;
