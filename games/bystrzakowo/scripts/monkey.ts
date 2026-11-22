/**
 * Test „małpki”: każda zabawa po kolei, losowe stuknięcia i przeciągnięcia jak u malucha (także w puste miejsca
 * i w przycisk domku), zrzuty co jakiś czas. Kod wyjścia ≠ 0 z `pnpm shot` = błąd JS albo brak gotowości sceny.
 *   node games/bystrzakowo/scripts/monkey.ts [zabawa,zabawa…] [--taps 40] [--lang pl]
 * Zrzuty: .shots/monkey/<zabawa>/, podsumowanie w .shots/monkey/report.txt.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Rng } from '@funfactory/core';
import { ACTIVITIES } from '../src/sim/realms.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const only = args[0] && !args[0].startsWith('--') ? args[0].split(',') : [...ACTIVITIES];
const taps = Number(opt('--taps', '40'));
const lang = opt('--lang', 'pl');
const repo = join(import.meta.dirname, '../../..');
const out = join(repo, '.shots/monkey');
mkdirSync(out, { recursive: true });

// Widok poziomy 956×440 → jednostki gry: szerokość 720, wysokość ok. 331 (gra skaluje się do szerokości 720).
const W = 720, H = 330;
const report: string[] = [];
for (const [i, kind] of only.entries()) {
  const rng = new Rng(1000 + i);
  const steps = [`wait:2000`, `eval:window.__ff.game.scenes.current.play('${kind}')`, 'wait:2500', 'shot:start'];
  for (let t = 0; t < taps; t++) {
    const r = rng.next();
    const x = Math.round(rng.next() * W), y = Math.round(rng.next() * H);
    if (r < 0.75) steps.push(`tap:${x}:${y}`);
    else {
      const x2 = Math.round(rng.next() * W), y2 = Math.round(rng.next() * H);
      steps.push(`drag:${x}:${y}:${x2}:${y2}`);
    }
    steps.push(`wait:${200 + Math.round(rng.next() * 900)}`);
    if (t % 10 === 9) steps.push(`shot:t${t + 1}`);
  }
  steps.push('wait:1500', 'shot:end');
  const dir = join(out, kind);
  const res = spawnSync('pnpm', ['shot', 'games/bystrzakowo', '--size', '956x440@1', '--query', `full&lang=${lang}`, '--seed', String(i + 3), '--timeout', '30000', '--out', dir, '--steps', steps.join(',')], { cwd: repo, encoding: 'utf8' });
  const errs = (res.stdout + res.stderr).split('\n').filter((l) => /BŁĘ|Error|error|playtest:/.test(l)).slice(0, 6);
  const scene = /scena: (\S+)/.exec(res.stdout)?.[1] ?? '?';
  const line = `${res.status === 0 ? 'OK  ' : 'BŁĄD'} ${kind.padEnd(12)} scena na końcu: ${scene}${errs.length ? '\n    ' + errs.join('\n    ') : ''}`;
  console.log(line);
  report.push(line);
}
writeFileSync(join(out, 'report.txt'), report.join('\n') + '\n');
