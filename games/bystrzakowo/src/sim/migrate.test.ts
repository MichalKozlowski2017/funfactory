import { describe, expect, it } from 'vitest';
import legacy from './fixtures/legacy-save.json' with { type: 'json' };
import { IDS_VERSION, migrateIds } from './migrate.ts';
import { newProgress, type Progress } from './progress.ts';
import { ACTIVITIES } from './realms.ts';
import { ITEMS } from './catalog.ts';

describe('save migration (Polish ids -> English)', () => {
  const old = structuredClone(legacy) as unknown as Progress;
  const p = migrateIds(old);

  it('renames activities, items and journal keys', () => {
    expect(p.levels).toEqual({ colors: 2, letters: 1, sorting: 0, emotions: 3 });
    for (const k of Object.keys(p.levels)) expect(ACTIVITIES).toContain(k);
    expect(p.stickers).toEqual(['apple', 'submarine', 'kitten']);
    expect(p.stickers.filter((id) => id !== 'submarine').every((id) => ITEMS.some((i) => i.id === id))).toBe(true);
    expect(p.pictures?.[0]).toEqual({ bg: 'meadow', items: [{ id: 'giraffe', x: 10, y: 20, flip: false }] });
    const day = p.journal!.days['2026-11-20']!;
    expect(day.acts).toEqual({ colors: 4 });
    expect(day.ms).toEqual({ 'color@1': [21, 34] });
    expect(p.journal!.facts).toEqual({ 'color:green': '2026-11-20', 'letter:A': '2026-11-20' });
    expect(p.journal!.learned).toEqual({ 'phoneme:sz': '2026-11-20' });
    expect(p.hands).toEqual(['colors', 'realms']);
  });

  it('keeps free text and dates', () => {
    expect(p.childName).toBe(legacy.childName);
    expect(p.lang).toBe('pl');
    expect(p.trialDays).toEqual(['2026-11-20']);
    expect(p.ids).toBe(IDS_VERSION);
  });

  it('runs once, and a fresh save comes through unchanged', () => {
    expect(migrateIds(p)).toBe(p);
    const fresh = newProgress();
    expect(migrateIds(fresh)).toEqual({ ...fresh, ids: IDS_VERSION });
  });
});
