import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { dictionaries } from './i18n.ts';
import { setLang } from './lang.ts';
import { addTask, addTime, newJournal, noteFact } from './journal.ts';
import { ACTIVITY_NAMES, REALMS } from './realms.ts';
import { SKILLS } from './skills.ts';
import { formatRange, makeReport } from './report.ts';

const SRC = join(import.meta.dirname, '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') && !p.endsWith('.test.ts') ? [p] : [];
  });

/** Polskie teksty przekazywane do tr(): literały z kodu oraz nazwy krain i zabaw. */
function keys(): string[] {
  const out = new Set<string>([...Object.values(ACTIVITY_NAMES), ...REALMS.map((r) => r.name), ...SKILLS.flatMap((s) => [s.name, s.tip])]);
  for (const f of files(SRC)) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\btr\('((?:[^'\\]|\\.)*)'/g)) out.add(m[1]!.replace(/\\n/g, '\n').replace(/\\'/g, "'"));
  }
  return [...out];
}

afterEach(() => setLang('pl'));

describe('tłumaczenia', () => {
  it('każdy tekst na ekranie ma tłumaczenie angielskie i niemieckie', () => {
    for (const [l, dict] of Object.entries(dictionaries)) {
      const missing = keys().filter((k) => !(k in dict));
      expect(missing, `brak w ${l}`).toEqual([]);
    }
  });

  it('w kodzie ekranów nie ma polskich napisów poza tr()', () => {
    const ui = [join(SRC, 'parent.ts'), ...files(join(SRC, 'scenes'))];
    const bad: string[] = [];
    for (const f of ui) {
      // Bez komentarzy: tylko kod.
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const m of code.matchAll(/'([^'\n]*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ][^'\n]*)'/g))
        if (code.slice(Math.max(0, m.index - 3), m.index) !== 'tr(' && !(m[1]! in dictionaries.en)) bad.push(`${f.split('/').pop()}: ${m[1]}`);
    }
    expect(bad).toEqual([]);
  });

  it('raport po angielsku i niemiecku bez polskich słów', () => {
    const j = newJournal();
    const day = '2026-11-21';
    for (const n of [1, 2, 3, 4]) for (let i = 0; i < 3; i++) noteFact(j, day, `number:${n}`, true);
    for (let i = 0; i < 3; i++) noteFact(j, day, 'color:green', true);
    for (let i = 0; i < 4; i++) noteFact(j, day, 'phoneme:m', i % 2 === 0);
    noteFact(j, day, 'letter:A', true);
    for (let i = 0; i < 4; i++) addTask(j, day, 'stories', i % 2);
    addTask(j, day, 'coloring', 0);
    addTime(j, day, 900);
    const first = { en: 'Sam counts up to 4 without mistakes.', de: 'Sam zählt fehlerfrei bis 4.', es: 'Sam cuenta hasta 4 sin errores.' };
    for (const l of ['en', 'de', 'es'] as const) {
      setLang(l);
      const r = makeReport({ journal: j, levels: {}, name: 'Sam', today: day });
      const text = JSON.stringify([r.weekText, r.skills.map((s) => [s.title, s.lines]), r.tips, r.highlights, r.firsts]);
      // Hiszpański też ma „ó”, więc sprawdzamy litery typowo polskie.
      expect(text, l).not.toMatch(/[ąćęłńśźż]|Dziecko|liczy|kolory|tygodni/);
      expect(r.skills[0]!.lines[0]).toBe(first[l]);
    }
  });

  it('daty tygodnia w każdym języku', () => {
    setLang('en');
    expect(formatRange('2026-11-15', '2026-11-21')).toBe('November 15–21, 2026');
    setLang('de');
    expect(formatRange('2026-11-28', '2026-12-04')).toBe('28. November – 4. Dezember 2026');
    setLang('es');
    expect(formatRange('2026-11-15', '2026-11-21')).toBe('15–21 de noviembre de 2026');
  });
});
