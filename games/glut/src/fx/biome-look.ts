import type { BiomeId } from '../sim/biomes.ts';
import { SURFACE } from './surfaces.ts';

export type SurfacePalette = typeof SURFACE;

/** Cząsteczki w powietrzu: kolory, kierunek (unoszą się czy opadają), gęstość. */
export interface Ambient {
  colors: number[];
  /** Prędkość pionowa [min, max] (ujemna = w górę). */
  vy: [number, number];
  /** Ile na sekundę na ekranie. */
  rate: number;
  scale: [number, number];
}

export interface BiomeLook {
  /** Przyciemnienie/zabarwienie tła. */
  bgTint: number;
  surface: SurfacePalette;
  syrup: number;
  syrupTop: number;
  ambient: Ambient;
  /** Mrok przy krawędziach ekranu, 0..1. */
  dark: number;
  /** Migotanie światła (fabryka). */
  flicker: boolean;
}

/** Lód i kolce zostają wszędzie takie same: muszą być zawsze czytelne. */
const fixed = { ice: SURFACE.ice, iceShade: SURFACE.iceShade, caramel: SURFACE.caramel, caramelShade: SURFACE.caramelShade, ink: SURFACE.ink };

const surf = (rock: number, rockEdge: number, frosting: number, frostingShade: number, biscuit: number, biscuitShade: number): SurfacePalette => ({
  rock,
  rockEdge,
  frosting,
  frostingShade,
  biscuit,
  biscuitShade,
  ...fixed,
});

export const BIOME_LOOKS: Record<BiomeId, BiomeLook> = {
  crystal: {
    bgTint: 0x8e7ea0,
    surface: SURFACE,
    syrup: 0xff8fb1,
    syrupTop: 0xffc2d4,
    ambient: { colors: [0xffffff, 0xffc2d4], vy: [-30, 10], rate: 3, scale: [0.2, 0.45] },
    dark: 0,
    flicker: false,
  },
  choco: {
    bgTint: 0x9a8070,
    surface: surf(0x3b2418, 0x5a3826, 0xf3c98b, 0xc99a5a, 0x8a5232, 0x5e3420),
    syrup: 0x8a4a26,
    syrupTop: 0xc07a48,
    ambient: { colors: [0xf3c98b, 0xc99a5a], vy: [20, 60], rate: 4, scale: [0.2, 0.4] },
    dark: 0.05,
    flicker: false,
  },
  jelly: {
    bgTint: 0x8fa088,
    surface: surf(0x2d3b2a, 0x46603f, 0xff7aa8, 0xd8507f, 0x7bd389, 0x4fa65e),
    syrup: 0xff5d73,
    syrupTop: 0xff9aa8,
    ambient: { colors: [0x9cff8a, 0xffb36b, 0xff7aa8], vy: [-20, 20], rate: 4, scale: [0.25, 0.5] },
    dark: 0.05,
    flicker: false,
  },
  clouds: {
    bgTint: 0xb39aa8,
    surface: surf(0x6a4a78, 0x8a6496, 0xfff0f6, 0xf2c2d8, 0xffc49a, 0xe09a72),
    syrup: 0xff9a5c,
    syrupTop: 0xffd2a8,
    ambient: { colors: [0xffe28a, 0xffffff], vy: [-15, 15], rate: 5, scale: [0.2, 0.45] },
    dark: 0.1,
    flicker: false,
  },
  caramel: {
    bgTint: 0x7a5a4a,
    surface: surf(0x24160f, 0x3d2416, 0xd9822b, 0xa65a17, 0x5a3a24, 0x3a2414),
    syrup: 0xe8701a,
    syrupTop: 0xffb24a,
    ambient: { colors: [0xffa040, 0xff6a1a, 0xffd27a], vy: [-90, -40], rate: 9, scale: [0.2, 0.5] },
    dark: 0.35,
    flicker: false,
  },
  licorice: {
    bgTint: 0x5a6a66,
    surface: surf(0x0f1a1a, 0x1d2e2c, 0x9cff6b, 0x5fcc3c, 0x2a2a30, 0x15151a),
    syrup: 0x1d2a26,
    syrupTop: 0x6bff8a,
    ambient: { colors: [0x9cff6b, 0x6bff8a], vy: [-20, 20], rate: 5, scale: [0.25, 0.55] },
    dark: 0.5,
    flicker: false,
  },
  factory: {
    bgTint: 0x6a6460,
    surface: surf(0x1f1d1c, 0x3a3330, 0xd9c27a, 0xa8904c, 0x6e5546, 0x4a372d),
    syrup: 0x2d2a33,
    syrupTop: 0xc9a24a,
    ambient: { colors: [0xb0a898, 0x8a8278], vy: [10, 40], rate: 6, scale: [0.15, 0.35] },
    dark: 0.55,
    flicker: true,
  },
  nightmare: {
    bgTint: 0x5a4050,
    surface: surf(0x14070d, 0x2a0d18, 0xd0204a, 0x8a0a2c, 0x3a1a2a, 0x220c18),
    syrup: 0x8a0020,
    syrupTop: 0xff3355,
    ambient: { colors: [0xff3355, 0xff7a8a], vy: [-25, 5], rate: 6, scale: [0.2, 0.5] },
    dark: 0.65,
    flicker: false,
  },
};

/** Mieszanie kolorów 0xRRGGBB. */
export function mixColor(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
