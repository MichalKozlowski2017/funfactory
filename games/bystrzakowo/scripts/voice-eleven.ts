/**
 * Narrator recordings from ElevenLabs (native voices) for one language, with automatic checking and picking.
 *   node games/bystrzakowo/scripts/voice-eleven.ts <lang> [--only name1,name2] [--seeds 1,2] [--dry]
 * Texts: voice/<lang>.json. Voices: VOICES below (ElevenLabs library voices chosen in the casting, see docs/bystrzakowo.md).
 * For every line: one recording per seed (Eleven v4), a pronunciation check on Legion (tts skill: legion/check.py),
 * the best variant (lowest phoneme + letter error) trimmed, loudness-normalised and written to public/audio/<lang>/<guide>/.
 * Raw takes and reports: assets-raw/bystrzakowo/eleven/<lang>/ (not in git). The choice per line: voice/eleven-<lang>.json.
 * API key: ~/.funfactory-keys/elevenlabs.key (never in the repo).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { only: { type: 'string' }, seeds: { type: 'string', default: '1,2' }, dry: { type: 'boolean', default: false } } });
const lang = positionals[0]!;
/** ElevenLabs library voice ids per language and guide (the ids in the owner's "My voices" are looked up at run time). */
const VOICES: Record<string, Record<string, { id: string; name: string }>> = {
  de: { lusia: { id: 'qAVuy3NdMTW0CZ8uA7M9', name: 'Julia - Cheerful and Fun' }, bazyl: { id: 'tqsaTjde7edL1GHtFchL', name: 'Ben Smile - Friendly Storyteller' } },
  es: { lusia: { id: 'yqTu7PvIL2rV3ubtjNlx', name: 'Gaby - Warm, Tender and Inviting' }, bazyl: { id: 'YKUjKbMlejgvkOZlnnvt', name: 'Alejandro Ballesteros - Warm and Joyful' } },
};
const MODEL = 'eleven_v4';
const game = join(import.meta.dirname, '..');
const raw = join(game, '../../assets-raw/bystrzakowo/eleven', lang);
const skill = join(homedir(), '.claude/skills/tts');
const ps = join(homedir(), '.claude/skills/comfyui/scripts/legion-ps.sh');
const KEY = readFileSync(join(homedir(), '.funfactory-keys/elevenlabs.key'), 'utf8').trim();
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
const seeds = values.seeds!.split(',').map(Number);
mkdirSync(join(raw, 'take'), { recursive: true });
mkdirSync(join(raw, 'wav'), { recursive: true });

type Line = { name: string; text: string };
let lines: Line[] = JSON.parse(readFileSync(join(game, `voice/${lang}.json`), 'utf8')).lines;
if (values.only) {
  const only = new Set(values.only.split(','));
  lines = lines.filter((l) => only.has(l.name));
}
const guideOf = (name: string) => name.split('-')[0]!;

// Library voice id -> id in "My voices" (added during the casting).
const mine = new Map<string, string>();
for (const v of ((await (await fetch('https://api.elevenlabs.io/v1/voices', { headers: H })).json()) as any).voices ?? []) if (v.sharing?.original_voice_id) mine.set(v.sharing.original_voice_id, v.voice_id);
for (const [g, v] of Object.entries(VOICES[lang]!)) if (!mine.has(v.id)) throw new Error(`voice ${v.name} (${g}) is not in My voices`);

// 1. Takes: one per seed, 4 requests at a time (the plan allows 5 concurrent).
const jobs = lines.flatMap((l) => seeds.map((seed) => ({ l, seed, file: join(raw, 'take', `${l.name}__${seed}.mp3`) }))).filter((j) => !existsSync(j.file));
console.log(`${lang}: ${lines.length} lines, ${jobs.length} new takes`);
if (values.dry) process.exit(0);
let done = 0;
async function take(j: (typeof jobs)[number]): Promise<void> {
  const voice = mine.get(VOICES[lang]![guideOf(j.l.name)]!.id)!;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ text: j.l.text, model_id: MODEL, language_code: lang, seed: j.seed }),
    });
    if (r.ok) {
      writeFileSync(j.file, Buffer.from(await r.arrayBuffer()));
      if (++done % 50 === 0) console.log(`take ${done}/${jobs.length}`);
      return;
    }
    const msg = (await r.text()).slice(0, 200);
    if (r.status === 429 || r.status >= 500) await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
    else throw new Error(`TTS ${j.l.name}: ${r.status} ${msg}`);
  }
  throw new Error(`TTS ${j.l.name}: gave up`);
}
const queue = [...jobs];
await Promise.all(Array.from({ length: 4 }, async () => { for (let j; (j = queue.shift()); ) await take(j); }));

// 2. Check every take on Legion (phonemes + letters, no language model).
const items = lines.flatMap((l) => seeds.map((seed) => {
  const id = `${l.name}__${seed}`;
  const wav = join(raw, 'wav', `${id}.wav`);
  if (!existsSync(wav)) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(raw, 'take', `${id}.mp3`), '-ac', '1', '-ar', '16000', wav]);
  return { name: id, text: l.text, wav: `check\\eleven-${lang}\\${id}.wav` };
}));
const sub = `eleven-${lang}`;
writeFileSync(join(raw, 'wav', 'manifest.json'), JSON.stringify({ lang, items }));
execFileSync('bash', ['-c', `cd "${raw}" && rm -rf ${sub} && cp -r wav ${sub} && tar czf ${sub}.tgz ${sub} && rm -rf ${sub} && scp -q ${sub}.tgz legion:Sites/tts/${sub}.tgz && scp -q "${join(skill, 'legion/check.py')}" legion:Sites/tts/check.py`]);
try {
  execFileSync('bash', [ps], {
    input: `cd C:\\Users\\mkozl\\Sites\\tts
if (!(Test-Path check)) { mkdir check | Out-Null }
if (Test-Path check\\${sub}) { Remove-Item -Recurse -Force check\\${sub} }
tar xzf ${sub}.tgz -C check
$env:PYTHONIOENCODING="utf-8"
& .\\venv-vox\\Scripts\\python.exe check.py check\\${sub}\\manifest.json check\\report-${sub}.json 2>&1 | Select-String -Pattern "GOTOWE|Error" | % { "$_" }`,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
} catch {
  // PowerShell exits non-zero on warnings; the report is written anyway.
}
execFileSync('scp', ['-q', `legion:Sites/tts/check/report-${sub}.json`, join(raw, 'report.json')]);
type Check = { name: string; per: number; cer: number; heard_text?: string };
const rep = new Map((JSON.parse(readFileSync(join(raw, 'report.json'), 'utf8')) as Check[]).map((c) => [c.name, c]));

// 3. Pick the best take per line and write it in the game's format.
const choiceFile = join(game, `voice/eleven-${lang}.json`);
const choice: Record<string, unknown> = existsSync(choiceFile) ? JSON.parse(readFileSync(choiceFile, 'utf8')).lines : {};
const weak: string[] = [];
const score = (c: Check | undefined) => (c ? c.per + c.cer : 9);
for (const l of lines) {
  const best = seeds.map((s) => ({ s, c: rep.get(`${l.name}__${s}`) })).sort((a, b) => score(a.c) - score(b.c))[0]!;
  const g = guideOf(l.name);
  const out = join(game, 'public/audio', lang, g, `${l.name.slice(g.length + 1)}.m4a`);
  // Trim silence (40 ms kept before, 120 ms after, as in the tts skill), normalise loudness, AAC mono like the other recordings.
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse';
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(raw, 'take', `${l.name}__${best.s}.mp3`), '-af', `${trim},loudnorm=I=-16:TP=-1.5:LRA=11`, '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', out]);
  choice[l.name] = { text: l.text, voice: VOICES[lang]![g]!.name, model: MODEL, seed: best.s, per: best.c?.per, cer: best.c?.cer };
  // Syllable reading ("read-") is skipped: both recognisers get lost on syllables.
  if (!l.name.includes('-read-') && (!best.c || best.c.cer >= 0.34 || best.c.per >= 0.5)) weak.push(`${l.name} | ${l.text} | heard: ${best.c?.heard_text ?? '?'} | per ${best.c?.per} cer ${best.c?.cer}`);
}
writeFileSync(choiceFile, JSON.stringify({ lang, model: MODEL, voices: VOICES[lang], lines: choice }, null, 1));
writeFileSync(join(raw, 'weak.txt'), weak.join('\n'));
const s = (await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: H })).json()) as any;
console.log(`${lang}: written ${lines.length}, weak ${weak.length} (assets-raw/bystrzakowo/eleven/${lang}/weak.txt); credits ${s.character_count}/${s.character_limit}`);
console.log('KONIEC');
