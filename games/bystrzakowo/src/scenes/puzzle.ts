import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, popIn, pulse, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, type Art, type Guide } from '../assets.ts';
import type { Item } from '../sim/catalog.ts';
import { pickSticker } from '../sim/progress.ts';
import { isCorrect, makeRound, nextLevel, ROUND_LENGTH, type PuzzleKind, type Question } from '../sim/puzzles.ts';
import { saveState, state } from '../state.ts';
import { Card, COLORS, cover, IconButton, label, sfx } from '../ui.ts';

/** Kto prowadzi który domek. */
const GUIDE: Record<PuzzleKind, Guide> = { cienie: 'lusia', pasuje: 'bazyl', liczenie: 'lusia' };

/** Runda zagadek jednego domku: 5 pytań, bez przegrywania, na koniec naklejka. */
export class PuzzleScene extends Scene {
  readonly id = 'puzzle';
  private readonly kind: PuzzleKind;
  private readonly guide: Guide;
  private art!: Art;
  private bg!: Sprite;
  private guideSprite!: Sprite;
  private home!: IconButton;
  private dots!: Graphics;
  private readonly layer = new Container();
  private particles!: Particles;
  private questions: Question[] = [];
  private index = 0;
  private mistakes = 0;
  private busy = false;
  private cards: Card[] = [];
  /** Duża karta u góry (cień w zagadce z cieniami). */
  private hero: Card | null = null;
  /** Obiekty do policzenia i ich znaczniki. */
  private counters: { sprite: Sprite; badge: Container | null }[] = [];
  private counted = 0;
  private overlay: Container | null = null;
  private leaving = false;

  constructor(kind: PuzzleKind) {
    super();
    this.kind = kind;
    this.guide = GUIDE[kind];
  }

  override async enter(): Promise<void> {
    this.art = await loadArt();
    this.questions = makeRound(this.kind, this.game.rng, state.progress.levels[this.kind]);
    this.bg = new Sprite(this.art.puzzleBg);
    this.guideSprite = new Sprite({ texture: this.guide === 'lusia' ? this.art.lusia : this.art.bazyl, anchor: { x: 0.5, y: 1 } });
    this.guideSprite.scale.set(300 / this.guideSprite.texture.height);
    this.home = new IconButton('home');
    this.home.onTap = () => this.leave();
    this.dots = new Graphics();
    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.addChild(this.bg, this.guideSprite, this.layer, this.dots, this.home, this.particles.view);
    idleBreath(this.tweens, this.guideSprite, 0.03, 1.8);
    this.game.markReady();
    this.timers.after(0.35, () => this.show());
  }

  // ---------- pytania ----------

  private get q(): Question {
    return this.questions[this.index]!;
  }

  private show(): void {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.cards = [];
    this.hero = null;
    this.counters = [];
    this.counted = 0;
    this.busy = false;
    const q = this.q;
    if (q.kind === 'cienie') {
      this.hero = new Card(this.art.shadows.get(q.target.id)!, 280);
      this.hero.eventMode = 'none';
      this.layer.addChild(this.hero);
      this.cards = q.options.map((item) => this.itemCard(item));
    } else if (q.kind === 'pasuje') {
      this.cards = q.options.map((item) => this.itemCard(item));
    } else {
      for (let i = 0; i < q.count; i++) {
        const sprite = new Sprite({ texture: this.art.items.get(q.item.id)!, anchor: 0.5 });
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        const entry = { sprite, badge: null as Container | null };
        sprite.on('pointertap', () => this.countTap(entry));
        this.counters.push(entry);
        this.layer.addChild(sprite);
      }
      this.cards = q.options.map((n) => this.numberCard(n));
    }
    this.place();
    // Wejście: pyknięcia po kolei.
    const all: Container[] = [...(this.hero ? [this.hero] : []), ...this.counters.map((c) => c.sprite), ...this.cards];
    all.forEach((c, i) => {
      void popIn(this.tweens, c, 0.4, i * 0.06);
      this.timers.after(i * 0.06, () => sfx.pop(this.game.sound, 0.9 + i * 0.06));
    });
    this.drawDots();
    // Polecenie lektora. Przy liczeniu za pierwszym razem także podpowiedź „dotykaj i licz”.
    this.timers.after(0.3, () => {
      const len = say(this.game, this.guide, q.kind);
      if (q.kind === 'liczenie' && this.index === 0) this.timers.after(len + 0.25, () => say(this.game, 'lusia', 'liczenie-dotyk'));
    });
  }

  private itemCard(item: Item): Card {
    const card = new Card(this.art.items.get(item.id)!, 220);
    card.onTap = () => this.answer(card, item);
    this.layer.addChild(card);
    return card;
  }

  private numberCard(n: number): Card {
    const card = new Card(Texture.EMPTY, 150);
    card.picture.visible = false;
    const digit = label(String(n), 96, this.game.pixelRatio, '#5cb3ff');
    card.face.addChild(digit);
    card.onTap = () => this.answer(card, n);
    this.layer.addChild(card);
    return card;
  }

  /** Dotknięcie obiektu przy liczeniu: numerek i lektor liczy na głos. */
  private countTap(entry: { sprite: Sprite; badge: Container | null }): void {
    if (entry.badge || this.busy) return;
    this.counted++;
    const badge = new Container();
    badge.addChild(new Graphics().circle(0, 0, 30).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 5 }), label(String(this.counted), 40, this.game.pixelRatio));
    badge.position.set(entry.sprite.x + entry.sprite.width * 0.35, entry.sprite.y - entry.sprite.height * 0.35);
    entry.badge = badge;
    this.layer.addChild(badge);
    void popIn(this.tweens, badge, 0.3);
    void squash(this.tweens, entry.sprite, 0.2);
    haptics.tap();
    sfx.pop(this.game.sound, 1 + this.counted * 0.08);
    say(this.game, 'lusia', `liczba-${this.counted}`);
  }

  private answer(card: Card, value: Item | number): void {
    if (this.busy || !card.enabled) return;
    const q = this.q;
    if (isCorrect(q, value)) {
      this.busy = true;
      card.markGood();
      void pulse(this.tweens, card, 0.18, 0.3);
      sfx.good(this.game.sound);
      haptics.success();
      const p = card.getGlobalPosition();
      const local = this.toLocal(p);
      this.particles.burst(local.x, local.y, { count: 30, speed: [200, 600], life: [0.4, 0.9], gravity: 700, scale: [0.5, 1.1], colors: COLORS.confetti });
      this.jumpGuide();
      for (const other of this.cards) if (other !== card) this.tweens.to(other, { alpha: 0.35 }, { duration: 0.25 });
      // Lektor: nazwa (albo liczba), potem pochwała.
      let first = 0;
      if (q.kind === 'cienie') {
        this.revealShadow(q.target);
        first = say(this.game, this.guide, `item-${q.target.id}`);
      } else if (q.kind === 'pasuje') first = say(this.game, this.guide, `item-${q.odd.id}`);
      else first = say(this.game, 'lusia', `liczba-${q.count}`);
      const praise = `brawo-${this.game.rng.int(1, 5)}`;
      this.timers.after(first + 0.15, () => {
        const len = say(this.game, this.guide, praise);
        this.timers.after(Math.max(0.8, len) + 0.3, () => this.next());
      });
    } else {
      this.mistakes++;
      card.enabled = false;
      sfx.bad(this.game.sound);
      haptics.error();
      const x = card.x;
      void this.tweens.to(card, { x: x + 14 }, { duration: 0.05, yoyo: true, repeat: 5 }).done.then(() => (card.x = x));
      this.tweens.to(card, { alpha: 0.35 }, { duration: 0.3, delay: 0.3 });
      void squash(this.tweens, this.guideSprite, 0.08);
      say(this.game, this.guide, `oj-${this.game.rng.int(1, 2)}`);
    }
  }

  /** Playtest: poprawna odpowiedź na bieżące pytanie (`eval:__ff.game.scenes.current.solve()`). */
  solve(): void {
    const q = this.q;
    const answer = q.kind === 'cienie' ? q.target : q.kind === 'pasuje' ? q.odd : q.count;
    const i = (q.options as (Item | number)[]).indexOf(answer);
    if (this.cards[i]) this.answer(this.cards[i], answer);
  }

  /** W zagadce z cieniami cień zamienia się w kolorowy obrazek. */
  private revealShadow(item: Item): void {
    const hero = this.hero;
    if (!hero) return;
    const color = new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 });
    color.scale.copyFrom(hero.picture.scale);
    color.alpha = 0;
    hero.face.addChild(color);
    this.tweens.to(color, { alpha: 1 }, { duration: 0.35 });
    hero.markGood();
    void pulse(this.tweens, hero, 0.12, 0.3);
  }

  private jumpGuide(): void {
    const g = this.guideSprite;
    const y = g.y;
    this.tweens.killOf(g);
    void this.tweens.to(g, { y: y - 50 }, { duration: 0.18, ease: 'quadOut', yoyo: true, repeat: 1 }).done.then(() => (g.y = y));
  }

  private next(): void {
    this.index++;
    if (this.index >= ROUND_LENGTH) return this.finish();
    const out = [...this.layer.children];
    for (const c of out) this.tweens.to(c, { alpha: 0 }, { duration: 0.2 });
    this.timers.after(0.25, () => this.show());
  }

  private finish(): void {
    const p = state.progress;
    p.levels[this.kind] = nextLevel(p.levels[this.kind], this.mistakes);
    const sticker = pickSticker(this.game.rng, p.stickers);
    p.stickers.push(sticker);
    p.rounds++;
    void saveState();
    this.drawDots();
    this.tweens.to(this.layer, { alpha: 0 }, { duration: 0.3 });
    this.showReward(sticker);
  }

  private showReward(id: string): void {
    const view = this.game.view;
    const o = new Container();
    o.addChild(new Graphics().rect(0, 0, view.width, view.height).fill({ color: 0x2a1a40, alpha: 0.55 }));
    o.eventMode = 'static';
    const badge = new Container();
    badge.position.set(view.width / 2, view.height / 2 - 30);
    const star = new Graphics().star(0, 0, 8, 230, 170).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 8, join: 'round' });
    const pic = new Sprite({ texture: this.art.items.get(id)!, anchor: 0.5 });
    pic.scale.set(230 / Math.max(pic.texture.width, pic.texture.height));
    badge.addChild(star, pic);
    const next = new IconButton('next', 62);
    next.position.set(view.width / 2, view.height - 90);
    next.visible = false;
    next.onTap = () => this.leave();
    o.addChild(badge, next);
    this.overlay = o;
    this.addChild(o);
    this.addChild(this.particles.view);
    this.tweens.to(star, { rotation: Math.PI * 2 }, { duration: 12, repeat: -1, ease: 'linear' });
    void popIn(this.tweens, badge, 0.6);
    sfx.fanfare(this.game.sound);
    haptics.success();
    for (let i = 0; i < 3; i++)
      this.timers.after(i * 0.25, () =>
        this.particles.burst(view.width * (0.25 + i * 0.25), view.height * 0.35, { count: 50, speed: [250, 750], life: [0.8, 1.6], gravity: 600, scale: [0.6, 1.3], colors: COLORS.confetti }),
      );
    const len = say(this.game, this.guide, 'nagroda');
    this.timers.after(Math.max(1.2, len), () => {
      next.visible = true;
      void popIn(this.tweens, next, 0.4);
    });
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.game.sound.stopChannel('voice');
    void import('./meadow.ts').then(({ MeadowScene }) => this.game.scenes.go(new MeadowScene(), { fade: 0.3, color: 0xfff6e8 }));
  }

  // ---------- układ ----------

  private drawDots(): void {
    const g = this.dots.clear();
    const gap = 54;
    for (let i = 0; i < ROUND_LENGTH; i++) {
      const x = (i - (ROUND_LENGTH - 1) / 2) * gap;
      const done = i < this.index || (i === this.index && this.busy && this.index >= ROUND_LENGTH);
      if (i < this.index) g.star(x, 0, 5, 22, 10).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
      else g.circle(x, 0, i === this.index ? 15 : 12).fill({ color: done ? COLORS.sun : 0xffffff, alpha: 0.95 }).stroke({ color: COLORS.ink, width: 4 });
    }
  }

  private place(): void {
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 250;
    const right = w - safe.right - 40;
    const cw = right - left;
    const cx = (left + right) / 2;
    const row = (cards: Card[], y: number, max: number, gap = 30) => {
      const n = cards.length;
      const size = Math.min(max, (cw - gap * (n - 1)) / n);
      cards.forEach((c, i) => {
        c.layoutCard(size);
        c.position.set(cx + (i - (n - 1) / 2) * (size + gap), y);
      });
    };
    if (this.q.kind === 'cienie') {
      this.hero?.layoutCard(Math.min(280, h * 0.38));
      this.hero?.position.set(cx, 245);
      row(this.cards, h - 175, 210);
    } else if (this.q.kind === 'pasuje') {
      row(this.cards, h / 2 + 30, 250);
    } else {
      const n = this.counters.length;
      const perRow = n <= 4 ? n : Math.ceil(n / 2);
      const rows = Math.ceil(n / perRow);
      const size = Math.min(130, cw / (perRow + 0.5));
      this.counters.forEach((c, i) => {
        const r = Math.floor(i / perRow);
        const inRow = Math.min(perRow, n - r * perRow);
        const col = i - r * perRow;
        const t = c.sprite.texture;
        c.sprite.scale.set(size / Math.max(t.width, t.height));
        c.sprite.position.set(cx + (col - (inRow - 1) / 2) * size * 1.25, 270 + (r - (rows - 1) / 2) * size * 1.2);
      });
      row(this.cards, h - 140, 160);
    }
  }

  override update(dt: number): void {
    for (const c of this.cards) c.tick(dt);
    this.home.tick(dt);
    this.particles.update(dt);
  }

  override resize(view: View): void {
    cover(this.bg, view.width, view.height);
    this.guideSprite.position.set(view.safe.left + 130, view.height - 10);
    this.home.position.set(view.safe.left + 80, view.safe.top + 75);
    this.dots.position.set(view.width / 2 + 100, view.safe.top + 60);
    if (this.questions.length && this.index < ROUND_LENGTH && this.layer.children.length) this.place();
  }
}
