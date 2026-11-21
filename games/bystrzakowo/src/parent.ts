import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { shareImage } from '@funfactory/core/share';
import { Button, type Game, type View } from '@funfactory/kit2d';
import { loadArt, startMusic, stopMusic, type Art } from './assets.ts';
import { journal, today } from './log.ts';
import { loadLandscapes, paintings, pictureView, removePainting, type Painting } from './picture.ts';
import { hasFull } from './premium.ts';
import { newProgress } from './sim/progress.ts';
import { formatRange, makeReport, type Report } from './sim/report.ts';
import { gallery, type Landscape, type Picture } from './sim/stickers.ts';
import { saveState, state } from './state.ts';
import { LIMITS, reset as resetSession } from './session.ts';
import { COLORS, FONT as GAME_FONT } from './ui.ts';

const HOLD = 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Zębatka strefy rodzica: trzeba ją przytrzymać przez 2 s (bramka przed dziećmi, wymóg kategorii Kids).
 * Pierścień wokół pokazuje postęp przytrzymania.
 */
export class ParentGate extends Container {
  private readonly ring = new Graphics();
  private held = 0;
  private holding = false;
  onOpen: (() => void) | null = null;

  constructor() {
    super();
    const g = new Graphics();
    const r = 30;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.roundRect(Math.cos(a) * r - 9, Math.sin(a) * r - 9, 18, 18, 4).fill({ color: 0xffffff });
    }
    g.circle(0, 0, r).fill({ color: 0xffffff }).circle(0, 0, 11).fill({ color: 0xb9b0c8 });
    g.alpha = 0.85;
    this.addChild(g, this.ring);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 60 * 60 };
    this.on('pointerdown', () => (this.holding = true));
    const stop = () => {
      this.holding = false;
      this.held = 0;
      this.ring.clear();
    };
    this.on('pointerup', stop);
    this.on('pointerupoutside', stop);
  }

  tick(dt: number): void {
    if (!this.holding) return;
    this.held += dt;
    const t = Math.min(1, this.held / HOLD);
    this.ring.clear().arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2).stroke({ color: COLORS.sun, width: 10, cap: 'round' });
    if (t >= 1) {
      this.holding = false;
      this.held = 0;
      this.ring.clear();
      haptics.success();
      this.onOpen?.();
    }
  }
}

type Tab = 'postepy' | 'album' | 'pocztowka' | 'ustawienia';
const TABS: [Tab, string][] = [
  ['postepy', 'Postępy'],
  ['album', 'Album'],
  ['pocztowka', 'Pocztówka'],
  ['ustawienia', 'Ustawienia'],
];
const INK = '#5a3c28';
const SOFT = '#6b5a4a';
const TOP = 116;

/** Element albumu: pokolorowana kolorowanka albo obrazek z naklejanki. */
type AlbumItem = { kind: 'painting'; painting: Painting } | { kind: 'picture'; picture: Picture; index: number };

/**
 * Strefa rodzica (za bramką): postępy dziecka opisane po ludzku, album prac, cotygodniowa pocztówka
 * i ustawienia. Pełny raport i pocztówka są w pełnej wersji (premium.ts).
 */
export class ParentPanel extends Container {
  private readonly game: Game;
  private readonly onClose: () => void;
  private readonly dim = new Graphics();
  private readonly sheet = new Graphics();
  private readonly bar = new Container();
  private readonly viewport = new Container();
  private readonly content = new Container();
  private readonly clip = new Graphics();
  private buttons: Button[] = [];
  private tab: Tab = 'postepy';
  private view!: View;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private scroll = 0;
  private contentH = 0;
  private drag: { y: number; scroll: number; moved: number } | null = null;
  private overlay: Container | null = null;
  private readonly textures: Texture[] = [];
  private art: Art | null = null;
  private landscapes: Map<Landscape, Texture> | null = null;
  private confirmReset = false;
  private version = 0;

  constructor(game: Game, onClose: () => void) {
    super();
    this.game = game;
    this.onClose = onClose;
    this.dim.eventMode = 'static';
    this.viewport.addChild(this.content);
    this.viewport.mask = this.clip;
    this.addChild(this.dim, this.sheet, this.viewport, this.clip, this.bar);
    this.eventMode = 'static';
    this.on('pointerdown', (e) => {
      const p = this.toLocal(e.global);
      if (this.overlay || p.y < this.box.y + TOP) return;
      this.drag = { y: p.y, scroll: this.scroll, moved: 0 };
    });
    this.on('globalpointermove', (e) => {
      if (!this.drag) return;
      const p = this.toLocal(e.global);
      this.drag.moved = Math.max(this.drag.moved, Math.abs(p.y - this.drag.y));
      this.setScroll(this.drag.scroll - (p.y - this.drag.y));
    });
    const end = () => this.timers(() => (this.drag = null));
    this.on('pointerup', end);
    this.on('pointerupoutside', end);
    void loadArt().then(async (art) => {
      this.art = art;
      this.landscapes = await loadLandscapes(art);
      if (!this.destroyed && this.view) this.render();
    });
  }

  /** Puszczenie palca kończy przewijanie dopiero po obsłużeniu dotknięcia przycisku. */
  private timers(fn: () => void): void {
    requestAnimationFrame(fn);
  }

  /** Dotknięcie przycisku po przewinięciu nie jest dotknięciem. */
  private tapped(): boolean {
    return !this.drag || this.drag.moved < 14;
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
        lineHeight: size * 1.38,
        align: opts.align ?? 'left',
      },
    });
  }

  private button(label: string, width: number, color: string, onTap: () => void, height = 80, fontSize = 28): Button {
    const b = new Button({ label, width, height, fontSize, color, radius: 22, resolution: this.game.pixelRatio, onTap: () => this.tapped() && onTap() });
    this.buttons.push(b);
    return b;
  }

  layout(view: View): void {
    this.view = view;
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x2a1a40, alpha: 0.6 });
    const x = view.safe.left + 20;
    const y = view.safe.top + 14;
    const w = view.width - view.safe.right - 20 - x;
    const h = view.height - Math.max(14, view.safe.bottom) - y;
    this.box = { x, y, w, h };
    this.sheet.clear().roundRect(x, y, w, h, 34).fill({ color: 0xfffaf2 }).stroke({ color: COLORS.ink, width: 6 });
    this.clip.clear().rect(x, y + TOP, w, h - TOP - 6).fill({ color: 0xffffff });
    this.render();
  }

  private setTab(tab: Tab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.scroll = 0;
    this.confirmReset = false;
    this.render();
  }

  private setScroll(v: number): void {
    const max = Math.max(0, this.contentH - (this.box.h - TOP - 30));
    this.scroll = Math.max(0, Math.min(max, v));
    this.content.y = this.box.y + TOP + 10 - this.scroll;
  }

  /** Pasek z zakładkami i całą zawartość bieżącej zakładki od nowa. */
  private render(): void {
    if (!this.view) return;
    this.version++;
    this.buttons = [];
    for (const c of [...this.bar.removeChildren(), ...this.content.removeChildren()]) c.destroy({ children: true });
    const { x, y, w } = this.box;
    // Pasek: tytuł (gdy się mieści), zakładki, zamknięcie.
    const close = this.button('Zamknij', 170, '#5cc36a', () => this.onClose(), 80, 26);
    close.position.set(x + w - 24 - 85, y + 58);
    const showTitle = w > 1180;
    const left = x + 24 + (showTitle ? 250 : 0);
    const room = x + w - 24 - 170 - 20 - left;
    const tw = Math.min(210, (room - 3 * 12) / 4);
    if (showTitle) {
      const title = this.text('Dla rodzica', 38, { weight: '800' });
      title.position.set(x + 30, y + 34);
      this.bar.addChild(title);
    }
    TABS.forEach(([id, name], i) => {
      const b = this.button(name, tw, id === this.tab ? '#ff9f5a' : '#c9b8a6', () => this.setTab(id), 80, tw < 180 ? 24 : 27);
      b.position.set(left + tw / 2 + i * (tw + 12), y + 58);
      this.bar.addChild(b);
    });
    this.bar.addChild(close);
    this.bar.addChild(new Graphics().moveTo(x + 6, y + TOP - 4).lineTo(x + w - 6, y + TOP - 4).stroke({ color: 0xeadfce, width: 4 }));

    this.content.x = x + 30;
    const cw = w - 60;
    const h = this.tab === 'postepy' ? this.renderProgress(cw) : this.tab === 'album' ? this.renderAlbum(cw) : this.tab === 'pocztowka' ? this.renderPostcardTab(cw) : this.renderSettings(cw);
    this.contentH = h;
    this.setScroll(this.scroll);
  }

  private report(): Report {
    return makeReport({ journal: journal(), levels: state.progress.levels, name: state.progress.childName, today: today() });
  }

  /** Karta: zaokrąglony prostokąt z treścią; zwraca wysokość. */
  private card(at: { x: number; y: number }, width: number, build: (inner: Container, width: number) => number, fill = 0xffffff): number {
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const inner = new Container();
    inner.position.set(26, 22);
    c.addChild(inner);
    const h = build(inner, width - 52) + 44;
    bg.roundRect(0, 4, width, h, 24).fill({ color: 0x000000, alpha: 0.06 }).roundRect(0, 0, width, h, 24).fill({ color: fill }).stroke({ color: 0xeadfce, width: 4 });
    c.position.set(at.x, at.y);
    this.content.addChild(c);
    return h;
  }

  private stars(n: number): Graphics {
    const g = new Graphics();
    for (let i = 0; i < 3; i++) g.star(i * 40, 0, 5, 17, 8).fill({ color: i < n ? COLORS.sun : 0xe6ddd0 }).stroke({ color: i < n ? COLORS.ink : 0xd6cabb, width: 3, join: 'round' });
    return g;
  }

  // ——— Postępy ———

  private renderProgress(cw: number): number {
    const r = this.report();
    let y = 0;
    const name = this.text(state.progress.childName ? r.who : 'Twoje dziecko', 40, { weight: '800' });
    this.content.addChild(name);
    const edit = this.button(state.progress.childName ? 'Zmień imię' : 'Podaj imię dziecka', state.progress.childName ? 200 : 300, '#9b7be0', () => this.askName(), 70, 24);
    edit.position.set(name.width + 30 + edit.width / 2, 28);
    this.content.addChild(edit);
    y += 70;
    const week = this.text(r.weekText, 26, { color: SOFT, wrap: cw });
    week.y = y;
    this.content.addChild(week);
    y += week.height + 24;

    if (!hasFull()) {
      y += this.card({ x: 0, y }, cw, (c, iw) => {
        const t = this.text('Pełny raport w pełnej wersji', 30, { weight: '800' });
        const b = this.text(
          '• Co dziecko już umie: liczenie, głoski i literki, kolory, kształty, emocje, logika.\n• Co sprawia jeszcze kłopot i nad czym popracować.\n• Pomysły na zabawę bez ekranu, dobrane do postępów.\n• Cotygodniowa pocztówka z sukcesami do wysłania bliskim.',
          25,
          { color: SOFT, wrap: iw },
        );
        b.y = 54;
        c.addChild(t, b);
        return 54 + b.height;
      }, 0xfff3dd);
      return y + 20;
    }

    const cols = cw >= 980 ? 2 : 1;
    const gap = 22;
    const colW = (cw - gap * (cols - 1)) / cols;
    for (let i = 0; i < r.skills.length; i += cols) {
      let rowH = 0;
      for (let k = 0; k < cols && i + k < r.skills.length; k++) {
        const s = r.skills[i + k]!;
        const h = this.card({ x: k * (colW + gap), y }, colW, (c, iw) => {
          const t = this.text(s.title, 29, { weight: '800' });
          const st = this.stars(s.stars);
          st.position.set(iw - 97, 20);
          const body = this.text(s.lines.join('\n'), 24, { color: SOFT, wrap: iw });
          body.y = 50;
          c.addChild(t, st, body);
          return 50 + body.height;
        });
        rowH = Math.max(rowH, h);
      }
      y += rowH + gap;
    }
    y += this.card({ x: 0, y }, cw, (c, iw) => {
      const t = this.text('Pomysły na zabawę bez ekranu', 29, { weight: '800' });
      const body = this.text(r.tips.map((x) => `• ${x}`).join('\n'), 25, { color: SOFT, wrap: iw });
      body.y = 50;
      c.addChild(t, body);
      return 50 + body.height;
    }, 0xeef8e8);
    y += 20;
    const note = this.text('Gwiazdki pokazują, jak dziecku idzie w danej dziedzinie. Wszystko liczy się tylko na tym urządzeniu.', 21, { color: '#9a8b7c', wrap: cw });
    note.y = y;
    this.content.addChild(note);
    return y + note.height + 20;
  }

  private askName(): void {
    const v = window.prompt('Jak ma na imię dziecko? (zostaje tylko na tym urządzeniu)', state.progress.childName ?? '');
    if (v === null) return;
    const name = v.trim().slice(0, 20);
    state.progress.childName = name ? name[0]!.toUpperCase() + name.slice(1) : undefined;
    void saveState();
    this.render();
  }

  // ——— Album ———

  private renderAlbum(cw: number): number {
    const v = this.version;
    const intro = this.text('Prace dziecka z Pracowni Malucha. Dotknij obrazka, żeby go powiększyć, zapisać albo wysłać.', 25, { color: SOFT, wrap: cw });
    this.content.addChild(intro);
    const top = intro.height + 24;
    const loading = this.text('Wczytuję…', 26, { color: SOFT });
    loading.y = top;
    this.content.addChild(loading);
    void paintings().then((list) => {
      if (v !== this.version || this.destroyed || !this.art || !this.landscapes) return;
      loading.destroy();
      const items: AlbumItem[] = [
        ...gallery(state.progress).pictures.map((picture, index) => ({ kind: 'picture' as const, picture, index })).filter((x) => x.picture.items.length > 0),
        ...list.map((painting) => ({ kind: 'painting' as const, painting })),
      ];
      if (!items.length) {
        const empty = this.text('Na razie pusto. Tu pojawią się pokolorowane kolorowanki i obrazki z naklejek.', 27, { wrap: cw });
        empty.y = top;
        this.content.addChild(empty);
        this.contentH = top + empty.height;
        return;
      }
      const cols = cw >= 1100 ? 4 : 3;
      const gap = 22;
      const cardW = (cw - gap * (cols - 1)) / cols;
      const cardH = cardW * 0.72;
      items.forEach((it, i) => {
        const card = this.albumCard(it, cardW, cardH);
        card.position.set((i % cols) * (cardW + gap) + cardW / 2, top + Math.floor(i / cols) * (cardH + gap) + cardH / 2);
        this.content.addChild(card);
      });
      this.contentH = top + Math.ceil(items.length / cols) * (cardH + gap);
      this.setScroll(this.scroll);
    });
    return top + 60;
  }

  /** Obraz elementu albumu dopasowany do `w`×`h` (sprite albo kontener). */
  private async albumImage(it: AlbumItem, w: number, h: number, coverMode: boolean): Promise<Container> {
    if (it.kind === 'painting') {
      const tex = await dataUrlTexture(it.painting.img);
      this.textures.push(tex);
      const s = new Sprite({ texture: tex, anchor: 0.5 });
      const k = coverMode ? Math.max(w / tex.width, h / tex.height) : Math.min(w / tex.width, h / tex.height);
      s.scale.set(k);
      return s;
    }
    const { width: vw, height: vh } = this.view;
    const pic = pictureView(it.picture, vw, vh, this.art!, this.landscapes!);
    const k = coverMode ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh);
    pic.scale.set(k);
    pic.position.set((-vw * k) / 2, (-vh * k) / 2);
    // Tło jest dopasowane „na wypełnienie” i wystaje poza kadr: przycinamy do obrazka.
    const clip = new Graphics().rect((-vw * k) / 2, (-vh * k) / 2, vw * k, vh * k).fill({ color: 0xffffff });
    const wrap = new Container();
    wrap.addChild(pic, clip);
    pic.mask = clip;
    return wrap;
  }

  private albumCard(it: AlbumItem, w: number, h: number): Container {
    const card = new Container();
    const frame = new Graphics().roundRect(-w / 2, -h / 2 + 5, w, h, 20).fill({ color: 0x000000, alpha: 0.12 }).roundRect(-w / 2, -h / 2, w, h, 20).fill({ color: 0xffffff });
    const mask = new Graphics().roundRect(-w / 2, -h / 2, w, h, 20).fill({ color: 0xffffff });
    const outline = new Graphics().roundRect(-w / 2, -h / 2, w, h, 20).stroke({ color: 0xeadfce, width: 5 });
    card.addChild(frame, mask, outline);
    void this.albumImage(it, w, h, it.kind === 'picture').then((img) => {
      if (card.destroyed) return img.destroy({ children: true });
      img.mask = mask;
      card.addChildAt(img, 1);
    });
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new Rectangle(-w / 2, -h / 2, w, h);
    card.on('pointertap', () => this.tapped() && this.openPreview(it));
    return card;
  }

  private openPreview(it: AlbumItem): void {
    if (this.overlay) return;
    const { width: vw, height: vh } = this.view;
    const o = new Container();
    const bg = new Graphics().rect(0, 0, vw, vh).fill({ color: 0x1e1230, alpha: 0.85 });
    bg.eventMode = 'static';
    o.addChild(bg);
    const pw = vw - this.view.safe.left - this.view.safe.right - 120;
    const ph = vh - this.view.safe.top - 170;
    const holder = new Container();
    holder.position.set(vw / 2, this.view.safe.top + 30 + ph / 2);
    o.addChild(holder);
    void this.albumImage(it, pw, ph, false).then((img) => (o.destroyed ? img.destroy({ children: true }) : holder.addChild(img)));
    const close = () => {
      this.overlay = null;
      this.buttons = this.buttons.filter((b) => !b.destroyed && b.parent?.parent !== o && b.parent !== o);
      o.destroy({ children: true });
    };
    const y = vh - 70;
    const share = this.button('Zapisz / wyślij', 280, '#5cb3ff', () => void this.share(it), 84, 28);
    share.position.set(vw / 2 - 160, y);
    const back = this.button('Wróć', 200, '#5cc36a', close, 84, 28);
    back.position.set(vw / 2 + 120, y);
    o.addChild(share, back);
    if (it.kind === 'painting') {
      let armed = false;
      const del: Button = this.button('Usuń', 160, '#e8835a', () => {
        if (!armed) {
          armed = true;
          del.setLabel('Na pewno?');
          return;
        }
        void removePainting(it.painting.id).then(() => {
          close();
          this.render();
        });
      }, 84, 28);
      del.position.set(vw / 2 + 340, y);
      o.addChild(del);
    }
    this.overlay = o;
    this.addChild(o);
  }

  private async share(it: AlbumItem): Promise<void> {
    haptics.tap();
    if (it.kind === 'painting') {
      await shareImage(it.painting.img, `bystrzakowo-${it.painting.date}.jpg`, 'Obrazek z Bystrzakowa');
      return;
    }
    const { width: vw, height: vh } = this.view;
    const pic = pictureView(it.picture, vw, vh, this.art!, this.landscapes!);
    const url = await this.game.app.renderer.extract.base64({ target: pic, format: 'jpg', quality: 0.9, resolution: 1600 / vw, frame: new Rectangle(0, 0, vw, vh) });
    pic.destroy({ children: true });
    await shareImage(url, `bystrzakowo-naklejki-${today()}.jpg`, 'Obrazek z Bystrzakowa');
  }

  // ——— Pocztówka ———

  private renderPostcardTab(cw: number): number {
    if (!hasFull()) {
      return this.card({ x: 0, y: 0 }, cw, (c, iw) => {
        const t = this.text('Pocztówka tygodnia w pełnej wersji', 30, { weight: '800' });
        const b = this.text('Co tydzień ładna kartka z Lusią i Bazylem: imię dziecka i jego najważniejsze sukcesy. Można ją zapisać w zdjęciach albo wysłać babci i dziadkowi.', 25, { color: SOFT, wrap: iw });
        b.y = 54;
        c.addChild(t, b);
        return 54 + b.height;
      }, 0xfff3dd);
    }
    if (!this.art) {
      this.content.addChild(this.text('Wczytuję…', 26, { color: SOFT }));
      return 60;
    }
    const r = this.report();
    const avail = this.box.h - TOP - 150;
    const k = Math.min(cw / POSTCARD_W, avail / POSTCARD_H);
    const card = postcard(this.game, this.art, r, this.game.pixelRatio * Math.max(1, k));
    card.scale.set(k);
    card.x = (cw - POSTCARD_W * k) / 2;
    this.content.addChild(card);
    const y = POSTCARD_H * k + 20;
    const share = this.button('Zapisz / wyślij pocztówkę', 400, '#5cb3ff', () => void this.sharePostcard(r), 84, 28);
    share.position.set(cw / 2, y + 42);
    this.content.addChild(share);
    if (!state.progress.childName) {
      const hint = this.button('Dodaj imię dziecka', 300, '#9b7be0', () => this.askName(), 70, 24);
      hint.position.set(cw / 2 + 380, y + 42);
      this.content.addChild(hint);
    }
    return y + 100;
  }

  private async sharePostcard(r: Report): Promise<void> {
    haptics.tap();
    const card = postcard(this.game, this.art!, r, 1);
    const url = await this.game.app.renderer.extract.base64({ target: card, format: 'png', resolution: 1, frame: new Rectangle(0, 0, POSTCARD_W, POSTCARD_H) });
    card.destroy({ children: true });
    await shareImage(url, `pocztowka-${r.week.to}.png`, 'Pocztówka z Bystrzakowa');
  }

  // ——— Ustawienia ———

  private renderSettings(cw: number): number {
    let y = 0;
    const info = this.text('Bystrzakowo działa bez internetu, bez reklam i nie zbiera żadnych danych. Postępy, imię i prace dziecka zapisują się tylko na tym urządzeniu.', 25, { color: SOFT, wrap: cw });
    this.content.addChild(info);
    y += info.height + 30;
    const bw = Math.min(520, cw);
    const cx = bw / 2;
    const add = (b: Button) => {
      b.position.set(cx, y + 40);
      this.content.addChild(b);
      y += 100;
    };
    const nameLabel = () => (state.progress.childName ? `Imię dziecka: ${state.progress.childName}` : 'Imię dziecka: nie podano');
    add(this.button(nameLabel(), bw, '#9b7be0', () => this.askName()));
    const musicLabel = () => (state.progress.music ? 'Muzyka: włączona' : 'Muzyka: wyłączona');
    const music: Button = this.button(musicLabel(), bw, '#5cb3ff', () => {
      state.progress.music = !state.progress.music;
      if (state.progress.music) startMusic(this.game);
      else stopMusic(this.game);
      music.setLabel(musicLabel());
      void saveState();
    });
    add(music);
    const limitLabel = () => (state.progress.limit ? `Czas zabawy: ${state.progress.limit} min` : 'Czas zabawy: bez limitu');
    const limit: Button = this.button(limitLabel(), bw, '#9b7be0', () => {
      const i = LIMITS.indexOf((state.progress.limit ?? 0) as (typeof LIMITS)[number]);
      state.progress.limit = LIMITS[(i + 1) % LIMITS.length];
      resetSession();
      limit.setLabel(limitLabel());
      void saveState();
    });
    add(limit);
    const reset: Button = this.button('Wyzeruj postępy', bw, '#e8835a', () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        reset.setLabel('Na pewno? Dotknij jeszcze raz');
        return;
      }
      const { music: m, childName } = state.progress;
      state.progress = { ...newProgress(), music: m, childName };
      void saveState();
      reset.setLabel('Wyzerowano');
    });
    add(reset);
    const ver = this.text(hasFull() ? 'Wersja: pełna' : 'Wersja: darmowa', 22, { color: '#9a8b7c' });
    ver.y = y + 10;
    this.content.addChild(ver);
    return y + 60;
  }

  tick(dt: number): void {
    for (const b of this.buttons) if (!b.destroyed) b.tick(dt);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    for (const t of this.textures) t.destroy(true);
    super.destroy(options);
  }
}

// ——— Pocztówka (rysowana w stałym rozmiarze; podgląd skalowany, eksport 1:1) ———

export const POSTCARD_W = 1200;
export const POSTCARD_H = 840;

function postcard(game: Game, art: Art, r: Report, resolution: number): Container {
  const c = new Container();
  const W = POSTCARD_W;
  const H = POSTCARD_H;
  const bg = new Graphics().roundRect(0, 0, W, H, 48).fill({ color: 0xfff1d6 }).stroke({ color: COLORS.ink, width: 12 });
  bg.roundRect(26, 26, W - 52, H - 52, 34).stroke({ color: 0xffc94a, width: 6 });
  c.addChild(bg);
  // Konfetti na brzegach (stały wzór, bez losowania).
  const dots = new Graphics();
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = 60 + ((t * 7919) % 1) * (W - 120);
    const y = i % 2 ? 60 + ((i * 37) % 60) : H - 60 - ((i * 53) % 60);
    // Środek zostaje wolny na tytuł i datę.
    if (Math.abs(x - W / 2) < 330) continue;
    dots.circle(x, y, 7 + (i % 3) * 3).fill({ color: COLORS.confetti[i % COLORS.confetti.length]! });
  }
  c.addChild(dots);
  const t = (value: string, size: number, fill: string, stroke?: string, weight: '700' | '800' = '800') =>
    new Text({
      text: value,
      anchor: { x: 0.5, y: 0 },
      resolution,
      style: { fontFamily: GAME_FONT, fontSize: size, fontWeight: weight, fill, align: 'center', ...(stroke ? { stroke: { color: stroke, width: size * 0.14, join: 'round' as const } } : {}), wordWrap: true, wordWrapWidth: 760, lineHeight: size * 1.15 },
    });
  const head = t('Pocztówka z Bystrzakowa', 52, '#ffc94a', '#5a3c28');
  head.position.set(W / 2, 70);
  const name = t(state.progress.childName ? r.who : 'Mały Bystrzak', 96, '#ff7a59', '#5a3c28');
  name.position.set(W / 2, 150);
  const sub = t(r.week.days ? 'w tym tygodniu:' : 'czeka na wspólną zabawę!', 40, '#5a3c28', undefined, '700');
  sub.position.set(W / 2, 290);
  c.addChild(head, name, sub);
  const lines = r.week.days ? (r.highlights.length ? r.highlights : ['Pierwsze zabawy w Bystrzakowie']) : [];
  lines.forEach((line, i) => {
    const y = 370 + i * 92;
    const star = new Graphics().star(0, 0, 5, 26, 12).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 5, join: 'round' });
    const txt = t(line, 44, '#5a3c28', undefined, '700');
    txt.anchor.set(0, 0.5);
    const total = 70 + txt.width;
    star.position.set(W / 2 - total / 2 + 26, y);
    txt.position.set(W / 2 - total / 2 + 70, y);
    c.addChild(star, txt);
  });
  const date = t(formatRange(r.week.from, r.week.to), 30, '#8a6f58', undefined, '700');
  date.position.set(W / 2, H - 96);
  c.addChild(date);
  const guide = (tex: Texture, x: number, flip: boolean) => {
    const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: 1 } });
    const k = 300 / tex.height;
    s.scale.set(flip ? -k : k, k);
    s.position.set(x, H - 40);
    c.addChild(s);
  };
  guide(art.lusia, 150, false);
  guide(art.bazyl, W - 150, true);
  void game;
  return c;
}

/** Wczytanie obrazka z data URL przez ImageBitmap (bez wgrywania canvasa, zob. CLAUDE.md). */
async function dataUrlTexture(url: string): Promise<Texture> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return Texture.from(await createImageBitmap(img));
}
