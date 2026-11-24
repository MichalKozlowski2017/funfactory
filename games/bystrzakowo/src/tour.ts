/**
 * A tour through screens for screenshots on the simulator (iPad, iPhone), where you can't type commands in the console:
 * onboarding, world with the hand, activities with the gesture demo, parent stats and settings. Every few seconds the next
 * screen; the current one's name goes to the console ("TOUR <n> <name>"). Only in builds with `VITE_TOUR=1` or `?tour`.
 */
import type { Game } from '@funfactory/kit2d';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Interval between screens (s): long enough for the hand to show the gesture and for the screenshot to catch a still frame. */
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
        console.log(`TOUR error ${name}: ${String(e)}`);
      }
    }, (1 + i * TOUR_STEP) * 1000),
  );
}
