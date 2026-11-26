/**
 * Evens out syllable reading ("lusia-read-*": "To... ma... te... ... Tomate.") in ElevenLabs recordings.
 * The model reads each next syllable quieter and slower. This splits the chosen take at its pauses into
 * syllables + the word, brings every syllable to the loudness of the first one, speeds up syllables that got
 * longer than the first (pitch unchanged), sets even pauses and writes the result over public/audio/<lang>/lusia/.
 *   node games/bystrzakowo/scripts/voice-syllables.ts <lang> [--only name1,name2] [--out dir]
 * Needs the takes from voice-eleven.ts (assets-raw/bystrzakowo/eleven/<lang>/take) and the choice in voice/eleven-<lang>.json.
 * A take whose pauses don't match the number of syllables is tried with the other seeds; if none matches, the line is left as is.
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

const choice = JSON.parse(readFileSync(join(game, `voice/eleven-${lang}.json`), 'utf8')).lines as Record<string, { text: string; seed: number }>;
let names = Object.keys(choice).filter((n) => n.includes('-read-'));
if (values.only) names = names.filter((n) => values.only!.split(',').includes(n));

const ff = (args: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
function analyse(file: string, noise = -40, minGap = 0.12): { speech: [number, number][]; dur: number } {
  const r = execFileSync('bash', ['-c', `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=${noise}dB:d=${minGap} -f null - 2>&1`], { encoding: 'utf8' });
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));
  const starts = [...r.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...r.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  // Speech = the gaps between silences.
  const speech: [number, number][] = [];
  let t = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i]! - t > 0.05) speech.push([t, starts[i]!]);
    t = ends[i] ?? dur;
  }
  if (dur - t > 0.05) speech.push([t, dur]);
  return { speech, dur };
}
const meanDb = (file: string) => Number(/mean_volume: (-?[\d.]+) dB/.exec(execFileSync('bash', ['-c', `ffmpeg -hide_banner -i "${file}" -af volumedetect -f null - 2>&1`], { encoding: 'utf8' }))![1]);

const done: string[] = [];
const skipped: string[] = [];
for (const name of names) {
  const text = choice[name]!.text;
  const parts = text.split(/\.\.\.|\.\s/).map((s) => s.replace(/\./g, '').trim()).filter(Boolean);
  const want = parts.length; // syllables + word
  const seeds = [choice[name]!.seed, ...readdirSync(join(raw, 'take')).filter((f) => f.startsWith(`${name}__`)).map((f) => Number(f.split('__')[1]!.replace('.mp3', '')))];
  let take: string | null = null;
  let speech: [number, number][] = [];
  for (const s of [...new Set(seeds)]) {
    const f = join(raw, 'take', `${name}__${s}.mp3`);
    if (!existsSync(f)) continue;
    // Pauses between syllables can be short or not fully silent: try stricter settings first, then looser ones.
    for (const [noise, gap] of [[-40, 0.12], [-35, 0.1], [-32, 0.08], [-30, 0.06]] as const) {
      const a = analyse(f, noise, gap);
      // A plosive at the end of a syllable ("Pup") leaves a short closure that looks like a pause: merge the shortest gaps.
      while (a.speech.length > want) {
        let k = 0;
        for (let i = 1; i < a.speech.length - 1; i++) if (a.speech[i + 1]![0] - a.speech[i]![1] < a.speech[k + 1]![0] - a.speech[k]![1]) k = i;
        if (a.speech[k + 1]![0] - a.speech[k]![1] > 0.25) break;
        a.speech.splice(k, 2, [a.speech[k]![0], a.speech[k + 1]![1]]);
      }
      if (a.speech.length === want) {
        take = f;
        speech = a.speech;
        break;
      }
    }
    if (take) break;
  }
  if (!take) {
    skipped.push(`${name} (${text})`);
    continue;
  }
  // Cut the pieces, measure loudness and length.
  const pieces = speech.map(([a, b], i) => {
    const f = join(tmp, `${name}-${i}.wav`);
    ff(['-ss', String(Math.max(0, a - PAD)), '-to', String(b + PAD), '-i', take!, '-ac', '1', '-ar', '44100', f]);
    return { f, dur: b - a + 2 * PAD, db: meanDb(f) };
  });
  const ref = pieces[0]!;
  const fixed = pieces.map((p, i) => {
    const isWord = i === pieces.length - 1;
    const gain = ref.db - p.db; // every piece as loud as the first syllable
    const tempo = !isWord && i > 0 && p.dur > ref.dur * 1.15 ? Math.min(MAX_TEMPO, p.dur / ref.dur) : 1;
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
console.log(`${lang}: evened ${done.length}, left as is ${skipped.length}${skipped.length ? `:\n  ${skipped.join('\n  ')}` : ''}`);
