/**
 * Teksty gry po polsku i angielsku. Język: z ustawień (Save.lang) albo z telefonu
 * (polski dla `pl`, angielski dla wszystkich innych). Czyste dane, bez Pixi.
 *
 * Nazwy z danych gry (osiągnięcia, rzeczy w szafie, światy, power-upy) zostają po polsku w `sim/`
 * (źródło prawdy), a angielskie są tu, po id. Test pilnuje, żeby żadnego id nie brakowało.
 */
import { ACHIEVEMENTS, type AchievementDef } from './sim/achievements.ts';
import { BIOMES } from './sim/biomes.ts';
import type { ControlMode } from './sim/controls.ts';
import type { PowerKind } from './sim/shaft.ts';
import { ITEMS, type ItemKind } from './sim/shop.ts';

export type Lang = 'pl' | 'en';
export const LANGS: Lang[] = ['pl', 'en'];

const PL = {
  start: 'Dotknij, aby zacząć',
  daily: 'Wyzwanie dnia',
  wardrobe: 'Szafa',
  achievements: 'Osiągnięcia',
  settings: 'Ustawienia',
  ranking: 'Ranking',
  done: 'Gotowe',
  best: 'rekord {m} m',
  todayLine: 'dziś {m} m',
  dailySame: 'ta sama studnia dla wszystkich',
  dailyToday: 'dziś: {m} m (prób: {n})',
  dailyStreak: ' · seria {n} dni',
  dailyBanner: 'Wyzwanie dnia · {date}',
  syrup: '▼ syrop {m} m',
  loginIos: "Zaloguj się do Game Center w Ustawieniach iPhone'a",
  loginAndroid: 'Ranking działa w aplikacji z kontem Google Play Games',
  hintDragStart: 'Przeciągnij w dół i puść',
  hintDragAir: 'W locie przeciągnij jeszcze raz!',
  hintSwipeStart: 'Przesuń palcem w stronę skoku',
  hintSwipeAir: 'W locie przesuń jeszcze raz!',
  hintTapStart: 'Stuknij tam, gdzie chcesz skoczyć',
  hintTapAir: 'W locie stuknij jeszcze raz!',
  bounced: 'Odbite!',
  rescue: 'Ratunek',
  acrobat: 'Akrobacja',
  combo: 'Combo',
  overSyrup: 'Syrop cię dopadł!',
  overSpikes: 'Au, kolce!',
  time: 'czas {t}',
  newRecord: 'Nowy rekord!',
  bestToday: 'Najlepszy dziś! (próba {n})',
  dailyBest: 'wyzwanie dnia: najlepiej {m} m',
  recordToday: 'Nowy rekord! · dziś {m} m',
  candiesRun: '+{n} {candies} (razem {total})',
  rhythmBest: 'najlepszy rytm ×{n}',
  bonus: ' · premie +{n}',
  again: 'Jeszcze raz',
  menu: 'Menu',
  achievement: 'Osiągnięcie!',
  newInWardrobe: 'Nowość w szafie: {item}',
  worn: 'Założone ✓',
  wear: 'Załóż',
  locked: '🔒 osiągnięcie',
  price: '{n} cukierków',
  unlockFor: 'za: {what}',
  missing: 'brakuje {n}',
  on: 'wł.',
  off: 'wył.',
  music: 'Muzyka: {v}',
  sfx: 'Dźwięki: {v}',
  vibration: 'Wibracje: {v}',
  controls: 'Sterowanie: {v}',
  privacy: 'Prywatność reklam',
  language: 'Język: Polski',
  perfOn: 'licznik wł.',
  kindHat: 'Czapki',
  kindSkin: 'Kolory',
  kindTrail: 'Ślady',
  kindAcc: 'Dodatki',
  tier0: 'Rytm',
  tier1: 'Super rytm',
  tier2: 'Szał',
  tier3: 'Cukrowy szał',
  ctrlDrag: 'Proca',
  ctrlSwipe: 'Swipe',
  ctrlTap: 'Tap',
  play: 'Graj',
  dailyRanking: 'Ranking dnia',
  nextIn: 'Nowe wyzwanie za {t}',
  todayBest: 'Dziś najlepiej: {m} m',
  todayNone: 'Dziś jeszcze bez próby',
  tries: 'próby: {n}',
  streakNow: 'Seria: {n} dni z rzędu',
  streakNone: 'Zagraj dziś, żeby zacząć serię',
  medalGoal: 'Medal za 7 dni z rzędu: {n}/7',
  medalGot: 'Medal zdobyty ✓',
  last7: 'Ostatnie 7 dni',
  bestDailyEver: 'Najlepszy wynik dnia: {m} m',
  weekdays: 'pn,wt,śr,cz,pt,sb,nd',
  tipStreak: 'Skacz od razu po lądowaniu: seria daje premie!',
  tipSyrup: 'Syrop rośnie! Wspinaj się wyżej',
  tipPower: 'Złap bańkę: daje moc na kilka sekund',
  paused: 'Pauza',
  resume: 'Wróć do gry',
  quitNote: 'Wyjście do menu kończy bieg. Wynik i cukierki zostają zapisane.',
};

type Key = keyof typeof PL;

const EN: Record<Key, string> = {
  start: 'Tap to start',
  daily: 'Daily challenge',
  wardrobe: 'Wardrobe',
  achievements: 'Achievements',
  settings: 'Settings',
  ranking: 'Leaderboard',
  done: 'Done',
  best: 'best {m} m',
  todayLine: 'today {m} m',
  dailySame: 'the same tower for everyone',
  dailyToday: 'today: {m} m ({n} tries)',
  dailyStreak: ' · {n}-day streak',
  dailyBanner: 'Daily challenge · {date}',
  syrup: '▼ syrup {m} m',
  loginIos: 'Sign in to Game Center in iPhone Settings',
  loginAndroid: 'Leaderboards need a Google Play Games account',
  hintDragStart: 'Drag down and let go',
  hintDragAir: 'In the air, drag again!',
  hintSwipeStart: 'Swipe where you want to jump',
  hintSwipeAir: 'In the air, swipe again!',
  hintTapStart: 'Tap where you want to jump',
  hintTapAir: 'In the air, tap again!',
  bounced: 'Bounced!',
  rescue: 'Rescue',
  acrobat: 'Acrobat',
  combo: 'Combo',
  overSyrup: 'The syrup got you!',
  overSpikes: 'Ouch, spikes!',
  time: 'time {t}',
  newRecord: 'New record!',
  bestToday: 'Best today! (try {n})',
  dailyBest: 'daily challenge: best {m} m',
  recordToday: 'New record! · today {m} m',
  candiesRun: '+{n} {candies} (total {total})',
  rhythmBest: 'best rhythm ×{n}',
  bonus: ' · bonus +{n}',
  again: 'Play again',
  menu: 'Menu',
  achievement: 'Achievement!',
  newInWardrobe: 'New in wardrobe: {item}',
  worn: 'Wearing ✓',
  wear: 'Wear',
  locked: '🔒 achievement',
  price: '{n} candies',
  unlockFor: 'for: {what}',
  missing: '{n} more',
  on: 'on',
  off: 'off',
  music: 'Music: {v}',
  sfx: 'Sounds: {v}',
  vibration: 'Vibration: {v}',
  controls: 'Controls: {v}',
  privacy: 'Ad privacy',
  language: 'Language: English',
  perfOn: 'meter on',
  kindHat: 'Hats',
  kindSkin: 'Colors',
  kindTrail: 'Trails',
  kindAcc: 'Extras',
  tier0: 'Rhythm',
  tier1: 'Super rhythm',
  tier2: 'Frenzy',
  tier3: 'Sugar rush',
  ctrlDrag: 'Slingshot',
  ctrlSwipe: 'Swipe',
  ctrlTap: 'Tap',
  play: 'Play',
  dailyRanking: "Today's leaderboard",
  nextIn: 'New challenge in {t}',
  todayBest: "Today's best: {m} m",
  todayNone: 'No try yet today',
  tries: 'tries: {n}',
  streakNow: 'Streak: {n} days in a row',
  streakNone: 'Play today to start a streak',
  medalGoal: 'Medal for 7 days in a row: {n}/7',
  medalGot: 'Medal earned ✓',
  last7: 'Last 7 days',
  bestDailyEver: 'Best daily result: {m} m',
  weekdays: 'Mo,Tu,We,Th,Fr,Sa,Su',
  tipStreak: 'Jump right after landing: streaks give bonuses!',
  tipSyrup: 'The syrup is rising! Keep climbing',
  tipPower: 'Grab a bubble: it gives a power for a few seconds',
  paused: 'Paused',
  resume: 'Resume',
  quitNote: 'Going to the menu ends the run. Your score and candies are saved.',
};

/** Angielskie nazwy z danych gry (po id). */
export const EN_DATA = {
  items: {
    party: 'Party hat',
    chef: 'Chef hat',
    pirate: 'Pirate hat',
    crown: 'Crown',
    wizard: 'Wizard hat',
    horns: 'Horns',
    mint: 'Mint',
    lemon: 'Lemon',
    ice: 'Ice',
    grape: 'Grape',
    gold: 'Gold',
    prism: 'Rainbow',
    bubbles: 'Bubbles',
    hearts: 'Hearts',
    notes: 'Notes',
    stars: 'Stars',
    rainbow: 'Rainbow',
    fire: 'Fire',
    bow: 'Bow',
    mustache: 'Mustache',
    headphones: 'Headphones',
    shades: 'Shades',
    monocle: 'Monocle',
    medal: 'Medal',
  } as Record<string, string>,
  achievements: {
    h50: ['First steps', 'Climb 50 m'],
    h100: ['Chocolate mine', 'Reach 100 m'],
    h200: ['Gummy forest', 'Reach 200 m'],
    h300: ['Above the clouds', 'Reach 300 m'],
    h400: ['Burnt caramel', 'Reach 400 m'],
    h500: ['Licorice swamp', 'Reach 500 m'],
    h600: ['Abandoned factory', 'Reach 600 m'],
    h700: ['Sugar nightmare', 'Reach 700 m'],
    s5: ['In the groove', 'Streak ×5'],
    s10: ['Super rhythm', 'Streak ×10'],
    s15: ['Frenzy', 'Streak ×15'],
    s20: ['Sugar rush', 'Streak ×20'],
    air3: ['Three breaths', '3 jumps in one flight'],
    air6: ['Acrobat', '6 jumps in one flight (with Second breath)'],
    combo4: ['Sweet tooth', '4 candies in one jump'],
    combo6: ['Glutton', '6 candies in one jump'],
    rescue1: ['Just in time', 'Save yourself with a mid-air jump'],
    rescue25: ['Lifeguard', '25 rescues'],
    bounce50: ['Trampoline', '50 jelly bounces'],
    crumble30: ['Crumbler', 'Crumble 30 chocolates'],
    powers: ['Collector', 'Collect every power-up'],
    fast100: ['Sprinter', '100 m in 30 seconds'],
    fast200: ['Lightning', '200 m in a minute'],
    fast300: ['Rocket', '300 m in 1:30'],
    candies60: ['Sweet rush', '50 candies in the first minute'],
    candies60b: ['Candy storm', '100 candies in the first minute'],
    live120: ['Two minutes', 'Survive 2 minutes in one run'],
    live300: ['Marathon', 'Survive 5 minutes in one run'],
    runs10: ['Warm-up', 'Play 10 runs'],
    runs100: ['Persistent', 'Play 100 runs'],
    runs500: ['Veteran', 'Play 500 runs'],
    candy1k: ['Candy lover', 'Collect 1,000 candies'],
    candy10k: ['Confectioner', 'Collect 10,000 candies'],
    candy50k: ['Sugar baron', 'Collect 50,000 candies'],
    daily1: ['Challenge accepted', 'Play the daily challenge'],
    daily3: ['Three days', 'Daily challenge 3 days in a row'],
    daily7: ['Whole week', 'Daily challenge 7 days in a row'],
    dressed: ['Dapper', 'Wear something from every wardrobe section'],
  } as Record<string, [string, string]>,
  biomes: {
    crystal: ['Crystal cave', ''],
    choco: ['Chocolate mine', 'Chocolate crumbles under you!'],
    jelly: ['Gummy forest', 'Jelly bounces like a trampoline'],
    clouds: ['Cotton candy clouds', 'You can fly through clouds from below'],
    caramel: ['Burnt caramel', 'Chocolate and jelly together'],
    licorice: ['Licorice swamp', 'Clouds and crumbling ledges'],
    factory: ['Abandoned factory', 'Conveyor belts push you off'],
    nightmare: ['Sugar nightmare', 'Everything at once. Good luck!'],
  } as Record<string, [string, string]>,
  powers: {
    shell: 'Rubber shell',
    breath: 'Second breath',
    magnet: 'Magnet',
    frost: 'Frost breath',
    rocket: 'Pepper rocket',
    glue: 'Sticky paws',
  } as Record<PowerKind, string>,
};

const PL_POWERS: Record<PowerKind, string> = {
  shell: 'Gumowa skorupka',
  breath: 'Drugi oddech',
  magnet: 'Magnes',
  frost: 'Lodowy oddech',
  rocket: 'Pieprzowa rakieta',
  glue: 'Lepkie łapki',
};

let current: Lang = 'pl';

/** Język z telefonu: polski dla polskiego, angielski dla wszystkich innych. */
export function detectLang(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): Lang {
  const first = (languages[0] ?? '').toLowerCase();
  return first.startsWith('pl') ? 'pl' : 'en';
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function lang(): Lang {
  return current;
}

/** Tekst po kluczu z podstawieniem {zmiennych}. */
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const s = (current === 'en' ? EN : PL)[key];
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

/** „cukierek / cukierki / cukierków” albo „candy / candies”. */
export function candies(n: number): string {
  if (current === 'en') return n === 1 ? 'candy' : 'candies';
  if (n === 1) return 'cukierek';
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'cukierki' : 'cukierków';
}

export const itemName = (id: string): string =>
  current === 'en' ? (EN_DATA.items[id] ?? id) : (ITEMS.find((i) => i.id === id)?.name ?? id);

export const achName = (d: AchievementDef): string => (current === 'en' ? (EN_DATA.achievements[d.id]?.[0] ?? d.name) : d.name);
export const achDesc = (d: AchievementDef): string => (current === 'en' ? (EN_DATA.achievements[d.id]?.[1] ?? d.desc) : d.desc);

export const biomeName = (index: number): string => {
  const b = BIOMES[index]!;
  return current === 'en' ? (EN_DATA.biomes[b.id]?.[0] ?? b.name) : b.name;
};
export const biomeTip = (index: number): string => {
  const b = BIOMES[index]!;
  return current === 'en' ? (EN_DATA.biomes[b.id]?.[1] ?? b.tip) : b.tip;
};

export const powerName = (kind: PowerKind): string => (current === 'en' ? EN_DATA.powers[kind] : PL_POWERS[kind]);

export const kindName = (kind: ItemKind): string =>
  t(({ hat: 'kindHat', skin: 'kindSkin', trail: 'kindTrail', acc: 'kindAcc' } as const)[kind]);

export const tierName = (level: number): string => t((['tier0', 'tier1', 'tier2', 'tier3'] as const)[Math.max(0, Math.min(3, level))]!);

export const controlName = (mode: ControlMode): string => t(({ drag: 'ctrlDrag', swipe: 'ctrlSwipe', tap: 'ctrlTap' } as const)[mode]);

/** Data wyzwania do pokazania (RRRR-MM-DD → 19.11.2026 albo Nov 19, 2026). */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  if (current === 'pl') return `${d}.${String(m).padStart(2, '0')}.${y}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

/** Do testów: wszystkie id danych mają tłumaczenie. */
export function missingTranslations(): string[] {
  const out: string[] = [];
  for (const i of ITEMS) if (!EN_DATA.items[i.id]) out.push(`item:${i.id}`);
  for (const a of ACHIEVEMENTS) if (!EN_DATA.achievements[a.id]) out.push(`ach:${a.id}`);
  for (const b of BIOMES) if (!EN_DATA.biomes[b.id]) out.push(`biome:${b.id}`);
  return out;
}
