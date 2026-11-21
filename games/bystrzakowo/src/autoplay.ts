/**
 * Autopilot do testów strefy rodzica: sam wchodzi do zabaw, rozwiązuje zadania (z pomyłkami)
 * i wraca do świata. Tylko w buildzie z `VITE_AUTOPLAY=1` albo z `?autoplay` w przeglądarce.
 * Każda zabawa ma swoją „trudność” dla bota, żeby raport miał mocne i słabsze strony.
 */
import { SaveStore } from '@funfactory/core';
import type { Game } from '@funfactory/kit2d';
import { ACTIVITIES, type Activity } from './sim/realms.ts';

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
