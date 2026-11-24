import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Owner's rule: no Polish in code. Polish lives only in src/sim/locales/ (texts and language data),
 * src/sim/legacy-ids.json (old save ids) and test fixtures. Code may still hold Polish letters as
 * language data (phoneme sets, letter shapes, spelling rules), listed below with the reason.
 */
const GAME = join(import.meta.dirname, '../..');
const SKIP_DIRS = ['src/sim/locales', 'src/sim/fixtures'];
/** Files whose string/regex literals hold Polish letters as language data. */
const LANGUAGE_DATA: Record<string, string> = {
  'src/sim/puzzles.ts': 'Polish phoneme set and confusable groups',
  'src/sim/catalog.ts': 'Polish spelling rule for first letters',
  'src/sim/letters.ts': 'letter shapes Ł Ś Ż and ASCII slugs for recordings',
  'src/sim/puzzles.test.ts': 'first letters of Polish words',
  'src/sim/skills.test.ts': 'Polish letter as a skill item',
  'src/sim/workshop.test.ts': 'spelling normalisation',
  'src/sim/report.test.ts': 'expected Polish report sentences',
  'src/sim/i18n.test.ts': 'regexes that detect Polish in other languages',
  'src/sim/no-polish.test.ts': 'this check',
  'scripts/monkey.ts': 'parses the Polish output of tools/playtest/shot.ts (shared tool, not translated yet)',
};
// Without ó: Spanish has it too (Spanish narrator lines in scripts/voice-i18n.ts).
const POLISH = /[ąćęłńśźżĄĆĘŁŃŚŹŻ]/;
// Common Polish words that also catch comments written without diacritics.
const WORDS = /\b(jest|sie|oraz|albo|ktory|ktora|ktore|zeby|tylko|potem|gdy|jesli|takze|wiec)\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return SKIP_DIRS.includes(relative(GAME, p)) ? [] : files(p);
    return /\.(ts|mjs|sh|py)$/.test(f) ? [p] : [];
  });
}

describe('no Polish in code', () => {
  it('comments, names and messages are English', () => {
    const bad: string[] = [];
    for (const f of [...files(join(GAME, 'src')), ...files(join(GAME, 'scripts'))]) {
      const rel = relative(GAME, f);
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        const comment = /^\s*(\/\/|\/?\*|#)/.test(line) ? line : (line.match(/\s(\/\/|#)\s.*$/)?.[0] ?? '');
        const code = comment && line.endsWith(comment) ? line.slice(0, line.length - comment.length) : line;
        if (POLISH.test(comment) || WORDS.test(comment.toLowerCase())) bad.push(`${rel}:${i + 1} comment`);
        else if (POLISH.test(code) && !LANGUAGE_DATA[rel]) bad.push(`${rel}:${i + 1} ${line.trim().slice(0, 60)}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
