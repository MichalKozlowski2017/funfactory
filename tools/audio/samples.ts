/**
 * Próbki instrumentów z VSCO 2 Community Edition (CC0) dla muzyki gry.
 *
 *   node tools/audio/samples.ts [games/glut]
 *
 * 1. Pobiera tylko potrzebne pliki WAV z GitHuba do `assets-raw/vsco/` (ignorowane przez git, pobiera raz).
 * 2. Obróbka w JS: mono, cięcie ciszy na początku i końcu, limit długości z krótkim wyciszeniem,
 *    normalizacja szczytu, a dla padów „wypieczona” pętla (koniec przenika w miejsce pętli, bez kliknięcia).
 * 3. Koduje ffmpeg do mono AAC (.m4a: Safari/WKWebView i Chrome umieją `decodeAudioData`).
 * 4. Zapisuje `public/audio/samples/manifest.json`: instrumenty, pliki, nuta bazowa (MIDI), głośność, pętle.
 *
 * Nazwy nut w VSCO dla większości instrumentów są o oktawę niżej niż brzmią (C3 = środkowe C),
 * dlatego `note` w specyfikacji to sprawdzona wysokość rzeczywista (MIDI, A4 = 69), zmierzona detektorem tonu.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const game = process.argv[2] ?? 'games/glut';
const RAW = join(ROOT, 'assets-raw', 'vsco');
const OUT = join(ROOT, game, 'public', 'audio', 'samples');
const REPO = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/';
const SR = 44100;
const BITRATE = '80k';

interface Zone {
  /** Ścieżka w repozytorium VSCO-2-CE. */
  src: string;
  /** Wysokość rzeczywista (MIDI); brak = perkusja bez wysokości. */
  note?: number;
}

interface Spec {
  id: string;
  zones: Zone[];
  /** Maks. długość (s); dłuższe próbki dostają wyciszenie `fade`. */
  maxLen: number;
  fade?: number;
  /** Pętla do trzymania dźwięku dłużej niż próbka: od `start` do końca, z przenikaniem `cross` s. */
  loop?: { start: number; cross: number };
  /** Dodatkowa korekta głośności instrumentu (domyślnie 1). */
  gain?: number;
}

const tag = (path: string, n: number): Zone => ({ src: path, note: n });

const SPECS: Spec[] = [
  // --- dzwonki i sztabki ---
  {
    id: 'glock', maxLen: 1.6, fade: 0.4,
    zones: [
      tag('Percussion/Glock/glock_medium_G4.wav', 79),
      tag('Percussion/Glock/glock_medium_C5.wav', 84),
      tag('Percussion/Glock/glock_medium_G5.wav', 91),
      tag('Percussion/Glock/glock_medium_C6.wav', 96),
      tag('Percussion/Glock/glock_medium_G6.wav', 103),
    ],
  },
  {
    id: 'marimba', maxLen: 1.2, fade: 0.3,
    zones: [
      tag('Percussion/Marimba/Marimba_hit_Outrigger_F3_loud_01.wav', 65),
      tag('Percussion/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav', 72),
      tag('Percussion/Marimba/Marimba_hit_Outrigger_G4_loud_01.wav', 79),
      tag('Percussion/Marimba/Marimba_hit_Outrigger_B4_loud_01.wav', 83),
      tag('Percussion/Marimba/Marimba_hit_Outrigger_F5_loud_01.wav', 89),
      tag('Percussion/Marimba/Marimba_hit_Outrigger_C6_loud_01.wav', 96),
    ],
  },
  {
    id: 'xylo', maxLen: 0.9, fade: 0.25,
    zones: [
      tag('Percussion/Xylo/Xylo_Medium_G3_ff_01_far.wav', 67),
      tag('Percussion/Xylo/Xylo_Medium_C4_ff_01_far.wav', 72),
      tag('Percussion/Xylo/Xylo_Medium_G4_ff_01_far.wav', 79),
      tag('Percussion/Xylo/Xylo_Medium_C5_ff_01_far.wav', 84),
      tag('Percussion/Xylo/Xylo_Medium_G5_ff_01_far.wav', 91),
      tag('Percussion/Xylo/Xylo_Medium_C6_ff_01_far.wav', 96),
    ],
  },
  // --- struny szarpane ---
  {
    id: 'harp', maxLen: 2, fade: 0.5,
    zones: [
      tag('Strings/Harp/KSHarp_F4_mf.wav', 65),
      tag('Strings/Harp/KSHarp_C5_mf.wav', 72),
      tag('Strings/Harp/KSHarp_G5_mf.wav', 79),
      tag('Strings/Harp/KSHarp_D6_mf.wav', 86),
      tag('Strings/Harp/KSHarp_A6_mf.wav', 93),
    ],
  },
  {
    id: 'pizz', maxLen: 0.9, fade: 0.25,
    zones: [
      tag('Strings/Violin Section/Pizz/VlnEns_Pizz_D3_v2_rr1.wav', 62),
      tag('Strings/Violin Section/Pizz/VlnEns_Pizz_A3_v2_rr1.wav', 69),
      tag('Strings/Violin Section/Pizz/VlnEns_Pizz_E4_v2_rr1.wav', 76),
      tag('Strings/Violin Section/Pizz/VlnEns_Pizz_B4_v2_rr1.wav', 83),
      tag('Strings/Violin Section/Pizz/VlnEns_Pizz_D5_v2_rr1.wav', 86),
    ],
  },
  {
    id: 'bassPizz', maxLen: 1.2, fade: 0.3,
    zones: [
      tag('Strings/Cello Section/pizzT/pizzT_E1_v2_RR1.wav', 40),
      tag('Strings/Cello Section/pizzT/pizzT_G1_v2_RR1.wav', 43),
      tag('Strings/Cello Section/pizzT/pizzT_D2_v2_RR1.wav', 50),
      tag('Strings/Cello Section/pizzT/pizzT_A2_v2_RR1.wav', 57),
      tag('Strings/Cello Section/pizzT/pizzT_E3_v2_RR1.wav', 64),
    ],
  },
  // --- dęte ---
  {
    id: 'tuba', maxLen: 0.8, fade: 0.2,
    zones: [
      tag('Brass/Tuba/stac/Tuba3_stac_F1_v2_rr1_Sum.wav', 41),
      tag('Brass/Tuba/stac/Tuba3_stac_A#1_v2_rr1_Sum.wav', 46),
      tag('Brass/Tuba/stac/Tuba3_stac_F2_v2_rr1_Sum.wav', 53),
      tag('Brass/Tuba/stac/Tuba3_stac_A#2_v2_rr1_Sum.wav', 58),
      tag('Brass/Tuba/stac/Tuba3_stac_D3_v2_rr1_Sum.wav', 62),
    ],
  },
  {
    // Sekcja: puzon w dole, trąbka w górze (akordy „dęte” i melodia w ciemnych światach).
    id: 'brass', maxLen: 1, fade: 0.25,
    zones: [
      tag('Brass/Tenor Trombone/stac/tenortbn_stac_F1_v3_rr1.wav', 41),
      tag('Brass/Tenor Trombone/stac/tenortbn_stac_A#1_v3_rr1.wav', 46),
      tag('Brass/Tenor Trombone/stac/tenortbn_stac_F2_v3_rr1.wav', 53),
      tag('Brass/Tenor Trombone/stac/tenortbn_stac_A#2_v3_rr1.wav', 58),
      tag('Brass/Tenor Trombone/stac/tenortbn_stac_F3_v3_rr1.wav', 65),
      tag('Brass/Trumpet/stac/Sum_SHTrumpet_stac_A#3_v2_rr1.wav', 70),
      tag('Brass/Trumpet/stac/Sum_SHTrumpet_stac_D4_v2_rr1.wav', 74),
      tag('Brass/Trumpet/stac/Sum_SHTrumpet_stac_F4_v2_rr1.wav', 77),
    ],
  },
  // --- smyczki trzymane (pady) ---
  {
    id: 'violas', maxLen: 4, fade: 0.3, loop: { start: 1.4, cross: 0.8 },
    zones: [
      tag('Strings/Viola Section/susvib/ViolaEns_susvib_G2_v1_1.wav', 55),
      tag('Strings/Viola Section/susvib/ViolaEns_susvib_D3_v1_1.wav', 62),
      tag('Strings/Viola Section/susvib/ViolaEns_susvib_A3_v1_1.wav', 69),
      tag('Strings/Viola Section/susvib/ViolaEns_susvib_E4_v1_1.wav', 76),
    ],
  },
  {
    id: 'cellos', maxLen: 4, fade: 0.3, loop: { start: 1.4, cross: 0.8 },
    zones: [
      tag('Strings/Cello Section/susvib/susvib_F2_v1_1.wav', 53),
      tag('Strings/Cello Section/susvib/susvib_C3_v1_1.wav', 60),
      tag('Strings/Cello Section/susvib/susvib_G3_v1_1.wav', 67),
      tag('Strings/Cello Section/susvib/susvib_D4_v1_1.wav', 74),
    ],
  },
  // --- perkusja ---
  { id: 'kickSoft', maxLen: 0.7, fade: 0.2, zones: [{ src: 'VSCO 1 Percussion/drums/bass/bdrum_muted_ff_1.wav' }] },
  { id: 'kickHard', maxLen: 0.9, fade: 0.3, zones: [{ src: 'Percussion/BDrumNewhit_v5_rr1_Sum.wav' }] },
  { id: 'bassDrum', maxLen: 2.2, fade: 0.8, zones: [{ src: 'VSCO 1 Percussion/drums/bass/bdrum_f_1.wav' }] },
  { id: 'taiko', maxLen: 1.6, fade: 0.5, zones: [{ src: 'VSCO 1 Percussion/drums/other/ethnic/giant/mallet/EthnicLargeMallet_hit_ff_1.wav' }] },
  { id: 'slap', maxLen: 0.6, fade: 0.2, zones: [{ src: 'VSCO 1 Percussion/drums/other/ethnic/giant/hand/EthnicLargeHand_hit_ff_1.wav' }] },
  { id: 'snare', maxLen: 0.6, fade: 0.2, zones: [{ src: 'Percussion/Snare2-HitSN_v5_rr1_Sum.wav' }] },
  { id: 'snareSoft', maxLen: 0.5, fade: 0.2, zones: [{ src: 'VSCO 1 Percussion/drums/snare/drum1/snare1_f_1.wav' }] },
  { id: 'rimshot', maxLen: 0.4, fade: 0.15, zones: [{ src: 'VSCO 1 Percussion/drums/snare/drum1/snare1_rimshot_f.wav' }] },
  { id: 'tom', maxLen: 0.9, fade: 0.3, zones: [{ src: 'VSCO 1 Percussion/drums/tenor/tenor_lower/tenor_ff_1.wav' }] },
  { id: 'timpani', maxLen: 2.2, fade: 0.8, zones: [{ src: 'Percussion/Timpani/Timpani4_Hit_v3_rr1_Sum.wav' }] },
  { id: 'crash', maxLen: 3, fade: 1.2, zones: [{ src: 'VSCO 1 Percussion/varMetal/Cymbals/clash/crash_hit_ff_loose.wav' }] },
  { id: 'tss', maxLen: 1.2, fade: 0.5, zones: [{ src: 'VSCO 1 Percussion/varMetal/Cymbals/clash/crash_hit_ff_verytight.wav' }] },
  { id: 'shaker', maxLen: 0.3, fade: 0.1, zones: [{ src: "VSCO 1 Percussion/varWood/Camo's Shaker/shake2.wav" }] },
  { id: 'tamb', maxLen: 0.4, fade: 0.15, zones: [{ src: 'Miscellania Raw/Misc 2/tamb3_1.wav' }] },
  { id: 'triangle', maxLen: 1.2, fade: 0.5, zones: [{ src: 'Percussion/temp/Triangle6-HitM_v1_rr1_Sum.wav' }] },
  { id: 'anvil', maxLen: 0.8, fade: 0.3, zones: [{ src: 'Percussion/Anvil_Hit1_v2_Sum.wav' }] },
  { id: 'brake', maxLen: 0.6, fade: 0.25, zones: [{ src: 'Percussion/BrakeDrum1_Hammer_v2_Sum.wav' }] },
  { id: 'claves', maxLen: 0.3, fade: 0.1, zones: [{ src: 'Percussion/Claves1_Hit_v2_rr1_Sum.wav' }] },
];

async function download(src: string): Promise<string> {
  const path = join(RAW, src);
  if (existsSync(path)) return path;
  mkdirSync(dirname(path), { recursive: true });
  const res = await fetch(REPO + src.split('/').map(encodeURIComponent).join('/'));
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function decode(path: string): Float32Array {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
}

function peakOf(x: Float32Array): number {
  let p = 0;
  for (const v of x) p = Math.max(p, Math.abs(v));
  return p;
}

const db = (d: number) => 10 ** (d / 20);

/** Cięcie ciszy, limit długości, wyciszenie, normalizacja, pętla. Zwraca próbki i punkty pętli (s). */
function process1(input: Float32Array, spec: Spec): { data: Float32Array; loop?: { start: number; end: number } } {
  const peak = peakOf(input) || 1;
  let a = 0;
  while (a < input.length && Math.abs(input[a]!) < peak * db(-40)) a++;
  a = Math.max(0, a - Math.floor(SR * 0.002)); // 2 ms przed atakiem: bez ucięcia transjentu
  let b = input.length;
  while (b > a && Math.abs(input[b - 1]!) < peak * db(-60)) b--;
  const len = Math.min(b - a, Math.floor(spec.maxLen * SR));
  const x = input.slice(a, a + len);
  const fade = Math.min(len, Math.floor((len < (b - a) ? (spec.fade ?? 0.2) : 0.01) * SR));
  for (let i = 0; i < fade; i++) x[len - 1 - i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fade);
  // Narastanie 1 ms (bez trzasku na starcie).
  for (let i = 0; i < Math.min(len, 44); i++) x[i]! *= i / 44;
  let loop: { start: number; end: number } | undefined;
  if (spec.loop) {
    // Pętla [start, koniec): ostatnie `cross` s przenika w dźwięk tuż przed `start`, więc skok na start jest ciągły.
    // Bez wyciszenia na końcu (jest w pętli).
    const y = input.slice(a, a + len);
    const s = Math.floor(spec.loop.start * SR);
    const c = Math.floor(spec.loop.cross * SR);
    for (let i = 0; i < c; i++) {
      const t = i / c;
      const k = len - c + i;
      y[k] = y[k]! * Math.cos((t * Math.PI) / 2) + y[s - c + i]! * Math.sin((t * Math.PI) / 2);
    }
    for (let i = 0; i < Math.min(len, 44); i++) y[i]! *= i / 44;
    x.set(y);
    loop = { start: s / SR, end: len / SR };
  }
  const p = peakOf(x) || 1;
  const k = db(-1) / p;
  for (let i = 0; i < x.length; i++) x[i]! *= k;
  return { data: x, loop };
}

/** Głośność „pierwszego wrażenia”: RMS pierwszych 0,3 s (atak + początek wybrzmienia); dla padów całość. */
function loudness(x: Float32Array, whole: boolean): number {
  const n = whole ? x.length : Math.min(x.length, Math.floor(0.3 * SR));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += x[i]! * x[i]!;
  return Math.sqrt(sum / Math.max(1, n));
}

/** Docelowy RMS: po `gain` z manifestu wszystkie instrumenty brzmią mniej więcej równie głośno. */
const REF_RMS = db(-20);

function encode(data: Float32Array, out: string): void {
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'aac', '-b:a', BITRATE, '-movflags', '+faststart', out],
    { input: Buffer.from(data.buffer, data.byteOffset, data.byteLength) },
  );
}

interface ManifestZone {
  file: string;
  note?: number;
  loop?: { start: number; end: number };
}

const slug = (s: string) => s.replace(/#/g, 's').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest: { source: string; license: string; instruments: Record<string, { gain: number; zones: ManifestZone[] }> } = {
  source: 'VSCO 2 Community Edition, Versilian Studios (github.com/sgossner/VSCO-2-CE)',
  license: 'CC0 1.0',
  instruments: {},
};
let total = 0;
for (const spec of SPECS) {
  const zones: ManifestZone[] = [];
  let rms = 0;
  for (const [i, z] of spec.zones.entries()) {
    const raw = await download(z.src);
    const { data, loop } = process1(decode(raw), spec);
    rms += loudness(data, !!spec.loop) / spec.zones.length;
    const file = `${slug(spec.id)}-${z.note ?? i}.m4a`;
    encode(data, join(OUT, file));
    total += statSync(join(OUT, file)).size;
    zones.push({ file, ...(z.note !== undefined ? { note: z.note } : {}), ...(loop ? { loop: { start: +loop.start.toFixed(4), end: +loop.end.toFixed(4) } } : {}) });
  }
  const gain = Math.min(2, (REF_RMS / (rms || 1)) * (spec.gain ?? 1));
  manifest.instruments[spec.id] = { gain: +gain.toFixed(3), zones };
  console.log(`${spec.id.padEnd(10)} ${zones.length} plik(i), RMS ${(20 * Math.log10(rms)).toFixed(1)} dB, gain ${gain.toFixed(2)}`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`Razem ${(total / 1024).toFixed(0)} KB w ${OUT}`);
