import { Game } from '@funfactory/kit2d';
import { registerVoice } from './assets.ts';
import { MeadowScene } from './scenes/meadow.ts';
import { loadState } from './state.ts';
import { loadFont } from './ui.ts';

// Gra pozioma (tablety): stała wysokość 720 jednostek, szerokość zależy od ekranu.
const game = await new Game({ background: '#fff6e8', designHeight: 720 }).start();
await Promise.all([loadFont(), loadState()]);
registerVoice(game);
await game.scenes.go(new MeadowScene(), { fade: 0 });

