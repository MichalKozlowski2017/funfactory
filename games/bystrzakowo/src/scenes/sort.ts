import { Container, Graphics, Sprite, type Point } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { popIn } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import type { Color, Item } from '../sim/catalog.ts';
import { makeSortRound, sortPromptLine, type SortTask } from '../sim/sorting.ts';
import { state } from '../state.ts';
import { COLORS, draggable, sfx } from '../ui.ts';
import { PAINT } from './puzzle.ts';
import { RoundScene } from './round.ts';

/**
 * Kształt otworu pojemnika w ułamkach grafiki (zmierzone na plikach z Fluxa): `mouth` to wysokość linii
 * brzegu od góry, `rx`/`ry` półosie elipsy otworu (0 = prosta krawędź, jak przednia deska skrzynki).
 */
const BUCKET = { mouth: 0.43, rx: 0.4, ry: 0.07 };
const CRATE = { mouth: 0.4, rx: 0, ry: 0 };

/** Obiekt do posegregowania: kafelek z obrazkiem, który przeciąga się do skrzynki. */
interface Piece {
  view: Container;
  item: Item;
  bin: number;
  home: { x: number; y: number };
  done: boolean;
}

interface BinView {
  view: Container;
  /** Obiekty już włożone (za przednią ścianką skrzynki). */
  pile: Container;
  box: Container;
  /** Grafika pojemnika (tył) i przednia ścianka nad obiektami; skalowane razem. */
  back: Container;
  front: Container;
  width: number;
  height: number;
  /** Kolory kropelek przy wpadaniu (kolor wiaderka albo konfetti). */
  splash: number[];
  /** Wysokość brzegu jako ułamek wysokości grafiki (wiaderko ma nad brzegiem pałąk). */
  rim: number;
}

/**
 * Segregowanie (Warsztat Bazyla): obiekty u góry, 2–3 skrzynki albo wiaderka na dole.
 * Dobra skrzynka: obiekt wpada do środka i lektor mówi nazwę. Zła: skrzynka kręci głową, obiekt wraca.
 */
export class SortScene extends RoundScene {
  readonly id = 'sort';
  private tasks: SortTask[] = [];
  private pieces: Piece[] = [];
  private bins: BinView[] = [];
  private dragging = false;

  constructor() {
    super('sortowanie', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    this.tasks = makeSortRound(this.game.rng, state.progress.levels.sortowanie ?? 0);
    this.length = this.tasks.length;
  }

  private get task(): SortTask {
    return this.tasks[this.index]!;
  }

  protected promptLine(): string {
    return sortPromptLine(this.task);
  }

  protected show(): void {
    const t = this.task;
    this.bins = t.bins.map((bin) => this.binView(t.rule === 'kolory' ? (bin.key as Color) : null, bin.sign));
    this.pieces = t.items.map(({ item, bin }) => this.piece(item, bin));
    [...this.bins.map((b) => b.view), ...this.pieces.map((p) => p.view)].forEach((c, i) => {
      void popIn(this.tweens, c, 0.4, i * 0.06);
      this.timers.after(i * 0.06, () => sfx.pop(this.game.sound, 0.9 + i * 0.05));
    });
    this.timers.after(0.4, () => {
      const len = say(this.game, this.guide, this.promptLine());
      if (this.index === 0 && state.progress.levels.sortowanie === 0) this.timers.after(len + 0.3, () => say(this.game, this.guide, 'przeciagnij'));
    });
  }

  private binView(color: Color | null, sign: string | undefined): BinView {
    const view = new Container();
    // Pojemnik w trzech warstwach: tył, obiekty w środku, przednia ścianka (ta sama grafika przycięta
    // do linii brzegu). Dzięki temu obiekty wystają z wnętrza, a nie leżą za pojemnikiem.
    const box = new Container();
    const pile = new Container();
    const back = new Container();
    const front = new Container();
    const texture = color ? this.art.bucket : this.art.crate;
    const shape = color ? BUCKET : CRATE;
    if (texture) {
      const make = () => {
        const s = new Sprite({ texture, anchor: { x: 0.5, y: 1 } });
        if (color) s.tint = PAINT[color];
        return s;
      };
      back.addChild(make());
      const w = texture.width;
      const h = texture.height;
      const mask = new Graphics();
      if (shape.ry > 0) {
        // Dolna połowa elipsy otworu i wszystko poniżej.
        const cy = -h * (1 - shape.mouth);
        const pts: number[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI;
          pts.push(-Math.cos(a) * w * shape.rx, cy + Math.sin(a) * h * shape.ry);
        }
        pts.push(w, 0, w, 10, -w, 10, -w, 0);
        mask.poly(pts).fill({ color: 0xffffff });
      } else mask.rect(-w, -h * (1 - shape.mouth), w * 2, h * (1 - shape.mouth) + 10).fill({ color: 0xffffff });
      const frontSprite = make();
      front.addChild(frontSprite, mask);
      frontSprite.mask = mask;
    } else {
      // Zapas, gdy grafiki jeszcze nie ma: prosta skrzynka z kodu.
      back.addChild(new Graphics().roundRect(-140, -150, 280, 150, 24).fill({ color: color ? PAINT[color] : 0xc98a4b }).stroke({ color: COLORS.ink, width: 6 }));
    }
    box.addChild(back, pile, front);
    view.addChild(box);
    if (sign) {
      const tex = this.art.items.get(sign) ?? this.art.signs.get(sign);
      const plate = new Container();
      plate.addChild(new Graphics().circle(0, 0, 58).fill({ color: COLORS.card }).stroke({ color: COLORS.ink, width: 6 }));
      if (tex) {
        const pic = new Sprite({ texture: tex, anchor: 0.5 });
        pic.scale.set(84 / Math.max(tex.width, tex.height));
        plate.addChild(pic);
      }
      plate.label = 'sign';
      view.addChild(plate);
    }
    this.layer.addChild(view);
    const splash = color ? [PAINT[color], PAINT[color], 0xffffff] : COLORS.confetti;
    return { view, pile, box, back, front, width: 0, height: 0, splash, rim: texture ? 1 - shape.mouth : 0.9 };
  }

  private piece(item: Item, bin: number): Piece {
    const view = new Container();
    const plate = new Graphics();
    const pic = new Sprite({ texture: this.art.items.get(item.id)!, anchor: 0.5 });
    view.addChild(plate, pic);
    const piece: Piece = { view, item, bin, home: { x: 0, y: 0 }, done: false };
    draggable(view, {
      canStart: () => !piece.done && !this.busy && !this.dragging,
      start: () => {
        this.dragging = true;
        this.idle = 0;
        this.tweens.killOf(view.scale);
        this.tweens.to(view.scale, { x: 1.12, y: 1.12 }, { duration: 0.12 });
        sfx.pop(this.game.sound, 1.2);
      },
      drop: (at) => this.drop(piece, at),
    });
    this.layer.addChild(view);
    return piece;
  }

  /** Do której skrzynki trafił obiekt (punkt w obrębie skrzynki albo tuż nad nią). */
  private binAt(at: Point): number {
    return this.bins.findIndex((b) => Math.abs(at.x - b.view.x) < b.width / 2 + 20 && at.y > b.view.y - b.height - 140 && at.y < b.view.y + 30);
  }

  private drop(piece: Piece, at: Point): void {
    this.dragging = false;
    const target = this.binAt(at);
    if (target < 0) return this.goHome(piece);
    if (target === piece.bin) return this.put(piece);
    // Zła skrzynka: kręci się „nie”, obiekt wraca.
    const box = this.bins[target]!.view;
    const x = box.x;
    void this.tweens.to(box, { x: x + 12 }, { duration: 0.05, yoyo: true, repeat: 5 }).done.then(() => (box.x = x));
    this.goHome(piece);
    this.missed();
  }

  private goHome(piece: Piece): void {
    this.tweens.to(piece.view, { x: piece.home.x, y: piece.home.y }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(piece.view.scale, { x: 1, y: 1 }, { duration: 0.2 });
  }

  /** Miejsce n-tego obiektu w stosiku (wystaje ponad brzeg skrzynki). */
  private pileSlot(bin: BinView, n: number): { x: number; y: number } {
    return { x: ((n % 3) - 1) * bin.width * 0.24 + (Math.floor(n / 3) % 2) * 20, y: -bin.height * bin.rim - 8 - Math.floor(n / 3) * 14 };
  }

  /**
   * Obiekt wpada do skrzynki: kafelek znika, obrazek leci łukiem z fikołkiem nad skrzynkę,
   * wpada za przednią ściankę (plum, skrzynka przysiada i się kołysze, tryskają kropelki),
   * potem wyskakuje i zostaje w stosiku. Nad skrzynką unosi się gwiazdka.
   */
  private put(piece: Piece): void {
    piece.done = true;
    const bin = this.bins[piece.bin]!;
    const v = piece.view;
    const slot = this.pileSlot(bin, bin.pile.children.length + this.flying(bin));
    this.tweens.killOf(v);
    this.tweens.killOf(v.scale);
    v.eventMode = 'none';
    // Lot: bez kafelka, sam obrazek.
    const plate = v.children[0]!;
    this.tweens.to(plate, { alpha: 0 }, { duration: 0.15 });
    const start = { x: v.x, y: v.y };
    const rim = { x: bin.view.x + slot.x * 0.5, y: bin.view.y - bin.height * bin.rim };
    const apex = { x: (start.x + rim.x) / 2, y: Math.min(start.y, rim.y) - 150 };
    const s0 = v.scale.x;
    const s1 = Math.min(bin.width * 0.42, 118) / Math.max(v.height / s0, 1) / 0.8;
    const spin = (rim.x >= start.x ? 1 : -1) * Math.PI * 2;
    sfx.whoosh(this.game.sound);
    haptics.tap();
    const len = say(this.game, this.guide, `item-${piece.item.id}`);
    (bin as BinView & { inFlight?: number }).inFlight = this.flying(bin) + 1;
    void this.tweens
      .to(
        { t: 0 },
        { t: 1 },
        {
          duration: 0.6,
          onUpdate: (t) => {
            // Krzywa Béziera: start -> wierzchołek -> brzeg skrzynki; pod koniec przyspiesza w dół.
            const u = t * t * (3 - 2 * t) * 0.6 + t * 0.4;
            const a = (1 - u) * (1 - u);
            const b = 2 * (1 - u) * u;
            const c = u * u;
            v.position.set(a * start.x + b * apex.x + c * rim.x, a * start.y + b * apex.y + c * rim.y);
            v.rotation = spin * (1 - (1 - t) ** 2);
            v.scale.set(s0 + (s1 - s0) * t);
          },
        },
      ).done
      .then(() => this.land(piece, bin, slot, s1));
    if (this.pieces.every((p) => p.done)) this.solved(len + 0.5);
  }

  private flying(bin: BinView): number {
    return (bin as BinView & { inFlight?: number }).inFlight ?? 0;
  }

  /** Lądowanie w skrzynce: za przednią ściankę, plum, kropelki, wyskok do stosiku. */
  private land(piece: Piece, bin: BinView, slot: { x: number; y: number }, scale: number): void {
    const v = piece.view;
    (bin as BinView & { inFlight?: number }).inFlight = Math.max(0, this.flying(bin) - 1);
    // Do stosiku (za przednią ściankę) we współrzędnych skrzynki.
    v.rotation = 0;
    v.position.set(v.x - bin.view.x, v.y - bin.view.y);
    bin.pile.addChild(v);
    sfx.plop(this.game.sound);
    haptics.hit();
    // Skrzynka przysiada i sprężyście wraca, potem się kołysze.
    const box = bin.box;
    this.tweens.killOf(box.scale);
    box.scale.set(1.14, 0.8);
    this.tweens.to(box.scale, { x: 1, y: 1 }, { duration: 0.5, ease: 'elasticOut' });
    this.tweens.killOf(bin.view);
    bin.view.rotation = 0;
    void this.tweens.to(bin.view, { rotation: 0.07 }, { duration: 0.09, yoyo: true, repeat: 3, ease: 'sineInOut' }).done.then(() => (bin.view.rotation = 0));
    // Kropelki z brzegu w górę.
    const top = { x: bin.view.x, y: bin.view.y - bin.height * bin.rim };
    this.particles.burst(top.x, top.y, { count: 32, speed: [300, 700], life: [0.5, 1], gravity: 1400, scale: [1, 2], angle: -Math.PI / 2, spread: 1.6, colors: bin.splash });
    this.floatStar(top.x, top.y - 40);
    // Obiekt chowa się w skrzynce i wyskakuje na swoje miejsce w stosiku.
    v.y = slot.y + bin.height * 0.5;
    v.x = slot.x;
    v.scale.set(scale * 0.9);
    void this.tweens.to(v, { y: slot.y }, { duration: 0.42, delay: 0.06, ease: 'backOut' });
    this.tweens.to(v.scale, { x: scale, y: scale }, { duration: 0.3, delay: 0.06, ease: 'backOut' });
  }

  /** Gwiazdka unosząca się nad skrzynką. */
  private floatStar(x: number, y: number): void {
    const star = new Graphics().star(0, 0, 5, 26, 12).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
    star.position.set(x, y);
    star.scale.set(0.3);
    this.layer.addChild(star);
    this.tweens.to(star.scale, { x: 1, y: 1 }, { duration: 0.3, ease: 'backOut' });
    this.tweens.to(star, { rotation: 0.6 }, { duration: 0.8 });
    void this.tweens.to(star, { y: y - 90, alpha: 0 }, { duration: 0.8, delay: 0.15, ease: 'quadOut' }).done.then(() => star.destroy());
  }

  /** Playtest: wszystko do dobrych skrzynek (`eval:__ff.game.scenes.current.solve()`). */
  solve(): void {
    for (const p of this.pieces) if (!p.done) this.put(p);
  }

  /** Podpowiedź: pierwszy obiekt sam „wskazuje” swoją skrzynkę. */
  protected hint(): void {
    const p = this.pieces.find((x) => !x.done);
    if (!p) return;
    const bin = this.bins[p.bin]!.view;
    const tx = p.home.x + (bin.x - p.home.x) * 0.35;
    const ty = p.home.y + (bin.y - 200 - p.home.y) * 0.35;
    void this.tweens.to(p.view, { x: tx, y: ty }, { duration: 0.45, ease: 'sineInOut', yoyo: true, repeat: 1 }).done.then(() => p.view.position.set(p.home.x, p.home.y));
  }

  protected place(): void {
    if (!this.tasks.length) return;
    const { width: w, height: h, safe } = this.game.view;
    const left = safe.left + 270;
    const right = w - safe.right - 40;
    const cw = right - left;
    const cx = (left + right) / 2;
    // Skrzynki na dole.
    const nb = this.bins.length;
    const bw = Math.min(290, (cw - 40 * (nb - 1)) / nb);
    this.bins.forEach((b, i) => {
      const art = b.back.children[0]!;
      const sw = art instanceof Sprite ? art.texture.width : 280;
      b.back.scale.set(bw / sw);
      b.front.scale.set(bw / sw);
      b.width = bw;
      b.height = b.back.height;
      b.view.position.set(cx + (i - (nb - 1) / 2) * (bw + 40), h - 30);
      const sign = b.view.children.find((c) => c.label === 'sign');
      sign?.position.set(0, -b.height - 62);
      // Stosik: obiekty już w skrzynce przeskalowane do nowej szerokości.
      b.pile.children.forEach((c, n) => {
        const slot = this.pileSlot(b, n);
        c.position.set(slot.x, slot.y);
      });
    });
    // Obiekty u góry: jeden rząd.
    const n = this.pieces.length;
    const size = Math.min(140, (cw - 24 * (n - 1)) / n);
    this.pieces.forEach((p, i) => {
      const plate = p.view.children[0] as Graphics;
      plate
        .clear()
        .roundRect(-size / 2, -size / 2 + 6, size, size, size * 0.18)
        .fill({ color: 0x000000, alpha: 0.12 })
        .roundRect(-size / 2, -size / 2, size, size, size * 0.18)
        .fill({ color: COLORS.card })
        .stroke({ color: COLORS.ink, width: 5 });
      const pic = p.view.children[1] as Sprite;
      pic.scale.set((size * 0.8) / Math.max(pic.texture.width, pic.texture.height));
      p.view.hitArea = { contains: (x: number, y: number) => Math.abs(x) <= size / 2 + 10 && Math.abs(y) <= size / 2 + 10 };
      p.home = { x: cx + (i - (n - 1) / 2) * (size + 24), y: safe.top + 200 };
      if (!p.done) p.view.position.set(p.home.x, p.home.y);
    });
  }
}
