import { describe, expect, it } from 'vitest';
import { HATS, NEW_SAVE, normalizeSave, tapHat } from './shop.ts';

describe('shop', () => {
  it('buys and equips when affordable', () => {
    const r = tapHat({ ...NEW_SAVE, candies: 50 }, 'party');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action).toBe('bought');
    expect(r.save.candies).toBe(20);
    expect(r.save.owned).toEqual(['party']);
    expect(r.save.hat).toBe('party');
  });

  it('refuses when too poor and says how much is missing', () => {
    const r = tapHat({ ...NEW_SAVE, candies: 10 }, 'crown');
    expect(r).toEqual({ ok: false, reason: 'poor', missing: 110 });
  });

  it('owned hat toggles on and off without charging', () => {
    const save = { ...NEW_SAVE, candies: 5, owned: ['party', 'chef'], hat: 'party' };
    const on = tapHat(save, 'chef');
    expect(on.ok && on.action === 'equipped' && on.save.hat === 'chef' && on.save.candies === 5).toBe(true);
    const off = tapHat({ ...save, hat: 'chef' }, 'chef');
    expect(off.ok && off.action === 'removed' && off.save.hat === null).toBe(true);
  });

  it('prices grow and are reachable', () => {
    const prices = HATS.map((h) => h.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(prices[0]).toBeLessThanOrEqual(40);
  });

  it('normalizes old or broken saves', () => {
    expect(normalizeSave({ best: 12, candies: 7 })).toEqual({ best: 12, candies: 7, owned: [], hat: null, controls: 'drag' });
    expect(normalizeSave({ owned: ['party', 'hacked'], hat: 'hacked' } as never)).toEqual({ best: 0, candies: 0, owned: ['party'], hat: null, controls: 'drag' });
  });
});
