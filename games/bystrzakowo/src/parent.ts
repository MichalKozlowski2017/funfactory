import { BlurFilter, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { shareImage } from '@funfactory/core/share';
import { Button, type Game, type View } from '@funfactory/kit2d';
import { loadArt, startMusic, stopMusic, type Art } from './assets.ts';
import { journal, today } from './log.ts';
import { applyAge, nextAge, playedActivities } from './sim/onboarding.ts';
import { loadLandscapes, paintings, pictureView, removePainting, type Painting } from './picture.ts';
import { hasFull, isBought, price, purchase, restorePurchase, trial } from './premium.ts';
import { newProgress } from './sim/progress.ts';
import { formatRange, makeReport, type Report } from './sim/report.ts';
import { gallery, type Landscape, type Picture } from './sim/stickers.ts';
import { saveState, state } from './state.ts';
import { LIMITS, reset as resetSession } from './session.ts';
import { COLORS, FONT as GAME_FONT } from './ui.ts';
import { tr } from './sim/i18n.ts';
import { lang, LANGS, type Lang } from './sim/lang.ts';
import { lineChart } from './chart.ts';
import { accuracy, enoughPoints, itemName, itemsOf, itemState, mastery, milestones, sampleAccuracy, sampleTempo, SKILLS, tempo, type ItemState, type Point, type Range, type SkillDef, type SkillId } from './sim/skills.ts';

const HOLD = 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Parent zone gear: it has to be held for 2 s (a gate against children, a Kids category requirement).
 * A ring around it shows the hold progress.
 */
/**
 * Adult gate before a purchase and before sending a picture outside the app (a Kids category requirement): a question
 * a preschooler can't solve (multiplication, four answers). For the parent zone itself, holding the gear
 * is enough (owner's decision 2026-11-24). Tapping outside closes the question, a wrong answer
 * locks it for 15 s (random tapping: a 1/4 chance at most every 15 s).
 */
export class AdultCheck extends Container {
  private readonly buttons: Button[] = [];

  constructor(game: Game, onPass: () => void, onClose: () => void, onFail: () => void = onClose) {
    super();
    const { width: w, height: h } = game.view;
    const pr = game.pixelRatio;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0x2a1a40, alpha: 0.6 });
    dim.eventMode = 'static';
    dim.on('pointertap', onClose);
    const cw = Math.min(560, w - 40), ch = 300;
    const card = new Graphics().roundRect(-cw / 2, -ch / 2, cw, ch, 36).fill({ color: 0xfffaf2 }).stroke({ color: COLORS.ink, width: 5 });
    card.position.set(w / 2, h / 2);
    card.eventMode = 'static';
    const a = game.rng.int(6, 9), b = game.rng.int(6, 9), ok = a * b;
    const wrong = game.rng.shuffle([...new Set([ok + a, ok - b, ok + 10, ok - 10, ok + b, ok - a])].filter((x) => x !== ok && x > 0)).slice(0, 3);
    const t1 = new Text({ text: tr('grownUps'), style: { fontFamily: GAME_FONT, fontSize: 30, fill: '#8a7a6a', fontWeight: '800' }, resolution: pr, anchor: 0.5 });
    t1.position.set(0, -ch / 2 + 44);
    const t2 = new Text({ text: `${a} × ${b} = ?`, style: { fontFamily: GAME_FONT, fontSize: 64, fill: '#3b2a20', fontWeight: '900' }, resolution: pr, anchor: 0.5 });
    t2.position.set(0, -20);
    card.addChild(t1, t2);
    const opts = game.rng.shuffle([ok, ...wrong]);
    const bw = (cw - 80) / 4;
    opts.forEach((v, i) => {
      const btn = new Button({ label: String(v), width: bw - 12, height: 92, color: '#5cb3ff', fontFamily: GAME_FONT, fontSize: 40, resolution: pr, onTap: () => (v === ok ? onPass() : onFail()) });
      btn.position.set(-cw / 2 + 40 + bw * (i + 0.5), ch / 2 - 70);
      card.addChild(btn);
      this.buttons.push(btn);
    });
    this.addChild(dim, card);
  }

  tick(dt: number): void {
    for (const b of this.buttons) b.tick(dt);
  }
}

export class ParentGate extends Container {
  private readonly ring = new Graphics();
  /** "Something new for the parent" dot (after a few play days since the last visit). */
  private readonly badge = new Graphics().circle(0, 0, 13).fill({ color: 0xff7a59 }).stroke({ color: 0xffffff, width: 4 });
  private time = 0;
  private held = 0;
  private holding = false;
  private wasLocked = false;
  onOpen: (() => void) | null = null;
  /** An attempt to open during the lockout (after a wrong answer), with the number of seconds remaining. */
  onLocked: ((seconds: number) => void) | null = null;
  /** After a wrong answer the gate is locked until this moment (performance.now, ms), for all scenes. */
  static lockedUntil = 0;
  static readonly LOCK_MS = 15_000;
  static lock(): void {
    ParentGate.lockedUntil = performance.now() + ParentGate.LOCK_MS;
  }

  constructor(gear: Texture | null = null) {
    super();
    // A cream circle like the realm tabs, with a plasticine gear inside (no image: the gear is drawn).
    const g = new Graphics().circle(0, 5, 40).fill({ color: 0x000000, alpha: 0.15 }).circle(0, 0, 40).fill({ color: 0xfffaf2 }).stroke({ color: COLORS.ink, width: 4 });
    if (gear) {
      const pic = new Sprite({ texture: gear, anchor: 0.5 });
      pic.scale.set(58 / Math.max(gear.width, gear.height));
      g.addChild(pic);
    } else {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.roundRect(Math.cos(a) * 20 - 6, Math.sin(a) * 20 - 6, 12, 12, 3).fill({ color: 0xb9a6e0 });
      }
      g.circle(0, 0, 20).fill({ color: 0xb9a6e0 }).circle(0, 0, 8).fill({ color: 0xfffaf2 });
    }
    this.badge.position.set(26, -26);
    this.badge.visible = false;
    this.addChild(g, this.ring, this.badge);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 60 * 60 };
    const stop = () => {
      this.holding = false;
      this.held = 0;
      this.ring.clear();
    };
    this.on('pointerdown', () => (this.holding = true));
    // The finger slid off the gear: the hold is interrupted (a child running a finger across the screen won't get through).
    this.on('globalpointermove', (e) => {
      if (!this.holding) return;
      const p = this.toLocal(e.global);
      if (p.x * p.x + p.y * p.y > 70 * 70) stop();
    });
    this.on('pointerup', stop);
    this.on('pointerupoutside', stop);
  }

  setBadge(on: boolean): void {
    this.badge.visible = on;
  }

  tick(dt: number): void {
    this.time += dt;
    if (this.badge.visible) this.badge.scale.set(1 + 0.12 * Math.sin(this.time * 4));
    // Visible lockout: a dimmed gear and a gray ring that shrinks until the lockout ends
    // (without it the parent thought the parent zone had stopped working).
    const left = ParentGate.lockedUntil - performance.now();
    if (left > 0) {
      this.wasLocked = true;
      this.alpha = 0.5;
      this.ring.clear().arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + (left / ParentGate.LOCK_MS) * Math.PI * 2).stroke({ color: 0x9a8f86, width: 8, cap: 'round' });
      if (this.holding && this.held === 0) this.onLocked?.(Math.ceil(left / 1000));
      this.held = this.holding ? this.held + dt : 0;
      return;
    }
    if (this.wasLocked) {
      this.wasLocked = false;
      this.alpha = 1;
      this.ring.clear();
      this.held = 0;
    }
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

type Tab = 'progress' | 'album' | 'postcard' | 'settings';
const TABS: [Tab, string][] = [
  ['progress', 'progress'],
  ['album', 'album'],
  ['postcard', 'postcard'],
  ['settings', 'settings'],
];
const INK = '#5a3c28';
const SOFT = '#6b5a4a';
const TOP = 116;

/** Album item: a colored coloring page or a sticker picture. */
type AlbumItem = { kind: 'painting'; painting: Painting } | { kind: 'picture'; picture: Picture; index: number };

/**
 * Parent zone (behind the gate): the child's progress described in plain words, an album of creations, a weekly postcard
 * and settings. The full report and the postcard are in the full version (premium.ts).
 */
export class ParentPanel extends Container {
  private readonly game: Game;
  private readonly onClose: () => void;
  private readonly onUnlock: () => void;
  /** Adult gate (multiplication) before a purchase and before sending anything outside the app (a Kids category requirement). */
  private readonly askAdult: (then: () => void) => void;
  private storePrice: string | null = null;
  private shopNote = '';
  private buying = false;
  private readonly dim = new Graphics();
  private readonly sheet = new Graphics();
  private readonly bar = new Container();
  private readonly viewport = new Container();
  private readonly content = new Container();
  private readonly clip = new Graphics();
  private buttons: Button[] = [];
  private tab: Tab = 'progress';
  /** Skill details in the Progress tab (null: the "Ready for school" list). */
  private skill: SkillId | null = null;
  /** Chart range: recent days or weeks (parent's choice). */
  private range: Range = 'weeks';
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

  constructor(game: Game, onClose: () => void, onUnlock: () => void = () => {}, askAdult: (then: () => void) => void = (then) => then()) {
    super();
    this.game = game;
    this.onClose = onClose;
    this.askAdult = askAdult;
    this.onUnlock = onUnlock;
    void price().then((p) => {
      this.storePrice = p;
      if (!this.destroyed && this.view && !isBought()) this.render();
    });
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

  /** Releasing the finger ends scrolling only after the button tap has been handled. */
  private timers(fn: () => void): void {
    requestAnimationFrame(fn);
  }

  /** A button touch after scrolling doesn't count as a tap. */
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

  layout(full: View): void {
    // Tablet (shorter screen side from 600 pt): the panel at a smaller scale. An adult holds a tablet close, and at phone
    // scale the buttons and texts are huge and little content fits.
    const { width, height } = this.game.app.screen;
    const k = Math.min(width, height) >= 600 ? 0.72 : 1;
    this.scale.set(k);
    const s = full.safe;
    const view: View = { width: full.width / k, height: full.height / k, safe: { top: s.top / k, right: s.right / k, bottom: s.bottom / k, left: s.left / k } };
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
    if (tab === this.tab && !this.skill) return;
    this.tab = tab;
    this.skill = null;
    this.scroll = 0;
    this.confirmReset = false;
    this.render();
  }

  private setScroll(v: number): void {
    const max = Math.max(0, this.contentH - (this.box.h - TOP - 30));
    this.scroll = Math.max(0, Math.min(max, v));
    this.content.y = this.box.y + TOP + 10 - this.scroll;
  }

  /** Rebuilds the tab bar and the whole content of the current tab. */
  private render(): void {
    if (!this.view) return;
    this.version++;
    this.buttons = [];
    for (const c of [...this.bar.removeChildren(), ...this.content.removeChildren()]) c.destroy({ children: true });
    const { x, y, w } = this.box;
    // Bar: title (when it fits), tabs, close.
    const close = this.button(tr('close'), 170, '#5cc36a', () => this.onClose(), 80, 26);
    close.position.set(x + w - 24 - 85, y + 58);
    const showTitle = w > 1180;
    const left = x + 24 + (showTitle ? 250 : 0);
    const room = x + w - 24 - 170 - 20 - left;
    const tw = Math.min(210, (room - 3 * 12) / 4);
    if (showTitle) {
      const title = this.text(tr('parents'), 38, { weight: '800' });
      title.position.set(x + 30, y + 34);
      this.bar.addChild(title);
    }
    TABS.forEach(([id, name], i) => {
      const b = this.button(tr(name), tw, id === this.tab ? '#ff9f5a' : '#c9b8a6', () => this.setTab(id), 80, tw < 180 ? 24 : 27);
      b.position.set(left + tw / 2 + i * (tw + 12), y + 58);
      this.bar.addChild(b);
    });
    this.bar.addChild(close);
    this.bar.addChild(new Graphics().moveTo(x + 6, y + TOP - 4).lineTo(x + w - 6, y + TOP - 4).stroke({ color: 0xeadfce, width: 4 }));

    this.content.x = x + 30;
    const cw = w - 60;
    const h = this.tab === 'progress' ? (this.skill ? this.renderSkill(cw) : this.renderProgress(cw)) : this.tab === 'album' ? this.renderAlbum(cw) : this.tab === 'postcard' ? this.renderPostcardTab(cw) : this.renderSettings(cw);
    this.contentH = h;
    this.setScroll(this.scroll);
  }

  private report(): Report {
    return makeReport({ journal: journal(), levels: state.progress.levels, name: state.progress.childName, today: today() });
  }

  /** Card: a rounded rectangle with content; returns the height. */
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

  // ——— Full version ———

  /** Full version card: trial status, purchase and restore. Returns the height (0 when purchased). */
  private shopCard(y: number, cw: number, x = 0): number {
    if (isBought()) return 0;
    const t = trial();
    const title = t.active
      ? t.left > 0
        ? t.left === 1
          ? tr('fullTrialAccess1')
          : tr('fullTrialAccessMore', { n: t.left })
        : tr('fullTrialAccessToday')
      : tr('trialHasEndedPuzzle');
    const body = t.active
      ? tr('onlyDaysWhenChild')
      : tr('fullVersionUnlocksBasils');
    return this.card({ x, y }, cw, (c, iw) => {
      const tt = this.text(title, 29, { weight: '800', wrap: iw });
      const b = this.text(body, 24, { color: SOFT, wrap: iw });
      b.y = tt.height + 10;
      c.addChild(tt, b);
      let h = b.y + b.height + 20;
      const bw = Math.min(440, iw);
      const buy = this.button(this.buying ? tr('oneMoment') : this.storePrice ? tr('buyFullVersionPrice', { price: this.storePrice }) : tr('buyFullVersion'), bw, '#ff9f5a', () => this.askAdult(() => void this.doBuy(false)), 80, 27);
      buy.position.set(bw / 2, h + 40);
      const rest = this.button(tr('restorePurchase'), 260, '#c9b8a6', () => this.askAdult(() => void this.doBuy(true)), 80, 25);
      const stack = iw < bw + 24 + 260;
      rest.position.set(stack ? 130 : bw + 24 + 130, stack ? h + 140 : h + 40);
      c.addChild(buy, rest);
      h += stack ? 180 : 80;
      if (this.shopNote) {
        const n = this.text(this.shopNote, 22, { color: '#b5563a', wrap: iw });
        n.y = h + 14;
        c.addChild(n);
        h = n.y + n.height;
      }
      return h;
    }, t.active ? 0xeef8e8 : 0xfff3dd);
  }

  private async doBuy(restoreOnly: boolean): Promise<void> {
    if (this.buying) return;
    this.buying = true;
    this.shopNote = '';
    this.render();
    const ok = restoreOnly ? await restorePurchase() : await purchase();
    this.buying = false;
    if (this.destroyed) return;
    if (ok) {
      haptics.success();
      this.onUnlock();
    } else
      this.shopNote = this.storePrice
        ? restoreOnly
          ? tr('noPurchaseFoundAccount')
          : tr('purchaseWasNotCompleted')
        : tr('storeUnavailableNoInternet');
    this.render();
  }

  // ——— Progress ———

  private renderProgress(cw: number): number {
    const r = this.report();
    let y = 0;
    const name = this.text(state.progress.childName ? r.who : tr('yourChild'), 40, { weight: '800' });
    this.content.addChild(name);
    const edit = this.button(state.progress.childName ? tr('changeName') : tr('askChildName'), state.progress.childName ? 200 : 300, '#9b7be0', () => this.askName(), 70, 24);
    edit.position.set(name.width + 30 + edit.width / 2, 28);
    this.content.addChild(edit);
    y += 70;
    const week = this.text(r.weekText, 26, { color: SOFT, wrap: cw });
    week.y = y;
    this.content.addChild(week);
    y += week.height + 8;
    if (r.firsts.length) {
      const more = r.firsts.length > 5 ? tr('andMore', { n: r.firsts.length - 5 }) : '';
      const firsts = this.text(tr('newThisWeek', { list: r.firsts.slice(0, 5).join(', ') + more }), 26, { color: '#3f8a4a', weight: '700', wrap: cw });
      firsts.y = y;
      this.content.addChild(firsts);
      y += firsts.height + 8;
    }
    y += 16;
    const shop = this.shopCard(y, cw);
    if (shop) y += shop + 24;
    y = this.skillList(cw, y);

    if (!hasFull()) {
      y += this.card({ x: 0, y }, cw, (c, iw) => {
        const t = this.text(tr('fullReportFullVersion'), 30, { weight: '800' });
        const b = this.text(
          tr('progressChartsEverySkill'),
          25,
          { color: SOFT, wrap: iw },
        );
        b.y = 54;
        c.addChild(t, b);
        return 54 + b.height;
      }, 0xfff3dd);
      return y + 20;
    }

    y += this.card({ x: 0, y }, cw, (c, iw) => {
      const t = this.text(tr('screenFreePlayIdeas'), 29, { weight: '800' });
      const body = this.text(r.tips.map((x) => `• ${x}`).join('\n'), 25, { color: SOFT, wrap: iw });
      body.y = 50;
      c.addChild(t, body);
      return 50 + body.height;
    }, 0xeef8e8);
    y += 20;
    const note = this.text(tr('weShowChildsOwn'), 21, { color: '#9a8b7c', wrap: cw });
    note.y = y;
    this.content.addChild(note);
    return y + note.height + 20;
  }

  // ——— Ready for school: skill list and details with charts ———

  private stageName(stage: number): string {
    return [tr('notYet'), tr('practising'), tr('doingWell'), tr('confident')][stage] ?? '';
  }

  private dateLabel(day: string): string {
    const [y, m, d] = day.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d).toLocaleDateString(lang(), { day: 'numeric', month: 'numeric' });
  }

  /** Padlock (free version: charts are in the full version). */
  private lock(size: number): Graphics {
    const k = size / 40;
    return new Graphics()
      .roundRect(-12 * k, -18 * k, 24 * k, 26 * k, 12 * k)
      .stroke({ color: 0x9a8b7c, width: 5 * k })
      .roundRect(-18 * k, -4 * k, 36 * k, 26 * k, 7 * k)
      .fill({ color: 0x9a8b7c });
  }

  /** "Ready for school" list: each skill in a row (bar, score, mini chart, speed). Tap: details. */
  private skillList(cw: number, y0: number): number {
    let y = y0;
    const full = hasFull();
    const j = journal();
    const t = today();
    const title = this.text(tr('readySchool'), 34, { weight: '800' });
    title.y = y;
    const sub = this.text(tr('tapSkillSeeIts'), 22, { color: SOFT });
    sub.position.set(0, y + 46);
    this.content.addChild(title, sub);
    y += 86;
    const rowH = 78;
    const wide = cw >= 860;
    const nameW = wide ? cw * 0.33 : cw * 0.46;
    const barW = wide ? cw * 0.2 : cw * 0.24;
    for (const def of SKILLS) {
      const m = mastery(def, j, state.progress.levels, t);
      const row = new Container();
      row.y = y;
      const h = rowH - 10;
      row.addChild(new Graphics().roundRect(0, 0, cw, h, 18).fill({ color: 0xffffff }).stroke({ color: 0xeadfce, width: 3 }));
      const name = this.text(tr(def.name), 25, { weight: '800' });
      name.anchor.set(0, 0.5);
      name.position.set(18, h / 2);
      if (name.width > nameW - 24) name.scale.set((nameW - 24) / name.width);
      const bar = new Graphics().roundRect(0, -10, barW, 20, 10).fill({ color: 0xf1e8da });
      if (m.value > 0) bar.roundRect(0, -10, Math.max(20, barW * m.value), 20, 10).fill({ color: 0x5cc36a });
      bar.position.set(nameW, h / 2);
      const score = this.text(m.of !== undefined ? tr('okOfTotal', { ok: m.ok ?? 0, of: m.of }) : this.stageName(m.stage ?? 0), 22, { color: SOFT, weight: '700' });
      score.anchor.set(0, 0.5);
      score.position.set(nameW + barW + 14, h / 2);
      row.addChild(name, bar, score);
      if (wide) {
        const sx = cw - 50 - 170;
        if (!full) {
          const l = this.lock(30);
          l.position.set(sx + 85, h / 2);
          row.addChild(l);
        } else {
          const ps = accuracy(def, j, 'weeks', t);
          const daily = enoughPoints(ps) ? ps : accuracy(def, j, 'days', t);
          if (enoughPoints(daily)) {
            const spark = lineChart({ width: 170, height: h - 16, points: daily, unit: '%', color: 0x5cb3ff, resolution: this.game.pixelRatio, label: () => '', mini: true });
            spark.position.set(sx, 8);
            row.addChild(spark);
          }
          const sp = def.tempo ? tempo(def, j, 'weeks', t)?.speedup : null;
          if (sp && sp >= 1.15) {
            const fast = this.text(tr('faster', { x: sp.toLocaleString(lang(), { maximumFractionDigits: 1 }) }), 20, { color: '#3f8a4a', weight: '800' });
            fast.anchor.set(1, 0.5);
            fast.position.set(sx - 12, h / 2);
            row.addChild(fast);
          }
        }
      }
      const more = this.text('›', 40, { color: '#c9b8a6', weight: '800' });
      more.anchor.set(0.5);
      more.position.set(cw - 26, h / 2 - 2);
      row.addChild(more);
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointertap', () => {
        if (!this.tapped()) return;
        haptics.tap();
        this.skill = def.id;
        this.scroll = 0;
        this.render();
      });
      this.content.addChild(row);
      y += rowH;
    }
    return y + 14;
  }

  /** Chart in a card; in the free version blurred, with a padlock and an unlock button. */
  private chartCard(y: number, cw: number, o: { title: string; points: readonly Point[]; unit: '%' | 's'; color: number; sample: boolean; caption: string }): number {
    const full = hasFull();
    return this.card({ x: 0, y }, cw, (c, iw) => {
      const t = this.text(o.title, 28, { weight: '800' });
      c.addChild(t);
      if (o.sample) {
        const badge = this.text(tr('example'), 22, { color: '#ffffff', weight: '800' });
        const plate = new Graphics().roundRect(-12, -4, badge.width + 24, badge.height + 8, 14).fill({ color: 0xff9f5a });
        const b = new Container();
        b.addChild(plate, badge);
        b.position.set(t.width + 22, 6);
        c.addChild(b);
      }
      const chart = lineChart({ width: iw, height: 250, points: o.points, unit: o.unit, color: o.color, resolution: this.game.pixelRatio, label: (p) => this.dateLabel(p.from) });
      chart.y = 52;
      c.addChild(chart);
      if (!full) {
        chart.filters = [new BlurFilter({ strength: 4 })];
        const veil = new Graphics().roundRect(iw / 2 - 260, 52 + 36, 520, 200, 24).fill({ color: 0xfffaf2, alpha: 0.82 });
        const l = this.lock(46);
        l.position.set(iw / 2, 52 + 70);
        const msg = this.text(tr('progressChartsFullVersion'), 25, { weight: '800' });
        msg.anchor.set(0.5, 0);
        msg.position.set(iw / 2, 52 + 104);
        const buy = this.button(tr('unlockFullVersion'), 360, '#4fae5f', () => this.askAdult(() => void this.doBuy(false)), 76, 25);
        buy.position.set(iw / 2, 52 + 190);
        c.addChild(veil, l, msg, buy);
      }
      const cap = this.text(o.caption, 22, { color: SOFT, wrap: iw });
      cap.y = 52 + 262;
      c.addChild(cap);
      return cap.y + cap.height;
    });
  }

  /** Skill details: score, learning curve, speed, items, milestones and a play idea. */
  private renderSkill(cw: number): number {
    const def = SKILLS.find((s) => s.id === this.skill) as SkillDef;
    const j = journal();
    const t = today();
    const back = this.button(tr('allSkills'), 220, '#c9b8a6', () => {
      this.skill = null;
      this.scroll = 0;
      this.render();
    }, 70, 24);
    back.position.set(110, 36);
    const title = this.text(tr(def.name), 36, { weight: '800' });
    title.position.set(244, 12);
    if (title.width > cw - 244) title.scale.set((cw - 244) / title.width);
    this.content.addChild(back, title);
    let y = 90;
    const m = mastery(def, j, state.progress.levels, t);
    const summary = [m.of !== undefined ? tr('masteredCount', { ok: m.ok ?? 0, of: m.of }) : tr('stage', { stage: this.stageName(m.stage ?? 0) }), tr('tasksSolved', { n: m.tasks })].join('   ·   ');
    const sum = this.text(summary, 25, { color: SOFT, weight: '700' });
    sum.y = y + 10;
    this.content.addChild(sum);
    // Chart range: parent's choice (days or weeks).
    (['days', 'weeks'] as const).forEach((r, i) => {
      const b = this.button(r === 'days' ? tr('days') : tr('weeks'), 170, r === this.range ? '#ff9f5a' : '#c9b8a6', () => {
        this.range = r;
        this.render();
      }, 64, 23);
      b.position.set(cw - 85 - (1 - i) * 182, y + 26);
      this.content.addChild(b);
    });
    y += 76;
    const acc = accuracy(def, j, this.range, t);
    const real = enoughPoints(acc);
    y += this.chartCard(y, cw, {
      title: tr('tasksWithoutMistake'),
      points: real ? acc : sampleAccuracy(this.range, t),
      unit: '%',
      color: 0x5cb3ff,
      sample: !real,
      caption: real
        ? tr('triangleMovedUpLevel')
        : tr('whatProgressLooksLike'),
    }) + 22;
    if (def.tempo) {
      const tp = tempo(def, j, this.range, t)!;
      const realT = enoughPoints(tp.points);
      const shown = realT ? tp : sampleTempo(this.range, t);
      const sp = realT ? tp.speedup : null;
      y += this.chartCard(y, cw, {
        title: tr('answerTime'),
        points: shown.points,
        unit: 's',
        color: 0x9b7be0,
        sample: !realT,
        caption: sp && sp >= 1.15
          ? tr('answersFasterThanAt', { x: sp.toLocaleString(lang(), { maximumFractionDigits: 1 }) })
          : tr('lowerLineMoreConfident'),
      }) + 22;
    }
    if (def.group) {
      const group = def.group;
      const COLOR: Record<ItemState, number> = { mastered: 0x5cc36a, practicing: 0xffc94a, trouble: 0xf08a6a, no: 0xd9cfc2 };
      y += this.card({ x: 0, y }, cw, (c, iw) => {
        const t2 = this.text(tr('whatsMastered'), 28, { weight: '800' });
        c.addChild(t2);
        let x = 0;
        let yy = 52;
        for (const id of itemsOf(group)) {
          const chip = new Container();
          const label = this.text(itemName(group, id), 23, { weight: '700' });
          label.position.set(34, 0);
          const dot = new Graphics().circle(14, label.height / 2, 11).fill({ color: COLOR[itemState(j, group, id)] });
          chip.addChild(dot, label);
          const w = 34 + label.width + 26;
          if (x + w > iw) {
            x = 0;
            yy += 44;
          }
          chip.position.set(x, yy);
          c.addChild(chip);
          x += w;
        }
        yy += 48;
        const legend = this.text(tr('greenMasteredYellowPractising'), 20, { color: SOFT, wrap: iw });
        legend.y = yy;
        c.addChild(legend);
        return yy + legend.height;
      }) + 22;
    }
    const ms = milestones(def, j).slice(0, 8);
    y += this.card({ x: 0, y }, cw, (c, iw) => {
      const t3 = this.text(tr('discoveries'), 28, { weight: '800' });
      c.addChild(t3);
      const lines = ms.map((e) => {
        const date = this.dateLabel(e.day);
        if (e.kind === 'mastered') return tr('masteredItemOn', { date, item: itemName(def.group ?? '', e.item ?? '') });
        if (e.kind === 'level') return tr('nextDifficultyLevel', { date });
        return tr('firstTimePlaying', { date });
      });
      const body = this.text(lines.length ? lines.map((l) => `• ${l}`).join('\n') : tr('firstDiscoveriesWillAppear'), 24, { color: SOFT, wrap: iw });
      body.y = 50;
      c.addChild(body);
      return 50 + body.height;
    }) + 22;
    y += this.card({ x: 0, y }, cw, (c, iw) => {
      const t4 = this.text(tr('screenFreePlayIdea'), 28, { weight: '800' });
      const body = this.text(tr(def.tip), 24, { color: SOFT, wrap: iw });
      body.y = 50;
      c.addChild(t4, body);
      return 50 + body.height;
    }, 0xeef8e8);
    return y + 30;
  }

  private askName(): void {
    const v = window.prompt(tr('whatChildsNameStays'), state.progress.childName ?? '');
    if (v === null) return;
    const name = v.trim().slice(0, 20);
    state.progress.childName = name ? name[0]!.toUpperCase() + name.slice(1) : undefined;
    void saveState();
    this.render();
  }

  // ——— Album ———

  private renderAlbum(cw: number): number {
    const v = this.version;
    const intro = this.text(tr('childsCreationsFromLittle'), 25, { color: SOFT, wrap: cw });
    this.content.addChild(intro);
    const top = intro.height + 24;
    const loading = this.text(tr('loading'), 26, { color: SOFT });
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
        const empty = this.text(tr('nothingHereYetColored'), 27, { wrap: cw });
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

  /** Album item image fitted to `w`×`h` (sprite or container). */
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
    // The background is fitted to "cover" and sticks out of the frame: we clip it to the picture.
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
    const share = this.button(tr('saveSend'), 280, '#5cb3ff', () => this.askAdult(() => void this.share(it)), 84, 28);
    share.position.set(vw / 2 - 160, y);
    const back = this.button(tr('back'), 200, '#5cc36a', close, 84, 28);
    back.position.set(vw / 2 + 120, y);
    o.addChild(share, back);
    if (it.kind === 'painting') {
      let armed = false;
      const del: Button = this.button(tr('delete'), 160, '#e8835a', () => {
        if (!armed) {
          armed = true;
          del.setLabel(tr('areYouSure'));
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
      await shareImage(it.painting.img, `bystrzakowo-${it.painting.date}.jpg`, tr('pictureFromBystrzakowo'));
      return;
    }
    const { width: vw, height: vh } = this.view;
    const pic = pictureView(it.picture, vw, vh, this.art!, this.landscapes!);
    const url = await this.game.app.renderer.extract.base64({ target: pic, format: 'jpg', quality: 0.9, resolution: 1600 / vw, frame: new Rectangle(0, 0, vw, vh) });
    pic.destroy({ children: true });
    await shareImage(url, `bystrzakowo-naklejki-${today()}.jpg`, tr('pictureFromBystrzakowo'));
  }

  // ——— Postcard ———

  private renderPostcardTab(cw: number): number {
    if (!hasFull()) {
      return this.card({ x: 0, y: 0 }, cw, (c, iw) => {
        const t = this.text(tr('weeklyPostcardFullVersion'), 30, { weight: '800' });
        const b = this.text(tr('everyWeekLovelyCard'), 25, { color: SOFT, wrap: iw });
        b.y = 54;
        c.addChild(t, b);
        return 54 + b.height;
      }, 0xfff3dd);
    }
    if (!this.art) {
      this.content.addChild(this.text(tr('loading'), 26, { color: SOFT }));
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
    const share = this.button(tr('saveSendPostcard'), 400, '#5cb3ff', () => this.askAdult(() => void this.sharePostcard(r)), 84, 28);
    share.position.set(cw / 2, y + 42);
    this.content.addChild(share);
    if (!state.progress.childName) {
      const hint = this.button(tr('addChildName'), 300, '#9b7be0', () => this.askName(), 70, 24);
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
    await shareImage(url, `postcard-${r.week.to}.png`, tr('postcardFromBystrzakowo'));
  }

  // ——— Settings ———

  private renderSettings(cw: number): number {
    let y = 0;
    const info = this.text(tr('bystrzakowoWorksOfflineHas'), 25, { color: SOFT, wrap: cw });
    this.content.addChild(info);
    y += info.height + 30;
    // Wide panel (tablet): settings in two columns, each element goes into the shorter one.
    const twoCol = cw >= 1060;
    const bw = twoCol ? Math.min(520, (cw - 30) / 2) : Math.min(520, cw);
    const used = twoCol ? bw * 2 + 30 : bw;
    const ys = [y, twoCol ? y : Infinity];
    const col = () => (ys[0]! <= ys[1]! ? 0 : 1);
    const add = (b: Button) => {
      const c = col();
      b.position.set(c * (bw + 30) + bw / 2, ys[c]! + 40);
      this.content.addChild(b);
      ys[c]! += 100;
    };
    const nameLabel = () => (state.progress.childName ? tr('childNameLabel', { name: state.progress.childName }) : tr('childsNameNotSet'));
    add(this.button(nameLabel(), bw, '#9b7be0', () => this.askName()));
    // Age: sets the starting level of activities the child hasn't played yet (progress in the others stays).
    const ageLabel = () => (state.progress.age ? tr('childsAge', { n: state.progress.age >= 6 ? '6+' : state.progress.age }) : tr('childsAgeNotSet'));
    const ageButton: Button = this.button(ageLabel(), bw, '#8fb8ff', () => {
      applyAge(state.progress, nextAge(state.progress.age), playedActivities(journal()));
      ageButton.setLabel(ageLabel());
      void saveState();
    });
    add(ageButton);
    const LANG_NAMES: Record<Lang, string> = { pl: 'Polski', en: 'English', de: 'Deutsch', es: 'Español' };
    // Language: four buttons side by side, the selected one highlighted. Change: save and restart
    // (narrator recordings load at startup).
    const lc = col();
    const lx = lc * (bw + 30);
    const langLabel = this.text(tr('language'), 24, { color: SOFT, weight: '800' });
    langLabel.position.set(lx, ys[lc]!);
    this.content.addChild(langLabel);
    ys[lc]! += langLabel.height + 8;
    const gap = 10;
    const lw = (bw - gap * (LANGS.length - 1)) / LANGS.length;
    LANGS.forEach((l, i) => {
      const b = this.button(LANG_NAMES[l], lw, l === lang() ? '#ff9f5a' : '#c9b8a6', () => {
        if (l === lang()) return;
        state.progress.lang = l;
        void saveState().then(() => location.reload());
      }, 80, 24);
      b.position.set(lx + lw / 2 + i * (lw + gap), ys[lc]! + 40);
      this.content.addChild(b);
    });
    ys[lc]! += 100;
    const musicLabel = () => (state.progress.music ? tr('musicOn') : tr('musicOff'));
    const music: Button = this.button(musicLabel(), bw, '#5cb3ff', () => {
      state.progress.music = !state.progress.music;
      if (state.progress.music) startMusic(this.game);
      else stopMusic(this.game);
      music.setLabel(musicLabel());
      void saveState();
    });
    add(music);
    const limitLabel = () => (state.progress.limit ? tr('playTimeMin', { n: state.progress.limit }) : tr('playTimeNoLimit'));
    const limit: Button = this.button(limitLabel(), bw, '#9b7be0', () => {
      const i = LIMITS.indexOf((state.progress.limit ?? 0) as (typeof LIMITS)[number]);
      state.progress.limit = LIMITS[(i + 1) % LIMITS.length];
      resetSession();
      limit.setLabel(limitLabel());
      void saveState();
    });
    add(limit);
    const reset: Button = this.button(tr('resetProgress'), bw, '#e8835a', () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        reset.setLabel(tr('sureTouchAgain'));
        return;
      }
      const { music: m, childName, age, lang: l } = state.progress;
      // Reset the activities, but not the parent's settings: name, age (starting level), language and the fact that onboarding is done.
      state.progress = { ...newProgress(), music: m, childName, lang: l, onboarded: true };
      if (age) applyAge(state.progress, age);
      void saveState();
      reset.setLabel(tr('progressReset'));
    });
    add(reset);
    y = Math.max(ys[0]!, twoCol ? ys[1]! : 0);
    const t = trial();
    const ver = this.text(isBought() ? tr('versionFull') : t.active ? tr('versionTrialFullAccess') : tr('versionFreePuzzleMeadow'), 22, { color: '#9a8b7c' });
    ver.y = y + 10;
    this.content.addChild(ver);
    y += 60;
    // Full version: next to the buttons when there's room, otherwise below them.
    const side = cw - used - 40;
    if (side >= 520) {
      const shop = this.shopCard(info.height + 30, side, used + 40);
      return Math.max(y, info.height + 30 + shop) + 30;
    }
    const shop = this.shopCard(y, cw);
    return y + shop + 30;
  }

  tick(dt: number): void {
    for (const b of this.buttons) if (!b.destroyed) b.tick(dt);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    for (const t of this.textures) t.destroy(true);
    super.destroy(options);
  }
}

// ——— Postcard (drawn at a fixed size; preview scaled, export 1:1) ———

export const POSTCARD_W = 1200;
export const POSTCARD_H = 840;

function postcard(game: Game, art: Art, r: Report, resolution: number): Container {
  const c = new Container();
  const W = POSTCARD_W;
  const H = POSTCARD_H;
  const bg = new Graphics().roundRect(0, 0, W, H, 48).fill({ color: 0xfff1d6 }).stroke({ color: COLORS.ink, width: 12 });
  bg.roundRect(26, 26, W - 52, H - 52, 34).stroke({ color: 0xffc94a, width: 6 });
  c.addChild(bg);
  // Confetti along the edges (fixed pattern, no randomness).
  const dots = new Graphics();
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = 60 + ((t * 7919) % 1) * (W - 120);
    const y = i % 2 ? 60 + ((i * 37) % 60) : H - 60 - ((i * 53) % 60);
    // The center stays free for the title and date.
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
  const head = t(tr('postcardFromBystrzakowo'), 52, '#ffc94a', '#5a3c28');
  // One line: longer titles (e.g. in German) are scaled down so they don't overlap the name.
  head.style.wordWrap = false;
  head.scale.set(Math.min(1, 760 / head.width));
  head.position.set(W / 2, 70);
  const name = t(state.progress.childName ? r.who : tr('littleSmarty'), 96, '#ff7a59', '#5a3c28');
  name.style.wordWrap = false;
  name.scale.set(Math.min(1, 820 / name.width));
  name.position.set(W / 2, 150);
  const sub = t(r.week.days ? tr('thisWeek') : tr('waitingPlayTogether'), 40, '#5a3c28', undefined, '700');
  sub.position.set(W / 2, 290);
  c.addChild(head, name, sub);
  const lines = r.week.days ? (r.highlights.length ? r.highlights : [tr('firstGamesBystrzakowo')]) : [];
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

/** Loads an image from a data URL via ImageBitmap (no canvas upload, see CLAUDE.md). */
async function dataUrlTexture(url: string): Promise<Texture> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return Texture.from(await createImageBitmap(img));
}
