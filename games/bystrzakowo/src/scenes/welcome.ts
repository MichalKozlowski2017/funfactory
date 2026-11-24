import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { Button, idleBreath, popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, type Art } from '../assets.ts';
import { HAND_TIP } from '../hand.ts';
import { trial } from '../premium.ts';
import { tr } from '../sim/i18n.ts';
import { AGES, applyAge } from '../sim/onboarding.ts';
import { TRIAL_DAYS } from '../sim/trial.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, FONT, sfx } from '../ui.ts';
import { WorldScene } from './world.ts';

type Page = 'hello' | 'gate' | 'trial' | 'age';

const INK = '#5a3c28';
const SOFT = '#6b5a4a';
const AGE_COLOR = '#8fb8ff';
const AGE_PICKED = '#ff9f5a';

/**
 * Powitanie rodzica przy pierwszym uruchomieniu: czym jest gra, jak wejść do strefy rodzica, próba pełnej
 * wersji i wiek dziecka (ustawia początkową trudność zabaw). Bez lektora: czyta dorosły. Pomiń kończy od razu.
 */
export class WelcomeScene extends Scene {
  readonly id = 'welcome';
  private art!: Art;
  private bg!: Sprite;
  private readonly dim = new Graphics();
  private readonly card = new Graphics();
  private readonly content = new Container();
  private pages: Page[] = [];
  private page = 0;
  private age: number | null = null;
  private buttons: Button[] = [];
  private skip!: Button;
  /** Animacja ilustracji bieżącej karty. */
  private anim: ((t: number) => void) | null = null;
  private t = 0;
  private leaving = false;

  override async enter(): Promise<void> {
    this.art = await loadArt();
    this.pages = ['hello', 'gate', ...(trial().full ? [] : (['trial'] as Page[])), 'age'];
    this.bg = new Sprite(this.art.realmBg.polana);
    this.skip = new Button({ label: tr('Pomiń'), width: 170, height: 76, fontSize: 26, color: '#c9b8a6', radius: 22, resolution: this.game.pixelRatio, onTap: () => this.finish(false) });
    this.addChild(this.bg, this.dim, this.card, this.content, this.skip);
    this.resize(this.game.view);
    this.game.markReady();
  }

  override resize(view: View): void {
    if (!this.bg) return;
    cover(this.bg, view.width, view.height);
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x2a1a40, alpha: 0.35 });
    this.skip.position.set(view.width - view.safe.right - 110, view.safe.top + 52);
    this.render();
  }

  /** Prostokąt karty (zależny od ekranu). */
  private box(): { x: number; y: number; w: number; h: number } {
    const v = this.game.view;
    const w = Math.min(1060, v.width - v.safe.left - v.safe.right - 80);
    const h = Math.min(590, v.height - v.safe.top - v.safe.bottom - 110);
    return { x: (v.width - w) / 2, y: Math.max(v.safe.top + 100, (v.height - h) / 2 + 24), w, h };
  }

  private text(value: string, size: number, opts: { color?: string; weight?: '600' | '700' | '800'; wrap?: number; align?: 'left' | 'center' } = {}): Text {
    return new Text({
      text: value,
      resolution: this.game.pixelRatio,
      style: {
        fontFamily: FONT,
        fontSize: size,
        fontWeight: opts.weight ?? '600',
        fill: opts.color ?? INK,
        wordWrap: !!opts.wrap,
        wordWrapWidth: opts.wrap ?? 0,
        lineHeight: size * 1.36,
        align: opts.align ?? 'left',
      },
    });
  }

  private button(label: string, width: number, color: string, onTap: () => void, height = 88, fontSize = 30): Button {
    const b = new Button({ label, width, height, fontSize, color, radius: 24, resolution: this.game.pixelRatio, onTap });
    this.buttons.push(b);
    this.content.addChild(b);
    return b;
  }

  private render(): void {
    this.content.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.buttons = [];
    this.anim = null;
    const b = this.box();
    this.card.clear().roundRect(b.x, b.y, b.w, b.h, 36).fill({ color: 0xfffaf2 }).stroke({ color: COLORS.ink, width: 6 });
    const page = this.pages[this.page]!;
    if (page === 'age') this.agePage(b);
    else this.infoPage(page, b);
    this.drawDots(b);
  }

  /** Karta z ilustracją po lewej i tekstem po prawej. */
  private infoPage(page: Exclude<Page, 'age'>, b: { x: number; y: number; w: number; h: number }): void {
    const n = TRIAL_DAYS;
    const [title, body] =
      page === 'hello'
        ? [tr('Witaj w Bystrzakowie!'), tr('Zagadki, liczenie, literki, kształty i historyjki dla dzieci od 3 do 6 lat. Lusia i Bazyl czytają każde polecenie na głos, więc dziecko nie musi umieć czytać. Bez reklam i bez internetu.')]
        : page === 'gate'
          ? [tr('Strefa rodzica'), tr('Przytrzymaj zębatkę w rogu ekranu przez 2 sekundy. Znajdziesz tam postępy dziecka, album prac, limit czasu zabawy, język i dźwięk. Zakup i wysyłanie obrazków chroni dodatkowo krótkie działanie.')]
          : [tr('{n} dni pełnej wersji', { n }), tr('Przez pierwsze {n} dni zabawy otwarte są wszystkie krainy (liczą się tylko dni, w które dziecko gra). Potem Polana Zagadek zostaje za darmo, a resztę można odblokować jednorazowo w strefie rodzica.', { n })];
    const tx = b.x + b.w * 0.41;
    const tw = b.x + b.w - 50 - tx;
    const t = this.text(title, b.w < 900 ? 40 : 46, { weight: '800', wrap: tw });
    t.position.set(tx, b.y + 54);
    const bodySize = b.w < 900 ? 25 : 28;
    const d = this.text(body, bodySize, { color: SOFT, wrap: tw });
    d.position.set(tx, t.y + t.height + 22);
    // Długi tekst na małym ekranie: zmniejszamy, żeby nie wszedł na przyciski.
    const room = b.y + b.h - 130 - d.y;
    if (d.height > room) d.scale.set(room / d.height);
    this.content.addChild(t, d);
    const ix = b.x + b.w * 0.21;
    const iy = b.y + b.h * 0.46;
    if (page === 'hello') this.helloArt(ix, iy, b.h);
    else if (page === 'gate') this.gateArt(ix, iy);
    else this.trialArt(ix, iy, b.w);
    const next = this.button(tr('Dalej'), 250, '#ff7a59', () => this.go(this.page + 1));
    next.position.set(b.x + b.w - 50 - 125, b.y + b.h - 70);
  }

  private helloArt(x: number, y: number, h: number): void {
    const size = Math.min(320, h * 0.56);
    for (const [tex, dx] of [
      [this.art.bazyl, 70],
      [this.art.lusia, -70],
    ] as const) {
      const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: 1 } });
      s.scale.set(size / tex.height);
      s.position.set(x + dx, y + size / 2 + 20);
      this.content.addChild(s);
      idleBreath(this.tweens, s, 0.03, 1.6 + dx / 400);
    }
  }

  /** Zębatka z rączką i pierścieniem odliczania przytrzymania. */
  private gateArt(x: number, y: number): void {
    const gear = new Container();
    gear.position.set(x, y + 10);
    if (this.art.gear) {
      const s = new Sprite({ texture: this.art.gear, anchor: 0.5 });
      s.scale.set(150 / s.texture.height);
      gear.addChild(s);
    } else gear.addChild(new Graphics().circle(0, 0, 70).fill({ color: 0xc9b8a6 }).stroke({ color: COLORS.ink, width: 6 }));
    const ring = new Graphics();
    gear.addChild(ring);
    if (this.art.hand) {
      const hand = new Sprite({ texture: this.art.hand, anchor: HAND_TIP });
      hand.scale.set(150 / this.art.hand.height);
      hand.rotation = -0.35;
      hand.position.set(10, 10);
      gear.addChild(hand);
    }
    this.content.addChild(gear);
    // Przytrzymanie: pierścień rośnie 2 s (jak przy prawdziwej zębatce), potem zębatka „podskakuje”, pauza i od nowa.
    let popped = false;
    this.anim = (t) => {
      const k = (t % 3) / 2;
      ring.clear();
      if (k <= 1) {
        popped = false;
        ring.arc(0, 0, 98, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).stroke({ color: COLORS.sun, width: 14, cap: 'round' });
      } else if (!popped) {
        popped = true;
        void squash(this.tweens, gear, 0.15);
      }
    };
  }

  /** Pięć gwiazdek zapalanych po kolei (dni próby). */
  private trialArt(x: number, y: number, w: number): void {
    const n = TRIAL_DAYS;
    const gap = Math.min(78, (w * 0.36) / n);
    const stars = Array.from({ length: n }, (_, i) => {
      const g = new Graphics();
      g.position.set(x + (i - (n - 1) / 2) * gap, y - 10 + (i % 2 === 0 ? 0 : 26));
      this.content.addChild(g);
      return g;
    });
    const draw = (lit: number) =>
      stars.forEach((g, i) => {
        g.clear().star(0, 0, 5, 34, 15);
        if (i < lit) g.fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
        else g.fill({ color: 0xffffff }).stroke({ color: 0xc9b8a6, width: 5, join: 'round' });
      });
    draw(0);
    const days = this.text(tr('{n} dni zabawy', { n }), 30, { weight: '800', color: '#3f8a4a' });
    days.anchor.set(0.5);
    days.position.set(x, y + 90);
    this.content.addChild(days);
    let shown = -1;
    this.anim = (t) => {
      const lit = Math.min(n, Math.floor((t % (n * 0.45 + 1.5)) / 0.45));
      if (lit === shown) return;
      if (lit > shown && lit > 0) void popIn(this.tweens, stars[lit - 1]!, 0.25);
      shown = lit;
      draw(lit);
    };
  }

  /** Ostatnia karta: wiek dziecka (przyciski 3–6) i opcjonalne imię. */
  private agePage(b: { x: number; y: number; w: number; h: number }): void {
    const cx = b.x + b.w / 2;
    const t = this.text(tr('Ile lat ma dziecko?'), 46, { weight: '800', align: 'center' });
    t.anchor.set(0.5, 0);
    t.position.set(cx, b.y + 44);
    const d = this.text(tr('Od tego zależą pierwsze zadania. Potem trudność dopasowuje się sama.'), 27, { color: SOFT, align: 'center', wrap: b.w - 120 });
    d.anchor.set(0.5, 0);
    d.position.set(cx, t.y + t.height + 12);
    this.content.addChild(t, d);
    const size = 124;
    const gap = Math.min(170, (b.w - 120) / AGES.length);
    const row = d.y + d.height + 40 + size / 2;
    AGES.forEach((a, i) => {
      const btn = this.button(a === 6 ? '6+' : String(a), size, a === this.age ? AGE_PICKED : AGE_COLOR, () => this.pickAge(a), size, 54);
      btn.position.set(cx + (i - (AGES.length - 1) / 2) * gap, row);
    });
    // Dolny rząd: imię (opcjonalne) po lewej, start po prawej.
    const name = state.progress.childName;
    const nw = Math.min(520, b.w - 100 - 270 - 40);
    const nb = this.button(name ? tr('Imię: {name}', { name }) : tr('Dodaj imię dziecka (opcjonalnie)'), nw, '#9b7be0', () => this.askName(), 88, nw < 470 ? 22 : 25);
    nb.position.set(b.x + 50 + nw / 2, b.y + b.h - 70);
    const start = this.button(tr('Zaczynamy'), 270, '#4fae5f', () => this.finish(true));
    start.position.set(b.x + b.w - 50 - 135, b.y + b.h - 70);
    start.setEnabled(this.age !== null);
  }

  private pickAge(a: number): void {
    this.age = a;
    sfx.pop(this.game.sound, 1 + a * 0.04);
    haptics.tap();
    this.render();
  }

  private askName(): void {
    const v = window.prompt(tr('Jak ma na imię dziecko? (zostaje tylko na tym urządzeniu)'), state.progress.childName ?? '');
    if (v === null) return;
    const name = v.trim().slice(0, 20);
    state.progress.childName = name ? name[0]!.toUpperCase() + name.slice(1) : undefined;
    void saveState();
    this.render();
  }

  /** Kropki stron na dole karty. */
  private drawDots(b: { x: number; y: number; w: number; h: number }): void {
    const g = new Graphics();
    const n = this.pages.length;
    // Na ostatniej karcie dolny rząd zajmują przyciski: kropki idą wyżej, na środek.
    const last = this.pages[this.page] === 'age';
    const x0 = last ? b.x + b.w / 2 - ((n - 1) * 34) / 2 : b.x + 70;
    const y = last ? b.y + b.h - 150 : b.y + b.h - 70;
    for (let i = 0; i < n; i++) {
      if (i === this.page) g.circle(x0 + i * 34, y, 11).fill({ color: COLORS.ink });
      else g.circle(x0 + i * 34, y, 8).fill({ color: 0xc9b8a6 });
    }
    this.content.addChild(g);
  }

  private go(page: number): void {
    if (page >= this.pages.length) return;
    sfx.pop(this.game.sound, 1.1);
    this.page = page;
    this.t = 0;
    this.render();
    this.content.alpha = 0;
    this.tweens.to(this.content, { alpha: 1 }, { duration: 0.25 });
  }

  /** Koniec powitania. `withAge`: rodzic wybrał wiek (Pomiń zostawia poziomy bez zmian). */
  private finish(withAge: boolean): void {
    if (this.leaving) return;
    this.leaving = true;
    const p = state.progress;
    if (withAge && this.age !== null) applyAge(p, this.age);
    p.onboarded = true;
    void saveState();
    void this.game.scenes.go(new WorldScene(), { fade: 0.4, color: 0xfff6e8 });
  }

  override update(dt: number): void {
    if (!this.skip) return;
    this.t += dt;
    this.skip.tick(dt);
    for (const b of this.buttons) b.tick(dt);
    this.anim?.(this.t);
  }
}
