import { Rng } from '@funfactory/core';
import { launchVelocity } from './physics.ts';
import { Run } from './run.ts';
import { POWER_RADIUS, SHAFT } from './shaft.ts';

export interface BotShot {
  vx: number;
  vy: number;
  /** Przeciągnięcie palcem, które daje ten strzał (do pokazania celowania w grze). */
  dragX: number;
  dragY: number;
}

/** Wybór strzału: losuje kierunki, ocenia lądowanie (wyżej lepiej, bez kolców i sufitów, bańki w cenie). */
export function chooseShot(run: Run, rng: Rng, samples = 24, seek = true): BotShot | null {
  let best: (BotShot & { score: number }) | null = null;
  for (let k = 0; k < samples; k++) {
    // Kierunek z pełnego koła, ale częściej w górę (przeciągnięcie w dół), jak u człowieka.
    const angle = rng.chance(0.7) ? rng.range(0.15, Math.PI - 0.15) : rng.range(0, Math.PI * 2);
    const len = rng.range(40, 330);
    const dragX = Math.cos(angle) * len;
    const dragY = Math.sin(angle) * len;
    const v = launchVelocity(dragX, dragY);
    if (!v) continue;
    const sv = run.shotVelocity(v.vx, v.vy);
    const p = run.world.predict(sv.vx, sv.vy, 150, 1);
    const end = p.points[p.points.length - 1];
    if (p.end !== 'land' || !end) continue;
    // Lądowanie w tym samym miejscu nic nie daje; sufit to pułapka (trudno z niego iść w górę).
    if (Math.hypot(end.x - run.slime.x, end.y - run.slime.y) < 60) continue;
    let score = end.y + ((p.ny ?? 0) > 0.5 ? 300 : 0);
    if (seek) {
      // Trajektoria przez bańkę z power-upem jest warta tyle, co 4 m wysokości.
      const c = Math.floor(-run.slime.y / SHAFT.chunk);
      const bubbles = [c - 1, c, c + 1, c + 2].flatMap((i) => run.shaft.powers.get(i) ?? []).filter((b) => !b.taken);
      const reach = (run.slime.r + POWER_RADIUS) ** 2;
      if (bubbles.some((b) => p.points.some((q) => (q.x - b.x) ** 2 + (q.y - b.y) ** 2 < reach))) score -= 400;
    }
    if (!best || score < best.score) best = { vx: v.vx, vy: v.vy, dragX, dragY, score };
  }
  return best;
}

/** Czy bot (albo autopilot w grze) powinien teraz celować: stoi albo spada z ładunkiem drugiego oddechu. */
export function botCanShoot(run: Run): boolean {
  const s = run.slime;
  return s.state === 'stuck' || (s.state === 'flying' && run.air > 0 && s.vy > 0);
}

export interface BotResult {
  meters: number;
  shots: number;
  time: number;
  cause: 'spikes' | 'syrup' | 'stuck' | 'limit';
  powers: number;
  candies: number;
  /** Premie z serii (wliczone w `candies`). */
  bonus: number;
  bestStreak: number;
}

/**
 * Prosty gracz do testów i strojenia: losuje kilka kierunków, wybiera ten, który ląduje najwyżej
 * (omijając kolce), strzela po krótkiej „reakcji”. Gra z syropem, jak człowiek.
 */
export function playBot(
  seed: number,
  opts: {
    maxTime?: number;
    samples?: number;
    reaction?: number;
    /** Górna granica losowej reakcji (jak u człowieka: raz szybko, raz z wahaniem). Domyślnie stała `reaction`. */
    reactionMax?: number;
    seekPowers?: boolean;
  } = {},
): BotResult {
  const run = new Run(seed);
  const rng = new Rng(seed * 7 + 1);
  const dt = 1 / 60;
  const maxTime = opts.maxTime ?? 240;
  const reaction = opts.reaction ?? 0.35;
  let shots = 0;
  let powers = 0;
  const seek = opts.seekPowers ?? true;
  const react = () => (opts.reactionMax ? rng.range(reaction, opts.reactionMax) : reaction);
  const stats = () => ({ meters: run.meters, shots, powers, candies: run.candies, bonus: run.bonus, bestStreak: run.bestStreak });
  let wait = react();
  let t = 0;
  while (t < maxTime) {
    const r = run.step(dt);
    t += dt;
    if (r.powered) powers++;
    // Człowiek reaguje od lądowania (nie odlicza w locie czasu na kolejny strzał z półki).
    if (r.landed) wait = react();
    if (r.died) return { ...stats(), time: t, cause: 'spikes' };
    if (r.drowned) return { ...stats(), time: t, cause: 'syrup' };
    // Drugi oddech: gdy slime zaczyna spadać, bot strzela jeszcze raz w locie.
    if (!botCanShoot(run)) continue;
    wait -= dt;
    if (wait > 0) continue;
    const best = chooseShot(run, rng, opts.samples ?? 24, seek);
    if (!best) {
      wait = 0.1;
      continue;
    }
    run.launch(best.vx, best.vy);
    shots++;
    wait = react();
  }
  return { ...stats(), time: t, cause: 'limit' };
}
