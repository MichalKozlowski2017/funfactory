import { Container, Graphics, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';

type Key = 'music' | 'sfx' | 'vibration' | 'controls' | 'privacy';

export interface SettingsState {
  music: boolean;
  sfx: boolean;
  vibration: boolean;
  /** Nazwa trybu sterowania (Swipe / Proca / Tap). */
  controls: string;
}

export interface SettingsOptions {
  pixelRatio: number;
  onToggle: (key: Key) => void;
  onClose: () => void;
}

/** Ustawienia: muzyka, dźwięki, wibracje, sterowanie. Proste przełączniki, bez wpływu na rozgrywkę. */
export class SettingsPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly title: Text;
  private readonly rows: { key: Key; button: Button }[] = [];
  private readonly close: Button;
  private readonly version: Text;

  constructor(o: SettingsOptions) {
    super();
    this.dim.eventMode = 'static';
    this.title = new Text({
      text: 'Ustawienia',
      style: { fontFamily: FONT, fontSize: 56, fontWeight: '800', fill: pal.surface, stroke: { color: pal.ink, width: 6, join: 'round' } },
      resolution: o.pixelRatio,
      anchor: 0.5,
    });
    for (const key of ['music', 'sfx', 'vibration', 'controls', 'privacy'] as const) {
      const color = key === 'controls' ? '#5fc8e8' : key === 'privacy' ? '#6e6488' : '#9b8cff';
      const button = new Button({ label: '', color, width: 460, height: key === 'privacy' ? 80 : 96, fontSize: key === 'privacy' ? 28 : 34, resolution: o.pixelRatio, onTap: () => o.onToggle(key) });
      this.rows.push({ key, button });
      this.body.addChild(button);
    }
    this.close = new Button({ label: 'Gotowe', color: pal.accent, width: 320, height: 100, fontSize: 40, resolution: o.pixelRatio, onTap: o.onClose });
    this.version = new Text({
      text: `Glut ${__APP_VERSION__}`,
      style: { fontFamily: FONT, fontSize: 22, fill: '#9a8fa8' },
      resolution: o.pixelRatio,
      anchor: 0.5,
    });
    this.body.addChild(this.title, this.close, this.version);
    this.addChild(this.dim, this.panel, this.body);
  }

  refresh(s: SettingsState): void {
    const on = (v: boolean) => (v ? 'wł.' : 'wył.');
    for (const r of this.rows) {
      const label =
        r.key === 'music'
          ? `Muzyka: ${on(s.music)}`
          : r.key === 'sfx'
            ? `Dźwięki: ${on(s.sfx)}`
            : r.key === 'vibration'
              ? `Wibracje: ${on(s.vibration)}`
              : r.key === 'controls'
                ? `Sterowanie: ${s.controls}`
                : 'Prywatność reklam';
      r.button.setLabel(label);
      r.button.alpha = r.key === 'controls' || r.key === 'privacy' || s[r.key] ? 1 : 0.6;
    }
  }

  layout(view: View): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    const h = 940;
    const top = (view.height - h) / 2;
    this.panel.clear().roundRect(50, top, view.width - 100, h, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
    this.title.position.set(0, 80);
    this.rows.forEach((r, i) => r.button.position.set(0, 200 + i * 120));
    this.close.position.set(0, h - 130);
    this.version.position.set(0, h - 50);
  }

  tick(dt: number): void {
    for (const r of this.rows) r.button.tick(dt);
    this.close.tick(dt);
  }
}
