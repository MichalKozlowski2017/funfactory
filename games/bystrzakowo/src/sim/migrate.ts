/**
 * Save migration: ids were renamed from Polish to English (activities, items, realms, colors, journal keys).
 * Old saves (without `ids`) get every id rewritten with the table in legacy-ids.json, the same table that
 * renamed the code and the asset files. Free text (the child's name) is left alone.
 */
import LEGACY from './legacy-ids.json' with { type: 'json' };
import type { Progress } from './progress.ts';

export const IDS_VERSION = 2;

const WHOLE = new Map(Object.entries(LEGACY.whole));
/** Renamed storage keys: new key -> old key. */
export const LEGACY_STORES: Record<string, string> = LEGACY.stores;
const WORDS = new Map(Object.entries(LEGACY.words));

/** One id: whole-id rename first, then dash-separated word by word. */
export const legacyId = (id: string): string => WHOLE.get(id) ?? id.split('-').map((w) => WORDS.get(w) ?? w).join('-');

/** Every id inside a composite key such as "color:green" or "color@1". */
const mapIds = (s: string): string => s.replace(/[a-z][a-z0-9-]*/g, legacyId);

const KEEP = new Set<string>(['childName', 'lang', 'parentSeen', 'trialDays']);

function walk(v: unknown): unknown {
  if (typeof v === 'string') return mapIds(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [mapIds(k), KEEP.has(k) ? x : walk(x)]));
  return v;
}

/** Rewrites an old save in place of a copy; saves already on the current ids come back unchanged. */
export function migrateIds(p: Progress): Progress {
  if ((p.ids ?? 1) >= IDS_VERSION) return p;
  const out = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, KEEP.has(k) ? v : walk(v)])) as unknown as Progress;
  out.ids = IDS_VERSION;
  return out;
}
