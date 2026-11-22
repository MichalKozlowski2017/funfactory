import { Container, Graphics, Sprite, type Text, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, shadowOf, startMusic, stopMusic, type Art } from '../assets.ts';
import { playable, type PuzzleKind } from '../sim/puzzles.ts';
import { ACTIVITY_NAMES, isPuzzle, realmOf, REALMS, type Activity } from '../sim/realms.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, label, sfx } from '../ui.ts';
import { ParentGate, ParentPanel } from '../parent.ts';
import { realmIsOpen } from '../premium.ts';
import { lang } from '../sim/lang.ts';
import { journal, today } from '../log.ts';
import { addTask, addTime, noteFact, playDaysAfter, shiftDay } from '../sim/journal.ts';
import { extend, timeIsUp } from '../session.ts';
import { AlbumScene } from './album.ts';
import { ColoringScene } from './coloring.ts';
import { DotsScene } from './dots.ts';
import { EmotionScene } from './emotions.ts';
import { JigsawScene } from './jigsaw.ts';
import { MazeScene } from './maze.ts';
import { LetterScene } from './letters.ts';
import { MelodyScene } from './melody.ts';
import { MemoryScene } from './memory.ts';
import { PatternScene } from './patterns.ts';
import { PuzzleScene } from './puzzle.ts';
import { drawShape, ShapeScene } from './shapes.ts';
import { SortScene } from './sort.ts';
import { StoryScene } from './stories.ts';
import { SyllableScene } from './syllables.ts';
import { StickerScene } from './stickers.ts';
import { tr } from '../sim/i18n.ts';

/** Obrazek na zakładce krainy (obiekt z katalogu). */
const TAB_ICON: Record<string, string> = { polana: 'kwiatek', warsztat: 'klocek', sciezka: 'grzyb', pracownia: 'tecza' };
/** Kolor zakładki krainy. */
const TAB_COLOR: Record<string, number> = { polana: 0x7ad7a0, warsztat: 0xf0a960, sciezka: 0x8fb8ff, pracownia: 0xff8fc0 };

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
  /** Ekran „dobranoc” po limicie czasu (zdejmuje go tylko rodzic zębatką). */
  private sleep: Container | null = null;
  /** Kontenery przewodników (pozycja i skala zależne od ekranu). */
  private readonly guideBoxes: Container[] = [];

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
      const color = TAB_COLOR[realm.id] ?? COLORS.sun;
      for (const kind of realm.rows.flat()) {
        // Kafelek 300×300 (skalowany w resize): jasna karta, obrazek stanowiska, znaczek zabawy w rogu.
        const house = new Container();
        const plate = new Graphics()
          .roundRect(-150, -142, 300, 300, 48)
          .fill({ color: 0x000000, alpha: 0.18 })
          .roundRect(-150, -150, 300, 300, 48)
          .fill({ color: COLORS.card })
          .stroke({ color, width: 14 })
          .roundRect(-150, -150, 300, 300, 48)
          .stroke({ color: COLORS.ink, width: 5, alpha: 0.6 });
        const sprite = new Sprite({ texture: this.art.houses[kind], anchor: 0.5 });
        sprite.scale.set(Math.min(190 / sprite.texture.height, 240 / sprite.texture.width));
        sprite.y = -14;
        // Podpis zabawy na dole kafelka.
        const name = label(tr(ACTIVITY_NAMES[kind]), 40, pr * 2, '#ffffff');
        name.scale.set(Math.min(1, 260 / name.width));
        name.y = 112;
        const emblem = this.emblem(kind, catShadow);
        emblem.position.set(-118, -118);
        emblem.scale.set(0.85);
        house.addChild(plate, sprite, name, emblem);
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
    this.applyLocks();

    // Zakładki krain i nazwa bieżącej.
    this.title = label(tr(REALMS[this.realm]!.name), 56, pr, '#ffb347');
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
      // Postać w kontenerze: resize skaluje i przesuwa kontener, a animacje postaci działają na jej własnej skali.
      const box = new Container();
      box.addChild(sprite);
      this.guideBoxes.push(box);
      this.addChild(box);
      idleBreath(this.tweens, sprite, 0.03, 1.8 + (guide === 'bazyl' ? 0.3 : 0));
    }

    this.album = this.albumButton();
    this.addChild(this.album);

    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.addChild(this.particles.view);

    this.gate = new ParentGate(this.art.gear);
    this.gate.onOpen = () => (this.sleep ? this.wake() : this.openParent());
    // Kropka przy zębatce: od ostatniej wizyty rodzica były co najmniej 3 dni zabawy.
    this.gate.setBadge(playDaysAfter(journal(), state.progress.parentSeen ?? '') >= 3);
    this.addChild(this.gate);

    // Gest w bok przełącza krainę. Pierwsze dotknięcie: muzyka i powitanie.
    this.eventMode = 'static';
    this.on('pointerdown', (e) => {
      this.swipeX = e.global.x;
      startMusic(this.game);
      if (state.greeted) return;
      state.greeted = true;
      this.timers.after(0.15, () => {
        const len = say(this.game, 'lusia', 'witaj');
        // Pierwsze uruchomienie: Bazyl pokazuje zakładki krain (podskakują).
        if (state.progress.rounds === 0)
          this.timers.after(len + 0.4, () => {
            say(this.game, 'bazyl', 'krainy');
            this.tabs.forEach((t, i) => this.timers.after(0.6 + i * 0.25, () => void squash(this.tweens, t, 0.35)));
          });
      });
    });
    const endSwipe = (x: number) => {
      if (this.swipeX === null || this.parentPanel) return;
      const dx = (x - this.swipeX) / this.game.root.scale.x;
      this.swipeX = null;
      if (Math.abs(dx) > 120) this.goRealm(this.realm + (dx < 0 ? 1 : -1));
    };
    this.on('pointerup', (e) => endSwipe(e.global.x));
    this.on('pointerupoutside', (e) => endSwipe(e.global.x));
    if (timeIsUp()) this.goodnight();
    this.game.markReady();
  }

  /** Koniec czasu zabawy: noc nad krainą, przewodnicy zasypiają, dotyk zablokowany (poza zębatką rodzica). */
  private goodnight(): void {
    const { width: w, height: h } = this.game.view;
    const o = new Container();
    o.eventMode = 'static';
    const night = new Graphics().rect(0, 0, w, h).fill({ color: 0x1d1a4a, alpha: 0.72 });
    const moon = new Graphics().poly(crescent(70, 30, -22, 62)).fill({ color: 0xfff3b0 });
    moon.position.set(w / 2, h * 0.3);
    o.addChild(night, moon);
    for (let i = 0; i < 24; i++) {
      const star = new Graphics().star(0, 0, 5, 9, 4).fill({ color: 0xfff3b0 });
      star.position.set(this.game.rng.range(40, w - 40), this.game.rng.range(30, h * 0.55));
      star.alpha = this.game.rng.range(0.4, 1);
      this.tweens.to(star, { alpha: 0.2 }, { duration: this.game.rng.range(0.8, 1.8), yoyo: true, repeat: -1, ease: 'sineInOut' });
      o.addChild(star);
    }
    const text = label(tr('Dobranoc!'), 72, this.game.pixelRatio, '#fff3b0', '#1d1a4a');
    text.position.set(w / 2, h * 0.52);
    o.addChild(text);
    // Zzz nad przewodnikami.
    for (const guide of [this.lusia, this.bazyl]) {
      guide.tint = 0x9a94c8;
      const box = guide.parent!;
      for (let k = 0; k < 3; k++) {
        const z = label('z', 34 + k * 8, this.game.pixelRatio, '#ffffff', '#1d1a4a');
        z.position.set(box.x + (40 + k * 26) * box.scale.x, box.y - (330 + k * 30) * box.scale.y);
        z.alpha = 0;
        this.tweens.to(z, { alpha: 1, y: z.y - 20 }, { duration: 1.2, delay: k * 0.4, yoyo: true, repeat: -1, ease: 'sineInOut' });
        o.addChild(z);
      }
    }
    this.sleep = o;
    this.addChild(o);
    this.addChild(this.gate);
    this.timers.after(0.6, () => say(this.game, 'lusia', 'dobranoc'));
    stopMusic(this.game);
  }

  /** Playtest: ekran dobranoc (`eval:__ff.game.scenes.current.night()`). */
  night(): void {
    this.goodnight();
  }

  /** Rodzic przedłuża zabawę (zębatka). */
  private wake(): void {
    extend();
    this.sleep?.destroy({ children: true });
    this.sleep = null;
    this.lusia.tint = 0xffffff;
    this.bazyl.tint = 0xffffff;
    startMusic(this.game);
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
    this.title.text = tr(realm.name);
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
    else if (kind === 'emocje') {
      // Uśmiechnięta buźka.
      const g = new Graphics().circle(0, 0, 30).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 3 }).circle(-10, -6, 4).fill({ color: COLORS.ink }).circle(10, -6, 4).fill({ color: COLORS.ink }).arc(0, 2, 14, 0.2, Math.PI - 0.2).stroke({ color: COLORS.ink, width: 4, cap: 'round' });
      c.addChild(g);
    } else if (kind === 'litery') c.addChild(label('A', 52, pr, '#9b5de5'));
    else if (kind === 'ksztalty') {
      const g = new Graphics();
      drawShape(g.clear(), 'kolo', 26).fill({ color: 0xe8413c }).stroke({ color: COLORS.ink, width: 3 });
      const t = drawShape(new Graphics(), 'trojkat', 26).fill({ color: 0xffd23f }).stroke({ color: COLORS.ink, width: 3 });
      const q = drawShape(new Graphics(), 'kwadrat', 26).fill({ color: 0x3d8bff }).stroke({ color: COLORS.ink, width: 3 });
      g.position.set(-18, -10);
      t.position.set(16, -10);
      q.position.set(0, 16);
      c.addChild(g, t, q);
    } else if (kind === 'cyfry') c.addChild(label('3', 52, pr, '#5cb3ff'));
    else if (kind === 'sylaby') c.addChild(label('MA', 40, pr, '#ff8fb1'));
    else if (kind === 'historyjki') {
      // Trzy kadry obok siebie.
      const g = new Graphics();
      [0, 1, 2].forEach((i) => g.roundRect(-30 + i * 21, -13, 18, 26, 4).fill({ color: [0xa8e6a1, 0xffd166, 0xff8fb1][i]! }).stroke({ color: COLORS.ink, width: 3 }));
      c.addChild(g);
    }
    else if (kind === 'kolorowanka') {
      // Paleta z kleksami farb.
      const g = new Graphics().ellipse(0, 4, 32, 24).fill({ color: 0xf3d9a8 }).stroke({ color: COLORS.ink, width: 3 });
      [0xe8413c, 0xffd23f, 0x3d8bff, 0x7ad35a].forEach((color, i) => g.circle(-16 + (i % 2) * 22 + (i > 1 ? 6 : 0), -6 + Math.floor(i / 2) * 16, 7).fill({ color }));
      c.addChild(g);
    } else if (kind === 'melodia') {
      // Trzy sztabki cymbałków.
      const g = new Graphics();
      [0xe8413c, 0xffd23f, 0x3d8bff].forEach((color, i) => g.roundRect(-26 + i * 18, -22 + i * 6, 14, 44 - i * 12, 5).fill({ color }).stroke({ color: COLORS.ink, width: 3 }));
      c.addChild(g);
    } else if (kind === 'naklejanka') {
      // Naklejka-gwiazdka z zagiętym rogiem.
      const g = new Graphics().star(0, 2, 5, 30, 15).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 3, join: 'round' }).circle(0, 2, 8).fill({ color: 0xff7a8a });
      c.addChild(g);
    }
    else if (kind === 'wzory') {
      // Koraliki we wzorze i znak zapytania.
      const g = new Graphics();
      [0xff7a8a, 0x5cb3ff, 0xff7a8a, 0x5cb3ff].forEach((color, i) => g.circle(-27 + i * 15, 0, 7).fill({ color }).stroke({ color: COLORS.ink, width: 2 }));
      c.addChild(g);
      const q = label('?', 30, pr, '#ff7a8a');
      q.x = 33;
      c.addChild(q);
    } else if (kind === 'memory') {
      // Dwie karty: rewers i odkryta.
      const g = new Graphics()
        .roundRect(-30, -22, 30, 40, 6)
        .fill({ color: 0x9b7be0 })
        .stroke({ color: COLORS.ink, width: 3 })
        .roundRect(2, -18, 30, 40, 6)
        .fill({ color: 0xfffaf2 })
        .stroke({ color: COLORS.ink, width: 3 })
        .star(-15, -2, 5, 8, 4)
        .fill({ color: COLORS.sun })
        .circle(17, 2, 8)
        .fill({ color: 0xff7a8a });
      c.addChild(g);
    } else if (kind === 'kropki') {
      // Trzy kropki połączone linią.
      const g = new Graphics().moveTo(-24, 14).lineTo(0, -20).lineTo(24, 14).stroke({ color: 0xff7a8a, width: 5, cap: 'round', join: 'round' });
      for (const [x, y] of [
        [-24, 14],
        [0, -20],
        [24, 14],
      ] as const)
        g.circle(x, y, 9).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 3 });
      c.addChild(g);
    } else if (kind === 'labirynt') {
      // Mały labirynt: zakręcona ścieżka.
      const g = new Graphics()
        .roundRect(-28, -28, 56, 56, 8)
        .stroke({ color: 0x4fa65a, width: 6 })
        .moveTo(-28, -8)
        .lineTo(8, -8)
        .moveTo(-8, 10)
        .lineTo(28, 10)
        .stroke({ color: 0x4fa65a, width: 6, cap: 'round' });
      c.addChild(g);
    }
    return c;
  }

  /** Playtest: wejście do zabawy (`eval:__ff.game.scenes.current.play('sortowanie', 2)`; poziom opcjonalny). */
  play(kind: Activity, level?: number): void {
    if (level !== undefined) state.progress.levels[kind] = level;
    const i = REALMS.findIndex((r) => r.rows.some((row) => row.includes(kind)));
    if (i !== this.realm) {
      this.realm = i;
      this.pages.x = -i * this.game.view.width;
    }
    this.open(kind, this.houses.get(kind)!);
  }

  /**
   * Krainy po próbie bez pełnej wersji „śpią”: przyciemnione kafelki z księżycem i „Zzz”.
   * Wołane też po zakupie w strefie rodzica (kafelki się budzą).
   */
  applyLocks(): void {
    const NIGHT_TINT = 0x8a86b8;
    for (const realm of REALMS) {
      const open = realmIsOpen(realm.id);
      for (const kind of realm.rows.flat()) {
        const house = this.houses.get(kind);
        if (!house) continue;
        const night = house.getChildByLabel('night');
        // Przyciemnienie przez tint całego kafelka (z kółkiem w rogu, które wystaje poza płytkę).
        for (const ch of house.children) if (ch.label !== 'night') ch.tint = open ? 0xffffff : NIGHT_TINT;
        if (open) {
          night?.destroy({ children: true });
          continue;
        }
        if (night) continue;
        const o = new Container();
        o.label = 'night';
        o.eventMode = 'none';
        const moon = new Graphics().poly(crescent(38, 16, -12, 34)).fill({ color: 0xfff3b0 }).stroke({ color: COLORS.ink, width: 4 });
        moon.position.set(92, -92);
        o.addChild(moon);
        for (let k = 0; k < 3; k++) {
          const z = label('z', 30 + k * 8, this.game.pixelRatio, '#ffffff', '#1d1a4a');
          z.position.set(20 + k * 30, -40 - k * 28);
          this.tweens.to(z, { alpha: 0.25, y: z.y - 12 }, { duration: 1.4, delay: k * 0.35, yoyo: true, repeat: -1, ease: 'sineInOut' });
          o.addChild(z);
        }
        house.addChild(o);
      }
    }
  }

  /** Śpiąca kraina: kafelek się kołysze, Lusia mówi, żeby poprosić rodzica (zakup jest za bramką). */
  private sleepingTap(house: Container): void {
    haptics.tap();
    sfx.pop(this.game.sound, 0.6);
    void squash(this.tweens, house, 0.1);
    void squash(this.tweens, this.lusia, 0.12);
    say(this.game, 'lusia', 'kraina-spi');
  }

  private open(kind: Activity, house: Container): void {
    if (this.leaving) return;
    if (!realmIsOpen(realmOf(kind).id)) return this.sleepingTap(house);
    this.leaving = true;
    startMusic(this.game);
    haptics.hit();
    sfx.pop(this.game.sound);
    void squash(this.tweens, house, 0.18);
    const p = this.toLocal(house.getGlobalPosition());
    this.particles.burst(p.x, p.y, { count: 24, speed: [200, 520], life: [0.4, 0.8], gravity: 900, scale: [0.6, 1.2], colors: COLORS.confetti });
    const scenes: Record<string, () => Scene> = { memory: () => new MemoryScene(), emocje: () => new EmotionScene(), sortowanie: () => new SortScene(), ukladanka: () => new JigsawScene(), wzory: () => new PatternScene(), ksztalty: () => new ShapeScene(), sylaby: () => new SyllableScene(), historyjki: () => new StoryScene(), kropki: () => new DotsScene(), litery: () => new LetterScene('litery'), cyfry: () => new LetterScene('cyfry'), kolorowanka: () => new ColoringScene(), naklejanka: () => new StickerScene(), melodia: () => new MelodyScene(), labirynt: () => new MazeScene() };
    const scene = isPuzzle(kind) ? new PuzzleScene(kind as PuzzleKind) : scenes[kind]!();
    this.timers.after(0.35, () => void this.game.scenes.go(scene, { fade: 0.3, color: 0xfff6e8 }));
  }

  /** Playtest: przykładowy dziennik z tygodnia i strefa rodzica na zakładce `tab`. */
  demoParent(tab = 'postepy', name = 'Zosia'): void {
    const j = journal();
    const t = today();
    const rng = this.game.rng;
    for (let d = 0; d < 6; d++) {
      const day = shiftDay(t, -d);
      if (d === 2) continue;
      addTime(j, day, 300 + rng.int(0, 900));
      for (const a of ['liczenie', 'kolory', 'gloski', 'historyjki', 'wzory', 'kolorowanka', 'emocje'] as const) for (let i = rng.int(0, 4); i > 0; i--) addTask(j, day, a, rng.int(0, 1));
    }
    const facts: [string, string][] = [['liczba:1', '111'], ['liczba:2', '111'], ['liczba:3', '1111'], ['liczba:4', '0111'], ['liczba:5', '111'], ['liczba:6', '1010'], ['liczba:7', '0010'],
      ['kolor:czerwony', '111'], ['kolor:zielony', '111'], ['kolor:fioletowy', '1001'], ['gloska:a', '111'], ['gloska:m', '111'], [lang() === 'pl' ? 'gloska:sz' : 'gloska:r', '0101'],
      ['litera:A', '11'], ['litera:M', '1'], ['litera:O', '1'], ['emocja:wesoly', '111'], ['emocja:smutny', '111'], ['emocja:zdziwiony', '01'], ['ksztalt:kolo', '111'], ['ksztalt:gwiazda', '0']];
    for (const [f, h] of facts) for (const c of h) noteFact(j, t, f, c === '1');
    state.progress.childName = name || undefined;
    this.openParent();
    (this.parentPanel as unknown as { setTab(t: string): void }).setTab(tab);
  }

  private openParent(): void {
    if (this.parentPanel) return;
    state.progress.parentSeen = today();
    void saveState();
    this.gate.setBadge(false);
    this.parentPanel = new ParentPanel(
      this.game,
      () => {
        this.parentPanel?.destroy({ children: true });
        this.parentPanel = null;
      },
      () => this.applyLocks(),
    );
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
    // Strony krain obok siebie; domki między przewodnikami.
    this.pages.x = -this.realm * w;
    // Siatka kafelków między przewodnikami, pod nazwą krainy; równe odstępy, nic na siebie nie nachodzi.
    // Na węższych ekranach (iPad 4:3) kafelki między przewodnikami byłyby za małe: wtedy zajmują całą
    // szerokość, a Lusia i Bazyl są mniejsi i stoją w dolnych rogach za kafelkami.
    const top = safe.top + 190;
    const bottom = h - safe.bottom - 24;
    const gap = 26;
    const maxCols = Math.max(...REALMS.map((realm) => Math.max(...realm.rows.map((row) => row.length))));
    const narrow = (right - left - 220 - gap * (maxCols - 1)) / maxCols < 200;
    const areaL = narrow ? safe.left + 40 : left + 110;
    const areaR = narrow ? w - safe.right - 40 : right - 110;
    const [lusiaBox, bazylBox] = this.guideBoxes as [Container, Container];
    for (const box of this.guideBoxes) box.scale.set(narrow ? 0.62 : 1);
    lusiaBox.position.set(narrow ? safe.left + 70 : left, h - 10);
    bazylBox.position.set(narrow ? w - safe.right - 70 : right, h - 10);
    // Na wąskim ekranie za kafelkami, na szerokim tuż nad nimi (jak dotąd).
    for (const box of this.guideBoxes) {
      this.removeChild(box);
      this.addChildAt(box, this.getChildIndex(this.pages) + (narrow ? 0 : 1));
    }
    REALMS.forEach((realm, r) => {
      const rows = realm.rows.length;
      const cols = Math.max(...realm.rows.map((row) => row.length));
      const size = Math.min(260, (areaR - areaL - gap * (cols - 1)) / cols, (bottom - top - gap * (rows - 1)) / rows);
      const cy = (top + bottom) / 2;
      realm.rows.forEach((row, ri) => {
        row.forEach((kind, i) => {
          const house = this.houses.get(kind)!;
          house.position.set(r * w + (areaL + areaR) / 2 + (i - (row.length - 1) / 2) * (size + gap), cy + (ri - (rows - 1) / 2) * (size + gap));
          house.scale.set(size / 300);
        });
      });
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

/** Rogalik księżyca: koło o promieniu `r` bez koła (cx, cy, ir). */
function crescent(r: number, cx: number, cy: number, ir: number): number[] {
  const pts: number[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (Math.hypot(x - cx, y - cy) >= ir) pts.push(x, y);
  }
  // Brzeg wewnętrzny (łuk wycinający) w odwrotnej kolejności.
  const inner: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * ir;
    const y = cy + Math.sin(a) * ir;
    if (Math.hypot(x, y) <= r) inner.push(x, y);
  }
  // Punkty zewnętrzne mogą być rozcięte w miejscu kąta 0: obróć tak, żeby zaczynały się za wycięciem.
  const outer: [number, number][] = [];
  for (let i = 0; i < pts.length; i += 2) outer.push([pts[i]!, pts[i + 1]!]);
  let cut = 0;
  for (let i = 1; i < outer.length; i++) if (Math.hypot(outer[i]![0] - outer[i - 1]![0], outer[i]![1] - outer[i - 1]![1]) > r * 0.2) cut = i;
  const ring = [...outer.slice(cut), ...outer.slice(0, cut)];
  const inn: [number, number][] = [];
  for (let i = 0; i < inner.length; i += 2) inn.push([inner[i]!, inner[i + 1]!]);
  let icut = 0;
  for (let i = 1; i < inn.length; i++) if (Math.hypot(inn[i]![0] - inn[i - 1]![0], inn[i]![1] - inn[i - 1]![1]) > ir * 0.2) icut = i;
  const iring = [...inn.slice(icut), ...inn.slice(0, icut)].reverse();
  return [...ring, ...iring].flat();
}
