import { palettes } from '@funfactory/art';
import { Game } from '@funfactory/kit2d';
import { PlayScene } from './scenes/play.ts';

const game = await new Game({ background: palettes.candy.bg }).start();
await game.scenes.go(new PlayScene(), { fade: 0 });
