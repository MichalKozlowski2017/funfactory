import { Assets, Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { pixelsToTexture, popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { buildRegions, composeSmooth, cutout, detailShade, fingerVotes, shadesOf, smoothLines, stamp, type PageRegions } from '../sim/fill.ts';
import { today } from '../log.ts';
import { addPainting, pixelsToJpeg } from '../picture.ts';
import { state } from '../state.ts';
import { COLORS, IconButton, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

export { PAGES } from '../sim/coloring.ts';
import { PAGES, pagesFor } from '../sim/coloring.ts';
/** Working size of the picture (pixels). */
const SIZE = 640;
/** Paints: saturated but soft (like plasticine). Each has three shades (sim/fill.ts shadesOf), shown under the palette. */
const PAINTS = [0xe8413c, 0xff8a2b, 0xffd23f, 0x7ad35a, 0x2f9e5b, 0x5cb3ff, 0x3d6bff, 0x9b5de5, 0xff8fc0, 0x9a6236, 0xffffff, 0x4a4a4a];
const URL_BASE = import.meta.env.BASE_URL;
/** Fingertip radius (game units): every pixel under it votes for the area the child means (sim/fill.ts pickRegion). */
const FINGER = 30;
/** Moving the finger farther than this (game units) turns the touch into a crayon (instead of filling the part on release). */
const CRAYON_START = 18;
/** Crayon tip radius (game units). */
const CRAYON = 20;
/** Share of a part covered by the crayon at which the rest fills itself (sparkles). */
const CRAYON_DONE = 0.6;

/**
 * Coloring (Little Studio): picking a paint from the palette and touching an area of the picture fills the whole region
 * between the outlines. No wrong answers; the green arrow finishes the picture (sticker).
 * Small details (too small for a finger: the inside of an ear, spots, buttons) are "magic": they colour themselves with a
 * lighter shade when the part they lie on is painted (sparkles). A precise touch can still paint a detail on its own.
 * Moving the finger is a crayon that stays inside the part where the touch started (like "magic colour" in coloring apps
 * for toddlers): scribbling never spoils the neighbours, and once most of the part is covered the rest fills itself.
 * The finished picture comes alive: its biggest painted parts jump one after another.
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
  /** The current touch: where it started, the part it means, and whether it became a crayon. */
  private touch: { id: number; x: number; y: number; region: number; crayon: boolean; last: { x: number; y: number }; covered: number } | null = null;
  /** Crayon pixels of the current part (counted once). */
  private marks!: Uint8Array;
  /** Live crayon line (above the picture, clipped to the part by a mask), baked into the pixels on release. */
  private strokes!: Graphics;
  private strokeMask!: Sprite;
  private maskData!: ImageData;
  private maskVersion = 0;
  private dark!: Uint8Array;
  /** Display image at twice the working size with smooth outlines (sim/fill.ts smoothLines): zoomed in, lines stay round. */
  private display!: ImageData;
  private ink!: { alpha: Uint8Array; src: Int32Array };
  private picture!: Sprite;
  private readonly palette = new Container();
  /** Three shades of the chosen paint (light, base, dark), under the palette. */
  private readonly shades = new Container();
  /** Chosen palette colour and the shade actually painted. */
  private hue = PAINTS[0]!;
  private paint = PAINTS[0]!;
  private done!: IconButton;
  private fills = 0;
  private version = 0;
  private box = { x: 0, y: 0, s: 400 };
  private pad!: Container;

  constructor() {
    super('coloring', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.length = 1;
    const seen = state.progress.colored ?? [];
    // Only pages whose parts fit a child's finger at this screen's picture size (a phone gets fewer scenes than a tablet).
    const pages = pagesFor(this.layout().s / this.unitsPerPx());
    // Pages not colored yet come first; a page that fails to load is skipped.
    const order = [...this.game.rng.shuffle(pages.filter((p) => !seen.includes(p))), ...this.game.rng.shuffle(pages.filter((p) => seen.includes(p)))];
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
    this.ink = smoothLines(SIZE, SIZE, (i) => this.dark[i] === 1);
    this.display = new ImageData(SIZE * 2, SIZE * 2);
    this.marks = new Uint8Array(SIZE * SIZE);
    this.maskData = new ImageData(SIZE, SIZE);
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
    this.refresh();
    this.picture.eventMode = 'none';
    // Touches land on a pad over the frame. A tap fills the part under the finger on release; moving the finger draws
    // with a crayon inside the part where the touch started.
    this.pad = new Container();
    this.pad.eventMode = 'static';
    this.pad.cursor = 'pointer';
    this.pad.on('pointerdown', (e) => this.down(e));
    this.pad.on('globalpointermove', (e) => this.move(e));
    this.pad.on('pointerup', (e) => this.up(e));
    this.pad.on('pointerupoutside', (e) => this.up(e));
    this.touch = null;
    this.strokes = new Graphics();
    this.strokes.eventMode = 'none';
    this.strokeMask = new Sprite({ anchor: 0.5 });
    this.strokes.mask = this.strokeMask;
    const frame = new Graphics();
    frame.label = 'frame';
    frame.eventMode = 'none';
    this.layer.addChild(frame, this.picture, this.strokes, this.strokeMask, this.pad, this.palette, this.shades);
    this.shades.removeChildren();
    for (let i = 0; i < 3; i++) {
      const blob = new Container();
      blob.addChild(new Graphics());
      blob.eventMode = 'static';
      blob.cursor = 'pointer';
      blob.on('pointertap', () => this.chooseShade(i));
      this.shades.addChild(blob);
    }
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
    if (this.busy) return;
    this.idle = 0;
    this.hue = color;
    this.paint = color;
    haptics.tap();
    sfx.pop(this.game.sound, 1.1);
    const blob = this.palette.children.find((c) => c.label === String(color)) as Container;
    void squash(this.tweens, blob, 0.2);
    void popIn(this.tweens, this.shades, 0.25);
    this.drawPalette();
  }

  /** Light, base or dark shade of the chosen paint. */
  private chooseShade(i: number): void {
    if (this.busy) return;
    this.idle = 0;
    this.paint = shadesOf(this.hue)[i]!;
    haptics.tap();
    sfx.pop(this.game.sound, 0.9 + i * 0.2);
    void squash(this.tweens, this.shades.children[i]!, 0.2);
    this.drawPalette();
  }


  protected override step(dt: number): void {
    this.done?.tick(dt);
  }

  /** Game units per screen point. */
  private unitsPerPx(): number {
    return this.game.view.width / this.game.app.screen.width;
  }

  /** Working-pixel position of a screen point. */
  private pixelAt(global: { x: number; y: number }): { x: number; y: number } {
    const p = this.picture.toLocal(global);
    return { x: p.x + SIZE / 2, y: p.y + SIZE / 2 };
  }

  /** The part a fingertip at this screen point means (smart touch: every pixel under the finger votes). */
  private regionAt(global: { x: number; y: number }): number {
    const { x, y } = this.pixelAt(global);
    const reach = Math.max(6, Math.round(FINGER / Math.max(0.1, this.picture.scale.x)));
    let region = 0;
    let best = 0;
    for (const [l, v] of fingerVotes(this.labels, SIZE, SIZE, x, y, reach)) if (v > best) (best = v), (region = l);
    return region;
  }

  private down(e: FederatedPointerEvent): void {
    if (this.busy || this.touch) return;
    this.idle = 0;
    const region = this.regionAt(e.global);
    this.touch = { id: e.pointerId, x: e.global.x, y: e.global.y, region, crayon: false, last: this.pixelAt(e.global), covered: 0 };
  }

  private move(e: FederatedPointerEvent): void {
    const t = this.touch;
    if (!t || e.pointerId !== t.id || this.busy || !t.region) return;
    if (!t.crayon) {
      if (Math.hypot(e.global.x - t.x, e.global.y - t.y) * this.unitsPerPx() < CRAYON_START) return;
      // An area already in this colour: nothing to draw.
      if (this.colorOf.get(t.region) === this.paint) return void (t.region = 0);
      t.crayon = true;
      this.startCrayon(t.region);
    }
    this.idle = 0;
    const p = this.pixelAt(e.global);
    const r = Math.max(4, CRAYON / this.picture.scale.x);
    // Live line on screen, and the same line into the pixels of this part (shown when the finger lifts).
    this.strokes.moveTo(t.last.x - SIZE / 2, t.last.y - SIZE / 2).lineTo(p.x - SIZE / 2, p.y - SIZE / 2).stroke({ color: this.paint, width: r * 2, cap: 'round', join: 'round' });
    t.covered += stamp(this.pixels.data, this.labels, this.marks, SIZE, t.last.x, t.last.y, p.x, p.y, r, t.region, this.paint);
    t.last = p;
    if (t.covered >= this.regions.sizes[t.region]! * CRAYON_DONE) {
      // Most of the part is covered: the rest fills itself.
      this.fillPart(t.region, e.global, true);
      t.region = 0;
    }
  }

  private up(e: FederatedPointerEvent): void {
    const t = this.touch;
    if (!t || e.pointerId !== t.id) return;
    this.touch = null;
    if (this.busy) return;
    if (t.crayon) {
      if (t.region) this.endCrayon();
      return;
    }
    // A tap: the part under the finger (where it touched down) fills.
    if (t.region) this.fillPart(t.region, { x: t.x, y: t.y });
  }

  /** The crayon draws only inside `region`: a mask of its pixels clips the live line. */
  private startCrayon(region: number): void {
    this.marks.fill(0);
    const m = this.maskData.data;
    m.fill(0);
    for (const i of this.regions.pixels[region]!) m[i * 4] = m[i * 4 + 1] = m[i * 4 + 2] = m[i * 4 + 3] = 255;
    const v = ++this.maskVersion;
    this.strokes.clear();
    this.strokes.visible = false;
    void pixelsToTexture(this.maskData).then((t) => {
      if (v !== this.maskVersion || this.strokeMask.destroyed) return t.destroy(true);
      const old = this.strokeMask.texture;
      this.strokeMask.texture = t;
      if (old !== t) old.destroy(true);
      this.strokes.visible = true;
    });
    haptics.tap();
  }

  /** Finger lifted mid-crayon: the drawn line becomes part of the picture. */
  private endCrayon(): void {
    this.fills++;
    this.afterFill();
    this.refresh(() => this.strokes.clear());
  }

  private refresh(then?: () => void): void {
    const v = ++this.version;
    composeSmooth(this.pixels.data, this.ink.alpha, this.ink.src, this.display.data, 0x282828);
    void pixelsToTexture(this.display, 2).then((t) => {
      if (v !== this.version || this.picture.destroyed) return t.destroy(true);
      const old = this.picture.texture;
      this.picture.texture = t;
      if (old !== t) old.destroy(true);
      then?.();
    });
  }

  /** Fill a whole part (a tap, or a crayon that covered most of it), with magic details, sparkles and sound. */
  private fillPart(region: number, global: { x: number; y: number }, byCrayon = false): void {
    if (this.busy) return;
    this.idle = 0;
    if (!byCrayon && this.colorOf.get(region) === this.paint) return;
    this.paintRegion(region, this.paint);
    if (this.regions.detail[region]) this.manual.add(region);
    // Magic details: parts too small for a finger take a shade of the part they lie on (unless painted by hand).
    const magic: number[] = [];
    if (!this.regions.detail[region])
      for (let d = 1; d < this.sizes.length; d++)
        if (this.regions.parent[d] === region && !this.manual.has(d) && !this.regions.keepWhite[d]) {
          this.paintRegion(d, detailShade(this.paint));
          magic.push(d);
        }
    this.refresh(() => this.strokes.clear());
    magic.forEach((d, i) =>
      this.timers.after(0.08 + i * 0.06, () => {
        const [cx, cy] = this.regions.center[d]!;
        const at = this.layer.toLocal(this.picture.toGlobal({ x: cx - SIZE / 2, y: cy - SIZE / 2 }));
        this.particles.burst(at.x, at.y, { count: 6, speed: [40, 120], life: [0.25, 0.5], gravity: 0, scale: [0.4, 0.8], colors: [0xffffff, 0xfff3b0] });
      }),
    );
    if (magic.length) this.timers.after(0.1, () => sfx.pop(this.game.sound, 1.6));
    this.fills++;
    haptics.tap();
    if (byCrayon) sfx.pop(this.game.sound, 1.3);
    else sfx.plop(this.game.sound);
    const local = this.layer.toLocal(global);
    this.particles.burst(local.x, local.y, { count: byCrayon ? 22 : 14, speed: [120, 320], life: [0.3, 0.6], gravity: 500, scale: [0.6, 1.2], colors: [this.paint, this.paint, 0xffffff] });
    this.afterFill();
  }

  /** The "done" button only after a few areas: no sticker for tapping "next" without coloring. */
  private afterFill(): void {
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
    this.comeAlive();
    this.done.visible = false;
    this.solved(1.3);
  }

  /**
   * The finished picture comes alive: its biggest painted parts (with their outline and details) jump one after another,
   * then the whole picture wobbles.
   */
  private comeAlive(): void {
    const bg = this.regions.background;
    const parts = [...this.colorOf.keys()].filter((r) => r !== bg && !this.regions.detail[r]).sort((a, b) => this.sizes[b]! - this.sizes[a]!).slice(0, 6);
    const scale = this.picture.scale.x;
    parts.forEach((r, i) => {
      const cut = cutout(this.pixels.data, this.labels, this.regions.parent, this.dark, SIZE, r, 6);
      if (!cut) return;
      // At display resolution (smooth lines); a white patch of the same shape hides the part's place while it jumps.
      const W = cut.w * 2;
      const H = cut.h * 2;
      const part = new ImageData(W, H);
      const patch = new ImageData(W, H);
      const disp = this.display.data;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!cut.rgba[((y >> 1) * cut.w + (x >> 1)) * 4 + 3]) continue;
          const o = (y * W + x) * 4;
          const q = ((cut.y * 2 + y) * SIZE * 2 + cut.x * 2 + x) * 4;
          part.data[o] = disp[q]!;
          part.data[o + 1] = disp[q + 1]!;
          part.data[o + 2] = disp[q + 2]!;
          part.data[o + 3] = 255;
          patch.data[o] = patch.data[o + 1] = patch.data[o + 2] = patch.data[o + 3] = 255;
        }
      const at = this.layer.toLocal(this.picture.toGlobal({ x: cut.x + cut.w / 2 - SIZE / 2, y: cut.y + cut.h / 2 - SIZE / 2 }));
      void Promise.all([pixelsToTexture(part, 2), pixelsToTexture(patch, 2)]).then(([tPart, tPatch]) => {
        if (this.picture.destroyed) return void (tPart.destroy(true), tPatch.destroy(true));
        const under = new Sprite({ texture: tPatch, anchor: 0.5 });
        const s = new Sprite({ texture: tPart, anchor: 0.5 });
        for (const o of [under, s]) {
          o.scale.set(scale);
          o.position.copyFrom(at);
          o.visible = false;
        }
        const index = this.layer.getChildIndex(this.picture) + 1;
        this.layer.addChildAt(s, index);
        this.layer.addChildAt(under, index);
        this.timers.after(0.1 + i * 0.22, () => {
          under.visible = s.visible = true;
          sfx.pop(this.game.sound, 0.9 + i * 0.12);
          haptics.tap();
          void this.tweens.to(s.scale, { x: scale * 1.15, y: scale * 1.15 }, { duration: 0.15, ease: 'quadOut', yoyo: true, repeat: 1 });
          void this.tweens.to(s, { rotation: i % 2 ? 0.07 : -0.07 }, { duration: 0.075, yoyo: true, repeat: 3 });
          this.particles.burst(at.x, at.y, { count: 10, speed: [80, 220], life: [0.3, 0.6], gravity: 200, scale: [0.5, 1], colors: [0xffffff, 0xfff3b0, this.colorOf.get(r) ?? 0xffffff] });
          this.timers.after(0.34, () => {
            s.destroy();
            under.destroy();
            tPart.destroy(true);
            tPatch.destroy(true);
          });
        });
      });
    });
    this.burst(this.picture.x, this.picture.y, 50);
  }

  /** Fill one region with a colour (pixels only; the texture is refreshed by the caller). */
  private paintRegion(region: number, color: number): void {
    this.fillPixels(region, color);
    this.colorOf.set(region, color);
  }

  private fillPixels(region: number, color: number): void {
    const d = this.pixels.data;
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    for (const i of this.regions.pixels[region]!) {
      d[i * 4] = r;
      d[i * 4 + 1] = g;
      d[i * 4 + 2] = b;
    }
  }

  /** Store screenshots: several of the largest regions (without the background) in different colors. */
  paintDemo(n = 8): void {
    const bg = this.regions.background;
    const regions = this.sizes.map((size, r) => ({ size, r })).filter((x) => x.r !== bg && x.r > 0 && x.size > 0 && !this.regions.detail[x.r]).sort((a, b) => b.size - a.size).slice(0, n);
    regions.forEach(({ r }, i) => {
      const [cx, cy] = this.regions.center[r]!;
      this.choose(PAINTS[(i * 3 + 2) % 9]!);
      this.fillPart(r, this.picture.toGlobal({ x: cx - SIZE / 2, y: cy - SIZE / 2 }));
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
      const on = color === this.hue;
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
    shadesOf(this.hue).forEach((color, i) => {
      const c = this.shades.children[i] as Container;
      const on = color === this.paint;
      const g = c.children[0] as Graphics;
      g.clear().roundRect(-24, -20 + 4, 48, 40, 14).fill({ color: 0x000000, alpha: 0.15 }).roundRect(-24, -20, 48, 40, 14).fill({ color }).stroke({ color: COLORS.ink, width: on ? 6 : 3 });
      if (on) g.roundRect(-31, -27, 62, 54, 18).stroke({ color: 0xffffff, width: 5 }).roundRect(-34, -30, 68, 60, 20).stroke({ color: COLORS.ink, width: 3 });
      c.hitArea = new Rectangle(-28, -40, 56, 80);
    });
  }

  /** Picture box (palette on the right in two columns, picture in the middle). */
  private layout(): { box: { x: number; y: number; s: number }; s: number; right: number; top: number; palW: number } {
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 300;
    const right = w - safe.right - 30;
    const top = safe.top + 105;
    const bottom = h - 25;
    const palW = 170;
    const s = Math.min(bottom - top, right - left - palW - 30);
    return { box: { x: left + (right - left - palW - 30 - s) / 2, y: top + (bottom - top - s) / 2, s }, s, right, top, palW };
  }

  protected place(): void {
    if (!this.pixels) return;
    const { box, right, top, palW } = this.layout();
    const { safe } = this.stage;
    this.box = box;
    const s = this.box.s;
    for (const o of [this.picture, this.strokes, this.strokeMask]) {
      o.position.set(this.box.x + s / 2, this.box.y + s / 2);
      o.scale.set(s / SIZE);
    }
    this.pad.hitArea = new Rectangle(this.box.x, this.box.y, s, s);
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
    // Shades in a row under the palette; the finish button moves to the top right corner to make room.
    this.shades.position.set(px, top + 30 + 6 * 76 + 8);
    this.shades.children.forEach((c, i) => c.position.set((i - 1) * 58, 0));
    this.done.position.set(px, Math.max(safe.top + 55, top - 50));
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
