import { describe, expect, it } from 'vitest';
import { addTask, addTime, mastered, newJournal, noteFact, prune, shiftDay, struggling, summarize } from './journal.ts';
import { makeReport } from './report.ts';

const TODAY = '2026-11-21';

describe('dziennik', () => {
  it('opanowanie: trzy dobre odpowiedzi z rzędu', () => {
    expect(mastered('011')).toBe(false);
    expect(mastered('0111')).toBe(true);
    expect(struggling('1010')).toBe(true);
    expect(struggling('1101')).toBe(false);
  });

  it('zapamiętuje dzień opanowania tylko raz', () => {
    const j = newJournal();
    for (let i = 0; i < 3; i++) noteFact(j, '2026-11-01', 'liczba:3', true);
    noteFact(j, TODAY, 'liczba:3', true);
    expect(j.learned['liczba:3']).toBe('2026-11-01');
  });

  it('podsumowuje tydzień i usuwa stare dni', () => {
    const j = newJournal();
    addTime(j, TODAY, 600);
    addTask(j, TODAY, 'liczenie', 1);
    addTask(j, shiftDay(TODAY, -2), 'kolory', 0);
    addTask(j, shiftDay(TODAY, -200), 'kolory', 0);
    prune(j, TODAY);
    const s = summarize(j, shiftDay(TODAY, -6), TODAY);
    expect(s).toMatchObject({ days: 2, sec: 600, tasks: 2 });
    expect(Object.keys(j.days)).toHaveLength(2);
  });
});

describe('raport dla rodzica', () => {
  it('opisuje umiejętności po imieniu, bez form zależnych od płci', () => {
    const j = newJournal();
    for (const n of [1, 2, 3, 4, 5]) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `liczba:${n}`, true);
    for (let i = 0; i < 4; i++) noteFact(j, TODAY, 'liczba:7', i % 2 === 0);
    for (let i = 0; i < 3; i++) noteFact(j, TODAY, 'kolor:zielony', true);
    noteFact(j, TODAY, 'litera:A', true);
    addTask(j, TODAY, 'liczenie', 2);
    addTime(j, TODAY, 1200);
    const r = makeReport({ journal: j, levels: {}, name: 'Zosia', today: TODAY });
    const liczby = r.skills.find((s) => s.domain === 'liczby')!;
    expect(liczby.lines[0]).toBe('Zosia liczy bez pomyłek do 5.');
    expect(liczby.lines[1]).toContain('7');
    expect(r.skills.find((s) => s.domain === 'kolory')!.lines[0]).toBe('Zosia rozpoznaje kolory: zielony.');
    expect(r.skills.find((s) => s.domain === 'litery')!.lines.join(' ')).toContain('Narysowane literki: A');
    expect(r.weekText).toContain('1 dzień zabawy, razem 20 min');
    expect(r.highlights[0]).toBe('Liczenie do 5');
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/nauczyła|nauczył|bawiła|bawił/);
  });

  it('bez danych: zachęta zamiast pustki, wskazówki zawsze są', () => {
    const r = makeReport({ journal: newJournal(), levels: {}, today: TODAY });
    expect(r.who).toBe('Dziecko');
    expect(r.skills.every((s) => s.lines.length > 0 && s.stars === 0)).toBe(true);
    expect(r.tips).toHaveLength(2);
    expect(r.highlights).toEqual([]);
  });

  it('wskazówki dotyczą najsłabszej dziedziny', () => {
    const j = newJournal();
    for (const c of ['zielony', 'czerwony']) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `kolor:${c}`, true);
    for (const n of [1, 2]) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `liczba:${n}`, true);
    for (let i = 0; i < 4; i++) noteFact(j, TODAY, 'gloska:sz', false);
    for (const e of ['wesoly']) for (let i = 0; i < 3; i++) noteFact(j, TODAY, `emocja:${e}`, true);
    noteFact(j, TODAY, 'ksztalt:kolo', true);
    const r = makeReport({ journal: j, levels: { wzory: 1 }, today: TODAY });
    // Logika i głoski najsłabsze (0 i 1 gwiazdka).
    expect(r.tips.length).toBe(2);
    expect(r.skills.find((s) => s.domain === 'litery')!.stars).toBe(1);
  });
});

describe('daty na pocztówce', () => {
  it('formatuje zakres tygodnia', async () => {
    const { formatRange } = await import('./report.ts');
    expect(formatRange('2026-11-15', '2026-11-21')).toBe('15–21 listopada 2026');
    expect(formatRange('2026-11-28', '2026-12-04')).toBe('28 listopada – 4 grudnia 2026');
    expect(formatRange('2026-12-29', '2027-01-04')).toBe('29 grudnia 2026 – 4 stycznia 2027');
  });
});
