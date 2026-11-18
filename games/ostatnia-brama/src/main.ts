import { Game } from '@funfactory/kit2d';
import { PlayScene } from './scenes/play.ts';

const game = await new Game({ background: '#120e18' }).start();
await game.scenes.go(new PlayScene(), { fade: 0 });
