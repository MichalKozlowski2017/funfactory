import { Assets, Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { pixelsToTexture, popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { buildRegions, detailShade, pickRegion, type PageRegions } from '../sim/fill.ts';
import { today } from '../log.ts';
import { addPainting, pixelsToJpeg } from '../picture.ts';
import { state } from '../state.ts';
import { COLORS, IconButton, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

export { PAGES } from '../sim/coloring.ts';
import { PAGES } from '../sim/coloring.ts';
/** Working size of the picture (pixels). */
const SIZE = 640;
/** Paints: saturated but soft (like plasticine). */
const PAINTS = [0xe8413c, 0xff8a2b, 0xffd23f, 0x7ad35a, 0x2f9e5b, 0x5cb3ff, 0x3d6bff, 0x9b5de5, 0xff8fc0, 0x9a6236, 0xffffff, 0x4a4a4a];
const URL_BASE = import.meta.env.BASE_URL;
/** Fingertip radius (game units): every pixel under it votes for the area the child means (sim/fill.ts pickRegion). */
const FINGER = 30;
/** Moving the finger farther than this (game units) starts "smearing": further areas under the finger get painted. */
const SMEAR_START = 28;

/**
 * Coloring (Little Studio): picking a paint from the palette and touching an area of the picture fills the whole region
 * between the outlines. No wrong answers; the green arrow finishes the picture (sticker).
 * Small details (too small for a finger: the inside of an ear, spots, buttons) are "magic": they colour themselves with a
 * lighter shade when the part they lie on is painted (sparkles). A precise touch can still paint a detail on its own.
 */
export class ColoringScene extends RoundScene {
  readonly id = 'coloring';
  private page = '';
  private pixels!: ImageData;
  private labels!: Int32Array;
  private sizes: number[] = [];
  private regions!: PageRegions;
  /** Colour of each painted region; details painted by the child keep their own colour. */
  private readonly colorOf = new Map<number, number>();
  private readonly manual = new Set<number>();
  private downAt: { x: number; y: number } | null = null;
  private dark!: Uint8Array;
  private picture!: Sprite;
  private readonly palette = new Container();
  private paint = PAINTS[0]!;
  private done!: IconButton;
  private fills = 0;
  private smearing = false;
  private lastRegion = -1;
  private version = 0;
  private box = { x: 0, y: 0, s: 400 };

  constructor() {
    super('coloring', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.length = 1;
    const seen = state.progress.colored ?? [];
    // Pages not colored yet come first; a page that fails to load is skipped.
    const order = [...this.game.rng.shuffle(PAGES.filter((p) => !seen.includes(p))), ...this.game.rng.shuffle(PAGES.filter((p) => seen.includes(p)))];
    // Playtest: ?page=<id> forces a page.
    const forced = new URLSearchParams(location.search).get('page');
    if (forced && PAGES.includes(forced)) order.unshift(forced);
    let tex: Texture | null = null;
    for (const page of order) {
      tex = await Assets.load<Texture>(`${URL_BASE}art/coloring-pages/${page}.png`).catch(() => null);
      if (tex) {
        this.page = page;
        break;
      }
    }
    if (!tex) throw new Error('No coloring pages');
    const src = tex.source.resource as CanvasImageSource;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(src, 0, 0, SIZE, SIZE);
    // Crop to the outlines: the drawing fills the whole frame (bigger areas under the finger).
    const box = inkBox(ctx.getImageData(0, 0, SIZE, SIZE));
    if (box) {
      const side = Math.min(SIZE, Math.max(box.w, box.h) * 1.06);
      const sx = Math.max(0, Math.min(SIZE - side, box.x + box.w / 2 - side / 2));
      const sy = Math.max(0, Math.min(SIZE - side, box.y + box.h / 2 - side / 2));
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(src, (sx / SIZE) * (src as HTMLImageElement).width, (sy / SIZE) * (src as HTMLImageElement).height, (side / SIZE) * (src as HTMLImageElement).width, (side / SIZE) * (src as HTMLImageElement).height, 0, 0, SIZE, SIZE);
    }
    this.pixels = ctx.getImageData(0, 0, SIZE, SIZE);
    const d = this.pixels.data;
    this.dark = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < SIZE * SIZE; i++) {
      const lum = 0.3 * d[i * 4]! + 0.59 * d[i * 4 + 1]! + 0.11 * d[i * 4 + 2]!;
      this.dark[i] = lum < 150 ? 1 : 0;
      // Clean starting image: black lines, everything else white (no gray shades from antialiasing).
      const v = this.dark[i] ? 40 : 255;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }
    this.regions = buildRegions(SIZE, SIZE, (i) => this.dark[i] === 1);
    this.labels = this.regions.labels;
    this.sizes = this.regions.sizes;
    this.colorOf.clear();
    this.manual.clear();
  }

  protected promptLine(): string {
    return 'coloring';
  }

  protected show(): void {
    this.fills = 0;
    this.picture = new Sprite({ anchor: 0.5 });
    void pixelsToTexture(this.pixels).then((t) => (this.picture.texture = t));
    this.picture.eventMode = 'static';
    this.picture.cursor = 'pointer';
    // A tap fills an area; moving the finger ("smearing", as toddlers do) fills further areas under the finger.
    // A small wobble of the finger during a tap must not paint the neighbouring part: smearing starts after a clear move.
    this.picture.on('pointerdown', (e) => {
      this.smearing = false;
      this.downAt = { x: e.global.x, y: e.global.y };
      this.lastRegion = -1;
      this.tap(e, false);
    });
    this.picture.on('globalpointermove', (e) => {
      if (!this.downAt) return;
      if (!this.smearing) {
        const k = this.game.view.width / this.game.app.screen.width;
        this.smearing = Math.hypot(e.global.x - this.downAt.x, e.global.y - this.downAt.y) * k > SMEAR_START;
      }
      if (this.smearing) this.tap(e, true);
    });
    const up = () => ((this.smearing = false), (this.downAt = null));
    this.picture.on('pointerup', up);
    this.picture.on('pointerupoutside', up);
    const frame = new Graphics();
    frame.label = 'frame';
    frame.eventMode = 'none';
    this.layer.addChild(frame, this.picture, this.palette);
    this.palette.removeChildren();
    PAINTS.forEach((color) => {
      const blob = new Container();
      blob.addChild(new Graphics());
      blob.eventMode = 'static';
      blob.cursor = 'pointer';
      blob.on('pointertap', () => this.choose(color));
      blob.label = String(color);
      this.palette.addChild(blob);
    });
    this.done = new IconButton('next', 52);
    this.done.onTap = () => this.finishPicture();
    this.done.visible = false;
    this.layer.addChild(this.done);
    this.drawPalette();
    this.timers.after(0.4, () => say(this.game, this.guide, 'coloring'));
  }

  protected override appear(): void {
    void popIn(this.tweens, this.picture, 0.4);
    this.palette.children.forEach((c, i) => void popIn(this.tweens, c as Container, 0.3, 0.2 + i * 0.03));
  }

  private choose(color: number): void {
    this.paint = color;
    this.idle = 0;
    haptics.tap();
    sfx.pop(this.game.sound, 1.1);
    const blob = this.palette.children.find((c) => c.label === String(color)) as Container;
    void squash(this.tweens, blob, 0.2);
    this.drawPalette();
  }

  private tap(e: FederatedPointerEvent, smear = false): void {
    if (this.busy) return;
    this.idle = 0;
    const p = this.picture.toLocal(e.global);
    const k = SIZE / this.picture.texture.width;
    const x = (p.x + this.picture.texture.width / 2) * k;
    const y = (p.y + this.picture.texture.height / 2) * k;
    // Fingertip in picture pixels (the picture is scaled to the screen).
    const reach = Math.max(6, Math.round(FINGER / Math.max(0.1, this.picture.scale.x)));
    const pick = pickRegion(this.labels, SIZE, SIZE, x, y, smear ? Math.round(reach * 0.6) : reach);
    // Smearing paints only where the finger is clearly inside one part (not along a line between two).
    if (!pick.region || (smear && pick.share < 0.75)) return;
    const region = pick.region;
    if (region === this.lastRegion) return;
    this.lastRegion = region;
    // Area already in this color: nothing to do (when smearing, the finger returns to the same areas).
    if (this.colorOf.get(region) === this.paint) return;
    if (this.regions.detail[region]) this.manual.add(region);
    this.paintRegion(region, this.paint);
    // Magic details: parts too small for a finger take a shade of the part they lie on (unless painted by hand).
    const magic: number[] = [];
    if (!this.regions.detail[region])
      for (let d = 1; d < this.sizes.length; d++)
        if (this.regions.parent[d] === region && !this.manual.has(d) && !this.regions.keepWhite[d]) {
          this.paintRegion(d, detailShade(this.paint));
          magic.push(d);
        }
    const v = ++this.version;
    void pixelsToTexture(this.pixels).then((t) => {
      if (v !== this.version || this.picture.destroyed) return t.destroy(true);
      const old = this.picture.texture;
      this.picture.texture = t;
      if (old !== t) old.destroy(true);
    });
    magic.forEach((d, i) =>
      this.timers.after(0.08 + i * 0.06, () => {
        const [cx, cy] = this.regions.center[d]!;
        const at = this.layer.toLocal(this.picture.toGlobal({ x: cx / k - this.picture.texture.width / 2, y: cy / k - this.picture.texture.height / 2 }));
        this.particles.burst(at.x, at.y, { count: 6, speed: [40, 120], life: [0.25, 0.5], gravity: 0, scale: [0.4, 0.8], colors: [0xffffff, 0xfff3b0] });
      }),
    );
    if (magic.length) this.timers.after(0.1, () => sfx.pop(this.game.sound, 1.6));
    this.fills++;
    haptics.tap();
    sfx.plop(this.game.sound);
    const local = this.layer.toLocal(e.global);
    this.particles.burst(local.x, local.y, { count: 14, speed: [120, 320], life: [0.3, 0.6], gravity: 500, scale: [0.6, 1.2], colors: [this.paint, this.paint, 0xffffff] });
    // The "done" button only after a few areas: no sticker for tapping "next" without coloring.
    if (this.fills === 3) {
      this.done.visible = true;
      void popIn(this.tweens, this.done, 0.4);
    }
    if (this.fills === 6) {
      void pulse(this.tweens, this.done, 0.25, 0.4);
      say(this.game, this.guide, 'coloring-done');
    }
  }

  private finishPicture(): void {
    if (this.busy) return;
    this.busy = true;
    const seen = state.progress.colored ?? [];
    if (!seen.includes(this.page)) state.progress.colored = [...seen, this.page];
    // To the parent's album (only when something was colored).
    if (this.fills > 0) void addPainting({ id: `k${Date.now()}`, page: this.page, date: today(), img: pixelsToJpeg(this.pixels, 480) });
    void pulse(this.tweens, this.picture, 0.08, 0.4);
    this.burst(this.picture.x, this.picture.y, 50);
    this.done.visible = false;
    this.solved();
  }

  /** Fill one region with a colour (pixels only; the texture is refreshed by the caller). */
  private paintRegion(region: number, color: number): void {
    const d = this.pixels.data;
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    for (const i of this.regions.pixels[region]!) {
      d[i * 4] = r;
      d[i * 4 + 1] = g;
      d[i * 4 + 2] = b;
    }
    this.colorOf.set(region, color);
  }

  /** Store screenshots: several of the largest regions (without the background) in different colors. */
  paintDemo(n = 8): void {
    const bg = this.regions.background;
    const regions = this.sizes.map((size, r) => ({ size, r })).filter((x) => x.r !== bg && x.r > 0 && x.size > 0 && !this.regions.detail[x.r]).sort((a, b) => b.size - a.size).slice(0, n);
    const k = SIZE / this.picture.texture.width;
    regions.forEach(({ r }, i) => {
      const [cx, cy] = this.regions.center[r]!;
      this.choose(PAINTS[(i * 3 + 2) % 9]!);
      this.lastRegion = -1;
      this.tap({ global: this.picture.toGlobal({ x: cx / k - this.picture.texture.width / 2, y: cy / k - this.picture.texture.height / 2 }) } as FederatedPointerEvent);
    });
  }

  /** Playtest: fill a few regions and finish. */
  solve(): void {
    this.finishPicture();
  }

  /** Hint: the palette bounces. */
  /** Pick a color from the palette, then tap the largest area of the picture. */
  protected override gesture(): Gesture | null {
    const blob = this.palette.children.find((c) => c.label !== String(this.paint)) as Container | undefined;
    const spot = this.bigSpot();
    return blob && spot ? { kind: 'tap', at: [this.spot(blob), spot] } : null;
  }

  /** Point inside the largest area of the picture (scene coordinates). */
  private bigSpot(): { x: number; y: number } | null {
    const bg = this.regions.background;
    let best = -1;
    for (let r = 1; r < this.sizes.length; r++) if (r !== bg && (best < 0 || this.sizes[r]! > this.sizes[best]!)) best = r;
    if (best < 0 || !this.picture.texture.width) return null;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < SIZE * SIZE; i++)
      if (this.labels[i] === best) {
        sx += i % SIZE;
        sy += Math.floor(i / SIZE);
        n++;
      }
    // The pixel of this area nearest to the centroid (the center of a C-shaped area lies outside it).
    let pick = 0;
    let dist = Infinity;
    for (let i = 0; i < SIZE * SIZE; i++)
      if (this.labels[i] === best) {
        const d = (i % SIZE - sx / n) ** 2 + (Math.floor(i / SIZE) - sy / n) ** 2;
        if (d < dist) [dist, pick] = [d, i];
      }
    const k = SIZE / this.picture.texture.width;
    const local = { x: (pick % SIZE) / k - this.picture.texture.width / 2, y: Math.floor(pick / SIZE) / k - this.picture.texture.height / 2 };
    return this.layer.toLocal(this.picture.toGlobal(local));
  }

  protected hint(): void {
    void pulse(this.tweens, this.palette, 0.08, 0.4);
  }

  private drawPalette(): void {
    this.palette.children.forEach((c) => {
      const color = Number(c.label);
      const on = color === this.paint;
      const r = on ? 34 : 27;
      ((c as Container).children[0] as Graphics)
        .clear()
        .circle(0, 4, r)
        .fill({ color: 0x000000, alpha: 0.15 })
        .circle(0, 0, r)
        .fill({ color })
        .stroke({ color: COLORS.ink, width: on ? 6 : 4 });
      // Selected color: enlarged, with a white ring in a dark outline (a yellow outline vanished on yellow paint).
      if (on) ((c as Container).children[0] as Graphics).circle(0, 0, r + 9).stroke({ color: 0xffffff, width: 6 }).circle(0, 0, r + 13).stroke({ color: COLORS.ink, width: 3 });
      (c as Container).hitArea = new Rectangle(-44, -44, 88, 88);
    });
  }

  protected place(): void {
    if (!this.pixels) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 300;
    const right = w - safe.right - 30;
    const top = safe.top + 105;
    const bottom = h - 25;
    // Palette on the right in two columns, picture in the middle.
    const palW = 170;
    const s = Math.min(bottom - top, right - left - palW - 30);
    this.box = { x: left + (right - left - palW - 30 - s) / 2, y: top + (bottom - top - s) / 2, s };
    this.picture.position.set(this.box.x + s / 2, this.box.y + s / 2);
    this.picture.scale.set(s / SIZE);
    const frame = this.layer.children.find((c) => c.label === 'frame') as Graphics;
    frame
      .clear()
      .roundRect(this.box.x - 12, this.box.y - 4, s + 24, s + 24, 26)
      .fill({ color: 0x000000, alpha: 0.12 })
      .roundRect(this.box.x - 12, this.box.y - 12, s + 24, s + 24, 26)
      .fill({ color: 0xffffff })
      .stroke({ color: COLORS.ink, width: 6 });
    const px = right - palW / 2;
    this.palette.children.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      c.position.set(px + (col - 0.5) * 78, top + 30 + row * 76);
    });
    this.done.position.set(px, bottom - 50);
  }
}

/** Rectangle enclosing the outlines (dark pixels), or null for an empty page. */
function inkBox(img: ImageData): { x: number; y: number; w: number; h: number } | null {
  const d = img.data;
  let x0 = img.width;
  let y0 = img.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]! >= 150) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
