/**
 * Analiza balansu: bot w kilku profilach gracza gra po N biegów, raport o zasięgu światów,
 * przyczynach śmierci w każdym świecie, frustracji na starcie, ekonomii i osiągnięciach na czas.
 *
 *   node games/glut/src/sim/balance.ts [biegi=200] [profile=nowy,przecietny,wprawny]
 */
import { BIOMES, biomeIndex, BIOME_HEIGHT } from './biomes.ts';
import { playBot } from './bot.ts';

interface Profile {
  name: string;
  reaction: number;
  reactionMax: number;
  airReaction: [number, number];
  /** Ile kierunków „rozważa” (mniej = gorsze celowanie). */
  samples: number;
}

export const PROFILES: Profile[] = [
  { name: 'nowy', reaction: 0.7, reactionMax: 1.6, airReaction: [0.5, 1.0], samples: 8 },
  { name: 'przecietny', reaction: 0.45, reactionMax: 1.1, airReaction: [0.3, 0.7], samples: 16 },
  { name: 'wprawny', reaction: 0.3, reactionMax: 0.7, airReaction: [0.2, 0.45], samples: 32 },
];

export interface RunStats {
  meters: number;
  time: number;
  cause: string;
  candies: number;
  /** Czas gry, w którym osiągnięto 100/200/300 m (Infinity = wcale). */
  at: Record<number, number>;
  /** Cukierki zebrane w pierwszej minucie. */
  candies60: number;
}

export function sample(p: Profile, runs: number, seed0 = 1000, maxTime = 900): RunStats[] {
  const out: RunStats[] = [];
  for (let i = 0; i < runs; i++) {
    const at: Record<number, number> = { 100: Infinity, 200: Infinity, 300: Infinity };
    let candies60 = 0;
    const r = playBot(seed0 + i * 17, {
      maxTime,
      reaction: p.reaction,
      reactionMax: p.reactionMax,
      airReaction: p.airReaction,
      samples: p.samples,
      onStep: (run, t) => {
        for (const m of [100, 200, 300]) if (at[m] === Infinity && run.meters >= m) at[m] = t;
        if (t <= 60) candies60 = run.candies;
      },
    });
    out.push({ meters: r.meters, time: r.time, cause: r.cause, candies: r.candies, at, candies60 });
  }
  return out;
}

const pct = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};
const share = (n: number, of: number) => `${Math.round((100 * n) / Math.max(1, of))}%`;

export function report(p: Profile, rs: RunStats[]): string {
  const n = rs.length;
  const m = rs.map((r) => r.meters);
  const t = rs.map((r) => r.time);
  const lines: string[] = [];
  lines.push(`\n=== ${p.name} (${n} biegów) ===`);
  lines.push(`wysokość: p10 ${pct(m, 0.1)} · p25 ${pct(m, 0.25)} · mediana ${pct(m, 0.5)} · p75 ${pct(m, 0.75)} · p90 ${pct(m, 0.9)} · max ${pct(m, 0.999)} m`);
  lines.push(`czas biegu: mediana ${Math.round(pct(t, 0.5))} s · p90 ${Math.round(pct(t, 0.9))} s`);
  const early = rs.filter((r) => r.meters < 30).length;
  const quick = rs.filter((r) => r.time < 30).length;
  lines.push(`frustracja: śmierć poniżej 30 m ${share(early, n)}, bieg krótszy niż 30 s ${share(quick, n)}`);
  // Zasięg i śmiertelność w każdym świecie.
  lines.push('świat               dociera   ginie tu (kolce/syrop)   ryzyko w świecie');
  BIOMES.forEach((b, i) => {
    const reach = rs.filter((r) => r.meters >= i * BIOME_HEIGHT).length;
    const here = rs.filter((r) => r.cause !== 'limit' && biomeIndex(r.meters) === i);
    const spikes = here.filter((r) => r.cause === 'spikes').length;
    const syrup = here.filter((r) => r.cause === 'syrup').length;
    lines.push(`${b.id.padEnd(18)} ${share(reach, n).padStart(6)}   ${String(here.length).padStart(5)} (${spikes}/${syrup})`.padEnd(48) + `${reach ? share(here.length, reach) : '-'}`);
  });
  const limit = rs.filter((r) => r.cause === 'limit').length;
  if (limit) lines.push(`dożyło limitu czasu: ${limit}`);
  // Ekonomia.
  const candies = rs.reduce((a, r) => a + r.candies, 0);
  const hours = rs.reduce((a, r) => a + r.time, 0) / 3600;
  // Między biegami: ekran końca, reklama, start (ok. 12 s).
  const hoursReal = hours + (n * 12) / 3600;
  lines.push(`cukierki: ${Math.round(candies / n)} na bieg · ${Math.round(candies / hoursReal)} na godzinę gry`);
  // Osiągnięcia na czas (progi jak w sim/achievements.ts).
  const fast = (m: number, s: number) => share(rs.filter((r) => r.at[m]! <= s).length, n);
  lines.push(`na czas: 100 m w 30 s ${fast(100, 30)} · 200 m w 60 s ${fast(200, 60)} · 300 m w 90 s ${fast(300, 90)} biegów`);
  lines.push(`50 cukierków w 1. minucie: ${share(rs.filter((r) => r.candies60 >= 50).length, n)} · 100: ${share(rs.filter((r) => r.candies60 >= 100).length, n)}`);
  lines.push(`przetrwanie: 2 min ${share(rs.filter((r) => r.time >= 120).length, n)} · 5 min ${share(rs.filter((r) => r.time >= 300).length, n)}`);
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] ?? 200);
  const names = (process.argv[3] ?? PROFILES.map((p) => p.name).join(',')).split(',');
  for (const p of PROFILES.filter((x) => names.includes(x.name))) console.log(report(p, sample(p, runs)));
}
