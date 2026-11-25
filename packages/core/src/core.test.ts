import { describe, expect, it } from 'vitest';
import { angleDelta, damp, Emitter, Loop, Rng, Spring, Timers, Tweens } from './index.ts';

describe('Tweens', () => {
  it('reaches the target and resolves done', async () => {
    const tweens = new Tweens();
    const obj = { x: 0, y: 10 };
    const tween = tweens.to(obj, { x: 100 }, { duration: 1, ease: 'linear' });
    tweens.update(0.5);
    expect(obj.x).toBeCloseTo(50);
    tweens.update(0.6);
    expect(obj.x).toBe(100);
    expect(obj.y).toBe(10);
    await tween.done;
    expect(tweens.count).toBe(0);
  });

  it('respects delay and reads start value when it starts', () => {
    const tweens = new Tweens();
    const obj = { x: 0 };
    tweens.to(obj, { x: 10 }, { duration: 1, delay: 0.5, ease: 'linear' });
    obj.x = 5;
    tweens.update(0.5);
    expect(obj.x).toBe(5);
    tweens.update(0.5);
    expect(obj.x).toBeCloseTo(7.5);
  });

  it('yoyo returns to start', () => {
    const tweens = new Tweens();
    const obj = { s: 1 };
    tweens.to(obj, { s: 2 }, { duration: 0.1, yoyo: true, repeat: 1, ease: 'linear' });
    tweens.update(0.1);
    expect(obj.s).toBeCloseTo(2);
    tweens.update(0.1);
    expect(obj.s).toBeCloseTo(1);
    expect(tweens.count).toBe(0);
  });

  it('killOf stops tweens of a target', () => {
    const tweens = new Tweens();
    const obj = { x: 0 };
    tweens.to(obj, { x: 10 }, { duration: 1 });
    tweens.killOf(obj);
    tweens.update(1);
    expect(obj.x).toBe(0);
    expect(tweens.count).toBe(0);
  });

  it('wait resolves after game time', async () => {
    const tweens = new Tweens();
    let fired = false;
    void tweens.wait(0.3).then(() => (fired = true));
    tweens.update(0.2);
    await Promise.resolve();
    expect(fired).toBe(false);
    tweens.update(0.2);
    await Promise.resolve();
    expect(fired).toBe(true);
  });
});

describe('Tweens: killAll on scene exit', () => {
  it('killAll() settles done, killAll(false) leaves it pending', async () => {
    const tweens = new Tweens();
    let a = false, b = false;
    void tweens.to({ x: 0 }, { x: 1 }, { duration: 1 }).done.then(() => (a = true));
    tweens.killAll();
    void tweens.to({ x: 0 }, { x: 1 }, { duration: 1 }).done.then(() => (b = true));
    tweens.killAll(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(a).toBe(true);
    expect(b).toBe(false);
    expect(tweens.count).toBe(0);
  });
});

describe('Spring', () => {
  it('settles on target', () => {
    const spring = new Spring(0);
    spring.target = 1;
    for (let i = 0; i < 240; i++) spring.update(1 / 60);
    expect(spring.value).toBeCloseTo(1, 3);
    expect(spring.settled).toBe(true);
  });

  it('survives a huge dt', () => {
    const spring = new Spring(0, 400, 10);
    spring.target = 1;
    spring.update(5);
    expect(Number.isFinite(spring.value)).toBe(true);
  });
});

describe('Rng', () => {
  it('is deterministic per seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('int stays within inclusive bounds', () => {
    const rng = new Rng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
});

describe('Tweens and destroyed targets', () => {
  it('drops tweens whose target was destroyed', () => {
    const tweens = new Tweens();
    const target = { x: 0, destroyed: false };
    tweens.to(target, { x: 10 }, { duration: 1 });
    tweens.update(0.5);
    target.destroyed = true;
    target.x = -1;
    tweens.update(0.25);
    expect(target.x).toBe(-1);
    expect(tweens.count).toBe(0);
  });

  it('drops tweens created for a missing target (scale of an already destroyed object)', () => {
    const tweens = new Tweens();
    tweens.to(null as unknown as { x: number }, { x: 1 }, { duration: 1 });
    expect(() => tweens.update(0.1)).not.toThrow();
    expect(tweens.count).toBe(0);
  });
});

describe('Loop', () => {
  it('runs fixed steps from accumulated time', () => {
    let fixed = 0;
    let frames = 0;
    const loop = new Loop({ fixedUpdate: () => fixed++, update: () => frames++ }, 60);
    loop.tick(1 / 30);
    expect(fixed).toBe(2);
    expect(frames).toBe(1);
  });

  it('slow motion steps every frame with shorter steps (no stutter)', () => {
    const steps: number[] = [];
    const loop = new Loop({ fixedUpdate: (dt) => steps.push(dt) }, 60);
    loop.timeScale = 0.25;
    for (let i = 0; i < 4; i++) loop.tick(1 / 60 + 1e-9);
    expect(steps.length).toBe(4);
    for (const dt of steps) expect(dt).toBeCloseTo(1 / 240);
    loop.timeScale = 0; // hitstop: czas stoi
    loop.tick(1 / 60);
    expect(steps.length).toBe(4);
  });

  it('jittery 60 Hz frames still give exactly one step each', () => {
    const counts: number[] = [];
    const loop = new Loop({}, 60);
    // Drgania odczytu czasu jak w przeglądarce: 15,2–18,1 ms.
    const jitter = [16.1, 17.4, 15.2, 18.1, 16.6, 15.9, 17.2, 16.0, 17.9, 15.5];
    for (let i = 0; i < 200; i++) {
      loop.tick(jitter[i % jitter.length]! / 1000);
      counts.push(loop.lastSteps);
    }
    expect(new Set(counts)).toEqual(new Set([1]));
  });

  it('120 Hz frames alternate single steps and real pauses still catch up', () => {
    const loop = new Loop({}, 60);
    const counts: number[] = [];
    for (let i = 0; i < 20; i++) {
      loop.tick(8.4 / 1000);
      counts.push(loop.lastSteps);
    }
    expect(counts.filter((c) => c === 1).length).toBe(10);
    loop.tick(0.05); // zacięcie 50 ms: nadrabia kilkoma krokami
    expect(loop.lastSteps).toBe(3);
    expect(loop.alpha).toBeGreaterThanOrEqual(0);
    expect(loop.alpha).toBeLessThan(1);
  });

  it('pause stops time', () => {
    const loop = new Loop({});
    loop.paused = true;
    loop.tick(1);
    expect(loop.time).toBe(0);
  });
});

describe('Timers', () => {
  it('fires after and every', () => {
    const timers = new Timers();
    let once = 0;
    let rep = 0;
    timers.after(0.5, () => once++);
    const stop = timers.every(0.2, () => rep++);
    timers.update(0.5);
    expect(once).toBe(1);
    expect(rep).toBe(2);
    stop();
    timers.update(1);
    expect(rep).toBe(2);
    expect(once).toBe(1);
  });
});

describe('Emitter', () => {
  it('emits and unsubscribes', () => {
    const bus = new Emitter<{ score: number; over: void }>();
    const got: number[] = [];
    const off = bus.on('score', (n) => got.push(n));
    let overs = 0;
    bus.once('over', () => overs++);
    bus.emit('score', 3);
    bus.emit('over');
    bus.emit('over');
    off();
    bus.emit('score', 4);
    expect(got).toEqual([3]);
    expect(overs).toBe(1);
  });
});

describe('math', () => {
  it('damp converges', () => {
    let x = 0;
    for (let i = 0; i < 120; i++) x = damp(x, 10, 8, 1 / 60);
    expect(x).toBeCloseTo(10, 2);
  });

  it('angleDelta takes the short way', () => {
    expect(angleDelta(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
  });
});
