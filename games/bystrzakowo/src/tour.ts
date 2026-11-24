/**
 * Wycieczka po ekranach do zrzutów na symulatorze (iPad, iPhone), gdzie nie da się wpisać poleceń w konsoli:
 * powitanie, świat z rączką, zabawy z pokazem gestu, statystyki i ustawienia rodzica. Co kilka sekund następny
 * ekran; nazwa bieżącego trafia do konsoli („TOUR <n> <nazwa>”). Tylko build z `VITE_TOUR=1` albo `?tour`.
 */
import type { Game } from '@funfactory/kit2d';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Odstęp między ekranami (s): dość, żeby rączka zdążyła pokazać gest, a zrzut złapał spokojny kadr. */
export const TOUR_STEP = 6;

export function startTour(game: Game): void {
  const scene = () => game.scenes.current as unknown as Any;
  const steps: [string, () => void][] = [
    ['welcome-1', () => {}],
    ['welcome-2', () => scene().go(1)],
    ['welcome-3', () => scene().go(2)],
    ['welcome-4', () => {
      scene().go(3);
      scene().pickAge(5);
    }],
    ['world-hand', () => scene().finish(true)],
    ['sorting', () => scene().play('sorting')],
    ['letters', () => {
      scene().leave();
      setTimeout(() => scene().play('letters'), 1500);
    }],
    ['coloring', () => {
      scene().leave();
      setTimeout(() => scene().play('coloring'), 1500);
    }],
    ['stats', () => {
      scene().leave();
      setTimeout(() => scene().demoStats(''), 1500);
    }],
    ['stats-colors', () => scene().demoStats('colors')],
    ['settings', () => scene().parentPanel.setTab('settings')],
  ];
  steps.forEach(([name, run], i) =>
    setTimeout(() => {
      console.log(`TOUR ${i + 1} ${name}`);
      try {
        run();
      } catch (e) {
        console.log(`TOUR błąd ${name}: ${String(e)}`);
      }
    }, (1 + i * TOUR_STEP) * 1000),
  );
}
