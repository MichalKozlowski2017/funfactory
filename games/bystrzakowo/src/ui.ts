import { Container, Graphics, Point, Sprite, Text, type Texture } from 'pixi.js';
import { haptics, Spring, type Sound } from '@funfactory/core';

/** Krój nagłówków i cyfr (Lilita One, OFL). Ładowany raz w main.ts. */
export let FONT = 'system-ui, -apple-system, sans-serif';

export async function loadFont(): Promise<void> {
  try {
    const face = new FontFace('Lilita One', `url(${import.meta.env.BASE_URL}fonts/lilita-one.ttf)`);
    document.fonts.add(await face.load());
    FONT = '"Lilita One", system-ui, sans-serif';
  } catch {
    /* krój systemowy */
  }
}

export const COLORS = {
  ink: 0x5a3c28,
  card: 0xfffaf2,
  good: 0x5cc36a,
  sun: 0xffc94a,
  sky: 0x8fd3ff,
  confetti: [0xff7a8a, 0xffc94a, 0x7ad7a0, 0x8fb8ff, 0xc89bff, 0xff9f5a],
};

export function label(text: string, size: number, resolution: number, fill = '#ffffff', stroke = '#5a3c28'): Text {
  return new Text({
    text,
    anchor: 0.5,
    resolution,
    style: { fontFamily: FONT, fontSize: size, fill, stroke: { color: stroke, width: size * 0.16, join: 'round' }, letterSpacing: 1 },
  });
}

/** Krótkie efekty dźwiękowe z syntezy (bez plików). */
export const sfx = {
  tap: (s: Sound) => s.synth([{ wave: 'sine', freq: 520, freqEnd: 760, duration: 0.09, volume: 0.25 }]),
  good: (s: Sound) =>
    s.synth([
      { wave: 'triangle', freq: 660, duration: 0.18, volume: 0.3 },
      { wave: 'triangle', freq: 880, duration: 0.2, volume: 0.28, delay: 0.08 },
      { wave: 'triangle', freq: 1320, duration: 0.32, volume: 0.22, delay: 0.16 },
    ]),
  bad: (s: Sound) => s.synth([{ wave: 'sine', freq: 300, freqEnd: 220, duration: 0.22, volume: 0.25 }]),
  /** Świst lecącego obiektu. */
  whoosh: (s: Sound) => s.synth([{ wave: 'noise', freq: 900, freqEnd: 2600, duration: 0.32, volume: 0.07, filter: 'bandpass', filterFreq: 1400 }]),
  /** Plum: obiekt wpada do skrzynki. */
  plop: (s: Sound) =>
    s.synth([
      { wave: 'sine', freq: 520, freqEnd: 150, duration: 0.16, volume: 0.35 },
      { wave: 'triangle', freq: 880, freqEnd: 1320, duration: 0.07, volume: 0.15, delay: 0.05 },
    ]),
  pop: (s: Sound, pitch = 1) => s.synth([{ wave: 'sine', freq: 420, freqEnd: 900, duration: 0.08, volume: 0.22 }], { pitch }),
  fanfare: (s: Sound) =>
    s.synth([
      { wave: 'triangle', freq: 523, duration: 0.2, volume: 0.28 },
      { wave: 'triangle', freq: 659, duration: 0.2, volume: 0.28, delay: 0.12 },
      { wave: 'triangle', freq: 784, duration: 0.2, volume: 0.28, delay: 0.24 },
      { wave: 'triangle', freq: 1047, duration: 0.6, volume: 0.3, delay: 0.36 },
      { wave: 'noise', freq: 4000, duration: 0.5, volume: 0.06, delay: 0.36, filter: 'highpass', filterFreq: 5000 },
    ]),
};

/**
 * Karta odpowiedzi: zaokrąglony kafelek z obrazkiem. Dotknięcie: sprężynka wciśnięcia i `onTap`.
 * Rozmiar w jednostkach gry, minimum 88 (pole dotyku dla małych palców raczej 160+).
 */
export class Card extends Container {
  enabled = true;
  readonly face = new Container();
  readonly plate = new Graphics();
  readonly picture: Sprite;
  private readonly press = new Spring(1, 600, 20);
  size: number;
  onTap: (() => void) | null = null;

  constructor(texture: Texture, size: number, opts: { plate?: boolean } = {}) {
    super();
    this.size = size;
    this.picture = new Sprite({ texture, anchor: 0.5 });
    this.addChild(this.face);
    this.face.addChild(this.plate, this.picture);
    this.plate.visible = opts.plate ?? true;
    this.layoutCard(size);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.press.target = 0.9;
      haptics.tap();
    });
    const release = () => (this.press.target = 1);
    this.on('pointerup', () => {
      const was = this.press.target < 1;
      release();
      if (was && this.enabled) this.onTap?.();
    });
    this.on('pointerupoutside', release);
  }

  layoutCard(size: number): void {
    this.size = size;
    this.plate
      .clear()
      .roundRect(-size / 2, -size / 2 + 8, size, size, size * 0.16)
      .fill({ color: 0x000000, alpha: 0.12 })
      .roundRect(-size / 2, -size / 2, size, size, size * 0.16)
      .fill({ color: COLORS.card })
      .stroke({ color: COLORS.ink, width: Math.max(4, size * 0.025) });
    const t = this.picture.texture;
    const room = size * (this.plate.visible ? 0.8 : 1);
    this.picture.scale.set(Math.min(room / t.width, room / t.height));
    this.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= size / 2 && Math.abs(y) <= size / 2 };
  }

  /** Zielona obwódka po dobrej odpowiedzi. */
  markGood(): void {
    const s = this.size;
    this.plate.roundRect(-s / 2 - 6, -s / 2 - 6, s + 12, s + 12, s * 0.18).stroke({ color: COLORS.good, width: 10 });
  }

  tick(dt: number): void {
    this.face.scale.set(this.press.update(dt));
  }
}

/** Okrągły przycisk z ikoną rysowaną w Graphics (dom, strzałka). */
export class IconButton extends Container {
  private readonly press = new Spring(1, 600, 20);
  private readonly face = new Container();
  onTap: (() => void) | null = null;

  constructor(icon: 'home' | 'next', radius = 52) {
    super();
    const g = new Graphics()
      .circle(0, 6, radius)
      .fill({ color: 0x000000, alpha: 0.15 })
      .circle(0, 0, radius)
      .fill({ color: icon === 'next' ? COLORS.good : 0xff9f5a })
      .stroke({ color: COLORS.ink, width: 6 });
    const r = radius * 0.5;
    if (icon === 'home') {
      g.poly([-r, 0, 0, -r * 0.95, r, 0]).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
      g.rect(-r * 0.7, -r * 0.05, r * 1.4, r * 0.95).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4 });
      g.rect(-r * 0.2, r * 0.35, r * 0.4, r * 0.55).fill({ color: COLORS.ink });
    } else {
      g.poly([-r * 0.6, -r * 0.8, r * 0.8, 0, -r * 0.6, r * 0.8]).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
    }
    this.face.addChild(g);
    this.addChild(this.face);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x: number, y: number) => x * x + y * y <= (radius + 14) ** 2 };
    this.on('pointerdown', () => {
      this.press.target = 0.88;
      haptics.tap();
    });
    this.on('pointerup', () => {
      const was = this.press.target < 1;
      this.press.target = 1;
      if (was) this.onTap?.();
    });
    this.on('pointerupoutside', () => (this.press.target = 1));
  }

  tick(dt: number): void {
    this.face.scale.set(this.press.update(dt));
  }
}

/** Skalowanie tła „cover”: wypełnia ekran, nadmiar przycina po bokach. */
export function cover(sprite: Sprite, width: number, height: number): void {
  const t = sprite.texture;
  sprite.anchor.set(0.5);
  sprite.scale.set(Math.max(width / t.width, height / t.height));
  sprite.position.set(width / 2, height / 2);
}

/**
 * Przeciąganie palcem: obiekt idzie za palcem (z zachowanym punktem chwytu), po puszczeniu `drop`
 * dostaje pozycję w układzie rodzica. `canStart` blokuje chwytanie (np. w trakcie animacji).
 */
export function draggable(obj: Container, handlers: { canStart: () => boolean; start?: () => void; drop: (at: Point) => void }): void {
  let grab: { dx: number; dy: number; id: number } | null = null;
  obj.eventMode = 'static';
  obj.cursor = 'grab';
  obj.on('pointerdown', (e) => {
    if (grab || !obj.parent || !handlers.canStart()) return;
    const p = obj.parent.toLocal(e.global);
    grab = { dx: obj.x - p.x, dy: obj.y - p.y, id: e.pointerId };
    obj.parent.addChild(obj); // na wierzch
    haptics.tap();
    handlers.start?.();
  });
  obj.on('globalpointermove', (e) => {
    if (!grab || e.pointerId !== grab.id || !obj.parent) return;
    const p = obj.parent.toLocal(e.global);
    obj.position.set(p.x + grab.dx, p.y + grab.dy);
  });
  const end = (e: { pointerId: number }) => {
    if (!grab || e.pointerId !== grab.id) return;
    grab = null;
    handlers.drop(new Point(obj.x, obj.y));
  };
  obj.on('pointerup', end);
  obj.on('pointerupoutside', end);
}
