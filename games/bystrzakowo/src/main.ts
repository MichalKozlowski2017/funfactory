import { Game } from '@funfactory/kit2d';
import { registerVoice } from './assets.ts';
import { WorldScene } from './scenes/world.ts';
import { WelcomeScene } from './scenes/welcome.ts';
import { needsWelcome } from './sim/onboarding.ts';
import { logTime } from './log.ts';
import { deviceLang, lang, LANGS, setLang, type Lang } from './sim/lang.ts';
import { loadState, state } from './state.ts';
import { loadFont } from './ui.ts';

// Landscape game (tablets): fixed height of 720 units, width depends on the screen.
// iPad in portrait and iPadOS 26 windows: width at least 960 (like a 4:3 tablet), beyond that the height grows, no black bars.
const game = await new Game({ background: '#fff6e8', designHeight: 720, minWidth: 960 }).start();
await Promise.all([loadFont(), loadState()]);
// Language: the parent's choice or the device's (?lang=en|de|pl in playtests); set before the recordings, since they depend on it.
const forced = new URLSearchParams(location.search).get('lang');
setLang((LANGS as readonly string[]).includes(forced ?? '') ? (forced as Lang) : (state.progress.lang ?? deviceLang(navigator.languages ?? [navigator.language])));
document.documentElement.lang = lang();
registerVoice(game);
void import('./premium.ts').then((m) => m.syncPurchase());
game.app.ticker.add((t) => logTime(t.deltaMS / 1000));
// First launch: parent welcome. Playtests (browser driven by Playwright) start from the world,
// unless the URL has `?welcome`.
const params = new URLSearchParams(location.search);
const tour = import.meta.env.VITE_TOUR || params.has('tour');
const welcome = tour || params.has('welcome') || (needsWelcome(state.progress) && !navigator.webdriver);
await game.scenes.go(welcome ? new WelcomeScene() : new WorldScene(), { fade: 0 });


// Autopilot for testing the parent zone (build with VITE_AUTOPLAY=1 or ?autoplay).
if (import.meta.env.VITE_AUTOPLAY || new URLSearchParams(location.search).has('autoplay')) void import('./autoplay.ts').then((m) => m.startAutoplay(game));

// Tour of the screens for simulator screenshots (build with VITE_TOUR=1 or ?tour).
if (tour) void import('./tour.ts').then((m) => m.startTour(game));
