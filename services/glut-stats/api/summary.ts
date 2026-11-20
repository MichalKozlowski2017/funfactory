import { CORS, json, sql } from '../lib/db.js';
import { LABELS } from '../lib/labels.js';

/**
 * GET /api/summary: publiczne podsumowanie statystyk Gluta dla strony mkdev (same liczby, bez identyfikatorów).
 * Okno: ostatnie 90 dni, bez wersji przeglądarkowej (platform = web, czyli testy deweloperskie)
 * i bez instalacji z EXCLUDE_INSTALLS (lista po przecinku: telefony właściciela).
 * Dni liczone w czasie polskim. Wynik w cache CDN na 15 minut.
 */
const TZ = 'Europe/Warsaw';

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(): Promise<Response> {
  const db = sql();
  const exclude = (process.env.EXCLUDE_INSTALLS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // Wspólny filtr (CTE) dla każdego zapytania.
  const ev = `ev AS (
    SELECT *, (ts AT TIME ZONE '${TZ}')::date AS day FROM events
    WHERE ts > now() - interval '90 days' AND coalesce(platform, '') <> 'web' AND NOT (install = ANY($1::text[]))
  )`;
  const runs = `runs AS (
    SELECT install, session, day, build, platform, data->>'mode' AS mode, data->>'cause' AS cause,
      (data->>'meters')::int AS meters, (data->>'time')::float AS time, coalesce((data->>'candies')::int, 0) AS candies,
      (data->>'fps')::float AS fps
    FROM ev WHERE name = 'run' AND data ? 'meters'
  )`;
  const q = (body: string) => db.query(`WITH ${ev}, ${runs} ${body}`, [exclude]);

  const [totals, daily, retention, retentionByBuild, heights, histogram, deaths, funnel, tutorial, economy, purchases, achievements, platforms, builds, sessions] =
    await Promise.all([
      q(`SELECT (SELECT count(DISTINCT install) FROM ev) AS installs, (SELECT count(*) FROM runs) AS runs,
           (SELECT count(*) FROM runs WHERE mode = 'daily') AS daily_runs, (SELECT count(DISTINCT install) FROM runs WHERE mode = 'daily') AS daily_players,
           (SELECT round((sum(time) / 3600.0)::numeric, 1) FROM runs) AS hours, (SELECT max(meters) FROM runs) AS best,
           (SELECT min(ts) FROM ev) AS first_event, (SELECT max(ts) FROM ev) AS last_event`),
      q(`, first AS (SELECT install, min(day) AS d0 FROM ev GROUP BY install)
         SELECT ev.day, (SELECT count(*) FROM first WHERE d0 = ev.day) AS new, count(DISTINCT ev.install) AS active,
           count(*) FILTER (WHERE name = 'run') AS runs
         FROM ev WHERE ev.day > (now() AT TIME ZONE '${TZ}')::date - 30 GROUP BY ev.day ORDER BY ev.day`),
      q(`, days AS (SELECT DISTINCT install, day FROM ev), first AS (SELECT install, min(day) AS d0 FROM days GROUP BY install),
         today AS (SELECT (now() AT TIME ZONE '${TZ}')::date AS d)
         SELECT
           count(*) FILTER (WHERE d0 <= (SELECT d FROM today) - 1) AS n1,
           count(*) FILTER (WHERE d0 <= (SELECT d FROM today) - 1 AND EXISTS (SELECT 1 FROM days x WHERE x.install = f.install AND x.day = f.d0 + 1)) AS r1,
           count(*) FILTER (WHERE d0 <= (SELECT d FROM today) - 3) AS n3,
           count(*) FILTER (WHERE d0 <= (SELECT d FROM today) - 3 AND EXISTS (SELECT 1 FROM days x WHERE x.install = f.install AND x.day = f.d0 + 3)) AS r3,
           count(*) FILTER (WHERE d0 <= (SELECT d FROM today) - 7) AS n7,
           count(*) FILTER (WHERE d0 <= (SELECT d FROM today) - 7 AND EXISTS (SELECT 1 FROM days x WHERE x.install = f.install AND x.day = f.d0 + 7)) AS r7
         FROM first f`),
      q(`, days AS (SELECT DISTINCT install, day FROM ev),
         first AS (SELECT DISTINCT ON (install) install, day AS d0, build FROM ev ORDER BY install, ts)
         SELECT build, count(*) AS installs,
           count(*) FILTER (WHERE d0 <= (now() AT TIME ZONE '${TZ}')::date - 1) AS n1,
           count(*) FILTER (WHERE d0 <= (now() AT TIME ZONE '${TZ}')::date - 1 AND EXISTS (SELECT 1 FROM days x WHERE x.install = f.install AND x.day = f.d0 + 1)) AS r1
         FROM first f GROUP BY build ORDER BY min(d0) DESC LIMIT 12`),
      q(`SELECT count(*) AS runs,
           percentile_disc(0.1) WITHIN GROUP (ORDER BY meters) AS p10, percentile_disc(0.25) WITHIN GROUP (ORDER BY meters) AS p25,
           percentile_disc(0.5) WITHIN GROUP (ORDER BY meters) AS p50, percentile_disc(0.75) WITHIN GROUP (ORDER BY meters) AS p75,
           percentile_disc(0.9) WITHIN GROUP (ORDER BY meters) AS p90,
           round(percentile_cont(0.5) WITHIN GROUP (ORDER BY time)::numeric, 1) AS median_time,
           round(avg(candies)::numeric, 1) AS candies_per_run,
           round(percentile_cont(0.5) WITHIN GROUP (ORDER BY fps)::numeric, 1) AS median_fps
         FROM runs WHERE mode IS DISTINCT FROM 'daily'`),
      q(`SELECT least(meters / 25, 32) * 25 AS bucket, count(*) AS runs FROM runs WHERE mode IS DISTINCT FROM 'daily' GROUP BY 1 ORDER BY 1`),
      q(`SELECT least(meters / 100, 7) AS world, coalesce(cause, '?') AS cause, count(*) AS runs FROM runs GROUP BY 1, 2 ORDER BY 1, 2`),
      q(`, best AS (SELECT install, max(meters) AS m FROM runs GROUP BY install)
         SELECT (SELECT count(DISTINCT install) FROM ev) AS installs, count(*) AS played,
           count(*) FILTER (WHERE m >= 30) AS m30, count(*) FILTER (WHERE m >= 50) AS m50, count(*) FILTER (WHERE m >= 100) AS m100,
           count(*) FILTER (WHERE m >= 200) AS m200, count(*) FILTER (WHERE m >= 300) AS m300, count(*) FILTER (WHERE m >= 500) AS m500,
           count(*) FILTER (WHERE m >= 700) AS m700
         FROM best`),
      q(`SELECT data->>'step' AS step, count(DISTINCT install) AS installs FROM ev WHERE name = 'funnel' GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT round((sum(candies) / nullif(sum(time), 0) * 3600)::numeric) AS candies_per_hour,
           (SELECT count(*) FROM ev WHERE name = 'buy') AS purchases, (SELECT count(DISTINCT install) FROM ev WHERE name = 'buy') AS buyers
         FROM runs`),
      q(`SELECT data->>'item' AS item, count(*) AS count FROM ev WHERE name = 'buy' GROUP BY 1 ORDER BY 2 DESC LIMIT 24`),
      q(`SELECT data->>'id' AS id, count(DISTINCT install) AS installs FROM ev WHERE name = 'ach' GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT coalesce(p.platform, '?') AS platform, p.installs, f.median_fps
         FROM (SELECT platform, count(DISTINCT install) AS installs FROM ev GROUP BY platform) p
         LEFT JOIN (SELECT platform, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY fps)::numeric, 1) AS median_fps FROM runs WHERE fps IS NOT NULL GROUP BY platform) f
           ON f.platform IS NOT DISTINCT FROM p.platform
         ORDER BY p.installs DESC`),
      q(`SELECT build, count(DISTINCT install) AS installs, count(*) AS runs,
           percentile_disc(0.5) WITHIN GROUP (ORDER BY meters) AS median_m, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY time)::numeric, 1) AS median_time
         FROM runs GROUP BY build ORDER BY min(day) DESC LIMIT 12`),
      q(`, s AS (SELECT session, count(*) AS runs, sum(time) AS time FROM runs WHERE session IS NOT NULL GROUP BY session)
         SELECT count(*) AS sessions, percentile_disc(0.5) WITHIN GROUP (ORDER BY runs) AS runs_per_session,
           round((percentile_cont(0.5) WITHIN GROUP (ORDER BY time) / 60)::numeric, 1) AS minutes_per_session
         FROM s`),
    ]);

  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const r = retention[0] ?? {};
  const rate = (a: unknown, b: unknown) => (Number(b) > 0 ? Math.round((1000 * Number(a)) / Number(b)) / 10 : null);
  return json(
    {
      generatedAt: new Date().toISOString(),
      windowDays: 90,
      labels: {
        worlds: ['Crystal cave', 'Chocolate mine', 'Gummy forest', 'Cotton candy clouds', 'Burnt caramel', 'Licorice swamp', 'Abandoned factory', 'Sugar nightmare'],
        causes: { spikes: 'Spikes', syrup: 'Syrup', quit: 'Quit' },
        items: LABELS.items,
        achievements: LABELS.achievements,
      },
      totals: totals[0],
      daily: daily.map((d) => ({ day: d.day, new: n(d.new), active: n(d.active), runs: n(d.runs) })),
      retention: {
        d1: { rate: rate(r.r1, r.n1), cohort: n(r.n1) },
        d3: { rate: rate(r.r3, r.n3), cohort: n(r.n3) },
        d7: { rate: rate(r.r7, r.n7), cohort: n(r.n7) },
        byBuild: retentionByBuild.map((b) => ({ build: b.build, installs: n(b.installs), d1: rate(b.r1, b.n1), cohort: n(b.n1) })),
      },
      heights: heights[0],
      histogram: histogram.map((h) => ({ from: n(h.bucket), runs: n(h.runs) })),
      deaths: deaths.map((d) => ({ world: n(d.world), cause: d.cause, runs: n(d.runs) })),
      funnel: funnel[0],
      tutorial: tutorial.map((t) => ({ step: t.step, installs: n(t.installs) })),
      economy: { ...economy[0], top: purchases.map((p) => ({ item: p.item, count: n(p.count) })) },
      achievements: achievements.map((a) => ({ id: a.id, installs: n(a.installs) })),
      platforms: platforms.map((p) => ({ platform: p.platform, installs: n(p.installs), medianFps: n(p.median_fps) })),
      builds: builds.map((b) => ({ build: b.build, installs: n(b.installs), runs: n(b.runs), medianM: n(b.median_m), medianTime: n(b.median_time) })),
      sessions: sessions[0],
    },
    200,
    { 'cache-control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  );
}
