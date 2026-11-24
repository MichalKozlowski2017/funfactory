/**
 * "X as in word" recordings for all letter examples (src/sim/letters.ts, LETTER_EXAMPLES):
 *   node games/bystrzakowo/scripts/letters-voice.ts [old-letters.ts]
 * 1. Sentence texts in every language (Polish uses the letter's name, e.g. "Es... as in snail.").
 * 2. Old single-letter recordings (letter-a.m4a = "A as in car") get the new name (letter-a-car.m4a)
 *    when the example matches (pass the old version of letters.ts with one item per letter).
 * 3. Missing ones → voice/letters-<lang>.json (job: Chatterbox with Lusia's sample for pl/de/es, VoxCPM for en).
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { letterLines } from '../src/sim/letters.ts';
import { letterText } from '../src/sim/locales/letters.ts';

export { letterText };
import type { Lang } from '../src/sim/lang.ts';

const game = join(import.meta.dirname, '..');

/** Old letter → item assignments (from before examples), read from the given letters.ts file. */
function oldItems(file: string): Record<Lang, Record<string, string>> {
  const s = readFileSync(file, 'utf8');
  const pl = Object.fromEntries([...s.matchAll(/\{ ch: '(.)', item: '([^']*)'/g)].filter((m) => m[2]).map((m) => [m[1]!, m[2]!]));
  const other = (l: string) => {
    const row = s.match(new RegExp(`\\n  ${l}: \\{([^}]*)\\}`))?.[1] ?? '';
    return Object.fromEntries([...row.matchAll(/(\w): '([^']*)'/g)].filter((m) => m[2]).map((m) => [m[1]!, m[2]!]));
  };
  return { pl, en: other('en'), de: other('de'), es: other('es') };
}

// Run directly (not when letterText is imported).
if (process.argv[1] === import.meta.filename) {
  const old = process.argv[2] ? oldItems(process.argv[2]) : null;
  for (const l of ['pl', 'en', 'de', 'es'] as const) {
    const dir = join(game, 'public/audio', l === 'pl' ? '' : l, 'lusia');
    const missing: { name: string; text: string; lang: string }[] = [];
    let renamed = 0;
    for (const { line, ch, word } of letterLines(l)) {
      const file = join(dir, `${line}.m4a`);
      const item = line.split('-').slice(2).join('-');
      const legacy = join(dir, `letter-${ch.toLowerCase()}.m4a`);
      if (!existsSync(file) && old?.[l][ch] === item && existsSync(legacy)) {
        renameSync(legacy, file);
        renamed++;
      }
      if (!existsSync(file)) missing.push({ name: `lusia-${line}`, text: letterText(l, ch, word), lang: l });
    }
    const job = l === 'en' ? { voice: 'voices/lusia-en-calm', lang: 'en', tries: 8, lines: missing } : { voice: 'voices\\alt.wav', exag: 0.3, cfg: 0.3, stretch: 0.12, lines: missing };
    writeFileSync(join(game, `voice/letters-${l}.json`), JSON.stringify(job, null, 1) + '\n');
    console.log(`${l}: renamed ${renamed}, to record ${missing.length}`);
  }
}
