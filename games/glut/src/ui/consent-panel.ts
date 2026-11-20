import { Container, Graphics, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';
import { t } from '../i18n.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const H = 640;

/** Pytanie o zgodę na anonimowe statystyki (raz, przy pierwszym uruchomieniu; zmiana w Ustawieniach). */
export class ConsentPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly buttons: Button[];

  constructor(o: { pixelRatio: number; onAnswer: (yes: boolean) => void }) {
    super();
    this.dim.eventMode = 'static';
    const text = (size: number, fill: string, weight: '700' | '800') =>
      new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill, stroke: { color: pal.ink, width: Math.max(3, size * 0.1), join: 'round' }, align: 'center', wordWrap: true, wordWrapWidth: 480, lineHeight: size * 1.3 },
        resolution: o.pixelRatio,
        anchor: 0.5,
      });
    const title = text(48, pal.surface, '800');
    title.text = t('consentTitle');
    title.y = 80;
    const body = text(28, '#e6dcf5', '700');
    body.text = t('consentBody');
    body.y = 250;
    const yes = new Button({ label: t('consentYes'), color: pal.accent, width: 420, height: 104, fontSize: 38, resolution: o.pixelRatio, onTap: () => o.onAnswer(true) });
    yes.y = 440;
    const no = new Button({ label: t('consentNo'), color: '#6e6488', width: 420, height: 88, fontSize: 32, resolution: o.pixelRatio, onTap: () => o.onAnswer(false) });
    no.y = 560;
    this.buttons = [yes, no];
    this.body.addChild(title, body, yes, no);
    this.addChild(this.dim, this.panel, this.body);
  }

  layout(view: View): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.7 });
    const top = (view.height - H) / 2;
    this.panel.clear().roundRect(70, top, view.width - 140, H, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
  }

  tick(dt: number): void {
    for (const b of this.buttons) b.tick(dt);
  }
}
