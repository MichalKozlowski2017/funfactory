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
    ['powitanie-1', () => {}],
    ['powitanie-2', () => scene().go(1)],
    ['powitanie-3', () => scene().go(2)],
    ['powitanie-4', () => {
      scene().go(3);
      scene().pickAge(5);
    }],
    ['swiat-raczka', () => scene().finish(true)],
    ['sortowanie', () => scene().play('sortowanie')],
    ['litery', () => {
      scene().leave();
      setTimeout(() => scene().play('litery'), 1500);
    }],
    ['kolorowanka', () => {
      scene().leave();
      setTimeout(() => scene().play('kolorowanka'), 1500);
    }],
    ['statystyki', () => {
      scene().leave();
      setTimeout(() => scene().demoStats(''), 1500);
    }],
    ['statystyki-kolory', () => scene().demoStats('kolory')],
    ['ustawienia', () => scene().parentPanel.setTab('ustawienia')],
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
