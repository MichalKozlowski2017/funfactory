import { describe, expect, it } from 'vitest';
import { AD_RULES, AdPolicy } from './ad-policy.ts';

describe('interstitial policy', () => {
  it('waits for the first runs of a session', () => {
    const p = new AdPolicy();
    for (let i = 0; i < AD_RULES.firstAfterRuns - 1; i++) {
      p.runEnded();
      expect(p.shouldShow(1000, 60)).toBe(false);
    }
    p.runEnded();
    expect(p.shouldShow(1000, 60)).toBe(true);
  });

  it('never after a very short run', () => {
    const p = new AdPolicy();
    for (let i = 0; i < 5; i++) p.runEnded();
    expect(p.shouldShow(1000, AD_RULES.minRunSeconds - 1)).toBe(false);
  });

  it('respects the run count and the time gap between ads', () => {
    const p = new AdPolicy();
    for (let i = 0; i < AD_RULES.firstAfterRuns; i++) p.runEnded();
    p.shown(1000);
    for (let i = 0; i < AD_RULES.everyRuns - 1; i++) p.runEnded();
    expect(p.shouldShow(5000, 60)).toBe(false); // za mało biegów
    p.runEnded();
    expect(p.shouldShow(1000 + AD_RULES.minGap - 1, 60)).toBe(false); // za wcześnie
    expect(p.shouldShow(1000 + AD_RULES.minGap, 60)).toBe(true);
  });
});
