import { Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, Particles, popIn, popOut, pulse, Scene, setRestScale, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, startMusic, type Art } from '../assets.ts';
import { addPicture, gallery, stickerScale, LANDSCAPES, MAX_PICTURES, removePicture, type Landscape, type Picture } from '../sim/stickers.ts';
import { logTask } from '../log.ts';
import { loadLandscapes, pictureView, STICKER, TRAY_H } from '../picture.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, IconButton, sfx } from '../ui.ts';

/** Stickers always available from the start (before the child collects any). */
const STARTERS = ['sun', 'cloud', 'tree', 'little-flower', 'cat', 'dog'];
const PER_PAGE = 7;

interface Placed {
  view: Sprite;
  id: string;
  flip: boolean;
}

let introduced = false;

/**
 * Sticker scene (Toddler's Studio): free play without tasks. At the bottom a tray with collected stickers;
 * dragging a sticker onto the picture leaves it there, a tap flips it, dropping it into the trash or
 * onto the tray removes it. Stickers higher up are smaller (farther), lower ones are bigger and in front.
 * At the top: landscape picker, picture gallery and new picture. Everything saves automatically.
 */
export class StickerScene extends Scene {
  readonly id = 'stickers';
  private art!: Art;
  private readonly bgs: Sprite[] = [];
  private readonly board = new Container();
  private readonly tray = new Container();
  private readonly trayBg = new Graphics();
  private readonly trayItems = new Container();
  private readonly overlay = new Container();
  private home!: IconButton;
  private prev!: IconButton;
  private next!: IconButton;
  private trash!: IconButton;
  private tools: IconButton[] = [];
  private particles!: Particles;
  private readonly landscapes = new Map<Landscape, Texture>();
  private bg: Landscape = 'meadow';
  private owned: string[] = [];
  private page = 0;
  private placed: Placed[] = [];
  private drag: { p: Placed; dx: number; dy: number; id: number; moved: boolean; x0: number; y0: number } | null = null;
  private overTrash = false;
  private leaving = false;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    for (const [l, tex] of await loadLandscapes(this.art)) this.landscapes.set(l, tex);
    this.bgs.push(new Sprite(this.art.realmBg.meadow), new Sprite(this.art.realmBg.meadow));
    this.board.sortableChildren = true;
    this.owned = [...new Set([...STARTERS, ...state.progress.stickers])].filter((id) => this.art.items.has(id));
    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);

    this.home = new IconButton('home');
    this.home.onTap = () => this.leave();
    this.prev = new IconButton('next', 40);
    this.prev.scale.x = -1;
    this.prev.onTap = () => this.turn(-1);
    this.next = new IconButton('next', 40);
    this.next.onTap = () => this.turn(1);
    this.trash = new IconButton('trash', 58, 0xff8a8a);
    this.trash.visible = false;
    this.trash.eventMode = 'none';
    const landscape = new IconButton('landscape', 46, 0x8fc8ff);
    landscape.onTap = () => this.openLandscapes();
    const galleryBtn = new IconButton('gallery', 46, 0xc89bff);
    galleryBtn.onTap = () => this.openGallery();
    const plus = new IconButton('plus', 46);
    plus.onTap = () => this.newPicture();
    this.tools = [landscape, galleryBtn, plus];

    this.tray.addChild(this.trayBg, this.trayItems, this.prev, this.next);
    this.addChild(...this.bgs, this.trash, this.board, this.tray, this.home, ...this.tools, this.particles.view, this.overlay);
    this.eventMode = 'static';
    this.on('globalpointermove', (e) => this.move(e));
    this.on('pointerup', (e) => this.up(e));
    this.on('pointerupoutside', (e) => this.up(e));
    // iOS cancels a touch (second finger, system gesture, palm on the screen) without a "release": end the drag.
    this.on('pointercancel', () => this.endDrag());
    const cancel = () => this.endDrag();
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    this.dispose = () => {
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
    this.on('pointerdown', () => startMusic(this.game));

    this.load(gallery(state.progress).current, false);
    this.buildTray();
    this.game.markReady();
    if (!introduced) {
      introduced = true;
      this.timers.after(0.4, () => say(this.game, 'lusia', 'stickers'));
    }
  }

  // ——— Pictures ———

  private get picture(): Picture {
    const g = gallery(state.progress);
    return g.pictures[g.current]!;
  }

  /** Loads a picture from the gallery (background and stickers). */
  private load(index: number, animate = true): void {
    state.progress.picture = index;
    for (const p of this.placed) p.view.destroy();
    this.placed = [];
    const pic = this.picture;
    this.setBg(this.landscapes.has(pic.bg) ? pic.bg : 'meadow', animate);
    const { width: w, height: h } = this.game.view;
    for (const s of pic.items) if (this.art.items.has(s.id)) {
      const p = this.place(s.id, s.x * w, s.y * h, s.flip);
      if (animate) void popIn(this.tweens, p.view, 0.25, this.game.rng.range(0, 0.2));
    }
  }

  private setBg(l: Landscape, animate = true): void {
    const old = this.landscapes.get(this.bg) ?? this.art.realmBg.meadow;
    this.bg = l;
    const [under, over] = this.bgs as [Sprite, Sprite];
    // Crossfade: the old background underneath, the new one on top fades in.
    under.texture = animate ? old : this.landscapes.get(l)!;
    over.texture = this.landscapes.get(l)!;
    this.tweens.killOf(over);
    over.alpha = animate ? 0 : 1;
    if (animate) this.tweens.to(over, { alpha: 1 }, { duration: 0.4 });
    for (const b of this.bgs) cover(b, this.game.view.width, this.game.view.height);
  }

  private newPicture(): void {
    this.save();
    const i = addPicture(state.progress, this.bg);
    if (i === null) {
      // Full gallery: show it so something can be removed.
      sfx.pop(this.game.sound, 0.7);
      this.openGallery();
      return;
    }
    sfx.good(this.game.sound);
    haptics.success();
    this.particles.burst(this.game.view.width / 2, this.game.view.height / 2, { count: 40, speed: [200, 600], life: [0.4, 0.9], gravity: 600, scale: [0.6, 1.2], colors: COLORS.confetti });
    this.load(i);
    void saveState();
  }

  private save(): void {
    const { width: w, height: h } = this.game.view;
    const pic = this.picture;
    pic.bg = this.bg;
    pic.items = [...this.placed].sort((a, b) => a.view.y - b.view.y).map((p) => ({ id: p.id, x: p.view.x / w, y: p.view.y / h, flip: p.flip }));
    void saveState();
  }

  // ——— Stickers ———

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
      // Grabbing a sticker from the tray: a copy appears on the picture and follows the finger.
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

  /** Sticker scale depending on height (perspective) and direction. */
  private fit(p: Placed): void {
    const v = p.view;
    const area = this.game.view.height - TRAY_H;
    const k = (STICKER * stickerScale(p.id, v.y / area)) / Math.max(v.texture.width, v.texture.height);
    // Rest scale for animations (squash/popIn return to it, not to the initial size).
    this.tweens.killOf(v.scale);
    setRestScale(v, p.flip ? -k : k, k);
    v.zIndex = v.y;
  }

  private place(id: string, x: number, y: number, flip = false): Placed {
    const view = new Sprite({ texture: this.art.items.get(id)!, anchor: 0.5 });
    view.position.set(x, y);
    view.eventMode = 'static';
    view.cursor = 'grab';
    const p: Placed = { view, id, flip };
    this.fit(p);
    view.on('pointerdown', (e) => this.grab(p, e));
    this.board.addChild(view);
    this.placed.push(p);
    return p;
  }

  private grabFromTray(id: string, e: FederatedPointerEvent): void {
    // A previous drag without a "release" (lost event) must not block the scene.
    if (this.drag) this.endDrag();
    const at = this.toLocal(e.global);
    const p = this.place(id, at.x, at.y);
    haptics.tap();
    sfx.pop(this.game.sound, 1.2);
    p.view.zIndex = 1e6;
    this.drag = { p, dx: 0, dy: 0, id: e.pointerId, moved: true, x0: at.x, y0: at.y };
    this.showTrash(true);
  }

  private grab(p: Placed, e: FederatedPointerEvent): void {
    if (this.drag) this.endDrag();
    const at = this.toLocal(e.global);
    p.view.zIndex = 1e6; // on top while dragging
    this.drag = { p, dx: p.view.x - at.x, dy: p.view.y - at.y, id: e.pointerId, moved: false, x0: at.x, y0: at.y };
    haptics.tap();
  }

  private move(e: FederatedPointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const at = this.toLocal(e.global);
    if (!d.moved && Math.hypot(at.x - d.x0, at.y - d.y0) > 12) {
      d.moved = true;
      this.showTrash(true);
    }
    const v = d.p.view;
    v.position.set(at.x + d.dx, at.y + d.dy);
    this.fit(d.p);
    v.zIndex = 1e6;
    // Small trash radius: a sticker placed near the right edge of the picture must not land in the trash by accident.
    const over = this.trash.visible && Math.hypot(v.x - this.trash.x, v.y - this.trash.y) < 70;
    if (over !== this.overTrash) {
      this.overTrash = over;
      this.tweens.killOf(this.trash.scale);
      this.tweens.to(this.trash.scale, { x: over ? 1.3 : 1, y: over ? 1.3 : 1 }, { duration: 0.15, ease: 'backOut' });
      if (over) haptics.tap();
    }
  }

  private up(e: FederatedPointerEvent): void {
    if (this.drag && e.pointerId === this.drag.id) this.endDrag();
  }

  /** End of drag (finger released or touch cancelled). */
  private endDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const p = d.p;
    const v = p.view;
    if (!d.moved) {
      // Tap: the sticker flips to face the other way.
      p.flip = !p.flip;
      this.fit(p);
      void squash(this.tweens, v, 0.15);
      sfx.pop(this.game.sound, 1.3);
    } else if (this.overTrash || v.y > this.tray.y - 20) {
      // Into the trash or back onto the tray: disappears with a puff.
      this.placed = this.placed.filter((x) => x !== p);
      sfx.pop(this.game.sound, 0.6);
      haptics.hit();
      this.particles.burst(v.x, v.y, { count: 18, speed: [120, 360], life: [0.3, 0.6], gravity: 200, scale: [0.6, 1.2], colors: [0xffffff, 0xdddddd, 0xffc94a] });
      if (this.overTrash) void squash(this.tweens, this.trash, 0.25);
      void popOut(this.tweens, v).then(() => v.destroy());
    } else {
      this.fit(p);
      sfx.plop(this.game.sound);
      haptics.hit();
      void squash(this.tweens, v, 0.15);
    }
    this.showTrash(false);
    this.save();
  }

  private trashShown = false;

  private showTrash(on: boolean): void {
    this.overTrash = false;
    if (on === this.trashShown) return;
    this.trashShown = on;
    this.tweens.killOf(this.trash.scale);
    if (on) {
      this.trash.visible = true;
      this.trash.scale.set(0);
      this.tweens.to(this.trash.scale, { x: 1, y: 1 }, { duration: 0.2, ease: 'backOut' });
    } else
      void this.tweens.to(this.trash.scale, { x: 0, y: 0 }, { duration: 0.15, ease: 'quadIn' }).done.then(() => {
        if (!this.trashShown) this.trash.visible = false;
      });
  }

  // ——— Overlays: landscapes and gallery ———

  /** Dimmed backdrop with a panel; tapping outside the panel closes it. */
  private openOverlay(build: (panel: Container, w: number, h: number) => void): void {
    this.closeOverlay();
    const { width: w, height: h } = this.game.view;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0x2a1a10, alpha: 0.55 });
    dim.eventMode = 'static';
    dim.on('pointertap', () => this.closeOverlay(true));
    const panel = new Container();
    this.overlay.addChild(dim, panel);
    build(panel, w, h);
    dim.alpha = 0;
    this.tweens.to(dim, { alpha: 1 }, { duration: 0.2 });
    sfx.whoosh(this.game.sound);
  }

  private closeOverlay(sound = false): void {
    if (sound && this.overlay.children.length) sfx.pop(this.game.sound, 0.8);
    this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
  }

  private openLandscapes(): void {
    this.openOverlay((panel, w, h) => {
      const list = LANDSCAPES.filter((l) => this.landscapes.has(l));
      const cols = Math.min(4, list.length);
      const rows = Math.ceil(list.length / cols);
      const gap = 24;
      const cw = Math.min(260, (w - 200 - gap * (cols - 1)) / cols);
      const ch = cw * 0.6;
      const scale = Math.min(1, (h - 120) / (rows * (ch + gap)));
      panel.scale.set(scale);
      panel.position.set(w / 2, h / 2);
      list.forEach((l, i) => {
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, list.length - row * cols);
        const card = this.thumb({ bg: l, items: [] }, cw, ch, l === this.bg);
        card.position.set(((i % cols) - (inRow - 1) / 2) * (cw + gap), (row - (rows - 1) / 2) * (ch + gap));
        card.on('pointertap', () => {
          haptics.tap();
          sfx.pop(this.game.sound, 1.1);
          this.setBg(l);
          this.save();
          this.closeOverlay();
        });
        panel.addChild(card);
        void popIn(this.tweens, card, 0.25, i * 0.04);
      });
    });
  }

  private openGallery(): void {
    this.save();
    this.openOverlay((panel, w, h) => {
      const g = gallery(state.progress);
      const n = g.pictures.length + (g.pictures.length < MAX_PICTURES ? 1 : 0);
      const cols = 4;
      const rows = Math.ceil(n / cols);
      const gap = 24;
      const cw = Math.min(340, (w - 200 - gap * (cols - 1)) / cols);
      // Card in screen proportions: the thumbnail shows the whole picture (at 0.6 stickers near the edges were cut off).
      const ch = (cw * h) / w;
      panel.scale.set(Math.min(1, (h - 80) / (rows * (ch + gap))));
      panel.position.set(w / 2, h / 2);
      const at = (i: number) => {
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, n - row * cols);
        return { x: ((i % cols) - (inRow - 1) / 2) * (cw + gap), y: (row - (rows - 1) / 2) * (ch + gap) };
      };
      g.pictures.forEach((pic, i) => {
        const card = this.thumb(pic, cw, ch, i === g.current);
        card.position.set(at(i).x, at(i).y);
        card.on('pointertap', () => {
          haptics.tap();
          sfx.pop(this.game.sound, 1.1);
          this.closeOverlay();
          this.load(i);
          void saveState();
        });
        // Trash: the first tap arms it (the trash turns red and jumps to the opposite corner of the card, the card shakes);
        // only a tap on the trash in its new spot deletes. A series of quick taps in one spot does not delete the work.
        const del = new IconButton('trash', 30, 0xfffaf2);
        const rest = { x: cw / 2 - 12, y: -ch / 2 + 12 };
        del.position.set(rest.x, rest.y);
        let armed = false;
        del.onTap = () => {
          if (!armed) {
            armed = true;
            sfx.pop(this.game.sound, 0.8);
            del.tint = 0xff6b6b;
            del.position.set(-cw / 2 + 12, ch / 2 - 12);
            void this.tweens.to(card, { rotation: 0.05 }, { duration: 0.06, yoyo: true, repeat: 5 }).done.then(() => (card.rotation = 0));
            this.timers.after(4, () => {
              armed = false;
              if (del.destroyed) return;
              del.tint = 0xffffff;
              del.position.set(rest.x, rest.y);
            });
            return;
          }
          sfx.pop(this.game.sound, 0.6);
          haptics.hit();
          removePicture(state.progress, i);
          void saveState();
          this.load(gallery(state.progress).current, false);
          this.openGallery();
        };
        del.on('pointertap', (e) => e.stopPropagation());
        card.addChild(del);
        panel.addChild(card);
        void popIn(this.tweens, card, 0.25, i * 0.03);
      });
      if (g.pictures.length < MAX_PICTURES) {
        const add = new Container();
        add.addChild(
          new Graphics()
            .roundRect(-cw / 2, -ch / 2, cw, ch, 22)
            .fill({ color: 0xfffaf2, alpha: 0.7 })
            .stroke({ color: COLORS.ink, width: 5, alpha: 0.6 }),
        );
        const plus = new IconButton('plus', 40);
        plus.eventMode = 'none';
        add.addChild(plus);
        add.eventMode = 'static';
        add.cursor = 'pointer';
        add.on('pointertap', () => {
          this.closeOverlay();
          this.newPicture();
        });
        add.position.set(at(g.pictures.length).x, at(g.pictures.length).y);
        panel.addChild(add);
        void popIn(this.tweens, add, 0.25, g.pictures.length * 0.03);
      } else void pulse(this.tweens, panel, 0.05, 0.4);
    });
  }

  /** Picture thumbnail: background cropped to the card and stickers in the same proportions. */
  private thumb(pic: Picture, cw: number, ch: number, current: boolean): Container {
    const card = new Container();
    const { width: w, height: h } = this.game.view;
    const k = Math.max(cw / w, ch / h);
    const inner = pictureView(pic, w, h, this.art, this.landscapes);
    inner.scale.set(k);
    inner.position.set(-(w * k) / 2, -(h * k) / 2);
    const mask = new Graphics().roundRect(-cw / 2, -ch / 2, cw, ch, 22).fill({ color: 0xffffff });
    inner.mask = mask;
    const frame = new Graphics()
      .roundRect(-cw / 2, -ch / 2 + 6, cw, ch, 22)
      .fill({ color: 0x000000, alpha: 0.2 })
      .roundRect(-cw / 2, -ch / 2, cw, ch, 22)
      .stroke({ color: current ? COLORS.sun : 0xfffaf2, width: current ? 10 : 7 });
    card.addChild(frame, inner, mask);
    const outline = new Graphics().roundRect(-cw / 2, -ch / 2, cw, ch, 22).stroke({ color: current ? COLORS.sun : 0xfffaf2, width: current ? 10 : 7 });
    card.addChild(outline);
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new Rectangle(-cw / 2, -ch / 2, cw, ch);
    return card;
  }

  // ——— Rest ———

  private dispose: (() => void) | null = null;

  override exit(): void {
    this.dispose?.();
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.save();
    if (this.placed.length) logTask('stickers', 0);
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

  /** Playtest: stickers at a few spots of the picture. */
  demo(): void {
    const { width: w, height: h } = this.game.view;
    this.owned.slice(0, 6).forEach((id, i) => this.place(id, w * (0.2 + i * 0.12), h * (0.3 + (i % 3) * 0.18)));
    this.save();
  }

  override update(dt: number): void {
    this.particles.update(dt);
    this.home.tick(dt);
    this.prev.tick(dt);
    this.next.tick(dt);
    this.trash.tick(dt);
    for (const t of this.tools) t.tick(dt);
    for (const c of this.overlay.children) for (const x of c.children) for (const y of x.children ?? []) if (y instanceof IconButton) y.tick(dt);
  }

  override resize(view: View): void {
    for (const b of this.bgs) cover(b, view.width, view.height);
    this.home.position.set(view.safe.left + 80, view.safe.top + 75);
    this.tools.forEach((t, i) => t.position.set(view.width - view.safe.right - 70 - (this.tools.length - 1 - i) * 115, view.safe.top + 70));
    this.tray.y = view.height - TRAY_H;
    this.trash.position.set(view.width - view.safe.right - 110, view.height - TRAY_H - 90);
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
