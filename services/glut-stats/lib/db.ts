import { neon } from '@neondatabase/serverless';

/** Połączenie z bazą Neon (HTTP, bez puli). Adres w zmiennej DATABASE_URL (Vercel → Environment Variables). */
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

/** Nagłówki CORS: gra działa z capacitor://localhost (iOS) i https://localhost (Android). Bez ciasteczek. */
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS, ...headers } });
}
