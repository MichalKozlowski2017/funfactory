import { describe, expect, it } from 'vitest';
import { BIOME_FEATURES, BIOMES, biomeIndex, metersAt } from './biomes.ts';
import { FEATURE, World, type Block } from './physics.ts';
import { generateChunk, SHAFT } from './shaft.ts';

const box = (x: number, y: number, w: number, h: number, extra: Partial<Block> = {}): Block => ({ x, y, w, h, surface: 'sticky', ...extra });

/** Kroki fizyki przez `seconds`, zbiera wyniki. */
function run(world: World, seconds: number) {
  const out = [];
  for (let t = 0; t < seconds; t += 1 / 60) out.push(world.step(1 / 60));
  return out;
}

describe('ledge features', () => {
  it('chocolate crumbles after standing on it', () => {
    const ledge = box(200, 0, 300, 36, { feature: 'crumble' });
    const world = new World([ledge], { x: 350, y: -100 });
    expect(world.slime.state).toBe('stuck');
    const results = run(world, FEATURE.crumble + 0.1);
    expect(results.some((r) => r.crumbled === ledge)).toBe(true);
    expect(ledge.gone).toBe(true);
    // Rozpadnięta półka już nie trzyma: slime spada.
    run(world, 0.3);
    expect(world.slime.state).toBe('flying');
    expect(world.slime.y).toBeGreaterThan(0);
  });

  it('jelly bounces up instead of sticking', () => {
    const world = new World([], { x: 350, y: -400 });
    world.blocks = [box(200, 0, 300, 36, { feature: 'bounce' })];
    Object.assign(world.slime, { x: 350, y: -400, vx: 0, vy: 0, state: 'flying' });
    const results = run(world, 0.6);
    const bounce = results.find((r) => r.bounced)?.bounced;
    expect(bounce?.ny).toBeLessThan(-0.5);
    expect(world.slime.state).toBe('flying');
    expect(world.slime.vy).toBeLessThan(0);
    expect(bounce!.speed).toBeGreaterThanOrEqual(FEATURE.bounceUp);
  });

  it('clouds let you through from below and hold you from above', () => {
    const cloud = box(200, -400, 300, 36, { feature: 'cloud' });
    const world = new World([box(-100, 0, 1000, 100)], { x: 350, y: -100 });
    world.blocks.push(cloud);
    world.launch(0, -2000);
    let passed = false;
    for (let i = 0; i < 120 && world.slime.state === 'flying'; i++) {
      world.step(1 / 60);
      if (world.slime.y < cloud.y - 40) passed = true;
    }
    expect(passed).toBe(true);
    expect(world.slime.state).toBe('stuck');
    expect(world.slime.stuckTo).toBe(cloud);
    expect(world.slime.ny).toBeLessThan(-0.5);
  });

  it('belts carry you off the edge', () => {
    const belt = box(200, 0, 300, 36, { feature: 'belt', belt: FEATURE.belt });
    const world = new World([belt], { x: 300, y: -100 });
    expect(world.slime.stuckTo).toBe(belt);
    const x0 = world.slime.x;
    run(world, 0.5);
    expect(world.slime.x).toBeCloseTo(x0 + FEATURE.belt * 0.5, -1);
    const results = run(world, 3);
    expect(results.some((r) => r.slipped)).toBe(true);
    expect(world.slime.state).toBe('flying');
  });
});

describe('feature generation', () => {
  const chunks = (seed: number, n: number) => Array.from({ length: n }, (_, k) => generateChunk(seed, k)).flat();

  it('puts features only where the world allows them', () => {
    const blocks = chunks(7, 80);
    for (const b of blocks) {
      if (!b.feature) continue;
      const biome = BIOMES[biomeIndex(metersAt(b.y))]!.id;
      expect(BIOME_FEATURES[biome].map(([f]) => f)).toContain(b.feature);
      expect(b.surface).toBe('sticky');
      expect(b.h).toBe(36);
    }
    expect(blocks.some((b) => b.feature === 'crumble')).toBe(true);
    expect(blocks.some((b) => b.feature === 'bounce')).toBe(true);
    expect(blocks.some((b) => b.feature === 'cloud')).toBe(true);
    expect(blocks.some((b) => b.feature === 'belt')).toBe(true);
  });

  it('belts never carry you into a wall', () => {
    for (const b of chunks(11, 80)) {
      if (b.feature !== 'belt') continue;
      if (b.x <= SHAFT.wall) expect(b.belt).toBeGreaterThan(0);
      if (b.x + b.w >= SHAFT.width - SHAFT.wall) expect(b.belt).toBeLessThan(0);
    }
  });

  it('keeps the ledge layout of the same seed', () => {
    const strip = (bs: Block[]) => bs.map(({ x, y, w, h, surface }) => [x, y, w, h, surface]);
    expect(strip(generateChunk(3, 20))).toEqual(strip(generateChunk(3, 20)));
  });
});
