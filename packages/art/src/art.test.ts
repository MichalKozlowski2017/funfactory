import { describe, expect, it } from 'vitest';
import { blobPoints, circle, hexToRgb, lighten, mix, Noise2D, rgbToHex, smoothClosedPath, svg } from './index.ts';

describe('color', () => {
  it('round-trips hex', () => {
    expect(rgbToHex(hexToRgb('#ff7a59'))).toBe('#ff7a59');
    expect(rgbToHex(hexToRgb('#f80'))).toBe('#ff8800');
  });

  it('mix endpoints are the inputs', () => {
    expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });

  it('lighten makes it brighter', () => {
    const base = hexToRgb('#446688');
    const light = hexToRgb(lighten('#446688', 0.2));
    expect(light.r + light.g + light.b).toBeGreaterThan(base.r + base.g + base.b);
  });
});

describe('svg', () => {
  it('builds markup with kebab-case attributes and escaping', () => {
    const out = svg(10, 10, [circle(5, 5, 4, { strokeWidth: 2, fill: '"x"' })]);
    expect(out).toContain('stroke-width="2"');
    expect(out).toContain('&quot;x&quot;');
    expect(out.startsWith('<svg')).toBe(true);
  });

  it('smooth closed path is closed', () => {
    const d = smoothClosedPath(blobPoints(50, 50, 40, 8, 0.2, () => 0.5));
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('Noise2D', () => {
  it('is deterministic and in range', () => {
    const a = new Noise2D(7);
    const b = new Noise2D(7);
    for (let i = 0; i < 50; i++) {
      const v = a.fbm(i * 0.37, i * 0.11);
      expect(v).toBe(b.fbm(i * 0.37, i * 0.11));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
