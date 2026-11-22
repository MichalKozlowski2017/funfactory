import { describe, expect, it } from 'vitest';
import { Rng } from '@funfactory/core';
import { ITEM_NAMES } from './names.ts';
import { ITEMS } from './catalog.ts';
import { dotCount, evenDots, hitsDot, makeDotsRound, radialContour, traceContour, DOTS_ROUND } from './dots.ts';
import { canStep, makeMaze, makeMazeRound, MAZE_PAIRS, MAZE_ROUND, mazeSize, path } from './maze.ts';

describe('łączenie kropek', () => {
  /** Koło o promieniu 20 na masce 64×64. */
  const disc = () => {
    const w = 64;
    const m = new Uint8Array(w * w);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - 32, y - 32) <= 20) m[y * w + x] = 1;
    return { m, w };
  };

  it('kontur koła leży na jego brzegu', () => {
    const { m, w } = disc();
    const c = radialContour(m, w, w, 72);
    expect(c.length).toBe(72);
    for (const p of c) expect(Math.hypot(p.x * w - 32, p.y * w - 32)).toBeCloseTo(20, -0.5);
  });

  it('kropki równo po obwodzie, pierwsza na górze', () => {
    const { m, w } = disc();
    const dots = evenDots(radialContour(m, w, w), 8);
    expect(dots.length).toBe(8);
    expect(dots[0]!.y).toBeLessThan(0.25);
    const gaps = dots.map((d, i) => Math.hypot(dots[(i + 1) % 8]!.x - d.x, dots[(i + 1) % 8]!.y - d.y));
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 2);
  });

  it('liczba kropek rośnie z poziomem do dziesięciu, runda bez powtórzeń', () => {
    expect([0, 1, 2].map(dotCount)).toEqual([5, 8, 10]);
    const round = makeDotsRound(new Rng(2));
    expect(round.length).toBe(DOTS_ROUND);
    expect(new Set(round).size).toBe(DOTS_ROUND);
    expect(hitsDot({ x: 10, y: 10 }, { x: 40, y: 10 }, 40)).toBe(true);
  });
});

describe('labirynt', () => {
  it('z każdego pola da się dojść do każdego (labirynt doskonały)', () => {
    const rng = new Rng(4);
    for (const level of [0, 1, 2])
      for (let i = 0; i < 30; i++) {
        const { cols, rows } = mazeSize(level);
        const maze = makeMaze(rng, cols, rows);
        const route = path(maze, 0, 0, cols - 1, rows - 1);
        expect(route[0]).toEqual([0, 0]);
        expect(route[route.length - 1]).toEqual([cols - 1, rows - 1]);
        for (let k = 1; k < route.length; k++) expect(canStep(maze, ...route[k - 1]!, ...route[k]!)).toBe(true);
        // Doskonały: liczba przejść = liczba pól - 1.
        let open = 0;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) open += maze.walls[r]![c]!.filter((w) => !w).length;
        expect(open / 2).toBe(cols * rows - 1);
      }
  });

  it('pary bohater–cel istnieją w katalogu', () => {
    for (const [a, b] of MAZE_PAIRS) {
      expect(ITEMS.some((i) => i.id === a)).toBe(true);
      expect(ITEMS.some((i) => i.id === b)).toBe(true);
    }
    expect(makeMazeRound(new Rng(1)).length).toBe(MAZE_ROUND);
  });
});

describe('memory', () => {
  it('każdy obrazek dokładnie dwa razy, bez podobnych, cienie na najwyższym poziomie', async () => {
    const { makeMemoryBoard, pairCount, memoryGrid, memoryMistakes } = await import('./memory.ts');
    const { lookalike } = await import('./catalog.ts');
    const rng = new Rng(8);
    for (const level of [0, 1, 2])
      for (let i = 0; i < 50; i++) {
        const board = makeMemoryBoard(rng, level);
        expect(board.length).toBe(pairCount(level) * 2);
        const ids = new Map<string, number>();
        for (const c of board) ids.set(c.item.id, (ids.get(c.item.id) ?? 0) + 1);
        expect([...ids.values()].every((n) => n === 2)).toBe(true);
        const items = [...new Set(board.map((c) => c.item))];
        for (const a of items) for (const b of items) if (a !== b) expect(lookalike(a, b)).toBe(false);
        const g = memoryGrid(board.length);
        expect(g.cols * g.rows).toBeGreaterThanOrEqual(board.length);
      }
    expect(memoryMistakes(3, 4)).toBe(0);
    expect(memoryMistakes(12, 4)).toBe(4);
  });
});

describe('kontur kropek po krawędzi', () => {
  it('kontur litery L idzie w głąb wklęsłości, a nie na skróty', () => {
    // Maska w kształcie L: kreska pionowa i pozioma.
    const w = 60;
    const m = new Uint8Array(w * w);
    for (let y = 5; y < 55; y++) for (let x = 5; x < 15; x++) m[y * w + x] = 1;
    for (let y = 45; y < 55; y++) for (let x = 5; x < 55; x++) m[y * w + x] = 1;
    const c = traceContour(m, w, w);
    expect(c.length).toBeGreaterThan(20);
    // Każdy punkt konturu leży przy masce (żaden nie wisi w pustym rogu L).
    for (const p of c) {
      const x = Math.round(p.x * w);
      const y = Math.round(p.y * w);
      expect(x < 18 || y > 42, `${x},${y}`).toBe(true);
    }
  });
});

describe('litery po śladzie', () => {
  it('litery mają obrazki w katalogu, kreski w polu 0..1, runda bez powtórzeń', async () => {
    const { LETTERS, makeLetterRound, LETTER_ROUND, resample, advance, lettersOf } = await import('./letters.ts');
    // Obrazek każdej litery (w każdym języku) jest w katalogu; litera bez obrazka w danym języku wypada.
    for (const lang of ['pl', 'en', 'de', 'es'] as const)
      for (const x of lettersOf(lang)) {
        const item = ITEMS.find((i) => i.id === x.item);
        expect(item, `${lang} ${x.ch}`).toBeDefined();
        // Nazwa obrazka w tym języku zaczyna się na tę literę (bez akcentów: „Árbol” na A).
        const name = lang === 'pl' ? item!.name : ITEM_NAMES[item!.id]![lang];
        expect(name.normalize('NFD')[0]!.toUpperCase(), `${lang} ${x.ch} ${name}`).toBe(x.ch);
      }
    for (const l of LETTERS) {
      for (const s of l.strokes) for (const [x, y] of s) {
        expect(x).toBeGreaterThanOrEqual(-0.01);
        expect(x).toBeLessThanOrEqual(1.01);
        expect(y).toBeGreaterThanOrEqual(-0.01);
        expect(y).toBeLessThanOrEqual(1.01);
      }
    }
    for (const level of [0, 1, 2]) {
      const round = makeLetterRound(new Rng(level + 1), level);
      expect(round.length).toBe(LETTER_ROUND);
      expect(new Set(round).size).toBe(LETTER_ROUND);
      expect(round.every((x) => x.level <= level)).toBe(true);
    }
    // Postęp: palec wzdłuż kreski idzie do końca, palec daleko nie przesuwa.
    const pts = resample([[0, 0], [0, 1]], 0.05);
    let at = 0;
    for (let y = 0; y <= 1.0001; y += 0.04) at = advance(pts, at, [0.02, y], 0.1);
    expect(at).toBe(pts.length - 1);
    expect(advance(pts, 0, [0.5, 0.5], 0.1)).toBe(0);
  });
});

describe('cyfry po śladzie', () => {
  it('10 cyfr, runda bez powtórzeń z poziomu dziecka', async () => {
    const { DIGITS, makeDigitRound, LETTER_ROUND } = await import('./letters.ts');
    expect(DIGITS.map((d) => d.ch).sort().join('')).toBe('0123456789');
    for (const level of [0, 1, 2]) {
      const r = makeDigitRound(new Rng(level + 3), level);
      expect(r.length).toBe(LETTER_ROUND);
      expect(new Set(r).size).toBe(LETTER_ROUND);
      expect(r.every((d) => d.level <= level)).toBe(true);
    }
  });
});

describe('emocje', () => {
  it('dobra minka wśród odpowiedzi, bez powtórzeń z rzędu', async () => {
    const { makeEmotionRound, EMOTION_ROUND } = await import('./emotions.ts');
    for (const level of [0, 1, 2]) {
      const r = makeEmotionRound(new Rng(level + 9), level);
      expect(r.length).toBe(EMOTION_ROUND);
      for (const [i, q] of r.entries()) {
        expect(q.options).toContain(q.target);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.length).toBe([2, 3, 4][level]);
        if (i > 0) expect(q.target).not.toBe(r[i - 1]!.target);
      }
    }
  });
});
