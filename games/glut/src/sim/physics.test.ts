import { describe, expect, it } from 'vitest';
import { contact, launchVelocity, PHYS, World, type Block } from './physics.ts';

const box = (x: number, y: number, w: number, h: number, surface: Block['surface'] = 'sticky'): Block => ({
  x,
  y,
  w,
  h,
  surface,
});

describe('contact', () => {
  it('finds the push-out normal from a side', () => {
    const c = contact(110, 50, 20, box(0, 0, 100, 100));
    expect(c?.nx).toBeCloseTo(1);
    expect(c?.depth).toBeCloseTo(10);
  });

  it('handles a center inside the box', () => {
    const c = contact(95, 50, 20, box(0, 0, 100, 100));
    expect(c?.nx).toBe(1);
    expect(c?.depth).toBeCloseTo(25);
  });
});

describe('launchVelocity', () => {
  it('shoots opposite to the drag and caps power', () => {
    const v = launchVelocity(0, 1000);
    expect(v?.vy).toBeCloseTo(-PHYS.maxSpeed);
    expect(v?.power).toBe(1);
  });

  it('cancels short drags', () => {
    expect(launchVelocity(5, 5)).toBeNull();
  });
});

describe('World', () => {
  it('settles on the floor at start', () => {
    const world = new World([box(-100, 0, 1000, 100)], { x: 300, y: -300 });
    expect(world.slime.state).toBe('stuck');
    expect(world.slime.y).toBeCloseTo(-PHYS.radius, 0);
    expect(world.slime.ny).toBeCloseTo(-1);
  });

  it('does not tunnel through a thin wall at max speed', () => {
    const wall = box(400, -2000, 10, 4000);
    const world = new World([box(-100, 0, 1000, 100), wall], { x: 100, y: -50 });
    world.launch(6000, -500);
    for (let i = 0; i < 60; i++) world.step(1 / 60);
    expect(world.slime.state).toBe('stuck');
    expect(world.slime.stuckTo).toBe(wall);
    expect(world.slime.x).toBeLessThan(400);
  });

  it('leaves the surface it launches from', () => {
    const world = new World([box(-100, 0, 1000, 100)], { x: 300, y: -50 });
    world.launch(0, -1200);
    world.step(1 / 60);
    expect(world.slime.state).toBe('flying');
  });

  it('slides down ice and falls off its end', () => {
    const ice = box(0, -600, 20, 200, 'ice');
    const world = new World([box(-100, 0, 1000, 100), ice], { x: 300, y: -50 });
    world.slime.state = 'stuck';
    world.slime.x = 20 + PHYS.radius;
    world.slime.y = -560;
    world.slime.nx = 1;
    world.slime.ny = 0;
    world.slime.stuckTo = ice;
    let slipped = false;
    for (let i = 0; i < 240 && !slipped; i++) slipped = !!world.step(1 / 60).slipped;
    expect(slipped).toBe(true);
    expect(world.slime.state).toBe('flying');
  });

  it('dies on spikes', () => {
    const world = new World([box(-100, 0, 1000, 100), box(0, -400, 1000, 20, 'spikes')], { x: 300, y: -50 });
    world.launch(0, -2000);
    let died = false;
    for (let i = 0; i < 60 && !died; i++) died = !!world.step(1 / 60).died;
    expect(died).toBe(true);
    expect(world.slime.state).toBe('dead');
  });

  it('predict ends where the real flight lands', () => {
    const wall = box(600, -2000, 40, 4000);
    const world = new World([box(-100, 0, 1000, 100), wall], { x: 200, y: -50 });
    const { points: path, end: kind } = world.predict(900, -900);
    expect(kind).toBe('land');
    const end = path[path.length - 1];
    world.launch(900, -900);
    for (let i = 0; i < 120 && world.slime.state === 'flying'; i++) world.step(1 / 60);
    expect(end?.x).toBeCloseTo(world.slime.x, 0);
    expect(end?.y).toBeCloseTo(world.slime.y, 0);
  });
});
