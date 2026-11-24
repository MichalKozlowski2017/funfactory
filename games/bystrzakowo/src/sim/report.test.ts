import { describe, expect, it } from 'vitest';
import { addTask, addTime, mastered, newJournal, noteFact, prune, shiftDay, struggling, summarize } from './journal.ts';
import { makeReport } from './report.ts';

const TODAY = '2026-11-21';

describe('journal', () => {
  it('mastery: three correct answers in a row', () => {
    expect(mastered('011')).toBe(false);
    expect(mastered('0111')).toBe(true);
    expect(struggling('1010')).toBe(true);
    expect(struggling('1101')).toBe(false);
  });

  it('records the mastery day only once', () => {
    const j = newJournal();
    for (let i = 0; i < 3; i++) noteFact(j, '2026-11-01', 'number:3', true);
    noteFact(j, TODAY, 'number:3', true);
    expect(j.learned['number:3']).toBe('2026-11-01');
  });

  it('summarizes the week and prunes old days', () => {
    const j = newJournal();
    addTime(j, TODAY, 600);
    addTask(j, TODAY, 'counting', 1);
    addTask(j, shiftDay(TODAY, -2), 'colors', 0);
    addTask(j, shiftDay(TODAY, -200), 'colors', 0);
    prune(j, TODAY);
    const s = summarize(j, shiftDay(TODAY, -6), TODAY);
    expect(s).toMatchObject({ days: 2, sec: 600, tasks: 2 });
    expect(Object.keys(j.days)).toHaveLength(2);
  });
});

describe('parent report', () => {
  it('describes skills by name, without gender-dependent forms', () => {
    const j = newJournal();
    for (const n of [1, 2, 3, 4, 5]) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `number:${n}`, true);
    for (let i = 0; i < 4; i++) noteFact(j, TODAY, 'number:7', i % 2 === 0);
    for (let i = 0; i < 3; i++) noteFact(j, TODAY, 'color:green', true);
    noteFact(j, TODAY, 'letter:A', true);
    addTask(j, TODAY, 'counting', 2);
    addTime(j, TODAY, 1200);
    const r = makeReport({ journal: j, levels: {}, name: 'Zosia', today: TODAY });
    const numbers = r.skills.find((s) => s.domain === 'numbers')!;
    expect(numbers.lines[0]).toBe('Zosia liczy bez pomyłek do 5.');
    expect(numbers.lines[1]).toContain('7');
    expect(r.skills.find((s) => s.domain === 'colors')!.lines[0]).toBe('Zosia rozpoznaje kolory: zielony.');
    expect(r.skills.find((s) => s.domain === 'letters')!.lines.join(' ')).toContain('Narysowane literki: A');
    expect(r.weekText).toContain('1 dzień zabawy, razem 20 min');
    expect(r.highlights[0]).toBe('Liczenie do 5');
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/nauczyła|nauczył|bawiła|bawił/);
  });

  it('no data: encouragement instead of emptiness, tips are always there', () => {
    const r = makeReport({ journal: newJournal(), levels: {}, today: TODAY });
    expect(r.who).toBe('Dziecko');
    expect(r.skills.every((s) => s.lines.length > 0 && s.stars === 0)).toBe(true);
    expect(r.tips).toHaveLength(2);
    expect(r.highlights).toEqual([]);
  });

  it('tips target the weakest domain', () => {
    const j = newJournal();
    for (const c of ['green', 'red']) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `color:${c}`, true);
    for (const n of [1, 2]) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `number:${n}`, true);
    for (let i = 0; i < 4; i++) noteFact(j, TODAY, 'phoneme:sz', false);
    for (const e of ['happy']) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `emotion:${e}`, true);
    noteFact(j, TODAY, 'shape:circle', true);
    const r = makeReport({ journal: j, levels: { patterns: 1 }, today: TODAY });
    // Logic and phonemes are the weakest (0 and 1 star).
    expect(r.tips.length).toBe(2);
    expect(r.skills.find((s) => s.domain === 'letters')!.stars).toBe(1);
  });
});

describe('counting with gaps', () => {
  it('does not say "up to 7" when smaller numbers are not mastered', () => {
    const j = newJournal();
    for (const n of [5, 7]) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `number:${n}`, true);
    addTask(j, TODAY, 'counting', 0);
    const r = makeReport({ journal: j, levels: {}, name: 'Staś', today: TODAY });
    expect(r.skills[0]!.lines[0]).toBe('Staś bez pomyłek liczy zbiory po 5, 7 przedmiotów, mniejsze liczby jeszcze ćwiczy.');
    expect(r.highlights[0]).toBe('Policzone bez pomyłki: 5, 7');
  });
});

describe('guessing and specifics', () => {
  it('a correct pick out of two counts as half', () => {
    expect(mastered('hhh')).toBe(false);
    expect(mastered('hhhhhh')).toBe(true);
    expect(mastered('0h11')).toBe(false);
    expect(mastered('0h111')).toBe(true);
    const j = newJournal();
    for (let i = 0; i < 3; i++) noteFact(j, TODAY, 'color:green', true, true);
    expect(j.learned['color:green']).toBeUndefined();
  });

  it('logic: specific puzzles with count and quality', () => {
    const j = newJournal();
    for (let i = 0; i < 6; i++) addTask(j, TODAY, 'stories', 0);
    for (let i = 0; i < 2; i++) addTask(j, TODAY, 'memory', 2);
    const r = makeReport({ journal: j, levels: {}, today: TODAY });
    const logic = r.skills.find((s) => s.domain === 'logic')!;
    expect(logic.lines[0]).toBe('Układa historyjki w dobrej kolejności: 6 historyjek, prawie bez pomyłek.');
    expect(logic.lines[1]).toBe('Znajduje pary w grze w pary: 2 plansze, jeszcze często z pomyłkami.');
  });

  it('first times go into the report and onto the postcard', () => {
    const j = newJournal();
    addTask(j, shiftDay(TODAY, -20), 'letters', 0);
    addTask(j, TODAY, 'stories', 0);
    addTask(j, TODAY, 'letters', 0);
    const r = makeReport({ journal: j, levels: {}, today: TODAY });
    expect(r.firsts).toEqual(['pierwsza ułożona historyjka']);
    expect(r.highlights[0]).toBe('Pierwsza ułożona historyjka');
  });
});

describe('postcard dates', () => {
  it('formatuje zakres tygodnia', async () => {
    const { formatRange } = await import('./report.ts');
    expect(formatRange('2026-11-15', '2026-11-21')).toBe('15–21 listopada 2026');
    expect(formatRange('2026-11-28', '2026-12-04')).toBe('28 listopada – 4 grudnia 2026');
    expect(formatRange('2026-12-29', '2027-01-04')).toBe('29 grudnia 2026 – 4 stycznia 2027');
  });
});
