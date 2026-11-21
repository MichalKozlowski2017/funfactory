import { Container, Graphics, Sprite } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { loadArt, say, startMusic, type Art, type Guide } from '../assets.ts';
import { pickSticker } from '../sim/progress.ts';
import { nextLevel } from '../sim/puzzles.ts';
import { realmOf, type Activity } from '../sim/realms.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, IconButton, sfx } from '../ui.ts';

/** Po ilu sekundach bezczynności przewodnik powtarza polecenie, a po ilu podpowiada. */
const IDLE_REPEAT = 8;
const IDLE_HINT = 16;

/**
 * Wspólna rama każdej zabawy: tło krainy, przewodnik, gwiazdki postępu, podpowiedzi przy bezczynności,
 * nagroda (naklejka) i powrót do krainy. Bez przegrywania: pomyłki tylko obniżają poziom następnej rundy.
 * Podklasa przygotowuje rundę (`prepare`), pokazuje zadanie (`show`) i woła `solved()` / `missed()`.
 */
export abstract class RoundScene extends Scene {
  protected readonly kind: Activity;
  protected readonly guide: Guide;
  protected art!: Art;
  protected bg!: Sprite;
  protected guideSprite!: Sprite;
  protected home!: IconButton;
  protected dots!: Graphics;
  /** Warstwa zadania (czyszczona między zadaniami). */
  protected readonly layer = new Container();
  protected particles!: Particles;
  /** Liczba zadań w rundzie. */
  protected length = 5;
  protected index = 0;
  protected mistakes = 0;
  /** Zadanie rozwiązane, czekamy na następne (dotyk ignorowany). */
  protected busy = false;
  protected overlay: Container | null = null;
  protected leaving = false;
  protected idle = 0;
  private hinted = 0;
  private updateNext: ((dt: number) => void) | null = null;

  constructor(kind: Activity, guide: Guide) {
    super();
    this.kind = kind;
    this.guide = guide;
  }

  /** Przygotowanie rundy (dane, tekstury). Ustawia `length`. */
  protected abstract prepare(): Promise<void>;
  /** Pokazuje zadanie `index` w `layer`. */
  protected abstract show(): void;
  /** Nagranie polecenia bieżącego zadania. */
  protected abstract promptLine(): string;
  /** Podpowiedź po dłuższej bezczynności (np. kołysanie właściwej karty). */
  protected abstract hint(): void;
  /** Rozmieszczenie elementów zadania (po zmianie rozmiaru ekranu). */
  protected abstract place(): void;
  /** Animacja wejścia (po `place`, więc elementy mają już docelową skalę). */
  protected appear(): void {}
  /** Klatka animacji zadania. */
  protected step(_dt: number): void {}

  override async enter(): Promise<void> {
    this.art = await loadArt();
    await this.prepare();
    this.bg = new Sprite(this.art.playBg[realmOf(this.kind).id]);
    this.guideSprite = new Sprite({ texture: this.guide === 'lusia' ? this.art.lusia : this.art.bazyl, anchor: { x: 0.5, y: 1 } });
    this.guideSprite.scale.set(300 / this.guideSprite.texture.height);
    this.guideSprite.eventMode = 'static';
    this.guideSprite.cursor = 'pointer';
    this.guideSprite.on('pointertap', () => this.repeatPrompt());
    this.home = new IconButton('home');
    this.home.onTap = () => this.leave();
    this.dots = new Graphics();
    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.addChild(this.bg, this.guideSprite, this.layer, this.dots, this.home, this.particles.view);
    idleBreath(this.tweens, this.guideSprite, 0.03, 1.8);
    this.eventMode = 'static';
    this.on('pointerdown', () => {
      this.idle = 0;
      startMusic(this.game);
    });
    this.game.markReady();
    this.timers.after(0.35, () => this.begin());
  }

  /** Nowe zadanie: czyści warstwę i woła `show`. */
  protected begin(): void {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.layer.alpha = 1;
    this.busy = false;
    this.idle = 0;
    this.hinted = 0;
    this.show();
    this.place();
    this.appear();
    this.drawDots();
  }

  /** Polecenie jeszcze raz (dotknięcie przewodnika). */
  protected repeatPrompt(): void {
    if (this.busy || this.overlay) return;
    this.idle = 0;
    void squash(this.tweens, this.guideSprite, 0.08);
    say(this.game, this.guide, this.promptLine());
  }

  /** Konfetti w punkcie (współrzędne sceny). */
  protected burst(x: number, y: number, count = 30): void {
    this.particles.burst(x, y, { count, speed: [200, 600], life: [0.4, 0.9], gravity: 700, scale: [0.5, 1.1], colors: COLORS.confetti });
  }

  /** Pomyłka: dźwięk, haptyka, „ojej” przewodnika. Animację elementu robi podklasa. */
  protected missed(): void {
    this.mistakes++;
    sfx.bad(this.game.sound);
    haptics.error();
    void squash(this.tweens, this.guideSprite, 0.08);
    say(this.game, this.guide, `oj-${this.game.rng.int(1, 2)}`);
  }

  /**
   * Zadanie rozwiązane: podskok przewodnika, pochwała i następne zadanie.
   * `afterLen`: ile sekund trwa to, co już mówi lektor (np. nazwa obiektu), zanim padnie pochwała.
   */
  protected solved(afterLen = 0): void {
    this.busy = true;
    sfx.good(this.game.sound);
    haptics.success();
    this.jumpGuide();
    this.timers.after(afterLen + 0.15, () => {
      const len = say(this.game, this.guide, `brawo-${this.game.rng.int(1, 5)}`);
      this.timers.after(Math.max(0.8, len) + 0.3, () => this.next());
    });
  }

  protected jumpGuide(): void {
    const g = this.guideSprite;
    const y = g.y;
    this.tweens.killOf(g);
    void this.tweens.to(g, { y: y - 50 }, { duration: 0.18, ease: 'quadOut', yoyo: true, repeat: 1 }).done.then(() => (g.y = y));
  }

  private next(): void {
    this.index++;
    if (this.index >= this.length) return this.finish();
    this.tweens.to(this.layer, { alpha: 0 }, { duration: 0.2 });
    this.timers.after(0.25, () => this.begin());
  }

  private finish(): void {
    const p = state.progress;
    p.levels[this.kind] = nextLevel(p.levels[this.kind] ?? 0, this.mistakes);
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
      this.updateNext = (dt) => next.tick(dt);
    });
  }

  protected leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.game.sound.stopChannel('voice');
    void import('./world.ts').then(({ WorldScene }) => this.game.scenes.go(new WorldScene(), { fade: 0.3, color: 0xfff6e8 }));
  }

  private idleTick(dt: number): void {
    if (this.busy || this.overlay || this.leaving || this.index >= this.length) return;
    this.idle += dt;
    if (this.hinted === 0 && this.idle > IDLE_REPEAT) {
      this.hinted = 1;
      say(this.game, this.guide, this.promptLine());
      void squash(this.tweens, this.guideSprite, 0.1);
    } else if (this.hinted === 1 && this.idle > IDLE_HINT) {
      this.hinted = 2;
      this.hint();
      say(this.game, this.guide, 'pomoc');
    }
  }

  protected drawDots(): void {
    const g = this.dots.clear();
    const gap = 54;
    for (let i = 0; i < this.length; i++) {
      const x = (i - (this.length - 1) / 2) * gap;
      if (i < this.index) g.star(x, 0, 5, 22, 10).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
      else g.circle(x, 0, i === this.index ? 15 : 12).fill({ color: 0xffffff, alpha: 0.95 }).stroke({ color: COLORS.ink, width: 4 });
    }
  }

  override update(dt: number): void {
    this.home.tick(dt);
    this.updateNext?.(dt);
    this.particles.update(dt);
    this.step(dt);
    this.idleTick(dt);
  }

  override resize(view: View): void {
    cover(this.bg, view.width, view.height);
    this.guideSprite.position.set(view.safe.left + 130, view.height - 10);
    this.home.position.set(view.safe.left + 80, view.safe.top + 75);
    this.dots.position.set(view.width / 2 + 100, view.safe.top + 60);
    if (this.index < this.length && this.layer.children.length) this.place();
  }
}
