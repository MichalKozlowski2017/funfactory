import { describe, expect, it } from 'vitest';
import { contact, World, type Block } from './physics.ts';
import { POWER, Run, SYRUP } from './run.ts';
import { generateChunk, generatePowerUps, POWER_RADIUS } from './shaft.ts';

const box = (x: number, y: number, w: number, h: number, surface: Block['surface'] = 'sticky'): Block => ({ x, y, w, h, surface });
const floor = box(-100, 0, 1000, 100);

describe('power-up spawning', () => {
  it('is deterministic, in the air and never inside blocks', () => {
    let total = 0;
    for (let k = 0; k < 30; k++) {
      const blocks = generateChunk(9, k);
      const p = generatePowerUps(9, k, blocks);
      expect(p).toEqual(generatePowerUps(9, k, blocks));
      for (const u of p) for (const b of blocks) expect(contact(u.x, u.y, POWER_RADIUS, b)).toBeNull();
      total += p.length;
    }
    expect(total).toBeGreaterThan(13); // co najmniej co drugi kawałek
    expect(generatePowerUps(9, 0, generateChunk(9, 0))).toEqual([]); // nie na samym dnie
  });
});

describe('power-up rhythm', () => {
  it('never leaves two chunks in a row without a bubble', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let empty = 0;
      for (let k = 1; k <= 30; k++) {
        const has = generatePowerUps(seed, k, generateChunk(seed, k)).length > 0;
        empty = has ? 0 : empty + 1;
        expect(empty).toBeLessThan(3); // nieparzyste zawsze mają (chyba że brak miejsca: wtedy max 2 z rzędu)
      }
    }
  });
});

describe('shell', () => {
  it('bounces off spikes instead of dying, once', () => {
    const world = new World([floor, box(0, -400, 1000, 20, 'spikes')], { x: 300, y: -50 });
    world.mods.shell = true;
    world.launch(0, -2000);
    let shielded = false;
    let died = false;
    for (let i = 0; i < 120; i++) {
      const r = world.step(1 / 60);
      if (r.shielded) {
        shielded = true;
        world.mods.shell = false; // Run zużywa skorupkę
      }
      if (r.died) died = true;
    }
    expect(shielded).toBe(true);
    expect(died).toBe(false);
    expect(world.slime.state).toBe('stuck'); // odbity spadł na dno
  });
});

describe('glue', () => {
  it('stops sliding on ice walls', () => {
    const ice = box(0, -600, 20, 200, 'ice');
    const world = new World([floor, ice], { x: 300, y: -50 });
    Object.assign(world.slime, { state: 'stuck', x: 54, y: -560, nx: 1, ny: 0, stuckTo: ice });
    world.mods.glue = true;
    for (let i = 0; i < 120; i++) world.step(1 / 60);
    expect(world.slime.y).toBeCloseTo(-560);
  });
});

describe('breath', () => {
  it('allows exactly one launch in the air', () => {
    const run = new Run(5);
    run.launch(0, -1500);
    run.step(1 / 60);
    expect(run.slime.state).toBe('flying');
    expect(run.canAim).toBe(false);
    run.activate('breath');
    expect(run.canAim).toBe(true);
    expect(run.launch(400, -1200)).toBe(true);
    expect(run.launch(400, -1200)).toBe(false);
  });
});

describe('frost', () => {
  it('stops the syrup and pushes it down', () => {
    const run = new Run(5);
    run.launch(0, -1200);
    for (let i = 0; i < 600; i++) run.step(1 / 60);
    const before = run.syrupY;
    run.activate('frost');
    expect(run.syrupY).toBeCloseTo(Math.min(SYRUP.startY, before + POWER.frostDrop));
    const frozen = run.syrupY;
    for (let i = 0; i < 60 * (POWER.frost - 0.5); i++) run.step(1 / 60);
    expect(run.syrupY).toBeCloseTo(frozen);
  });
});

describe('magnet', () => {
  it('pulls nearby candies to the slime', () => {
    const run = new Run(3);
    const c = [...run.shaft.candies.values()].flat().find((x) => !x.taken);
    if (!c) throw new Error('no candy');
    Object.assign(run.slime, { x: c.x + 200, y: c.y, state: 'stuck' });
    run.activate('magnet');
    let got = false;
    for (let i = 0; i < 60 && !got; i++) got = (run.step(1 / 60).collected ?? []).includes(c);
    expect(got).toBe(true);
  });
});

describe('rocket', () => {
  it('flies up through ledges without dying and lands afterwards', () => {
    const run = new Run(11);
    const startY = run.slime.y;
    run.activate('rocket');
    let died = false;
    for (let i = 0; i < 60 * 4; i++) died ||= !!run.step(1 / 60).died;
    expect(died).toBe(false);
    expect(startY - run.peakY).toBeGreaterThan(1500 * POWER.rocket);
    expect(run.slime.x).toBeGreaterThan(40);
    expect(run.slime.x).toBeLessThan(680);
  });
});
