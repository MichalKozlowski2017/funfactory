import { Game } from '@funfactory/kit2d';
import { BootScene } from './scenes/boot.ts';

const game = await new Game({ background: '#000000' }).start();
await game.scenes.go(new BootScene(), { fade: 0 });
