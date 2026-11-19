import { Container, FillGradient, Graphics, Rectangle, Sprite, Text, type Texture } from 'pixi.js';
import { palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';

export interface TitleOptions {
  candyTex: Texture;
  pixelRatio: number;
  onStart: () => void;
  onShop: () => void;
  /** Wyzwanie dnia: ta sama studnia dla wszystkich. */
  onDaily: () => void;
  onAchievements: () => void;
  /** Ustawienia (muzyka, dźwięki, wibracje, sterowanie). */
  onSettings: () => void;
}

/**
 * Ekran startowy na tle studni: tytuł, „dotknij, aby zacząć”, rekord, cukierki, wejście do sklepu.
 * Stuknięcie w dowolne miejsce poza przyciskiem startuje grę.
 */
export class TitleOverlay extends Container {
  private readonly tap = new Container();
  /** Przyciemnienie pod napisami, żeby nie mieszały się z półkami w tle. */
  private readonly shade = new Graphics();
  private readonly logo: Text;
  private readonly prompt: Text;
  private readonly best: Text;
  private readonly bank: Text;
  private readonly icon: Sprite;
  private readonly shop: Button;
  private readonly settings: Button;
  private readonly daily: Button;
  private readonly trophies: Button;
  private readonly dailyInfo: Text;
  private time = 0;

  constructor(o: TitleOptions) {
    super();
    const text = (size: number, fill: string, weight: '800' | '900' = '800') =>
      new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill, stroke: { color: pal.ink, width: Math.max(4, size * 0.11), join: 'round' } },
        resolution: o.pixelRatio,
        anchor: 0.5,
      });
    this.logo = text(170, '#ff9ebb', '900');
    this.logo.text = 'Glut';
    // Cukierkowy napis: różowe wypełnienie, gruby biały kontur, twardy ciemny cień pod spodem.
    this.logo.style.stroke = { color: '#fff4f8', width: 16, join: 'round' };
    this.logo.style.dropShadow = { color: '#120a1e', distance: 10, angle: Math.PI / 2, blur: 0, alpha: 1 };
    this.prompt = text(40, pal.surface);
    this.prompt.text = 'Dotknij, aby zacząć';
    this.best = text(32, pal.accent);
    this.bank = text(36, pal.surface);
    // Do prawej, przed ikonką: dłuższe liczby rosną w lewo, a nie pod zaokrąglony róg ekranu.
    this.bank.anchor.set(1, 0.5);
    this.icon = new Sprite({ texture: o.candyTex, anchor: 0.5 });
    this.icon.scale.set(54 / Math.max(o.candyTex.width, o.candyTex.height));
    this.daily = new Button({ label: 'Wyzwanie dnia', color: '#ffb84d', width: 420, height: 104, fontSize: 40, resolution: o.pixelRatio, onTap: o.onDaily });
    this.dailyInfo = text(26, '#ffd9a0');
    this.shop = new Button({ label: 'Szafa', color: '#9b8cff', width: 250, height: 96, fontSize: 38, resolution: o.pixelRatio, onTap: o.onShop });
    this.trophies = new Button({ label: 'Osiągnięcia', color: '#e58bd0', width: 250, height: 96, fontSize: 34, resolution: o.pixelRatio, onTap: o.onAchievements });

    this.settings = new Button({ label: 'Ustawienia', color: '#5fc8e8', width: 300, height: 88, fontSize: 34, resolution: o.pixelRatio, onTap: o.onSettings });

    this.tap.eventMode = 'static';
    this.tap.on('pointertap', () => o.onStart());
    this.addChild(this.shade, this.tap, this.logo, this.prompt, this.best, this.icon, this.bank, this.daily, this.dailyInfo, this.shop, this.trophies, this.settings);
  }

  setStats(best: number, candies: number): void {
    this.best.text = best > 0 ? `rekord ${best} m` : '';
    this.bank.text = `${candies}`;
  }

  /** Podpis pod wyzwaniem dnia: dzisiejszy wynik i seria dni. */
  setDaily(info: string): void {
    this.dailyInfo.text = info;
  }

  /** `bottom`: miejsce zajęte od dołu (baner reklamy); przyciski zostają nad nim. */
  layout(view: View, bottom = 0): void {
    this.tap.hitArea = new Rectangle(0, 0, view.width, view.height);
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: 'rgba(20,12,34,0.82)' },
        { offset: 0.75, color: 'rgba(20,12,34,0.6)' },
        { offset: 1, color: 'rgba(20,12,34,0)' },
      ],
    });
    this.shade.clear().rect(0, 0, view.width, view.height * 0.68).fill(gradient);
    const cx = view.width / 2;
    this.logo.position.set(cx, view.height * 0.24);
    this.prompt.position.set(cx, view.height * 0.4);
    this.best.position.set(cx, view.height * 0.4 + 60);
    this.icon.position.set(view.width - 52, view.safe.top + 58);
    this.bank.position.set(view.width - 90, view.safe.top + 58);
    let y = Math.max(view.height * 0.5, view.height * 0.4 + 140);
    // Ostatni przycisk (dół ok. y + 340) nad banerem.
    y = Math.min(y, view.height - bottom - 350);
    this.daily.position.set(cx, y);
    this.dailyInfo.position.set(cx, y + 76);
    this.shop.position.set(cx - 135, y + 180);
    this.trophies.position.set(cx + 135, y + 180);
    this.settings.position.set(cx, y + 290);
  }

  tick(dt: number): void {
    this.time += dt;
    this.shop.tick(dt);
    this.settings.tick(dt);
    this.daily.tick(dt);
    this.trophies.tick(dt);
    this.logo.rotation = Math.sin(this.time * 1.6) * 0.035;
    this.logo.scale.set(1 + Math.sin(this.time * 3.2) * 0.025, 1 - Math.sin(this.time * 3.2) * 0.025);
    this.prompt.alpha = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 2.4));
  }
}
