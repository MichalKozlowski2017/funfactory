import { describe, expect, it } from 'vitest';
import { Rng } from '@funfactory/core';
import { firstSound, ITEMS } from './catalog.ts';
import { MAX_LEVEL, PUZZLE_KINDS, ROUND_LENGTH, colorQuestion, countQuestion, isCorrect, makeRound, maxCount, motherQuestion, nextLevel, oddQuestion, optionCount, questionKey, shadowQuestion, soundQuestion } from './puzzles.ts';

const levels = [0, 1, 2];

describe('katalog', () => {
  it('ma unikalne id i każda kategoria do „co nie pasuje” ma co najmniej 3 obiekty', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    const counts = new Map<string, number>();
    for (const i of ITEMS) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    expect([...counts.values()].filter((n) => n >= 3).length).toBeGreaterThanOrEqual(3);
  });
});

describe('cienie', () => {
  it('cel jest wśród odpowiedzi, odpowiedzi są różne i mają sylwetkę', () => {
    const rng = new Rng(1);
    for (const level of levels)
      for (let i = 0; i < 200; i++) {
        const q = shadowQuestion(rng, level);
        expect(q.options).toContain(q.target);
        expect(new Set(q.options).size).toBe(optionCount(level));
        expect(q.options.every((o) => o.shadow)).toBe(true);
      }
  });
});

describe('co nie pasuje', () => {
  it('dokładnie jeden obiekt jest z innej kategorii', () => {
    const rng = new Rng(2);
    for (const level of levels)
      for (let i = 0; i < 200; i++) {
        const q = oddQuestion(rng, level);
        const rest = q.options.filter((o) => o !== q.odd);
        expect(new Set(rest.map((o) => o.category)).size).toBe(1);
        expect(rest[0]!.category).not.toBe(q.odd.category);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
      }
  });
});

describe('liczenie', () => {
  it('prawidłowa liczba jest wśród odpowiedzi, w zakresie poziomu, bez powtórzeń', () => {
    const rng = new Rng(3);
    for (const level of levels)
      for (let i = 0; i < 300; i++) {
        const q = countQuestion(rng, level);
        expect(q.count).toBeGreaterThanOrEqual(1);
        expect(q.count).toBeLessThanOrEqual(maxCount(level));
        expect(q.options).toContain(q.count);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.every((n) => n >= 1)).toBe(true);
        expect(q.item.countable).toBe(true);
        expect(isCorrect(q, q.count)).toBe(true);
      }
  });
});

describe('runda i trudność', () => {
  it('runda ma 5 pytań bez powtórzeń obiektu przewodniego', () => {
    for (const kind of PUZZLE_KINDS)
      for (let s = 1; s < 30; s++) {
        const round = makeRound(kind, new Rng(s), 1);
        expect(round).toHaveLength(ROUND_LENGTH);
        expect(new Set(round.map(questionKey)).size).toBe(ROUND_LENGTH);
      }
  });

  it('bez błędów poziom rośnie, przy wielu spada, w granicach', () => {
    expect(nextLevel(0, 0)).toBe(1);
    expect(nextLevel(MAX_LEVEL, 0)).toBe(MAX_LEVEL);
    expect(nextLevel(1, 1)).toBe(1);
    expect(nextLevel(1, 3)).toBe(0);
    expect(nextLevel(0, 5)).toBe(0);
  });
});

describe('kolory, głoski, mamy', () => {
  it('kolory: dokładnie jeden obiekt ma pytany kolor', () => {
    const rng = new Rng(4);
    for (const level of levels)
      for (let i = 0; i < 300; i++) {
        const q = colorQuestion(rng, level);
        expect(q.options.filter((o) => o.color === q.color)).toEqual([q.target]);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
      }
  });

  it('głoski: dokładnie jeden obiekt zaczyna się na pytaną głoskę', () => {
    const rng = new Rng(5);
    for (const level of levels)
      for (let i = 0; i < 300; i++) {
        const q = soundQuestion(rng, level);
        expect(q.options.filter((o) => firstSound(o.name) === q.sound)).toEqual([q.target]);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
  });

  it('pierwsza głoska: dwuznaki i rz', () => {
    expect(firstSound('Szalik')).toBe('sz');
    expect(firstSound('Rzodkiewka')).toBe('ż');
    expect(firstSound('Czapka')).toBe('cz');
    expect(firstSound('Żaba')).toBe('ż');
    expect(firstSound('Kot')).toBe('k');
  });

  it('mamy: odpowiedź to mama, zmyłki to inne dorosłe zwierzęta', () => {
    const rng = new Rng(6);
    for (const level of levels)
      for (let i = 0; i < 200; i++) {
        const q = motherQuestion(rng, level);
        expect(q.target.id).toBe(q.baby.mother);
        expect(q.options).toContain(q.target);
        expect(q.options.every((o) => o.category === 'zwierzeta' && !o.mother)).toBe(true);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(isCorrect(q, q.target)).toBe(true);
      }
  });

  it('każda mama istnieje w katalogu', () => {
    for (const baby of ITEMS.filter((i) => i.mother)) expect(ITEMS.some((i) => i.id === baby.mother)).toBe(true);
  });
});
