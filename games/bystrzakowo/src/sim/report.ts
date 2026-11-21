/**
 * Raport dla rodzica: co dziecko umie, opisane po ludzku, wskazówki do zabawy poza ekranem
 * i najważniejsze sukcesy tygodnia (pocztówka). Czysty TS, bez Pixi.
 *
 * Zdania są w czasie teraźniejszym i bez form zależnych od płci („Zosia liczy”, „Staś liczy”),
 * imię zawsze w mianowniku, więc nie trzeba pytać o płeć ani odmieniać imion.
 */
import { DIGITS, LETTERS } from './letters.ts';
import { factsOf, mastered, shiftDay, struggling, summarize, type Journal } from './journal.ts';
import type { Activity } from './realms.ts';

export type Domain = 'liczby' | 'litery' | 'kolory' | 'emocje' | 'logika' | 'tworczosc';

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
}

export interface ReportInput {
  journal: Journal;
  levels: Partial<Record<Activity, number>>;
  name?: string;
  today: string;
}

const COLOR_NAMES: Record<string, string> = {
  czerwony: 'czerwony',
  zolty: 'żółty',
  zielony: 'zielony',
  niebieski: 'niebieski',
  pomaranczowy: 'pomarańczowy',
  rozowy: 'różowy',
  fioletowy: 'fioletowy',
  brazowy: 'brązowy',
  bialy: 'biały',
};
const SHAPE_NAMES: Record<string, string> = { kolo: 'koło', kwadrat: 'kwadrat', trojkat: 'trójkąt', prostokat: 'prostokąt', gwiazda: 'gwiazda', serce: 'serce', owal: 'owal', romb: 'romb' };
const EMOTION_NAMES: Record<string, string> = { wesoly: 'radość', smutny: 'smutek', zly: 'złość', zdziwiony: 'zdziwienie', przestraszony: 'strach', spiacy: 'senność' };

const LOGIC: Activity[] = ['cienie', 'pasuje', 'mamy', 'wzory', 'sortowanie', 'historyjki', 'memory', 'ukladanka', 'labirynt'];
const LOGIC_NAMES: Partial<Record<Activity, string>> = { cienie: 'cienie', pasuje: 'co nie pasuje', mamy: 'mamy i dzieci', wzory: 'wzory', sortowanie: 'segregowanie', historyjki: 'historyjki', memory: 'pary', ukladanka: 'układanki', labirynt: 'labirynty' };
const LEVEL_NAMES = ['łatwy', 'średni', 'trudny'];

export const TIPS: Record<Domain, string[]> = {
  liczby: [
    'Na spacerze liczcie razem schody, auta albo ptaki. Niech dziecko dotyka palcem każdej liczonej rzeczy.',
    'Przy nakrywaniu do stołu poproś: „podaj cztery łyżki”. Liczenie w codziennych sprawach uczy najlepiej.',
    'Zagrajcie w chowanego i liczcie na głos do dziesięciu, raz Ty, raz dziecko.',
  ],
  litery: [
    'Zabawa „Co zaczyna się na…?”: szukajcie w domu rzeczy na głoskę „m” (miska, miś, mleko).',
    'Narysuj palcem literkę na plecach dziecka i niech zgadnie, jaka to. Potem zamiana.',
    'Na szyldach i w sklepie szukajcie pierwszej litery imienia dziecka.',
    'Wyklaskujcie sylaby w imionach domowników: ma-ma, ta-ta, bab-cia.',
  ],
  kolory: [
    'Kolorowe łowy: kto pierwszy znajdzie w pokoju trzy zielone rzeczy?',
    'Przy sprzątaniu klocków sortujcie je według kolorów albo kształtów.',
    'Szukajcie kształtów na spacerze: okrągłe koła, kwadratowe okna, trójkątne dachy.',
  ],
  emocje: [
    'Przy czytaniu książeczki zapytaj: „jak myślisz, co teraz czuje ten miś?”.',
    'Pokazujcie sobie miny przed lustrem: wesołą, smutną, zdziwioną. Kto zgadnie, jaka to?',
    'Wieczorem porozmawiajcie, co dziś było wesołe, a co smutne.',
  ],
  logika: [
    'Po spacerze albo pieczeniu poproś, żeby dziecko opowiedziało po kolei: co było najpierw, a co potem.',
    'Ułóżcie z kredek rytm: czerwona, niebieska, czerwona… Co będzie dalej?',
    'Zagrajcie w „Co zniknęło?”: połóż cztery przedmioty, dziecko zamyka oczy, a Ty jeden chowasz.',
  ],
  tworczosc: [
    'Powieście razem rysunek dziecka na lodówce. Dziecko widzi, że jego praca jest ważna.',
    'Zróbcie domowy koncert: garnki, łyżki i pudełka jako bębenki.',
  ],
};

const list = (xs: string[]) => xs.join(', ');
const plural = (n: number, one: string, few: string, many: string) => {
  const t = n % 100;
  const u = n % 10;
  return n === 1 ? one : u >= 2 && u <= 4 && (t < 12 || t > 14) ? few : many;
};

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
  const { journal: j, levels, today } = input;
  const who = input.name?.trim() || 'Dziecko';
  const from = shiftDay(today, -6);
  const w = summarize(j, from, today);
  const minutes = Math.round(w.sec / 60);
  const all = totals(j);
  const skills: SkillLine[] = [];

  // Liczby: liczenie (1..8), cyferki (rysowanie), kropki.
  {
    const counts = split(factsOf(j, 'liczba'));
    const digits = [...factsOf(j, 'cyfra').keys()].sort();
    const lines: string[] = [];
    const okSet = new Set(counts.ok.map(Number));
    let upTo = 0;
    while (okSet.has(upTo + 1)) upTo++;
    if (upTo >= 2) lines.push(`${who} liczy bez pomyłek do ${upTo}.`);
    else if (counts.tried.length) lines.push(`${who} ćwiczy liczenie przedmiotów.`);
    const hard = counts.hard.map(Number).sort((a, b) => a - b);
    if (hard.length) lines.push(`Jeszcze sprawiają kłopot: ${list(hard.map(String))}.`);
    if (digits.length) lines.push(`Narysowane cyferki: ${list(digits)} (${digits.length} z ${DIGITS.length}).`);
    if (all.kropki) lines.push(`Obrazki z kropek połączone po kolei: ${all.kropki}.`);
    if (!lines.length) lines.push('Liczenia jeszcze nie było. Zajrzyjcie na Polanę Zagadek („Liczenie”) i na Ścieżkę Lusi („Cyferki”).');
    const stars = counts.tried.length ? starsOf(counts.ok.length, counts.tried.length) : digits.length || all.kropki ? 1 : 0;
    skills.push({ domain: 'liczby', title: 'Liczby i liczenie', lines, stars });
  }

  // Litery i głoski.
  {
    const sounds = split(factsOf(j, 'gloska'));
    const letters = [...factsOf(j, 'litera').keys()];
    const lines: string[] = [];
    if (sounds.ok.length) lines.push(`${who} słyszy, od jakiej głoski zaczyna się słowo: ${list(sounds.ok.map((s) => `„${s}”`))}.`);
    else if (sounds.tried.length) lines.push(`${who} ćwiczy słuchanie pierwszej głoski w słowach.`);
    if (sounds.hard.length) lines.push(`Trudniejsze głoski: ${list(sounds.hard.map((s) => `„${s}”`))}.`);
    if (letters.length) lines.push(`Narysowane literki: ${list(letters)} (${letters.length} z ${LETTERS.length}).`);
    if (all.sylaby) lines.push(`Słowa ułożone z sylab: ${all.sylaby}.`);
    if (!lines.length) lines.push('Głosek i liter jeszcze nie było. Spróbujcie zabaw „Głoski”, „Sylaby” i „Literki”.');
    const stars = sounds.tried.length ? starsOf(sounds.ok.length, sounds.tried.length) : letters.length || all.sylaby ? 1 : 0;
    skills.push({ domain: 'litery', title: 'Głoski i literki', lines, stars });
  }

  // Kolory i kształty.
  {
    const colors = split(factsOf(j, 'kolor'));
    const shapes = split(factsOf(j, 'ksztalt'));
    const lines: string[] = [];
    if (colors.ok.length) lines.push(`${who} rozpoznaje kolory: ${list(colors.ok.map((c) => COLOR_NAMES[c] ?? c))}.`);
    if (colors.hard.length) lines.push(`Myli się jeszcze przy kolorach: ${list(colors.hard.map((c) => COLOR_NAMES[c] ?? c))}.`);
    if (shapes.ok.length) lines.push(`Dopasowuje kształty: ${list(shapes.ok.map((s) => SHAPE_NAMES[s] ?? s))}.`);
    if (shapes.hard.length) lines.push(`Trudniejsze kształty: ${list(shapes.hard.map((s) => SHAPE_NAMES[s] ?? s))}.`);
    if (!lines.length && (colors.tried.length || shapes.tried.length)) lines.push(`${who} ćwiczy kolory i kształty.`);
    if (!lines.length) lines.push('Kolorów i kształtów jeszcze nie było. Spróbujcie zabaw „Kolory” i „Kształty”.');
    const tried = colors.tried.length + shapes.tried.length;
    skills.push({ domain: 'kolory', title: 'Kolory i kształty', lines, stars: starsOf(colors.ok.length + shapes.ok.length, tried) });
  }

  // Emocje.
  {
    const em = split(factsOf(j, 'emocja'));
    const lines: string[] = [];
    if (em.ok.length) lines.push(`${who} rozpoznaje na buziach: ${list(em.ok.map((e) => EMOTION_NAMES[e] ?? e))}.`);
    if (em.hard.length) lines.push(`Trudniej idzie z: ${list(em.hard.map((e) => EMOTION_NAMES[e] ?? e))}.`);
    if (!lines.length && em.tried.length) lines.push(`${who} uczy się rozpoznawać emocje.`);
    if (!lines.length) lines.push('Emocji jeszcze nie było. Spróbujcie zabawy „Minki”.');
    skills.push({ domain: 'emocje', title: 'Emocje', lines, stars: starsOf(em.ok.length, em.tried.length) });
  }

  // Logika, spostrzegawczość, pamięć.
  {
    const played = LOGIC.filter((a) => (w.acts[a] ?? 0) > 0);
    const sum = LOGIC.reduce((n, a) => n + (w.acts[a] ?? 0), 0);
    const lines: string[] = [];
    if (sum) {
      lines.push(`W tym tygodniu ${sum} ${plural(sum, 'zadanie', 'zadania', 'zadań')}: ${list(played.map((a) => LOGIC_NAMES[a]!))}.`);
      const lv = played.map((a) => levels[a] ?? 0);
      const avg = Math.round(lv.reduce((a, b) => a + b, 0) / lv.length);
      lines.push(`Poziom trudności: ${LEVEL_NAMES[avg]} (dobiera się sam do postępów).`);
    } else if (LOGIC.some((a) => all[a])) lines.push('W tym tygodniu bez zagadek logicznych. Wcześniejsze postępy są zapisane.');
    else lines.push('Zagadek logicznych jeszcze nie było: cienie, wzory, historyjki, pary, układanki.');
    const anyLevel = Math.max(0, ...LOGIC.filter((a) => all[a]).map((a) => levels[a] ?? 0));
    skills.push({ domain: 'logika', title: 'Logika i spostrzegawczość', lines, stars: LOGIC.some((a) => all[a]) ? 1 + anyLevel : 0 });
  }

  // Twórczość.
  {
    const parts: string[] = [];
    if (all.kolorowanka) parts.push(`pokolorowane obrazki: ${all.kolorowanka}`);
    if (all.naklejanka) parts.push(`obrazki z naklejek: ${all.naklejanka}`);
    if (all.melodia) parts.push(`zagrane melodie: ${all.melodia}`);
    const lines = parts.length ? [`Razem ${list(parts)}.`, 'Prace dziecka znajdziesz w zakładce „Album”.'] : ['Pracowni Malucha jeszcze nie było: kolorowanki, naklejki i melodie.'];
    skills.push({ domain: 'tworczosc', title: 'Twórczość', lines, stars: Math.min(3, parts.length) });
  }

  return {
    who,
    week: { from, to: today, days: w.days, minutes, tasks: w.tasks },
    weekText: w.days
      ? `Ostatnie 7 dni: ${w.days} ${plural(w.days, 'dzień', 'dni', 'dni')} zabawy, razem ${minutes} min, ${w.tasks} ${plural(w.tasks, 'rozwiązane zadanie', 'rozwiązane zadania', 'rozwiązanych zadań')}.`
      : 'W ostatnich 7 dniach nie było zabawy.',
    skills,
    tips: pickTips(skills, today),
    highlights: highlights(j, w.acts, from, today),
  };
}

/** Dwie wskazówki: najpierw z dziedziny, która idzie najsłabiej (albo której jeszcze nie było). */
function pickTips(skills: SkillLine[], today: string): string[] {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const week = Math.floor(Date.UTC(y, m - 1, d) / (7 * 86_400_000));
  const order = [...skills].filter((s) => s.domain !== 'tworczosc').sort((a, b) => a.stars - b.stars || TIP_ORDER.indexOf(a.domain) - TIP_ORDER.indexOf(b.domain));
  return order.slice(0, 2).map((s) => {
    const tips = TIPS[s.domain];
    return tips[week % tips.length]!;
  });
}
const TIP_ORDER: Domain[] = ['liczby', 'litery', 'kolory', 'emocje', 'logika', 'tworczosc'];

/** Najważniejsze sukcesy tygodnia (do pocztówki), najwyżej trzy. */
function highlights(j: Journal, acts: Partial<Record<Activity, number>>, from: string, to: string): string[] {
  const fresh = (group: string) =>
    Object.entries(j.learned)
      .filter(([k, d]) => k.startsWith(group + ':') && d >= from && d <= to)
      .map(([k]) => k.slice(group.length + 1));
  const out: string[] = [];
  const nums = fresh('liczba').map(Number);
  if (nums.length) out.push(`Liczenie do ${Math.max(...nums)}`);
  const letters = fresh('litera');
  if (letters.length) out.push(`${letters.length > 1 ? 'Nowe literki' : 'Nowa literka'}: ${list(letters)}`);
  const sounds = fresh('gloska');
  if (sounds.length) out.push(`${sounds.length > 1 ? 'Głoski' : 'Głoska'} na początku słowa: ${list(sounds.map((s) => `„${s}”`))}`);
  const colors = fresh('kolor');
  if (colors.length) out.push(`${colors.length > 1 ? 'Nowe kolory' : 'Nowy kolor'}: ${list(colors.map((c) => COLOR_NAMES[c] ?? c))}`);
  const digits = fresh('cyfra');
  if (digits.length) out.push(`${digits.length > 1 ? 'Nowe cyferki' : 'Nowa cyferka'}: ${list(digits)}`);
  const shapes = fresh('ksztalt');
  if (shapes.length) out.push(`Kształty: ${list(shapes.map((s) => SHAPE_NAMES[s] ?? s))}`);
  const emotions = fresh('emocja');
  if (emotions.length) out.push(`Emocje: ${list(emotions.map((e) => EMOTION_NAMES[e] ?? e))}`);
  // Uzupełnienie liczbami z tygodnia.
  const counts: [Activity, string, string, string][] = [
    ['historyjki', 'ułożona historyjka', 'ułożone historyjki', 'ułożonych historyjek'],
    ['kolorowanka', 'pokolorowany obrazek', 'pokolorowane obrazki', 'pokolorowanych obrazków'],
    ['ukladanka', 'ułożona układanka', 'ułożone układanki', 'ułożonych układanek'],
    ['melodia', 'zagrana melodia', 'zagrane melodie', 'zagranych melodii'],
  ];
  for (const [a, one, few, many] of counts) if ((acts[a] ?? 0) > 0) out.push(`${acts[a]} ${plural(acts[a]!, one, few, many)}`);
  const total = Object.values(acts).reduce((n, x) => n + (x ?? 0), 0);
  if (total) out.push(`${total} ${plural(total, 'rozwiązane zadanie', 'rozwiązane zadania', 'rozwiązanych zadań')}`);
  return out.slice(0, 3);
}

const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** „15–21 listopada 2026”, „28 listopada – 4 grudnia 2026”, przez Nowy Rok z oboma latami. */
export function formatRange(from: string, to: string): string {
  const [y1, m1, d1] = from.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = to.split('-').map(Number) as [number, number, number];
  if (y1 !== y2) return `${d1} ${MONTHS[m1 - 1]} ${y1} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  return `${d1}–${d2} ${MONTHS[m2 - 1]} ${y2}`;
}
