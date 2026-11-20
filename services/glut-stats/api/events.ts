import { CORS, json, sql } from '../lib/db.js';

/**
 * POST /api/events: paczka zdarzeń z gry.
 * { install, session, build, platform, os, lang, events: [{ n: nazwa, t: czas ms, d: { ... } }] }
 * Gra wysyła tylko za zgodą gracza. Adresu IP nie zapisujemy.
 */
const NAMES = new Set(['session', 'run', 'funnel', 'buy', 'ach', 'error']);
const PLATFORMS = new Set(['ios', 'android', 'web']);
const ID = /^[a-z0-9-]{8,64}$/i;
const MAX_BODY = 64 * 1024;
const MAX_EVENTS = 200;

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too large' }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const install = str(body.install, 64);
  if (!install || !ID.test(install)) return json({ error: 'bad install' }, 400);
  const session = str(body.session, 64);
  const build = str(body.build, 32);
  const platform = PLATFORMS.has(String(body.platform)) ? String(body.platform) : null;
  const os = str(body.os, 40);
  const lang = str(body.lang, 10);
  if (!Array.isArray(body.events)) return json({ error: 'no events' }, 400);

  const now = Date.now();
  const rows = (body.events as unknown[]).slice(0, MAX_EVENTS).flatMap((e) => {
    if (!e || typeof e !== 'object') return [];
    const ev = e as { n?: unknown; t?: unknown; d?: unknown };
    const name = String(ev.n);
    if (!NAMES.has(name)) return [];
    // Zegar telefonu bywa zły: czasy spoza [teraz - 30 dni, teraz + 1 h] zastępujemy chwilą odbioru.
    const t = typeof ev.t === 'number' && ev.t > now - 30 * 86400_000 && ev.t < now + 3600_000 ? ev.t : now;
    const raw = ev.d && typeof ev.d === 'object' && !Array.isArray(ev.d) ? JSON.stringify(ev.d) : '{}';
    const data = raw.length <= 2000 ? raw : '{}';
    return [{ ts: new Date(t).toISOString(), name, data }];
  });
  if (rows.length === 0) return json({ ok: true, stored: 0 });

  const db = sql();
  await db.query(
    `INSERT INTO events (ts, install, session, name, build, platform, os, lang, data)
     SELECT ts, $2, $3, name, $4, $5, $6, $7, data::jsonb
     FROM unnest($1::timestamptz[], $8::text[], $9::text[]) AS r(ts, name, data)`,
    [rows.map((r) => r.ts), install, session, build, platform, os, lang, rows.map((r) => r.name), rows.map((r) => r.data)],
  );
  return json({ ok: true, stored: rows.length });
}
