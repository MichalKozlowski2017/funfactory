import { afterEach, describe, expect, it } from 'vitest';
import { addTask, addTempo, newJournal, noteFact } from './journal.ts';
import { setLang } from './lang.ts';
import { accuracy, enoughPoints, itemsOf, itemState, mastery, milestones, periods, sampleAccuracy, SKILLS, tempo } from './skills.ts';

const T = '2026-12-14';
const skill = (id: string) => SKILLS.find((s) => s.id === id)!;

afterEach(() => setLang('pl'));

describe('"Ready for school" stats', () => {
  it('13 skills, each with activities', () => {
    expect(SKILLS).toHaveLength(13);
    for (const s of SKILLS) expect(s.acts.length).toBeGreaterThan(0);
  });

  it('periods: 14 days or 12 weeks ending today', () => {
    const d = periods('days', T);
    expect(d).toHaveLength(14);
    expect(d[13]).toEqual({ from: T, to: T });
    const w = periods('weeks', T);
    expect(w).toHaveLength(12);
    expect(w[11]).toEqual({ from: '2026-12-08', to: T });
  });

  it('mastery computed from items', () => {
    const j = newJournal();
    for (let i = 0; i < 3; i++) noteFact(j, T, 'color:green', true);
    noteFact(j, T, 'color:red', true);
    for (let i = 0; i < 3; i++) noteFact(j, T, 'color:white', i === 0);
    const m = mastery(skill('colors'), j, {}, T);
    expect(m.ok).toBe(1);
    expect(m.of).toBe(itemsOf('color').length);
    expect(itemState(j, 'color', 'green')).toBe('mastered');
    expect(itemState(j, 'color', 'red')).toBe('practicing');
    expect(itemState(j, 'color', 'white')).toBe('trouble');
    expect(itemState(j, 'color', 'brown')).toBe('no');
  });

  it('curve: % without mistakes, only with enough tasks, level-up marker', () => {
    const j = newJournal();
    const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;
    for (let i = 0; i < 4; i++) addTask(j, day(10), 'stories', i === 0 ? 1 : 0, 0);
    for (let i = 0; i < 4; i++) addTask(j, day(12), 'stories', i < 2 ? 1 : 0, 1);
    addTask(j, day(13), 'stories', 0, 1);
    const ps = accuracy(skill('stories'), j, 'days', T);
    const byDay = Object.fromEntries(ps.map((p) => [p.to, p]));
    expect(byDay[day(10)]!.value).toBeCloseTo(0.75);
    expect(byDay[day(12)]!.value).toBeCloseTo(0.5);
    expect(byDay[day(12)]!.levelUp).toBe(true);
    expect(byDay[day(13)]!.value).toBeNull();
    expect(enoughPoints(ps)).toBe(true);
  });

  it('old days without "clean": tasks minus mistakes', () => {
    const j = newJournal();
    j.days['2026-12-14'] = { sec: 100, acts: { counting: 5 }, miss: 2, misses: { counting: 2 } };
    expect(accuracy(skill('counting'), j, 'days', T)[13]!.value).toBeCloseTo(0.6);
  });

  it('tempo compares the same level and computes the speedup', () => {
    const j = newJournal();
    const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;
    for (const [d, s] of [[2, 3], [5, 2.4], [9, 1.8], [12, 1.5]] as const) for (let i = 0; i < 4; i++) addTempo(j, day(d), 'color', 1, s);
    addTempo(j, day(12), 'color', 2, 6);
    const t = tempo(skill('colors'), j, 'days', T)!;
    expect(t.level).toBe(1);
    expect(t.points.find((p) => p.to === day(12))!.value).toBeCloseTo(1.5);
    expect(t.speedup).toBeCloseTo(2);
    expect(tempo(skill('stories'), j, 'days', T)).toBeNull();
  });

  it('milestones: mastered items, first time, level up; newest first', () => {
    const j = newJournal();
    addTask(j, '2026-12-01', 'counting', 0, 0);
    addTask(j, '2026-12-05', 'counting', 0, 1);
    for (let i = 0; i < 3; i++) noteFact(j, '2026-12-07', 'number:5', true);
    expect(milestones(skill('counting'), j)).toEqual([
      { day: '2026-12-07', item: '5', kind: 'mastered' },
      { day: '2026-12-05', item: null, kind: 'level' },
      { day: '2026-12-01', item: null, kind: 'first' },
    ]);
  });

  it('sample instead of an empty chart, and letters in the game language', () => {
    expect(enoughPoints(accuracy(skill('colors'), newJournal(), 'weeks', T))).toBe(false);
    expect(enoughPoints(sampleAccuracy('weeks', T))).toBe(true);
    setLang('de');
    expect(itemsOf('phoneme')).toContain('z');
    expect(itemsOf('phoneme')).not.toContain('ł');
  });
});
