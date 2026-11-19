import { describe, expect, it } from 'vitest';
import { dailySeed, dailyStreak, dayKey, normalizeDaily, recordDaily, DAILY_KEEP } from './daily.ts';
import { playBot } from './bot.ts';
import { ReplayRecorder, verifyReplay } from './replay.ts';
import { Run } from './run.ts';
import { chooseShot, botCanShoot } from './bot.ts';
import { Rng } from '@funfactory/core';

describe('daily challenge', () => {
  it('gives the same seed for the same day and different seeds for different days', () => {
    expect(dailySeed('2026-11-19')).toBe(dailySeed('2026-11-19'));
    expect(dailySeed('2026-11-19')).not.toBe(dailySeed('2026-11-20'));
    const s = dailySeed('2026-01-01');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(2 ** 31);
    expect(Number.isInteger(s)).toBe(true);
  });

  it('formats local days', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('records best and tries per day and keeps a limited history', () => {
    let r = recordDaily([], '2026-11-19', 40);
    expect(r.improved).toBe(true);
    r = recordDaily(r.list, '2026-11-19', 30);
    expect(r.improved).toBe(false);
    expect(r.record).toEqual({ day: '2026-11-19', best: 40, tries: 2 });
    let list = r.list;
    for (let d = 1; d <= DAILY_KEEP + 5; d++) list = recordDaily(list, `2027-01-${String(d).padStart(2, '0')}`, d).list;
    expect(list.length).toBe(DAILY_KEEP);
    expect(list[0]!.day).toBe('2027-01-06');
  });

  it('counts consecutive days', () => {
    const list = ['2026-11-17', '2026-11-18', '2026-11-19'].map((day) => ({ day, best: 1, tries: 1 }));
    expect(dailyStreak(list, '2026-11-19')).toBe(3);
    expect(dailyStreak(list, '2026-11-20')).toBe(3);
    expect(dailyStreak(list, '2026-11-21')).toBe(0);
  });

  it('drops broken entries', () => {
    expect(normalizeDaily([{ day: 'x', best: 1 }, { day: '2026-11-19', best: '7', tries: 2 }, null])).toEqual([{ day: '2026-11-19', best: 7, tries: 2 }]);
    expect(normalizeDaily('nope')).toEqual([]);
  });
});

describe('replay', () => {
  /** Bot gra z nagrywaniem, w tym kroki w zwolnionym tempie jak przy celowaniu w locie. */
  function recordBotRun(seed: number) {
    const run = new Run(seed);
    const rec = new ReplayRecorder(seed);
    const rng = new Rng(seed);
    let wait = 0.4;
    for (let i = 0; i < 60 * 60 && !run.over; i++) {
      const slow = run.slime.state === 'flying' && run.slime.vy > 0;
      const dt = slow ? (1 / 60) * 0.35 : 1 / 60;
      wait -= dt;
      if (wait <= 0 && botCanShoot(run)) {
        const shot = chooseShot(run, rng);
        if (shot && run.launch(shot.vx, shot.vy)) rec.shot(shot.vx, shot.vy);
        wait = 0.5;
      }
      rec.step(dt);
      run.step(dt);
    }
    return { replay: rec.finish(run.meters), meters: run.meters };
  }

  it('re-simulates a recorded run to the same result', () => {
    const { replay, meters } = recordBotRun(1234);
    expect(meters).toBeGreaterThan(10);
    expect(replay.steps.length).toBeLessThan(2000);
    const v = verifyReplay(JSON.parse(JSON.stringify(replay)));
    expect(v.ok).toBe(true);
    expect(v.meters).toBe(meters);
  });

  it('rejects a faked score or impossible input', () => {
    const { replay } = recordBotRun(77);
    expect(verifyReplay({ ...replay, meters: replay.meters + 50 }).ok).toBe(false);
    expect(verifyReplay({ ...replay, steps: [[0.5, 100], ...replay.steps] }).ok).toBe(false);
    expect(verifyReplay({ ...replay, shots: [[0, 0, -9000], ...replay.shots] }).ok).toBe(false);
  });

  it('bot results stay reproducible', () => {
    expect(playBot(5, { maxTime: 60 })).toEqual(playBot(5, { maxTime: 60 }));
  });
});
