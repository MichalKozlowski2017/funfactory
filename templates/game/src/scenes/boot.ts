import { Text } from 'pixi.js';
import { Scene, type View } from '@funfactory/kit2d';

/** Pusta scena startowa. Zastąp ją pierwszą sceną gry. */
export class BootScene extends Scene {
  readonly id = 'boot';
  private title!: Text;

  override enter(): void {
    this.title = new Text({
      text: '__TITLE__',
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 64, fontWeight: '800', fill: '#ffffff' },
      anchor: 0.5,
      resolution: this.game.pixelRatio,
    });
    this.addChild(this.title);
    this.game.markReady();
  }

  override resize(view: View): void {
    this.title.position.set(view.width / 2, view.height / 2);
  }
}
