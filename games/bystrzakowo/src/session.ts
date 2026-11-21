/**
 * Limit czasu zabawy (strefa rodzica). Liczy czas widocznej aplikacji od uruchomienia;
 * po limicie, przy powrocie do świata, Lusia i Bazyl idą spać (spokojne zakończenie zamiast urwania).
 */
import { state } from './state.ts';

/** Do wyboru w strefie rodzica (minuty, 0 = bez limitu). */
export const LIMITS = [0, 15, 30, 45] as const;

let played = 0;
let last = performance.now();
let unlocked = false;

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    // Czas w tle się nie liczy; po długiej przerwie (godzina) nowa sesja.
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

/** Czy czas zabawy minął (i rodzic nie przedłużył). */
export function timeIsUp(): boolean {
  const limit = state.progress.limit ?? 0;
  return !unlocked && limit > 0 && tick() >= limit * 60_000;
}

/** Rodzic przedłuża zabawę do końca tej sesji. */
export function extend(): void {
  unlocked = true;
}
