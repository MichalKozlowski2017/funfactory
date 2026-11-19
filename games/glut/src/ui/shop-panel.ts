import { Container, Graphics, Rectangle, Sprite, Text, type Texture } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import type { Tweens } from '@funfactory/core';
import { Button, popIn, type View } from '@funfactory/kit2d';
import { itemsOf, KINDS, type ItemKind, type Save } from '../sim/shop.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const CARD_W = 290;
const CARD_H = 290;

interface Card {
  id: string;
  view: Container;
  bg: Graphics;
  state: Text;
}

export interface ShopOptions {
  /** Podgląd każdej rzeczy (id → tekstura; null = szare kółko). */
  previews: Map<string, Texture | null>;
  candyTex: Texture;
  pixelRatio: number;
  tweens: Tweens;
  onTap: (id: string) => void;
  onClose: () => void;
}

/** Szafa: zakładki (czapki, kolory, ślady, dodatki), po 4 karty, stan konta, zamknięcie. */
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
    this.close = new Button({ label: 'Gotowe', color: pal.accent, width: 320, height: 100, fontSize: 40, resolution: opts.pixelRatio, onTap: opts.onClose });
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
    this.cards = itemsOf(kind).map((item, i) => {
      const view = new Container();
      const bg = new Graphics();
      const tex = this.opts.previews.get(item.id);
      const art = tex ? new Sprite({ texture: tex, anchor: 0.5 }) : new Graphics().circle(0, 0, 50).fill({ color: 0x777777 });
      if (tex) art.scale.set(Math.min(170 / tex.width, 140 / tex.height));
      art.y = -40;
      const name = this.text(32, pal.surface);
      name.text = item.name;
      name.y = 66;
      const state = this.text(28, pal.accent);
      state.y = 106;
      view.addChild(bg, art, name, state);
      view.position.set((i % 2 === 0 ? -1 : 1) * (CARD_W / 2 + 12), (Math.floor(i / 2) - 0.5) * (CARD_H + 20));
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.hitArea = new Rectangle(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      view.on('pointertap', () => this.opts.onTap(item.id));
      this.grid.addChild(view);
      return { id: item.id, view, bg, state };
    });
    if (this.save) this.refresh(this.save);
  }

  refresh(save: Save): void {
    this.save = save;
    this.bank.text = `${save.candies}`;
    for (const c of this.cards) {
      const item = itemsOf(this.kind).find((h) => h.id === c.id);
      if (!item) continue;
      const owned = save.owned.includes(c.id);
      const worn = save[item.kind] === c.id;
      const affordable = save.candies >= item.price;
      c.state.text = worn ? 'Założone ✓' : owned ? 'Załóż' : `${item.price} cukierków`;
      c.state.style.fill = worn ? '#8ee3a1' : owned ? pal.surface : affordable ? pal.accent : '#9a8fa8';
      const fill = worn ? 0x3d5a4a : 0x3a2c55;
      c.bg.clear().roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 28).fill({ color: fill }).stroke({ color: worn ? 0x8ee3a1 : hexToNumber(pal.ink), width: worn ? 6 : 5 });
    }
  }

  /** Za mało cukierków: karta się trzęsie i pokazuje, ile brakuje. */
  deny(id: string, missing: number): void {
    const c = this.cards.find((x) => x.id === id);
    if (!c) return;
    c.state.text = `brakuje ${missing}`;
    c.state.style.fill = '#ff6f8f';
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

  layout(view: View): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    const h = Math.min(view.height - view.safe.top - 30, 1080);
    const top = view.height - h;
    this.panel.clear().roundRect(10, top, view.width - 20, h + 40, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top + h * 0.5);
    this.title.position.set(-100, -h / 2 + 64);
    this.icon.position.set(150, -h / 2 + 64);
    this.bank.position.set(184, -h / 2 + 64);
    this.tabs.forEach((t, i) => t.button.position.set((i - 1.5) * 166, -h / 2 + 160));
    this.grid.position.set(0, 40);
    this.close.position.set(0, h / 2 - 84);
  }

  tick(dt: number): void {
    this.close.tick(dt);
    for (const t of this.tabs) t.button.tick(dt);
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
