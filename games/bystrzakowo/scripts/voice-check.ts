/**
 * Druga kontrola wymowy lektora (głoski i litery bez modelu językowego), skill tts: legion/check.py.
 *   node games/bystrzakowo/scripts/voice-check.ts <out_dir> [pl en de es]
 * Zbiera teksty używanych nagrań, robi WAV-y 16 kHz, wysyła na Legiona i ściąga raporty
 * <out_dir>/check-<język>.json. Ranking: games/bystrzakowo/scripts/voice-rank.ts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setLang, type Lang } from '../src/sim/lang.ts';
import { voiceLines } from '../src/voice-lines.ts';

const game = join(import.meta.dirname, '..');
const out = process.argv[2]!;
const langs = (process.argv.slice(3).length ? process.argv.slice(3) : ['pl', 'en', 'de', 'es']) as Lang[];
const skill = join(homedir(), '.claude/skills/tts');
const ps = join(homedir(), '.claude/skills/comfyui/scripts/legion-ps.sh');

/** Tekst każdego nagrania: polskie z voice/lines*.json (późniejsze pliki nadpisują), obce z voice/<język>.json. */
function texts(l: Lang): Map<string, string> {
  const m = new Map<string, string>();
  if (l !== 'pl') {
    for (const x of JSON.parse(readFileSync(join(game, `voice/${l}.json`), 'utf8')).lines) m.set(x.name, x.text);
    return m;
  }
  const files = readdirSync(join(game, 'voice'))
    .filter((f) => /^(lines\d*|fix\d+)\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0) || a.localeCompare(b));
  for (const f of files) for (const x of JSON.parse(readFileSync(join(game, 'voice', f), 'utf8')).lines) m.set(x.name, x.text);
  return m;
}

execFileSync('scp', ['-q', join(skill, 'legion/check.py'), 'legion:Sites/tts/check.py']);
for (const l of langs) {
  setLang(l);
  const t = texts(l);
  const dir = join(out, l);
  mkdirSync(dir, { recursive: true });
  const items: { name: string; text: string; wav: string }[] = [];
  for (const g of ['lusia', 'bazyl'] as const)
    for (const line of voiceLines(l)[g]) {
      const name = `${g}-${line}`;
      const src = join(game, 'public/audio', l === 'pl' ? '' : l, g, `${line}.m4a`);
      const text = t.get(name);
      if (!text || !existsSync(src)) {
        console.log(`pomijam ${l} ${name} (${text ? 'brak pliku' : 'brak tekstu'})`);
        continue;
      }
      const wav = join(dir, `${name}.wav`);
      if (!existsSync(wav)) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '16000', wav]);
      items.push({ name, text, wav: `check\\${l}\\${name}.wav` });
    }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ lang: l, items }));
  console.log(`${l}: ${items.length} nagrań, wysyłam`);
  execFileSync('bash', ['-c', `cd "${out}" && tar czf ${l}.tgz ${l} && scp -q ${l}.tgz legion:Sites/tts/${l}.tgz`]);
  let log = '';
  try {
    log = execFileSync('bash', [ps], {
      input: `cd C:\\Users\\mkozl\\Sites\\tts
if (!(Test-Path check)) { mkdir check | Out-Null }
tar xzf ${l}.tgz -C check
$env:PYTHONIOENCODING="utf-8"
& .\\venv-vox\\Scripts\\python.exe check.py check\\${l}\\manifest.json check\\report-${l}.json 2>&1 | % { "$_" } | Select-String -Pattern "GOTOWE|Error|Traceback" | % { "$_" }`,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
  } catch (e) {
    // PowerShell zwraca kod ≠ 0 przy ostrzeżeniach; liczy się „GOTOWE” w wyjściu.
    log = String((e as { stdout?: string }).stdout ?? e);
  }
  console.log(log.trim().split('\n').slice(-3).join('\n'));
  execFileSync('scp', ['-q', `legion:Sites/tts/check/report-${l}.json`, join(out, `check-${l}.json`)]);
}
