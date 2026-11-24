/**
 * Statystyki „Przed szkołą”: umiejętności przedszkolaka, ich opanowanie, krzywa nauki (% zadań bez pomyłki)
 * i tempo myślenia (czas dobrej odpowiedzi). Czysty TS: liczy z dziennika (sim/journal.ts), bez grafiki.
 *
 * Zasady: bez porównań z innymi dziećmi, tylko postęp tego dziecka. Punkt wykresu tylko przy dość wielu
 * zadaniach (inaczej jeden dzień z dwoma zadaniami skacze od 0 do 100%).
 */
import { EMOTIONS } from './emotions.ts';
import { mastered, shiftDay, struggling, type DayLog, type Journal } from './journal.ts';
import { DIGITS, lettersOf } from './letters.ts';
import { lang } from './lang.ts';
import { MAX_LEVEL, soundsOf } from './puzzles.ts';
import type { Activity } from './realms.ts';
import { REPORT_TEXT } from './locales/report.ts';
import { SHAPES } from './shapes.ts';

export type SkillId =
  | 'counting' | 'digits' | 'colors' | 'shapes' | 'phonemes' | 'letters' | 'syllables'
  | 'stories' | 'patterns' | 'classifying' | 'emotions' | 'memory' | 'line';

export interface SkillDef {
  id: SkillId;
  /** Nazwa na ekranie (polski tekst, tłumaczony przez tr()). */
  name: string;
  /** Zabawy, z których liczymy zadania. */
  acts: Activity[];
  /** Umiejętność z listą elementów (liczby, kolory…): grupa w dzienniku. */
  group?: string;
  /** Mierzymy tempo (grupa tempa w dzienniku). */
  tempo?: string;
  /** Pomysł na zabawę bez ekranu (polski tekst, tłumaczony przez tr()). */
  tip: string;
}

export const SKILLS: readonly SkillDef[] = [
  { id: 'counting', name: 'countsObjects', acts: ['counting'], group: 'number', tempo: 'number', tip: 'countStairsButtonsSpoons' },
  { id: 'digits', name: 'writesNumbers', acts: ['digits'], group: 'digit', tip: 'lookNumbersWalkHouse' },
  { id: 'colors', name: 'recognisesColours', acts: ['colors'], group: 'color', tempo: 'color', tip: 'playISpySomething' },
  { id: 'shapes', name: 'recognisesShapes', acts: ['shapes'], group: 'shape', tip: 'huntShapesAtHome' },
  { id: 'phonemes', name: 'firstLetterWord', acts: ['phonemes'], group: 'phoneme', tempo: 'phoneme', tip: 'playWordGameWho' },
  { id: 'letters', name: 'writesLetters', acts: ['letters'], group: 'letter', tip: 'drawLettersFingerEach' },
  { id: 'syllables', name: 'splitsWordsIntoSyllables', acts: ['syllables'], tip: 'clapOutFamilyNames' },
  { id: 'stories', name: 'putsStoryOrder', acts: ['stories'], tip: 'afterWalkAskWhat' },
  { id: 'patterns', name: 'continuesPatterns', acts: ['patterns'], tip: 'makePatternsBlocksPasta' },
  { id: 'classifying', name: 'sortsCompares', acts: ['sorting', 'matching'], tip: 'sortWhileTidyingUp' },
  { id: 'emotions', name: 'recognisesFeelings', acts: ['emotions'], group: 'emotion', tempo: 'emotion', tip: 'whenReadingStoryAsk' },
  { id: 'memory', name: 'memorySkill', acts: ['memory', 'melody'], tip: 'playWhatsMissingPut' },
  { id: 'line', name: 'drawsLinesByHand', acts: ['dots', 'maze'], tip: 'traceLinesJoinDots' },
];

/** Wszystkie elementy umiejętności w bieżącym języku (np. liczby 1–8, kolory, litery). */
export function itemsOf(group: string): string[] {
  switch (group) {
    case 'number':
      return ['1', '2', '3', '4', '5', '6', '7', '8'];
    case 'digit':
      return DIGITS.map((d) => d.ch).sort();
    case 'color':
      return Object.keys(REPORT_TEXT.pl.colors);
    case 'shape':
      return [...SHAPES];
    case 'phoneme':
      return [...soundsOf()];
    case 'letter':
      return lettersOf().map((l) => l.ch);
    case 'emotion':
      return [...EMOTIONS];
    default:
      return [];
  }
}

/** Nazwa elementu na ekranie (kolor, kształt, emocja w bieżącym języku; liczby i litery bez zmian). */
export function itemName(group: string, id: string): string {
  const P = REPORT_TEXT[lang()];
  if (group === 'color') return P.colors[id] ?? id;
  if (group === 'shape') return P.shapes[id] ?? id;
  if (group === 'emotion') return P.emotions[id] ?? id;
  if (group === 'phoneme' || group === 'letter') return id.toUpperCase();
  return id;
}

export type ItemState = 'mastered' | 'practicing' | 'trouble' | 'no';

export interface Mastery {
  /** 0..1: wypełnienie paska. */
  value: number;
  /** Umiejętność z elementami: ile opanowanych z ilu. */
  ok?: number;
  of?: number;
  /** Umiejętność bez elementów: etap 0 (jeszcze nie było) .. 3 (pewnie). */
  stage?: number;
  /** Ile zadań w ogóle (0: jeszcze nie było). */
  tasks: number;
}

const tasksIn = (d: DayLog, acts: readonly Activity[]) => acts.reduce((s, a) => s + (d.acts[a] ?? 0), 0);
/** Zadania bez pomyłki; dni sprzed zapisu `clean`: w przybliżeniu zadania minus pomyłki. */
const cleanIn = (d: DayLog, acts: readonly Activity[]) =>
  acts.reduce((s, a) => s + (d.clean ? (d.clean[a] ?? 0) : Math.max(0, (d.acts[a] ?? 0) - (d.misses?.[a] ?? 0))), 0);

/** Stan elementu: opanowany (kiedykolwiek), kłopot (ostatnio), ćwiczy, jeszcze nie było. */
export function itemState(j: Journal, group: string, id: string): ItemState {
  const key = `${group}:${id}`;
  const h = j.facts[key];
  if (j.learned[key] || mastered(h)) return 'mastered';
  if (!h) return 'no';
  return struggling(h) ? 'trouble' : 'practicing';
}

/** Ostatnie 14 dni zabawy: % bez pomyłki (do etapu umiejętności bez elementów). */
function recent(j: Journal, acts: readonly Activity[], today: string): { tasks: number; clean: number } {
  let tasks = 0;
  let clean = 0;
  for (let i = 0; i < 14; i++) {
    const d = j.days[shiftDay(today, -i)];
    if (!d) continue;
    tasks += tasksIn(d, acts);
    clean += cleanIn(d, acts);
  }
  return { tasks, clean };
}

export function mastery(def: SkillDef, j: Journal, levels: Partial<Record<Activity, number>>, today: string): Mastery {
  const tasks = Object.values(j.days).reduce((s, d) => s + tasksIn(d, def.acts), 0);
  if (def.group) {
    const all = itemsOf(def.group);
    const ok = all.filter((id) => itemState(j, def.group!, id) === 'mastered').length;
    return { value: all.length ? ok / all.length : 0, ok, of: all.length, tasks };
  }
  if (!tasks) return { value: 0, stage: 0, tasks };
  // Etap: poziom zabawy (najwyższy z jej zabaw) i jak idzie ostatnio.
  const level = Math.max(...def.acts.map((a) => levels[a] ?? 0));
  const r = recent(j, def.acts, today);
  const good = r.tasks >= 5 && r.clean / r.tasks >= 0.7;
  const stage = level >= MAX_LEVEL && good ? 3 : level >= 1 || (good && tasks >= 10) ? 2 : 1;
  return { value: stage / 3, stage, tasks };
}

export type Range = 'days' | 'weeks';

export interface Point {
  /** Pierwszy dzień okresu (klucz dnia). */
  from: string;
  to: string;
  /** Wartość (0..1 dla %, sekundy dla tempa); null: za mało zadań. */
  value: number | null;
  /** Ile zadań (albo pomiarów) w okresie. */
  n: number;
  /** W tym okresie zabawa weszła na wyższy poziom. */
  levelUp?: boolean;
}

/** Okresy wykresu: 14 ostatnich dni albo 12 ostatnich tygodni (kończących się dziś). */
export function periods(range: Range, today: string): { from: string; to: string }[] {
  const n = range === 'days' ? 14 : 12;
  const len = range === 'days' ? 1 : 7;
  return Array.from({ length: n }, (_, i) => {
    const to = shiftDay(today, -(n - 1 - i) * len);
    return { from: shiftDay(to, -(len - 1)), to };
  });
}

const daysOf = (j: Journal, from: string, to: string): [string, DayLog][] =>
  Object.entries(j.days)
    .filter(([k]) => k >= from && k <= to)
    .sort(([a], [b]) => (a < b ? -1 : 1));

/** Najmniej zadań, żeby okres dostał punkt na wykresie. */
export const MIN_TASKS: Record<Range, number> = { days: 3, weeks: 5 };

/** Krzywa nauki: % zadań bez pomyłki w każdym okresie i znaczniki wejścia na wyższy poziom. */
export function accuracy(def: SkillDef, j: Journal, range: Range, today: string): Point[] {
  const ps = periods(range, today);
  // Poziom przed oknem wykresu: najwyższy zapisany wcześniej (żeby pierwszy punkt nie był „wyższym poziomem”).
  let best = -1;
  for (const [k, d] of Object.entries(j.days)) if (k < ps[0]!.from) for (const a of def.acts) best = Math.max(best, d.lvl?.[a] ?? -1);
  return ps.map(({ from, to }) => {
    let tasks = 0;
    let clean = 0;
    let levelUp = false;
    for (const [, d] of daysOf(j, from, to)) {
      tasks += tasksIn(d, def.acts);
      clean += cleanIn(d, def.acts);
      for (const a of def.acts) {
        const l = d.lvl?.[a];
        if (l === undefined) continue;
        if (best >= 0 && l > best) levelUp = true;
        best = Math.max(best, l);
      }
    }
    return { from, to, value: tasks >= MIN_TASKS[range] ? clean / tasks : null, n: tasks, levelUp };
  });
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export interface Tempo {
  /** Poziom, na którym porównujemy (najwięcej pomiarów w oknie). */
  level: number;
  points: Point[];
  /** Ile razy szybciej teraz niż na początku (>1: szybciej); null: za mało danych. */
  speedup: number | null;
}

/** Tempo myślenia: mediana czasu dobrej odpowiedzi (sekundy) na tym samym poziomie trudności. */
export function tempo(def: SkillDef, j: Journal, range: Range, today: string): Tempo | null {
  if (!def.tempo) return null;
  const ps = periods(range, today);
  const prefix = `${def.tempo}@`;
  const count = new Map<number, number>();
  for (const [, d] of daysOf(j, ps[0]!.from, today))
    for (const [k, v] of Object.entries(d.ms ?? {})) if (k.startsWith(prefix)) count.set(Number(k.slice(prefix.length)), (count.get(Number(k.slice(prefix.length))) ?? 0) + v.length);
  if (!count.size) return { level: 0, points: ps.map((p) => ({ ...p, value: null, n: 0 })), speedup: null };
  const level = [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
  const points = ps.map(({ from, to }) => {
    const xs = daysOf(j, from, to).flatMap(([, d]) => d.ms?.[`${prefix}${level}`] ?? []);
    return { from, to, value: xs.length >= 3 ? median(xs) / 10 : null, n: xs.length };
  });
  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  const third = Math.max(1, Math.floor(vals.length / 3));
  const speedup = vals.length >= 3 ? median(vals.slice(0, third)) / median(vals.slice(-third)) : null;
  return { level, points, speedup };
}

/** Wykres ma sens (co najmniej dwa punkty). Inaczej pokazujemy przykład. */
export const enoughPoints = (ps: readonly Point[]): boolean => ps.filter((p) => p.value !== null).length >= 2;

/** Przykładowa krzywa (dziecko z przykładu), gdy prawdziwych danych jest jeszcze za mało. */
export function sampleAccuracy(range: Range, today: string): Point[] {
  const shape = [0.42, 0.5, 0.55, 0.63, 0.7, 0.52, 0.6, 0.68, 0.74, 0.8, 0.83, 0.86, 0.84, 0.9];
  return periods(range, today).map((p, i, all) => {
    const k = shape[Math.round((i / Math.max(1, all.length - 1)) * (shape.length - 1))]!;
    return { ...p, value: k, n: 10, levelUp: i === Math.round(all.length * 0.38) };
  });
}

export function sampleTempo(range: Range, today: string): Tempo {
  const ps = periods(range, today);
  const points = ps.map((p, i) => ({ ...p, value: 3.2 - (1.8 * i) / Math.max(1, ps.length - 1) + (i % 3 === 1 ? 0.25 : 0), n: 8 }));
  return { level: 1, points, speedup: 3.2 / 1.5 };
}

export interface Milestone {
  day: string;
  /** Element (np. „7”, „zielony”) albo null dla pierwszego razu / wyższego poziomu. */
  item: string | null;
  kind: 'mastered' | 'first' | 'level';
}

/** Odkrycia: opanowane elementy, pierwszy raz w zabawie, wejścia na wyższy poziom (najnowsze pierwsze). */
export function milestones(def: SkillDef, j: Journal): Milestone[] {
  const out: Milestone[] = [];
  if (def.group) for (const [k, day] of Object.entries(j.learned)) if (k.startsWith(def.group + ':')) out.push({ day, item: k.slice(def.group.length + 1), kind: 'mastered' });
  const first = def.acts.map((a) => j.firsts?.[a]).filter((d): d is string => !!d).sort()[0];
  if (first) out.push({ day: first, item: null, kind: 'first' });
  let best = -1;
  for (const [k, d] of daysOf(j, '0000', '9999'))
    for (const a of def.acts) {
      const l = d.lvl?.[a];
      if (l === undefined) continue;
      if (best >= 0 && l > best) out.push({ day: k, item: null, kind: 'level' });
      best = Math.max(best, l);
    }
  return out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}
