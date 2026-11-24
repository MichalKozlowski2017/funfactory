/**
 * Poprawka podejrzanych nagrań lektora: dla każdego nagrania, które druga kontrola (voice-check.ts) uznała za
 * podejrzane, generuje 5 wariantów (różne seedy), ocenia je Whisperem, głoskami i literami (skill tts: legion/check.py)
 * i podmienia plik w public/audio tylko wtedy, gdy najlepszy wariant wypada wyraźnie lepiej niż obecne nagranie.
 *   node games/bystrzakowo/scripts/voice-best.ts <katalog z check-<język>.json> [pl en de es]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const game = join(import.meta.dirname, '..');
const dir = process.argv[2]!;
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['pl', 'en', 'de', 'es'];
const skill = join(homedir(), '.claude/skills/tts');
const ps = join(homedir(), '.claude/skills/comfyui/scripts/legion-ps.sh');
// Druga runda: inne seedy (VOICE_SEEDS="101,131,..."), bo te same dają te same warianty.
const SEEDS = process.env.VOICE_SEEDS ? process.env.VOICE_SEEDS.split(',').map(Number) : [11, 23, 37, 51, 73];

interface Check {
  name: string;
  text: string;
  per: number;
  cer: number;
}

/** Podejrzane: litery wyraźnie złe albo głoski znacznie gorsze niż typowe (sylabowanie „czytaj-” pomijamy: tam oba modele się gubią). */
export function suspicious(r: Check[]): Check[] {
  const mp = [...r].map((x) => x.per).sort((a, b) => a - b)[Math.floor(r.length / 2)]!;
  return r.filter((x) => !x.name.split('-').slice(1).join('-').startsWith('read') && (x.cer >= 0.34 || x.per >= mp + 0.4));
}

const score = (x: { per: number; cer: number }, whisperOk = true) => x.per + x.cer + (whisperOk ? 0 : 0.5);

/** Polskie kwestie: tekst i głos z voice/lines*.json (późniejsze pliki nadpisują). */
function polish(): Map<string, { text: string; voice: string }> {
  const m = new Map<string, { text: string; voice: string }>();
  const files = readdirSync(join(game, 'voice'))
    .filter((f) => /^(lines\d*|fix\d+)\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0) || a.localeCompare(b));
  for (const f of files) {
    const job = JSON.parse(readFileSync(join(game, 'voice', f), 'utf8'));
    for (const x of job.lines) m.set(x.name, { text: x.text, voice: x.voice ?? job.voice ?? 'voices/alt' });
  }
  return m;
}

function runCheck(l: string, sub: string, items: { name: string; text: string; wav: string }[]): Map<string, Check> {
  const local = join(dir, sub);
  writeFileSync(join(local, 'manifest.json'), JSON.stringify({ lang: l, items: items.map((i) => ({ ...i, wav: `check\\${sub}\\${i.name}.wav` })) }));
  execFileSync('bash', ['-c', `cd "${dir}" && tar czf ${sub}.tgz ${sub} && scp -q ${sub}.tgz legion:Sites/tts/${sub}.tgz`]);
  try {
    execFileSync('bash', [ps], {
      input: `cd C:\\Users\\mkozl\\Sites\\tts
if (!(Test-Path check)) { mkdir check | Out-Null }
tar xzf ${sub}.tgz -C check
$env:PYTHONIOENCODING="utf-8"
& .\\venv-vox\\Scripts\\python.exe check.py check\\${sub}\\manifest.json check\\report-${sub}.json 2>&1 | Select-String -Pattern "GOTOWE|Error" | % { "$_" }`,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
  } catch {
    // PowerShell zwraca kod ≠ 0 przy ostrzeżeniach; raport i tak powstaje.
  }
  execFileSync('scp', ['-q', `legion:Sites/tts/check/report-${sub}.json`, join(dir, `report-${sub}.json`)]);
  return new Map((JSON.parse(readFileSync(join(dir, `report-${sub}.json`), 'utf8')) as Check[]).map((x) => [x.name, x]));
}

execFileSync('scp', ['-q', join(skill, 'legion/check.py'), 'legion:Sites/tts/check.py']);
for (const l of langs) {
  const now = JSON.parse(readFileSync(join(dir, `check-${l}.json`), 'utf8')) as Check[];
  const bad = suspicious(now);
  const src = l === 'pl' ? polish() : new Map((JSON.parse(readFileSync(join(game, `voice/${l}.json`), 'utf8')).lines as { name: string; text: string; voice: string }[]).map((x) => [x.name, x]));
  const lines = bad.flatMap((b) => {
    const s = src.get(b.name)!;
    return SEEDS.map((seed) => ({ name: `${b.name}__${seed}`, text: s.text, voice: s.voice, seed, tries: 1 }));
  });
  console.log(`${l}: ${bad.length} podejrzanych, ${lines.length} wariantów`);
  if (!lines.length) continue;
  const sub = `best-${l}`;
  const raw = join(dir, `${sub}-raw`);
  mkdirSync(join(dir, sub), { recursive: true });
  const jobFile = join(dir, `${sub}.json`);
  writeFileSync(jobFile, JSON.stringify({ voice: l === 'pl' ? 'voices/alt' : `voices/lusia-${l}`, lang: l, tries: 1, lines }));
  if (!existsSync(join(raw, 'report.json'))) execFileSync(join(skill, 'tts.sh'), [jobFile, raw], { stdio: 'inherit' });
  const whisper = new Map((JSON.parse(readFileSync(join(raw, 'report.json'), 'utf8')) as { name: string; ok: boolean }[]).map((x) => [x.name, x.ok]));
  const items = lines
    .filter((x) => existsSync(join(raw, `${x.name}.wav`)))
    .map((x) => {
      const wav = join(dir, sub, `${x.name}.wav`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(raw, `${x.name}.wav`), '-ac', '1', '-ar', '16000', wav]);
      return { name: x.name, text: x.text, wav };
    });
  const cand = runCheck(l, sub, items);
  let replaced = 0;
  const left: string[] = [];
  for (const b of bad) {
    const opts = SEEDS.map((s) => cand.get(`${b.name}__${s}`)).filter((x): x is Check => !!x);
    const best = opts.sort((x, y) => score(x, whisper.get(x.name)) - score(y, whisper.get(y.name)))[0];
    const [g, ...rest] = b.name.split('-');
    if (best && score(best, whisper.get(best.name)) < score(b) - 0.1) {
      const out = join(game, 'public/audio', l === 'pl' ? '' : l, g!, `${rest.join('-')}.m4a`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(raw, `${best.name}.wav`), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', out]);
      replaced++;
      if (score(best, whisper.get(best.name)) >= 0.6) left.push(`${b.name} (${b.text}) ${score(best).toFixed(2)}`);
    } else left.push(`${b.name} (${b.text}) ${score(b).toFixed(2)}`);
  }
  writeFileSync(join(dir, `left-${l}.txt`), left.join('\n'));
  console.log(`${l}: podmienione ${replaced}/${bad.length}; nadal słabe: ${left.length}`);
}
