import { describe, expect, it } from 'vitest';
import { dragToTap, TAP, tapToDrag } from './controls.ts';
import { launchVelocity, PHYS } from './physics.ts';

describe('tap controls', () => {
  it('shoots towards the tap', () => {
    const d = tapToDrag(300, 600, 300, 200); // stuknięcie nad slime'em
    const v = d && launchVelocity(d.x, d.y);
    expect(v?.vy).toBeLessThan(0);
    expect(Math.abs(v?.vx ?? 1)).toBeLessThan(1e-6);
  });

  it('distance sets the power, tapping on the slime does nothing', () => {
    expect(tapToDrag(0, 0, TAP.dead - 1, 0)).toBeNull();
    const near = launchVelocity(...xy(tapToDrag(0, 0, TAP.min, 0)));
    const far = launchVelocity(...xy(tapToDrag(0, 0, TAP.max + 200, 0)));
    expect(near?.power).toBeLessThan(0.15); // minimalna siła procy (próg przeciągnięcia)
    expect(far?.power).toBe(1);
    expect(Math.hypot(...xy(tapToDrag(0, 0, TAP.max, 0)))).toBeCloseTo(PHYS.maxDrag);
  });

  it('dragToTap inverts tapToDrag', () => {
    const tap = dragToTap(100, 500, -80, 150);
    const back = tapToDrag(100, 500, tap.x, tap.y);
    expect(back?.x).toBeCloseTo(-80);
    expect(back?.y).toBeCloseTo(150);
  });
});

function xy(d: { x: number; y: number } | null): [number, number] {
  if (!d) throw new Error('null drag');
  return [d.x, d.y];
}
