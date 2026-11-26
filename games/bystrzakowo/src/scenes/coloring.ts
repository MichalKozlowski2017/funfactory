import { Assets, Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { pixelsToTexture, popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { buildRegions, clampFocus, composeSmooth, detailShade, fingerVotes, shadesOf, smoothLines, tinyUnderFinger, type PageRegions } from '../sim/fill.ts';
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
/** Paints: saturated but soft (like plasticine). Each has three shades (sim/fill.ts shadesOf), shown under the palette. */
const PAINTS = [0xe8413c, 0xff8a2b, 0xffd23f, 0x7ad35a, 0x2f9e5b, 0x5cb3ff, 0x3d6bff, 0x9b5de5, 0xff8fc0, 0x9a6236, 0xffffff, 0x4a4a4a];
const URL_BASE = import.meta.env.BASE_URL;
/** Fingertip radius (game units): every pixel under it votes for the area the child means (sim/fill.ts pickRegion). */
const FINGER = 30;
/** Moving the finger farther than this (game units) starts "smearing": further areas under the finger get painted. */
const SMEAR_START = 28;
/** A part narrower than this (inscribed radius, screen points: 24 pt across) is too small for a child's finger: a touch on it
 * zooms in. Measured on the pages (iPhone): 12 pt zooms on 0-36% of touches on single pictures and 17-65% on scenes. */
const TINY = 12;
const MAX_ZOOM = 4;

/**
 * Coloring (Little Studio): picking a paint from the palette and touching an area of the picture fills the whole region
 * between the outlines. No wrong answers; the green arrow finishes the picture (sticker).
 * Small details (too small for a finger: the inside of an ear, spots, buttons) are "magic": they colour themselves with a
 * lighter shade when the part they lie on is painted (sparkles). A precise touch can still paint a detail on its own.
 * A touch in a crowd of parts too small for a finger (a whole scene on a phone) does not guess: the picture zooms in around
 * the finger, so the child can paint the small part itself. A magnifier button zooms out; two fingers pinch and move the
 * picture (a pinch takes back what the first finger painted).
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
  private smearing = false;
  private lastRegion = -1;
  private version = 0;
  private box = { x: 0, y: 0, s: 400 };
  /** Zoom and the picture point (pixels from its centre) shown in the middle of the frame. */
  private readonly view = { zoom: 1, x: 0, y: 0 };
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; zoom: number; lx: number; ly: number } | null = null;
  /** What the current touch painted (region, previous colour, was it painted by hand): a pinch takes it back. */
  private undo: [number, number | undefined, boolean][] = [];
  private undoFills = 0;
  private pad!: Container;
  private clip!: Graphics;
  private zoomOut!: IconButton;

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
    this.ink = smoothLines(SIZE, SIZE, (i) => this.dark[i] === 1);
    this.display = new ImageData(SIZE * 2, SIZE * 2);
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
    // Touches land on a pad over the frame (the zoomed picture reaches beyond it, under the palette).
    // A tap fills an area; moving the finger ("smearing", as toddlers do) fills further areas under the finger.
    // A small wobble of the finger during a tap must not paint the neighbouring part: smearing starts after a clear move.
    this.pad = new Container();
    this.pad.eventMode = 'static';
    this.pad.cursor = 'pointer';
    this.pad.on('pointerdown', (e) => this.down(e));
    this.pad.on('globalpointermove', (e) => this.move(e));
    this.pad.on('pointerup', (e) => this.up(e));
    this.pad.on('pointerupoutside', (e) => this.up(e));
    this.clip = new Graphics();
    this.picture.mask = this.clip;
    this.view.zoom = 1;
    this.view.x = this.view.y = 0;
    this.pointers.clear();
    this.pinch = null;
    const frame = new Graphics();
    frame.label = 'frame';
    frame.eventMode = 'none';
    this.layer.addChild(frame, this.picture, this.clip, this.pad, this.palette, this.shades);
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
    this.zoomOut = new IconButton('zoom-out', 40);
    this.zoomOut.onTap = () => {
      sfx.pop(this.game.sound, 0.8);
      this.zoomTo(1, 0, 0);
    };
    this.zoomOut.visible = false;
    this.layer.addChild(this.done, this.zoomOut);
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
    this.zoomOut?.tick(dt);
  }

  private down(e: FederatedPointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.pointers.size === 2) return this.startPinch();
    if (this.pointers.size > 2) return;
    this.smearing = false;
    this.downAt = { x: e.global.x, y: e.global.y };
    this.lastRegion = -1;
    this.undo = [];
    this.undoFills = 0;
    this.tap(e, false, true);
  }

  private move(e: FederatedPointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.global.x;
    p.y = e.global.y;
    if (this.pinch) return this.pinchMove();
    if (!this.downAt) return;
    if (!this.smearing) this.smearing = Math.hypot(e.global.x - this.downAt.x, e.global.y - this.downAt.y) * this.unitsPerPx() > SMEAR_START;
    if (this.smearing) this.tap(e, true);
  }

  private up(e: FederatedPointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (!this.pointers.size) {
      this.smearing = false;
      this.downAt = null;
    }
  }

  /** Game units per screen point. */
  private unitsPerPx(): number {
    return this.game.view.width / this.game.app.screen.width;
  }

  /** Two fingers: zoom and move. The first finger already painted, but it meant a pinch: take that back. */
  private startPinch(): void {
    if (this.busy) return;
    this.revert();
    this.downAt = null;
    this.smearing = false;
    this.tweens.killOf(this.view);
    const [a, b] = [...this.pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
    const at = this.picture.toLocal({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    this.pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.view.zoom, lx: at.x, ly: at.y };
  }

  private pinchMove(): void {
    const [a, b] = [...this.pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
    const pinch = this.pinch!;
    this.view.zoom = Math.max(1, Math.min(MAX_ZOOM, (pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist));
    // The picture point first under the fingers stays under them.
    const mid = this.layer.toLocal({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const scale = (this.box.s / SIZE) * this.view.zoom;
    this.view.x = pinch.lx - (mid.x - this.box.x - this.box.s / 2) / scale;
    this.view.y = pinch.ly - (mid.y - this.box.y - this.box.s / 2) / scale;
    this.applyView();
    this.idle = 0;
  }

  /** Smooth zoom to `zoom` with the picture point (x, y) in the middle of the frame. */
  private zoomTo(zoom: number, x: number, y: number): void {
    this.tweens.killOf(this.view);
    const to = { zoom, x: clampFocus(x, SIZE / 2, zoom), y: clampFocus(y, SIZE / 2, zoom) };
    this.tweens.to(this.view, to, { duration: 0.35, ease: 'cubicOut', onUpdate: () => this.applyView() });
  }

  /** Picture scale and position for the current zoom; the magnifier (zoom out) shows only when zoomed in. */
  private applyView(): void {
    const v = this.view;
    v.x = clampFocus(v.x, SIZE / 2, v.zoom);
    v.y = clampFocus(v.y, SIZE / 2, v.zoom);
    const scale = (this.box.s / SIZE) * v.zoom;
    this.picture.scale.set(scale);
    this.picture.position.set(this.box.x + this.box.s / 2 - v.x * scale, this.box.y + this.box.s / 2 - v.y * scale);
    const zoomed = v.zoom > 1.05;
    if (this.zoomOut && zoomed !== this.zoomOut.visible) {
      this.zoomOut.visible = zoomed;
      if (zoomed) void popIn(this.tweens, this.zoomOut, 0.3);
    }
  }

  /** Take back what the current touch painted. */
  private revert(): void {
    if (!this.undo.length) return;
    for (const [region, color, wasManual] of this.undo.reverse()) {
      this.fillPixels(region, color ?? 0xffffff);
      if (color === undefined) this.colorOf.delete(region);
      else this.colorOf.set(region, color);
      if (!wasManual) this.manual.delete(region);
    }
    this.undo = [];
    this.fills -= this.undoFills;
    this.undoFills = 0;
    this.refresh();
  }

  private refresh(): void {
    const v = ++this.version;
    composeSmooth(this.pixels.data, this.ink.alpha, this.ink.src, this.display.data, 0x282828);
    void pixelsToTexture(this.display, 2).then((t) => {
      if (v !== this.version || this.picture.destroyed) return t.destroy(true);
      const old = this.picture.texture;
      this.picture.texture = t;
      if (old !== t) old.destroy(true);
    });
  }

  private tap(e: FederatedPointerEvent, smear = false, zoomable = false): void {
    if (this.busy) return;
    this.idle = 0;
    const p = this.picture.toLocal(e.global);
    const k = SIZE / this.picture.texture.width;
    const x = (p.x + this.picture.texture.width / 2) * k;
    const y = (p.y + this.picture.texture.height / 2) * k;
    // Fingertip in picture pixels (the picture is scaled to the screen).
    const reach = Math.max(6, Math.round(FINGER / Math.max(0.1, this.picture.scale.x)));
    const votes = fingerVotes(this.labels, SIZE, SIZE, x, y, smear ? Math.round(reach * 0.6) : reach);
    if (zoomable && this.view.zoom < 1.8) {
      // Parts narrower than TINY points on screen, clearly under the finger: zoom in so that they become finger-sized.
      const minRadius = (TINY * this.unitsPerPx()) / this.picture.scale.x;
      const tiny = tinyUnderFinger(votes, this.regions.radius, minRadius, (l) => this.regions.keepWhite[l]!);
      if (tiny) {
        // The narrowest part grows to ~20 pt radius (40 pt across, a fingertip).
        const zoom = Math.max(2, Math.min(3.5, ((1.6 * minRadius) / tiny) * this.view.zoom));
        // Zoom around the finger: the touched point stays under it.
        const r = this.view.zoom / zoom;
        this.zoomTo(zoom, p.x - (p.x - this.view.x) * r, p.y - (p.y - this.view.y) * r);
        this.downAt = null;
        haptics.tap();
        sfx.pop(this.game.sound, 0.7);
        return;
      }
    }
    let pick = { region: 0, share: 0 };
    for (const [l, v] of votes) if (v > pick.share) pick = { region: l, share: v };
    // Smearing paints only where the finger is clearly inside one part (not along a line between two).
    if (!pick.region || (smear && pick.share < 0.75)) return;
    const region = pick.region;
    if (region === this.lastRegion) return;
    this.lastRegion = region;
    // Area already in this color: nothing to do (when smearing, the finger returns to the same areas).
    if (this.colorOf.get(region) === this.paint) return;
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
    this.refresh();
    magic.forEach((d, i) =>
      this.timers.after(0.08 + i * 0.06, () => {
        const [cx, cy] = this.regions.center[d]!;
        const at = this.layer.toLocal(this.picture.toGlobal({ x: cx / k - this.picture.texture.width / 2, y: cy / k - this.picture.texture.height / 2 }));
        this.particles.burst(at.x, at.y, { count: 6, speed: [40, 120], life: [0.25, 0.5], gravity: 0, scale: [0.4, 0.8], colors: [0xffffff, 0xfff3b0] });
      }),
    );
    if (magic.length) this.timers.after(0.1, () => sfx.pop(this.game.sound, 1.6));
    this.fills++;
    this.undoFills++;
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
    // The whole picture for the finish.
    this.tweens.killOf(this.view);
    this.view.zoom = 1;
    this.view.x = this.view.y = 0;
    this.applyView();
    void pulse(this.tweens, this.picture, 0.08, 0.4);
    this.burst(this.picture.x, this.picture.y, 50);
    this.done.visible = false;
    this.solved();
  }

  /** Fill one region with a colour (pixels only; the texture is refreshed by the caller). */
  private paintRegion(region: number, color: number): void {
    this.undo.push([region, this.colorOf.get(region), this.manual.has(region)]);
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
    this.applyView();
    this.clip.clear().rect(this.box.x, this.box.y, s, s).fill({ color: 0xffffff });
    this.pad.hitArea = new Rectangle(this.box.x, this.box.y, s, s);
    this.zoomOut.position.set(this.box.x + 26, this.box.y + 26);
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
