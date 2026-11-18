import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { darken, defs, ellipse, lighten, path, radialGradient, svg, el } from '@funfactory/art';
import { isBlankTexture, svgTextures } from '@funfactory/kit2d';
import { hexToNumber } from '@funfactory/art';

/**
 * Slime Gluta z części SVG: ciało (kopuła z płaską podstawą), oczy, rumieńce, usta.
 * Ciało obraca się i odkształca razem z fizyką, twarz zostaje pionowo (konwencja kreskówkowa).
 */

const BODY_W = 100;
const BODY_H = 92;
/** Gdzie w teksturze ciała jest podstawa (styk z powierzchnią). */
const BASE_Y = 86;
const EYE_X = 14;
const EYE_SCALE = 0.82;

export interface SlimeTextures {
  body: Texture;
  /** Kolory do zapasowego ciała (gdy SVG się nie narysuje). */
  color: string;
  ink: string;
  eye: Texture;
  cheek: Texture;
  mouth: Texture;
}

export async function slimeTextures(color: string, ink: string, pixelRatio: number): Promise<SlimeTextures> {
  const deep = darken(color, 0.12);
  const body = svg(BODY_W, BODY_H, [
    defs([
      radialGradient('g', [
        [0, lighten(color, 0.12)],
        [0.55, color],
        [1, deep],
      ]),
    ]),
    // Kopuła: szeroka, lekko spłaszczona podstawa.
    path('M6,84 C2,40 22,6 50,6 C78,6 98,40 94,84 Q50,92 6,84 Z', {
      fill: 'url(#g)',
      stroke: ink,
      strokeWidth: 5,
      strokeLinejoin: 'round',
    }),
    // Cień przy podstawie.
    path('M12,78 Q50,88 88,78 Q86,84 50,86 Q14,84 12,78 Z', { fill: deep, opacity: 0.6 }),
    // Połysk.
    ellipse(34, 24, 13, 7, { fill: '#ffffff', opacity: 0.55, transform: 'rotate(-28 34 24)' }),
    ellipse(68, 18, 4, 3, { fill: '#ffffff', opacity: 0.5 }),
  ]);
  const eye = svg(26, 30, [
    defs([radialGradient('iris', [[0, '#d23c7a'], [0.6, '#7a1745'], [1, '#3a0a24']])]),
    ellipse(13, 15, 11, 13, { fill: 'url(#iris)', stroke: ink, strokeWidth: 3 }),
    ellipse(9, 10, 4.2, 4.6, { fill: '#ffffff' }),
    ellipse(16.5, 20, 2, 2.2, { fill: '#ffffff', opacity: 0.9 }),
  ]);
  const cheek = svg(20, 12, [ellipse(10, 6, 9, 5, { fill: '#ff6fa0', opacity: 0.55 })]);
  const mouth = svg(16, 9, [el('path', { d: 'M2,2 Q8,8 14,2', fill: 'none', stroke: ink, strokeWidth: 2.6, strokeLinecap: 'round' })]);
  const textures = await svgTextures({ body, eye, cheek, mouth }, pixelRatio * 1.5);
  return { ...textures, color, ink };
}

/** Wymiary ciała w jednostkach gry dla danego promienia fizycznego. */
export function bodyScale(radius: number): number {
  // Szerokość kopuły ≈ 2.3 promienia: lekko szersza niż koło kolizji, wygląda „miękko”.
  return (radius * 2.3) / BODY_W;
}

export class SlimeFace extends Container {
  private readonly eyes: Sprite[] = [];
  private blinkIn = 2;
  private lookX = 0;
  private lookY = 0;

  constructor(t: SlimeTextures, scale: number) {
    super();
    for (const dx of [-21, 21]) {
      const cheek = new Sprite({ texture: t.cheek, anchor: 0.5 });
      cheek.position.set(dx, 9);
      this.addChild(cheek);
    }
    for (const dx of [-EYE_X, EYE_X]) {
      const eye = new Sprite({ texture: t.eye, anchor: 0.5 });
      eye.scale.set(EYE_SCALE);
      eye.position.set(dx, -3);
      this.eyes.push(eye);
      this.addChild(eye);
    }
    const mouth = new Sprite({ texture: t.mouth, anchor: 0.5 });
    mouth.position.set(0, 10);
    this.addChild(mouth);
    this.scale.set(scale * (BODY_W / 78));
  }

  /** Kierunek spojrzenia (-1..1) i mruganie. */
  tick(dt: number, lookX: number, lookY: number, rand: () => number): void {
    const k = Math.min(1, dt * 12);
    this.lookX += (lookX - this.lookX) * k;
    this.lookY += (lookY - this.lookY) * k;
    this.blinkIn -= dt;
    const closing = this.blinkIn < 0.1 && this.blinkIn > 0;
    if (this.blinkIn <= 0) this.blinkIn = 1.8 + rand() * 2.8;
    this.eyes.forEach((eye, i) => {
      eye.x = (i === 0 ? -EYE_X : EYE_X) + this.lookX * 3;
      eye.y = -3 + this.lookY * 3;
      eye.scale.y = EYE_SCALE * (closing ? 0.12 : 1);
    });
  }

  /** Zaskoczenie / strach: oczy większe (np. gdy syrop blisko). */
  set fright(v: number) {
    for (const eye of this.eyes) eye.scale.x = EYE_SCALE * (1 + v * 0.2);
  }
}

/** Ciało slime'a. Gdy tekstura SVG wyszła pusta (niektóre telefony), rysuje je bezpośrednio Pixi. */
export function bodySprite(t: SlimeTextures, scale: number): Container {
  if (!isBlankTexture(t.body)) {
    const sprite = new Sprite({ texture: t.body, anchor: { x: 0.5, y: BASE_Y / BODY_H } });
    sprite.scale.set(scale);
    return sprite;
  }
  const g = new Graphics()
    .moveTo(6, 84)
    .bezierCurveTo(2, 40, 22, 6, 50, 6)
    .bezierCurveTo(78, 6, 98, 40, 94, 84)
    .quadraticCurveTo(50, 92, 6, 84)
    .closePath()
    .fill({ color: hexToNumber(t.color) })
    .stroke({ color: hexToNumber(t.ink), width: 5, join: 'round' })
    .ellipse(34, 24, 13, 7)
    .fill({ color: 0xffffff, alpha: 0.5 });
  g.pivot.set(BODY_W / 2, BASE_Y);
  g.scale.set(scale);
  return g;
}
