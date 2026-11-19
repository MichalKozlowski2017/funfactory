import { Container, Graphics, Rectangle, Sprite, Text, type Texture } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import type { Tweens } from '@funfactory/core';
import { Button, popIn, type View } from '@funfactory/kit2d';
import { itemsOf, KINDS, type ItemKind, type Save } from '../sim/shop.ts';
import { rainbow } from '../fx/streak-fx.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const CARD_W = 290;
const COLS = 2;
const ROWS = 3;

interface Card {
  id: string;
  view: Container;
  bg: Graphics;
  art: Container;
  state: Text;
}

export interface ShopOptions {
  /** Podgląd każdej rzeczy (id → tekstura; null = szare kółko). */
  previews: Map<string, Texture | null>;
  /** Rzeczy z tęczowym podglądem (animowany kolor). */
  rainbow: ReadonlySet<string>;
  /** Nazwa osiągnięcia, które daje rzecz (dla rzeczy, których nie da się kupić). */
  unlockName: (id: string) => string | null;
  candyTex: Texture;
  pixelRatio: number;
  tweens: Tweens;
  onTap: (id: string) => void;
  onClose: () => void;
}

/** Szafa: zakładki (czapki, kolory, ślady, dodatki), po 6 kart, stan konta, zamknięcie. */
export class ShopPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly grid = new Container();
  private readonly title: Text;
  private readonly bank: Text;
  private readonly icon: Sprite;
  private readonly close: Button;
  private readonly tabs: { kind: ItemKind; button: Button }[] = [];
  private cards: Card[] = [];
  private kind: ItemKind = 'hat';
  private save: Save | null = null;
  private cardH = 250;
  private time = 0;
  private readonly opts: ShopOptions;

  constructor(opts: ShopOptions) {
    super();
    this.opts = opts;
    this.dim.eventMode = 'static'; // blokuje dotyk pod spodem
    this.title = this.text(56, pal.surface);
    this.title.text = 'Szafa';
    this.bank = this.text(40, pal.surface);
    this.bank.anchor.set(0, 0.5);
    this.icon = new Sprite({ texture: opts.candyTex, anchor: 0.5 });
    this.icon.scale.set(52 / Math.max(opts.candyTex.width, opts.candyTex.height));
    this.close = new Button({ label: 'Gotowe', color: pal.accent, width: 320, height: 96, fontSize: 40, resolution: opts.pixelRatio, onTap: opts.onClose });
    for (const { kind, name } of KINDS) {
      const button = new Button({ label: name, color: '#6e6488', width: 158, height: 88, fontSize: 28, radius: 22, resolution: opts.pixelRatio, onTap: () => this.show(kind) });
      this.tabs.push({ kind, button });
      this.body.addChild(button);
    }
    this.body.addChild(this.grid, this.title, this.icon, this.bank, this.close);
    this.addChild(this.dim, this.panel, this.body);
    this.show('hat');
  }

  /** Przełącza zakładkę. */
  show(kind: ItemKind): void {
    this.kind = kind;
    for (const t of this.tabs) t.button.setColor(t.kind === kind ? '#ff7a59' : '#6e6488');
    this.grid.removeChildren().forEach((c) => c.destroy({ children: true }));
    const h = this.cardH;
    this.cards = itemsOf(kind).map((item, i) => {
      const view = new Container();
      const bg = new Graphics();
      const tex = this.opts.previews.get(item.id);
      const art = tex ? new Sprite({ texture: tex, anchor: 0.5 }) : new Graphics().circle(0, 0, 50).fill({ color: 0x777777 });
      if (tex) art.scale.set(Math.min(170 / tex.width, (h * 0.42) / tex.height));
      art.y = -h * 0.14;
      const name = this.text(30, pal.surface);
      name.text = item.name;
      name.y = h * 0.2;
      const state = this.text(26, pal.accent);
      state.y = h * 0.36;
      view.addChild(bg, art, name, state);
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      view.position.set((col - (COLS - 1) / 2) * (CARD_W + 20), (row - (ROWS - 1) / 2) * (h + 16));
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.hitArea = new Rectangle(-CARD_W / 2, -h / 2, CARD_W, h);
      view.on('pointertap', () => this.opts.onTap(item.id));
      this.grid.addChild(view);
      return { id: item.id, view, bg, art, state };
    });
    if (this.save) this.refresh(this.save);
  }

  refresh(save: Save): void {
    this.save = save;
    this.bank.text = `${save.candies}`;
    const h = this.cardH;
    for (const c of this.cards) {
      const item = itemsOf(this.kind).find((x) => x.id === c.id);
      if (!item) continue;
      const owned = save.owned.includes(c.id);
      const worn = save[item.kind] === c.id;
      const locked = !owned && !!item.unlock;
      const affordable = save.candies >= item.price;
      c.state.text = worn ? 'Założone ✓' : owned ? 'Załóż' : locked ? '🔒 osiągnięcie' : `${item.price} cukierków`;
      c.state.style.fill = worn ? '#8ee3a1' : owned ? pal.surface : locked ? '#ffd166' : affordable ? pal.accent : '#9a8fa8';
      c.art.alpha = locked ? 0.45 : 1;
      const fill = worn ? 0x3d5a4a : locked ? 0x2f2444 : 0x3a2c55;
      c.bg.clear().roundRect(-CARD_W / 2, -h / 2, CARD_W, h, 28).fill({ color: fill }).stroke({ color: worn ? 0x8ee3a1 : hexToNumber(pal.ink), width: worn ? 6 : 5 });
    }
  }

  /** Nie da się kupić: za mało cukierków (ile brakuje) albo rzecz za osiągnięcie (które). */
  deny(id: string, missing: number): void {
    const c = this.cards.find((x) => x.id === id);
    if (!c) return;
    const unlock = this.opts.unlockName(id);
    c.state.text = unlock ? `za: ${unlock}` : `brakuje ${missing}`;
    c.state.style.fill = unlock ? '#ffd166' : '#ff6f8f';
    if (c.state.width > CARD_W - 20) c.state.scale.set((CARD_W - 20) / c.state.width);
    const x = c.view.x;
    this.opts.tweens.killOf(c.view);
    this.opts.tweens.to(c.view, { x: x + 14 }, { duration: 0.05, yoyo: true, repeat: 5, ease: 'linear' }).done.then(() => {
      if (!c.view.destroyed) c.view.x = x;
    });
  }

  celebrate(id: string): void {
    const c = this.cards.find((x) => x.id === id);
    if (c) void popIn(this.opts.tweens, c.view, 0.35);
  }

  /** `bottom`: miejsce zajęte od dołu (baner reklamy): panel kończy się nad nim. */
  layout(view: View, bottom = 0): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    const end = view.height - bottom;
    const h = Math.min(end - view.safe.top - 20, 1180);
    const top = end - h;
    this.panel.clear().roundRect(10, top, view.width - 20, h + (bottom ? 0 : 40), 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
    this.title.position.set(-100, 60);
    this.icon.position.set(150, 60);
    this.bank.position.set(184, 60);
    this.tabs.forEach((t, i) => t.button.position.set((i - 1.5) * 166, 150));
    // Siatka między zakładkami a przyciskiem: karty dopasowane do wysokości ekranu.
    const gridTop = 210;
    const gridBottom = h - 150;
    const cardH = Math.max(170, Math.min(270, Math.floor((gridBottom - gridTop - (ROWS - 1) * 16) / ROWS)));
    this.grid.position.set(0, (gridTop + gridBottom) / 2);
    this.close.position.set(0, h - 80);
    if (cardH !== this.cardH) {
      this.cardH = cardH;
      this.show(this.kind);
    }
  }

  tick(dt: number): void {
    this.time += dt;
    this.close.tick(dt);
    for (const t of this.tabs) t.button.tick(dt);
    for (const c of this.cards) if (this.opts.rainbow.has(c.id) && c.art instanceof Sprite) c.art.tint = rainbow(this.time);
  }

  private text(size: number, fill: string): Text {
    return new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: size, fontWeight: '800', fill, stroke: { color: pal.ink, width: Math.max(3, size * 0.1), join: 'round' } },
      resolution: this.opts.pixelRatio,
      anchor: 0.5,
    });
  }
}
