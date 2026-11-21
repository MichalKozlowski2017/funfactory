/**
 * Generuje brakujące grafiki na Legionie (Flux 2, styl plastelina) do assets-raw/bystrzakowo/items/<id>-<seed>.png.
 * Pomija obiekty, które mają już plik w public/art/items. Rejestruje paczkę w podglądzie `pnpm legion`.
 *   node games/bystrzakowo/scripts/gen-art.ts [--extra] [--warsztat] [--only id,id --seed N]
 *   (--extra: domki, ikona, muzyka; --warsztat: tła, stanowiska i skrzynki Warsztatu Bazyla, po 2 warianty)
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

if (process.argv.includes('--znaki')) {
  // Znaki skrzynek segregowania (nie są obiektami katalogu).
  const sign = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  for (const [id, what] of [
    ['droga', 'a short curvy piece of road with a dashed white line and a tiny traffic light'],
    ['balwan', 'a cute snowman with a carrot nose, a scarf and a little hat'],
    ['palma', 'a single palm tree on a small sandy island with savanna grass'],
    ['kra', 'a small white ice floe with snow and a tiny icicle, floating on a bit of blue water'],
  ])
    tasks.push({ out: 'warsztat', prefix: id!, args: ['--workflow', 'flux2-sprite', '--prompt', sign(what!)] });
}

if (process.argv.includes('--sciezka')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'sciezka', prefix: 'tlo-sciezka', args: [...wide, '--prompt', bg('wide view of a sunny forest clearing with a winding light dirt path, round trees at the edges, small mushrooms and flowers, wooden signposts, large empty grassy space in the middle and bottom, no characters, no animals')] },
    { out: 'sciezka', prefix: 'tlo-sciezka-gra', args: [...wide, '--prompt', bg('a completely empty soft light green grassy meadow ground seen from above with a few tiny flowers only at the edges, very simple and calm, lots of empty space, no objects, no characters')] },
    { out: 'sciezka', prefix: 'stacja-kropki', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small green chalkboard on a wooden easel with colorful dots connected by a line forming a star shape, front view')] },
    { out: 'sciezka', prefix: 'stacja-labirynt', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small square green hedge maze garden seen from slightly above, with a little wooden gate')] },
  );
}

if (process.argv.includes('--pracownia')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'pracownia', prefix: 'tlo-pracownia', args: [...wide, '--prompt', bg('wide view of a cozy bright children art studio room, easels, jars with brushes and crayons on shelves, colorful paint splashes on the wall, a big window with sunlight, large empty wooden floor in the middle and bottom, no characters, no animals')] },
    { out: 'pracownia', prefix: 'tlo-pracownia-gra', args: [...wide, '--prompt', bg('a completely empty soft cream colored paper wall with a few tiny colorful paint dots only at the edges, very simple and calm, lots of empty space, no objects, no characters')] },
    { out: 'pracownia', prefix: 'stacja-kolorowanka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden easel with a half colored picture of a flower, a paint palette and a brush next to it, front view')] },
    { out: 'pracownia', prefix: 'stacja-naklejanka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an open children sticker book with colorful round stickers of stars, hearts and animals, front view')] },
    { out: 'pracownia', prefix: 'dom-memory', args: ['--workflow', 'flux2-sprite', '--prompt', `a tiny cozy cottage with a round wooden door and an orange roof, front view, single object, centered, ${STYLE}, no face on objects, plain light gray background`] },
    { out: 'pracownia', prefix: 'stacja-wzory', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden children abacus with rows of colorful beads in repeating color patterns, front view')] },
    { out: 'pracownia', prefix: 'stacja-litery', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden board standing on a little stand with a big letter A made of colorful dots, front view')] },
  );
  // Kolorowanki: same kontury, grube linie, białe tło (zamalowywanie dotykiem).
  const page = (what: string) => `children coloring book page of ${what}, very thick clean black outlines, closed shapes, large simple areas, pure white background, no shading, no gray, no color, no texture, cute and friendly, centered, whole object visible`;
  for (const [id, what] of [
    ['kot', 'a cute sitting cat'],
    ['pies', 'a cute happy puppy'],
    ['slon', 'a cute baby elephant'],
    ['ryba', 'a cute fish with big fins'],
    ['motyl', 'a cute butterfly with big wings'],
    ['auto', 'a cute small car'],
    ['kwiatek', 'a big flower with round petals and two leaves'],
    ['dinozaur', 'a cute friendly dinosaur'],
    ['zolw', 'a cute turtle with a patterned shell'],
    ['rakieta', 'a cute rocket with round windows'],
    ['sowa', 'a cute owl sitting on a branch'],
    ['domek', 'a little house with a door, two windows and a tree'],
  ])
    tasks.push({ out: 'kolorowanki', prefix: id!, args: ['--workflow', 'flux2', '--prompt', page(what!)] });
}

if (process.argv.includes('--warsztat')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'warsztat', prefix: 'tlo-warsztat', args: [...wide, '--prompt', bg('wide view of a cozy wooden toy workshop interior, wooden shelves with colorful toys and jars along the walls, a big round window with sunlight, warm and friendly, large empty wooden floor in the middle and bottom, no characters, no animals')] },
    { out: 'warsztat', prefix: 'tlo-warsztat-gra', args: [...wide, '--prompt', bg('a soft blurred cozy background of a warm wooden toy workshop, wooden wall and a light wooden tabletop, very simple and calm, lots of empty space, no characters, no objects in the foreground')] },
    { out: 'warsztat', prefix: 'stacja-sortowanie', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('three small open wooden crates in a row filled with colorful fruits, toys and vegetables, front view')] },
    { out: 'warsztat', prefix: 'stacja-ukladanka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden easel holding a colorful jigsaw puzzle picture with one piece missing, front view')] },
    { out: 'warsztat', prefix: 'skrzynka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an empty open wooden crate, front view, wide and low')] },
    { out: 'warsztat', prefix: 'wiadro', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an empty plain pure white bucket with a handle, front view, matte white plasticine')] },
    { out: 'warsztat', prefix: 'stodola', args: ['--workflow', 'flux2-sprite', '--prompt', sprite('a small red farm barn with a white cross on the door')] },
    { out: 'warsztat', prefix: 'staw', args: ['--workflow', 'flux2-sprite', '--prompt', sprite('a small round blue pond with a green lily pad and reeds, seen from slightly above')] },
  );
}

for (const item of ITEMS) {
  if ((process.argv.includes('--warsztat') || process.argv.includes('--sciezka') || process.argv.includes('--znaki') || process.argv.includes('--pracownia')) && !only) break;
  if (only && !only.has(item.id)) continue;
  if (!only && existsSync(join(repo, 'games/bystrzakowo/public/art/items', `${item.id}.webp`))) continue;
  if (existsSync(join(raw, 'items', `${item.id}-${SEED}.png`))) continue;
  const prompt = `${item.prompt}, single object, centered, ${STYLE}${hasFace(item) ? '' : ', no face on objects'}, plain light gray background`;
  tasks.push({ out: 'items', prefix: item.id, args: ['--workflow', 'flux2-sprite', '--prompt', prompt] });
}

console.log(`Do wygenerowania: ${tasks.length}`);
for (const dir of ['items', 'extra', 'warsztat', 'sciezka', 'pracownia', 'kolorowanki']) mkdirSync(join(raw, dir), { recursive: true });
// Postęp liczony w obrazkach (zadanie z --count N daje N plików .png).
const images = tasks.reduce((n, t) => n + (t.args.includes('--count') ? Number(t.args[t.args.indexOf('--count') + 1]) : t.args.includes('ace15') ? 0 : 1), 0);
execFileSync(job, ['bystrzakowo-items', 'Bystrzakowo: grafiki', String(images), '--dir', raw, '--glob', '*'], { stdio: 'inherit' });
for (const [i, t] of tasks.entries()) {
  try {
    const out = execFileSync('node', [comfy, 'gen', ...t.args, '--seed', String(SEED), '--out', join(raw, t.out), '--prefix', t.prefix], { encoding: 'utf8' });
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} ${out.trim().split('\n').pop()}`);
  } catch (e) {
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} BŁĄD ${String(e).slice(0, 200)}`);
  }
}
console.log('GOTOWE');
