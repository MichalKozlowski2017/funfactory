import { describe, expect, it } from 'vitest';
import { HATS, ITEMS, KINDS, NEW_SAVE, normalizeSave, tapItem, itemsOf } from './shop.ts';

describe('wardrobe', () => {
  it('buys and equips when affordable', () => {
    const r = tapItem({ ...NEW_SAVE, candies: 50 }, 'party');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action).toBe('bought');
    expect(r.save.candies).toBe(20);
    expect(r.save.owned).toEqual(['party']);
    expect(r.save.hat).toBe('party');
  });

  it('refuses when too poor and says how much is missing', () => {
    const r = tapItem({ ...NEW_SAVE, candies: 10 }, 'crown');
    expect(r).toEqual({ ok: false, reason: 'poor', missing: 110 });
  });

  it('owned item toggles on and off without charging', () => {
    const save = { ...NEW_SAVE, candies: 5, owned: ['party', 'chef'], hat: 'party' };
    const on = tapItem(save, 'chef');
    expect(on.ok && on.action === 'equipped' && on.save.hat === 'chef' && on.save.candies === 5).toBe(true);
    const off = tapItem({ ...save, hat: 'chef' }, 'chef');
    expect(off.ok && off.action === 'removed' && off.save.hat === null).toBe(true);
  });

  it('wears one item per kind, independently across kinds', () => {
    let save = { ...NEW_SAVE, candies: 1000 };
    for (const id of ['party', 'mint', 'hearts', 'bow', 'lemon']) {
      const r = tapItem(save, id);
      if (r.ok) save = r.save;
    }
    expect([save.hat, save.skin, save.trail, save.acc]).toEqual(['party', 'lemon', 'hearts', 'bow']);
    expect(save.owned).toContain('mint');
  });

  it('has unique ids and growing prices in every kind', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const { kind } of KINDS) {
      const prices = itemsOf(kind).map((i) => i.price);
      expect(prices.length).toBe(4);
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
      expect(prices[0]).toBeLessThanOrEqual(50);
    }
    expect(HATS[0]!.price).toBeLessThanOrEqual(40);
  });

  it('normalizes old or broken saves', () => {
    expect(normalizeSave({ best: 12, candies: 7 })).toEqual({ ...NEW_SAVE, best: 12, candies: 7 });
    expect(normalizeSave({ owned: ['party', 'hacked'], hat: 'hacked' } as never)).toEqual({ ...NEW_SAVE, owned: ['party'] });
    // Założona rzecz musi być kupiona i z właściwego działu.
    expect(normalizeSave({ owned: ['mint'], skin: 'mint', hat: 'mint', trail: 'stars' } as never)).toMatchObject({ skin: 'mint', hat: null, trail: null });
  });
});
