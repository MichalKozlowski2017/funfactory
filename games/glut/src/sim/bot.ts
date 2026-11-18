import { Rng } from '@funfactory/core';
import { launchVelocity } from './physics.ts';
import { Run } from './run.ts';

export interface BotResult {
  meters: number;
  shots: number;
  time: number;
  cause: 'spikes' | 'syrup' | 'stuck' | 'limit';
}

/**
 * Prosty gracz do testów i strojenia: losuje kilka kierunków, wybiera ten, który ląduje najwyżej
 * (omijając kolce), strzela po krótkiej „reakcji”. Gra z syropem, jak człowiek.
 */
export function playBot(seed: number, opts: { maxTime?: number; samples?: number; reaction?: number } = {}): BotResult {
  const run = new Run(seed);
  const rng = new Rng(seed * 7 + 1);
  const dt = 1 / 60;
  const maxTime = opts.maxTime ?? 240;
  const reaction = opts.reaction ?? 0.35;
  let shots = 0;
  let wait = reaction;
  let t = 0;
  while (t < maxTime) {
    const r = run.step(dt);
    t += dt;
    if (r.died) return { meters: run.meters, shots, time: t, cause: 'spikes' };
    if (r.drowned) return { meters: run.meters, shots, time: t, cause: 'syrup' };
    if (run.slime.state !== 'stuck') continue;
    wait -= dt;
    if (wait > 0) continue;
    let best: { vx: number; vy: number; y: number } | null = null;
    for (let k = 0; k < (opts.samples ?? 24); k++) {
      // Kierunek z pełnego koła, ale częściej w górę (przeciągnięcie w dół), jak u człowieka.
      const angle = rng.chance(0.7) ? rng.range(0.15, Math.PI - 0.15) : rng.range(0, Math.PI * 2);
      const len = rng.range(40, 330);
      const v = launchVelocity(Math.cos(angle) * len, Math.sin(angle) * len);
      if (!v) continue;
      const p = run.world.predict(v.vx, v.vy, 150, 1);
      const end = p.points[p.points.length - 1];
      if (p.end !== 'land' || !end) continue;
      // Lądowanie w tym samym miejscu nic nie daje; sufit to pułapka (trudno z niego iść w górę).
      if (Math.hypot(end.x - run.slime.x, end.y - run.slime.y) < 60) continue;
      const score = end.y + ((p.ny ?? 0) > 0.5 ? 300 : 0);
      if (!best || score < best.y) best = { vx: v.vx, vy: v.vy, y: score };
    }
    if (!best) {
      wait = 0.1;
      continue;
    }
    run.launch(best.vx, best.vy);
    shots++;
    wait = reaction;
  }
  return { meters: run.meters, shots, time: t, cause: 'limit' };
}
