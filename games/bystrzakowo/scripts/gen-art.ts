/**
 * Generuje brakujące grafiki na Legionie (Flux 2, styl plastelina) do assets-raw/bystrzakowo/items/<id>-<seed>.png.
 * Pomija obiekty, które mają już plik w public/art/items. Rejestruje paczkę w podglądzie `pnpm legion`.
 *   node games/bystrzakowo/scripts/gen-art.ts [--extra] [--only id,id --seed N]   (--extra: także domki, ikona, muzyka)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { hasFace, ITEMS } from '../src/sim/catalog.ts';

const repo = resolve(import.meta.dirname, '../../..');
const raw = join(repo, 'assets-raw/bystrzakowo');
const comfy = join(homedir(), '.claude/skills/comfyui/comfy.ts');
const job = join(homedir(), '.claude/skills/comfyui/scripts/legion-job.sh');
export const STYLE = 'soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly';
const seedArg = process.argv.indexOf('--seed');
const SEED = seedArg > 0 ? Number(process.argv[seedArg + 1]) : 21;
const onlyArg = process.argv.indexOf('--only');
/** --only a,b,c: wygeneruj ponownie tylko te obiekty (np. z nowym promptem i innym --seed). */
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1]!.split(',')) : null;

interface Task {
  out: string;
  prefix: string;
  args: string[];
}
const tasks: Task[] = [];
const extra = process.argv.includes('--extra');

if (extra) {
  const house = (roof: string) => `a tiny cozy cottage with a round wooden door and ${roof}, front view, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  for (const [k, roof] of [
    ['kolory', 'a rainbow striped roof'],
    ['gloski', 'a blue roof'],
    ['mamy', 'a pink roof with a little heart window'],
  ])
    tasks.push({ out: 'extra', prefix: `dom-${k}`, args: ['--workflow', 'flux2-sprite', '--prompt', house(roof!)] });
  tasks.push({
    out: 'extra',
    prefix: 'ikona',
    args: ['--workflow', 'flux2', '--prompt', `app icon, a cute friendly cartoon fox face with a green scarf, centered, filling the frame, soft warm yellow background, ${STYLE}`],
  });
  tasks.push({
    out: 'extra',
    prefix: 'muzyka',
    args: ['--workflow', 'ace15', '--prompt', 'gentle playful children music, ukulele, glockenspiel, soft marimba, light shaker, happy and calm, warm, simple melody, loopable background music for a preschool game', '--bpm', '96', '--duration', '64', '--key', 'C major'],
  });
}

for (const item of ITEMS) {
  if (only && !only.has(item.id)) continue;
  if (!only && existsSync(join(repo, 'games/bystrzakowo/public/art/items', `${item.id}.webp`))) continue;
  if (existsSync(join(raw, 'items', `${item.id}-${SEED}.png`))) continue;
  const prompt = `${item.prompt}, single object, centered, ${STYLE}${hasFace(item) ? '' : ', no face on objects'}, plain light gray background`;
  tasks.push({ out: 'items', prefix: item.id, args: ['--workflow', 'flux2-sprite', '--prompt', prompt] });
}

console.log(`Do wygenerowania: ${tasks.length}`);
for (const dir of ['items', 'extra']) mkdirSync(join(raw, dir), { recursive: true });
execFileSync(job, ['bystrzakowo-items', 'Bystrzakowo: katalog obiektów', String(tasks.length), '--dir', raw, '--glob', '*'], { stdio: 'inherit' });
for (const [i, t] of tasks.entries()) {
  try {
    const out = execFileSync('node', [comfy, 'gen', ...t.args, '--seed', String(SEED), '--out', join(raw, t.out), '--prefix', t.prefix], { encoding: 'utf8' });
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} ${out.trim().split('\n').pop()}`);
  } catch (e) {
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} BŁĄD ${String(e).slice(0, 200)}`);
  }
}
console.log('GOTOWE');
