/**
 * Różnorodność zabaw: ile różnych treści widzi dziecko i jak szybko rundy się powtarzają.
 * Dla każdej zabawy, poziomu (0–2) i języka symuluje 300 kolejnych rund i liczy:
 *   pula      – ile różnych elementów (obiekt przewodni, litera, słowo, kształt…) w ogóle się pojawia,
 *   powt.     – średni odsetek elementów rundy, które były już w poprzedniej rundzie,
 *   identyczne – odsetek rund z dokładnie tym samym zestawem co poprzednia,
 *   90%       – po ilu rundach dziecko zobaczy 90% puli.
 *   node games/bystrzakowo/scripts/variety.ts
 */
import { Rng } from '@funfactory/core';
import { setLang, LANGS, type Lang } from '../src/sim/lang.ts';
import { makeRound, PUZZLE_KINDS, type Question } from '../src/sim/puzzles.ts';
import { makeEmotionRound } from '../src/sim/emotions.ts';
import { makePatternRound } from '../src/sim/patterns.ts';
import { makeShapeBoard, SHAPE_ROUND } from '../src/sim/shapes.ts';
import { makeSortRound } from '../src/sim/sorting.ts';
import { makeJigsawRound } from '../src/sim/jigsaw.ts';
import { makeDotsRound } from '../src/sim/dots.ts';
import { makeMazeRound } from '../src/sim/maze.ts';
import { makeLetterRound, makeDigitRound } from '../src/sim/letters.ts';
import { makeSyllableRound } from '../src/sim/syllables.ts';
import { makeMemoryBoard, MEMORY_ROUND } from '../src/sim/memory.ts';
import { makeMelody, MELODY_ROUND } from '../src/sim/melody.ts';
import { makeStoryRound, markStoriesSeen, STORIES, STORY_ROUND } from '../src/sim/stories.ts';

const N = 300;
type Gen = (rng: Rng, level: number) => string[];

const qKey = (q: Question): string => {
  if (q.kind === 'kolory') return `${q.color}:${q.target.id}`;
  if (q.kind === 'gloski') return `${q.sound}:${q.target.id}`;
  if (q.kind === 'liczenie') return `${q.count}×${q.item.id}`;
  if (q.kind === 'pasuje') return q.odd.id;
  if (q.kind === 'mamy') return q.baby.id;
  return q.target.id;
};

const GENS: Record<string, { gen: Gen; langs?: boolean; levels?: number[] }> = {
  ...Object.fromEntries(PUZZLE_KINDS.map((k) => [k, { gen: (r: Rng, l: number) => makeRound(k, r, l).map(qKey), langs: k === 'gloski' }])),
  emocje: { gen: (r, l) => makeEmotionRound(r, l).map((q) => `${q.target}:${q.char}`) },
  wzory: { gen: (r, l) => makePatternRound(r, l).map((t) => [...new Set(t.row.map((i) => i.id))].sort().join('+')) },
  ksztalty: { gen: (r, l) => Array.from({ length: SHAPE_ROUND }, () => makeShapeBoard(r, l).slice().sort().join('+')) },
  sortowanie: { gen: (r, l) => makeSortRound(r, l).map((t) => `${t.rule}:${t.bins.map((b) => b.key).sort().join('/')}`) },
  ukladanka: { gen: (r) => makeJigsawRound(r).map((i) => i.id), levels: [0] },
  kropki: { gen: (r) => makeDotsRound(r).map((i) => i.id), levels: [0] },
  labirynt: { gen: (r) => makeMazeRound(r).map(([a]) => a), levels: [0] },
  litery: { gen: (r, l) => makeLetterRound(r, l).map((x) => x.ch), langs: true },
  cyfry: { gen: (r, l) => makeDigitRound(r, l).map((x) => x.ch) },
  sylaby: { gen: (r, l) => makeSyllableRound(r, l).map((w) => w.item), langs: true },
  memory: { gen: (r, l) => Array.from({ length: MEMORY_ROUND }, () => makeMemoryBoard(r, l)).flatMap((b) => [...new Set(b.map((c) => c.item.id))]) },
  melodia: { gen: (r, l) => Array.from({ length: MELODY_ROUND }, (_, i) => makeMelody(r, l, i).join('')) },
};

function measure(gen: Gen, level: number): { pool: number; rep: number; same: number; to90: number } {
  const rng = new Rng(7);
  const seen = new Map<string, number>();
  let prev: string[] = [];
  let rep = 0;
  let same = 0;
  const firstSeen: number[] = [];
  for (let i = 0; i < N; i++) {
    const round = gen(rng, level);
    for (const k of round)
      if (!seen.has(k)) {
        seen.set(k, i);
        firstSeen.push(i);
      }
    if (i > 0) {
      rep += round.filter((k) => prev.includes(k)).length / round.length;
      if ([...round].sort().join() === [...prev].sort().join()) same++;
    }
    prev = round;
  }
  const to90 = firstSeen[Math.ceil(firstSeen.length * 0.9) - 1]! + 1;
  return { pool: seen.size, rep: rep / (N - 1), same: same / (N - 1), to90 };
}

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
console.log('zabawa            jęz poz  pula  powt.  ident.  90%');
for (const [name, g] of Object.entries(GENS)) {
  const langs: Lang[] = g.langs ? [...LANGS] : ['pl'];
  for (const l of langs) {
    setLang(l);
    for (const level of g.levels ?? [0, 1, 2]) {
      const m = measure(g.gen, level);
      console.log(`${name.padEnd(17)} ${l}  ${level}  ${String(m.pool).padStart(5)} ${pct(m.rep)}  ${pct(m.same)}  ${String(m.to90).padStart(4)}`);
    }
  }
}
setLang('pl');
// Historyjki: z pamięcią widzianych (jak w grze).
{
  const rng = new Rng(7);
  let seen: string[] = [];
  let prev: string[] = [];
  let rep = 0;
  for (let i = 0; i < N; i++) {
    const r = makeStoryRound(rng, seen);
    seen = markStoriesSeen(seen, r);
    if (i) rep += r.filter((s) => prev.includes(s)).length / r.length;
    prev = [...r];
  }
  console.log(`historyjki        pl  -  ${String(STORIES.length).padStart(5)} ${pct(rep / (N - 1))}      -  ${String(Math.ceil((STORIES.length * 0.9) / STORY_ROUND)).padStart(4)}`);
}
