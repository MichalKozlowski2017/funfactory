/**
 * Autopilot do testów strefy rodzica: sam wchodzi do zabaw, rozwiązuje zadania (z pomyłkami)
 * i wraca do świata. Tylko w buildzie z `VITE_AUTOPLAY=1` albo z `?autoplay` w przeglądarce.
 * Każda zabawa ma swoją „trudność” dla bota, żeby raport miał mocne i słabsze strony.
 */
import { SaveStore } from '@funfactory/core';
import type { Game, Scene } from '@funfactory/kit2d';
import { ACTIVITIES, type Activity } from './sim/realms.ts';
import { setDayShift } from './log.ts';
import { newProgress } from './sim/progress.ts';
import { applyAge } from './sim/onboarding.ts';
import { saveState, state } from './state.ts';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Diag {
  started: string;
  /** Ostatni puls: czas, scena, klatki od startu, zadania bota. */
  beat: string;
  errors: string[];
  scenes: string[];
}

/**
 * Dziennik diagnostyczny (pobierany z telefonu przez devicectl): błędy JS, utrata WebGL, puls co 5 s.
 * Puls zapisuje się z setInterval, więc gdy gra zamrze, widać ostatnią klatkę i scenę.
 */
function startDiag(game: Game): Diag {
  const store = new SaveStore<Diag>('bystrzakowo-diag', { started: '', beat: '', errors: [], scenes: [] });
  const d: Diag = { started: new Date().toISOString(), beat: '', errors: [], scenes: [] };
  let frames = 0;
  game.app.ticker.add(() => frames++);
  const err = (m: string) => {
    d.errors.push(`${new Date().toISOString().slice(11, 19)} [${(game.scenes.current as unknown as Any)?.id}] ${m.slice(0, 600)}`);
    d.errors.splice(0, Math.max(0, d.errors.length - 30));
    void store.save(d);
  };
  window.addEventListener('error', (e) => err(e.message || String(e.error)));
  window.addEventListener('unhandledrejection', (e) => err(`promise: ${String((e.reason as Error)?.stack ?? e.reason)}`));
  game.app.canvas.addEventListener('webglcontextlost', () => err('WEBGL CONTEXT LOST'));
  let last = '';
  setInterval(() => {
    const id = String((game.scenes.current as unknown as Any)?.id);
    if (id !== last) {
      d.scenes.push(`${new Date().toISOString().slice(11, 19)} ${id}`);
      d.scenes.splice(0, Math.max(0, d.scenes.length - 40));
      last = id;
    }
    d.beat = `${new Date().toISOString().slice(11, 19)} scena=${id} klatki=${frames} pamiec=${Math.round(((performance as unknown as Any).memory?.usedJSHeapSize ?? 0) / 1e6)}MB`;
    void store.save(d);
  }, 5000);
  return d;
}

export function startAutoplay(game: Game, minutes = Number(new URLSearchParams(location.search).get('autoplay')) || 15): void {
  startDiag(game);
  const days = Number(import.meta.env.VITE_AUTOPLAY_DAYS ?? new URLSearchParams(location.search).get('days') ?? 0);
  if (days > 0) return playHistory(game, days);
  const rng = game.rng;
  const missRate = new Map<Activity, number>(ACTIVITIES.map((a) => [a, rng.range(0.03, 0.45)]));
  const end = performance.now() + minutes * 60_000;
  let kind: Activity | null = null;
  let since = 0;
  const tick = () => {
    if (performance.now() > end) return;
    try {
      step();
    } catch (e) {
      // Błąd w zabawie nie zatrzymuje bota: wracamy do świata i gramy dalej.
      console.warn('autoplay', e);
      (game.scenes.current as unknown as Any).leave?.();
    }
    setTimeout(tick, 1200);
  };
  const step = () => {
    const s = game.scenes.current as unknown as Any;
    since++;
    if (s.id === 'world') {
      if (!s.leaving) {
        kind = rng.pick([...ACTIVITIES]);
        s.play(kind);
        since = 0;
      }
    } else if (s.id === 'stickers') {
      if (since > 2) {
        s.demo();
        s.leave();
      }
    } else if (s.overlay) {
      // Nagroda po rundzie: wracamy do świata.
      if (since > 2 && !s.leaving) s.leave();
    } else if (!s.busy && s.layer?.children?.length && since > 1) {
      if (s.id === 'coloring') colorSome(s, rng.int(4, 9), () => rng.next());
      else if (kind && rng.next() < (missRate.get(kind) ?? 0.2)) s.missed();
      s.solve();
      since = 0;
    } else if (since > 40 && !s.leaving) {
      // Coś się zacięło: wyjście do świata.
      s.leave?.();
      since = 0;
    }
  };
  setTimeout(tick, 2000);
}

/** Kolorowanka: kilka kolorów w losowych miejscach obrazka. */
function colorSome(s: Any, n: number, rand: () => number): void {
  const pic = s.picture;
  const labels: string[] = s.palette.children.map((c: Any) => c.label);
  for (let i = 0; i < n; i++) {
    s.choose(Number(labels[Math.floor(rand() * labels.length)]));
    const w = pic.texture.width * 0.8;
    const h = pic.texture.height * 0.8;
    s.tap({ global: pic.toGlobal({ x: (rand() - 0.5) * w, y: (rand() - 0.5) * h }) });
  }
}

/** Zabawy z pomiarem tempa (codziennie) i pozostałe (po kolei, po kilka dziennie). */
const DAILY: Activity[] = ['colors', 'counting', 'phonemes', 'emotions'];
const ROUNDS_PER_DAY = 8;
/** Szansa, że dziecko bawi się danego dnia (ok. 4 dni w tygodniu, z przerwami jak w życiu). */
const PLAY_CHANCE = 0.58;

type HistoryStatus = { day: number; days: number; done: boolean; at: string };

/**
 * Tryb historii (statystyki do podejrzenia na telefonie): bot rozgrywa okres `span` minionych dni
 * (data dziennika cofnięta, próba pełnej wersji nietknięta), grając w ok. 4 dni w tygodniu. Z czasem robi
 * mniej pomyłek i odpowiada szybciej, więc wykresy pokazują krzywą nauki z prawdziwych rozgrywek.
 * Na start zeruje postępy (zostają imię, wiek, język i próba). Gra jest przyspieszona i wyciszona;
 * na końcu data wraca do dziś, a kolejne uruchomienie nic już nie robi.
 */
function playHistory(game: Game, span: number): void {
  const status = new SaveStore<HistoryStatus>(`bystrzakowo-history-${span}`, { day: 0, days: 0, done: false, at: '' });
  void status.load().then((st) => {
    if (st.done) return console.log('HISTORIA już rozegrana');
    const p = state.progress;
    const keep = { music: p.music, childName: p.childName, lang: p.lang, age: p.age, trialDays: p.trialDays, full: p.full };
    state.progress = { ...newProgress(), ...keep, onboarded: true };
    if (keep.age) applyAge(state.progress, keep.age);
    void saveState();
    runHistory(game, span, status);
  });
}

function runHistory(game: Game, span: number, status: SaveStore<HistoryStatus>): void {
  const rng = game.rng;
  // Dni zabawy w okresie (ostatni dzień, czyli dziś, zawsze).
  const days = Array.from({ length: span }, (_, i) => i).filter((i) => i === span - 1 || rng.next() < PLAY_CHANCE);
  const others = ACTIVITIES.filter((a) => !DAILY.includes(a) && a !== 'stickers' && a !== 'coloring');
  const base = new Map<Activity, number>(ACTIVITIES.map((a) => [a, rng.range(0.25, 0.55)]));
  game.sound.muted = true;
  game.loop.timeScale = 3;
  let day = 0;
  let rounds = 0;
  let kind: Activity | null = null;
  let since = 0;
  let wait = 0;
  let next = 0;
  const progress = () => days[day]! / Math.max(1, span - 1);
  const startDay = () => {
    setDayShift(-(span - 1 - days[day]!));
    rounds = 0;
    console.log(`HISTORIA dzień ${day + 1}/${days.length}`);
    void status.save({ day: day + 1, days: days.length, done: false, at: new Date().toISOString() });
  };
  startDay();
  const pick = (): Activity => (rounds < DAILY.length ? DAILY[rounds]! : others[next++ % others.length]!);
  let last: unknown = null;
  const tick = () => {
    const s = game.scenes.current as unknown as Any;
    // Nowy ekran: liczymy od zera (zmiana sceny w trakcie poprzedniego przejścia przepada).
    if (s !== last) {
      last = s;
      since = 0;
    }
    since++;
    try {
      if (s.id === 'world') {
        if (s.leaving) {
          // Przejście do zabawy się nie odbyło: świat od nowa.
          if (since > 25) void game.scenes.go(new (s.constructor as new () => Scene)(), { fade: 0 });
          return void setTimeout(tick, 400);
        }
        if (since < 4) return void setTimeout(tick, 400);
        if (rounds >= ROUNDS_PER_DAY) {
          day++;
          if (day >= days.length) {
            setDayShift(0);
            game.loop.timeScale = 1;
            game.sound.muted = false;
            console.log('HISTORIA koniec');
            void status.save({ day: days.length, days: days.length, done: true, at: new Date().toISOString() });
            return;
          }
          startDay();
        }
        kind = pick();
        s.play(kind);
        since = 0;
        wait = 1 + Math.round((1 - progress()) * 4 + rng.next());
      } else if (s.overlay) {
        if (since > 2 && !s.leaving) {
          rounds++;
          s.leave();
        }
      } else if (!s.busy && s.layer?.children?.length && since > wait) {
        // Pomyłki maleją z czasem (od bazy do ok. 1/4 bazy), czas do odpowiedzi też.
        const miss = (base.get(kind!) ?? 0.3) * (1 - 0.75 * progress());
        if (rng.next() < miss) s.missed();
        s.solve();
        since = 0;
        wait = 1 + Math.round((1 - progress()) * 4 + rng.next());
      } else if (since > 60 && !s.leaving) {
        s.leave?.();
        since = 0;
      }
    } catch (e) {
      console.warn('history', e);
      s.leave?.();
    }
    setTimeout(tick, 400);
  };
  setTimeout(tick, 2500);
}
