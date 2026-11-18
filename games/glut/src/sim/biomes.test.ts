import { describe, expect, it } from 'vitest';
import { BIOME_BLEND, BIOME_HEIGHT, biomeBlend, biomeIndex, BIOMES, metersAt } from './biomes.ts';
import { START } from './shaft.ts';

describe('biomes', () => {
  it('changes every 100 m and stays in the last one', () => {
    expect(biomeIndex(0)).toBe(0);
    expect(biomeIndex(99.9)).toBe(0);
    expect(biomeIndex(100)).toBe(1);
    expect(biomeIndex(BIOME_HEIGHT * BIOMES.length + 5000)).toBe(BIOMES.length - 1);
    expect(biomeIndex(-10)).toBe(0);
  });

  it('blends smoothly in the last metres of a world', () => {
    expect(biomeBlend(50)).toEqual({ index: 0, next: 1, t: 0 });
    expect(biomeBlend(BIOME_HEIGHT - BIOME_BLEND / 2).t).toBeCloseTo(0.5);
    expect(biomeBlend(BIOME_HEIGHT - 0.001).t).toBeCloseTo(1, 2);
    expect(biomeBlend(BIOME_HEIGHT + 1)).toEqual({ index: 1, next: 2, t: 0 });
    const last = BIOMES.length - 1;
    expect(biomeBlend(BIOME_HEIGHT * last + 99)).toEqual({ index: last, next: last, t: 0 });
  });

  it('measures metres from the start of the shaft', () => {
    expect(metersAt(START.y)).toBe(0);
    expect(metersAt(START.y - 100 * BIOME_HEIGHT)).toBe(BIOME_HEIGHT);
  });
});
