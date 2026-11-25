import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import { haptics, Spring } from '@funfactory/core';
import { hexToNumber, lighten, darken } from '@funfactory/art';

export interface ButtonOptions {
  label: string;
  width?: number;
  height?: number;
  color?: string;
  textColor?: string;
  radius?: number;
  fontFamily?: string;
  fontSize?: number;
  /** Rozdzielczość tekstu, zwykle `game.pixelRatio`. */
  resolution?: number;
  /** Płaski przycisk (np. strefa rodzica): bez połysku, z cienkim cieniem i delikatnym wciśnięciem. */
  flat?: boolean;
  onTap?: () => void;
}

/**
 * Przycisk z „miękkim” wciśnięciem: sprężyna skali, cień, który chowa się pod spód, haptyka.
 * Rozmiar dotyku minimum 88 jednostek (~44pt na telefonie).
 */
export class Button extends Container {
  enabled = true;
  private readonly press = new Spring(1, 520, 22);
  private readonly face = new Container();
  private readonly shadow = new Graphics();
  private readonly plate = new Graphics();
  private readonly text: Text;
  private readonly opts: Required<Omit<ButtonOptions, 'onTap' | 'resolution' | 'flat'>> & ButtonOptions;
  private down = false;

  constructor(options: ButtonOptions) {
    super();
    this.opts = {
      width: 320,
      height: 112,
      color: '#ff7a59',
      textColor: '#ffffff',
      radius: 28,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 44,
      ...options,
    };
    const style: TextStyleOptions = {
      fontFamily: this.opts.fontFamily,
      fontSize: this.opts.fontSize,
      fontWeight: '800',
      fill: this.opts.textColor,
    };
    this.text = new Text({ text: this.opts.label, style, anchor: 0.5, resolution: this.opts.resolution ?? 2 });
    this.addChild(this.shadow, this.face);
    this.face.addChild(this.plate, this.text);
    this.fit();
    this.draw();

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => this.setDown(true));
    this.on('pointerup', () => {
      if (this.down && this.enabled) {
        haptics.tap();
        this.opts.onTap?.();
      }
      this.setDown(false);
    });
    this.on('pointerupoutside', () => this.setDown(false));
    this.on('pointerleave', () => this.setDown(false));
  }

  setLabel(value: string): void {
    this.text.text = value;
    this.fit();
  }

  /** Napis szerszy niż przycisk (np. inny język) zmniejsza się, zamiast wychodzić poza krawędź. */
  private fit(): void {
    this.text.scale.set(1);
    const room = this.opts.width - 36;
    if (this.text.width > room) this.text.scale.set(room / this.text.width);
  }

  /** Zmiana koloru (np. aktywna zakładka). */
  setColor(color: string): void {
    if (color === this.opts.color) return;
    this.opts.color = color;
    this.draw();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.alpha = on ? 1 : 0.5;
  }

  /** Woła scena co klatkę. */
  tick(dt: number): void {
    const s = this.press.update(dt);
    this.face.scale.set(s);
    this.face.y = (1 - s) * 60;
  }

  private setDown(on: boolean): void {
    if (!this.enabled) return;
    this.down = on;
    this.press.target = on ? (this.opts.flat ? 0.97 : 0.92) : 1;
    if (!on && !this.opts.flat) this.press.kick(1.2);
  }

  private draw(): void {
    const { width: w, height: h, radius: r, color } = this.opts;
    if (this.opts.flat) {
      this.shadow.clear().roundRect(-w / 2, -h / 2 + 4, w, h, r).fill({ color: hexToNumber(darken(color, 0.18)) });
      this.plate.clear().roundRect(-w / 2, -h / 2, w, h, r).fill({ color: hexToNumber(color) });
      this.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= w / 2 + 8 && y >= -h / 2 - 8 && y <= h / 2 + 12 };
      return;
    }
    this.shadow.clear().roundRect(-w / 2, -h / 2 + 10, w, h, r).fill({ color: hexToNumber(darken(color, 0.22)) });
    this.plate
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, r)
      .fill({ color: hexToNumber(color) })
      .roundRect(-w / 2 + 10, -h / 2 + 8, w - 20, h * 0.36, r * 0.7)
      .fill({ color: hexToNumber(lighten(color, 0.08)), alpha: 0.6 });
    this.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= w / 2 + 8 && y >= -h / 2 - 8 && y <= h / 2 + 18 };
  }
}
