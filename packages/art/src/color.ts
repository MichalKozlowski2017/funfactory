export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** '#ff8800' albo '#f80' -> {r,g,b} w [0, 1]. */
export const hexToRgb = (hex: string): Rgb => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  '#' + [r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');

/** Kolor jako liczba 0xRRGGBB (format tintów w Pixi). */
export const hexToNumber = (hex: string): number => parseInt(hex.replace('#', ''), 16);

// --- OKLab: mieszanie i rozjaśnianie wyglądają naturalnie, bez szarych przejść ---

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

interface Lab {
  L: number;
  a: number;
  b: number;
}

const rgbToOklab = ({ r, g, b }: Rgb): Lab => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

const oklabToRgb = ({ L, a, b }: Lab): Rgb => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: clamp01(toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  };
};

/** Mieszanie w OKLab, t w [0, 1]. */
export const mix = (from: string, to: string, t: number): string => {
  const a = rgbToOklab(hexToRgb(from));
  const b = rgbToOklab(hexToRgb(to));
  return rgbToHex(oklabToRgb({ L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t }));
};

/** Zmiana jasności w OKLab, amount w przybliżeniu w [-1, 1]. */
export const lighten = (hex: string, amount: number): string => {
  const lab = rgbToOklab(hexToRgb(hex));
  return rgbToHex(oklabToRgb({ ...lab, L: clamp01(lab.L + amount) }));
};

export const darken = (hex: string, amount: number): string => lighten(hex, -amount);

/** Skala tonów od cienia do światła, np. do cieniowania postaci z jednego koloru bazowego. */
export const ramp = (hex: string, steps = 5, spread = 0.36): string[] =>
  Array.from({ length: steps }, (_, i) => lighten(hex, spread * (i / (steps - 1) - 0.5)));
