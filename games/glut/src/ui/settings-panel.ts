import { Container, Graphics, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';
import { t } from '../i18n.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';

type Key = 'music' | 'sfx' | 'vibration' | 'lang' | 'stats' | 'privacy';

export interface SettingsState {
  music: boolean;
  sfx: boolean;
  vibration: boolean;
  /** Anonimowe statystyki włączone i identyfikator instalacji (pokazywany pod wersją). */
  stats: boolean;
  installId: string;
}

export interface SettingsOptions {
  pixelRatio: number;
  onToggle: (key: Key) => void;
  onClose: () => void;
  /** Stuknięcie w numer wersji (5 razy z rzędu włącza licznik wydajności). */
  onVersionTap?: () => void;
  /** Przycisk ustawień prywatności reklam (tylko gdy reklamy są włączone). */
  adsPrivacy?: boolean;
}

/** Ustawienia: muzyka, dźwięki, wibracje, język (i prywatność reklam, gdy są włączone). Proste przełączniki, bez wpływu na rozgrywkę. */
export class SettingsPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly title: Text;
  private readonly rows: { key: Key; button: Button }[] = [];
  private readonly close: Button;
  private readonly version: Text;
  /** Identyfikator instalacji do statystyk (gracz poda go, prosząc o usunięcie danych). */
  private readonly installId: Text;

  constructor(o: SettingsOptions) {
    super();
    this.dim.eventMode = 'static';
    this.title = new Text({
      text: t('settings'),
      style: { fontFamily: FONT, fontSize: 56, fontWeight: '800', fill: pal.surface, stroke: { color: pal.ink, width: 6, join: 'round' } },
      resolution: o.pixelRatio,
      anchor: 0.5,
    });
    for (const key of ['music', 'sfx', 'vibration', 'lang', 'stats', 'privacy'] as const) {
      if (key === 'privacy' && !o.adsPrivacy) continue;
      const color = key === 'lang' ? '#5fc8e8' : key === 'privacy' ? '#6e6488' : '#9b8cff';
      const button = new Button({ label: '', color, width: 460, height: key === 'privacy' ? 80 : 96, fontSize: key === 'privacy' ? 28 : 34, resolution: o.pixelRatio, onTap: () => o.onToggle(key) });
      this.rows.push({ key, button });
      this.body.addChild(button);
    }
    this.close = new Button({ label: t('done'), color: pal.accent, width: 320, height: 100, fontSize: 40, resolution: o.pixelRatio, onTap: o.onClose });
    this.version = new Text({
      text: `Glut ${__APP_VERSION__}`,
      style: { fontFamily: FONT, fontSize: 22, fill: '#9a8fa8' },
      resolution: o.pixelRatio,
      anchor: 0.5,
    });
    this.version.eventMode = 'static';
    this.version.hitArea = { contains: (x: number, y: number) => Math.abs(x) < 140 && Math.abs(y) < 44 };
    this.version.on('pointertap', () => o.onVersionTap?.());
    this.installId = new Text({ text: '', style: { fontFamily: FONT, fontSize: 18, fill: '#7d7290' }, resolution: o.pixelRatio, anchor: 0.5 });
    this.body.addChild(this.title, this.close, this.version, this.installId);
    this.addChild(this.dim, this.panel, this.body);
  }

  /** Dopisek przy wersji (np. stan licznika wydajności). */
  setVersionNote(note: string): void {
    this.version.text = `Glut ${__APP_VERSION__}${note ? ` · ${note}` : ''}`;
  }

  refresh(s: SettingsState): void {
    const on = (v: boolean) => (v ? t('on') : t('off'));
    for (const r of this.rows) {
      const label =
        r.key === 'music'
          ? t('music', { v: on(s.music) })
          : r.key === 'sfx'
            ? t('sfx', { v: on(s.sfx) })
            : r.key === 'vibration'
              ? t('vibration', { v: on(s.vibration) })
              : r.key === 'lang'
                ? t('language')
                : r.key === 'stats'
                  ? t('statsSetting', { v: on(s.stats) })
                  : t('privacy');
      r.button.setLabel(label);
      r.button.alpha = r.key === 'privacy' || r.key === 'lang' || s[r.key] ? 1 : 0.6;
    }
    this.installId.text = s.stats && s.installId ? `ID: ${s.installId}` : '';
  }

  /** `bottom`: miejsce zajęte od dołu (baner reklamy). */
  layout(view: View, bottom = 0): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    const h = 1060;
    const free = view.height - bottom - view.safe.top;
    const top = view.safe.top + Math.max(10, (free - h) / 2);
    this.panel.clear().roundRect(50, top, view.width - 100, h, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
    this.title.position.set(0, 80);
    this.rows.forEach((r, i) => r.button.position.set(0, 200 + i * 120));
    this.close.position.set(0, h - 130);
    this.version.position.set(0, h - 50);
    this.installId.position.set(0, h - 20);
  }

  tick(dt: number): void {
    for (const r of this.rows) r.button.tick(dt);
    this.close.tick(dt);
  }
}
