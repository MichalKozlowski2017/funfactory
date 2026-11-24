import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn, pulse, squash } from '@funfactory/kit2d';
import { say, shadowNow, shadowOf, type Guide } from '../assets.ts';
import type { Color, Item } from '../sim/catalog.ts';
import { answerOf, isCorrect, makeRound, promptLine, ROUND_LENGTH, type PuzzleKind, type Question } from '../sim/puzzles.ts';
import { state } from '../state.ts';
import { Card, COLORS, label, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

/** Kto prowadzi który domek. */
export const GUIDE: Record<PuzzleKind, Guide> = { cienie: 'lusia', pasuje: 'bazyl', liczenie: 'lusia', kolory: 'bazyl', gloski: 'lusia', mamy: 'bazyl' };

export const PAINT: Record<Color, number> = {
  czerwony: 0xe8413c,
  zolty: 0xffd23f,
  zielony: 0x4cbf56,
  niebieski: 0x3d8bff,
  pomaranczowy: 0xff8a2b,
  rozowy: 0xff8fc0,
  fioletowy: 0x9b5de5,
  brazowy: 0x9a6236,
  bialy: 0xffffff,
};

/** Runda zagadek jednego domku Polany: 5 pytań z wyborem odpowiedzi. */
export class PuzzleScene extends RoundScene {
  readonly id = 'puzzle';
  private readonly puzzle: PuzzleKind;
  private questions: Question[] = [];
  private cards: Card[] = [];
  /** Duża karta u góry: cień, młode zwierzę, plama farby albo litera. */
  private hero: Card | null = null;
  /** Obiekty do policzenia i ich znaczniki. */
  private counters: { sprite: Sprite; badge: Container | null }[] = [];
  private counted = 0;

  constructor(kind: PuzzleKind) {
    super(kind, GUIDE[kind]);
    this.puzzle = kind;
  }

  protected async prepare(): Promise<void> {
    this.questions = makeRound(this.puzzle, this.game.rng, state.progress.levels[this.puzzle] ?? 0);
    this.length = ROUND_LENGTH;
    if (this.puzzle === 'cienie') await Promise.all(this.questions.map((q) => shadowOf((answerOf(q) as Item).id)));
  }

  protected override roundItems(): string[] {
    return this.questions.flatMap((q) => {
      const items = (q.options as unknown[]).filter((o): o is Item => typeof o === 'object');
      if (q.kind === 'liczenie') items.push(q.item);
      return items.map((i) => i.id);
    });
  }

  protected override taskFacts(): string[] {
    const q = this.q;
    if (q.kind === 'liczenie') return [`liczba:${q.count}`];
    if (q.kind === 'kolory') return [`kolor:${q.color}`];
    if (q.kind === 'gloski') return [`gloska:${q.sound}`];
    return [];
  }

  protected override taskEasy(): boolean {
    return this.q.options.length <= 2;
  }

  private get q(): Question {
    return this.questions[this.index]!;
  }

  protected promptLine(): string {
    return promptLine(this.q);
  }

  protected show(): void {
    this.cards = [];
    this.hero = null;
    this.counters = [];
    this.counted = 0;
    const q = this.q;
    switch (q.kind) {
      case 'cienie':
        this.hero = this.heroCard(shadowNow(q.target.id) ?? Texture.EMPTY);
        break;
      case 'mamy':
        this.hero = this.heroCard(this.art.items.get(q.baby.id)!);
        break;
      case 'kolory':
        this.hero = this.heroCard(Texture.EMPTY);
        this.hero.picture.visible = false;
        this.hero.face.addChild(paintBlob(PAINT[q.color]));
        break;
      case 'gloski': {
        this.hero = this.heroCard(Texture.EMPTY);
        this.hero.picture.visible = false;
        const s = q.sound;
        this.hero.face.addChild(label(`${s.charAt(0).toUpperCase()}${s.slice(1)} ${s}`, 110, this.game.pixelRatio, '#ff7a8a'));
        break;
      }
      case 'liczenie':
        for (let i = 0; i < q.count; i++) {
          const sprite = new Sprite({ texture: this.art.items.get(q.item.id)!, anchor: 0.5 });
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          const entry = { sprite, badge: null as Container | null };
          sprite.on('pointertap', () => this.countTap(entry));
          this.counters.push(entry);
          this.layer.addChild(sprite);
        }
        break;
      case 'pasuje':
        // Podpowiedź bez słów, o co chodzi: dwa takie same kółka i jeden inny trójkąt.
        this.hero = this.heroCard(Texture.EMPTY);
        this.hero.picture.visible = false;
        this.hero.face.addChild(oddIcon());
        break;
    }
    this.cards = q.kind === 'liczenie' ? q.options.map((n) => this.numberCard(n)) : q.options.map((item) => this.itemCard(item));
    // Polecenie lektora. Przy liczeniu za pierwszym razem także podpowiedź „dotykaj i licz”.
    this.timers.after(0.3, () => {
      const len = say(this.game, this.guide, promptLine(q));
      this.markAsked(len);
      if (q.kind === 'liczenie' && this.index === 0) this.timers.after(len + 0.25, () => say(this.game, 'lusia', 'liczenie-dotyk'));
    });
  }

  /** Wejście: pyknięcia po kolei (po ułożeniu, żeby animacja kończyła się na właściwej skali). */
  protected override appear(): void {
    const all: Container[] = [...(this.hero ? [this.hero] : []), ...this.counters.map((c) => c.sprite), ...this.cards];
    all.forEach((c, i) => {
      void popIn(this.tweens, c, 0.4, i * 0.06);
      this.timers.after(i * 0.06, () => sfx.pop(this.game.sound, 0.9 + i * 0.06));
    });
  }

  private heroCard(texture: Texture): Card {
    const card = new Card(texture, 280);
    card.onTap = () => this.repeatPrompt();
    this.layer.addChild(card);
    return card;
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
    card.face.addChild(label(String(n), 96, this.game.pixelRatio, '#5cb3ff'));
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
    this.idle = 0;
    const q = this.q;
    if (isCorrect(q, value)) {
      card.markGood();
      void pulse(this.tweens, card, 0.18, 0.3);
      const local = this.layer.toLocal(card.getGlobalPosition());
      this.burst(local.x, local.y);
      for (const other of this.cards) if (other !== card) this.tweens.to(other, { alpha: 0.35 }, { duration: 0.25 });
      if (q.kind === 'cienie') this.revealShadow(q.target);
      else if (this.hero) {
        this.hero.markGood();
        void pulse(this.tweens, this.hero, 0.12, 0.3);
      }
      // Lektor: nazwa (albo liczba), potem pochwała.
      const first = typeof value === 'number' ? say(this.game, 'lusia', `liczba-${value}`) : say(this.game, this.guide, `item-${value.id}`);
      this.solved(first);
    } else {
      card.enabled = false;
      const x = card.x;
      void this.tweens.to(card, { x: x + 14 }, { duration: 0.05, yoyo: true, repeat: 5 }).done.then(() => (card.x = x));
      this.tweens.to(card, { alpha: 0.35 }, { duration: 0.3, delay: 0.3 });
      this.missed();
    }
  }

  /** Playtest: poprawna odpowiedź na bieżące pytanie (`eval:__ff.game.scenes.current.solve()`). */
  solve(): void {
    const answer = answerOf(this.q);
    const i = (this.q.options as (Item | number)[]).indexOf(answer);
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

  /** Dobra karta delikatnie się kołysze. */
  protected override tempoGroup(): string | null {
    return ({ kolory: 'kolor', liczenie: 'liczba', gloski: 'gloska' } as Record<string, string>)[this.puzzle] ?? null;
  }

  protected override gesture(): Gesture | null {
    const card = this.cards[(this.q.options as (Item | number)[]).indexOf(answerOf(this.q))];
    return card ? { kind: 'tap', at: [this.spot(card)] } : null;
  }

  protected hint(): void {
    const i = (this.q.options as (Item | number)[]).indexOf(answerOf(this.q));
    const card = this.cards[i];
    if (card) void this.tweens.to(card, { rotation: 0.08 }, { duration: 0.12, yoyo: true, repeat: 5, ease: 'sineInOut' }).done.then(() => (card.rotation = 0));
  }

  protected place(): void {
    if (!this.questions.length) return;
    const { width: w, height: h, safe } = this.stage;
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
    if (this.hero && this.q.kind === 'pasuje') {
      this.hero.layoutCard(Math.min(170, h * 0.24));
      this.hero.position.set(cx, 175);
      row(this.cards, h / 2 + 95, 240);
    } else if (this.hero) {
      this.hero.layoutCard(Math.min(280, h * 0.38));
      this.hero.position.set(cx, 245);
      row(this.cards, h - 175, 210);
    } else {
      const n = this.counters.length;
      const perRow = n <= 4 ? n : Math.ceil(n / 2);
      const rows = Math.ceil(n / perRow);
      const size = Math.min(170, cw / (perRow + 0.5));
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

  protected override step(dt: number): void {
    for (const c of this.cards) c.tick(dt);
    this.hero?.tick(dt);
  }
}

/** „Co nie pasuje”: dwa niebieskie kółka i pomarańczowy trójkąt. */
function oddIcon(): Graphics {
  const g = new Graphics();
  const ink = { color: COLORS.ink, width: 6, join: 'round' as const };
  for (const x of [-80, 0]) g.circle(x, 6, 34).fill({ color: 0x5cb3ff }).stroke(ink);
  g.poly([88, -34, 128, 40, 48, 40]).fill({ color: 0xff9f5a }).stroke(ink);
  // Karta ma tu 170 jednostek (rysunek jest w skali karty 280).
  g.scale.set(0.56);
  g.pivot.set(7, 3);
  return g;
}

/** Plama farby (zagadka z kolorami): gładka, lekko falista kropla z odblaskiem. */
function paintBlob(color: number): Graphics {
  const g = new Graphics();
  const pts: number[] = [];
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 92 + Math.sin(a * 3 + 0.6) * 9 + Math.sin(a * 5 + 1.7) * 5;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.poly(pts).fill({ color }).stroke({ color: COLORS.ink, width: 6, join: 'round' });
  g.ellipse(-30, -36, 24, 14).fill({ color: 0xffffff, alpha: 0.5 });
  g.circle(14, -52, 6).fill({ color: 0xffffff, alpha: 0.45 });
  return g;
}
