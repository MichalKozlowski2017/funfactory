import { describe, expect, it } from 'vitest';
import { addTask, addTempo, newJournal } from './journal.ts';

describe('dziennik do statystyk', () => {
  it('liczy zadania bez pomyłki i zapamiętuje poziom dnia', () => {
    const j = newJournal();
    addTask(j, '2026-11-24', 'kolory', 0, 1);
    addTask(j, '2026-11-24', 'kolory', 2, 1);
    addTask(j, '2026-11-24', 'kolory', 0, 2);
    const d = j.days['2026-11-24']!;
    expect(d.acts.kolory).toBe(3);
    expect(d.clean?.kolory).toBe(2);
    expect(d.lvl?.kolory).toBe(2);
  });

  it('czasy odpowiedzi w dziesiątych sekundy, z limitem na dzień', () => {
    const j = newJournal();
    for (let i = 0; i < 50; i++) addTempo(j, '2026-11-24', 'kolor', 1, 1.26);
    expect(j.days['2026-11-24']!.ms?.['kolor@1']).toHaveLength(40);
    expect(j.days['2026-11-24']!.ms?.['kolor@1']?.[0]).toBe(13);
  });
});
