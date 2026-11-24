import { Container, Graphics, Point, Sprite, Text, type Texture } from 'pixi.js';
import { haptics, Spring, type Sound, type Tweens } from '@funfactory/core';

/** Typeface for headings and digits (Baloo 2 ExtraBold, OFL; full Polish character set). Loaded once in main.ts. */
export let FONT = 'system-ui, -apple-system, sans-serif';

export async function loadFont(): Promise<void> {
  try {
    const face = new FontFace('Baloo 2', `url(${import.meta.env.BASE_URL}fonts/baloo2.ttf)`, { weight: '400 800' });
    document.fonts.add(await face.load());
    FONT = '"Baloo 2", system-ui, sans-serif';
  } catch {
    /* system font */
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
    style: { fontFamily: FONT, fontSize: size, fontWeight: '800', fill, stroke: { color: stroke, width: size * 0.16, join: 'round' }, letterSpacing: 1 },
  });
}

/** Short synthesized sound effects (no files). */
export const sfx = {
  tap: (s: Sound) => s.synth([{ wave: 'sine', freq: 520, freqEnd: 760, duration: 0.09, volume: 0.25 }]),
  good: (s: Sound) =>
    s.synth([
      { wave: 'triangle', freq: 660, duration: 0.18, volume: 0.3 },
      { wave: 'triangle', freq: 880, duration: 0.2, volume: 0.28, delay: 0.08 },
      { wave: 'triangle', freq: 1320, duration: 0.32, volume: 0.22, delay: 0.16 },
    ]),
  bad: (s: Sound) => s.synth([{ wave: 'sine', freq: 300, freqEnd: 220, duration: 0.22, volume: 0.25 }]),
  /** Whoosh of a flying object. */
  whoosh: (s: Sound) => s.synth([{ wave: 'noise', freq: 900, freqEnd: 2600, duration: 0.32, volume: 0.07, filter: 'bandpass', filterFreq: 1400 }]),
  /** Plop: an object drops into the crate. */
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
 * Answer card: a rounded tile with a picture. Touch: a press spring and `onTap`.
 * Size in game units, minimum 88 (for small fingers the touch area should rather be 160+).
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

  /** Green outline after a correct answer. */
  markGood(): void {
    const s = this.size;
    this.plate.roundRect(-s / 2 - 6, -s / 2 - 6, s + 12, s + 12, s * 0.18).stroke({ color: COLORS.good, width: 10 });
  }

  tick(dt: number): void {
    this.face.scale.set(this.press.update(dt));
  }
}

/** Button icons (drawn with Graphics, no text: the child does not read). */
export type Icon = 'home' | 'next' | 'plus' | 'landscape' | 'gallery' | 'trash';

/** Round button with an icon drawn with Graphics. */
export class IconButton extends Container {
  private readonly press = new Spring(1, 600, 20);
  private readonly face = new Container();
  onTap: (() => void) | null = null;

  constructor(icon: Icon, radius = 52, color?: number) {
    super();
    const g = new Graphics()
      .circle(0, 6, radius)
      .fill({ color: 0x000000, alpha: 0.15 })
      .circle(0, 0, radius)
      .fill({ color: color ?? (icon === 'next' || icon === 'plus' ? COLORS.good : 0xff9f5a) })
      .stroke({ color: COLORS.ink, width: 6 });
    const r = radius * 0.5;
    if (icon === 'home') {
      g.poly([-r, 0, 0, -r * 0.95, r, 0]).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
      g.rect(-r * 0.7, -r * 0.05, r * 1.4, r * 0.95).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4 });
      g.rect(-r * 0.2, r * 0.35, r * 0.4, r * 0.55).fill({ color: COLORS.ink });
    } else if (icon === 'next') {
      g.poly([-r * 0.6, -r * 0.8, r * 0.8, 0, -r * 0.6, r * 0.8]).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
    } else if (icon === 'plus') {
      const t = r * 0.32;
      g.poly([-t, -r, t, -r, t, -t, r, -t, r, t, t, t, t, r, -t, r, -t, t, -r, t, -r, -t, -t, -t]).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
    } else if (icon === 'landscape') {
      // Picture with a hill and the sun.
      g.roundRect(-r, -r * 0.75, r * 2, r * 1.5, r * 0.25).fill({ color: 0x9fdcff }).stroke({ color: COLORS.ink, width: 4 });
      g.poly([-r, r * 0.75, -r * 0.3, -r * 0.1, r * 0.2, r * 0.45, r * 0.5, r * 0.15, r, r * 0.6, r, r * 0.75]).fill({ color: 0x7ad35a }).stroke({ color: COLORS.ink, width: 3, join: 'round' });
      g.circle(r * 0.45, -r * 0.35, r * 0.2).fill({ color: COLORS.sun });
    } else if (icon === 'gallery') {
      // Two pictures stacked on each other.
      for (const [dx, dy, c] of [
        [r * 0.25, -r * 0.25, 0xffd2e4],
        [-r * 0.15, r * 0.15, 0xfffaf2],
      ] as const)
        g.roundRect(dx - r * 0.7, dy - r * 0.55, r * 1.4, r * 1.1, r * 0.18).fill({ color: c }).stroke({ color: COLORS.ink, width: 4 });
      g.poly([-r * 0.75, r * 0.65, -r * 0.35, r * 0.1, -r * 0.05, r * 0.45, r * 0.15, r * 0.25, r * 0.5, r * 0.65]).fill({ color: 0x7ad35a });
      g.circle(r * 0.25, -r * 0.1, r * 0.13).fill({ color: COLORS.sun });
    } else {
      // Trash can.
      g.roundRect(-r * 0.6, -r * 0.45, r * 1.2, r * 1.25, r * 0.15).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4 });
      g.roundRect(-r * 0.8, -r * 0.75, r * 1.6, r * 0.28, r * 0.1).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 4 });
      g.roundRect(-r * 0.22, -r * 0.95, r * 0.44, r * 0.25, r * 0.08).stroke({ color: COLORS.ink, width: 4 });
      for (const x of [-0.28, 0, 0.28]) g.moveTo(x * r, -r * 0.25).lineTo(x * r, r * 0.6).stroke({ color: COLORS.ink, width: 4, cap: 'round' });
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

/** "Cover" background scaling: fills the screen, crops the excess at the sides. */
export function cover(sprite: Sprite, width: number, height: number): void {
  const t = sprite.texture;
  sprite.anchor.set(0.5);
  sprite.scale.set(Math.max(width / t.width, height / t.height));
  sprite.position.set(width / 2, height / 2);
}

/**
 * Finger dragging: the object follows the finger (keeping the grab point); on release `drop`
 * receives the position in the parent's coordinates. `canStart` blocks grabbing (e.g. during an animation).
 */
export function draggable(obj: Container, handlers: { canStart: () => boolean; start?: () => void; drop: (at: Point) => void; tap?: () => void; move?: () => void }): void {
  let grab: { dx: number; dy: number; id: number; x: number; y: number; moved: number } | null = null;
  obj.eventMode = 'static';
  obj.cursor = 'grab';
  obj.on('pointerdown', (e) => {
    if (grab || !obj.parent || !handlers.canStart()) return;
    const p = obj.parent.toLocal(e.global);
    grab = { dx: obj.x - p.x, dy: obj.y - p.y, id: e.pointerId, x: p.x, y: p.y, moved: 0 };
    obj.parent.addChild(obj); // bring to front
    haptics.tap();
    handlers.start?.();
  });
  obj.on('globalpointermove', (e) => {
    if (!grab || e.pointerId !== grab.id || !obj.parent) return;
    const p = obj.parent.toLocal(e.global);
    grab.moved = Math.max(grab.moved, Math.hypot(p.x - grab.x, p.y - grab.y));
    obj.position.set(p.x + grab.dx, p.y + grab.dy);
    handlers.move?.();
  });
  const end = (e: { pointerId: number }) => {
    if (!grab || e.pointerId !== grab.id) return;
    const tapped = grab.moved < 16;
    grab = null;
    handlers.drop(new Point(obj.x, obj.y));
    // A tap instead of a drag: the scene can show where to drag (children often just tap).
    if (tapped) handlers.tap?.();
  };
  obj.on('pointerup', end);
  obj.on('pointerupoutside', end);
}

/** A wordless "no": the object wobbles side to side (a wrong move is visible even without sound). */
export function wiggle(tweens: Tweens, obj: Container, angle = 0.14): void {
  // No killOf: the object may have other animations (position, scale); we only touch rotation.
  void tweens.to(obj, { rotation: angle }, { duration: 0.06, yoyo: true, repeat: 3 }).done.then(() => (obj.rotation = 0));
}
