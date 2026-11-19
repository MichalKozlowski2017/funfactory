import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Timers, Tweens } from '@funfactory/core';
import { popIn } from '@funfactory/kit2d';
import type { AchievementDef } from '../sim/achievements.ts';
import { hudText } from '../fx/hud-font.ts';

/** Puchar z kodu (Graphics): bez tekstur, rysuje się raz. */
export function trophy(size: number, color = 0xffd166): Graphics {
  const s = size / 64;
  const g = new Graphics();
  const ink = 0x1e1530;
  g.roundRect(-14 * s, 18 * s, 28 * s, 8 * s, 3 * s).fill({ color }).stroke({ color: ink, width: 3 * s });
  g.rect(-4 * s, 6 * s, 8 * s, 13 * s).fill({ color }).stroke({ color: ink, width: 3 * s });
  for (const side of [-1, 1]) g.circle(side * 18 * s, -12 * s, 8 * s).stroke({ color: ink, width: 7 * s }).circle(side * 18 * s, -12 * s, 8 * s).stroke({ color, width: 3.5 * s });
  g.moveTo(-20 * s, -24 * s)
    .lineTo(20 * s, -24 * s)
    .quadraticCurveTo(20 * s, 8 * s, 0, 8 * s)
    .quadraticCurveTo(-20 * s, 8 * s, -20 * s, -24 * s)
    .closePath()
    .fill({ color })
    .stroke({ color: ink, width: 3 * s, join: 'round' });
  g.roundRect(-12 * s, -20 * s, 5 * s, 18 * s, 2.5 * s).fill({ color: 0xffffff, alpha: 0.55 });
  return g;
}

/**
 * Powiadomienia o osiągnięciach: baner zjeżdża z góry, kolejka (jedno po drugim).
 * Tekst bitmapowy, bo pojawia się w trakcie gry (zwykły Text = wgrywanie tekstury, zacięcie).
 */
export class AchievementToasts extends Container {
  private readonly queue: { def: AchievementDef; itemName: string | null }[] = [];
  private busy = false;
  private readonly tweens: Tweens;
  private readonly timers: Timers;
  private readonly candyTex: Texture;
  private readonly onShow: (def: AchievementDef) => void;
  /** Środek górnej krawędzi banera (ustawia scena). */
  top = 0;
  width0 = 720;

  constructor(o: { tweens: Tweens; timers: Timers; candyTex: Texture; onShow: (def: AchievementDef) => void }) {
    super();
    this.tweens = o.tweens;
    this.timers = o.timers;
    this.candyTex = o.candyTex;
    this.onShow = o.onShow;
  }

  push(def: AchievementDef, itemName: string | null): void {
    this.queue.push({ def, itemName });
    if (!this.busy) this.next();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const { def, itemName } = item;
    const w = Math.min(640, this.width0 - 40);
    const h = itemName ? 168 : 132;
    const root = new Container();
    const bg = new Graphics()
      .roundRect(-w / 2, 0, w, h, 30)
      .fill({ color: 0x2b1e3f })
      .stroke({ color: 0xffd166, width: 5 });
    const cup = trophy(78);
    cup.position.set(-w / 2 + 62, h / 2 + 4);
    const head = hudText(26, '#ffd166');
    head.text = 'Osiągnięcie!';
    head.position.set(-w / 2 + 116, 16);
    const name = hudText(40, '#ffffff');
    name.text = def.name;
    name.position.set(-w / 2 + 116, 46);
    const reward = hudText(34, '#ffffff');
    reward.text = `+${def.reward}`;
    reward.anchor.set(1, 0);
    reward.position.set(w / 2 - 74, 50);
    const icon = new Sprite({ texture: this.candyTex, anchor: 0.5 });
    icon.scale.set(44 / Math.max(this.candyTex.width, this.candyTex.height));
    icon.position.set(w / 2 - 44, 70);
    root.addChild(bg, cup, head, name, reward, icon);
    if (itemName) {
      const extra = hudText(28, '#8ee3a1');
      extra.text = `Nowość w szafie: ${itemName}`;
      extra.position.set(-w / 2 + 116, 104);
      root.addChild(extra);
    }
    // Długie nazwy: zmieść w banerze.
    const room = w / 2 - 74 - reward.width - 18 - (-w / 2 + 116);
    if (name.width > room) name.scale.set(room / name.width);
    root.position.set(this.width0 / 2, this.top - h - 30);
    this.addChild(root);
    this.onShow(def);
    this.tweens.to(root, { y: this.top }, { duration: 0.45, ease: 'backOut' });
    void popIn(this.tweens, cup, 0.5);
    this.timers.after(2.8, () => this.tweens.to(root, { y: this.top - h - 30, alpha: 0 }, { duration: 0.35, ease: 'quadIn' }));
    this.timers.after(3.2, () => {
      this.tweens.killOf(root);
      this.tweens.killOf(cup.scale);
      root.destroy({ children: true });
      this.next();
    });
  }
}
