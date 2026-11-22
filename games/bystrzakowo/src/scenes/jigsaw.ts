import { Container, Graphics, Rectangle, Sprite, Texture, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { pixelsToTexture, popIn, pulse } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import type { Item } from '../sim/catalog.ts';
import { jigsawGrid, makeJigsawRound, snaps } from '../sim/jigsaw.ts';
import { state } from '../state.ts';
import { COLORS, draggable, sfx, wiggle } from '../ui.ts';
import { RoundScene } from './round.ts';

/** Rozmiar obrazka układanki w pikselach tekstury. */
const PIC = 600;
/** Pastelowe tła obrazków (kawałki z tłem łatwiej dopasować niż przezroczyste). */
const BACKDROPS = ['#ffe3ec', '#e0f3ff', '#e6f9e0', '#fff3c9', '#efe4ff'];
/** Kawałki w zasobniku są mniejsze (najwyżej tyle), rosną po złapaniu. */
const TRAY_MAX = 0.62;

interface PieceView {
  view: Container;
  /** Obwódka kawałka w zasobniku (znika po ułożeniu, żeby obrazek był gładki). */
  outline: Graphics;
  col: number;
  row: number;
  placed: boolean;
  tray: { x: number; y: number };
}

/**
 * Układanka (Warsztat Bazyla): obrazek z katalogu na pastelowym tle, pocięty na 2/4/6 prostokątów.
 * Na planszy blady podgląd całości, kawałki w zasobniku obok. Kawałek blisko swojego miejsca sam się przyciąga.
 */
export class JigsawScene extends RoundScene {
  readonly id = 'jigsaw';
  private items: Item[] = [];
  private pictures: Texture[] = [];
  private grid = { cols: 2, rows: 1 };
  private board = new Container();
  private ghost: Sprite | null = null;
  private full: Sprite | null = null;
  private pieces: PieceView[] = [];
  /** Rozmiar planszy w jednostkach gry. */
  private size = 400;
  private dragging = false;
  /** Skala kawałków w zasobniku (dopasowana do miejsca obok planszy). */
  private trayScale = TRAY_MAX;

  constructor() {
    super('ukladanka', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    const level = state.progress.levels.ukladanka ?? 0;
    this.grid = jigsawGrid(level);
    this.items = makeJigsawRound(this.game.rng);
    this.length = this.items.length;
    this.pictures = await Promise.all(this.items.map((item, i) => this.picture(item, BACKDROPS[(i + this.game.rng.int(0, 4)) % BACKDROPS.length]!)));
  }

  /** Obrazek układanki: zaokrąglone pastelowe tło i obiekt na środku (przez ImageBitmap, nie Texture.from(canvas)). */
  private async picture(item: Item, backdrop: string): Promise<Texture> {
    const tex = this.art.items.get(item.id)!;
    const src = tex.source.resource as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas');
    canvas.width = PIC;
    canvas.height = PIC;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = backdrop;
    ctx.beginPath();
    ctx.roundRect(0, 0, PIC, PIC, 48);
    ctx.fill();
    const k = (PIC * 0.82) / Math.max(src.width, src.height);
    const w = src.width * k;
    const h = src.height * k;
    ctx.drawImage(src, (PIC - w) / 2, (PIC - h) / 2, w, h);
    return pixelsToTexture(ctx.getImageData(0, 0, PIC, PIC));
  }

  protected override roundItems(): string[] {
    return this.items.map((i) => i.id);
  }

  protected promptLine(): string {
    return 'ukladanka';
  }

  protected show(): void {
    const tex = this.pictures[this.index]!;
    this.board = new Container();
    this.ghost = new Sprite({ texture: tex, anchor: 0.5 });
    this.ghost.alpha = 0.3;
    const frame = new Graphics();
    frame.label = 'frame';
    this.full = new Sprite({ texture: tex, anchor: 0.5 });
    this.full.visible = false;
    this.board.addChild(frame, this.ghost, this.full);
    this.layer.addChild(this.board);
    const { cols, rows } = this.grid;
    const pw = PIC / cols;
    const ph = PIC / rows;
    this.pieces = [];
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const t = new Texture({ source: tex.source, frame: new Rectangle(col * pw, row * ph, pw, ph) });
        const view = new Container();
        // Obwódka w pikselach tekstury (kontener skaluje się razem z obrazkiem).
        const shadow = new Graphics().rect(-pw / 2 + 4, -ph / 2 + 10, pw, ph).fill({ color: 0x000000, alpha: 0.18 });
        view.addChild(shadow, new Sprite({ texture: t, anchor: 0.5 }));
        const border = new Graphics().rect(-pw / 2, -ph / 2, pw, ph).stroke({ color: COLORS.ink, width: 8, alignment: 1 });
        view.addChild(border);
        const piece: PieceView = { view, outline: border, col, row, placed: false, tray: { x: 0, y: 0 } };
        draggable(view, {
          tap: () => this.tapHint(),
          canStart: () => !piece.placed && !this.busy && !this.dragging,
          start: () => {
            this.dragging = true;
            this.idle = 0;
            this.tweens.killOf(view.scale);
            const s = this.size / PIC;
            this.tweens.to(view.scale, { x: s, y: s }, { duration: 0.12 });
            sfx.pop(this.game.sound, 1.2);
          },
          drop: (at) => this.drop(piece, at),
        });
        this.pieces.push(piece);
      }
    // Kawałki w zasobniku w losowej kolejności.
    for (const p of this.game.rng.shuffle([...this.pieces])) this.layer.addChild(p.view);
    this.timers.after(0.4, () => say(this.game, this.guide, 'ukladanka'));
  }

  protected override appear(): void {
    void popIn(this.tweens, this.board, 0.4);
    this.pieces.forEach((p, i) => void popIn(this.tweens, p.view, 0.35, 0.15 + i * 0.06));
  }

  /** Środek miejsca kawałka na planszy (w układzie warstwy). */
  private slot(p: PieceView): { x: number; y: number } {
    const { cols, rows } = this.grid;
    const s = this.size;
    return { x: this.board.x - s / 2 + ((p.col + 0.5) * s) / cols, y: this.board.y - s / 2 + ((p.row + 0.5) * s) / rows };
  }

  private drop(p: PieceView, at: Point): void {
    this.dragging = false;
    const slot = this.slot(p);
    const pw = this.size / this.grid.cols;
    const ph = this.size / this.grid.rows;
    if (snaps(at.x - slot.x, at.y - slot.y, pw, ph)) return this.lock(p);
    // Upuszczony na planszy w złym miejscu: pomyłka. Poza planszą: po prostu wraca.
    const onBoard = Math.abs(at.x - this.board.x) < this.size / 2 && Math.abs(at.y - this.board.y) < this.size / 2;
    if (onBoard) {
      this.missed();
      wiggle(this.tweens, this.board);
    }
    this.tweens.to(p.view, { x: p.tray.x, y: p.tray.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(p.view.scale, { x: (this.size / PIC) * this.trayScale, y: (this.size / PIC) * this.trayScale }, { duration: 0.2 });
  }

  private lock(p: PieceView): void {
    p.placed = true;
    p.view.eventMode = 'none';
    p.outline.visible = false;
    (p.view.children[0] as Graphics).visible = false;
    const slot = this.slot(p);
    const s = this.size / PIC;
    this.tweens.to(p.view, { x: slot.x, y: slot.y }, { duration: 0.15, ease: 'quadOut' });
    this.tweens.to(p.view.scale, { x: s, y: s }, { duration: 0.15 });
    haptics.hit();
    sfx.pop(this.game.sound, 1.4);
    this.burst(slot.x, slot.y, 10);
    if (this.pieces.every((x) => x.placed)) this.complete();
  }

  /** Cały obrazek: kawałki znikają pod pełnym obrazkiem, puls, nazwa i pochwała. */
  private complete(): void {
    this.busy = true;
    this.timers.after(0.2, () => {
      this.full!.visible = true;
      for (const p of this.pieces) p.view.visible = false;
      void pulse(this.tweens, this.board, 0.12, 0.35);
      this.burst(this.board.x, this.board.y, 40);
      const len = say(this.game, this.guide, `item-${this.items[this.index]!.id}`);
      this.solved(len);
    });
  }

  /** Playtest: wszystkie kawałki na miejsce. */
  solve(): void {
    for (const p of this.pieces) if (!p.placed) this.lock(p);
  }

  /** Podpowiedź: kawałek podjeżdża w stronę swojego miejsca i wraca. */
  protected hint(): void {
    const p = this.pieces.find((x) => !x.placed);
    if (!p) return;
    const slot = this.slot(p);
    void this.tweens
      .to(p.view, { x: p.tray.x + (slot.x - p.tray.x) * 0.5, y: p.tray.y + (slot.y - p.tray.y) * 0.5 }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 })
      .done.then(() => p.view.position.set(p.tray.x, p.tray.y));
  }

  protected place(): void {
    if (!this.pieces.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 30;
    // Plansza po lewej, zasobnik po prawej.
    const tray = Math.min(300, (right - left) * 0.36);
    this.size = Math.min(h - 200, right - left - tray - 40);
    const s = this.size / PIC;
    this.board.position.set(left + this.size / 2, h / 2 + 40);
    this.ghost!.scale.set(s);
    this.full!.scale.set(s);
    const frame = this.board.children.find((c) => c.label === 'frame') as Graphics;
    frame
      .clear()
      .roundRect(-this.size / 2 - 14, -this.size / 2 - 6, this.size + 28, this.size + 28, 34)
      .fill({ color: 0x000000, alpha: 0.12 })
      .roundRect(-this.size / 2 - 14, -this.size / 2 - 14, this.size + 28, this.size + 28, 34)
      .fill({ color: 0xc98a4b })
      .stroke({ color: COLORS.ink, width: 6 })
      .roundRect(-this.size / 2, -this.size / 2, this.size, this.size, 24)
      .fill({ color: 0xfffaf2 });
    // Zasobnik: kawałki w kolumnach, skala dobrana tak, żeby wszystkie się zmieściły.
    const { cols, rows } = this.grid;
    const fullW = this.size / cols;
    const fullH = this.size / rows;
    const n = this.pieces.length;
    const trayH = h - 170;
    const gap = 16;
    let best = { scale: 0, tcols: 1 };
    for (let tcols = 1; tcols <= 3; tcols++) {
      const trows = Math.ceil(n / tcols);
      const scale = Math.min(TRAY_MAX, (tray - gap * (tcols - 1)) / (tcols * fullW), (trayH - gap * (trows - 1)) / (trows * fullH));
      if (scale > best.scale) best = { scale, tcols };
    }
    this.trayScale = best.scale;
    const tcols = best.tcols;
    const trows = Math.ceil(n / tcols);
    const pw = fullW * this.trayScale;
    const ph = fullH * this.trayScale;
    const tx = right - tray / 2;
    const ty = h / 2 + 40;
    const order = this.layer.children.filter((c) => this.pieces.some((p) => p.view === c));
    order.forEach((c, i) => {
      const p = this.pieces.find((x) => x.view === c)!;
      const col = i % tcols;
      const row = Math.floor(i / tcols);
      p.tray = { x: tx + (col - (tcols - 1) / 2) * (pw + gap), y: ty + (row - (trows - 1) / 2) * (ph + gap) };
      if (p.placed) {
        const slot = this.slot(p);
        p.view.position.set(slot.x, slot.y);
        p.view.scale.set(s);
      } else {
        p.view.position.set(p.tray.x, p.tray.y);
        p.view.scale.set(s * this.trayScale);
      }
    });
  }
}
