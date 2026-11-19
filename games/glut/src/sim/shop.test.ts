import { describe, expect, it } from 'vitest';
import { HATS, ITEMS, KINDS, NEW_SAVE, normalizeSave, tapItem, itemsOf } from './shop.ts';

describe('wardrobe', () => {
  it('buys and equips when affordable', () => {
    const r = tapItem({ ...NEW_SAVE, candies: 450 }, 'party');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action).toBe('bought');
    expect(r.save.candies).toBe(50);
    expect(r.save.owned).toEqual(['party']);
    expect(r.save.hat).toBe('party');
  });

  it('refuses when too poor and says how much is missing', () => {
    const r = tapItem({ ...NEW_SAVE, candies: 10 }, 'crown');
    expect(r).toEqual({ ok: false, reason: 'poor', missing: 4990 });
  });

  it('achievement items cannot be bought, only worn once earned', () => {
    expect(tapItem({ ...NEW_SAVE, candies: 99999 }, 'horns')).toEqual({ ok: false, reason: 'locked', unlock: 'h700' });
    const r = tapItem({ ...NEW_SAVE, owned: ['horns'] }, 'horns');
    expect(r.ok && r.action === 'equipped' && r.save.hat === 'horns').toBe(true);
  });

  it('owned item toggles on and off without charging', () => {
    const save = { ...NEW_SAVE, candies: 5, owned: ['party', 'chef'], hat: 'party' };
    const on = tapItem(save, 'chef');
    expect(on.ok && on.action === 'equipped' && on.save.hat === 'chef' && on.save.candies === 5).toBe(true);
    const off = tapItem({ ...save, hat: 'chef' }, 'chef');
    expect(off.ok && off.action === 'removed' && off.save.hat === null).toBe(true);
  });

  it('wears one item per kind, independently across kinds', () => {
    let save = { ...NEW_SAVE, candies: 100000 };
    for (const id of ['party', 'mint', 'hearts', 'bow', 'lemon']) {
      const r = tapItem(save, id);
      if (r.ok) save = r.save;
    }
    expect([save.hat, save.skin, save.trail, save.acc]).toEqual(['party', 'lemon', 'hearts', 'bow']);
    expect(save.owned).toContain('mint');
  });

  it('has unique ids, growing prices and one achievement item in every kind', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const { kind } of KINDS) {
      const items = itemsOf(kind);
      expect(items.length).toBe(6);
      const prices = items.filter((i) => !i.unlock).map((i) => i.price);
      expect(prices).toEqual([400, 1000, 2500, 5000, 10000]);
      expect(items.filter((i) => i.unlock).length).toBe(1);
    }
    expect(HATS[0]!.price).toBe(400);
  });

  it('normalizes old or broken saves', () => {
    expect(normalizeSave({ best: 12, candies: 7 })).toEqual({ ...NEW_SAVE, best: 12, candies: 7 });
    expect(normalizeSave({ owned: ['party', 'hacked'], hat: 'hacked' } as never)).toEqual({ ...NEW_SAVE, owned: ['party'] });
    // Założona rzecz musi być kupiona i z właściwego działu.
    expect(normalizeSave({ owned: ['mint'], skin: 'mint', hat: 'mint', trail: 'stars' } as never)).toMatchObject({ skin: 'mint', hat: null, trail: null });
  });
});
