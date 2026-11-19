import { Container, Graphics, Rectangle } from 'pixi.js';
import type { Tweens } from '@funfactory/core';

export interface IrisRun {
  tweens: Tweens;
  width: number;
  height: number;
  /** Środek zamykania (np. przycisk, w który stuknięto). */
  from: { x: number; y: number };
  /** Podmiana sceny w chwili, gdy ekran jest zakryty. */
  swap: () => void;
  /** Środek otwierania (np. slime w nowym biegu); liczony po podmianie. */
  to: () => { x: number; y: number };
  /** Początek otwierania (efekt „wyskoczenia” slime'a). */
  onOpen?: () => void;
}

/**
 * Przejście „przesłona”: ciemne koło z cukierkowym obrzeżem zamyka się do punktu, scena się
 * podmienia, koło otwiera się wokół nowego punktu. W trakcie blokuje dotyk.
 */
export class Iris extends Container {
  private readonly g = new Graphics();
  private readonly ring = new Graphics();
  /** Promień otworu (animowany tweenem). */
  private readonly hole = { r: 0 };
  private cx = 0;
  private cy = 0;
  private w = 720;
  private h = 1280;
  busy = false;

  constructor() {
    super();
    this.addChild(this.g, this.ring);
    this.visible = false;
    this.eventMode = 'static';
  }

  run(o: IrisRun): void {
    if (this.busy) return;
    this.busy = true;
    this.visible = true;
    this.w = o.width;
    this.h = o.height;
    this.hitArea = new Rectangle(0, 0, o.width, o.height);
    this.cx = o.from.x;
    this.cy = o.from.y;
    const full = this.radiusFor(this.cx, this.cy);
    this.hole.r = full;
    o.tweens.to(this.hole, { r: 0 }, { duration: 0.36, ease: 'quadIn' }).done.then(() => {
      o.swap();
      const p = o.to();
      this.cx = p.x;
      this.cy = p.y;
      this.hole.r = 0;
      o.onOpen?.();
      o.tweens.to(this.hole, { r: this.radiusFor(p.x, p.y) }, { duration: 0.5, delay: 0.08, ease: 'quadOut' }).done.then(() => {
        this.busy = false;
        this.visible = false;
      });
    });
  }

  /** Promień zakrywający cały ekran z danego środka. */
  private radiusFor(x: number, y: number): number {
    return Math.hypot(Math.max(x, this.w - x), Math.max(y, this.h - y)) + 40;
  }

  tick(): void {
    if (!this.visible) return;
    const r = Math.max(0, this.hole.r);
    // Ciemność jako bardzo gruba obręcz wokół otworu (wycinanie dziury w prostokącie psuje się,
    // gdy koło wychodzi poza ekran).
    const band = Math.hypot(this.w, this.h) * 2;
    this.g.clear();
    if (r < 0.5) this.g.rect(0, 0, this.w, this.h).fill({ color: 0x1a1028 });
    else this.g.circle(this.cx, this.cy, r + band / 2).stroke({ color: 0x1a1028, width: band });
    this.ring.clear();
    if (r > 2) {
      this.ring.circle(this.cx, this.cy, r + 6).stroke({ color: 0xff9ebb, width: 14 });
      this.ring.circle(this.cx, this.cy, r + 16).stroke({ color: 0xffd166, width: 6, alpha: 0.9 });
    }
  }
}
