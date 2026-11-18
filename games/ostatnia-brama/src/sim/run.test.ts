import { describe, expect, it } from 'vitest';
import { playBot } from './bot.ts';
import { BOND, CLASSES } from './data.ts';
import { firstMap } from './map.ts';
import { bondKey, bondLevel, Run } from './run.ts';

describe('map', () => {
  it('every slot has a neighbor and knights can block somewhere', () => {
    const map = firstMap();
    for (const s of map.slots) expect(s.neighbors.length).toBeGreaterThan(0);
    const run = new Run(1);
    expect(map.slots.filter((s) => run.canBlock(s.id)).length).toBeGreaterThanOrEqual(3);
  });

  it('path ends at the gate', () => {
    const map = firstMap();
    const end = map.path.at(map.path.length);
    expect(end).toEqual(map.gate);
  });
});

describe('Run', () => {
  it('starts with four defenders on the bench', () => {
    const run = new Run(1);
    expect(run.party.map((d) => d.cls)).toEqual(['knight', 'archer', 'mage', 'priestess']);
    expect(run.party.every((d) => d.slot === null)).toBe(true);
  });

  it('placing on an occupied slot swaps', () => {
    const run = new Run(1);
    const [a, b] = run.party;
    if (!a || !b) throw new Error();
    run.place(a.id, 0);
    run.place(b.id, 1);
    run.place(b.id, 0);
    expect(b.slot).toBe(0);
    expect(a.slot).toBe(1);
  });

  it('cannot rearrange during a wave', () => {
    const run = new Run(1);
    run.startWave();
    expect(run.place(run.party[0]?.id ?? 0, 3)).toBe(false);
  });

  it('an empty defense loses the gate', () => {
    const run = new Run(1);
    for (let w = 0; w < 10 && run.phase !== 'lost'; w++) {
      if (run.phase === 'plan') run.startWave();
      for (let i = 0; i < 60 * 300 && run.phase === 'wave'; i++) run.step(1 / 60);
      if (run.phase === 'reward') run.chooseReward(0);
    }
    expect(run.phase).toBe('lost');
  });

  it('a knight blocks enemies and takes the hits', () => {
    const run = new Run(1);
    const knight = run.party.find((d) => d.cls === 'knight');
    const slot = run.map.slots.find((s) => run.canBlock(s.id));
    if (!knight || !slot) throw new Error();
    run.place(knight.id, slot.id);
    run.startWave();
    let blocked = false;
    for (let i = 0; i < 60 * 60 && run.phase === 'wave'; i++) {
      run.step(1 / 60);
      if (run.enemies.some((e) => e.blockedBy === knight.id)) blocked = true;
    }
    expect(blocked).toBe(true);
    expect(knight.hp < knight.maxHp || !knight.alive).toBe(true);
  });

  it('neighbors who survive waves together form bonds', () => {
    const run = new Run(2);
    const [a, b, c] = run.party;
    const s = run.map.slots.find((x) => x.neighbors.length > 0);
    if (!a || !b || !c || !s) throw new Error();
    run.place(a.id, s.id);
    run.place(b.id, s.neighbors[0] ?? 0);
    // c stoi daleko od obojga: brak więzi.
    const far = run.map.slots.find((x) => x.id !== s.id && !x.neighbors.includes(s.id) && !x.neighbors.includes(s.neighbors[0] ?? -1));
    run.place(c.id, far?.id ?? null);
    for (let w = 0; w < 2; w++) {
      run.startWave();
      // Pusta fala: od razu koniec (sprawdzamy samą mechanikę więzi, nie walkę).
      (run as unknown as { queue: unknown[] }).queue = [];
      run.step(1 / 60);
      run.chooseReward(0);
    }
    expect(run.bonds.get(bondKey(a.id, b.id))).toBe(2 * BOND.perWave);
    expect(bondLevel(run.bonds.get(bondKey(a.id, b.id)) ?? 0)).toBe(1);
    expect(run.bonds.get(bondKey(a.id, c.id))).toBeUndefined();
    expect(run.damageMult(a)).toBeGreaterThan(run.damageMult(c) - 0.001);
  });

  it('a bonded partner reacts to death by trait', () => {
    const run = new Run(3);
    const [a, b] = run.party;
    if (!a || !b) throw new Error();
    run.bonds.set(bondKey(a.id, b.id), 5);
    run.place(a.id, 0);
    run.place(b.id, 1);
    run.startWave();
    // Weteran z dwiema ranami: kolejne powalenie to śmierć.
    a.wounds = 2;
    a.hp = 0.001;
    run.enemies.push({ id: 999, kind: 'wraith', hp: 50, maxHp: 50, d: 0, x: 440, y: 160, blockedBy: null, rangedCd: 0, alive: true });
    const ev = run.step(1 / 60);
    expect(ev.defenderFell).toContain(a);
    expect(b.mood).toBe(b.trait === 'faithful' ? 'grief' : 'rage');
    expect(b.mourns).toBe(a.name);
  });

  it('class data is sane', () => {
    for (const c of Object.values(CLASSES)) expect(c.hp).toBeGreaterThan(0);
  });
});

describe('wounds', () => {
  it('first knockouts wound, the third kills', () => {
    const run = new Run(4);
    const a = run.party[0];
    if (!a) throw new Error();
    run.place(a.id, 0);
    const knock = () => {
      run.phase = 'plan';
      run.startWave();
      a.hp = 0.001;
      run.enemies.push({ id: 900 + a.wounds, kind: 'wraith', hp: 50, maxHp: 50, d: 0, x: 440, y: 160, blockedBy: null, rangedCd: 0, alive: true });
      run.step(1 / 60);
    };
    const fullHp = a.maxHp;
    knock();
    expect(a.alive && a.down && a.wounds === 1).toBe(true);
    run.enemies = [];
    (run as unknown as { queue: unknown[] }).queue = [];
    run.step(1 / 60); // koniec fali: powrót z blizną
    expect(a.down).toBe(false);
    expect(a.maxHp).toBeLessThan(fullHp);
    a.wounds = 2;
    knock();
    expect(a.alive).toBe(false);
  });
});

describe('balance (bot)', () => {
  it('smart placement clearly beats random placement', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    const smart = seeds.map((s) => playBot(s, 'smart'));
    const random = seeds.map((s) => playBot(s, 'random'));
    const rate = (r: { won: boolean }[]) => r.filter((x) => x.won).length / r.length;
    expect(rate(smart)).toBeGreaterThan(rate(random) + 0.25);
  });
});
