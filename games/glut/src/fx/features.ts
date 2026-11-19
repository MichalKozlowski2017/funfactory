import { Container, Graphics, NineSliceSprite, type Texture } from 'pixi.js';
import { Rng, Spring } from '@funfactory/core';
import { FEATURE, type Block } from '../sim/physics.ts';
import { SURFACE } from './surfaces.ts';

/**
 * Wygląd półek z mechaniką. Kolory są stałe we wszystkich światach (jak lód i kolce),
 * żeby mechanikę było widać od razu także w mrocznych światach.
 */
export const FEATURE_COLORS = {
  choco: 0x6b3b22,
  chocoLight: 0x8c5434,
  chocoShine: 0xb57a52,
  jelly: 0x7fe08f,
  jellyDeep: 0x3fae5a,
  cloud: 0xffffff,
  cloudShade: 0xd9ccff,
  belt: 0x4b4560,
  beltRoller: 0x9a93b0,
  beltArrow: 0xffd166,
} as const;

const ink = SURFACE.ink;

/**
 * Półka z grafiki (Flux) rozciągnięta na szerokość bloku: końcówki zostają w proporcjach,
 * środek się rozciąga. Układ lokalny: (0,0) = lewy górny róg bloku; lukier wystaje lekko w górę.
 */
export function ledgeSprite(tex: Texture, w: number, h: number): NineSliceSprite {
  const H = h + 16;
  const sc = H / tex.height;
  const cap = Math.min(tex.height * 0.75, (tex.width - 2) / 2);
  const ns = new NineSliceSprite({ texture: tex, leftWidth: cap, rightWidth: cap, topHeight: 0, bottomHeight: 0 });
  ns.width = Math.max(cap * 2 + 2, (w + 10) / sc);
  ns.height = tex.height;
  ns.scale.set(sc);
  ns.position.set(-5, -6);
  return ns;
}

/** Jedna półka z mechaniką: rysuje się w swoim układzie (0,0 = lewy górny róg bloku). */
export class FeatureView extends Container {
  readonly block: Block;
  private readonly g = new Graphics();
  private readonly arrows = new Graphics();
  private readonly wobble = new Spring(0, 320, 7);
  private stage = -1;
  private broken = false;
  /** Grafika półki z Fluxa (null = rysowana w kodzie). */
  private readonly tex: Texture | null;

  constructor(block: Block, tex: Texture | null = null) {
    super();
    this.block = block;
    this.tex = tex;
    this.position.set(block.x, block.y);
    if (tex) this.addChild(ledgeSprite(tex, block.w, block.h));
    this.addChild(this.g, this.arrows);
    this.draw();
  }

  /** Odbicie od galaretki: sprężyste ugięcie. */
  boing(strength: number): void {
    this.wobble.kick(4 + strength * 6);
  }

  /** Czekolada pękła: widok znika (cząsteczki robi scena). */
  shatter(): void {
    this.broken = true;
  }

  tick(dt: number, time: number): void {
    const b = this.block;
    if (b.feature === 'bounce') {
      const w = this.wobble.update(dt);
      // Ugięcie od góry: spłaszcza się i rozszerza, podstawa zostaje.
      this.pivot.set(b.w / 2, b.h);
      this.position.set(b.x + b.w / 2, b.y + b.h);
      this.scale.set(1 + w * 0.15, 1 - w * 0.35);
    } else if (b.feature === 'crumble') {
      if (this.broken || b.gone) {
        this.alpha = Math.max(0, this.alpha - dt * 6);
        this.visible = this.alpha > 0;
        return;
      }
      const t = Math.min(1, (b.crack ?? 0) / FEATURE.crumble);
      const stage = t <= 0 ? 0 : t < 0.35 ? 1 : t < 0.7 ? 2 : 3;
      if (stage !== this.stage) this.draw(stage);
      // Drży coraz mocniej, zanim się rozpadnie.
      this.position.set(b.x + (t > 0 ? Math.sin(time * 70) * t * 3 : 0), b.y);
    } else if (b.feature === 'belt') {
      this.drawArrows(time);
    }
  }

  private draw(stage = 0): void {
    const b = this.block;
    const g = this.g.clear();
    const w = b.w;
    const h = b.h;
    if (this.tex) {
      // Z grafiką: kod dorysowuje tylko pęknięcia czekolady (rosną z czasem stania).
      this.stage = stage;
      if (b.feature === 'crumble') {
        const rng = new Rng((Math.round(b.x * 3 + b.y) >>> 0) || 1);
        for (let k = 0; k < stage * 2; k++) {
          let x = rng.range(10, w - 10);
          let y = 0;
          g.moveTo(x, y);
          while (y < h) {
            x += rng.range(-9, 9);
            y += rng.range(6, 12);
            g.lineTo(x, Math.min(h, y));
          }
          g.stroke({ color: 0xfff1d6, width: 3, alpha: 0.95 }).stroke({ color: ink, width: 1.5, alpha: 0.9 });
        }
      }
      return;
    }
    switch (b.feature) {
      case 'crumble': {
        this.stage = stage;
        // Tabliczka czekolady z kostkami.
        g.roundRect(0, 0, w, h, 8).fill({ color: FEATURE_COLORS.choco }).stroke({ color: ink, width: 3 });
        const cols = Math.max(3, Math.round(w / 46));
        const cw = (w - 8) / cols;
        for (let i = 0; i < cols; i++) {
          g.roundRect(4 + i * cw + 2, 4, cw - 4, h - 10, 5).fill({ color: FEATURE_COLORS.chocoLight });
          g.roundRect(4 + i * cw + 5, 6, cw - 12, 4, 2).fill({ color: FEATURE_COLORS.chocoShine, alpha: 0.8 });
        }
        // Pęknięcia: im dłużej stoisz, tym więcej.
        const rng = new Rng((Math.round(b.x * 3 + b.y) >>> 0) || 1);
        for (let k = 0; k < stage * 2; k++) {
          let x = rng.range(10, w - 10);
          let y = 0;
          g.moveTo(x, y);
          while (y < h) {
            x += rng.range(-9, 9);
            y += rng.range(6, 12);
            g.lineTo(x, Math.min(h, y));
          }
          g.stroke({ color: ink, width: 2.5, alpha: 0.9 });
        }
        break;
      }
      case 'bounce': {
        // Galaretka: przezroczysta, z połyskiem i bąbelkami.
        g.roundRect(0, 0, w, h, 16).fill({ color: FEATURE_COLORS.jelly, alpha: 0.9 }).stroke({ color: ink, width: 3 });
        g.roundRect(4, h * 0.55, w - 8, h * 0.4, 10).fill({ color: FEATURE_COLORS.jellyDeep, alpha: 0.6 });
        g.roundRect(10, 5, w * 0.45, 6, 3).fill({ color: 0xffffff, alpha: 0.75 });
        const rng = new Rng((Math.round(b.x * 5 + b.y) >>> 0) || 1);
        for (let x = rng.range(20, 40); x < w - 16; x += rng.range(40, 70)) {
          g.circle(x, rng.range(14, h - 10), rng.range(2.5, 4.5)).fill({ color: 0xffffff, alpha: 0.5 });
        }
        break;
      }
      case 'cloud': {
        // Chmura: gęste, nachodzące na siebie kłęby na płaskiej podstawie, bez twardego obrysu.
        const rng = new Rng((Math.round(b.x * 11 + b.y) >>> 0) || 1);
        g.roundRect(0, h * 0.25, w, h * 0.75, h * 0.37).fill({ color: FEATURE_COLORS.cloudShade, alpha: 0.95 });
        const n = Math.max(4, Math.round(w / 26));
        for (let i = 0; i < n; i++) {
          const x = 10 + ((w - 20) * (i + rng.range(0.2, 0.8))) / n;
          g.circle(x, h * 0.42, h * rng.range(0.42, 0.62)).fill({ color: FEATURE_COLORS.cloud, alpha: 0.97 });
        }
        g.roundRect(4, h * 0.3, w - 8, h * 0.4, h * 0.2).fill({ color: FEATURE_COLORS.cloud, alpha: 0.97 });
        break;
      }
      case 'belt': {
        // Taśmociąg: taśma na dwóch rolkach.
        g.roundRect(0, 0, w, h, h / 2).fill({ color: FEATURE_COLORS.belt }).stroke({ color: ink, width: 3 });
        for (const x of [h / 2, w - h / 2]) {
          g.circle(x, h / 2, h * 0.32).fill({ color: FEATURE_COLORS.beltRoller }).stroke({ color: ink, width: 2 });
          g.circle(x, h / 2, h * 0.08).fill({ color: ink });
        }
        g.rect(h / 2, 3, w - h, 3).fill({ color: 0xffffff, alpha: 0.25 });
        break;
      }
      default:
        break;
    }
  }

  /** Strzałki na taśmie jadą w jej kierunku. */
  private drawArrows(time: number): void {
    const b = this.block;
    const dir = Math.sign(b.belt ?? 1) || 1;
    const g = this.arrows.clear();
    const gap = 44;
    const start = b.h * 0.9;
    const end = b.w - b.h * 0.9;
    const offset = (((time * (b.belt ?? 0)) % gap) + gap) % gap;
    for (let x = start + offset - gap; x < end; x += gap) {
      if (x < start) continue;
      const a = Math.min(1, (x - start) / 14, (end - x) / 14);
      if (a <= 0) continue;
      const cy = b.h / 2;
      g.poly([x - 7 * dir, cy - 9, x + 3 * dir, cy, x - 7 * dir, cy + 9, x - 1 * dir, cy + 9, x + 9 * dir, cy, x - 1 * dir, cy - 9]).fill({
        color: FEATURE_COLORS.beltArrow,
        alpha: 0.9 * a,
      });
    }
  }
}
