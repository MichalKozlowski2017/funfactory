import { Container, Graphics, Sprite, type FederatedPointerEvent } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, popOut, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, startMusic, type Art } from '../assets.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, IconButton, sfx } from '../ui.ts';

/** Naklejki zawsze dostępne na start (zanim dziecko coś zbierze). */
const STARTERS = ['slonce', 'chmurka', 'drzewo', 'kwiatek', 'kot', 'pies'];
const TRAY_H = 150;
const PER_PAGE = 7;
const STICKER = 130;

interface Placed {
  view: Sprite;
  id: string;
}

let introduced = false;

/**
 * Naklejanka (Pracownia Malucha): swobodna zabawa bez zadań. Na dole pasek z zebranymi naklejkami;
 * przeciągnięcie naklejki na łąkę zostawia ją tam, dotknięcie odwraca, odłożenie na pasek usuwa.
 * Obrazek zapisuje się w postępach i czeka na powrót.
 */
export class StickerScene extends Scene {
  readonly id = 'stickers';
  private art!: Art;
  private bg!: Sprite;
  private readonly board = new Container();
  private readonly tray = new Container();
  private readonly trayBg = new Graphics();
  private readonly trayItems = new Container();
  private home!: IconButton;
  private prev!: IconButton;
  private next!: IconButton;
  private owned: string[] = [];
  private page = 0;
  private placed: Placed[] = [];
  private drag: { p: Placed; dx: number; dy: number; id: number; moved: boolean; x0: number; y0: number } | null = null;
  private leaving = false;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    this.bg = new Sprite(this.art.realmBg.polana);
    this.owned = [...new Set([...STARTERS, ...state.progress.stickers])].filter((id) => this.art.items.has(id));
    this.home = new IconButton('home');
    this.home.onTap = () => this.leave();
    this.prev = new IconButton('next', 40);
    this.prev.scale.x = -1;
    this.prev.onTap = () => this.turn(-1);
    this.next = new IconButton('next', 40);
    this.next.onTap = () => this.turn(1);
    this.tray.addChild(this.trayBg, this.trayItems, this.prev, this.next);
    this.addChild(this.bg, this.board, this.tray, this.home);
    this.eventMode = 'static';
    this.on('globalpointermove', (e) => this.move(e));
    this.on('pointerup', (e) => this.up(e));
    this.on('pointerupoutside', (e) => this.up(e));
    this.on('pointerdown', () => startMusic(this.game));
    // Zapisany obrazek.
    const { width: w, height: h } = this.game.view;
    for (const s of state.progress.scene ?? []) if (this.art.items.has(s.id)) this.place(s.id, s.x * w, s.y * h, s.flip);
    this.buildTray();
    this.game.markReady();
    if (!introduced) {
      introduced = true;
      this.timers.after(0.4, () => say(this.game, 'lusia', 'naklejanka'));
    }
  }

  private buildTray(): void {
    this.trayItems.removeChildren().forEach((c) => c.destroy());
    const pages = Math.max(1, Math.ceil(this.owned.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    this.owned.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((id, i) => {
      const s = new Sprite({ texture: this.art.items.get(id)!, anchor: 0.5 });
      s.scale.set(100 / Math.max(s.texture.width, s.texture.height));
      s.eventMode = 'static';
      s.cursor = 'grab';
      s.label = id;
      // Złapanie naklejki z paska: na łące pojawia się jej kopia i idzie za palcem.
      s.on('pointerdown', (e) => this.grabFromTray(id, e));
      this.trayItems.addChild(s);
      void popIn(this.tweens, s, 0.25, i * 0.03);
    });
    this.prev.visible = this.page > 0;
    this.next.visible = this.page < pages - 1;
    this.layoutTray();
  }

  private turn(dir: number): void {
    this.page += dir;
    sfx.pop(this.game.sound, dir > 0 ? 1.1 : 0.9);
    this.buildTray();
  }

  private place(id: string, x: number, y: number, flip = false): Placed {
    const view = new Sprite({ texture: this.art.items.get(id)!, anchor: 0.5 });
    const k = STICKER / Math.max(view.texture.width, view.texture.height);
    view.scale.set(flip ? -k : k, k);
    view.position.set(x, y);
    view.eventMode = 'static';
    view.cursor = 'grab';
    const p: Placed = { view, id };
    view.on('pointerdown', (e) => this.grab(p, e));
    this.board.addChild(view);
    this.placed.push(p);
    return p;
  }

  private grabFromTray(id: string, e: FederatedPointerEvent): void {
    if (this.drag) return;
    const at = this.toLocal(e.global);
    const p = this.place(id, at.x, at.y);
    haptics.tap();
    sfx.pop(this.game.sound, 1.2);
    void popIn(this.tweens, p.view, 0.2);
    this.drag = { p, dx: 0, dy: 0, id: e.pointerId, moved: true, x0: at.x, y0: at.y };
  }

  private grab(p: Placed, e: FederatedPointerEvent): void {
    if (this.drag) return;
    const at = this.toLocal(e.global);
    this.board.addChild(p.view); // na wierzch
    this.drag = { p, dx: p.view.x - at.x, dy: p.view.y - at.y, id: e.pointerId, moved: false, x0: at.x, y0: at.y };
    haptics.tap();
  }

  private move(e: FederatedPointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const at = this.toLocal(e.global);
    if (Math.hypot(at.x - d.x0, at.y - d.y0) > 12) d.moved = true;
    d.p.view.position.set(at.x + d.dx, at.y + d.dy);
  }

  private up(e: FederatedPointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    const v = d.p.view;
    if (!d.moved) {
      // Dotknięcie: naklejka odwraca się w drugą stronę.
      v.scale.x *= -1;
      void squash(this.tweens, v, 0.15);
      sfx.pop(this.game.sound, 1.3);
    } else if (v.y > this.tray.y - 20) {
      // Odłożona na pasek: znika.
      this.placed = this.placed.filter((p) => p !== d.p);
      sfx.pop(this.game.sound, 0.7);
      void popOut(this.tweens, v).then(() => v.destroy());
    } else {
      sfx.plop(this.game.sound);
      haptics.hit();
      void squash(this.tweens, v, 0.15);
    }
    this.save();
  }

  private save(): void {
    const { width: w, height: h } = this.game.view;
    state.progress.scene = this.placed.map((p) => ({ id: p.id, x: p.view.x / w, y: p.view.y / h, flip: p.view.scale.x < 0 }));
    void saveState();
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.save();
    this.game.sound.stopChannel('voice');
    void import('./world.ts').then(({ WorldScene }) => this.game.scenes.go(new WorldScene(), { fade: 0.3, color: 0xfff6e8 }));
  }

  private layoutTray(): void {
    const { width: w, safe } = this.game.view;
    const left = safe.left + 90;
    const right = w - safe.right - 90;
    this.trayItems.children.forEach((c, i) => c.position.set(left + 40 + ((right - left - 80) * (i + 0.5)) / PER_PAGE, TRAY_H / 2));
    this.prev.position.set(safe.left + 50, TRAY_H / 2);
    this.next.position.set(w - safe.right - 50, TRAY_H / 2);
  }

  override update(dt: number): void {
    this.home.tick(dt);
    this.prev.tick(dt);
    this.next.tick(dt);
  }

  override resize(view: View): void {
    cover(this.bg, view.width, view.height);
    this.home.position.set(view.safe.left + 80, view.safe.top + 75);
    this.tray.y = view.height - TRAY_H;
    this.trayBg
      .clear()
      .rect(0, 0, view.width, TRAY_H)
      .fill({ color: 0xfffaf2, alpha: 0.92 })
      .moveTo(0, 0)
      .lineTo(view.width, 0)
      .stroke({ color: COLORS.ink, width: 6 });
    this.layoutTray();
  }
}
