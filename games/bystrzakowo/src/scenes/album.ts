import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, shadowOf, type Art } from '../assets.ts';
import { ITEMS } from '../sim/catalog.ts';
import { state } from '../state.ts';
import { COLORS, cover, IconButton, label, sfx } from '../ui.ts';

const COLS = 6;
const ROWS = 3;
const PER_PAGE = COLS * ROWS;
let albumIntroduced = false;

/** Album naklejek: zdobyte obrazki w kolorze, brakujące jako cienie. Strony przewijane strzałkami albo gestem. */
export class AlbumScene extends Scene {
  readonly id = 'album';
  private art!: Art;
  private bg!: Sprite;
  private paper = new Graphics();
  private title!: Text;
  private counter!: Text;
  private readonly grid = new Container();
  private home!: IconButton;
  private prev!: IconButton;
  private next!: IconButton;
  private page = 0;
  private readonly pages = Math.ceil(ITEMS.length / PER_PAGE);
  private dragX: number | null = null;
  private leaving = false;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    const pr = this.game.pixelRatio;
    this.bg = new Sprite(this.art.playBg.polana);
    this.title = label('Album', 64, pr, '#ff8fb1');
    const owned = new Set(state.progress.stickers).size;
    this.counter = label(`${owned} / ${ITEMS.length}`, 40, pr, '#ffd23f');
    this.home = new IconButton('home');
    this.home.onTap = () => this.leave();
    this.prev = new IconButton('next', 46);
    this.prev.scale.x = -1;
    this.prev.onTap = () => this.turn(-1);
    this.next = new IconButton('next', 46);
    this.next.onTap = () => this.turn(1);
    this.addChild(this.bg, this.paper, this.grid, this.title, this.counter, this.home, this.prev, this.next);
    // Gest: przeciągnięcie w bok przewraca stronę.
    this.eventMode = 'static';
    this.on('pointerdown', (e) => (this.dragX = e.global.x));
    this.on('pointerup', (e) => {
      if (this.dragX === null) return;
      const dx = (e.global.x - this.dragX) / this.game.root.scale.x;
      this.dragX = null;
      if (Math.abs(dx) > 120) this.turn(dx < 0 ? 1 : -1);
    });
    await this.build();
    this.game.markReady();
    if (!albumIntroduced) {
      albumIntroduced = true;
      this.timers.after(0.4, () => say(this.game, 'lusia', 'album'));
    }
  }

  private async build(): Promise<void> {
    const items = ITEMS.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    const owned = new Set(state.progress.stickers);
    const shadows = await Promise.all(items.map((i) => (owned.has(i.id) ? null : shadowOf(i.id))));
    this.grid.removeChildren().forEach((c) => c.destroy({ children: true }));
    items.forEach((item, i) => {
      const cell = new Container();
      const has = owned.has(item.id);
      const plate = new Graphics();
      cell.addChild(plate);
      const sprite = new Sprite({ texture: has ? this.art.items.get(item.id)! : shadows[i]!, anchor: 0.5 });
      sprite.alpha = has ? 1 : 0.22;
      cell.addChild(sprite);
      cell.label = has ? 'have' : 'miss';
      if (has) {
        cell.eventMode = 'static';
        cell.cursor = 'pointer';
        cell.on('pointertap', () => {
          haptics.tap();
          sfx.pop(this.game.sound);
          void squash(this.tweens, sprite, 0.2);
          say(this.game, 'lusia', `item-${item.id}`);
        });
      }
      this.grid.addChild(cell);
      void popIn(this.tweens, cell, 0.3, i * 0.02);
    });
    this.layout();
    this.prev.visible = this.page > 0;
    this.next.visible = this.page < this.pages - 1;
  }

  private turn(dir: number): void {
    const page = Math.max(0, Math.min(this.pages - 1, this.page + dir));
    if (page === this.page) return;
    this.page = page;
    sfx.pop(this.game.sound, dir > 0 ? 1.1 : 0.9);
    haptics.tap();
    void this.build();
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.game.sound.stopChannel('voice');
    void import('./world.ts').then(({ WorldScene }) => this.game.scenes.go(new WorldScene(), { fade: 0.3, color: 0xfff6e8 }));
  }

  private layout(): void {
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 175;
    const right = w - safe.right - 175;
    const top = 150;
    const bottom = h - 40;
    const cell = Math.min((right - left) / COLS, (bottom - top) / ROWS);
    const gw = cell * COLS;
    const gh = cell * ROWS;
    const x0 = (left + right) / 2 - gw / 2;
    const y0 = top + (bottom - top - gh) / 2;
    this.paper
      .clear()
      .roundRect(x0 - 24, y0 - 24, gw + 48, gh + 48, 36)
      .fill({ color: 0xfffaf2, alpha: 0.95 })
      .stroke({ color: COLORS.ink, width: 6 });
    this.grid.children.forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cont = c as Container;
      cont.position.set(x0 + (col + 0.5) * cell, y0 + (row + 0.5) * cell);
      const plate = cont.children[0] as Graphics;
      const s = cell * 0.88;
      plate
        .clear()
        .roundRect(-s / 2, -s / 2, s, s, s * 0.18)
        .fill({ color: cont.label === 'have' ? 0xfff1c2 : 0xf1ece4 })
        .stroke({ color: cont.label === 'have' ? COLORS.sun : 0xd9d0c3, width: 4 });
      const sprite = cont.children[1] as Sprite;
      const t = sprite.texture;
      sprite.scale.set((s * 0.82) / Math.max(t.width, t.height));
    });
    this.prev.position.set(safe.left + 70, h / 2 + 40);
    this.next.position.set(w - safe.right - 70, h / 2 + 40);
  }

  override update(dt: number): void {
    this.home.tick(dt);
    this.prev.tick(dt);
    this.next.tick(dt);
  }

  override resize(view: View): void {
    cover(this.bg, view.width, view.height);
    this.title.position.set(view.width / 2, view.safe.top + 70);
    this.counter.position.set(view.width - view.safe.right - 120, view.safe.top + 70);
    this.home.position.set(view.safe.left + 80, view.safe.top + 75);
    if (this.grid.children.length) this.layout();
  }
}
