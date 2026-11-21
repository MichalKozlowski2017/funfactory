import { Container, Graphics, Sprite, type Text, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, shadowOf, startMusic, type Art } from '../assets.ts';
import { playable, type PuzzleKind } from '../sim/puzzles.ts';
import { isPuzzle, REALMS, type Activity } from '../sim/realms.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, label, sfx } from '../ui.ts';
import { ParentGate, ParentPanel } from '../parent.ts';
import { AlbumScene } from './album.ts';
import { JigsawScene } from './jigsaw.ts';
import { PuzzleScene } from './puzzle.ts';
import { SortScene } from './sort.ts';

/** Obrazek na zakładce krainy (obiekt z katalogu). */
const TAB_ICON: Record<string, string> = { polana: 'kwiatek', warsztat: 'klocek' };
/** Kolor zakładki krainy. */
const TAB_COLOR: Record<string, number> = { polana: 0x7ad7a0, warsztat: 0xf0a960 };

/**
 * Świat Bystrzakowa: krainy przewijane w bok (gest albo zakładki u góry). Każda kraina to inny rodzaj
 * zabawy, a w niej domki albo stanowiska. Przewodnicy, album i strefa rodzica są wspólne.
 */
export class WorldScene extends Scene {
  readonly id = 'world';
  private art!: Art;
  /** Dwa tła do przenikania przy zmianie krainy. */
  private bgs: Sprite[] = [];
  private readonly pages = new Container();
  private readonly houses = new Map<Activity, Container>();
  private realm = 0;
  private title!: Text;
  private readonly tabs: Container[] = [];
  private lusia!: Sprite;
  private bazyl!: Sprite;
  private album!: Container;
  private particles!: Particles;
  private leaving = false;
  private gate!: ParentGate;
  private parentPanel: ParentPanel | null = null;
  private swipeX: number | null = null;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    const catShadow = await shadowOf('kot');
    const pr = this.game.pixelRatio;
    this.realm = Math.max(0, Math.min(REALMS.length - 1, state.progress.realm ?? 0));
    this.bgs = [new Sprite(this.art.realmBg[REALMS[this.realm]!.id]), new Sprite(this.art.realmBg[REALMS[this.realm]!.id])];
    this.bgs[1]!.alpha = 0;
    this.addChild(...this.bgs, this.pages);

    REALMS.forEach((realm) => {
      const page = new Container();
      for (const kind of realm.rows.flat()) {
        const house = new Container();
        const sprite = new Sprite({ texture: this.art.houses[kind], anchor: { x: 0.5, y: 1 } });
        // Domki są wysokie, stanowiska Warsztatu szerokie: mieszczą się w ramce 340×300.
        sprite.scale.set(Math.min(300 / sprite.texture.height, 340 / sprite.texture.width));
        const emblem = this.emblem(kind, catShadow);
        emblem.y = -sprite.height - 30;
        house.addChild(sprite, emblem);
        house.eventMode = 'static';
        house.cursor = 'pointer';
        house.on('pointertap', () => this.open(kind, house));
        // Domek bez treści (brakuje obrazków w katalogu) się nie pokazuje.
        house.visible = !isPuzzle(kind) || playable(kind, this.game.rng);
        this.houses.set(kind, house);
        page.addChild(house);
      }
      this.pages.addChild(page);
    });

    // Zakładki krain i nazwa bieżącej.
    this.title = label(REALMS[this.realm]!.name, 56, pr, '#ffb347');
    REALMS.forEach((realm, i) => {
      const tab = new Container();
      tab.addChild(new Graphics());
      const tex = this.art.items.get(TAB_ICON[realm.id] ?? '');
      if (tex) {
        const pic = new Sprite({ texture: tex, anchor: 0.5 });
        pic.scale.set(58 / Math.max(tex.width, tex.height));
        tab.addChild(pic);
      }
      tab.eventMode = 'static';
      tab.cursor = 'pointer';
      tab.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 56 * 56 };
      tab.on('pointertap', () => this.goRealm(i));
      this.tabs.push(tab);
      this.addChild(tab);
    });
    this.addChild(this.title);
    this.drawTabs();

    this.lusia = new Sprite({ texture: this.art.lusia, anchor: { x: 0.5, y: 1 } });
    this.bazyl = new Sprite({ texture: this.art.bazyl, anchor: { x: 0.5, y: 1 } });
    for (const [guide, sprite] of [
      ['lusia', this.lusia],
      ['bazyl', this.bazyl],
    ] as const) {
      sprite.scale.set(330 / sprite.texture.height);
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointertap', () => {
        haptics.tap();
        void squash(this.tweens, sprite, 0.12);
        say(this.game, guide, 'witaj');
      });
      this.addChild(sprite);
      idleBreath(this.tweens, sprite, 0.03, 1.8 + (guide === 'bazyl' ? 0.3 : 0));
    }

    this.album = this.albumButton();
    this.addChild(this.album);

    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.addChild(this.particles.view);

    this.gate = new ParentGate();
    this.gate.onOpen = () => this.openParent();
    this.addChild(this.gate);

    // Gest w bok przełącza krainę. Pierwsze dotknięcie: muzyka i powitanie.
    this.eventMode = 'static';
    this.on('pointerdown', (e) => {
      this.swipeX = e.global.x;
      startMusic(this.game);
      if (state.greeted) return;
      state.greeted = true;
      this.timers.after(0.15, () => say(this.game, 'lusia', 'witaj'));
    });
    const endSwipe = (x: number) => {
      if (this.swipeX === null || this.parentPanel) return;
      const dx = (x - this.swipeX) / this.game.root.scale.x;
      this.swipeX = null;
      if (Math.abs(dx) > 120) this.goRealm(this.realm + (dx < 0 ? 1 : -1));
    };
    this.on('pointerup', (e) => endSwipe(e.global.x));
    this.on('pointerupoutside', (e) => endSwipe(e.global.x));
    this.game.markReady();
  }

  private albumButton(): Container {
    const pr = this.game.pixelRatio;
    const album = new Container();
    const book = new Graphics()
      .roundRect(-62, -48, 124, 96, 16)
      .fill({ color: 0xff8fb1 })
      .stroke({ color: COLORS.ink, width: 6 })
      .rect(-6, -48, 12, 96)
      .fill({ color: 0xe86a92 })
      .star(0, -2, 5, 30, 14)
      .fill({ color: COLORS.sun })
      .stroke({ color: COLORS.ink, width: 4, join: 'round' });
    const count: Text = label(String(state.progress.stickers.length), 40, pr);
    count.position.set(0, 72);
    album.addChild(book, count);
    album.eventMode = 'static';
    album.cursor = 'pointer';
    album.hitArea = { contains: (x: number, y: number) => Math.abs(x) < 80 && y > -70 && y < 100 };
    album.on('pointertap', () => {
      if (this.leaving) return;
      this.leaving = true;
      haptics.hit();
      sfx.pop(this.game.sound);
      void squash(this.tweens, album, 0.2);
      this.timers.after(0.25, () => void this.game.scenes.go(new AlbumScene(), { fade: 0.3, color: 0xfff6e8 }));
    });
    this.tweens.to(album, { rotation: 0.06 }, { duration: 1.2, yoyo: true, repeat: -1, ease: 'sineInOut' });
    return album;
  }

  /** Zmiana krainy: strony przesuwają się, tła przenikają, przewodnik krainy wita. */
  goRealm(i: number): void {
    if (i < 0 || i >= REALMS.length || i === this.realm || this.leaving) return;
    this.realm = i;
    state.progress.realm = i;
    void saveState();
    const realm = REALMS[i]!;
    haptics.tap();
    sfx.pop(this.game.sound, 1 + i * 0.1);
    this.tweens.killOf(this.pages);
    this.tweens.to(this.pages, { x: -i * this.game.view.width }, { duration: 0.45, ease: 'cubicInOut' });
    // Tło: nowe na wierzchu rozjaśnia się, potem staje się dolnym.
    const [back, front] = this.bgs as [Sprite, Sprite];
    front.texture = this.art.realmBg[realm.id];
    cover(front, this.game.view.width, this.game.view.height);
    front.alpha = 0;
    this.tweens.killOf(front);
    void this.tweens.to(front, { alpha: 1 }, { duration: 0.45 }).done.then(() => {
      back.texture = front.texture;
      cover(back, this.game.view.width, this.game.view.height);
      front.alpha = 0;
    });
    this.title.text = realm.name;
    void popIn(this.tweens, this.title, 0.35);
    this.drawTabs();
    const guide = realm.guide === 'lusia' ? this.lusia : this.bazyl;
    void squash(this.tweens, guide, 0.12);
    say(this.game, realm.guide, `kraina-${realm.id}`);
  }

  private drawTabs(): void {
    this.tabs.forEach((tab, i) => {
      const active = i === this.realm;
      const r = active ? 46 : 38;
      (tab.children[0] as Graphics)
        .clear()
        .circle(0, 5, r)
        .fill({ color: 0x000000, alpha: 0.15 })
        .circle(0, 0, r)
        .fill({ color: active ? TAB_COLOR[REALMS[i]!.id] ?? COLORS.sun : 0xfffaf2 })
        .stroke({ color: COLORS.ink, width: active ? 6 : 4 });
      tab.alpha = active ? 1 : 0.85;
    });
  }

  /** Znak na domku: co tam za zabawa (dziecko nie czyta, więc obrazkiem). */
  private emblem(kind: Activity, catShadow: Texture): Container {
    const c = new Container();
    c.addChild(new Graphics().circle(0, 0, 50).fill({ color: COLORS.card }).stroke({ color: COLORS.ink, width: 6 }));
    const pr = this.game.pixelRatio;
    if (kind === 'cienie') {
      const s = new Sprite({ texture: catShadow, anchor: 0.5 });
      s.scale.set(76 / Math.max(s.texture.width, s.texture.height));
      c.addChild(s);
    } else if (kind === 'pasuje') c.addChild(label('?', 64, pr, '#ff7a8a'));
    else if (kind === 'liczenie') c.addChild(label('123', 40, pr, '#5cb3ff'));
    else if (kind === 'gloski') c.addChild(label('Aa', 48, pr, '#9b5de5'));
    else if (kind === 'kolory') {
      const g = new Graphics();
      [0xe8413c, 0xffd23f, 0x3d8bff, 0x4cbf56].forEach((color, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.circle(Math.cos(a) * 18, Math.sin(a) * 18, 15).fill({ color }).stroke({ color: COLORS.ink, width: 3 });
      });
      c.addChild(g);
    } else if (kind === 'mamy') c.addChild(hearts());
    else if (kind === 'sortowanie') {
      // Dwie skrzyneczki ze strzałką w dół.
      const g = new Graphics();
      for (const [x, color] of [
        [-18, 0xe8413c],
        [18, 0x3d8bff],
      ] as const)
        g.roundRect(x - 15, 4, 30, 22, 5).fill({ color }).stroke({ color: COLORS.ink, width: 3 });
      g.poly([-8, -26, 8, -26, 8, -14, 15, -14, 0, -2, -15, -14, -8, -14]).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 3, join: 'round' });
      c.addChild(g);
    } else if (kind === 'ukladanka') c.addChild(puzzlePiece());
    return c;
  }

  /** Playtest: wejście do zabawy (`eval:__ff.game.scenes.current.play('sortowanie')`). */
  play(kind: Activity): void {
    const i = REALMS.findIndex((r) => r.rows.some((row) => row.includes(kind)));
    if (i !== this.realm) {
      this.realm = i;
      this.pages.x = -i * this.game.view.width;
    }
    this.open(kind, this.houses.get(kind)!);
  }

  private open(kind: Activity, house: Container): void {
    if (this.leaving) return;
    this.leaving = true;
    startMusic(this.game);
    haptics.hit();
    sfx.pop(this.game.sound);
    void squash(this.tweens, house, 0.18);
    const p = this.toLocal(house.getGlobalPosition());
    this.particles.burst(p.x, p.y - 120, { count: 24, speed: [200, 520], life: [0.4, 0.8], gravity: 900, scale: [0.6, 1.2], colors: COLORS.confetti });
    const scene = isPuzzle(kind) ? new PuzzleScene(kind as PuzzleKind) : kind === 'sortowanie' ? new SortScene() : new JigsawScene();
    this.timers.after(0.35, () => void this.game.scenes.go(scene, { fade: 0.3, color: 0xfff6e8 }));
  }

  private openParent(): void {
    if (this.parentPanel) return;
    this.parentPanel = new ParentPanel(this.game, () => {
      this.parentPanel?.destroy({ children: true });
      this.parentPanel = null;
    });
    this.parentPanel.layout(this.game.view);
    this.addChild(this.parentPanel);
  }

  override update(dt: number): void {
    this.particles.update(dt);
    this.gate.tick(dt);
    this.parentPanel?.tick(dt);
  }

  override resize(view: View): void {
    const { width: w, height: h, safe } = view;
    for (const bg of this.bgs) cover(bg, w, h);
    const n = this.tabs.length;
    this.tabs.forEach((tab, i) => tab.position.set(w / 2 + (i - (n - 1) / 2) * 110, safe.top + 62));
    this.title.position.set(w / 2, safe.top + 145);
    const left = safe.left + 150;
    const right = w - safe.right - 150;
    this.lusia.position.set(left, h - 10);
    this.bazyl.position.set(right, h - 10);
    // Strony krain obok siebie; domki między przewodnikami.
    this.pages.x = -this.realm * w;
    const span = right - left - 230;
    REALMS.forEach((realm, r) => {
      const place = (kinds: Activity[], y: number, maxScale: number) => {
        const scale = Math.min(maxScale, span / kinds.length / 270);
        kinds.forEach((kind, i) => {
          const house = this.houses.get(kind)!;
          house.position.set(r * w + left + 115 + (span * (i + 0.5)) / kinds.length, y);
          house.scale.set(scale);
        });
      };
      if (realm.rows.length > 1) {
        place(realm.rows[0]!, h * 0.5 + 75, 0.62);
        place(realm.rows[1]!, h - 40, 0.9);
      } else place(realm.rows[0]!, h - 70, 1.25);
    });
    this.album.position.set(w - safe.right - 110, 90 + safe.top);
    this.gate.position.set(safe.left + 60, 60 + safe.top);
    this.parentPanel?.layout(view);
  }
}

/** Mamy i dzieci: dwa serduszka, duże i małe. */
function hearts(): Container {
  const c = new Container();
  const draw = (g: Graphics, s: number) =>
    g
      .moveTo(0, s * 0.45)
      .bezierCurveTo(-s * 1.1, -s * 0.25, -s * 0.5, -s * 1.05, 0, -s * 0.4)
      .bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.25, 0, s * 0.45)
      .fill({ color: 0xff6f91 })
      .stroke({ color: COLORS.ink, width: 3 });
  const big = draw(new Graphics(), 30);
  big.position.set(-8, 4);
  const small = draw(new Graphics(), 17);
  small.position.set(22, 16);
  c.addChild(big, small);
  return c;
}

/** Kawałek puzzla (znak układanki). */
function puzzlePiece(): Graphics {
  const g = new Graphics();
  const s = 22;
  g.moveTo(-s, -s)
    .lineTo(-s * 0.35, -s)
    .arc(0, -s, s * 0.35, Math.PI, 0)
    .lineTo(s, -s)
    .lineTo(s, -s * 0.35)
    .arc(s, 0, s * 0.35, -Math.PI / 2, Math.PI / 2)
    .lineTo(s, s)
    .lineTo(-s, s)
    .closePath()
    .fill({ color: 0x9b5de5 })
    .stroke({ color: COLORS.ink, width: 4, join: 'round' });
  return g;
}
