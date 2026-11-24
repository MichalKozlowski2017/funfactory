/**
 * Nagrania „X jak słowo” dla wszystkich przykładów liter (src/sim/letters.ts, LETTER_EXAMPLES):
 *   node games/bystrzakowo/scripts/letters-voice.ts [stary-letters.ts]
 * 1. Teksty zdań w każdym języku (po polsku z nazwą litery: „Eś... jak ślimak.”).
 * 2. Stare nagrania jednej litery (litera-a.m4a = „A jak autko”) dostają nową nazwę (litera-a-auto.m4a),
 *    gdy przykład się zgadza (podaj starą wersję letters.ts z obiektami liter).
 * 3. Brakujące → voice/litery-<język>.json (zadanie: Chatterbox z próbką Lusi dla pl/de/es, VoxCPM dla en).
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { letterLines } from '../src/sim/letters.ts';
import { letterText } from '../src/sim/locales/letters.ts';

export { letterText };
import type { Lang } from '../src/sim/lang.ts';

const game = join(import.meta.dirname, '..');

/** Stare przypisania litera → obiekt (sprzed przykładów), z podanego pliku letters.ts. */
function oldItems(file: string): Record<Lang, Record<string, string>> {
  const s = readFileSync(file, 'utf8');
  const pl = Object.fromEntries([...s.matchAll(/\{ ch: '(.)', item: '([^']*)'/g)].filter((m) => m[2]).map((m) => [m[1]!, m[2]!]));
  const other = (l: string) => {
    const row = s.match(new RegExp(`\\n  ${l}: \\{([^}]*)\\}`))?.[1] ?? '';
    return Object.fromEntries([...row.matchAll(/(\w): '([^']*)'/g)].filter((m) => m[2]).map((m) => [m[1]!, m[2]!]));
  };
  return { pl, en: other('en'), de: other('de'), es: other('es') };
}

// Uruchomione wprost (nie przy imporcie letterText).
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
    console.log(`${l}: przemianowane ${renamed}, do nagrania ${missing.length}`);
  }
}
