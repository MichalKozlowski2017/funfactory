import { Container, Sprite, type Texture } from 'pixi.js';
import { blobPoints, circle, darken, defs, ellipse, lighten, path, radialGradient, smoothClosedPath, svg } from '@funfactory/art';
import { Rng, Spring } from '@funfactory/core';
import { svgTextures } from '@funfactory/kit2d';

/**
 * Wzorzec postaci wektorowej z części: ciało, oczy (osobne sprite'y do mrugania i patrzenia),
 * cień. Każda część to SVG -> tekstura, animacja w kodzie.
 * To przykład techniki do lab, nie postać z gry.
 */
export class BlobCharacter extends Container {
  readonly body = new Container();
  private readonly shadow: Sprite;
  private readonly bodySprite: Sprite;
  private readonly eyes = new Container();
  private readonly lean = new Spring(0, 180, 12);
  private blinkIn = 2;
  private time = 0;
  private lookX = 0;

  private constructor(t: Record<'body' | 'eye' | 'shadow', Texture>) {
    super();
    this.shadow = new Sprite({ texture: t.shadow, anchor: 0.5 });
    this.shadow.y = 6;
    this.bodySprite = new Sprite({ texture: t.body, anchor: { x: 0.5, y: 1 } });
    for (const dx of [-30, 30]) {
      const eye = new Sprite({ texture: t.eye, anchor: 0.5 });
      eye.position.set(dx, -120);
      this.eyes.addChild(eye);
    }
    this.body.addChild(this.bodySprite, this.eyes);
    this.addChild(this.shadow, this.body);
  }

  static async create(color: string, ink: string, pixelRatio: number, seed = 3): Promise<BlobCharacter> {
    const rng = new Rng(seed);
    const outline = smoothClosedPath(blobPoints(110, 110, 92, 9, 0.08, () => rng.next()));
    const body = svg(220, 200, [
      defs([radialGradient('shade', [[0, lighten(color, 0.1)], [0.7, color], [1, darken(color, 0.12)]])]),
      path(outline, { fill: 'url(#shade)', stroke: ink, strokeWidth: 8, transform: 'translate(0,-12)' }),
      ellipse(78, 52, 26, 14, { fill: '#ffffff', opacity: 0.45, transform: 'rotate(-25 78 52)' }),
    ]);
    const eye = svg(40, 48, [
      ellipse(20, 24, 16, 20, { fill: '#ffffff', stroke: ink, strokeWidth: 5 }),
      circle(22, 27, 8, { fill: ink }),
      circle(25, 22, 3, { fill: '#ffffff' }),
    ]);
    const shadow = svg(200, 40, [ellipse(100, 20, 90, 16, { fill: '#000000', opacity: 0.25 })]);
    const textures = await svgTextures({ body, eye, shadow }, pixelRatio * 1.25);
    return new BlobCharacter(textures);
  }

  /** Wychylenie ciała przy ruchu (sprężyna). */
  push(velocityX: number): void {
    this.lean.kick(velocityX * 0.002);
    this.lookX = Math.max(-6, Math.min(6, velocityX * 0.01));
  }

  tick(dt: number): void {
    this.time += dt;
    this.body.rotation = this.lean.update(dt);
    this.lookX *= Math.exp(-3 * dt);
    this.eyes.x = this.lookX;
    // Mruganie: krótkie spłaszczenie oczu co kilka sekund.
    this.blinkIn -= dt;
    const closing = this.blinkIn < 0.12 && this.blinkIn > 0;
    for (const eye of this.eyes.children) eye.scale.y = closing ? 0.1 : 1;
    if (this.blinkIn <= 0) this.blinkIn = 2 + Math.random() * 2.5;
    // Cień kurczy się, gdy ciało jest rozciągnięte w górę.
    this.shadow.scale.x = 1 / Math.max(0.6, this.body.scale.y);
  }
}
