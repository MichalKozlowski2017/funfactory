import type { GameServicesConfig } from '@funfactory/core';

/**
 * Tablice wyników Gluta. Te same ID trzeba utworzyć w App Store Connect (Game Center → Leaderboards)
 * i w Play Console (Usługi gier Play → Tablice wyników). Puste ID = tablica wyłączona na tej platformie.
 *
 * - best: rekord wysokości (m), klasyczna tablica, „wyżej = lepiej”.
 * - daily: wyzwanie dnia (m), na iOS tablica cykliczna co 1 dzień od 00:00 UTC
 *   (wyzwanie dnia też zmienia się o północy UTC), na Androidzie widok „dzisiaj”.
 */
export const GAME_SERVICES: GameServicesConfig = {
  ios: { best: 'glut.best', daily: 'glut.daily' },
  // Play Games (projekt 803220270496): tablice „Best height” i „Daily challenge”.
  android: { best: 'CgkIoNuinbAXEAIQAQ', daily: 'CgkIoNuinbAXEAIQAg' },
};
