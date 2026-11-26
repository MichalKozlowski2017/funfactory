/**
 * Evens out syllable reading ("lusia-read-*": "To... ma... te... ... Tomate.") in ElevenLabs recordings.
 * The model reads each next syllable quieter and slower, and after a syllable ending in a vowel it often adds a breath
 * or a sigh ("ne..." + exhale). This splits the take at its pauses into syllables + the word, cuts the breath after the
 * voice in pieces that end in a vowel (after a final consonant only ~140 ms are kept), rejects takes with a whispered syllable (no voice left), brings every piece to
 * the loudness of the first syllable, speeds up drawn-out syllables (pitch unchanged), sets even pauses and writes the
 * result over public/audio/<lang>/lusia/.
 *   node games/bystrzakowo/scripts/voice-syllables.ts <lang> [--only name1,name2] [--out dir]
 * Needs the takes from voice-eleven.ts (assets-raw/bystrzakowo/eleven/<lang>/take) and the choice in voice/eleven-<lang>.json.
 * Takes are tried from the chosen seed on; lines with no usable take are listed (record more seeds with voice-eleven.ts).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { only: { type: 'string' }, out: { type: 'string' } } });
const lang = positionals[0]!;
const game = join(import.meta.dirname, '..');
const raw = join(game, '../../assets-raw/bystrzakowo/eleven', lang);
const tmp = join(raw, 'syl');
mkdirSync(tmp, { recursive: true });
const GAP = 0.45; // between syllables
const GAP_WORD = 0.85; // before the whole word
const PAD = 0.03; // kept around each piece
const MAX_TEMPO = 1.35;
const MAX_SYLLABLE = 0.45; // longer syllables are sped up towards this
const MIN_VOICED = 0.15; // a syllable with less voice than this was whispered: try another take

const choice = JSON.parse(readFileSync(join(game, `voice/eleven-${lang}.json`), 'utf8')).lines as Record<string, { text: string; seed: number }>;
let names = Object.keys(choice).filter((n) => n.includes('-read-'));
if (values.only) names = names.filter((n) => values.only!.split(',').includes(n));

const ff = (args: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const sh = (cmd: string) => execFileSync('bash', ['-c', cmd], { encoding: 'utf8' });

/** Speech parts of a take (between pauses found with the given silence settings). */
function speechParts(file: string, noise: number, minGap: number): [number, number][] {
  const r = sh(`ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=${noise}dB:d=${minGap} -f null - 2>&1`);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));
  const starts = [...r.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...r.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const speech: [number, number][] = [];
  let t = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i]! - t > 0.05) speech.push([t, starts[i]!]);
    t = ends[i] ?? dur;
  }
  if (dur - t > 0.05) speech.push([t, dur]);
  return speech;
}

/** Split into exactly `want` parts: stricter silence settings first; a plosive closure ("Pup") is merged back. */
function split(file: string, want: number): [number, number][] | null {
  for (const [noise, gap] of [[-40, 0.12], [-35, 0.1], [-32, 0.08], [-30, 0.06]] as const) {
    const sp = speechParts(file, noise, gap);
    while (sp.length > want) {
      let k = 0;
      for (let i = 1; i < sp.length - 1; i++) if (sp[i + 1]![0] - sp[i]![1] < sp[k + 1]![0] - sp[k]![1]) k = i;
      if (sp[k + 1]![0] - sp[k]![1] > 0.25) break;
      sp.splice(k, 2, [sp[k]![0], sp[k + 1]![1]]);
    }
    if (sp.length === want) return sp;
  }
  return null;
}

/** End of the voice: the last 10 ms frame that is loud (within 35 dB of the peak) and voiced (few zero crossings). */
function voiceEnd(file: string): number {
  const pcm = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], { maxBuffer: 1 << 26 });
  const n = pcm.length / 2;
  const F = 160;
  const frames: { db: number; zcr: number }[] = [];
  for (let o = 0; o + F <= n; o += F) {
    let e = 0, z = 0, prev = 0;
    for (let k = 0; k < F; k++) {
      const v = pcm.readInt16LE((o + k) * 2);
      e += v * v;
      if (k && (v >= 0) !== (prev >= 0)) z++;
      prev = v;
    }
    frames.push({ db: 10 * Math.log10(e / F + 1), zcr: z / F });
  }
  const peak = Math.max(...frames.map((f) => f.db));
  const voiced = (f: { db: number; zcr: number }) => f.db > peak - 35 && f.zcr < 0.2;
  let last = frames.length - 1;
  while (last > 0 && !voiced(frames[last]!)) last--;
  return (last + 1) * 0.01;
}
const endsWithVowel = (s: string) => /[aeiouyäöüáéíóúàèìòùâêîôû]$/i.test(s.normalize('NFC'));
const meanDb = (file: string) => Number(/mean_volume: (-?[\d.]+) dB/.exec(sh(`ffmpeg -hide_banner -i "${file}" -af volumedetect -f null - 2>&1`))![1]);

type Piece = { f: string; dur: number; db: number };
/** Cut a take into pieces; null when a syllable was whispered (too little voice). */
function cut(name: string, take: string, speech: [number, number][], parts: string[]): Piece[] | null {
  const pieces: Piece[] = [];
  for (const [i, [a, b]] of speech.entries()) {
    const rawPiece = join(tmp, `${name}-${i}-raw.wav`);
    ff(['-ss', String(Math.max(0, a - PAD)), '-to', String(b + PAD), '-i', take, '-ac', '1', '-ar', '44100', rawPiece]);
    const f = join(tmp, `${name}-${i}.wav`);
    let dur = b - a + 2 * PAD;
    if (endsWithVowel(parts[i]!)) {
      const end = Math.min(dur, voiceEnd(rawPiece) + 0.04);
      if (end < MIN_VOICED) return null;
      ff(['-i', rawPiece, '-af', `atrim=0:${end.toFixed(3)},afade=t=out:st=${Math.max(0, end - 0.04).toFixed(3)}:d=0.04`, f]);
      dur = end;
    } else {
      // A final consonant ("Müt", "Kat") is unvoiced too, but lasts at most ~140 ms; anything longer is breath.
      const end = Math.min(dur, voiceEnd(rawPiece) + 0.14);
      ff(['-i', rawPiece, '-af', `atrim=0:${end.toFixed(3)},afade=t=out:st=${Math.max(0, end - 0.03).toFixed(3)}:d=0.03`, f]);
      dur = end;
    }
    pieces.push({ f, dur, db: meanDb(f) });
  }
  return pieces;
}

const done: string[] = [];
const skipped: string[] = [];
for (const name of names) {
  const text = choice[name]!.text;
  const parts = text.split(/\.\.\.|\.\s/).map((s) => s.replace(/\./g, '').trim()).filter(Boolean);
  const seeds = [choice[name]!.seed, ...readdirSync(join(raw, 'take')).filter((f) => f.startsWith(`${name}__`)).map((f) => Number(f.split('__')[1]!.replace('.mp3', '')))];
  let pieces: Piece[] | null = null;
  for (const s of [...new Set(seeds)]) {
    const take = join(raw, 'take', `${name}__${s}.mp3`);
    if (!existsSync(take)) continue;
    const speech = split(take, parts.length);
    if (speech) pieces = cut(name, take, speech, parts);
    if (pieces) break;
  }
  if (!pieces) {
    skipped.push(name);
    continue;
  }
  const ref = pieces[0]!;
  const sylDurs = pieces.slice(0, -1).map((p) => p.dur).sort((x, y) => x - y);
  const target = Math.min(sylDurs[Math.floor(sylDurs.length / 2)]!, MAX_SYLLABLE);
  const fixed = pieces.map((p, i) => {
    const isWord = i === pieces!.length - 1;
    const gain = ref.db - p.db; // every piece as loud as the first syllable
    const tempo = !isWord && p.dur > target * 1.15 ? Math.min(MAX_TEMPO, p.dur / target) : 1;
    const f = join(tmp, `${name}-${i}-fx.wav`);
    ff(['-i', p.f, '-af', `volume=${gain.toFixed(2)}dB${tempo > 1 ? `,atempo=${tempo.toFixed(3)}` : ''}`, f]);
    return f;
  });
  const gap = (s: number) => {
    const f = join(tmp, `gap-${s}.wav`);
    if (!existsSync(f)) ff(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(s), f]);
    return f;
  };
  const list = fixed.flatMap((f, i) => (i === 0 ? [f] : [gap(i === fixed.length - 1 ? GAP_WORD : GAP), f]));
  writeFileSync(join(tmp, 'list.txt'), list.map((f) => `file '${f}'`).join('\n'));
  const out = values.out ? join(values.out, `${lang}-${name}.m4a`) : join(game, 'public/audio', lang, 'lusia', `${name.slice('lusia-'.length)}.m4a`);
  ff(['-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', out]);
  done.push(name);
}
console.log(`${lang}: evened ${done.length}, no usable take ${skipped.length}${skipped.length ? `: ${skipped.join(',')}` : ''}`);
