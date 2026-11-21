import { Game } from '@funfactory/kit2d';
import { registerVoice } from './assets.ts';
import { WorldScene } from './scenes/world.ts';
import { logTime } from './log.ts';
import { loadState } from './state.ts';
import { loadFont } from './ui.ts';

// Gra pozioma (tablety): stała wysokość 720 jednostek, szerokość zależy od ekranu.
const game = await new Game({ background: '#fff6e8', designHeight: 720 }).start();
await Promise.all([loadFont(), loadState()]);
registerVoice(game);
game.app.ticker.add((t) => logTime(t.deltaMS / 1000));
await game.scenes.go(new WorldScene(), { fade: 0 });

