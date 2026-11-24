/**
 * Monkey test: every activity in turn, random taps and drags like a toddler's (also on empty spots
 * and the home button), screenshots now and then. Exit code ≠ 0 from `pnpm shot` = JS error or the scene never got ready.
 *   node games/bystrzakowo/scripts/monkey.ts [activity,activity…] [--taps 40] [--lang pl]
 * Screenshots: .shots/monkey/<activity>/, summary in .shots/monkey/report.txt.
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

// Landscape view 956×440 → game units: width 720, height approx. 331 (the game scales to a width of 720).
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
  const errs = (res.stdout + res.stderr).split('\n').filter((l) => /ERROR|BŁĘ|Error|error|playtest:/.test(l)).slice(0, 6);
  const scene = /(?:scene|scena): (\S+)/.exec(res.stdout)?.[1] ?? '?';
  const line = `${res.status === 0 ? 'OK  ' : 'FAIL'} ${kind.padEnd(12)} final scene: ${scene}${errs.length ? '\n    ' + errs.join('\n    ') : ''}`;
  console.log(line);
  report.push(line);
}
writeFileSync(join(out, 'report.txt'), report.join('\n') + '\n');
