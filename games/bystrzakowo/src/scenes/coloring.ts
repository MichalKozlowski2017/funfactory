import { Assets, Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { pixelsToTexture, popIn, pulse, squash } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { labelRegions, regionAt } from '../sim/fill.ts';
import { state } from '../state.ts';
import { COLORS, IconButton, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';

/** Strony kolorowanki (public/art/kolorowanki/<id>.png, kontury z Fluxa). */
export const PAGES = ['kot', 'pies', 'slon', 'ryba', 'motyl', 'auto', 'kwiatek', 'dinozaur', 'zolw', 'rakieta', 'sowa', 'domek'];
/** Rozmiar roboczy obrazka (piksele). */
const SIZE = 640;
/** Farby: nasycone, ale miękkie (jak plastelina). */
const PAINTS = [0xe8413c, 0xff8a2b, 0xffd23f, 0x7ad35a, 0x2f9e5b, 0x5cb3ff, 0x3d6bff, 0x9b5de5, 0xff8fc0, 0x9a6236, 0xffffff, 0x4a4a4a];
const URL_BASE = import.meta.env.BASE_URL;

/**
 * Kolorowanka (Pracownia Malucha): wybór farby z palety i dotknięcie pola obrazka zamalowuje cały obszar
 * między konturami. Bez złych odpowiedzi; zielona strzałka kończy obrazek (naklejka).
 */
export class ColoringScene extends RoundScene {
  readonly id = 'coloring';
  private page = '';
  private pixels!: ImageData;
  private labels!: Int32Array;
  private sizes: number[] = [];
  private dark!: Uint8Array;
  private picture!: Sprite;
  private readonly palette = new Container();
  private paint = PAINTS[0]!;
  private done!: IconButton;
  private fills = 0;
  private version = 0;
  private box = { x: 0, y: 0, s: 400 };

  constructor() {
    super('kolorowanka', 'lusia');
  }

  protected async prepare(): Promise<void> {
    this.length = 1;
    const seen = state.progress.colored ?? [];
    // Najpierw strony jeszcze nie kolorowane; strona, której nie da się wczytać, jest pomijana.
    const order = [...this.game.rng.shuffle(PAGES.filter((p) => !seen.includes(p))), ...this.game.rng.shuffle(PAGES.filter((p) => seen.includes(p)))];
    let tex: Texture | null = null;
    for (const page of order) {
      tex = await Assets.load<Texture>(`${URL_BASE}art/kolorowanki/${page}.png`).catch(() => null);
      if (tex) {
        this.page = page;
        break;
      }
    }
    if (!tex) throw new Error('Brak stron kolorowanki');
    const src = tex.source.resource as CanvasImageSource;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(src, 0, 0, SIZE, SIZE);
    this.pixels = ctx.getImageData(0, 0, SIZE, SIZE);
    const d = this.pixels.data;
    this.dark = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < SIZE * SIZE; i++) {
      const lum = 0.3 * d[i * 4]! + 0.59 * d[i * 4 + 1]! + 0.11 * d[i * 4 + 2]!;
      this.dark[i] = lum < 150 ? 1 : 0;
      // Czysty obraz startowy: linie czarne, reszta biała (bez szarych odcieni z wygładzania).
      const v = this.dark[i] ? 40 : 255;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }
    const r = labelRegions(SIZE, SIZE, (i) => this.dark[i] === 1);
    this.labels = r.labels;
    this.sizes = r.sizes;
  }

  protected promptLine(): string {
    return 'kolorowanka';
  }

  protected show(): void {
    this.fills = 0;
    this.picture = new Sprite({ anchor: 0.5 });
    void pixelsToTexture(this.pixels).then((t) => (this.picture.texture = t));
    this.picture.eventMode = 'static';
    this.picture.cursor = 'pointer';
    this.picture.on('pointerdown', (e) => this.tap(e));
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
    this.layer.addChild(this.done);
    this.drawPalette();
    this.timers.after(0.4, () => say(this.game, this.guide, 'kolorowanka'));
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

  private tap(e: FederatedPointerEvent): void {
    if (this.busy) return;
    this.idle = 0;
    const p = this.picture.toLocal(e.global);
    const k = SIZE / this.picture.texture.width;
    const x = (p.x + this.picture.texture.width / 2) * k;
    const y = (p.y + this.picture.texture.height / 2) * k;
    const region = regionAt(this.labels, this.sizes, SIZE, SIZE, x, y);
    if (!region) return;
    const d = this.pixels.data;
    const r = (this.paint >> 16) & 255;
    const g = (this.paint >> 8) & 255;
    const b = this.paint & 255;
    for (let i = 0; i < SIZE * SIZE; i++)
      if (this.labels[i] === region) {
        d[i * 4] = r;
        d[i * 4 + 1] = g;
        d[i * 4 + 2] = b;
      }
    const v = ++this.version;
    void pixelsToTexture(this.pixels).then((t) => {
      if (v !== this.version || this.picture.destroyed) return t.destroy(true);
      const old = this.picture.texture;
      this.picture.texture = t;
      if (old !== t) old.destroy(true);
    });
    this.fills++;
    haptics.tap();
    sfx.plop(this.game.sound);
    const local = this.layer.toLocal(e.global);
    this.particles.burst(local.x, local.y, { count: 14, speed: [120, 320], life: [0.3, 0.6], gravity: 500, scale: [0.6, 1.2], colors: [this.paint, this.paint, 0xffffff] });
    if (this.fills === 6) {
      void pulse(this.tweens, this.done, 0.25, 0.4);
      say(this.game, this.guide, 'kolorowanka-gotowe');
    }
  }

  private finishPicture(): void {
    if (this.busy) return;
    this.busy = true;
    const seen = state.progress.colored ?? [];
    if (!seen.includes(this.page)) state.progress.colored = [...seen, this.page];
    void pulse(this.tweens, this.picture, 0.08, 0.4);
    this.burst(this.picture.x, this.picture.y, 50);
    this.done.visible = false;
    this.solved();
  }

  /** Playtest: zamalowanie kilku obszarów i koniec. */
  solve(): void {
    this.finishPicture();
  }

  /** Podpowiedź: paleta podskakuje. */
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
        .stroke({ color: on ? COLORS.sun : COLORS.ink, width: on ? 8 : 4 });
      (c as Container).hitArea = new Rectangle(-40, -40, 80, 80);
    });
  }

  protected place(): void {
    if (!this.pixels) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 300;
    const right = w - safe.right - 30;
    const top = safe.top + 105;
    const bottom = h - 25;
    // Paleta po prawej w dwóch kolumnach, obrazek w środku.
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
