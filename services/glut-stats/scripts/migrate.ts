/**
 * Tworzy tabelę zdarzeń (bezpiecznie wielokrotnie). Z flagą --prune usuwa zdarzenia starsze niż 24 miesiące.
 *   vercel env pull .env.local && node --env-file=.env.local scripts/migrate.ts [--prune]
 */
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = neon(url);
const schema = readFileSync(new URL('../lib/schema.sql', import.meta.url), 'utf8');
const statements = schema
  .split(';')
  .map((s) => s.replace(/--.*$/gm, '').trim())
  .filter(Boolean);
for (const s of statements) await db.query(s);
console.log(`schema: ${statements.length} poleceń`);
if (process.argv.includes('--prune')) {
  const rows = await db.query(`DELETE FROM events WHERE ts < now() - interval '24 months' RETURNING id`);
  console.log(`usunięto: ${rows.length}`);
}
const [count] = await db.query('SELECT count(*) AS n FROM events');
console.log(`zdarzeń w bazie: ${count?.n}`);
