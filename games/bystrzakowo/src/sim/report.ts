/**
 * Raport dla rodzica: co dziecko umie, opisane po ludzku, wskazówki do zabawy poza ekranem
 * i najważniejsze sukcesy tygodnia (pocztówka). Czysty TS, bez Pixi.
 *
 * Zdania są w czasie teraźniejszym i bez form zależnych od płci („Zosia liczy”, „Staś liczy”),
 * imię zawsze w mianowniku, więc nie trzeba pytać o płeć ani odmieniać imion.
 */
import { DIGITS, lettersOf } from './letters.ts';
import { factsOf, mastered, shiftDay, struggling, summarize, type Journal } from './journal.ts';
import { lang } from './lang.ts';
import type { Activity } from './realms.ts';
import { REPORT_TEXT, type Domain, type ReportText } from './report-text.ts';

export type { Domain } from './report-text.ts';

export interface SkillLine {
  domain: Domain;
  title: string;
  /** Zdania opisu. */
  lines: string[];
  /** 0 (jeszcze nie było) .. 3 (świetnie). */
  stars: number;
}

export interface Report {
  who: string;
  week: { from: string; to: string; days: number; minutes: number; tasks: number };
  weekText: string;
  skills: SkillLine[];
  tips: string[];
  highlights: string[];
  /** „Pierwsze razy” z ostatnich 7 dni. */
  firsts: string[];
}

export interface ReportInput {
  journal: Journal;
  levels: Partial<Record<Activity, number>>;
  name?: string;
  today: string;
}

const LOGIC: Activity[] = ['shadows', 'matching', 'mothers', 'patterns', 'sorting', 'stories', 'memory', 'jigsaw', 'maze'];

/** Jak idzie, z liczby pomyłek na zadanie: indeks opisu (0 dobrze .. 2 trudno) i gwiazdki. */
const quality = (misses: number, tasks: number): [number, number] => {
  const r = misses / Math.max(1, tasks);
  return r < 0.15 ? [0, 3] : r < 0.5 ? [1, 2] : [2, 1];
};

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Wskazówki w bieżącym języku (polskie: zgodność z testami). */
export const TIPS = REPORT_TEXT.pl.tips;


/** Ile dni opanowanych / próbowanych w grupie umiejętności. */
function split(m: Map<string, string>): { ok: string[]; hard: string[]; tried: string[] } {
  const ok: string[] = [];
  const hard: string[] = [];
  for (const [k, h] of m) {
    if (mastered(h)) ok.push(k);
    else if (struggling(h)) hard.push(k);
  }
  return { ok, hard, tried: [...m.keys()] };
}

const starsOf = (ok: number, tried: number): number => (tried === 0 ? 0 : ok / tried >= 0.75 ? 3 : ok / tried >= 0.4 ? 2 : 1);

/** Wszystkie dni dziennika: ile razy dziecko rozwiązało zadania danej zabawy. */
function totals(j: Journal): Partial<Record<Activity, number>> {
  return summarize(j, '0000-00-00', '9999-99-99').acts;
}

export function makeReport(input: ReportInput): Report {
  const { journal: j, today } = input;
  const P = REPORT_TEXT[lang()];
  const who = input.name?.trim() || P.child;
  const from = shiftDay(today, -6);
  const w = summarize(j, from, today);
  const minutes = Math.round(w.sec / 60);
  const all = totals(j);
  const skills: SkillLine[] = [];

  // Liczby: liczenie (1..8), cyferki (rysowanie), kropki.
  {
    const counts = split(factsOf(j, 'number'));
    const digits = [...factsOf(j, 'digit').keys()].sort();
    const lines: string[] = [];
    const okSet = new Set(counts.ok.map(Number));
    let upTo = 0;
    while (okSet.has(upTo + 1)) upTo++;
    const okSorted = [...okSet].sort((a, b) => a - b);
    if (upTo >= 2) lines.push(P.countUpTo(who, upTo));
    else if (okSorted.length) lines.push(P.countSets(who, okSorted.map(String)));
    else if (counts.tried.length) lines.push(P.countPractice(who));
    const hard = counts.hard.map(Number).sort((a, b) => a - b);
    if (hard.length) lines.push(P.countHard(hard.map(String)));
    if (digits.length) lines.push(P.digitsDrawn(digits, DIGITS.length));
    if (all.dots) lines.push(P.dots(all.dots));
    if (!lines.length) lines.push(P.countNone);
    const stars = counts.tried.length ? starsOf(counts.ok.length, counts.tried.length) : digits.length || all.dots ? 1 : 0;
    skills.push({ domain: 'numbers', title: P.titles.numbers, lines, stars });
  }

  // Litery i głoski.
  {
    const sounds = split(factsOf(j, 'phoneme'));
    const letters = [...factsOf(j, 'letter').keys()];
    const lines: string[] = [];
    if (sounds.ok.length) lines.push(P.soundsOk(who, sounds.ok.map(P.sound)));
    else if (sounds.tried.length) lines.push(P.soundsPractice(who));
    if (sounds.hard.length) lines.push(P.soundsHard(sounds.hard.map(P.sound)));
    if (letters.length) lines.push(P.lettersDrawn(letters, lettersOf().length));
    if (all.syllables) lines.push(P.syllables(all.syllables));
    if (!lines.length) lines.push(P.lettersNone);
    const stars = sounds.tried.length ? starsOf(sounds.ok.length, sounds.tried.length) : letters.length || all.syllables ? 1 : 0;
    skills.push({ domain: 'letters', title: P.titles.letters, lines, stars });
  }

  // Kolory i kształty.
  {
    const colors = split(factsOf(j, 'color'));
    const shapes = split(factsOf(j, 'shape'));
    const lines: string[] = [];
    const cn = (c: string) => P.colors[c] ?? c;
    const sn = (x: string) => P.shapes[x] ?? x;
    if (colors.ok.length) lines.push(P.colorsOk(who, colors.ok.map(cn)));
    if (colors.hard.length) lines.push(P.colorsHard(colors.hard.map(cn)));
    if (shapes.ok.length) lines.push(P.shapesOk(shapes.ok.map(sn)));
    if (shapes.hard.length) lines.push(P.shapesHard(shapes.hard.map(sn)));
    if (!lines.length && (colors.tried.length || shapes.tried.length)) lines.push(P.colorsPractice(who));
    if (!lines.length) lines.push(P.colorsNone);
    const tried = colors.tried.length + shapes.tried.length;
    skills.push({ domain: 'colors', title: P.titles.colors, lines, stars: starsOf(colors.ok.length + shapes.ok.length, tried) });
  }

  // Emocje.
  {
    const em = split(factsOf(j, 'emotion'));
    const lines: string[] = [];
    const en = (e: string) => P.emotions[e] ?? e;
    if (em.ok.length) lines.push(P.emoOk(who, em.ok.map(en)));
    if (em.hard.length) lines.push(P.emoHard(em.hard.map(en)));
    if (!lines.length && em.tried.length) lines.push(P.emoPractice(who));
    if (!lines.length) lines.push(P.emoNone);
    skills.push({ domain: 'emotions', title: P.titles.emotions, lines, stars: starsOf(em.ok.length, em.tried.length) });
  }

  // Logika, spostrzegawczość, pamięć.
  {
    // Najczęściej grane zagadki z tygodnia, każda z opisem, liczbą i tym, jak idzie.
    const played = LOGIC.filter((a) => (w.acts[a] ?? 0) > 0).sort((a, b) => (w.acts[b] ?? 0) - (w.acts[a] ?? 0));
    const lines: string[] = [];
    let stars = 0;
    for (const a of played.slice(0, 4)) {
      const [what, count] = P.logic[a]!;
      const n = w.acts[a]!;
      const [how, s] = quality(w.misses[a] ?? 0, n);
      lines.push(`${what}: ${count(n)}, ${P.quality[how]}.`);
      stars += s;
    }
    if (played.length > 4) lines.push(P.logicMore(played.slice(4).map((a) => P.logic[a]![0])));
    if (!played.length) lines.push(LOGIC.some((a) => all[a]) ? P.logicNoneWeek : P.logicNone);
    const avgStars = played.length ? Math.round(stars / Math.min(4, played.length)) : LOGIC.some((a) => all[a]) ? 1 : 0;
    skills.push({ domain: 'logic', title: P.titles.logic, lines, stars: avgStars });
  }

  // Twórczość.
  {
    const parts: string[] = [];
    if (all.coloring) parts.push(P.creative.coloring(all.coloring));
    if (all.stickers) parts.push(P.creative.stickers(all.stickers));
    if (all.melody) parts.push(P.creative.melody(all.melody));
    const lines = parts.length ? [P.creative.sum(parts), P.creative.album] : [P.creative.none];
    skills.push({ domain: 'creativity', title: P.titles.creativity, lines, stars: Math.min(3, parts.length) });
  }

  return {
    who,
    week: { from, to: today, days: w.days, minutes, tasks: w.tasks },
    weekText: w.days ? P.week(w.days, minutes, w.tasks) : P.weekNone,
    skills,
    tips: pickTips(P, skills, today),
    highlights: highlights(P, j, w.acts, from, today),
    firsts: firstsIn(P, j, from, today),
  };
}

function firstsIn(P: ReportText, j: Journal, from: string, to: string): string[] {
  return P.firsts.filter(([a]) => {
    const d = j.firsts?.[a];
    return !!d && d >= from && d <= to;
  }).map(([, s]) => s);
}

/** Dwie wskazówki: najpierw z dziedziny, która idzie najsłabiej (albo której jeszcze nie było). */
function pickTips(P: ReportText, skills: SkillLine[], today: string): string[] {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const week = Math.floor(Date.UTC(y, m - 1, d) / (7 * 86_400_000));
  const order = [...skills].filter((s) => s.domain !== 'creativity').sort((a, b) => a.stars - b.stars || TIP_ORDER.indexOf(a.domain) - TIP_ORDER.indexOf(b.domain));
  return order.slice(0, 2).map((s) => {
    const tips = P.tips[s.domain];
    return tips[week % tips.length]!;
  });
}
const TIP_ORDER: Domain[] = ['numbers', 'letters', 'colors', 'emotions', 'logic', 'creativity'];

/** Najważniejsze sukcesy tygodnia (do pocztówki), najwyżej trzy. */
function highlights(P: ReportText, j: Journal, acts: Partial<Record<Activity, number>>, from: string, to: string): string[] {
  const fresh = (group: string) =>
    Object.entries(j.learned)
      .filter(([k, d]) => k.startsWith(group + ':') && d >= from && d <= to)
      .map(([k]) => k.slice(group.length + 1));
  const out: string[] = [];
  // „Liczenie do N” tylko gdy opanowane są wszystkie liczby od 1 do N.
  const nums = fresh('number').map(Number);
  if (nums.length) {
    let upTo = 0;
    while (mastered(j.facts[`number:${upTo + 1}`])) upTo++;
    out.push(upTo >= Math.max(...nums) && upTo >= 2 ? P.hl.countTo(upTo) : P.hl.counted(nums.sort((a, b) => a - b).map(String)));
  }
  const letters = fresh('letter');
  if (letters.length) out.push(P.hl.letters(letters));
  const sounds = fresh('phoneme');
  if (sounds.length) out.push(P.hl.sounds(sounds.map(P.sound)));
  const colors = fresh('color');
  if (colors.length) out.push(P.hl.colors(colors.map((c) => P.colors[c] ?? c)));
  const digits = fresh('digit');
  if (digits.length) out.push(P.hl.digits(digits));
  const shapes = fresh('shape');
  if (shapes.length) out.push(P.hl.shapes(shapes.map((x) => P.shapes[x] ?? x)));
  const emotions = fresh('emotion');
  if (emotions.length) out.push(P.hl.emotions(emotions.map((e) => P.emotions[e] ?? e)));
  // Pierwsze razy (w pierwszych dniach to one są największymi sukcesami).
  for (const f of firstsIn(P, j, from, to).slice(0, 3)) out.push(capital(f));
  // Uzupełnienie liczbami z tygodnia.
  for (const [a, count] of P.hl.counts) if ((acts[a] ?? 0) > 0) out.push(count(acts[a]!));
  const total = Object.values(acts).reduce((n, x) => n + (x ?? 0), 0);
  if (total) out.push(P.hl.tasks(total));
  return out.slice(0, 3);
}

/**
 * Zakres tygodnia na pocztówce w bieżącym języku:
 * pl „15–21 listopada 2026”, en „November 15–21, 2026”, de „15.–21. November 2026”.
 */
export function formatRange(from: string, to: string): string {
  const M = REPORT_TEXT[lang()].months;
  const [y1, m1, d1] = from.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = to.split('-').map(Number) as [number, number, number];
  const l = lang();
  const a = M[m1 - 1]!;
  const b = M[m2 - 1]!;
  if (l === 'en') {
    if (y1 !== y2) return `${a} ${d1}, ${y1} – ${b} ${d2}, ${y2}`;
    if (m1 !== m2) return `${a} ${d1} – ${b} ${d2}, ${y2}`;
    return `${b} ${d1}–${d2}, ${y2}`;
  }
  if (l === 'es') {
    if (y1 !== y2) return `${d1} de ${a} de ${y1} – ${d2} de ${b} de ${y2}`;
    if (m1 !== m2) return `${d1} de ${a} – ${d2} de ${b} de ${y2}`;
    return `${d1}–${d2} de ${b} de ${y2}`;
  }
  if (l === 'de') {
    if (y1 !== y2) return `${d1}. ${a} ${y1} – ${d2}. ${b} ${y2}`;
    if (m1 !== m2) return `${d1}. ${a} – ${d2}. ${b} ${y2}`;
    return `${d1}.–${d2}. ${b} ${y2}`;
  }
  if (y1 !== y2) return `${d1} ${a} ${y1} – ${d2} ${b} ${y2}`;
  if (m1 !== m2) return `${d1} ${a} – ${d2} ${b} ${y2}`;
  return `${d1}–${d2} ${b} ${y2}`;
}
