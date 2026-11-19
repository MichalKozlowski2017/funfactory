import { Container, Graphics, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';
import { t } from '../i18n.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const H = 560;

/** Pauza w trakcie biegu: wróć do gry albo zakończ bieg i wyjdź do menu (wynik się zapisuje). */
export class PausePanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly buttons: Button[];

  constructor(o: { pixelRatio: number; onResume: () => void; onMenu: () => void }) {
    super();
    this.dim.eventMode = 'static';
    const text = (size: number, fill: string, weight: '700' | '800') =>
      new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill, stroke: { color: pal.ink, width: Math.max(3, size * 0.1), join: 'round' }, align: 'center', wordWrap: true, wordWrapWidth: 520 },
        resolution: o.pixelRatio,
        anchor: 0.5,
      });
    const title = text(60, pal.surface, '800');
    title.text = t('paused');
    title.y = 80;
    const resume = new Button({ label: t('resume'), color: pal.accent, width: 420, height: 110, fontSize: 42, resolution: o.pixelRatio, onTap: o.onResume });
    resume.y = 220;
    const menu = new Button({ label: t('menu'), color: '#9b8cff', width: 420, height: 96, fontSize: 38, resolution: o.pixelRatio, onTap: o.onMenu });
    menu.y = 360;
    const note = text(24, '#a99cc0', '700');
    note.text = t('quitNote');
    note.y = 460;
    this.buttons = [resume, menu];
    this.body.addChild(title, resume, menu, note);
    this.addChild(this.dim, this.panel, this.body);
  }

  layout(view: View): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.7 });
    const top = (view.height - H) / 2;
    this.panel.clear().roundRect(80, top, view.width - 160, H, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
  }

  tick(dt: number): void {
    for (const b of this.buttons) b.tick(dt);
  }
}
