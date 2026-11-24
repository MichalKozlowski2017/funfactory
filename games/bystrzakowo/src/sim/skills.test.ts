import { afterEach, describe, expect, it } from 'vitest';
import { addTask, addTempo, newJournal, noteFact } from './journal.ts';
import { setLang } from './lang.ts';
import { accuracy, enoughPoints, itemsOf, itemState, mastery, milestones, periods, sampleAccuracy, SKILLS, tempo } from './skills.ts';

const T = '2026-12-14';
const skill = (id: string) => SKILLS.find((s) => s.id === id)!;

afterEach(() => setLang('pl'));

describe('statystyki „Przed szkołą”', () => {
  it('13 umiejętności, każda z zabawami', () => {
    expect(SKILLS).toHaveLength(13);
    for (const s of SKILLS) expect(s.acts.length).toBeGreaterThan(0);
  });

  it('okresy: 14 dni albo 12 tygodni kończących się dziś', () => {
    const d = periods('dni', T);
    expect(d).toHaveLength(14);
    expect(d[13]).toEqual({ from: T, to: T });
    const w = periods('tygodnie', T);
    expect(w).toHaveLength(12);
    expect(w[11]).toEqual({ from: '2026-12-08', to: T });
  });

  it('opanowanie liczone z elementów', () => {
    const j = newJournal();
    for (let i = 0; i < 3; i++) noteFact(j, T, 'kolor:zielony', true);
    noteFact(j, T, 'kolor:czerwony', true);
    for (let i = 0; i < 3; i++) noteFact(j, T, 'kolor:bialy', i === 0);
    const m = mastery(skill('kolory'), j, {}, T);
    expect(m.ok).toBe(1);
    expect(m.of).toBe(itemsOf('kolor').length);
    expect(itemState(j, 'kolor', 'zielony')).toBe('opanowane');
    expect(itemState(j, 'kolor', 'czerwony')).toBe('cwiczy');
    expect(itemState(j, 'kolor', 'bialy')).toBe('klopot');
    expect(itemState(j, 'kolor', 'brazowy')).toBe('nie');
  });

  it('krzywa: % bez pomyłki, tylko przy dość wielu zadaniach, znacznik wyższego poziomu', () => {
    const j = newJournal();
    const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;
    for (let i = 0; i < 4; i++) addTask(j, day(10), 'historyjki', i === 0 ? 1 : 0, 0);
    for (let i = 0; i < 4; i++) addTask(j, day(12), 'historyjki', i < 2 ? 1 : 0, 1);
    addTask(j, day(13), 'historyjki', 0, 1);
    const ps = accuracy(skill('historyjki'), j, 'dni', T);
    const byDay = Object.fromEntries(ps.map((p) => [p.to, p]));
    expect(byDay[day(10)]!.value).toBeCloseTo(0.75);
    expect(byDay[day(12)]!.value).toBeCloseTo(0.5);
    expect(byDay[day(12)]!.levelUp).toBe(true);
    expect(byDay[day(13)]!.value).toBeNull();
    expect(enoughPoints(ps)).toBe(true);
  });

  it('stare dni bez „clean”: zadania minus pomyłki', () => {
    const j = newJournal();
    j.days['2026-12-14'] = { sec: 100, acts: { liczenie: 5 }, miss: 2, misses: { liczenie: 2 } };
    expect(accuracy(skill('liczenie'), j, 'dni', T)[13]!.value).toBeCloseTo(0.6);
  });

  it('tempo porównuje ten sam poziom i liczy przyspieszenie', () => {
    const j = newJournal();
    const day = (n: number) => `2026-12-${String(n).padStart(2, '0')}`;
    for (const [d, s] of [[2, 3], [5, 2.4], [9, 1.8], [12, 1.5]] as const) for (let i = 0; i < 4; i++) addTempo(j, day(d), 'kolor', 1, s);
    addTempo(j, day(12), 'kolor', 2, 6);
    const t = tempo(skill('kolory'), j, 'dni', T)!;
    expect(t.level).toBe(1);
    expect(t.points.find((p) => p.to === day(12))!.value).toBeCloseTo(1.5);
    expect(t.speedup).toBeCloseTo(2);
    expect(tempo(skill('historyjki'), j, 'dni', T)).toBeNull();
  });

  it('odkrycia: opanowane elementy, pierwszy raz, wyższy poziom; najnowsze pierwsze', () => {
    const j = newJournal();
    addTask(j, '2026-12-01', 'liczenie', 0, 0);
    addTask(j, '2026-12-05', 'liczenie', 0, 1);
    for (let i = 0; i < 3; i++) noteFact(j, '2026-12-07', 'liczba:5', true);
    expect(milestones(skill('liczenie'), j)).toEqual([
      { day: '2026-12-07', item: '5', kind: 'opanowane' },
      { day: '2026-12-05', item: null, kind: 'poziom' },
      { day: '2026-12-01', item: null, kind: 'pierwszy' },
    ]);
  });

  it('przykład zamiast pustego wykresu i litery w języku gry', () => {
    expect(enoughPoints(accuracy(skill('kolory'), newJournal(), 'tygodnie', T))).toBe(false);
    expect(enoughPoints(sampleAccuracy('tygodnie', T))).toBe(true);
    setLang('de');
    expect(itemsOf('gloska')).toContain('z');
    expect(itemsOf('gloska')).not.toContain('ł');
  });
});
