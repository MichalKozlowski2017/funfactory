import { Rng } from '@funfactory/core';
import { CLASSES } from './data.ts';
import { Run, type Defender } from './run.ts';

export type Placement = 'smart' | 'random';

export interface BotResult {
  won: boolean;
  wave: number;
  gate: number;
  fallen: number;
  maxBond: number;
}

/** Ile punktów drogi (co 20 jednostek) widzi stanowisko w danym zasięgu. */
function coverage(run: Run, slot: number, range: number): number {
  const s = run.map.slots[slot];
  if (!s) return 0;
  let n = 0;
  for (let d = 0; d <= run.map.path.length; d += 20) {
    const p = run.map.path.at(d);
    if (Math.hypot(p.x - s.x, p.y - s.y) <= range) n++;
  }
  return n;
}

/** Ustawienie drużyny: „mądre” (heurystyka) albo losowe. */
export function arrange(run: Run, mode: Placement, rng: Rng): void {
  const alive = run.party.filter((d) => d.alive);
  for (const d of alive) run.place(d.id, null);
  const free = new Set(run.map.slots.map((s) => s.id));
  const take = (d: Defender, slot: number | undefined) => {
    if (slot === undefined) return;
    run.place(d.id, slot);
    free.delete(slot);
  };
  if (mode === 'random') {
    for (const d of rng.shuffle([...alive])) take(d, rng.shuffle([...free])[0]);
    return;
  }
  const byPathEnd = (a: number, b: number) =>
    run.map.path.project(run.map.slots[b] as { x: number; y: number }).d - run.map.path.project(run.map.slots[a] as { x: number; y: number }).d;
  // Rycerze: blokujące stanowiska najbliżej bramy.
  for (const k of alive.filter((d) => d.cls === 'knight')) {
    take(k, [...free].filter((s) => run.canBlock(s)).sort(byPathEnd)[0]);
  }
  // Kapłanki: obok rycerza.
  for (const p of alive.filter((d) => d.cls === 'priestess')) {
    const knightSlots = alive.filter((d) => d.cls === 'knight' && d.slot !== null).map((d) => d.slot as number);
    const near = [...free].find((s) => knightSlots.some((k) => run.map.slots[k]?.neighbors.includes(s)));
    take(p, near ?? [...free][0]);
  }
  // Strzelcy: najlepsze pokrycie drogi.
  for (const d of alive.filter((x) => x.cls === 'archer' || x.cls === 'mage')) {
    take(d, [...free].sort((a, b) => coverage(run, b, CLASSES[d.cls].range) - coverage(run, a, CLASSES[d.cls].range))[0]);
  }
}

export function playBot(seed: number, mode: Placement = 'smart'): BotResult {
  const run = new Run(seed);
  const rng = new Rng(seed * 31 + 7);
  for (let guard = 0; guard < 50 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
    if (run.phase === 'plan') {
      arrange(run, mode, rng);
      run.startWave();
    }
    for (let t = 0; t < 600 && run.phase === 'wave'; t += 1 / 30) run.step(1 / 30);
    if (run.phase === 'reward') {
      // Prosta polityka: rekrutuj do 6 osób, potem wzmocnienia.
      const alive = run.party.filter((d) => d.alive).length;
      let pick = run.rewards.findIndex((r) => r.kind === 'recruit' && alive < 6);
      if (pick < 0) pick = run.rewards.findIndex((r) => r.kind === 'sharpen' || r.kind === 'train');
      run.chooseReward(Math.max(0, pick));
    }
  }
  return {
    won: run.phase === 'won',
    wave: run.wave,
    gate: run.gate,
    fallen: run.party.filter((d) => !d.alive).length,
    maxBond: Math.max(0, ...run.bonds.values()),
  };
}
