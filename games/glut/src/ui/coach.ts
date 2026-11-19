import { Container, Graphics } from 'pixi.js';
import type { Tweens } from '@funfactory/core';
import { popIn, setRestScale } from '@funfactory/kit2d';
import { hudText } from '../fx/hud-font.ts';

/** Gest do pokazania palcem: przeciągnięcie od `from` do `to` (jednostki ekranu). */
export interface Gesture {
  kind: 'drag';
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Samouczek: napis i animowany palec, który w pętli pokazuje gest (dotyk, ruch ze śladem, puszczenie).
 * Rysowany w warstwie HUD; scena decyduje, kiedy i co pokazać.
 */
export class Coach extends Container {
  private readonly caption = hudText(36, '#ffffff');
  private readonly finger = new Graphics();
  private readonly trail = new Graphics();
  private readonly tweens: Tweens;
  private gesture: Gesture | null = null;
  private time = 0;
  /** Id pokazywanej wskazówki (null = nic). */
  current: string | null = null;

  constructor(tweens: Tweens) {
    super();
    this.tweens = tweens;
    this.caption.anchor.set(0.5);
    this.finger.circle(0, 0, 34).fill({ color: 0xffffff, alpha: 0.35 }).circle(0, 0, 34).stroke({ color: 0xffffff, width: 5, alpha: 0.9 });
    this.finger.circle(0, 0, 10).fill({ color: 0xffffff, alpha: 0.9 });
    this.addChild(this.trail, this.finger, this.caption);
    this.visible = false;
  }

  show(id: string, text: string, at: { x: number; y: number }, gesture: Gesture | null = null): void {
    if (this.current === id) return;
    this.current = id;
    this.caption.text = text;
    setRestScale(this.caption, 1);
    // Dłuższe zdania (inny język): zmniejsz, żeby zmieściły się na ekranie.
    if (this.caption.width > 640) setRestScale(this.caption, 640 / this.caption.width);
    this.caption.position.set(at.x, at.y);
    this.gesture = gesture;
    this.time = 0;
    this.visible = true;
    this.finger.visible = !!gesture;
    void popIn(this.tweens, this.caption, 0.3);
  }

  /** Gest może się przesuwać razem ze slime'em. */
  moveGesture(gesture: Gesture): void {
    this.gesture = gesture;
  }

  hide(id?: string): void {
    if (id && this.current !== id) return;
    this.current = null;
    this.visible = false;
    this.trail.clear();
  }

  tick(dt: number): void {
    if (!this.visible) return;
    this.time += dt;
    this.caption.alpha = 0.75 + 0.25 * Math.abs(Math.sin(this.time * 2.4));
    const g = this.gesture;
    this.trail.clear();
    if (!g) return;
    // Cykl 1,8 s: pojawienie i dotyk (0–0,3), ruch (0,3–0,9), puszczenie i zanik (0,9–1,3), przerwa.
    const c = this.time % 1.8;
    const ease = (x: number) => x * x * (3 - 2 * x);
    const m = c < 0.3 ? 0 : c < 0.9 ? ease((c - 0.3) / 0.6) : 1;
    const x = g.from.x + (g.to.x - g.from.x) * m;
    const y = g.from.y + (g.to.y - g.from.y) * m;
    this.finger.position.set(x, y);
    this.finger.alpha = c < 0.2 ? c / 0.2 : c < 1.0 ? 1 : Math.max(0, 1 - (c - 1.0) / 0.3);
    this.finger.scale.set(c > 0.2 && c < 0.95 ? 0.85 : 1);
    if (c > 0.3 && c < 1.3) {
      const fade = c < 0.9 ? 1 : Math.max(0, 1 - (c - 0.9) / 0.4);
      this.trail.moveTo(g.from.x, g.from.y).lineTo(x, y).stroke({ color: 0xffffff, width: 14, alpha: 0.35 * fade, cap: 'round' });
    }
  }
}
