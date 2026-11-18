import { describe, expect, it } from 'vitest';
import type { Container } from 'pixi.js';
import { Tweens } from '@funfactory/core';
import { popIn, pulse, restScale, squash } from './juice.ts';

/** Minimalny obiekt ze skalą: juice dotyka tylko `scale` i `alpha`. */
const fake = (s = 0.5) => {
  const scale = { x: s, y: s, set(x: number, y = x) { this.x = x; this.y = y; } };
  return { scale, alpha: 1 } as unknown as Container;
};

/** Klatka gry: update + opróżnienie mikrozadań (kontynuacje po `await tween.done`). */
const frame = async (tweens: Tweens, dt: number) => {
  tweens.update(dt);
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('juice', () => {
  it('overlapping pulses never grow the object', async () => {
    const tweens = new Tweens();
    const icon = fake(0.5);
    for (let i = 0; i < 30; i++) {
      void pulse(tweens, icon, 0.35);
      await frame(tweens, 0.03); // kolejny cukierek w połowie poprzedniego pulsu
    }
    for (let i = 0; i < 60; i++) await frame(tweens, 1 / 60);
    expect(icon.scale.x).toBeCloseTo(0.5);
    expect(icon.scale.y).toBeCloseTo(0.5);
  });

  it('squash and popIn return to the rest scale', async () => {
    const tweens = new Tweens();
    const body = fake(1.2);
    void popIn(tweens, body, 0.2);
    await frame(tweens, 0.05);
    void squash(tweens, body, 0.3);
    await frame(tweens, 0.05);
    void squash(tweens, body, 0.3);
    for (let i = 0; i < 120; i++) await frame(tweens, 1 / 60);
    expect(body.scale.x).toBeCloseTo(restScale(body).x);
    expect(restScale(body).x).toBeCloseTo(1.2);
  });
});
