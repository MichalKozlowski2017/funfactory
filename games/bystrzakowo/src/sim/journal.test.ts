import { describe, expect, it } from 'vitest';
import { addTask, addTempo, newJournal } from './journal.ts';

describe('dziennik do statystyk', () => {
  it('liczy zadania bez pomyłki i zapamiętuje poziom dnia', () => {
    const j = newJournal();
    addTask(j, '2026-11-24', 'colors', 0, 1);
    addTask(j, '2026-11-24', 'colors', 2, 1);
    addTask(j, '2026-11-24', 'colors', 0, 2);
    const d = j.days['2026-11-24']!;
    expect(d.acts.colors).toBe(3);
    expect(d.clean?.colors).toBe(2);
    expect(d.lvl?.colors).toBe(2);
  });

  it('czasy odpowiedzi w dziesiątych sekundy, z limitem na dzień', () => {
    const j = newJournal();
    for (let i = 0; i < 50; i++) addTempo(j, '2026-11-24', 'color', 1, 1.26);
    expect(j.days['2026-11-24']!.ms?.['color@1']).toHaveLength(40);
    expect(j.days['2026-11-24']!.ms?.['color@1']?.[0]).toBe(13);
  });
});
