import { Container, Graphics, Rectangle, Sprite, Text, type Texture } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import type { Tweens } from '@funfactory/core';
import { Button, popIn, type View } from '@funfactory/kit2d';
import { HATS, type Save } from '../sim/shop.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const CARD_W = 290;
const CARD_H = 300;

interface Card {
  id: string;
  view: Container;
  bg: Graphics;
  state: Text;
}

export interface ShopOptions {
  hats: Map<string, Texture | null>;
  candyTex: Texture;
  pixelRatio: number;
  tweens: Tweens;
  onTap: (id: string) => void;
  onClose: () => void;
}

/** Sklep z czapkami: 4 karty, stan konta, zamknięcie. */
export class ShopPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly title: Text;
  private readonly bank: Text;
  private readonly icon: Sprite;
  private readonly close: Button;
  private readonly cards: Card[] = [];
  private readonly opts: ShopOptions;

  constructor(opts: ShopOptions) {
    super();
    this.opts = opts;
    this.dim.eventMode = 'static'; // blokuje dotyk pod spodem
    this.title = this.text(56, pal.surface);
    this.title.text = 'Czapki';
    this.bank = this.text(40, pal.surface);
    this.bank.anchor.set(0, 0.5);
    this.icon = new Sprite({ texture: opts.candyTex, anchor: 0.5 });
    this.icon.scale.set(52 / Math.max(opts.candyTex.width, opts.candyTex.height));
    this.close = new Button({ label: 'Gotowe', color: pal.accent, width: 320, height: 100, fontSize: 40, resolution: opts.pixelRatio, onTap: opts.onClose });

    HATS.forEach((hat, i) => {
      const view = new Container();
      const bg = new Graphics();
      const tex = opts.hats.get(hat.id);
      const art = tex ? new Sprite({ texture: tex, anchor: 0.5 }) : new Graphics().circle(0, 0, 50).fill({ color: 0x777777 });
      if (tex) art.scale.set(Math.min(170 / tex.width, 150 / tex.height));
      art.y = -40;
      const name = this.text(32, pal.surface);
      name.text = hat.name;
      name.y = 70;
      const state = this.text(28, pal.accent);
      state.y = 112;
      view.addChild(bg, art, name, state);
      view.position.set((i % 2 === 0 ? -1 : 1) * (CARD_W / 2 + 12), (Math.floor(i / 2) - 0.5) * (CARD_H + 24));
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.hitArea = new Rectangle(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      view.on('pointertap', () => opts.onTap(hat.id));
      this.body.addChild(view);
      this.cards.push({ id: hat.id, view, bg, state });
    });
    this.body.addChild(this.title, this.icon, this.bank, this.close);
    this.addChild(this.dim, this.panel, this.body);
  }

  refresh(save: Save): void {
    this.bank.text = `${save.candies}`;
    for (const c of this.cards) {
      const hat = HATS.find((h) => h.id === c.id);
      if (!hat) continue;
      const owned = save.owned.includes(c.id);
      const worn = save.hat === c.id;
      const affordable = save.candies >= hat.price;
      c.state.text = worn ? 'Założona ✓' : owned ? 'Załóż' : `${hat.price} cukierków`;
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
    this.opts.tweens.to(c.view, { x: x + 14 }, { duration: 0.05, yoyo: true, repeat: 5, ease: 'linear' }).done.then(() => (c.view.x = x));
  }

  celebrate(id: string): void {
    const c = this.cards.find((x) => x.id === id);
    if (c) void popIn(this.opts.tweens, c.view, 0.35);
  }

  layout(view: View): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    const h = Math.min(view.height - view.safe.top - 40, 1000);
    const top = view.height - h;
    this.panel.clear().roundRect(10, top, view.width - 20, h + 40, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top + h * 0.5);
    this.title.position.set(-100, -h / 2 + 70);
    this.icon.position.set(150, -h / 2 + 70);
    this.bank.position.set(184, -h / 2 + 70);
    this.close.position.set(0, h / 2 - 90);
  }

  tick(dt: number): void {
    this.close.tick(dt);
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
