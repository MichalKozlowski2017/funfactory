import { palettes } from '@funfactory/art';
import { Game } from '@funfactory/kit2d';
import { KitScene } from './kit-scene.ts';

const game = await new Game({ background: palettes.candy.bg }).start();
await game.scenes.go(new KitScene(), { fade: 0 });
