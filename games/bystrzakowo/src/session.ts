/**
 * Play time limit (parent zone). Counts the time the app is visible since launch;
 * after the limit, on returning to the world, Lusia and Bazyl go to sleep (a calm ending instead of a cutoff).
 */
import { state } from './state.ts';

/** Options in the parent zone (minutes, 0 = no limit). */
export const LIMITS = [0, 15, 30, 45] as const;

let played = 0;
let last = performance.now();
let unlocked = false;

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    // Background time does not count; after a long break (an hour) a new session starts.
    const now = performance.now();
    if (document.hidden) played += now - last;
    else if (now - last > 60 * 60_000) reset();
    last = now;
  });

function tick(): number {
  const now = performance.now();
  if (!document.hidden) played += now - last;
  last = now;
  return played;
}

export function reset(): void {
  played = 0;
  last = performance.now();
  unlocked = false;
}

/** Whether play time is up (and the parent did not extend it). */
export function timeIsUp(): boolean {
  const limit = state.progress.limit ?? 0;
  return !unlocked && limit > 0 && tick() >= limit * 60_000;
}

/** The parent extends play until the end of this session. */
export function extend(): void {
  unlocked = true;
}
