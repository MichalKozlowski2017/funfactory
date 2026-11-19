import { type BitmapText, Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import type { Timers, Tweens } from '@funfactory/core';
import { popIn, pulse, setRestScale, type View } from '@funfactory/kit2d';
import { STREAK } from '../sim/run.ts';
import { hudText } from './hud-font.ts';
import { candies, tierName } from '../i18n.ts';

const FONT = 'system-ui, -apple-system, sans-serif';
const INK = '#1e1530';

/** Poziom serii: im dłuższa, tym bardziej wystrzałowe barwy. */
export interface Tier {
  level: number;
  name: string;
  color: number;
  css: string;
  colors: number[];
  rainbow: boolean;
}

export function streakTier(streak: number): Tier {
  if (streak >= 20) return { level: 3, name: 'Cukrowy szał', color: 0xffffff, css: '#ffffff', colors: [0xff6f8f, 0xffd166, 0x8ee3a1, 0x8fdcff, 0x9b8cff], rainbow: true };
  if (streak >= 15) return { level: 2, name: 'Szał', color: 0x8ee3a1, css: '#8ee3a1', colors: [0x8ee3a1, 0xffffff, 0x8fdcff], rainbow: false };
  if (streak >= 10) return { level: 1, name: 'Super rytm', color: 0xffd166, css: '#ffd166', colors: [0xffd166, 0xffffff, 0xff9ebb], rainbow: false };
  return { level: 0, name: 'Rytm', color: 0xff9ebb, css: '#ff9ebb', colors: [0xff9ebb, 0xffffff, 0xffd166], rainbow: false };
}

/** Kolor tęczy w czasie (do napisów od serii 20). */
export function rainbow(time: number): number {
  const h = (time * 0.6) % 1;
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return Math.round(255 * (1 - 0.45 * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return (f(5) << 16) | (f(3) << 8) | f(1);
}


function makeText(size: number, fill: string, pixelRatio: number, extra: Partial<TextStyleOptions> = {}): Text {
  const t = new Text({
    text: '',
    style: { fontFamily: FONT, fontSize: size, fontWeight: '900', fill, stroke: { color: INK, width: Math.max(4, size * 0.12), join: 'round' }, ...extra },
    resolution: pixelRatio,
    anchor: 0.5,
  });
  return t;
}

/** Licznik rytmu pod wysokością: „Rytm ×7” i kropki do następnej premii. */
export class StreakHud extends Container {
  private readonly caption: BitmapText;
  private readonly pips = new Graphics();
  private readonly tweens: Tweens;
  private streak = 0;
  private time = 0;

  constructor(tweens: Tweens, _pixelRatio: number) {
    super();
    this.tweens = tweens;
    // Bitmapowy: zmienia się przy każdym skoku, zwykły Text wgrywałby wtedy nową teksturę.
    this.caption = hudText(40, '#ffffff');
    this.caption.anchor.set(0.5);
    this.caption.y = 0;
    this.pips.y = 38;
    this.addChild(this.caption, this.pips);
    this.visible = false;
  }

  /** Nowa długość serii (pokazujemy od 2, żeby pojedynczy skok nie migał). */
  set(streak: number): void {
    this.streak = streak;
    this.tweens.killOf(this.caption);
    this.caption.alpha = 1;
    this.caption.rotation = 0;
    this.caption.y = 0;
    if (streak < 2) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const tier = streakTier(streak);
    this.caption.text = `${tierName(tier.level)} ×${streak}`;
    this.caption.tint = tier.color;
    this.drawPips(tier);
    void pulse(this.tweens, this, 0.22, 0.22);
  }

  /** Zerwanie: napis szarzeje i spada. */
  lose(streak: number): void {
    this.streak = 0;
    if (!this.visible || streak < 3) {
      this.visible = false;
      return;
    }
    this.caption.tint = 0x8a8098;
    this.pips.clear();
    this.tweens.to(this.caption, { y: 70, rotation: 0.35, alpha: 0 }, { duration: 0.7, ease: 'quadIn' }).done.then(() => {
      if (this.streak < 2) this.visible = false;
    });
  }

  tick(dt: number): void {
    this.time += dt;
    if (this.visible && this.streak >= 20) this.caption.tint = rainbow(this.time);
  }

  private drawPips(tier: Tier): void {
    const filled = this.streak % STREAK.every || STREAK.every;
    const g = this.pips.clear();
    for (let i = 0; i < STREAK.every; i++) {
      const x = (i - (STREAK.every - 1) / 2) * 26;
      g.circle(x, 0, 8).fill({ color: i < filled ? tier.color : 0x1e1530, alpha: i < filled ? 1 : 0.5 }).stroke({ color: 0x1e1530, width: 3 });
    }
  }
}

/**
 * Wielki baner kamienia milowego na środku ekranu: promienie, napis z odbiciem, premia, błysk.
 * Rysowany w warstwie ekranu (nie świata), sam się sprząta.
 */
export function milestoneBanner(
  layer: Container,
  o: { tweens: Tweens; timers: Timers; view: View; pixelRatio: number; streak: number; reward: number; time: () => number },
): void {
  const tier = streakTier(o.streak);
  const { view, tweens, timers } = o;

  const flash = new Graphics().rect(0, 0, view.width, view.height).fill({ color: tier.rainbow ? 0xffffff : tier.color });
  flash.alpha = tier.level >= 1 ? 0.45 : 0.3;
  layer.addChild(flash);
  tweens.to(flash, { alpha: 0 }, { duration: 0.35, ease: 'quadOut' });
  timers.after(0.4, () => {
    tweens.killOf(flash);
    flash.destroy();
  });

  const root = new Container();
  root.position.set(view.width / 2, Math.max(view.height * 0.3, view.safe.top + 300));
  layer.addChild(root);

  // Promienie światła za napisem (więcej i szerzej na wyższych poziomach).
  const rays = new Graphics();
  const count = 10 + tier.level * 4;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const w = 0.09 + tier.level * 0.015;
    rays
      .moveTo(0, 0)
      .lineTo(Math.cos(a - w) * 520, Math.sin(a - w) * 520)
      .lineTo(Math.cos(a + w) * 520, Math.sin(a + w) * 520)
      .closePath()
      .fill({ color: tier.rainbow ? [0xff6f8f, 0xffd166, 0x8ee3a1, 0x8fdcff, 0x9b8cff][i % 5] : tier.color, alpha: 0.3 });
  }
  rays.alpha = 0;
  rays.scale.set(0.3);
  tweens.to(rays, { alpha: 1 }, { duration: 0.2 });
  tweens.to(rays.scale, { x: 1, y: 1 }, { duration: 0.5, ease: 'backOut' });
  tweens.to(rays, { rotation: 1.3 }, { duration: 1.8, ease: 'linear' });

  const title = makeText(84, '#ffffff', o.pixelRatio, {
    stroke: { color: '#fff4f8', width: 12, join: 'round' },
    dropShadow: { color: '#120a1e', distance: 8, angle: Math.PI / 2, blur: 0, alpha: 1 },
    fill: tier.css === '#ffffff' ? '#ff9ebb' : tier.css,
  });
  title.text = `${tierName(tier.level)} ×${o.streak}!`;
  const fit = Math.min(1, (view.width - 60) / title.width);
  setRestScale(title, fit);
  title.scale.set(fit);

  const sub = makeText(46, '#ffd166', o.pixelRatio);
  sub.text = `+${o.reward} ${candies(o.reward)}`;
  sub.y = 86;

  root.addChild(rays, title, sub);
  root.rotation = -0.22;
  void popIn(tweens, root, 0.45);
  tweens.to(root, { rotation: 0 }, { duration: 0.8, ease: 'elasticOut' });
  sub.alpha = 0;
  tweens.to(sub, { alpha: 1 }, { duration: 0.2, delay: 0.25 });
  void popIn(tweens, sub, 0.35, 0.25);

  // Tęczowy napis od serii 20.
  if (tier.rainbow) {
    const spin = () => {
      if (title.destroyed) return;
      title.tint = rainbow(o.time());
      timers.after(0.03, spin);
    };
    spin();
  }

  timers.after(1.35, () => {
    tweens.to(root, { y: root.y - 140, alpha: 0 }, { duration: 0.45, ease: 'quadIn' });
  });
  timers.after(1.85, () => {
    for (const t of [root, root.scale, rays, rays.scale, title, title.scale, sub, sub.scale]) tweens.killOf(t);
    root.destroy({ children: true });
  });
}
