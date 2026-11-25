import { Container, Graphics, Sprite, type Text, type Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, shadowOf, startMusic, stopMusic, type Art } from '../assets.ts';
import { playable, type PuzzleKind } from '../sim/puzzles.ts';
import { ACTIVITY_NAMES, isPuzzle, realmOf, REALMS, type Activity } from '../sim/realms.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, label, sfx } from '../ui.ts';
import { AdultCheck, ParentGate, ParentPanel } from '../parent.ts';
import { realmIsOpen } from '../premium.ts';
import { lang } from '../sim/lang.ts';
import { journal, today } from '../log.ts';
import { addTask, addTempo, addTime, noteFact, playDaysAfter, shiftDay } from '../sim/journal.ts';
import { extend, timeIsUp } from '../session.ts';
import { AlbumScene } from './album.ts';
import { drawShape } from './shapes.ts';
import { sceneFor } from './factory.ts';
import { tr } from '../sim/i18n.ts';
import { Hand } from '../hand.ts';
import { markHand, needsHand } from '../sim/onboarding.ts';

/** Picture on a realm tab (a catalog item). */
const TAB_ICON: Record<string, string> = { meadow: 'little-flower', workshop: 'block', path: 'mushroom', studio: 'rainbow' };
/** Realm tab color. */
const TAB_COLOR: Record<string, number> = { meadow: 0x7ad7a0, workshop: 0xf0a960, path: 0x8fb8ff, studio: 0xff8fc0 };

/**
 * Bystrzakowo world: realms scrolled sideways (swipe or tabs at the top). Each realm is a different kind of
 * activity, with houses or stations in it. The guides, album and parent zone are shared.
 */
export class WorldScene extends Scene {
  readonly id = 'world';
  private art!: Art;
  /** Two backgrounds for crossfading on realm change. */
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
  /** "Good night" screen after the time limit (only a parent can remove it with the gear). */
  private sleep: Container | null = null;
  /** Guide containers (position and scale depend on the screen). */
  private readonly guideBoxes: Container[] = [];
  /** Hand: on first launch it points at the first puzzle's house. */
  private hand!: Hand;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    const catShadow = await shadowOf('cat');
    const pr = this.game.pixelRatio;
    this.realm = Math.max(0, Math.min(REALMS.length - 1, state.progress.realm ?? 0));
    this.bgs = [new Sprite(this.art.realmBg[REALMS[this.realm]!.id]), new Sprite(this.art.realmBg[REALMS[this.realm]!.id])];
    this.bgs[1]!.alpha = 0;
    this.addChild(...this.bgs, this.pages);

    REALMS.forEach((realm) => {
      const page = new Container();
      const color = TAB_COLOR[realm.id] ?? COLORS.sun;
      for (const kind of realm.rows.flat()) {
        // 300x300 tile (scaled in resize): light card, station picture, activity badge in the corner.
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
        // Activity label at the bottom of the tile.
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
        // A house without content (missing pictures in the catalog) isn't shown.
        house.visible = !isPuzzle(kind) || playable(kind, this.game.rng);
        this.houses.set(kind, house);
        page.addChild(house);
      }
      this.pages.addChild(page);
    });
    this.applyLocks();

    // Realm tabs and the current realm's name.
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
        say(this.game, guide, 'hello');
      });
      // Character in a container: resize scales and moves the container, and the character's animations work on its own scale.
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
    // Entering the parent zone: just holding the gear (owner's decision). The multiplication question stays before a purchase,
    // sending pictures (askAdult in ParentPanel) and extending play time after the limit (a child could otherwise lift it).
    this.gate.onOpen = () => (this.sleep ? this.askAdult(() => this.wake()) : this.openParent());
    this.gate.onLocked = (n) => this.gateToast(n);
    // Dot by the gear: at least 3 play days since the parent's last visit.
    this.gate.setBadge(playDaysAfter(journal(), state.progress.parentSeen ?? '') >= 3);
    this.addChild(this.gate);

    // A sideways swipe switches the realm. First touch: music and welcome.
    this.eventMode = 'static';
    this.on('pointerdown', (e) => {
      this.swipeX = e.global.x;
      startMusic(this.game);
      if (state.greeted) return;
      state.greeted = true;
      this.timers.after(0.15, () => {
        // "Pick a house and let's play together!": on first launch the hand taps the first puzzle's house again.
        const len = say(this.game, 'lusia', 'hello');
        if (state.progress.rounds === 0) this.pointFirst();
        else this.timers.after(len + 0.4, () => this.introRealms());
      });
    });
    this.hand = new Hand(this.art.hand);
    this.addChild(this.hand);
    if (state.progress.rounds === 0) this.timers.after(0.8, () => this.pointFirst());
    // After the first round (the child returns to the world): Bazyl shows the tabs of the other realms.
    else if (state.greeted) this.timers.after(1, () => this.introRealms());
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

  /** End of play time: night over the realm, the guides fall asleep, touch blocked (except the parent's gear). */
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
    const text = label(tr('goodNight'), 72, this.game.pixelRatio, '#fff3b0', '#1d1a4a');
    text.position.set(w / 2, h * 0.52);
    o.addChild(text);
    // Zzz over the guides.
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
    this.timers.after(0.6, () => say(this.game, 'lusia', 'good-night'));
    stopMusic(this.game);
  }

  /** Playtest: good night screen (`eval:__ff.game.scenes.current.night()`). */
  night(): void {
    this.goodnight();
  }

  /** The parent extends play time (gear). */
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

  /** Realm change: pages slide, backgrounds crossfade, the realm's guide says hello. */
  goRealm(i: number): void {
    if (i < 0 || i >= REALMS.length || i === this.realm || this.leaving) return;
    this.realm = i;
    // The hand points at a house on the Meadow: it disappears outside it and comes back on return.
    this.hand.stop();
    if (i === 0) this.timers.after(0.6, () => this.pointFirst());
    state.progress.realm = i;
    void saveState();
    const realm = REALMS[i]!;
    haptics.tap();
    sfx.pop(this.game.sound, 1 + i * 0.1);
    this.tweens.killOf(this.pages);
    this.tweens.to(this.pages, { x: -i * this.game.view.width }, { duration: 0.45, ease: 'cubicInOut' });
    // Background: the new one on top fades in, then becomes the bottom one.
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
    say(this.game, realm.guide, `realm-${realm.id}`);
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

  /** Sign on a house: what activity is there (the child can't read, so it's a picture). */
  private emblem(kind: Activity, catShadow: Texture): Container {
    const c = new Container();
    c.addChild(new Graphics().circle(0, 0, 50).fill({ color: COLORS.card }).stroke({ color: COLORS.ink, width: 6 }));
    const pr = this.game.pixelRatio;
    if (kind === 'shadows') {
      const s = new Sprite({ texture: catShadow, anchor: 0.5 });
      s.scale.set(76 / Math.max(s.texture.width, s.texture.height));
      c.addChild(s);
    } else if (kind === 'matching') c.addChild(label('?', 64, pr, '#ff7a8a'));
    else if (kind === 'counting') c.addChild(label('123', 40, pr, '#5cb3ff'));
    else if (kind === 'phonemes') c.addChild(label('Aa', 48, pr, '#9b5de5'));
    else if (kind === 'colors') {
      const g = new Graphics();
      [0xe8413c, 0xffd23f, 0x3d8bff, 0x4cbf56].forEach((color, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.circle(Math.cos(a) * 18, Math.sin(a) * 18, 15).fill({ color }).stroke({ color: COLORS.ink, width: 3 });
      });
      c.addChild(g);
    } else if (kind === 'mothers') c.addChild(hearts());
    else if (kind === 'sorting') {
      // Two little crates with a down arrow.
      const g = new Graphics();
      for (const [x, color] of [
        [-18, 0xe8413c],
        [18, 0x3d8bff],
      ] as const)
        g.roundRect(x - 15, 4, 30, 22, 5).fill({ color }).stroke({ color: COLORS.ink, width: 3 });
      g.poly([-8, -26, 8, -26, 8, -14, 15, -14, 0, -2, -15, -14, -8, -14]).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 3, join: 'round' });
      c.addChild(g);
    } else if (kind === 'jigsaw') c.addChild(puzzlePiece());
    else if (kind === 'emotions') {
      // Smiling face.
      const g = new Graphics().circle(0, 0, 30).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 3 }).circle(-10, -6, 4).fill({ color: COLORS.ink }).circle(10, -6, 4).fill({ color: COLORS.ink }).arc(0, 2, 14, 0.2, Math.PI - 0.2).stroke({ color: COLORS.ink, width: 4, cap: 'round' });
      c.addChild(g);
    } else if (kind === 'letters') c.addChild(label('A', 52, pr, '#9b5de5'));
    else if (kind === 'shapes') {
      const g = new Graphics();
      drawShape(g.clear(), 'circle', 26).fill({ color: 0xe8413c }).stroke({ color: COLORS.ink, width: 3 });
      const t = drawShape(new Graphics(), 'triangle', 26).fill({ color: 0xffd23f }).stroke({ color: COLORS.ink, width: 3 });
      const q = drawShape(new Graphics(), 'square', 26).fill({ color: 0x3d8bff }).stroke({ color: COLORS.ink, width: 3 });
      g.position.set(-18, -10);
      t.position.set(16, -10);
      q.position.set(0, 16);
      c.addChild(g, t, q);
    } else if (kind === 'digits') c.addChild(label('3', 52, pr, '#5cb3ff'));
    else if (kind === 'syllables') c.addChild(label('MA', 40, pr, '#ff8fb1'));
    else if (kind === 'stories') {
      // Three frames side by side.
      const g = new Graphics();
      [0, 1, 2].forEach((i) => g.roundRect(-30 + i * 21, -13, 18, 26, 4).fill({ color: [0xa8e6a1, 0xffd166, 0xff8fb1][i]! }).stroke({ color: COLORS.ink, width: 3 }));
      c.addChild(g);
    }
    else if (kind === 'coloring') {
      // Palette with paint blobs.
      const g = new Graphics().ellipse(0, 4, 32, 24).fill({ color: 0xf3d9a8 }).stroke({ color: COLORS.ink, width: 3 });
      [0xe8413c, 0xffd23f, 0x3d8bff, 0x7ad35a].forEach((color, i) => g.circle(-16 + (i % 2) * 22 + (i > 1 ? 6 : 0), -6 + Math.floor(i / 2) * 16, 7).fill({ color }));
      c.addChild(g);
    } else if (kind === 'melody') {
      // Three xylophone bars.
      const g = new Graphics();
      [0xe8413c, 0xffd23f, 0x3d8bff].forEach((color, i) => g.roundRect(-26 + i * 18, -22 + i * 6, 14, 44 - i * 12, 5).fill({ color }).stroke({ color: COLORS.ink, width: 3 }));
      c.addChild(g);
    } else if (kind === 'stickers') {
      // Star sticker with a curled corner.
      const g = new Graphics().star(0, 2, 5, 30, 15).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 3, join: 'round' }).circle(0, 2, 8).fill({ color: 0xff7a8a });
      c.addChild(g);
    }
    else if (kind === 'patterns') {
      // Beads in a pattern and a question mark.
      const g = new Graphics();
      [0xff7a8a, 0x5cb3ff, 0xff7a8a, 0x5cb3ff].forEach((color, i) => g.circle(-27 + i * 15, 0, 7).fill({ color }).stroke({ color: COLORS.ink, width: 2 }));
      c.addChild(g);
      const q = label('?', 30, pr, '#ff7a8a');
      q.x = 33;
      c.addChild(q);
    } else if (kind === 'memory') {
      // Two cards: back and face up.
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
    } else if (kind === 'dots') {
      // Three dots joined by a line.
      const g = new Graphics().moveTo(-24, 14).lineTo(0, -20).lineTo(24, 14).stroke({ color: 0xff7a8a, width: 5, cap: 'round', join: 'round' });
      for (const [x, y] of [
        [-24, 14],
        [0, -20],
        [24, 14],
      ] as const)
        g.circle(x, y, 9).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 3 });
      c.addChild(g);
    } else if (kind === 'maze') {
      // Small maze: a winding path.
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

  /** Playtest: enter an activity (`eval:__ff.game.scenes.current.play('sorting', 2)`; level optional). */
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
   * After the trial, without the full version, realms "sleep": dimmed tiles with a moon and "Zzz".
   * Also called after a purchase in the parent zone (the tiles wake up).
   */
  applyLocks(): void {
    const NIGHT_TINT = 0x8a86b8;
    for (const realm of REALMS) {
      const open = realmIsOpen(realm.id);
      for (const kind of realm.rows.flat()) {
        const house = this.houses.get(kind);
        if (!house) continue;
        const night = house.getChildByLabel('night');
        // Dimming via a tint of the whole tile (with the circle in the corner that sticks out of the plate).
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

  /** Sleeping realm: the tile sways and Lusia says it's still asleep and invites to the Riddle Meadow (neutral, no call to buy). */
  private sleepingTap(house: Container): void {
    haptics.tap();
    sfx.pop(this.game.sound, 0.6);
    void squash(this.tweens, house, 0.1);
    void squash(this.tweens, this.lusia, 0.12);
    say(this.game, 'lusia', 'realm-asleep');
  }

  /** First launch: the hand taps the first puzzle's house (an easy one, matched to the age). */
  private pointFirst(): void {
    if (this.leaving || this.sleep || this.realm !== 0 || !needsHand(state.progress, 'world')) return;
    const pick = (state.progress.age ?? 4) <= 4 ? 'colors' : 'shadows';
    const house = this.houses.get(pick)?.visible ? this.houses.get(pick) : this.houses.get('shadows');
    if (!house) return;
    this.hand.show({ kind: 'tap', at: [this.toLocal(house.getGlobalPosition())] });
    this.addChild(this.hand);
  }

  /** Bazyl shows the realm tabs (they bounce): once, after the first round. Players from before the welcome have already heard it. */
  private introRealms(): void {
    const p = state.progress;
    if (this.leaving || this.sleep || !p.onboarded || p.rounds === 0 || !needsHand(p, 'realms')) return;
    markHand(p, 'realms');
    void saveState();
    say(this.game, 'bazyl', 'realms');
    this.tabs.forEach((t, i) => this.timers.after(0.6 + i * 0.25, () => void squash(this.tweens, t, 0.35)));
  }

  private open(kind: Activity, house: Container): void {
    if (this.leaving) return;
    if (!realmIsOpen(realmOf(kind).id)) return this.sleepingTap(house);
    this.leaving = true;
    this.hand.stop();
    markHand(state.progress, 'world');
    startMusic(this.game);
    haptics.hit();
    sfx.pop(this.game.sound);
    void squash(this.tweens, house, 0.18);
    const p = this.toLocal(house.getGlobalPosition());
    this.particles.burst(p.x, p.y, { count: 24, speed: [200, 520], life: [0.4, 0.8], gravity: 900, scale: [0.6, 1.2], colors: COLORS.confetti });
    const scene = sceneFor(kind);
    this.timers.after(0.35, () => void this.game.scenes.go(scene, { fade: 0.3, color: 0xfff6e8 }));
  }

  /** Playtest: a sample week of journal and the parent zone on tab `tab`. */
  demoParent(tab = 'progress', name = tr('demoChildName')): void {
    const j = journal();
    const t = today();
    const rng = this.game.rng;
    for (let d = 0; d < 6; d++) {
      const day = shiftDay(t, -d);
      if (d === 2) continue;
      addTime(j, day, 300 + rng.int(0, 900));
      for (const a of ['counting', 'colors', 'phonemes', 'stories', 'patterns', 'coloring', 'emotions'] as const) for (let i = rng.int(0, 4); i > 0; i--) addTask(j, day, a, rng.int(0, 1));
    }
    const facts: [string, string][] = [['number:1', '111'], ['number:2', '111'], ['number:3', '1111'], ['number:4', '0111'], ['number:5', '111'], ['number:6', '1010'], ['number:7', '0010'],
      ['color:red', '111'], ['color:green', '111'], ['color:purple', '1001'], ['phoneme:a', '111'], ['phoneme:m', '111'], [lang() === 'pl' ? 'phoneme:sz' : 'phoneme:r', '0101'],
      ['letter:A', '11'], ['letter:M', '1'], ['letter:O', '1'], ['emotion:happy', '111'], ['emotion:sad', '111'], ['emotion:surprised', '01'], ['shape:circle', '111'], ['shape:star', '0']];
    for (const [f, h] of facts) for (const c of h) noteFact(j, t, f, c === '1');
    state.progress.childName = name || undefined;
    this.openParent();
    (this.parentPanel as unknown as { setTab(t: string): void }).setTab(tab);
  }

  /**
   * Stats playtest: 10 weeks of play (growing independence, higher levels, faster answers) and the parent
   * zone on the "Before school" list or straight in a skill's details (`eval:…demoStats('colors')`).
   */
  demoStats(skill = ''): void {
    const j = journal();
    const t = today();
    const rng = this.game.rng;
    const DAYS = 70;
    const acts = ['counting', 'colors', 'phonemes', 'stories', 'patterns', 'emotions', 'sorting', 'memory', 'dots', 'shapes', 'syllables', 'letters', 'digits'] as const;
    const tempoOf: Partial<Record<string, string>> = { counting: 'number', colors: 'color', phonemes: 'phoneme', emotions: 'emotion' };
    for (let d = DAYS; d >= 0; d--) {
      if (rng.next() < 0.3) continue;
      const day = shiftDay(t, -d);
      const k = 1 - d / DAYS;
      addTime(j, day, 400 + rng.int(0, 900));
      for (const a of acts) {
        if (rng.next() < 0.35) continue;
        // Level rises every ~3 weeks; after moving up, independence drops for a while.
        const level = k < 0.33 ? 0 : k < 0.66 ? 1 : 2;
        const p = 0.45 + 0.4 * ((k * 3) % 1) * 0.6 + 0.25 * k;
        for (let i = rng.int(3, 7); i > 0; i--) {
          const ok = rng.next() < p;
          addTask(j, day, a, ok ? 0 : rng.int(1, 2), level);
          const g = tempoOf[a];
          if (g && ok) addTempo(j, day, g, 1, 3.3 - 1.8 * k + rng.next() * 0.8);
        }
      }
      // Mastering elements over time (different discovery dates).
      for (const [g, items] of [['number', ['1', '2', '3', '4', '5', '6', '7']], ['color', ['red', 'green', 'blue', 'yellow', 'orange', 'pink', 'purple']], ['shape', ['circle', 'square', 'triangle', 'star', 'heart']], ['emotion', ['happy', 'sad', 'angry', 'surprised']], ['phoneme', ['a', 'm', 'o', 't', 'p']], ['letter', ['A', 'M', 'O']], ['digit', ['1', '2', '3']]] as const) {
        const n = Math.floor(items.length * Math.min(1, k * 1.2));
        const id = items[rng.int(0, Math.max(0, n - 1))];
        if (n > 0 && id) noteFact(j, day, `${g}:${id}`, rng.next() < 0.85);
      }
    }
    state.progress.childName = tr('demoChildName');
    this.openParent();
    const panel = this.parentPanel as unknown as { setTab(t: string): void; skill: string | null; scroll: number; render(): void };
    panel.setTab('progress');
    if (skill) {
      panel.skill = skill;
      panel.scroll = 0;
      panel.render();
    }
  }

  private toast: Text | null = null;

  /** Gate locked after a wrong answer: the adult sees how long until they can try again. */
  private gateToast(seconds: number): void {
    haptics.hit();
    this.toast?.destroy();
    // Just the number of seconds (no sentence): fits next to the gear with the countdown ring in any language.
    const t = label(`${seconds} s`, 30, this.game.pixelRatio, '#ffffff');
    t.anchor.set(0, 0.5);
    t.position.set(this.gate.x + 66, this.gate.y);
    this.addChild(t);
    this.toast = t;
    this.timers.after(2.2, () => {
      if (this.toast !== t) return;
      void this.tweens.to(t, { alpha: 0 }, { duration: 0.3 }).done.then(() => {
        if (this.toast === t) this.toast = null;
        t.destroy();
      });
    });
  }

  private adultCheck: AdultCheck | null = null;

  /** Question for an adult before the parent zone (and before waking up after the time limit). */
  private askAdult(then: () => void): void {
    if (this.adultCheck) return;
    if (performance.now() < ParentGate.lockedUntil) return void haptics.hit();
    const close = () => {
      this.adultCheck?.destroy({ children: true });
      this.adultCheck = null;
    };
    this.adultCheck = new AdultCheck(
      this.game,
      () => {
        ParentGate.passed();
        close();
        then();
      },
      close,
      () => {
        ParentGate.lock();
        close();
      },
    );
    this.addChild(this.adultCheck);
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
      (then) => this.askAdult(then),
    );
    this.parentPanel.layout(this.game.view);
    this.addChild(this.parentPanel);
  }

  override update(dt: number): void {
    this.particles.update(dt);
    this.hand?.update(dt);
    this.gate.tick(dt);
    this.adultCheck?.tick(dt);
    this.parentPanel?.tick(dt);
  }

  override resize(view: View): void {
    const { width: w, height: h, safe } = view;
    // After a rotation the houses are elsewhere: the hand points again.
    if (this.hand?.active) this.timers.after(0.05, () => this.pointFirst());
    for (const bg of this.bgs) cover(bg, w, h);
    const n = this.tabs.length;
    this.tabs.forEach((tab, i) => tab.position.set(w / 2 + (i - (n - 1) / 2) * 110, safe.top + 62));
    this.title.position.set(w / 2, safe.top + 145);
    const left = safe.left + 150;
    const right = w - safe.right - 150;
    // Realm pages side by side; houses between the guides.
    this.pages.x = -this.realm * w;
    // Tile grid between the guides, below the realm name; even gaps, nothing overlaps.
    // On narrower screens (iPad 4:3) tiles between the guides would be too small: then they take the whole
    // width, and Lusia and Bazyl are smaller and stand in the bottom corners behind the tiles.
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
    // On a narrow screen behind the tiles, on a wide one just above them (as before).
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

/** Mothers and children: two hearts, big and small. */
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

/** Jigsaw piece (the jigsaw sign). */
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

/** Crescent moon: a circle of radius `r` minus the circle (cx, cy, ir). */
function crescent(r: number, cx: number, cy: number, ir: number): number[] {
  const pts: number[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (Math.hypot(x - cx, y - cy) >= ir) pts.push(x, y);
  }
  // Inner edge (the cutting arc) in reverse order.
  const inner: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * ir;
    const y = cy + Math.sin(a) * ir;
    if (Math.hypot(x, y) <= r) inner.push(x, y);
  }
  // Outer points may be split at angle 0: rotate them so they start after the cutout.
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
